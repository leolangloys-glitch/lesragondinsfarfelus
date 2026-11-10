# Site du Festival des Ragondins Farfelus

Ce fichier est la mémoire du projet. Toute nouvelle décision doit y être notée,
pour que chaque session (quelle que soit la personne qui la lance) reparte des
mêmes informations.

## Le festival

- Festival de musique et de magie, caritatif.
- Lieu : Domaine de Briquemault, 45230 Sainte-Geneviève-des-Bois (Loiret).
  Site du domaine : https://domainedebriquemault.com
- 1re édition : 30 et 31 mai 2026.
- 2e édition : **vendredi 28, samedi 29 et dimanche 30 mai 2027** (affiche de
  la graphiste).
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

## À décider

- Site de référence d'un autre festival pour la structure du menu.
- Formulaire bénévoles : service externe (Tally, Google Forms…).
- Langues : français seul ou français + anglais.
- Dépôt privé pendant le développement (visuels provisoires de la graphiste).

## Technique

- `npm install` puis `npm run dev` pour travailler, `npm run build` pour
  construire le site dans `dist/`.
- Pages : `src/pages/`. Mise en page commune : `src/layouts/Base.astro`.
  En-tête et pied de page : `src/components/`.
- Couleurs, polices et boutons communs : `src/styles/global.css`.
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
- Les textes de la page d'accueil sont provisoires : à faire relire par
  l'équipe.
