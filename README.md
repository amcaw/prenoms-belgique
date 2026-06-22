# Les prénoms en Belgique (1995–2024)

Application de data-visualisation des prénoms des nouveau-nés en Belgique, à partir des données ouvertes de [Statbel](https://statbel.fgov.be/fr/themes/population/noms-et-prenoms/prenoms-filles-et-garcons). Plusieurs explorations interactives : comparateur de courbes, palmarès par région et par genre, cartes provinciales, modes, longueur des prénoms, et les prénoms portés par la fiction et les stars.

Construit avec **SvelteKit** (Svelte 5, runes), **D3** et **adapter-static**.

## Données

- Séries nationales et régionales (Flandre / Wallonie / Bruxelles), 1995–2024.
- Répartition provinciale, 2017–2024.
- Statbel ne publie pas les prénoms portés par moins de 5 enfants une même année : une absence ne signifie donc pas « aucune naissance », mais moins de 5 occurrences.

Les fichiers sources (`Statbel_data/*.xlsx`) sont convertis en JSON compacts au build (`scripts/build-data.mjs`) ; l'application ne charge que ces JSON.

## Développement

```bash
npm install
npm run dev      # serveur de dev
npm run build    # régénère les données puis build statique (dossier build/)
npm run preview  # prévisualise le build
```

## Déploiement

Déployé automatiquement sur GitHub Pages à chaque push sur `main` (voir `.github/workflows/deploy.yml`). Le chemin de base est dérivé du nom du dépôt.
