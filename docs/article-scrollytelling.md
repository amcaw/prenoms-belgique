# « C'est quoi, l'histoire de votre prénom ? » — Plan d'article scrollytelling personnalisé

Un récit interactif où le lecteur saisit **son prénom** et **sa date de naissance**, et où
l'histoire se réécrit autour de lui, en mobilisant tout ce qu'on a appris des données Statbel
(modes, raccourcissement des prénoms, fractures régionales). Le ton est chaleureux, à la deuxième
personne, et **honnête sur ce que la donnée peut — et ne peut pas — dire**.

---

## 1. Concept

- **Entrée** : prénom + année (ou date) de naissance. En option : région de naissance, et genre si
  le prénom est ambigu/mixte.
- **Sortie** : un scrollytelling de ~9 scènes qui passe de « voici la courbe de votre prénom » à
  « voici quel genre de prénom vous êtes », avec une carte de partage finale.
- **Promesse** : chaque lecteur voit un récit différent. Deux personnes nées la même année avec un
  prénom différent — ou le même prénom dans deux régions — ne lisent pas la même chose.

**Public** : grand public belge (francophone). Format pensé pour l'embed iframe (voir §9).

---

## 2. Les données, et leurs trois pièges (à intégrer DANS le récit)

Ces contraintes ne sont pas des notes de bas de page : ce sont des **ressorts narratifs**.

1. **Les données commencent en 1995.** Avant, on ne sait rien.
   → Si le lecteur est né **avant 1995**, on ne montre pas « son » année ; on bascule sur la
   trajectoire du prénom *depuis* 1995 (« la génération de vos enfants… ») et on le dit franchement.

2. **Rien sous 5 occurrences (masquage Statbel).** Un `0` (ou une absence) ne veut **pas** dire
   « personne ». Cela veut dire « moins de 5 bébés », masqué pour préserver l'anonymat.
   → **Interdiction absolue** d'écrire « vous étiez le seul / personne ne s'appelait ainsi ». Quand
   le compteur est vide l'année de naissance, c'est au contraire un **beau moment de récit** : « vous
   faisiez partie des quelques-uns, trop rares pour apparaître ».

3. **Régional = listes indépendantes.** On a le national (profond, depuis le CSV) + Flandre /
   Wallonie / Bruxelles, et le provincial seulement **2017–2024**.
   → Pour la carte par province, si le lecteur est né avant 2017, on montre « la géographie de votre
   prénom aujourd'hui », pas à sa naissance.

> Date de référence pour l'âge : **2026**. `âge ≈ 2026 − annéeNaissance`.

---

## 3. Le « profil » calculé (variables dérivées)

Calculé côté client à partir de `prenoms.json` (+ `provinces.json`) dès la saisie.

| Variable | Définition | Sert à |
|---|---|---|
| `present` | le prénom existe dans le jeu (total ≥ 20) | aiguiller vers le cas « prénom rare » |
| `serieNat[]`, `serieReg[]` | naissances/an, national et région choisie | toutes les courbes |
| `valNaiss` | valeur l'année de naissance (national) | scène « votre année » |
| `masquéNaiss` | `valNaiss === 0` | déclenche le récit d'anonymisation |
| `rangNaiss` | rang du prénom cette année-là (national + région) | « Xe prénom le plus donné » |
| `pic` | `{année, valeur}` du maximum | situer l'apogée vs la naissance |
| `picAvantNaiss` | le pic est-il avant l'année de naissance ? | ton « déjà sur le déclin / encore à venir » |
| `statut` | `montée` / `apogée` / `déclin` / `disparition` / `stable` / `rare` | scène verdict + archétype |
| `total` | total 1995–2024 | ordre de grandeur |
| `meilleurRang` | `{rang, année}` (min sur la période) | « son heure de gloire » |
| `longueur` | nb de lettres | scène longueur |
| `longMoyAnnee`, `longMoyRegion` | longueur moyenne pondérée (année / région) | comparaison |
| `unisexe`, `partF` | présent en f ET m, part filles | scène caméléon |
| `skewRegion` | part fl/wa/br du total → région dominante | scène fractures régionales |
| `provTop` | province(s) où le prénom est le plus donné (2017–2024) | carte |
| `futN1` | le prénom a-t-il été n°1 une année ? | scène modes |
| `meteore` | pic concentré + chute rapide (cf. /insolite « feux de paille ») | archétype météore |
| `avant1995` | naissance < 1995 | bascule narrative |
| `archetype` | étiquette finale (cf. §6) | carte de partage + ton global |

---

## 4. Architecture scrollytelling (technique)

- **Graphique « sticky »** d'un côté (desktop : à droite, collé ; mobile : en haut, collé), **texte
  qui défile** de l'autre. Chaque paragraphe est une `<section class="step">`.
- Un **IntersectionObserver** détecte la step active → met à jour un `currentStep` → qui pilote
  l'état du graphique sticky (quel visuel, quels paramètres, quels surlignages).
- **Réutilisation des composants déjà codés** comme « scènes » du graphique sticky :
  - le **prénom-courbe Anton** (`/tape`) → scènes 1–2 ;
  - `TrendChart` (courbe simple + crosshair) → verdict, longueur ;
  - `RidgelineChart` (modes) → scène modes ;
  - `MapChart` (choroplèthe d'un prénom) → scène carte ;
  - les podiums régionaux (`/regions`) → scène fractures.
- **Transitions** : crossfade / morph doux entre deux états du graphique. Respecter
  `prefers-reduced-motion` (couper les anims, garder les changements d'état).
- **Données** : `loadDataset` + `loadProvinces` une seule fois ; profil recalculé à la volée.
- **Partage** : encoder la saisie dans l'URL (`?p=Louis&n=2003&r=wa`) pour rejouer le récit perso.

---

## 5. Le récit, scène par scène

Chaque scène : **objectif · visuel (composant) · donnée · copie (avec branches) · transition.**
Les copies sont des gabarits : `{{var}}` = variable, `[SI …]` = branche conditionnelle.

### Scène 0 — La saisie

- **Objectif** : entrer dans le récit sans friction.
- **Visuel** : champ prénom + sélecteur d'année (curseur 1910–2026, pour gérer les < 1995), +
  région optionnelle. Si prénom mixte détecté → micro-question « plutôt fille / garçon ? ».
- **Copie** : « Dites-nous qui vous êtes. On s'occupe du reste. »

### Scène 1 — L'apparition (le prénom-courbe)

- **Objectif** : effet « waouh », le prénom devient une forme.
- **Visuel** : le prénom géant en **Anton**, dont la hauteur des lettres suit la courbe nationale
  (le viz `/tape`).
- **Donnée** : `serieNat`.
- **Copie** : « Voici **{{PRENOM}}**. Pas le mot — la *vague*. Chaque lettre monte avec le nombre de
  bébés qui l'ont reçu, année après année, depuis 1995. »
- **Transition** : un marqueur vertical glisse vers l'année de naissance.

### Scène 2 — Votre année (le cœur émotionnel + le piège du masquage)

- **Objectif** : ancrer le lecteur dans SA donnée, honnêtement.
- **Visuel** : la même courbe, point/halo sur `annéeNaissance`.
- **Donnée** : `valNaiss`, `rangNaiss`, `masquéNaiss`, `avant1995`.
- **Copie — 3 branches** :
  - **[SI visible]** « En **{{annéeNaissance}}**, **{{valNaiss}}** bébés ont reçu le prénom
    {{PRENOM}} en Belgique. Vous étiez l'un·e d'eux — le **{{rangNaiss}}ᵉ** prénom le plus donné
    cette année-là. »
  - **[SI masquéNaiss]** « En {{annéeNaissance}}, le compteur officiel affiche… rien. Et pourtant
    vous êtes bien là. Statbel ne publie pas les prénoms donnés à **moins de 5 bébés** — pour qu'on
    ne puisse identifier personne. Vous faisiez partie de ces quelques-uns, **trop rares pour
    apparaître**. Un prénom presque secret. »
  - **[SI avant1995]** « Vous êtes né·e avant 1995 — là où nos archives commencent. On ne peut pas
    vous montrer votre année. Mais ce qui s'est passé *depuis* raconte déjà votre prénom. »
- **Transition** : dézoom, la courbe entière réapparaît pour le verdict.

### Scène 3 — À la mode, ou à contre-courant ? (le verdict)

- **Objectif** : qualifier la trajectoire.
- **Visuel** : `TrendChart` de la courbe + surlignage du pic et de l'aujourd'hui (réutilise la carte
  verdict de `/prenom`).
- **Donnée** : `statut`, `pic`, `picAvantNaiss`, valeur 2024.
- **Copie — branches** (statut) :
  - **montée** : « {{PRENOM}} n'a jamais été aussi donné qu'aujourd'hui. Vous l'aviez avant tout le
    monde. »
  - **apogée** : « Vous êtes né·e en plein âge d'or de {{PRENOM}}. »
  - **déclin** : « {{PRENOM}} a connu son heure de gloire en **{{pic.année}}** ({{pic.valeur}}
    bébés), puis a reflué. [SI picAvantNaiss] À votre naissance, la vague retombait déjà. »
  - **disparition** : « {{PRENOM}} s'efface doucement des maternités. Vous portez un prénom de votre
    époque. »
  - **rare / stable** : adapter (« une discrétion constante », « une valeur sûre, traversant les
    générations »).
- **Transition** : la courbe rejoint un peloton d'autres courbes → les modes.

### Scène 4 — Une mode, ça dure combien de temps ?

- **Objectif** : montrer que les prénoms sont des vagues, et situer le lecteur.
- **Visuel** : `RidgelineChart` (modes) du bon genre/région — les prénoms qui ont été n°1.
- **Donnée** : `futN1`, `meteore`, durée moyenne d'une mode (**~10 ans chez les filles, ~4 ans chez
  les garçons** au niveau national ; recalculée pour la région).
- **Copie — branches** :
  - **[SI futN1]** « {{PRENOM}} a même régné : il a été le prénom n°1 en **{{annéesN1}}**. »
  - **[SI meteore]** « {{PRENOM}} a flambé puis s'est éteint — un *feu de paille*, comme tant de
    prénoms d'une saison. »
  - **[sinon]** « {{PRENOM}} n'a jamais touché la première place. Mais regardez la valse de ceux qui
    l'ont occupée : chez les {{genrePluriel}}, une mode dure en moyenne **{{duréeMode}} ans**. »
  - Enseignement transversal : **les modes des garçons tournent plus vite que celles des filles.**
- **Transition** : on isole une dimension du prénom — sa longueur.

### Scène 5 — Court ou long ?

- **Objectif** : relier le prénom à une tendance de société.
- **Visuel** : `TrendChart` de la longueur moyenne par région (le viz `/longueur`), avec une ligne
  repère à `longueur`.
- **Donnée** : `longueur`, `longMoyAnnee`, `longMoyRegion`.
- **Copie — branches** :
  - « {{PRENOM}}, c'est **{{longueur}} lettres**. En {{annéeNaissance}}, la moyenne tournait autour
    de **{{longMoyAnnee}}**. [SI plus court] Vous êtes dans l'air du temps : **les prénoms n'ont
    jamais été aussi courts**. [SI plus long] À rebours de l'époque, qui raccourcit ses prénoms. »
  - Enseignement transversal : **diminution de la longueur + montée des prénoms courts** ; et
    **différences régionales** (la Flandre tire les prénoms vers le court).

### Scène 6 — La Belgique à trois visages

- **Objectif** : la fracture régionale, l'angle le plus « belge ».
- **Visuel** : podiums Flandre / Wallonie / Bruxelles (`/regions`) à l'année de naissance, +
  surlignage de la position de {{PRENOM}} dans chaque colonne.
- **Donnée** : `rangNaiss` par région, `skewRegion`.
- **Copie — branches** :
  - « La même année, {{PRENOM}} était **{{rangFl}}ᵉ** en Flandre, **{{rangWa}}ᵉ** en Wallonie,
    **{{rangBr}}ᵉ** à Bruxelles. »
  - **[SI fort skew]** « C'est un prénom de **{{régionDominante}}** : on le donne presque uniquement
    là. » (ex. très flamand / très bruxellois.)
  - Enseignement transversal : **trois cultures de prénoms** — Bruxelles très international (Sofia,
    Nour, Adam, Mohamed…), Flandre des prénoms courts (Louise, Mila, Noah), Wallonie francophone
    (Gabriel, Eva, Alice).

### Scène 7 — Votre prénom sur la carte

- **Objectif** : géographie fine.
- **Visuel** : `MapChart` en mode choroplèthe d'un prénom — intensité par province.
- **Donnée** : `provTop` (2017–2024 ; année de naissance si ≥ 2017, sinon dernière année dispo).
- **Copie** : « Le pays de {{PRENOM}}, c'est surtout **{{provTop}}**. [SI avant2017] (Données
  provinciales depuis 2017 — voici sa géographie récente.) »
- **Transition** : retour à aujourd'hui.

### Scène 8 — Et aujourd'hui ?

- **Objectif** : refermer la boucle générationnelle.
- **Visuel** : la courbe avec curseur sur 2024 + un chiffre clé.
- **Donnée** : âge moyen des porteurs (déduit de la distribution des naissances), valeur 2024, rang
  actuel.
- **Copie** : « Aujourd'hui, les {{PRENOM}} ont en moyenne **{{âgeMoyen}} ans**. [SI rare aujourd'hui]
  Et il s'en donne désormais une poignée par an. / [SI courant] Et le prénom continue sa route. »

### Scène 9 — Quel prénom êtes-vous ? (carte de partage)

- **Objectif** : synthèse mémorable + partage.
- **Visuel** : carte (image) avec l'**archétype**, le prénom-courbe en fond, 3–4 stats clés.
- **Copie** : titre = archétype (cf. §6) + une phrase. Bouton « Partager » / « Tester un autre
  prénom ».

---

## 6. Logique adaptative — les archétypes

On attribue **un** archétype (pour la carte finale et la coloration du ton). Ordre de priorité de
détection :

| Archétype | Règle (simplifiée) | Phrase-clé |
|---|---|---|
| **Le prénom-secret** | souvent masqué (`valNaiss` masqué et/ou `total` faible) | « Trop rare pour les statistiques, bien réel pourtant. » |
| **Le prénom d'avant** | `avant1995` ou `pic.année` < `annéeNaissance` nettement | « Un prénom qui vous précède. » |
| **Le météore** | `meteore` (pic concentré + chute rapide) | « Une flambée, puis l'oubli. » |
| **La star d'une génération** | fort pic puis `déclin`, `futN1` ou top 5 | « Le prénom d'une époque — la vôtre. » |
| **L'étoile montante** | `statut === montée` | « En avance sur son temps. » |
| **Le prénom-frontière** | `skewRegion` fort | « Un prénom qui a une région. » |
| **Le caméléon** | `unisexe` et `partF` entre 0,2 et 0,8 | « Ni tout à fait fille, ni tout à fait garçon. » |
| **La valeur sûre** | `stable`, présent sur toute la période | « Indémodable. » |

Le **ton** s'ajuste aussi en continu : on n'emploie jamais le passé « était » pour un prénom encore
courant, ni le futur glorieux pour un prénom en disparition.

---

## 7. Garde-fous éditoriaux & accessibilité

- **Masquage** : jamais « personne / vous étiez seul ». Toujours « moins de 5, anonymisé ». Un `0`
  dans une courbe = masqué, pas absence.
- **Genre** : ne pas déduire le genre d'un prénom mixte sans demander ; proposer F/M.
- **Hors période** : gérer `< 1995` et `> 2024` proprement (pas de chiffre inventé).
- **Pas de causalité abusive** : on n'a pas les événements (séries, people) ; on décrit, on ne
  « cause » pas un pic. On peut inviter le lecteur à deviner.
- **Inclusif et chaleureux**, 2ᵉ personne, phrases courtes.
- **Accessibilité** : `prefers-reduced-motion` (couper les morphs), navigation lisible sans
  scrollytelling (chaque scène doit avoir du sens en lecture linéaire), contrastes du design system,
  étiquettes ARIA sur les graphiques.

---

## 8. Enseignements des graphiques → où ils sont exploités

| Visuel codé | Enseignement | Scène(s) |
|---|---|---|
| `/tape` (prénom-courbe Anton) | la trajectoire individuelle comme forme | 1, 2 |
| `/prenom` (verdict, âge moyen) | à la mode / en déclin / en disparition | 2, 3, 8 |
| `/modes` (ridgeline + durée d'une mode) | les prénoms sont des vagues ; garçons plus volatils | 4 |
| `/societe` + `/longueur` | individualisation + prénoms plus courts, par région | 5 |
| `/regions` (podiums) | trois cultures de prénoms | 6 |
| `/carte` (n°1 / choroplèthe) | géographie provinciale | 7 |
| `/course` (bar chart race) | la valse des classements (transition/teaser) | 4 |
| `/insolite` (feux de paille, mixtes) | météores, prénoms unisexes | 4, 6 (archétypes) |

---

## 9. Embed & contraintes techniques

- Un scrollytelling est **long** : en iframe + pym (hauteur auto), l'iframe deviendrait géante.
  → Recommandation : **page autonome** pour l'expérience complète ; pour l'embed, soit un
  **scroller à hauteur fixe** (graphique collé + texte en `overflow` interne, hauteur = viewport),
  soit un **teaser** (scènes 1–3) renvoyant vers la page complète.
- Charger `prenoms.json` (~294 Ko gz) + `provinces.json` (~114 Ko gz) une fois ; tout le reste est
  recalculé côté client.
- Partage : image générée (carte finale) + URL avec paramètres.

---

## 10. Backlog / extensions

- « Vos camarades de classe » : top prénoms de votre année (réutilise `/prenom`).
- Comparaison à un proche (deux prénoms, deux courbes).
- Variante « prénom de votre enfant ».
- Son / haptique léger au passage de scène (désactivable).
