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
  des Ragondins Farfelus. Couleurs **vert profond + rose clair**, site **très
  bien référencé**. Le ragondin farfelu est l'image du festival.
- **Historique des essais** : V2 (monde 3D violet, champignons, cartes) =
  base retenue. Refusés : la version « berges du Loing » vue du pont, puis la
  version en vraies photos (« pas une vraie photo de ragondin »). Ensuite :
  « pas assez en mode dessiné » → rendu **peinture numérique**, dans
  l'ambiance des images d'inspiration envoyées par l'équipe (forêt de
  champignons lumineux reflétée dans l'eau, lampions, îles flottantes, lune).
- **Décision (novembre 2026)** : l'accueil est **exactement l'affiche de la
  graphiste**, au pixel près : miroir doré, sol en damier, escalier et textes
  aux positions relevées sur l'affiche de 848 × 1200 (voir les commentaires de
  `.affiche` dans `index.astro`). Dans l'affiche, le miroir n'est pas tout à
  fait centré : marches et damier sont alignés sur le bas du miroir, un peu à
  droite. C'est voulu, ne pas « recentrer ».
- **On n'entre dans le monde qu'en cliquant (ou touchant) le miroir** : rien
  d'automatique, pas de saut direct au monde en revenant sur l'accueil. Le
  miroir est un vrai bouton (clavier, lecteur d'écran) ; une petite phrase
  invite à cliquer.
- Le sol est un SVG extensible qui reproduit celui de la graphiste (mêmes
  couleurs, même perspective, même découpe) pour remplir tout l'écran :
  `python3 -I outils/sol-damier.py public/brouillon/sol-damier.webp public/brouillon/sol-damier.svg`
  (à relancer si la graphiste change son sol).
- Note : l'affiche de la graphiste indique « 42350 », le bon code postal est
  **45230** (le site affiche 45230).
- Fonctionnement (`src/pages/index.astro` + `src/scripts/monde.ts`, Three.js) :
  - **affiche** : l'affiche seule ; la 3D se prépare en arrière-plan sans
    calculer d'image (`enAttente`, économise la batterie) ;
  - **chargement** : clic avant que la 3D soit prête, le miroir scintille ;
  - **traversée** : le monde apparaît dans l'ouverture du miroir (masque tiré
    de `cadre-or.json`), l'affiche grandit autour de l'ouverture (on monte
    l'escalier et on plonge dans le miroir) pendant que la caméra avance ;
  - **monde** : chemin en damier entre deux étangs miroirs, forêt de
    champignons géants (chapeaux violets, lamelles orange lumineuses),
    ragondins farfelus magiques (chapeau haut-de-forme, baguette, pelage à
    constellations) sur des nénuphars géants, libellules, papillons, colibris,
    fritillaires à damier, œufs à pois, lampions-champignons, cartes à jouer,
    lucioles ; au loin le Loing et son pont, la scène et sa sphère armillaire
    dorée, le **château de Briquemault** (d'après la photo de l'équipe : deux
    tours rondes en ruine sans toit, mur en briques à arcades, douves à
    nénuphars, lavande, peupliers), une île flottante et sa cascade, des
    poissons fluo, une grande lune.
  - Par-dessus : l'« affiche » centrée (logo, festival de musique et de magie,
    Domaine | dates, genres, « Têtes d'affiche dévoilées très bientôt » tant
    qu'aucun nom n'est confirmé).
  - Filtre peinture en fin de chaîne (`PassePeinture`) ; reflets : un seul
    `Reflector` pour le Loing, les douves et les étangs (`construireEau`).
  - Sans JavaScript, sans WebGL ou avec « réduire les animations » : l'affiche
    reste seule (état « statique »), tout le texte est dans le HTML pour
    Google. `?qualite=haute|basse` pour forcer la qualité de la 3D.
- Inspirations envoyées par l'équipe (ne pas utiliser telles quelles, droits
  inconnus) : forêt de champignons lumineux, îles flottantes, jardin au clair
  de lune, martin-pêcheur, pic noir, effraie, renard, ragondin, fritillaire,
  citron, caloptéryx, lucioles, photo du château (ruines du domaine).
- Rien n'est copié : on reprend une ambiance, pas une image.
- **Avis de l'équipe sur la 3D** : « pas très beau », veut un rendu « fait par
  un graphiste ». Piste recommandée : le monde **dessiné par un ou une
  illustratrice en calques**, que le site anime (profondeur, lucioles, reflets,
  brume, personnages qui bougent). **L'équipe a choisi cette piste** : la
  graphiste va faire des illustrations. La 3D actuelle reste en attendant.
- L'ancienne version 3D stylisée est dans `archives/3d/` (voir son LISEZMOI).
- Pas de son pour l'instant (à décider, droits sur la musique nécessaires).

## Ressources 3D

- `public/monde/` : herbe, fleurs, rochers et textures de sol (démo ez-tree,
  MIT) ; crédits dans `public/monde/CREDITS.md`. Arbres générés par ez-tree,
  HDRI Poly Haven (CC0). Tout le reste (champignons, ragondins, château,
  animaux) est dessiné par le code.

## Référencement et « GEO » (priorité de l'équipe)

- **Publics visés** : Paris et l'Île-de-France, le Loiret (Orléans, Montargis,
  Gien), et les grandes villes autour (Fontainebleau, Melun, Auxerre, Sens…).
- Chaque page a un titre (≈ 70 caractères max avec le suffixe du nom) et une
  description (≤ 160) uniques, avec les mots-clés locaux (props de
  `Base.astro` ; `nomCourt` pour le fil d'Ariane, `indexer={false}` pour la 404).
- Page **« Venir au festival »** (`venir.astro`) : temps de trajet depuis
  Paris, l'Île-de-France, le Loiret, l'Yonne et le Cher (données `trajets`
  dans `site.ts`), train, covoiturage, FAQ. **Temps de trajet, gares et
  navettes : estimations à faire valider par l'équipe.**
- Accueil : phrase d'introduction factuelle (qui, quoi, où, quand) et fiche
  « Le festival en bref », faciles à citer par Google et les assistants IA.
- Données structurées (`site.ts`) : `WebSite` + `Organization` (accueil),
  `Festival` avec les trois jours, lieu géolocalisé, `Place` (domaine, venir),
  `FAQPage` (infos, venir), fil d'Ariane sur toutes les pages intérieures.
- Balises : robots, canonique, hreflang fr-FR, Open Graph et Twitter complets,
  balises géographiques (FR-45, coordonnées du bourg, à affiner).
- **GEO** (assistants IA) : `/llms.txt` (résumé du festival généré depuis
  `site.ts`, `src/pages/llms.txt.ts`) ; `robots.txt` autorise explicitement
  les robots des moteurs et des assistants (GPTBot, ClaudeBot, PerplexityBot…).
- Plan du site généré automatiquement (`@astrojs/sitemap`, avec date de mise
  à jour).
- Logo de l'accueil en deux tailles (`srcset`) pour charger vite sur téléphone.
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
- Poids : environ 8 Mo en tout ; la 3D (Three.js + ressources du monde) ne se
  charge que sur l'accueil, après l'affichage du texte.
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
