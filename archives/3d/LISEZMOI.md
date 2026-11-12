# Archives : les essais en 3D

Le monde en 3D a été retiré du site en novembre 2026 à la demande de l'équipe
(« pas très beau »). La graphiste va dessiner le monde en illustrations.

- `monde-peinture.ts` : dernière version (Three.js, rendu « peinture » :
  étangs, champignons, ragondins magiques, château de Briquemault).
- `monde-stylise.ts` : toute première version 3D stylisée.

Pour les réutiliser : réinstaller `three`, `@dgreenheck/ez-tree` et
`@pmndrs/assets`, récupérer les ressources `public/monde/` dans l'historique
git (commit « Accueil identique à l'affiche… » ou antérieur), remettre le
fichier dans `src/scripts/` et l'appeler depuis `src/pages/index.astro`.
