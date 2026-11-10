# Archives : l'entrée en 3D

Versions précédentes de l'entrée dans le monde, abandonnées à la demande de
l'équipe (« moins 3D, plus réaliste, et très bien référencé ») au profit de
vraies photos étalonnées et d'un miroir animé en CSS.

- `monde-stylise.ts` : première version 3D stylisée (Three.js).
- `monde-realiste.ts` : version 3D réaliste (forêt ez-tree, berges du Loing,
  ragondins et faune dessinés par le code).
- `ressources/` : herbe, fleurs, rochers et textures utilisés par la version
  réaliste (crédits dans `ressources/CREDITS.md`).

Pour les réutiliser : réinstaller `three`, `@dgreenheck/ez-tree` et
`@pmndrs/assets`, remettre le fichier dans `src/scripts/` et l'appeler depuis
`src/pages/index.astro`.
