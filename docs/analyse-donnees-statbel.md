# Prénoms en Belgique (1995–2024) — analyse des données Statbel

> Analyse générée à partir des fichiers bruts de `Statbel_data/` : séries Filles/Garçons 1995–2024 (colonne nationale « Belgique », colonnes Flandre/Wallonie/Bruxelles et feuille des totaux cumulés) et répartition provinciale 2017–2024. **Chaque section décline les quatre territoires : Belgique (global), Flandre, Wallonie et Bruxelles.**
>
> **Deux règles de lecture.**
> 1. **Seuil des 5.** Statbel ne publie un prénom qu’à partir de **5 occurrences** une année donnée. Une absence ou un « 0 » ne signifie pas *personne*, mais *moins de 5*. Les totaux portent sur les **naissances nommées (≥ 5)**.
> 2. **Troncature régionale.** Les listes régionales annuelles ne contiennent que les prénoms les plus fréquents (quelques centaines à ~1 000 par région) ; elles couvrent ≈ 94 % des naissances nommées. Les agrégats Flandre/Wallonie/Bruxelles sont donc de légers *minorants*, alors que la colonne Belgique est complète. Les comparaisons de tendance restent fiables.

---

## 1. Le décrochage de la natalité, territoire par territoire

Naissances nommées (filles + garçons) par an :

| Année | Belgique | Flandre | Wallonie | Bruxelles |
| --- | --- | --- | --- | --- |
| 1995 | 100 818 | 54 787 | 32 319 | 8 434 |
| 2000 | 98 923 | 51 124 | 33 214 | 8 677 |
| 2005 | 98 480 | 51 077 | 31 133 | 9 304 |
| 2010 | 105 987 | 55 003 | 31 564 | 11 166 |
| 2015 | 98 683 | 50 563 | 28 804 | 11 051 |
| 2020 | 90 943 | 47 760 | 25 789 | 9 080 |
| 2024 | 85 307 | 46 520 | 23 366 | 7 361 |

Évolution 1995 → 2024 (et pic intermédiaire) :

| Territoire | 1995 | 2024 | Δ | Pic |
| --- | --- | --- | --- | --- |
| Belgique | 100 818 | 85 307 | -15.4 % | 105 987 (2010) |
| Flandre | 54 787 | 46 520 | -15.1 % | 55 286 (2008) |
| Wallonie | 32 319 | 23 366 | -27.7 % | 33 214 (2000) |
| Bruxelles | 8 434 | 7 361 | -12.7 % | 11 287 (2014) |

- La **Flandre** (≈ 57 % des naissances) et la **Wallonie** (≈ 33 %) suivent la même courbe : sommet vers 2008–2010 puis recul marqué jusqu’en 2024.
- **Bruxelles** (≈ 10 %) se distingue : sa natalité a beaucoup moins reculé, soutenue par une population plus jeune et plus d’arrivées — la Région reste un réservoir de diversité de prénoms.
- À l’échelle **belge**, on perd près d’un sixième des naissances nommées en une génération.

## 2. L’individualisation : les prénoms se dispersent partout

Le prénom n°1 et le top 10 pèsent une part décroissante des naissances, dans les quatre territoires. Le *nombre effectif de prénoms* (2^entropie) mesure la dispersion : plus il est haut, plus les naissances sont éparpillées.

### 2a. Filles
| Territoire | Part n°1 (1995) | Part n°1 (2024) | Part top 10 (2024) | Nb effectif (1995 → 2024) |
| --- | --- | --- | --- | --- |
| Belgique | 3.1 % | 1.3 % | 9.1 % | 476 → 744 |
| Flandre | 3.1 % | 1.5 % | 9.7 % | 344 → 551 |
| Wallonie | 3.5 % | 1.7 % | 14.3 % | 204 → 311 |
| Bruxelles | 3.6 % | 2.4 % | 14.6 % | 199 → 231 |

### 2b. Garçons
| Territoire | Part n°1 (1995) | Part n°1 (2024) | Part top 10 (2024) | Nb effectif (1995 → 2024) |
| --- | --- | --- | --- | --- |
| Belgique | 2 % | 1.3 % | 9.8 % | 428 → 755 |
| Flandre | 1.9 % | 1.6 % | 11 % | 317 → 540 |
| Wallonie | 3 % | 2.1 % | 14 % | 176 → 322 |
| Bruxelles | 3.2 % | 2.8 % | 15.4 % | 180 → 244 |

- La dispersion progresse partout, mais **Bruxelles** est structurellement la plus diverse (nombre effectif le plus élevé) : aucune mode n’y domine, reflet de sa mosaïque culturelle.
- Les **garçons** restent un cran plus concentrés que les filles dans chaque région (le n°1 masculin pèse plus lourd), mais l’écart se referme.
- En **Flandre**, la concentration de tête reste un peu plus forte qu’en Wallonie : les modes flamandes sont plus « grégaires » (cf. § feux de paille).

## 3. La taille des prénoms : le grand raccourcissement

Longueur moyenne en lettres, pondérée par les naissances :

| Territoire | Filles 1995 | Filles 2024 | Garçons 1995 | Garçons 2024 |
| --- | --- | --- | --- | --- |
| Belgique | 5.9 | 5.2 | 5.8 | 5.2 |
| Flandre | 5.6 | 5.1 | 5.5 | 5 |
| Wallonie | 6.4 | 5.2 | 6.3 | 5.4 |
| Bruxelles | 6 | 5.2 | 6.2 | 5.5 |

- Le raccourcissement est général (vague des Lou, Mia, Noa, Léa, Tom, Sam, Liam).
- La **Flandre** a les prénoms les plus courts (forte densité de prénoms en 4–5 lettres : Stan, Vince, Lars, Fien, Lore).
- La **Wallonie** et **Bruxelles** gardent des prénoms un peu plus longs (terminaisons -ine, -elle, -ette côté filles ; prénoms arabo-musulmans côté Bruxelles).

## 4. Les n°1 : règnes et successions, par territoire

### Filles
- **Belgique** : Laura (1995–2002) → Emma (2003–2018) → Olivia (2019–2024)
- **Flandre** : Laura (1995–1999) → Amber (2000–2002) → Emma (2003–2006) → Lotte (2007) → Emma (2008–2012) → Marie (2013) → Emma (2014) → Louise (2015) → Mila (2016) → Louise (2017) → Mila (2018) → Olivia (2019–2024)
- **Wallonie** : Laura (1995–2000) → Manon (2001–2002) → Léa (2003–2015) → Emma (2016–2018) → Olivia (2019) → Emma (2020–2021) → Olivia (2022) → Eva (2023–2024)
- **Bruxelles** : Sarah (1995–1997) → Laura (1998–2001) → Sarah (2002–2005) → Lina (2006) → Sarah (2007–2008) → Lina (2009–2011) → Aya (2012) → Lina (2013–2014) → Nour (2015) → Lina (2016–2017) → Nour (2018–2019) → Sofia (2020) → Lina (2021) → Nour (2022) → Sofia (2023–2024)

### Garçons
- **Belgique** : Thomas (1995–2003) → Noah (2004–2006) → Nathan (2007) → Noah (2008–2009) → Lucas (2010–2012) → Louis (2013–2015) → Lucas (2016) → Liam (2017) → Arthur (2018–2020) → Noah (2021–2024)
- **Flandre** : Thomas (1995–1997) → Robin (1998) → Thomas (1999) → Robbe (2000–2003) → Milan (2004–2007) → Noah (2008) → Lars (2009) → Louis (2010) → Lucas (2011–2016) → Liam (2017) → Arthur (2018) → Liam (2019) → Noah (2020–2024)
- **Wallonie** : Nicolas (1995–1996) → Thomas (1997) → Nicolas (1998–1999) → Thomas (2000–2002) → Hugo (2003) → Noah (2004–2006) → Nathan (2007–2012) → Hugo (2013–2014) → Louis (2015) → Gabriel (2016–2018) → Louis (2019) → Gabriel (2020–2024)
- **Bruxelles** : Nicolas (1995) → Mohamed (1996) → Nicolas (1997) → Mohamed (1998–2011) → Adam (2012–2019) → Mohamed (2020–2021) → Adam (2022–2024)

> Sur 30 ans, les trois régions n’ont eu **le même prénom n°1** que **2 année(s) côté filles** et **0 côté garçons**. La Belgique « moyenne » masque trois pays de prénoms.

## 5. Ascensions et chutes (moyenne 1995–1999 → 2020–2024)

### Filles
- **Belgique** — ▲ Olivia (+491), Mila (+394), Lina (+332), Mia (+315), Sofia (+313), Ella (+247)
- **Belgique** — ▼ Laura (-1 200), Sarah (-724), Julie (-520), Charlotte (-518), Lisa (-484), Marie (-480)
- **Flandre** — ▲ Olivia (+298), Mila (+249), Nora (+203), Ella (+192), Noor (+185), Liv (+179)
- **Flandre** — ▼ Laura (-620), Jolien (-359), Lisa (-352), Sarah (-330), Charlotte (-329), Ellen (-286)
- **Wallonie** — ▲ Olivia (+162), Mia (+148), Emma (+139), Giulia (+134), Alba (+129), Jade (+129)
- **Wallonie** — ▼ Laura (-486), Marie (-382), Manon (-358), Sarah (-294), Pauline (-257), Justine (-248)
- **Bruxelles** — ▲ Nour (+63), Sofia (+62), Lina (+47), Inaya (+39), Aya (+37), Amira (+37)
- **Bruxelles** — ▼ Sarah (-100), Laura (-95), Marie (-55), Imane (-53), Yousra (-52), Morgane (-42)

### Garçons
- **Belgique** — ▲ Noah (+561), Adam (+428), Liam (+426), Jules (+425), Gabriel (+354), Arthur (+288)
- **Belgique** — ▼ Thomas (-965), Nicolas (-669), Dylan (-578), Maxime (-554), Kevin (-500), Robin (-463)
- **Flandre** — ▲ Noah (+353), Leon (+255), Finn (+251), Jules (+231), Adam (+227), Liam (+215)
- **Flandre** — ▼ Thomas (-464), Jonas (-417), Robin (-415), Jens (-384), Jordy (-337), Michiel (-321)
- **Wallonie** — ▲ Gabriel (+227), Jules (+176), Liam (+175), Noah (+151), Léo (+131), Achille (+130)
- **Wallonie** — ▼ Nicolas (-464), Thomas (-424), Maxime (-400), Julien (-349), Dylan (-327), Quentin (-301)
- **Bruxelles** — ▲ Adam (+91), Yanis (+61), Amir (+59), Noah (+59), Gabriel (+55), Imran (+51)
- **Bruxelles** — ▼ Nicolas (-89), Thomas (-76), Maxime (-65), Alexandre (-62), Julien (-55), Antoine (-52)

- Hausses partagées : **Olivia, Mila, Lina, Sofia** (filles) ; **Noah, Adam, Jules, Gabriel, Arthur** (garçons) montent dans presque tous les territoires.
- Chutes communes : la génération **Laura/Sarah/Julie** et **Thomas/Nicolas/Kevin/Dylan** s’effondre partout — ces prénoms très « années 90 » datent fortement une personne.

## 6. Les feux de paille (montée et chute entièrement visibles)

Prénoms discrets en 1995, sommet net au milieu de la période, retombés sous un cinquième du pic en 2024 (entre parenthèses : l’année du pic) :

### Filles
- **Belgique** : Amber (2000), Femke (2001), Océane (2000), Britt (2001), Zoë (2006), Merel (2005), Febe (2004), Anouk (2006), Enora (2011), Rania (2006)
- **Flandre** : Amber (2000), Femke (2001), Britt (2001), Zoë (2006), Merel (2005), Febe (2004), Noa (2010), Zita (2007), Enora (2011), Chloë (2000)
- **Wallonie** : Clara (2006), Océane (2000), Lola (2006), Célia (2006), Lilou (2011), Elsa (2015), Laure (2001), Chiara (2005), Alizée (2001), Enora (2015)
- **Bruxelles** : Rania (2002), Inès (2006), Salma (2007), Malak (2014)

### Garçons
- **Belgique** : Robbe (2001), Senne (2002), Lars (2009), Wout (2006), Daan (2008), Seppe (2004), Rune (2004), Xander (2004), Quinten (2004), Jarne (2001)
- **Flandre** : Robbe (2001), Milan (2004), Senne (2002), Lars (2009), Wout (2006), Daan (2008), Seppe (2004), Rune (2004), Xander (2004), Quinten (2004)
- **Wallonie** : Nathan (2009), Mathéo (2008), Dorian (2000), Mathys (2009), Nolan (2014), Mattéo (2005), Lukas (2004), Kylian (2005), Esteban (2005), Ryan (2000)
- **Bruxelles** : Ayoub (2003), Amine (2006)

- Phénomène **massivement flamand** : Amber, Britt, Femke, Merel (filles) ; Robbe, Senne, Wout, Seppe, Xander, Daan (garçons). Les modes néerlandophones montent et retombent par vagues serrées et synchronisées.
- Côté francophone, les bascules sont plus lentes ; Bruxelles voit surtout émerger (Nour, Rania, Aya) plus que retomber.

## 7. Trois cultures de prénoms : le grand écart régional

Poids dans les naissances nommées : Flandre 56.8 %, Wallonie 32.8 %, Bruxelles 10.4 %.

### 7a. Distance entre régions (recouvrement du top 20, indice de Jaccard moyen)
| Paire | Filles | Garçons |
| --- | --- | --- |
| Flandre ↔ Wallonie | 17.4 % | 16 % |
| Flandre ↔ Bruxelles | 11.4 % | 11.4 % |
| Wallonie ↔ Bruxelles | 27.9 % | 26 % |

- La **Flandre** partage très peu de prénoms de tête avec le Sud (univers néerlandophone).
- **Bruxelles** s’éloigne des deux autres par sa forte présence de prénoms arabo-musulmans dès les années 1990.

### 7b. Prénoms emblématiques de chaque région
- **Flandre** — Filles : Lotte, Amber, Ella, Lore, Noor, Eline, Hanne, Fien
- **Flandre** — Garçons : Robbe, Jonas, Milan, Alexander, Lars, Wout, Elias, Seppe
- **Wallonie** — Filles : Manon, Camille, Léa, Chloé, Juliette, Eva, Lucie, Alice
- **Wallonie** — Garçons : Louis, Nathan, Maxime, Nicolas, Hugo, Tom, Gabriel, Alexandre
- **Bruxelles** — Filles : Nour, Rania, Imane, Salma, Assia, Yousra, Hajar, Malak
- **Bruxelles** — Garçons : Mohamed, Ayoub, Mehdi, Anas, Yassine, Amine, Wassim, Walid

*(« Belgique » n’a pas de signature propre : c’est par construction la somme des trois.)*

## 8. La carte fine : les 11 provinces (2017–2024)

Prénom n°1 cumulé 2017–2024 par province (rattachée à sa région) :

| Province | Région | Filles n°1 | Garçons n°1 | Prénoms distincts (F) |
| --- | --- | --- | --- | --- |
| Anvers | Flandre | Olivia | Noah | 758 |
| Brabant flamand | Flandre | Olivia | Noah | 469 |
| Brabant wallon | Wallonie | Alice | Arthur | 160 |
| Flandre occidentale | Flandre | Olivia | Arthur | 415 |
| Flandre orientale | Flandre | Olivia | Noah | 590 |
| Hainaut | Wallonie | Emma | Gabriel | 489 |
| Liège | Wallonie | Olivia | Gabriel | 427 |
| Limbourg | Flandre | Ella | Noah | 335 |
| Luxembourg | Wallonie | Emma | Jules | 128 |
| Namur | Wallonie | Olivia | Gabriel | 189 |
| Région Bruxelles-Capitale | Bruxelles | Sofia | Adam | 645 |

- Province la plus **diverse** (filles) : **Province d’Anvers** (758 prénoms distincts).
- **Flandre** : n°1 partagés Olivia / Noah, sauf le Limbourg (Ella) et la Flandre occidentale (Arthur).
- **Wallonie** : Gabriel domine au Sud, Arthur en Brabant wallon ; côté filles Olivia / Emma / Alice.
- **Bruxelles** : seule province où Sofia et Adam arrivent en tête — signature multiculturelle nette.

## 9. Prénoms mixtes, par territoire

Prénoms donnés aux deux sexes de façon significative (part du sexe minoritaire ≥ 15 %) :

- **Belgique** : Noa (49.3 %), Lou (42.8 %), Sam (26.3 %), Charlie (39.1 %), Lio (44.5 %), Sasha (36.2 %), Rune (17.2 %), Eden (18.2 %), Jente (44 %), Noé (15.5 %)
- **Flandre** : Sam (30.7 %), Lou (38.2 %), Lio (45.3 %), Rune (17.2 %), Maxime (16.6 %), Jente (43.7 %), Noa (17 %), Luka (28 %), Beau (44.3 %), Yentl (42.9 %)
- **Wallonie** : Charlie (46.7 %), Sasha (33.5 %), Maé (34.7 %), Andréa (42.9 %), Yaël (38.5 %), Elie (19.3 %), Louison (28.9 %), Jessy (17.7 %), Morgan (17.3 %), Jude (16 %)
- **Bruxelles** : Noa (43.2 %), Charlie (33.9 %), Sasha (48.8 %)

- Les prénoms unisexes courts dominent : **Noa, Lou, Charlie, Sasha, Lio**. La Flandre y ajoute des formes propres (Jente, Rune, Bo), la Wallonie/Bruxelles des formes francophones (Noé, Eden, Andrea).

## 10. Ce que les données ne disent pas (limites)

- **Seuil des 5 occurrences** : toute la longue traîne est invisible ; on ne peut jamais affirmer qu’un prénom n’a *jamais* été donné, seulement qu’il est resté sous 5 cette année-là. Cette zone d’ombre grandit avec l’individualisation.
- **Antériorité** : les séries commencent en **1995**. Pour une personne née avant, on ne voit que la queue de la vague de son prénom.
- **Provinces** : disponibles seulement depuis **2017** (8 années) — géographie *récente*, pas historique.
- **Troncature régionale** : listes régionales limitées aux prénoms fréquents (≈ 94 % des naissances) ; les agrégats Flandre/Wallonie/Bruxelles sont de légers minorants.
- **Prénom usuel uniquement** : seconds prénoms et composés non dépliés.

---
*Sources : Statbel — Office belge de statistique. National & régional 1995–2024, provincial 2017–2024. Généré par `scripts/analyze.mjs`.*
