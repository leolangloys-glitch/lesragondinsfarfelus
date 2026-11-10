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

- **Demande de l'équipe** : la première chose qu'on voit est le **miroir de
  la graphiste** (cadre doré) ; quand on clique dessus, on entre dans le monde
  des Ragondins Farfelus, où la faune et la flore du Loiret se sont
  « réveillées » et sont magiques. Rendu **réaliste**, **pas « 3D jeu
  vidéo »**, couleurs **vert profond + rose clair**, et site **très bien
  référencé**. Le ragondin farfelu est l'image du festival.
- Fonctionnement (`src/pages/index.astro`, sans bibliothèque 3D) :
  - **seuil** : le miroir doré, avec à travers lui la vraie photo du ragondin
    qui nage ; lucioles autour ; boutons « Entrer dans le monde » et
    « Passer l'introduction » ;
  - **traversée** : au clic, le miroir s'agrandit (CSS) jusqu'à remplir
    l'écran ;
  - **monde** : la photo en plein écran (lente respiration, léger effet de
    profondeur à la souris), lucioles jaune-vert et roses dessinées en 2D,
    infos du festival (à gauche sur ordinateur ; logo en haut, dates et
    boutons en bas sur téléphone pour laisser voir le ragondin).
  - L'état « monde » est celui du HTML (sans JavaScript, et pour Google). Un
    petit script passe au « seuil » avant l'affichage si on n'est pas encore
    entré dans la session et si « réduire les animations » n'est pas activé.
- Section **« Les habitants du Loing »** juste après l'introduction : vraies
  photos dans des cadres en arche dorés, avec nom, nom latin, texte et crédit :
  ragondin, martin-pêcheur, caloptéryx vierge, effraie des clochers, renard
  roux, pic noir, fritillaire pintade (la fleur à damier !), citron, ver
  luisant. Bon pour le référencement local (faune et flore du Loiret).
- Inspirations envoyées par l'équipe (ne pas utiliser telles quelles, droits
  inconnus) : forêt de champignons lumineux, martin-pêcheur, pic noir, effraie,
  renard, ragondin, fritillaire, citron, caloptéryx, lucioles.
- Les anciennes versions en 3D sont dans `archives/3d/` (voir son LISEZMOI).
- Pas de son pour l'instant (à décider, droits sur la musique nécessaires).

## Photos

- Vraies photos libres de **Wikimedia Commons** (CC0, CC BY, CC BY-SA),
  téléchargées depuis `upload.wikimedia.org`. L'API de Commons limite fortement
  les requêtes : espacer les recherches.
- Étalonnage aux couleurs du festival (ombres vert profond, lumières crème
  rosé, lueur rose, vignettage) et recadrage 4:5 : `outils/etalonnage.py`
  (sources dans un dossier de travail, sorties dans `public/photos/`).
- **Crédits obligatoires** : auteur + licence sous chaque photo et dans les
  mentions légales. Tout est dans `src/data/photos.ts` (ajouter une photo =
  ajouter une entrée avec son crédit). Pour CC BY-SA, les versions modifiées
  restent sous CC BY-SA (mention « couleurs modifiées »).
- À terme, les visuels de la graphiste (mascotte, illustrations) pourront
  remplacer ou compléter ces photos.

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
  (CSS et JS intégrés, images publiées à côté).
- Poids : le site complet fait environ 2 Mo (aucune bibliothèque lourde).
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
