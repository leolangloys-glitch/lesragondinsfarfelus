# Site du Festival des Ragondins Farfelus

Ce fichier est la mémoire du projet. Toute nouvelle décision doit y être notée,
pour que chaque session (quelle que soit la personne qui la lance) reparte des
mêmes informations.

## Le festival

- Festival de musique et de magie, édité et organisé par l'association
  **7 DE COEUR** (association déclarée, voir les mentions légales).
- Lieu : Domaine de Briquemault, 45230 Sainte-Geneviève-des-Bois (Loiret).
  Site du domaine : https://domainedebriquemault.com
- 1re édition : 30 et 31 mai 2026.
- 2e édition : **vendredi 28, samedi 29 et dimanche 30 mai 2027** (confirmé par
  l'équipe ; « été 2027 » sur le site du domaine est une erreur).
- **Plus au profit de Handi'Chiens** (novembre 2026). Une autre association est
  envisagée mais pas encore confirmée : **rien n'est publié à ce sujet** tant
  que l'équipe ne l'a pas validé (pas de section « solidarité » pour l'instant).
- Entrée gratuite pour les moins de 11 ans et les personnes en situation de
  handicap (info de l'édition 2026, à reconfirmer pour 2027).
- Mission : « vous faire vivre une expérience immersive où la musique
  rencontre l'illusion ».
- Univers : un monde mystérieux, onirique et hors du temps qui s'éveille une
  fois par an au cœur du Loiret. Croisement entre « surréalisme magique » et
  « grand spectacle pop rock électro ». Fusion nature, musique, illusion.

### Déroulé prévu pour 2027

- Deux plateaux : **musique** = DJ sets, pop, rock, électro (**pas de jazz**)
  et **magie** = magie fun (avec de l'humour), impressionnante et pleine de
  surprises, sur scène et en close-up (pas de
  « grands numéros d'illusion »).
- **Nombre d'artistes prévus (donné par l'équipe, novembre 2026)** : musique
  6 le vendredi, 13 le samedi, 5 le dimanche (24) — **des groupes autant que
  des artistes solo et des DJ** : toujours écrire « groupes, artistes et DJ »,
  jamais seulement « artistes musique » ; magie 3 à 4 le vendredi,
  5 à 6 le samedi, 5 le dimanche (13 à 15). Publiés sur Programmation
  (compteurs par jour + cartes « mystère » : 4 et 6 pour les fourchettes, à
  ajuster), accueil, données structurées et `llms.txt`. Bien expliquer les
  deux formes de magie : **sur scène** et **en close-up** (de tout près, au
  milieu du public).
- Vendredi : ouverture du camping, premiers concerts (et premiers tours de
  magie) en fin d'après-midi, puis DJ sets jusque tard dans la nuit.
- Samedi : magiciens sur scène et en close-up, concerts toute la journée,
  grande soirée avec les têtes d'affiche.
- Dimanche : journée des familles : de la musique **et** des spectacles de
  magie sur scène pour les enfants.
- Public : vendredi et samedi plutôt adulte ; dimanche ouvert aux familles et
  aux plus jeunes (pas « tout public »).
- Billetterie : **pass 1 jour (vendredi, samedi, dimanche), pass 2 jours et
  pass 3 jours avec camping** (confirmé par l'équipe, novembre 2026) ;
  **camping possible avec tous les pass** (1, 2 ou 3 jours) ; tarifs « à
  venir » (pas encore fixés). « Disponibles très prochainement ».
- Ton de la billetterie (demande de l'équipe) : donner envie à des
  **25-30 ans** sur **chacun des trois jours**, pas seulement le samedi ;
  **des surprises** annoncées chaque jour. Noms des jours : vendredi
  « L'éveil » (la soirée d'ouverture), samedi « La grande nuit » (la nuit des
  têtes d'affiche), dimanche **« Le grand final »** (entre amis ou en famille ;
  c'est toujours la journée des familles, avec les spectacles pour enfants).
- **Concours du meilleur costume** (demande de l'équipe, novembre 2026) : thème
  de la magie au sens large, ingéniosité et créativité, LED, paillettes,
  couleurs ; « les déguisements les plus créatifs seront choisis ». Section
  complète sur Programmation (`#concours`), carte courte sur l'accueil, FAQ
  Infos, `llms.txt` (`src/components/ConcoursCostume.astro`). **À confirmer** :
  jour, déroulé, jury, récompenses (le site dit « annoncés très bientôt »).
- **Nouveauté 2027 (donnée par l'équipe, novembre 2026)** : le château fort
  sera illuminé, avec une **scène sur pilotis** (page Domaine, accueil,
  `llms.txt`).
- L'équipe va reprendre tous les textes du site.

**Aucun nom d'artiste n'est publié sur le site ni écrit dans ce dépôt tant
que l'équipe ne l'a pas confirmé.** Les listes de têtes d'affiche envisagées
sont des souhaits, pas une programmation.

## Direction artistique

La graphiste, **Cécilie Larroya**, travaille sur la nouvelle identité (piste n°1 en cours, piste
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
- **Nom de domaine** : `lesragondinsfarfelus.com`, acheté chez OVH (avec la zone
  DNS, un MX Plan pour les e-mails, et un hébergement web OVH
  `lesragb.cluster129.hosting.ovh.net` qui ne sert pas : le site est sur GitHub
  Pages).
- **Hébergement** : GitHub Pages, domaine géré chez OVH.
- **Technique** : site statique avec Astro.
- **Billetterie** : outil externe intégré au site (nom exact à confirmer).

## Pages du site

Menu principal : Programmation · Le Domaine · Édition 2026 · Infos · Cashless ·
Bénévoles · Partenaires + bouton Billetterie (Domaine et Édition 2026 ajoutés à
la demande de l'équipe, novembre 2026, qui ne les retrouvait pas ; menu burger
en dessous de 1100 px de large, sinon le menu ne tient pas sur une ligne). Pied de page : Domaine, Édition 2026, Les newsletters,
Comment venir, Presse, Contact, Mentions légales, Confidentialité. Menus :
`src/data/site.ts`.

| Page | Fichier |
| --- | --- |
| Accueil : entrée par le miroir, puis le haut sur fond noir (titre, infos), le festival en bref, programme, billetterie, retour 2026 (4 photos + lien), le lieu | `src/pages/index.astro` |
| Programmation (3 jours, plateaux musique/magie : les artistes publiés, complétés par des cartes « mystère ») | `programmation.astro` |
| Une page par artiste (photo, texte, écoute, clip, liens), créée toute seule pour chaque fiche publiée | `artistes/[slug].astro` |
| Billetterie : « Pass 3 jours + camping » mis en avant (grande carte), puis pass vendredi / samedi / dimanche en arches (ambiance, accroche, chiffres du programme, « pour qui », bouton « Être prévenu » vers la newsletter tant que la billetterie n'est pas ouverte, « Réserver » ensuite), « Dans tous les pass », gratuités, module du prestataire, FAQ. Textes vendeurs (novembre 2026) : les 3 jours aussi désirables, surprises chaque jour, dimanche « Le grand final » ; pass 1, 2 et 3 jours confirmés, camping avec tous les pass, **tarifs à venir** | `billetterie.astro` |
| Cashless (étapes, recharge en ligne, FAQ) | `cashless.astro` |
| Infos pratiques (dates, accès, camping, accessibilité, sur place, FAQ, contact) | `infos.astro` |
| Venir au festival (temps de trajet, train, covoiturage, FAQ) | `venir.astro` |
| Devenir bénévole (avantages en premier, aftermovie bénévoles, missions, formulaire) | `benevoles.astro` |
| Devenir partenaire (Club Ragondins Farfelus VIP, Mécénat, Sponsoring, « Rejoignez l'aventure » + formulaire) | `partenaires.astro` |
| Le Domaine de Briquemault | `domaine.astro` |
| Espace presse (accréditation + formulaire, « Ils parlent de nous », en bref, ressources) | `presse.astro` |
| Édition 2026 (« Vous avez été nombreux, merci encore ! », aftermovie, photothèque) | `edition-2026.astro` |
| Les newsletters (archives) ; chaque lettre a une page web et une version e-mail | `lettres/index.astro`, `lettres/[slug]/` |
| Mentions légales, confidentialité, page 404 | `mentions-legales.astro`, `confidentialite.astro`, `404.astro` |

Billetterie, recharge cashless, formulaires externes, newsletter et réseaux
sociaux : leurs liens sont dans `src/data/reglages.json` (modifiable dans
l'administration, « Liens et contact ») et repris par `liensExternes`
(`src/data/site.ts`) ; les boutons s'activent tout seuls. Les éléments à
compléter sont marqués avec la classe `a-completer` (chercher `a-completer`
dans `src/`).

## L'interface d'administration (`/admin/`)

- **Sveltia CMS** (version figée 0.256.1, chargée depuis unpkg), configuré dans
  `public/admin/config.yml`. Pas de serveur ni de base de données : chaque
  enregistrement crée un commit sur **`main`**, le site se reconstruit tout seul
  (≈ 2 min). Elle ne fonctionne donc **qu'une fois le site fusionné dans
  `main` et en ligne**.
- **Accès protégé par un code** : on se connecte avec un jeton GitHub, que
  seules les personnes ayant le droit d'écrire dans le dépôt peuvent créer.
  Léo (propriétaire du dépôt) : jeton « fine-grained », uniquement ce dépôt,
  droit « Contents : Read and write ». Romane, Lolo… : d'abord invités comme
  collaborateurs (Settings > Collaborators), puis jeton « classic » avec la
  case `public_repo` (un jeton fine-grained personnel ne donne pas accès au
  dépôt de quelqu'un d'autre). Le jeton reste sur leur ordinateur : ne jamais
  le demander ni l'écrire dans le dépôt. Page `noindex` et interdite dans
  `robots.txt`.
- Ce qu'on y modifie :
  - **Artistes** (`src/content/artistes/*.md`) : nom, publié oui/non, jour,
    plateau, style, horaire, photo, accroche, ordre, lien d'écoute (Spotify,
    Deezer, SoundCloud…), clip YouTube, Instagram, site, texte. Rien n'apparaît
    tant que « Publié » n'est pas coché (règle : pas de nom non confirmé).
    `exemple-artiste.md` sert de modèle (non publié).
  - **Newsletters** (`src/content/lettres/*.md`) : titre, date, image de
    couverture, chapô, texte avec photos, bouton. Modèle toujours identique.
  - **Revue de presse** (`src/content/presse/*.md`) : média, titre, date, type,
    lien, résumé.
  - **Souvenirs 2026** (`src/data/souvenirs.json`) : aftermovie, aftermovie
    bénévoles (liens YouTube), photothèque (photo, légende, crédit).
  - **Liens et contact** (`src/data/reglages.json`).
- Images envoyées depuis l'administration : `public/medias/` (sous-dossiers
  artistes, lettres, presse, souvenirs). Pas de photo de personne sans son
  accord.

## Newsletter

- Outil conseillé : **Brevo** (gratuit jusqu'à 300 e-mails par jour,
  hébergé en Europe). L'équipe crée le compte et un formulaire d'inscription,
  puis colle son adresse (`https://….sibforms.com/serve/…`) dans « Liens et
  contact > Newsletter » : le formulaire du site l'envoie directement
  (`Newsletter.astro`, champs `EMAIL`, `email_address_check`, `locale`).
  Avec un autre outil, le bouton mène simplement à son lien.
- Envoyer une lettre : l'écrire dans l'administration (« Newsletters »), la
  publier, puis dans Brevo créer une campagne > « Importer depuis une URL »
  avec `https://lesragondinsfarfelus.com/lettres/NOM-DE-LA-LETTRE/email/`
  (HTML e-mail : tableaux, styles en ligne, adresses absolues, lien de
  désinscription `{{ unsubscribe }}`). La lettre reste aussi en ligne sur
  `/lettres/NOM/` (archives). Les versions e-mail sont `noindex` et hors du
  plan du site.

## Formulaires (bénévoles, partenaires, accréditation presse)

- `src/components/Formulaire.astro` : sans outil externe, l'envoi ouvre la
  messagerie du visiteur avec un e-mail déjà rempli (« Question : réponse »),
  et un bouton « Copier mes réponses » sert de secours si aucune messagerie ne
  s'ouvre. Types de champs : texte, e-mail, tél., liste, zone de texte,
  `cases` (plusieurs choix, « au moins une » si obligatoire) et `choix` (un
  seul). Dès qu'un lien de formulaire externe (Tally conseillé, hébergé en
  Europe) est renseigné dans « Liens et contact », un bouton y mène à la place.
- **Où arrivent les demandes** : partenaires et presse vers l'e-mail de
  contact (contact@domainedebriquemault.com) ; **bénévoles** vers « E-mail des
  inscriptions bénévoles » (`emailBenevoles` dans `reglages.json`, vide =
  e-mail de contact). Newsletter : pas encore branchée (Brevo à créer).
- **Inscriptions bénévoles ouvertes (novembre 2026)**, formulaire demandé par
  l'équipe : nom, e-mail, téléphone, ville, tranche d'âge, taille de t-shirt,
  disponibilités (montage, vendredi, samedi, dimanche, démontage), missions
  souhaitées, **qualités, défauts, motivation, expérience similaire de près
  ou de loin** (+ quelques mots). Âge minimum : non fixé (FAQ : autorisation
  parentale pour les mineurs, à confirmer). Ne jamais stocker les réponses
  dans le dépôt.

## Contenus confirmés (novembre 2026)

- **Bénévoles** : accès au festival en dehors de leurs créneaux et repas
  offerts pendant leurs missions : confirmés par l'équipe, mis en avant.
- **Partenaires** : structure inspirée de Cocorico Electro (Club VIP, mécénat,
  sponsoring, formulaire), **textes originaux**. Nom de l'espace VIP à
  confirmer.
- **Mécénat : l'association est éligible** (confirmé par l'équipe, novembre
  2026). Section « Le mécénat en pratique » sur la page Partenaires :
  entreprises 60 % du don en réduction d'impôt (plafond 20 000 € ou 0,5 % du
  CA HT, report sur 5 ans), particuliers 66 % (plafond 20 % du revenu
  imposable), reçu fiscal pour chaque don, dons en nature ou en compétences
  possibles. Taux 2026 (art. 200 et 238 bis du CGI) : à revérifier chaque
  année (loi de finances). Le formulaire accepte aussi les dons de
  particuliers.
- **Presse** : seule la fiche agenda du JDS (2026) a été trouvée en ligne ;
  la presse locale bloque les robots. L'équipe ajoute les articles dans
  l'administration. Les publications LinkedIn de particuliers ne sont **pas**
  reprises sans leur accord. Date limite des accréditations : à préciser.
- **Partenaires 2026** (liste donnée par l'équipe, novembre 2026) : 18 logos
  dans `src/data/partenaires.json` (modifiable dans l'administration,
  « Partenaires (logos) », images dans `public/medias/partenaires/`),
  affichés sur Partenaires et Édition 2026 (`LogosPartenaires.astro`) et cités
  dans `llms.txt`. **Retirés à la demande de l'équipe : 7 DE COEUR
  (l'organisateur) et AU 13.** Les logos ont été découpés dans une capture
  d'écran (petite résolution) : à remplacer par les fichiers d'origine en
  haute définition. Liens vers les sites : seulement Brasserie Galilée et le
  Domaine (les autres à compléter), en `rel="sponsored"`.
- **Photos et vidéos des bénévoles 2026** (envoyées par l'équipe, novembre
  2026) : `public/medias/benevoles/`, listes `photosBenevoles` et
  `videosBenevoles` de `souvenirs.json` (administration, « Souvenirs 2026 »),
  section « La troupe 2026 en action » de la page Bénévoles. Vidéos courtes
  réencodées **sans son** (musique de fond peut-être protégée), lecture
  automatique en boucle sauf « réduire les animations »
  (`src/components/Clips.astro`). Une photo recadrée pour retirer deux enfants
  au premier plan. Crédits photo à demander. Les longues vidéos vont sur
  YouTube.
- **Photos du domaine** (novembre 2026, à la demande de l'équipe) : reprises
  du site domainedebriquemault.com (lieux : forteresse, manoir, orangerie,
  théâtre de verdure, tente bambou, guinguette, cascade, parc ; 3 photos de
  concerts 2026), dans `public/medias/domaine/` et `public/medias/souvenirs/`,
  crédit « Domaine de Briquemault » (page Domaine, photothèque 2026, mentions
  légales). Textes des lieux réécrits pour le festival. Page Domaine : grande
  photo panoramique, photo des tours dans l'histoire, section « Un domaine,
  mille décors » (la forteresse illuminée en grand, « Nouveauté 2027 »).
  Photos envoyées par l'équipe ensuite : cours illuminées rose et vert (carte
  « Les cours illuminées »), concert de jour, régie, allée illuminée
  (photothèque 2026 ; ordre de `souvenirs.photos` = les 4 premières sur
  l'accueil). Projections lumineuses sur le manoir : carte « Le Manoir » (photo
  orange) et photothèque 2026 (photo bleue, 2e, donc aussi sur l'accueil).
  Photo de nuit de l'Orangerie : à renvoyer (non reçue en fichier).
- **Édition 2026** : aucun chiffre de fréquentation publié (« vous avez été
  nombreux »). Aftermovies « bientôt publiés ».

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
  l'accueil** (demande de l'équipe, pour pouvoir le montrer). Exceptions :
  l'adresse `/#site`, et les visiteurs qui arrivent **depuis un moteur de
  recherche ou un assistant IA** (Google, Bing, DuckDuckGo, Qwant, Ecosia,
  ChatGPT, Perplexity, Claude, Copilot, Gemini, Mistral… : test sur
  `document.referrer`), qui arrivent directement sur le site : Google pénalise
  les écrans qui cachent le contenu aux visiteurs venus de ses résultats
  (« interstitiels intrusifs », novembre 2026). Adresse tapée, favori, lien
  WhatsApp, Facebook, Instagram, e-mail : le miroir s'affiche. Sans
  JavaScript : le site s'affiche directement.
- L'affiche est reproduite **au pixel près** : miroir doré, sol en damier,
  escalier, positions relevées sur l'affiche de 848 × 1200 (commentaires de
  `.affiche` dans `index.astro`). Dans le miroir, **seul le titre** (le logo),
  un peu plus grand que sur l'affiche, centré dans l'ouverture.
- Dans l'affiche, le miroir n'est pas tout à fait centré : marches et damier
  sont un peu à droite du miroir. L'affiche est décalée de 1,63 % : le point de
  fuite du damier et l'escalier tombent pile au milieu de l'écran (carreaux
  bien droits). **Puis, à la demande de l'équipe (novembre 2026, sur
  téléphone : « c'est pas centré »), le miroir lui-même est décalé de 1,97 %
  vers la droite** (cadre, titre, eau, bouton ; halo du fond et texte « Touchez
  le miroir » recentrés aussi, `0.5163` dans `miroir-eau.ts`) : miroir,
  escalier et damier sont maintenant tous au milieu de l'écran. Ne pas revenir
  aux positions exactes de l'affiche.
- Le sol est un SVG extensible qui reproduit celui de la graphiste (mêmes
  couleurs, même perspective, même découpe) pour remplir tout l'écran :
  `python3 -I outils/sol-damier.py public/brouillon/sol-damier.webp public/brouillon/sol-damier.svg`
  (à relancer si la graphiste change son sol).
- **L'eau du miroir** (`src/scripts/miroir-eau.ts`, WebGL sans bibliothèque) :
  au survol ou au toucher, de petites vagues partent comme un caillou tombé
  dans l'eau et le titre ondule ; une goutte tombe aussi toute seule de temps
  en temps (plus souvent sur téléphone). Le canvas redessine le dégradé, le
  grain et le logo (à l'identique), découpé à la forme de l'ouverture
  (`cadre-or.json`). Il est posé **au-dessus** du vrai titre HTML et
  transparent s'il est effacé : si l'eau ne peut pas s'afficher (pas de WebGL,
  téléphone qui perd le contexte WebGL…), on voit le titre normal, jamais un
  miroir noir. Au clic, on laisse voir la vague (0,65 s) avant de plonger.
- **Entrée** : uniquement en cliquant ou touchant le miroir (vrai bouton,
  clavier compris). Grosse vague, l'affiche grandit autour du miroir, tout passe
  au noir et le site apparaît (titre puis infos), en environ 1,4 s. Tant que le
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
- Adresse du site : `https://lesragondinsfarfelus.com` (dans `astro.config.mjs`,
  `public/robots.txt`, `src/data/site.ts` et `public/CNAME`).
- Images de partage : `public/brouillon/partage.jpg` (accueil, affiche) et une
  par page dans `public/partage/` (1200×630, photo + logo), fabriquées par
  `python3 -I outils/images-partage.py` (liste des photos sources dans le
  script) ; aussi `festival-16x9/4x3/1x1.jpg` pour les données « Festival »
  (formats demandés par Google).
- **Renforcement SEO/GEO (novembre 2026)** :
  - titre principal (h1) des pages intérieures = surtitre avec mots-clés +
    titre (« Billetterie du festival 2027 : Votre billet pour l'autre monde »),
    même apparence (`EnTetePage.astro`) ;
  - FAQ structurées aussi sur Billetterie, Cashless et Bénévoles ; vidéos des
    bénévoles en `VideoObject` ; Domaine en `Place` + `TouristAttraction` avec
    ses 9 lieux (`containsPlace`) et photos ; Édition 2026 en `Festival` passé
    (30-31 mai 2026, photos, 18 partenaires en `sponsor`) ; Organisation
    enrichie (association 7 DE COEUR en `parentOrganization` avec SIRET,
    contact, adresse, date de création) ;
  - `llms.txt` enrichi (lieux, 2026, bénévoles, questions fréquentes) et
    **`/llms-full.txt`** : le texte de toutes les pages, et **photos ajoutées
    au plan du site** (sitemap images), par l'intégration
    `outils/referencement.mjs` (fin de construction, sans bibliothèque) ;
  - `robots.txt` : plus de robots d'assistants autorisés (DuckAssistBot,
    meta-externalagent, Amazonbot, MistralAI-User, CCBot…) ;
  - **IndexNow** : après chaque mise en ligne, le job `signaler` du workflow
    envoie toutes les adresses du plan du site à Bing (qui alimente ChatGPT,
    Copilot, DuckDuckGo, Qwant), Yandex, Seznam, Naver. Clé publique :
    `public/070ec91cfce7ceb1224b9c9875dcca25.txt` (ne pas supprimer) ;
  - codes de vérification Google Search Console et Bing Webmaster Tools :
    champs de l'administration (« Liens et contact »), balises `meta` ajoutées
    automatiquement (`verification` dans `site.ts`) ;
  - photos vérifiées sans doublon (comparaison visuelle de toutes les images ;
    seules reprises voulues : logos partenaires sur 2 pages, 4 photos 2026
    sur l'accueil).

## À décider

- Formulaires bénévoles / partenaires / presse : outil externe (Tally
  conseillé) ou garder l'envoi par la messagerie.
- Newsletter : créer le compte Brevo (conseillé) et son formulaire.
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
- Contenus éditables : collections Astro dans `src/content.config.ts`
  (artistes, lettres, presse) ; vidéos YouTube et lecteur Spotify chargés
  seulement au clic (RGPD) : `src/components/Video.astro`, `src/lib/medias.ts`.
- L'aperçu ignore `/admin/` et les versions e-mail des lettres.
- `public/brouillon/` : visuels de la graphiste (logo, miroir, escalier, sol,
  image de partage). **La graphiste a donné son accord (novembre 2026)** : ils
  sont maintenant dans le dépôt et seront publiés avec le site.

## Mise en ligne

- **Le site est en ligne depuis le 16 novembre 2026** : demande de fusion
  `leolangloys-glitch/lesragondinsfarfelus#1` fusionnée dans `main`,
  publication GitHub Actions réussie, domaine personnalisé enregistré dans
  Settings > Pages (l'adresse `leolangloys-glitch.github.io/lesragondinsfarfelus/`
  redirige vers lesragondinsfarfelus.com).
- Publication automatique : `.github/workflows/mise-en-ligne.yml` (à chaque
  modification de `main`, le site est reconstruit et publié sur GitHub Pages,
  environ 2 min). Il refuse de publier si les visuels de `public/brouillon/`
  manquent. Settings > Pages > Source = « GitHub Actions » (fait).
- Méthode de travail : on modifie la branche `claude/memoire-projet`, puis
  on fusionne dans `main`. Soit l'équipe ouvre la demande de fusion et clique
  « Merge », soit **Claude le fait lui-même quand l'équipe le demande
  explicitement** (« mets en ligne », accord de l'équipe le 17/11/2026) :
  créer la demande de fusion vers `main` (API REST de GitHub, `gh api`),
  la fusionner, puis suivre la publication (onglet Actions) jusqu'aux trois
  coches vertes. Jamais sans demande. L'administration (`/admin/`) écrit
  directement dans `main` : bien partir de `origin/main` à jour.
- **Zone DNS chez OVH (faite le 16/11/2026, vérifiée sur le DNS public)** :
  4 A `@` vers 185.199.108.153, .109.153, .110.153, .111.153 ; 4 AAAA `@` vers
  2606:50c0:8000::153, 8001, 8002, 8003 ; `www` en CNAME vers
  `leolangloys-glitch.github.io.`. Supprimés : l'ancien A et AAAA de
  l'hébergement OVH (51.91.236.255, 2001:41d0:301::29), la redirection OVH
  (`@ TXT "1|www…"`), `www` A/AAAA/TXT `3|welcome`. **Gardés intacts** : MX,
  SPF, DKIM (`ovhmo-selector-*`), mail, pop3, smtp, imap, SRV, autoconfig,
  autodiscover, ftp, NS. Dans la nouvelle interface OVH, la racine s'écrit `@`.
  Ajouté ensuite : `@ TXT "google-site-verification=…"` (Search Console) :
  **ne jamais le supprimer**, Google le revérifie.
- **Certificat HTTPS** : resté bloqué à « 1 of 3, Certificate Requested »
  plusieurs heures (le site en https affichait une alerte) ; domaine retiré
  puis remis dans Settings > Pages le 16/11/2026 au soir, « DNS check
  successful » aussitôt ; certificat prêt le soir même. **HTTPS fonctionne
  depuis le 17/11/2026** (le job `signaler` lit le plan du site en https et
  IndexNow répond 202). Si le certificat rebloque un jour plus de 24 h : Remove
  puis Save dans Settings > Pages. Le job `signaler` échoue (sans gêner la mise
  en ligne) si le certificat n'est pas valide.
- **Google Search Console** : propriété « Domaine » validée par TXT chez OVH
  (16/11/2026). **Bing Webmaster Tools** : site importé depuis Search Console
  (16/11/2026). Plan du site : dans une propriété « Domaine », Search Console
  exige l'adresse complète `https://lesragondinsfarfelus.com/sitemap-index.xml`
  (pas seulement `sitemap-index.xml`). Fait le 17/11/2026 : plan du site
  envoyé, indexation demandée pour l'accueil, `/programmation/` et
  `/domaine/`. Première mise en ligne faite par Claude sur demande : PR
  `leolangloys-glitch/lesragondinsfarfelus#9` (17/11/2026).
- Mentions légales et confidentialité : éditeur association **7 DE COEUR**,
  association déclarée, siège à la mairie de Sainte-Geneviève-des-Bois, SIRET
  104 227 723 00012, contact contact@domainedebriquemault.com (aussi contact
  général sur la page Infos). Encore à compléter : crédits des photos
  (mentions légales), durées de conservation des données (confidentialité).
- Crédit de la graphiste (Cécilie Larroya, `festival.graphiste` dans
  `site.ts`) : mentions légales, pied de page de toutes les pages, ressources
  de l'espace presse et `llms.txt`.
- Ne jamais demander ni accepter les mots de passe OVH ou GitHub : l'équipe
  fait elle-même les réglages, on la guide.
- Après : inscription du festival dans les agendas
  (OpenAgenda, Tourisme Loiret, offices de tourisme de Montargis et Gien, JDS,
  Facebook événement), compte Brevo pour la newsletter, jetons d'accès à
  l'administration.

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
  bénévoles, niveaux de partenariat, gratuités (moins de 11 ans, personnes en
  situation de handicap : info 2026 à reconfirmer).
