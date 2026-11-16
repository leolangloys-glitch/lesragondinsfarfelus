// Intégration Astro « référencement », lancée à la fin de chaque construction :
// - écrit dist/llms-full.txt : le texte de toutes les pages du site, pour les
//   assistants IA (ChatGPT, Claude, Perplexity, Gemini…) ;
// - ajoute les photos de chaque page au plan du site (sitemap « images »),
//   pour Google Images.
// Sans bibliothèque : un petit lecteur HTML suffit pour ce site.
import { readFile, writeFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Ordre des pages dans llms-full.txt (les autres suivent : artistes, newsletters)
const ORDRE = [
  "/",
  "/programmation/",
  "/billetterie/",
  "/infos/",
  "/venir/",
  "/domaine/",
  "/cashless/",
  "/benevoles/",
  "/partenaires/",
  "/presse/",
  "/edition-2026/",
  "/lettres/",
];
const EXCLUS = /^\/(admin|mentions-legales|confidentialite)\/|\/email\/$|^\/404/;

const VIDES = new Set(["img", "br", "hr", "input", "meta", "link", "source", "wbr", "area", "col", "embed", "track"]);
const BALISES_IGNOREES = new Set(["script", "style", "svg", "noscript", "template", "dialog", "form", "button", "select", "textarea", "nav", "video", "canvas", "iframe"]);
const EN_LIGNE = new Set(["span", "a", "strong", "em", "b", "i", "time", "small", "abbr", "label"]);
const BLOCS = new Set(["p", "div", "section", "article", "header", "footer", "ul", "ol", "li", "dl", "dt", "dd", "figure", "figcaption", "table", "tr", "blockquote", "h1", "h2", "h3", "h4", "h5", "h6"]);

const attribut = (balise, nom) => (balise.match(new RegExp(`\\b${nom}="([^"]*)"`)) ?? [])[1];

const ENTITES = { nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", rsquo: "’", lsquo: "‘", laquo: "«", raquo: "»", hellip: "…", ndash: "–", mdash: "—", eacute: "é", egrave: "è", agrave: "à", ccedil: "ç" };
const decoder = (t) =>
  t
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITES[n.toLowerCase()] ?? m);

/** Faut-il ignorer cet élément et tout ce qu'il contient ? */
function ignorer(nom, attributs) {
  if (BALISES_IGNOREES.has(nom)) return true;
  if (/\baria-hidden="true"/.test(attributs)) return true;
  if (/\bhidden(\s|=|$)/.test(attributs)) return true;
  // l'entrée par le miroir de l'accueil, le lien d'évitement, la photothèque vide
  return /class="[^"]*\b(entree|lien-evitement|phototheque--vide|visionneuse)\b/.test(attributs);
}

/** Texte lisible (titres « # », listes « - ») du contenu principal d'une page. */
export function texteDePage(html) {
  const debut = html.indexOf("<main");
  const fin = html.lastIndexOf("</main>");
  const zone = debut >= 0 && fin > debut ? html.slice(debut, fin) : html;
  const pile = []; // { nom, ignore }
  let sortie = "";
  const jeton = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9-]*)([^>]*?)(\/?)>|([^<]+)/g;
  for (const m of zone.matchAll(jeton)) {
    const [, fermante, nomBrut, attributs = "", autoFermante, texte] = m;
    const dedansIgnore = pile.some((e) => e.ignore);
    if (texte !== undefined) {
      if (!dedansIgnore) sortie += decoder(texte).replace(/\s+/g, " ");
      continue;
    }
    if (!nomBrut) continue; // commentaire
    const nom = nomBrut.toLowerCase();
    if (fermante) {
      const i = pile.map((e) => e.nom).lastIndexOf(nom);
      if (i >= 0) {
        const ferme = pile.splice(i);
        if (!ferme.some((e) => e.ignore) && !pile.some((e) => e.ignore)) {
          if (EN_LIGNE.has(nom)) sortie += " ";
          else if (BLOCS.has(nom) && nom !== "dt") sortie += "\n";
        }
      }
      continue;
    }
    const ignore = ignorer(nom, attributs);
    if (!dedansIgnore && !ignore) {
      if (/^h[1-6]$/.test(nom)) sortie += `\n\n${"#".repeat(Math.min(Number(nom[1]) + 1, 4))} `;
      else if (nom === "li") sortie += "\n- ";
      else if (nom === "dd") sortie += " : ";
      else if (nom === "br") sortie += "\n";
      else if (nom === "img") {
        // une image dans un titre (le logo de l'accueil) : son texte alternatif
        const alt = attribut(attributs, "alt");
        if (alt && pile.some((e) => /^h[1-6]$/.test(e.nom))) sortie += decoder(alt);
      } else if (EN_LIGNE.has(nom)) sortie += " ";
      else if (BLOCS.has(nom) && nom !== "dt") sortie += "\n";
    }
    if (!VIDES.has(nom) && !autoFermante) pile.push({ nom, ignore });
  }
  return sortie
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").replace(/ ([,.])/g, "$1").replace(/(\d) ?- ?(?=\d)/g, "$1-").trim())
    .filter((l, i, t) => l !== "-" && !(l === "" && t[i - 1] === ""))
    .join("\n")
    .replace(/\n(#+ )\n+/g, "\n$1")
    .replace(/(\n- )\n+/g, "$1")
    .replace(/ : \n+/g, " : ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function pagesDe(dossier, base = "") {
  const liste = [];
  for (const entree of await readdir(path.join(dossier, base), { withFileTypes: true })) {
    const rel = path.join(base, entree.name);
    if (entree.isDirectory()) liste.push(...(await pagesDe(dossier, rel)));
    else if (entree.name === "index.html") liste.push("/" + (base ? base.split(path.sep).join("/") + "/" : ""));
  }
  return liste;
}


export default function referencement() {
  let site = "";
  return {
    name: "referencement",
    hooks: {
      "astro:config:done": ({ config }) => {
        site = (config.site ?? "").replace(/\/$/, "");
      },
      "astro:build:done": async ({ dir, logger }) => {
        const dist = fileURLToPath(dir);
        const toutes = (await pagesDe(dist)).filter((p) => !EXCLUS.test(p));
        const pages = [...ORDRE.filter((p) => toutes.includes(p)), ...toutes.filter((p) => !ORDRE.includes(p)).sort()];

        // 1. llms-full.txt
        const morceaux = [];
        const imagesParPage = new Map();
        for (const p of pages) {
          const html = await readFile(path.join(dist, p, "index.html"), "utf8");
          const titre = decoder((html.match(/<title>([\s\S]*?)<\/title>/) ?? [])[1] ?? p).trim();
          const description = decoder(attribut(html.match(/<meta name="description"[^>]*>/)?.[0] ?? "", "content") ?? "");
          morceaux.push(`# ${titre}\n\nAdresse : ${site}${p}\n${description ? `Résumé : ${description}\n` : ""}\n${texteDePage(html)}`);
          // photos de la page (hors décor : alt vide) pour le plan du site
          const main = html.slice(Math.max(0, html.indexOf("<main")));
          const images = new Set();
          for (const balise of main.match(/<img\b[^>]*>/g) ?? []) {
            const src = attribut(balise, "src");
            const alt = attribut(balise, "alt");
            if (src && alt && /^\/(medias|partage)\//.test(src)) images.add(`${site}${src}`);
          }
          const partage = attribut(html.match(/<meta property="og:image"[^>]*>/)?.[0] ?? "", "content");
          if (partage) images.add(partage);
          imagesParPage.set(`${site}${p}`, [...images]);
        }
        const entete = `# Les Ragondins Farfelus : le site complet en texte\n\n> Texte de toutes les pages de ${site}/ (festival de musique et de magie, 28, 29 et 30 mai 2027, Domaine de Briquemault, Loiret), pour les assistants IA. Résumé court : ${site}/llms.txt\n\nMis à jour le ${new Date().toISOString().slice(0, 10)}.`;
        await writeFile(path.join(dist, "llms-full.txt"), [entete, ...morceaux].join("\n\n---\n\n") + "\n");

        // 2. photos dans le plan du site (sitemap-0.xml, écrit par @astrojs/sitemap)
        const fichier = path.join(dist, "sitemap-0.xml");
        try {
          let xml = await readFile(fichier, "utf8");
          if (!xml.includes("xmlns:image=")) xml = xml.replace("<urlset ", '<urlset xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" ');
          xml = xml.replace(/<url><loc>([^<]+)<\/loc>([\s\S]*?)<\/url>/g, (bloc, loc, reste) => {
            const images = imagesParPage.get(loc) ?? [];
            if (!images.length || reste.includes("<image:image>")) return bloc;
            const tags = images.map((i) => `<image:image><image:loc>${i}</image:loc></image:image>`).join("");
            return `<url><loc>${loc}</loc>${reste}${tags}</url>`;
          });
          await writeFile(fichier, xml);
        } catch (e) {
          logger.warn(`Plan du site non complété avec les photos : ${e.message}`);
        }
        logger.info(`llms-full.txt (${pages.length} pages) et photos du plan du site : prêts`);
      },
    },
  };
}
