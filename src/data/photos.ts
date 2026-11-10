// ==========================================================================
// Photos du site : vraies photos libres de droits (Wikimedia Commons),
// étalonnées aux couleurs du festival par outils/etalonnage.py.
// Les licences CC BY et CC BY-SA imposent de citer l'auteur et la licence :
// ces crédits s'affichent sous chaque photo et dans les mentions légales.
// ==========================================================================

export type Licence = "CC0" | "CC BY 3.0" | "CC BY 4.0" | "CC BY-SA 3.0" | "CC BY-SA 4.0";

export const urlsLicences: Record<Licence, string> = {
  CC0: "https://creativecommons.org/publicdomain/zero/1.0/deed.fr",
  "CC BY 3.0": "https://creativecommons.org/licenses/by/3.0/deed.fr",
  "CC BY 4.0": "https://creativecommons.org/licenses/by/4.0/deed.fr",
  "CC BY-SA 3.0": "https://creativecommons.org/licenses/by-sa/3.0/deed.fr",
  "CC BY-SA 4.0": "https://creativecommons.org/licenses/by-sa/4.0/deed.fr",
};

export type Credit = { auteur: string; licence: Licence; source: string };

export const photoAccueil = {
  base: "/photos/ragondin-loing",
  largeurs: [960, 1600, 2560],
  largeur: 2560,
  hauteur: 1707,
  alt: "Un ragondin nage dans l'eau verte d'une rivière, entre les feuillages",
  credit: {
    auteur: "Jules Xénard",
    licence: "CC BY-SA 4.0",
    source: "https://commons.wikimedia.org/wiki/File:Ragondin_dans_le_parc_du_ch%C3%A2teau_de_Rambouillet_04.jpg",
  } as Credit,
};

export type Habitant = {
  fichier: string;
  nom: string;
  latin: string;
  texte: string;
  alt: string;
  credit: Credit;
};

// Les habitants du Loing : faune et flore réelles du Loiret qui inspirent le festival.
export const habitants: Habitant[] = [
  {
    fichier: "/photos/ragondin.webp",
    nom: "Le ragondin",
    latin: "Myocastor coypus",
    texte:
      "Notre emblème. Nageur hors pair aux grandes moustaches, il se reconnaît à ses incisives orange vif. Venu d'Amérique du Sud, il a fait des berges du Loing son royaume.",
    alt: "Un ragondin mange dans l'eau, moustaches en avant",
    credit: { auteur: "Gzen92", licence: "CC BY-SA 4.0", source: "https://commons.wikimedia.org/wiki/File:Ragondin_(Myocastor_coypus)_(39).jpg" },
  },
  {
    fichier: "/photos/martin.webp",
    nom: "Le martin-pêcheur",
    latin: "Alcedo atthis",
    texte: "Un éclair turquoise au ras de l'eau. Posté sur une branche, il plonge d'un coup pour attraper de petits poissons.",
    alt: "Un martin-pêcheur turquoise et orange perché sur une branche",
    credit: { auteur: "Vincent van Zalinge", licence: "CC0", source: "https://commons.wikimedia.org/wiki/File:Perched_blue_and_orange_bird_(Unsplash),_crop.jpg" },
  },
  {
    fichier: "/photos/demoiselle.webp",
    nom: "Le caloptéryx vierge",
    latin: "Calopteryx virgo",
    texte: "La « demoiselle » aux ailes bleu nuit. Elle ne vit qu'au bord des eaux claires et courantes : la voir, c'est le signe d'une rivière en bonne santé.",
    alt: "Une demoiselle aux ailes bleu nuit posée sur une feuille",
    credit: { auteur: "Charles J. Sharp", licence: "CC BY-SA 4.0", source: "https://commons.wikimedia.org/wiki/File:Beautiful_demoiselle_(Calopteryx_virgo)_male_Rakov_%C5%A0kocjan.jpg" },
  },
  {
    fichier: "/photos/effraie.webp",
    nom: "L'effraie des clochers",
    latin: "Tyto alba",
    texte: "La dame blanche au visage en cœur. Elle chasse la nuit dans un silence absolu, grâce à des plumes qui étouffent le bruit de son vol.",
    alt: "Une chouette effraie au visage blanc en forme de cœur",
    credit: { auteur: "Michael Gäbler", licence: "CC BY 3.0", source: "https://commons.wikimedia.org/wiki/File:Tyto_alba_(Scopoli,_1769).jpg" },
  },
  {
    fichier: "/photos/renard.webp",
    nom: "Le renard roux",
    latin: "Vulpes vulpes",
    texte: "Rusé et discret, il longe les haies au crépuscule. Les soirs de festival, il nous observe sûrement depuis l'orée du bois.",
    alt: "Portrait d'un renard roux aux yeux mi-clos",
    credit: { auteur: "Cephas", licence: "CC BY-SA 3.0", source: "https://commons.wikimedia.org/wiki/File:Vulpes_vulpes_PO.jpg" },
  },
  {
    fichier: "/photos/pic.webp",
    nom: "Le pic noir",
    latin: "Dryocopus martius",
    texte: "Le plus grand pic d'Europe, tout de noir vêtu avec sa calotte rouge. Ses coups de bec résonnent dans les forêts du Loiret.",
    alt: "Un pic noir à calotte rouge agrippé à un tronc",
    credit: { auteur: "Clément Bardot", licence: "CC BY-SA 4.0", source: "https://commons.wikimedia.org/wiki/File:Black_woodpecker_(Dryocopus_martius).jpg" },
  },
  {
    fichier: "/photos/fritillaire.webp",
    nom: "La fritillaire pintade",
    latin: "Fritillaria meleagris",
    texte: "Une fleur à damier rose qui s'ouvre au printemps dans les prairies humides. Le damier de notre festival existe vraiment dans la nature !",
    alt: "Une fritillaire pintade, fleur rose en clochette à motif de damier",
    credit: { auteur: "Robert Flogaus-Faust", licence: "CC BY 4.0", source: "https://commons.wikimedia.org/wiki/File:Fritillaria_meleagris_RF.jpg" },
  },
  {
    fichier: "/photos/citron.webp",
    nom: "Le citron",
    latin: "Gonepteryx rhamni",
    texte: "L'un des tout premiers papillons du printemps, vert-jaune comme une feuille éclairée par le soleil.",
    alt: "Un papillon citron vert-jaune butinant une fleur",
    credit: { auteur: "Charles J. Sharp", licence: "CC BY-SA 4.0", source: "https://commons.wikimedia.org/wiki/File:Common_brimstone_butterfly_(Gonepteryx_rhamni)_male.jpg" },
  },
  {
    fichier: "/photos/luciole.webp",
    nom: "Le ver luisant",
    latin: "Lampyris noctiluca",
    texte: "La lanterne vivante des nuits douces : la femelle s'illumine dans l'herbe pour attirer son prince charmant.",
    alt: "Un ver luisant brille d'une lumière vert-jaune dans l'herbe, la nuit",
    credit: { auteur: "Tero Keski-Valkama", licence: "CC0", source: "https://commons.wikimedia.org/wiki/File:Lampyris_Noctiluca_Female_Firefly_1.jpg" },
  },
];
