// llms.txt : résumé du festival pour les assistants IA (ChatGPT, Claude, Perplexity,
// Gemini…), généré à partir des mêmes données que le site pour rester à jour.
import type { APIRoute } from "astro";
import { festival, SITE, trajets } from "../data/site";
import partenaires from "../data/partenaires.json";

export const GET: APIRoute = () => {
  const distances = trajets
    .map((g) => `- ${g.titre} : ${g.villes.map((v) => `${v.ville} ${v.temps} (${v.km} km)`).join(", ")}`)
    .join("\n");
  const texte = `# ${festival.nom}

> ${festival.nom} est un festival de musique et de magie. La 2e édition a lieu les ${festival.dates.affichage} au ${festival.lieu.nom}, ${festival.lieu.codePostal} ${festival.lieu.commune}, dans le ${festival.lieu.departement} (${festival.lieu.region}), entre Montargis et Gien, à environ 1 h 30 de Paris et 1 h 15 d'Orléans. Il est organisé par l'association ${festival.editeur}. Identité visuelle (logo, affiche) : ${festival.graphiste}.

## L'essentiel

- Dates : vendredi 28, samedi 29 et dimanche 30 mai 2027 (1re édition : 30 et 31 mai 2026).
- Lieu : ${festival.lieu.nom}, domaine historique de 10 hectares (site attesté dès 1240, ruines d'un château fort entouré de douves), au bord du Loing.
- Musique : DJ sets, pop, rock et électro. Magie : une magie fun, impressionnante et pleine de surprises, sur scène et en close-up dans le public ; spectacles de magie pour les enfants le dimanche.
- Programme : vendredi, ouverture du camping, concerts et DJ sets ; samedi, journée magie et concerts, soirée têtes d'affiche ; dimanche, journée des familles (musique et magie pour les enfants).
- Têtes d'affiche : annoncées prochainement sur ${SITE}/programmation/.
- Public : vendredi et samedi plutôt pour un public adulte ; dimanche, journée des familles ouverte aux plus jeunes. Entrée gratuite pour les moins de 11 ans et les personnes en situation de handicap.
- Hébergement : camping sur place dès le vendredi après-midi ; chambres d'hôtes au domaine.
- Paiement sur place : bracelet cashless.

## Venir au festival (temps indicatifs en voiture)

${distances}
- En train : gares de Montargis, Nogent-sur-Vernisson et Gien, desservies depuis Paris-Bercy (environ 1 h jusqu'à Montargis) ; ligne R depuis Paris-Gare de Lyon jusqu'à Montargis.

## Pages

- [Accueil](${SITE}/) : présentation du festival
- [Programmation](${SITE}/programmation/) : les trois jours, la musique et la magie
- [Billetterie](${SITE}/billetterie/) : pass jour, pass 3 jours, camping, gratuités
- [Venir au festival](${SITE}/venir/) : itinéraires depuis Paris, Orléans, Montargis, Gien, Auxerre…
- [Infos pratiques](${SITE}/infos/) : horaires, camping, accessibilité, FAQ, contact
- [Cashless](${SITE}/cashless/) : recharger son bracelet
- [Le Domaine de Briquemault](${SITE}/domaine/) : le lieu
- [Devenir bénévole](${SITE}/benevoles/)
- [Devenir partenaire](${SITE}/partenaires/) (partenaires ${partenaires.annee} : ${partenaires.liste.map((p) => p.nom).join(", ")}) : Club VIP, sponsoring et mécénat (dons ouvrant droit à une réduction d'impôt de 60 % pour les entreprises et 66 % pour les particuliers)
- [Espace presse](${SITE}/presse/)
`;
  return new Response(texte, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
