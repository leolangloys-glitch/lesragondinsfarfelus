// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// https://docs.astro.build/
export default defineConfig({
  // Adresse définitive du site (extension à confirmer avant la mise en ligne).
  // Elle sert au plan du site et aux adresses « canoniques » lues par Google.
  site: "https://lesragondinsfarfelus.fr",
  integrations: [
    sitemap({
      // Les pages légales n'ont pas besoin d'être mises en avant.
      filter: (page) => !/mentions-legales|confidentialite/.test(page),
      // Date de dernière mise à jour (celle de la construction du site)
      lastmod: new Date(),
      i18n: { defaultLocale: "fr", locales: { fr: "fr-FR" } },
    }),
  ],
});
