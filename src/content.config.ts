// Contenus modifiables dans l'interface d'administration (/admin/) :
// artistes, lettres d'information (newsletter) et revue de presse.
// Chaque fiche est un fichier Markdown ; « publie: false » = brouillon invisible.
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const texteFacultatif = z.string().optional().default("");

const artistes = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/artistes" }),
  schema: z.object({
    nom: z.string(),
    publie: z.boolean().default(false),
    jour: z.enum(["vendredi", "samedi", "dimanche"]),
    plateau: z.enum(["musique", "magie"]),
    style: texteFacultatif,
    horaire: texteFacultatif,
    photo: texteFacultatif,
    accroche: texteFacultatif,
    ordre: z.number().default(100),
    ecouter: texteFacultatif,
    clip: texteFacultatif,
    instagram: texteFacultatif,
    site: texteFacultatif,
  }),
});

const lettres = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/lettres" }),
  schema: z.object({
    titre: z.string(),
    publie: z.boolean().default(false),
    date: z.coerce.date(),
    couverture: texteFacultatif,
    chapo: texteFacultatif,
    bouton_texte: texteFacultatif,
    bouton_lien: texteFacultatif,
  }),
});

const presse = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/presse" }),
  schema: z.object({
    media: z.string(),
    titre: z.string(),
    publie: z.boolean().default(true),
    date: z.coerce.date().optional(),
    lien: texteFacultatif,
    type: z.enum(["Article", "Radio", "Télévision", "Agenda", "Web", "Réseaux sociaux"]).default("Article"),
    resume: texteFacultatif,
  }),
});

export const collections = { artistes, lettres, presse };
