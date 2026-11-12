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
| Accueil : entrée par le miroir, puis le haut sur fond noir (titre, infos), le festival en bref, programme, billetterie, retour 2026, solidarité, le lieu | `src/pages/index.astro` |
| Programmation (3 jours, plateaux musique/magie, artistes « mystère ») | `programmation.astro` |
| Billetterie (formules, gratuités, module du prestataire, FAQ) | `billetterie.astro` |
| Cashless (étapes, recharge en ligne, FAQ) | `cashless.astro` |
| Infos pratiques (dates, accès, camping, accessibilité, sur place, FAQ, contact) | `infos.astro` |
| Venir au festival (temps de trajet, train, covoiturage, FAQ) | `venir.astro` |
| Devenir bénévole | `benevoles.astro` |
| Devenir partenaire (niveaux Lanterne / Étoile / Portail, provisoires) | `partenaires.astro` |
| Le Domaine de Briquemault | `domaine.astro` |
| Espace presse | `presse.astro` |
| Mentions légales, confidentialité, page 404 | `mentions-legales.astro`, `confidentialite.astro`, `404.astro` |

Billetterie, recharge cashless, formulaires et newsletter passent par des
outils externes : renseigner leurs liens dans `liensExternes` (`src/data/site.ts`),
les boutons s'activent tout seuls. Les éléments à compléter sont marqués avec
la classe `a-completer` (chercher `a-completer` dans `src/`).

## La page d'accueil : l'entrée par le miroir

- **Demande de l'équipe (novembre 2026)** : quand on arrive sur le site, on ne
  voit **que le miroir** de l'affiche de la graphiste et la phrase « Cliquez sur
  le miroir pour entrer » (« Touchez » sur téléphone) : pas de menu, pas de
  défilement. **En cliquant sur le miroir, on entre dans le site** : le haut de
  l'accueil sur **fond noir** (logo, festival de musique et de magie, lieu,
  dates, genres, têtes d'affiche, boutons Billetterie et Programmation), puis
  toutes les sections de l'accueil, le menu, le pied de page et toutes les pages.
- Technique : l'entrée (`.entree`) est un écran fixe par-dessus la page ; tout
  le contenu de l'accueil reste dans le HTML (bon pour Google). Un petit script
  dans le `<head>` affiche le miroir **à chaque ouverture ou rechargement de
  l'accueil** (demande de l'équipe, pour pouvoir le montrer). Seule exception :
  l'adresse `/#site` mène directement au site. Sans JavaScript : le site
  s'affiche directement.
- L'affiche est reproduite **au pixel près** : miroir doré, sol en damier,
  escalier, positions relevées sur l'affiche de 848 × 1200 (commentaires de
  `.affiche` dans `index.astro`). Dans le miroir, **seul le titre** (le logo),
  un peu plus grand que sur l'affiche, centré dans l'ouverture.
- Dans l'affiche, le miroir n'est pas tout à fait centré : marches et damier
  sont alignés sur le bas du miroir, un peu à droite. Pour que les carreaux
  soient bien droits, l'affiche est décalée de 1,63 % : le point de fuite du
  damier et l'escalier tombent pile au milieu de l'écran. Ne pas « recentrer »
  le miroir.
- Le sol est un SVG extensible qui reproduit celui de la graphiste (mêmes
  couleurs, même perspective, même découpe) pour remplir tout l'écran :
  `python3 -I outils/sol-damier.py public/brouillon/sol-damier.webp public/brouillon/sol-damier.svg`
  (à relancer si la graphiste change son sol).
- **L'eau du miroir** (`src/scripts/miroir-eau.ts`, WebGL sans bibliothèque) :
  au survol ou au toucher, de petites vagues partent comme un caillou tombé
  dans l'eau et le titre ondule ; une goutte tombe aussi toute seule de temps
  en temps. Le canvas redessine le dégradé, le grain et le logo (à
  l'identique), découpé à la forme de l'ouverture (`cadre-or.json`).
- **Entrée** : uniquement en cliquant ou touchant le miroir (vrai bouton,
  clavier compris). Grosse vague, l'affiche grandit autour du miroir, tout passe
  au noir et le site apparaît (titre puis infos), en environ 1,1 s. Tant que le
  miroir est affiché, le reste de la page est inaccessible (`inert`).
- **Toute la 3D a été retirée** à la demande de l'équipe (« pas très beau ») :
  le haut de l'accueil est sur fond noir. La dernière version est archivée dans
  `archives/3d/monde-peinture.ts` (voir le LISEZMOI). La graphiste va dessiner le
  monde **en illustrations par calques**, que le site animera (profondeur,
  lucioles, reflets, brume, personnages), probablement derrière ce fond noir.
- Avec « réduire les animations » : pas de vagues ni de zoom, le noir arrive
  en fondu.
- Note : l'affiche de la graphiste indique « 42350 », le bon code postal est
  **45230**.
- Inspirations envoyées par l'équipe (ne pas utiliser telles quelles, droits
  inconnus) : forêt de champignons lumineux, îles flottantes, jardin au clair
  de lune, martin-pêcheur, pic noir, effraie, renard, ragondin, fritillaire,
  citron, caloptéryx, lucioles, photo du château (ruines du domaine : deux
  tours rondes sans toit, mur en briques à arcades, douves, lavande, peupliers).
- Pas de son pour l'instant (à décider, droits sur la musique nécessaires).

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
  « Le festival en bref », faciles à citer par Google et les assistants IA
  (le miroir est par-dessus, mais tout ce contenu est dans le HTML).
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
- Poids : environ 1,3 Mo en tout (plus de 3D ni de Three.js).
- `public/brouillon/` : visuels provisoires de la graphiste. **Ce dossier est
  exclu du dépôt** (`.gitignore`) tant que le dépôt est public et que les
  visuels ne sont pas validés. Il faut les y remettre à la main pour voir le
  site complet.

## Mise en ligne (à faire)

- Publication automatique prête : `.github/workflows/mise-en-ligne.yml` (à
  chaque modification de `main`, le site est reconstruit et publié sur GitHub
  Pages). Il refuse de publier si les visuels de `public/brouillon/` manquent.
- Avant : compléter les mentions légales (structure, forme juridique, adresse,
  SIRET/RNA, contact, directeur de la publication) ; accord de la graphiste
  pour publier ses visuels (ils doivent alors entrer dans le dépôt, retirer
  `public/brouillon/` du `.gitignore`) ; choisir l'extension du domaine.
- GitHub : Settings > Pages > Source = « GitHub Actions » ; domaine
  personnalisé dans Settings > Pages (+ fichier `public/CNAME`) ; « Enforce
  HTTPS ». Puis fusionner la branche de travail dans `main` (après validation).
- OVH, zone DNS du domaine : 4 enregistrements A vers 185.199.108.153,
  185.199.109.153, 185.199.110.153, 185.199.111.153 (et AAAA
  2606:50c0:8000::153, 8001::153, 8002::153, 8003::153), `www` en CNAME vers
  `leolangloys-glitch.github.io.` ; supprimer l'ancien A / la redirection OVH.
- Après : Google Search Console (validation par TXT chez OVH, envoyer
  `sitemap-index.xml`), Bing Webmaster Tools, fiche Google du festival.

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
