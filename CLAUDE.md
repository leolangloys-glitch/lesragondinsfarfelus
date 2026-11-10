# Site du Festival des Ragondins Farfelus

Ce fichier est la mémoire du projet. Toute nouvelle décision doit y être notée,
pour que chaque session (quelle que soit la personne qui la lance) reparte des
mêmes informations.

## Le festival

- Festival de musique et de magie, caritatif.
- Lieu : Domaine de Briquemault, 45230 Sainte-Geneviève-des-Bois (Loiret).
  Site du domaine : https://domainedebriquemault.com
- 1re édition : 30 et 31 mai 2026.
- 2e édition : **vendredi 28, samedi 29 et dimanche 30 mai 2027** (confirmé par
  l'équipe ; « été 2027 » sur le site du domaine est une erreur).
- Au profit de l'association Handi'Chiens.
- Entrée gratuite pour les moins de 11 ans et les personnes en situation de
  handicap (info de l'édition 2026, à reconfirmer pour 2027).
- Mission : « vous faire vivre une expérience immersive où la musique
  rencontre l'illusion ».
- Univers : un monde mystérieux, onirique et hors du temps qui s'éveille une
  fois par an au cœur du Loiret. Croisement entre « surréalisme magique » et
  « grand spectacle pop rock électro ». Fusion nature, musique, illusion.

### Déroulé prévu pour 2027

- Deux plateaux : **musique** (jazz, jazz manouche, rock, pop, DJ sets) et
  **magie** (numéros sur scène + close-up dans le public).
- Vendredi : ouverture du camping l'après-midi, concerts en soirée, DJ sets
  tard dans la nuit.
- Samedi : grosse journée, magiciens sur scène et en close-up, soirée têtes
  d'affiche.
- Dimanche : journée familiale.

**Aucun nom d'artiste n'est publié sur le site ni écrit dans ce dépôt tant
que l'équipe ne l'a pas confirmé.** Les listes de têtes d'affiche envisagées
sont des souhaits, pas une programmation.

## Direction artistique

Une graphiste travaille sur la nouvelle identité (piste n°1 en cours, piste
n°2 pas encore commencée). Tout ce qui suit est provisoire.

- Couleurs (relevées sur la piste n°1) : vert `#083D3D`, rose `#FFA0CB`,
  crème `#FFF6D8`, noir, et un doré en dégradé pour les touches « magie /
  premium ». Variables dans `src/styles/global.css`.
- Brief couleurs de l'équipe : garder vert + rose, aller vers des teintes
  riches et profondes « nuit de festival » (vert forêt/émeraude, rose néon /
  violet mystique, doré brillant en touche).
- Typographie : titre du festival en style « grimoire / cabaret chic »
  modernisé (c'est le logo) ; informations et noms d'artistes en typo
  contemporaine, épurée, très lisible.
- Polices provisoires du site : Fraunces (titres) et Outfit (texte),
  hébergées avec le site (pas de Google Fonts, pour le RGPD).
- Éléments graphiques de la piste n°1 : logo avec grain, cadre doré organique
  (portail), sol en damier, escalier, fond vert en dégradé radial avec grain.
- La mascotte ragondin est en refonte (majestueuse, charismatique,
  énigmatique). L'ancienne illustration faite par IA n'est plus utilisée.
- Ton : magique, onirique, premium, avec une pointe d'humour. Inspiration
  « monde merveilleux », sans copier un univers existant.

## Décisions prises

- **Site séparé** du site du domaine, avec une identité propre.
- **Liens dans les deux sens** : une page « Le lieu » renvoie vers le site du
  domaine ; le site du domaine garde une courte page festival qui renvoie ici.
- **Nom de domaine** : `lesragondinsfarfelus`, acheté chez OVH (extension à
  confirmer).
- **Hébergement** : GitHub Pages, domaine géré chez OVH.
- **Technique** : site statique avec Astro.
- **Billetterie** : outil externe intégré au site (nom exact à confirmer).

## Pages du site

Menu principal : Programmation · Infos · Cashless · Bénévoles · Partenaires +
bouton Billetterie. Pied de page : Domaine, Presse, Contact, Mentions légales,
Confidentialité. Menus et liens externes : `src/data/site.ts`.

| Page | Fichier |
| --- | --- |
| Accueil (entrée 3D, univers, programme, retour 2026, solidarité) | `src/pages/index.astro` |
| Programmation (3 jours, plateaux musique/magie, artistes « mystère ») | `programmation.astro` |
| Billetterie (formules, gratuités, module du prestataire, FAQ) | `billetterie.astro` |
| Cashless (étapes, recharge en ligne, FAQ) | `cashless.astro` |
| Infos pratiques (dates, accès, camping, accessibilité, sur place, FAQ, contact) | `infos.astro` |
| Devenir bénévole | `benevoles.astro` |
| Devenir partenaire (niveaux Lanterne / Étoile / Portail, provisoires) | `partenaires.astro` |
| Le Domaine de Briquemault | `domaine.astro` |
| Espace presse | `presse.astro` |
| Mentions légales, confidentialité, page 404 | `mentions-legales.astro`, `confidentialite.astro`, `404.astro` |

Billetterie, recharge cashless, formulaires et newsletter passent par des
outils externes : renseigner leurs liens dans `liensExternes` (`src/data/site.ts`),
les boutons s'activent tout seuls. Les éléments à compléter sont marqués avec
la classe `a-completer` (chercher `a-completer` dans `src/`).

## L'entrée dans le monde (page d'accueil)

- Inspiration : l'expérience immersive symphonyofvines.unseen.co (portail
  qu'on traverse pour entrer dans un monde). On crée **notre** monde, on ne
  copie rien. Demande de l'équipe : rendu **réaliste**, « comme un jeu vidéo ».
- Code : `src/scripts/monde.ts` (Three.js). L'ancienne version stylisée est
  gardée dans `src/scripts/monde-stylise.ts`.
- **Le seuil** : antichambre de marbre vernis en damier, colonnes, brume. Le
  cadre doré de la graphiste est extrudé en vrai relief métallique à partir de
  son contour (`public/brouillon/cadre-or.json`, tracé depuis son PDF). À
  travers le portail on voit déjà le monde. Clic → la caméra traverse.
- **Le monde : les berges enchantées du Loing** (demande de l'équipe : partir
  de l'univers de Briquemault — nature, bord du Loing, ragondins, animaux
  sauvages — en gardant du fluo, et s'éloigner d'« Alice au pays des
  merveilles »). La rivière traverse la vue, couverte de plancton
  bioluminescent ; des ragondins (dents orange, yeux dorés, moustaches) y nagent
  en laissant un sillage de lumière, d'autres grignotent sur les berges.
  Héron cendré dans les roseaux, chevreuil sur l'autre rive, chouettes aux yeux
  d'or, roseaux et massettes lumineux, nénuphars en fleurs, lanternes qui
  dérivent, petit pont de bois en arc. Après la traversée du portail, on se
  retrouve au sommet du pont, à regarder le Loing descendre.
- Autour : vraie forêt générée (ez-tree), herbe au vent, champignons géants
  bioluminescents d'après les références de l'équipe (chapeau sombre piqueté,
  lamelles orange-rose lumineuses, pied courbé) mais au second plan, petits
  champignons lumineux, lucioles, notes de musique, scène et faisceaux, château
  dans la brume. Ambiance nuit violette (« violet mystique » du brief). Plus de
  cartes à jouer (trop « Alice »).
- Réglages de la rivière : constantes `RIV_*` dans `monde.ts`
  (`distRiviere`, `pointRiviere`). Eau en vrai miroir sur ordinateur
  (`Reflector`), surface brillante sur téléphone.
- Rendu : matériaux physiques, HDRI, ombres, halo, vignettage et grain.
  Qualité adaptative (jusqu'à la 4K sur écran 4K, allégée sur téléphone et
  baissée automatiquement si l'appareil peine). `?qualite=haute` ou
  `?qualite=basse` dans l'adresse force un niveau pour tester.
- Poids : le module 3D fait environ 5 Mo (dont les textures des arbres), chargé
  **après** l'affichage de la page. Sans WebGL ou avec « réduire les
  animations », le visuel 2D reste affiché. Le texte reste dans le HTML.
- Ressources libres dans `public/monde/` (crédits dans `CREDITS.md` du
  dossier) : herbe, fleurs, rochers, textures de sol (démo ez-tree, MIT),
  HDRI Poly Haven (CC0) via `@pmndrs/assets`. Les rochers ont été décompressés
  (pas de décodeur Draco nécessaire).
- Bouton « Passer l'introduction ». Après la traversée, la session s'en
  souvient.
- Pas de son pour l'instant (à décider, droits sur la musique nécessaires).
- Sur ordinateur, le texte d'accueil se range à droite après la traversée ; sur
  téléphone, en haut et en bas, pour laisser voir le monde au centre.
- Pour aller plus loin : vrais modèles 3D d'animaux et de la mascotte (artiste
  3D), illustrations de la graphiste en calques, ou séquence vidéo
  précalculée en 4K.

## Référencement (priorité de l'équipe)

- Chaque page a un titre et une description uniques (props de `Base.astro`).
- Données structurées : `Festival` (accueil, programmation), `FAQPage` (infos).
- Plan du site généré automatiquement (`@astrojs/sitemap`), `robots.txt`.
- Adresses officielles avec barre finale : les liens internes s'écrivent
  `/programmation/`, jamais `/programmation`.
- Adresse du site provisoire `https://lesragondinsfarfelus.fr` : à corriger
  dans `astro.config.mjs`, `public/robots.txt` et `src/data/site.ts` si
  l'extension change.
- Image de partage : `public/brouillon/partage.jpg` (1200×630).

## À décider

- Formulaires bénévoles / partenaires / presse : outil (Tally, Google Forms…).
- Newsletter : outil (Brevo, Mailchimp…).
- Langues : français seul ou français + anglais.
- Son d'ambiance sur l'entrée 3D.

## Technique

- `npm install` puis `npm run dev` pour travailler, `npm run build` pour
  construire le site dans `dist/`.
- Pages : `src/pages/`. Mise en page commune : `src/layouts/Base.astro`.
  En-tête et pied de page : `src/components/`.
- Couleurs, polices et boutons communs : `src/styles/global.css`.
- Aperçu partageable (Artifact) : `npm run build` puis
  `python3 -I outils/apercu.py dist <dossier>` produit des pages autonomes
  (les .glb y sont renommés en .glb.wasm, seul format binaire accepté).
- `public/brouillon/` : visuels provisoires de la graphiste. **Ce dossier est
  exclu du dépôt** (`.gitignore`) tant que le dépôt est public et que les
  visuels ne sont pas validés. Il faut les y remettre à la main pour voir le
  site complet.

## Règles de travail

- On s'inspire de la **structure** d'autres sites de festival, jamais de leur
  design, de leurs textes, de leurs images ni de leur code.
- **Accessibilité** prioritaire (public du festival) : contrastes suffisants,
  textes alternatifs sur les images, navigation au clavier, tailles de texte
  lisibles, respect de « réduire les animations ».
- Conçu d'abord pour le téléphone.
- **Dépôt public** : ne jamais y mettre de données personnelles (bénévoles,
  contacts, adresses e-mail privées), de mots de passe, ni d'informations
  internes (budget, artistes non confirmés, objectifs de fréquentation).
- Mentions légales obligatoires avant la mise en ligne.
- `main` = version en ligne. Les modifications se font sur une branche et sont
  validées par l'équipe avant d'être fusionnées.
- Tous les textes sont provisoires : à faire relire par l'équipe. Points à
  valider en priorité : FAQ cashless (paiement uniquement cashless, recharge
  sur place, remboursement, bracelet perdu), FAQ billetterie, avantages
  bénévoles, niveaux de partenariat, présentation de Handi'Chiens.
