// ==========================================================================
// Informations communes à tout le site.
// Pour changer une date, un lien ou le menu, c'est ici et nulle part ailleurs.
// ==========================================================================

// Adresse du site (provisoire : extension du nom de domaine à confirmer).
// À changer aussi dans astro.config.mjs et public/robots.txt.
export const SITE = "https://lesragondinsfarfelus.fr";

export const festival = {
  nom: "Les Ragondins Farfelus",
  accroche: "Festival de musique et de magie",
  edition: "2e édition",
  dates: {
    debut: "2027-05-28",
    fin: "2027-05-30",
    affichage: "28, 29 et 30 mai 2027",
    court: "28·29·30 mai 2027",
  },
  lieu: {
    nom: "Domaine de Briquemault",
    commune: "Sainte-Geneviève-des-Bois",
    codePostal: "45230",
    departement: "Loiret",
    region: "Centre-Val de Loire",
    pays: "FR",
    site: "https://domainedebriquemault.com",
    // Coordonnées du bourg (le domaine est sur la commune) : à affiner avec l'entrée du domaine
    latitude: 47.8181,
    longitude: 2.8183,
  },
  association: "Handi'Chiens",
};

// Temps de trajet indicatifs en voiture (estimations, à vérifier par l'équipe).
// Ils alimentent la page « Venir au festival », l'accueil et llms.txt.
export type Trajet = { ville: string; temps: string; km: number };
export const trajets: { region: string; titre: string; villes: Trajet[] }[] = [
  {
    region: "Paris et l'Île-de-France",
    titre: "Depuis Paris et l'Île-de-France",
    villes: [
      { ville: "Paris", temps: "1 h 30", km: 140 },
      { ville: "Évry-Courcouronnes", temps: "1 h 15", km: 115 },
      { ville: "Melun", temps: "1 h 05", km: 95 },
      { ville: "Fontainebleau", temps: "1 h", km: 80 },
      { ville: "Nemours", temps: "45 min", km: 60 },
    ],
  },
  {
    region: "Le Loiret",
    titre: "Dans le Loiret",
    villes: [
      { ville: "Orléans", temps: "1 h 15", km: 85 },
      { ville: "Montargis", temps: "25 min", km: 25 },
      { ville: "Gien", temps: "25 min", km: 25 },
      { ville: "Briare", temps: "30 min", km: 30 },
      { ville: "Pithiviers", temps: "1 h", km: 70 },
    ],
  },
  {
    region: "L'Yonne et le Cher",
    titre: "Depuis l'Yonne et le Cher",
    villes: [
      { ville: "Auxerre", temps: "1 h", km: 75 },
      { ville: "Sens", temps: "1 h", km: 75 },
      { ville: "Bourges", temps: "1 h 30", km: 110 },
    ],
  },
];

// Liens vers les outils externes : à remplir quand les prestataires sont choisis.
export const liensExternes = {
  billetterie: "", // module ou page du prestataire de billetterie
  rechargeCashless: "", // page de recharge du prestataire cashless
  formulaireBenevoles: "", // formulaire (Tally, Google Forms…)
  formulairePartenaires: "",
  formulairePresse: "",
  newsletter: "", // outil d'inscription (Brevo, Mailchimp…)
  instagram: "",
  facebook: "",
  tiktok: "",
};

export type Lien = { libelle: string; href: string };

// Menu principal (en haut de chaque page). La billetterie est un bouton à part.
export const menuPrincipal: Lien[] = [
  { libelle: "Programmation", href: "/programmation/" },
  { libelle: "Infos", href: "/infos/" },
  { libelle: "Cashless", href: "/cashless/" },
  { libelle: "Bénévoles", href: "/benevoles/" },
  { libelle: "Partenaires", href: "/partenaires/" },
];

export const menuPied: { titre: string; liens: Lien[] }[] = [
  {
    titre: "Le festival",
    liens: [
      { libelle: "Programmation", href: "/programmation/" },
      { libelle: "Billetterie", href: "/billetterie/" },
      { libelle: "Cashless", href: "/cashless/" },
      { libelle: "Infos pratiques", href: "/infos/" },
    ],
  },
  {
    titre: "Rejoindre l'aventure",
    liens: [
      { libelle: "Devenir bénévole", href: "/benevoles/" },
      { libelle: "Devenir partenaire", href: "/partenaires/" },
      { libelle: "Espace presse", href: "/presse/" },
      { libelle: "Le Domaine de Briquemault", href: "/domaine/" },
    ],
  },
  {
    titre: "Nous trouver",
    liens: [
      { libelle: "Contact", href: "/infos/#contact" },
      { libelle: "Comment venir", href: "/venir/" },
      { libelle: "Mentions légales", href: "/mentions-legales/" },
      { libelle: "Confidentialité", href: "/confidentialite/" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Données structurées (schema.org) lues par Google et les assistants IA
// ---------------------------------------------------------------------------

const adressePostale = {
  "@type": "PostalAddress",
  addressLocality: festival.lieu.commune,
  postalCode: festival.lieu.codePostal,
  addressRegion: `${festival.lieu.departement}, ${festival.lieu.region}`,
  addressCountry: festival.lieu.pays,
};

export function lieuSchema() {
  return {
    "@type": "Place",
    "@id": `${SITE}/domaine/#lieu`,
    name: festival.lieu.nom,
    description:
      "Domaine historique de dix hectares au bord du Loing, à Sainte-Geneviève-des-Bois (Loiret), entre Montargis et Gien, à environ 1 h 30 de Paris.",
    address: adressePostale,
    geo: { "@type": "GeoCoordinates", latitude: festival.lieu.latitude, longitude: festival.lieu.longitude },
    url: `${SITE}/domaine/`,
    sameAs: [festival.lieu.site],
  };
}

export function organisationSchema() {
  const reseaux = [liensExternes.instagram, liensExternes.facebook, liensExternes.tiktok].filter(Boolean);
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE}/#organisation`,
    name: festival.nom,
    url: `${SITE}/`,
    logo: `${SITE}/brouillon/logo.webp`,
    description: "Festival de musique et de magie caritatif dans le Loiret, au profit de l'association Handi'Chiens.",
    ...(reseaux.length ? { sameAs: reseaux } : {}),
  };
}

export function siteWebSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE}/#site`,
    name: festival.nom,
    url: `${SITE}/`,
    inLanguage: "fr-FR",
    publisher: { "@id": `${SITE}/#organisation` },
  };
}

/** Fil d'Ariane (Accueil › page) pour les pages intérieures. */
export function filArianeSchema(titre: string, chemin: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: titre, item: `${SITE}${chemin}` },
    ],
  };
}

/** Une question / réponse, pour les FAQ (le HTML de la réponse est retiré). */
export function faqSchema(questions: { q: string; r: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.r.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&#32;/g, " "),
      },
    })),
  };
}

// Données structurées « Festival » (dates, lieu, programme, billetterie).
export function evenementSchema(siteUrl = SITE) {
  const jour = (date: string, nom: string, description: string) => ({
    "@type": "Event",
    name: `${festival.nom} 2027 · ${nom}`,
    description,
    startDate: date,
    endDate: date,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: { "@id": `${siteUrl}/domaine/#lieu` },
  });
  return {
    "@context": "https://schema.org",
    "@type": "Festival",
    "@id": `${siteUrl}/#festival`,
    name: `${festival.nom} 2027`,
    alternateName: "Festival des Ragondins Farfelus",
    description:
      "Festival de musique et de magie dans le Loiret, à 1 h 30 de Paris : concerts jazz, jazz manouche, rock et pop, DJ sets, magiciens sur scène et en close-up, journée familiale le dimanche. Au profit de l'association Handi'Chiens.",
    startDate: festival.dates.debut,
    endDate: festival.dates.fin,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    inLanguage: "fr-FR",
    url: `${siteUrl}/`,
    image: [`${siteUrl}/brouillon/partage.jpg`],
    keywords:
      "festival Loiret, festival musique et magie, festival près de Paris, festival Orléans, festival Montargis, festival Gien, festival jazz rock, festival familial, festival solidaire",
    isAccessibleForFree: false,
    location: lieuSchema(),
    offers: {
      "@type": "Offer",
      url: `${siteUrl}/billetterie/`,
      priceCurrency: "EUR",
      availability: "https://schema.org/PreOrder",
    },
    organizer: { "@type": "Organization", "@id": `${siteUrl}/#organisation`, name: festival.nom, url: `${siteUrl}/` },
    subEvent: [
      jour("2027-05-28", "Vendredi : l'éveil", "Ouverture du camping, concerts en soirée et DJ sets tard dans la nuit."),
      jour("2027-05-29", "Samedi : la grande nuit", "Magiciens sur scène et en close-up, concerts et soirée têtes d'affiche."),
      jour("2027-05-30", "Dimanche : la journée des familles", "Artistes jeune public, magie, jeux et animations."),
    ],
  };
}
