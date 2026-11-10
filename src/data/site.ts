// ==========================================================================
// Informations communes à tout le site.
// Pour changer une date, un lien ou le menu, c'est ici et nulle part ailleurs.
// ==========================================================================

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
    pays: "FR",
    site: "https://domainedebriquemault.com",
  },
  association: "Handi'Chiens",
};

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
      { libelle: "Comment venir", href: "/infos/#venir" },
      { libelle: "Mentions légales", href: "/mentions-legales/" },
      { libelle: "Confidentialité", href: "/confidentialite/" },
    ],
  },
];

// Données structurées « Festival » lues par Google (dates, lieu, billetterie).
export function evenementSchema(siteUrl = "https://lesragondinsfarfelus.fr") {
  return {
    "@context": "https://schema.org",
    "@type": "Festival",
    name: `${festival.nom} 2027`,
    description:
      "Festival de musique et de magie : concerts jazz, rock et pop, DJ sets, magiciens sur scène et en close-up, journée familiale. Au profit de l'association Handi'Chiens.",
    startDate: festival.dates.debut,
    endDate: festival.dates.fin,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    url: siteUrl,
    image: [`${siteUrl}/brouillon/partage.jpg`],
    location: {
      "@type": "Place",
      name: festival.lieu.nom,
      address: {
        "@type": "PostalAddress",
        addressLocality: festival.lieu.commune,
        postalCode: festival.lieu.codePostal,
        addressRegion: "Centre-Val de Loire",
        addressCountry: festival.lieu.pays,
      },
    },
    offers: {
      "@type": "Offer",
      url: `${siteUrl}/billetterie/`,
      availability: "https://schema.org/PreOrder",
    },
    organizer: {
      "@type": "Organization",
      name: festival.nom,
      url: siteUrl,
    },
  };
}
