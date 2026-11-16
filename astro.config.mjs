// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import referencement from "./outils/referencement.mjs";

// https://docs.astro.build/
export default defineConfig({
  // Adresse du site (domaine acheté chez OVH).
  // Elle sert au plan du site et aux adresses « canoniques » lues par Google.
  site: "https://lesragondinsfarfelus.com",
  integrations: [
    sitemap({
      // Les pages légales n'ont pas besoin d'être mises en avant.
      // ni les versions e-mail des newsletters (faites pour l'outil d'envoi).
      filter: (page) => !/mentions-legales|confidentialite|\/lettres\/[^/]+\/email\//.test(page),
      // Date de dernière mise à jour (celle de la construction du site)
      lastmod: new Date(),
      i18n: { defaultLocale: "fr", locales: { fr: "fr-FR" } },
    }),
    // Après le plan du site : llms-full.txt (assistants IA) et photos du plan du site
    referencement(),
  ],
});
