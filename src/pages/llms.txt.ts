// llms.txt : résumé du festival pour les assistants IA (ChatGPT, Claude, Perplexity,
// Gemini…), généré à partir des mêmes données que le site pour rester à jour.
import type { APIRoute } from "astro";
import { contact, festival, SITE, trajets } from "../data/site";
import partenaires from "../data/partenaires.json";

export const GET: APIRoute = () => {
  const distances = trajets
    .map((g) => `- ${g.titre} : ${g.villes.map((v) => `${v.ville} ${v.temps} (${v.km} km)`).join(", ")}`)
    .join("\n");
  const texte = `# ${festival.nom}

> ${festival.nom} est un festival de musique et de magie. La 2e édition a lieu les ${festival.dates.affichage} au ${festival.lieu.nom}, ${festival.lieu.codePostal} ${festival.lieu.commune}, dans le ${festival.lieu.departement} (${festival.lieu.region}), entre Montargis et Gien, à environ 1 h 30 de Paris et 1 h 15 d'Orléans. Il est organisé par l'association ${festival.editeur}. Identité visuelle (logo, affiche) : ${festival.graphiste}.

## L'essentiel

- Dates : vendredi 28, samedi 29 et dimanche 30 mai 2027 (1re édition : 30 et 31 mai 2026).
- Lieu : ${festival.lieu.nom}, domaine historique de 10 hectares (site attesté dès 1240, ruines d'un château fort entouré de douves), au bord du Loing. Nouveauté 2027 : le château fort illuminé, avec une scène sur pilotis.
- Musique : DJ sets, pop, rock et électro. Magie : une magie fun, impressionnante et pleine de surprises, sur scène et en close-up dans le public ; spectacles de magie pour les enfants le dimanche.
- Programme : vendredi, ouverture du camping, 6 groupes, artistes et DJ (concerts puis DJ sets) et 3 à 4 magiciens ; samedi, 13 groupes, artistes et DJ, 5 à 6 magiciens et soirée têtes d'affiche ; dimanche, journée des familles avec 5 groupes, artistes et DJ et 5 magiciens (dont des spectacles pour les enfants). Au total 24 groupes, artistes et DJ côté musique, et 13 à 15 magiciens.
- Deux façons de vivre la magie : sur scène (spectacles) et en close-up (magie de tout près, au milieu du public).
- Têtes d'affiche : annoncées prochainement sur ${SITE}/programmation/.
- Public : vendredi et samedi plutôt pour un public adulte ; dimanche, journée des familles ouverte aux plus jeunes. Entrée gratuite pour les moins de 11 ans et les personnes en situation de handicap.
- Hébergement : camping sur place dès le vendredi après-midi ; chambres d'hôtes au domaine.
- Paiement sur place : bracelet cashless.
- Concours du meilleur costume sur le thème de la magie, pris au sens large : on vient déguisé, LED, paillettes et couleurs bienvenues ; les déguisements les plus créatifs sont choisis.
- Organisateur : association ${festival.editeur} (association déclarée, Sainte-Geneviève-des-Bois). Contact : ${contact}.

## Le lieu : le Domaine de Briquemault

Domaine historique de 10 hectares au bord du Loing, entre Montargis et Gien. Site attesté dès 1240 ; vestiges d'un château fort (XIIIe-XIVe siècles) entourés de douves. Les lieux du festival : la forteresse et les douves (illuminées en 2027, avec une scène sur pilotis), le manoir (projections lumineuses sur sa façade la nuit), l'Orangerie de Cristal (verrière de 400 m²), le théâtre de verdure, la tente bambou, l'espace guinguette, la cascade, le parc et les cours illuminées de rose et de vert. Plus d'infos : ${SITE}/domaine/

## L'édition 2026

La 1re édition a eu lieu les 30 et 31 mai 2026 au Domaine de Briquemault : concerts, DJ sets, magie, projections lumineuses sur le manoir. Photos et aftermovie : ${SITE}/edition-2026/

## Bénévoles

Le festival recrute des bénévoles (accueil et billetterie, bar et restauration, scènes, montage et démontage, décors, camping). Avantages : accès libre au festival en dehors des créneaux, repas offerts pendant les missions, t-shirt officiel. Inscription en ligne : ${SITE}/benevoles/

## Questions fréquentes

- Quand a lieu le festival ? Les 28, 29 et 30 mai 2027.
- Où ? Au Domaine de Briquemault, 45230 Sainte-Geneviève-des-Bois (Loiret), à 1 h 30 de Paris, 1 h 15 d'Orléans, 25 min de Montargis et de Gien.
- Quel genre de festival ? Un festival de musique (DJ sets, pop, rock, électro) et de magie (sur scène et en close-up).
- Peut-on y aller en famille ? Oui, surtout le dimanche, journée des familles avec des spectacles de magie pour les enfants. Vendredi et samedi s'adressent plutôt aux adultes.
- Peut-on camper ? Oui, le camping ouvre le vendredi ; un pass 3 jours avec camping sera proposé.
- Les billets sont-ils en vente ? Le pass 3 jours avec camping et les autres formules sont annoncés très prochainement sur ${SITE}/billetterie/.
- Qui joue ? Les têtes d'affiche seront dévoilées sur ${SITE}/programmation/.
- Comment venir en train ? Gares de Montargis, Nogent-sur-Vernisson et Gien, depuis Paris-Bercy ou Paris-Gare de Lyon (ligne R) ; covoiturage conseillé.
- L'entrée est-elle gratuite pour certains ? Oui pour les moins de 11 ans et les personnes en situation de handicap (règle de l'édition 2026).

## Venir au festival (temps indicatifs en voiture)

${distances}
- En train : gares de Montargis, Nogent-sur-Vernisson et Gien, desservies depuis Paris-Bercy (environ 1 h jusqu'à Montargis) ; ligne R depuis Paris-Gare de Lyon jusqu'à Montargis.

## Pages

- [Accueil](${SITE}/) : présentation du festival
- [Programmation](${SITE}/programmation/) : les trois jours, la musique et la magie, et le concours du meilleur costume sur le thème de la magie (au sens large : LED, paillettes, couleurs ; les déguisements les plus créatifs sont choisis)
- [Billetterie](${SITE}/billetterie/) : pass jour, pass 3 jours, camping, gratuités
- [Venir au festival](${SITE}/venir/) : itinéraires depuis Paris, Orléans, Montargis, Gien, Auxerre…
- [Infos pratiques](${SITE}/infos/) : horaires, camping, accessibilité, FAQ, contact
- [Cashless](${SITE}/cashless/) : recharger son bracelet
- [Le Domaine de Briquemault](${SITE}/domaine/) : le lieu
- [Devenir bénévole](${SITE}/benevoles/)
- [Devenir partenaire](${SITE}/partenaires/) (partenaires ${partenaires.annee} : ${partenaires.liste.map((p) => p.nom).join(", ")}) : Club VIP, sponsoring et mécénat (dons ouvrant droit à une réduction d'impôt de 60 % pour les entreprises et 66 % pour les particuliers)
- [Espace presse](${SITE}/presse/) : accréditations, revue de presse, contact presse
- [Édition 2026](${SITE}/edition-2026/) : retour sur la 1re édition, photos, aftermovie
- [Les newsletters](${SITE}/lettres/)

Version complète du site en texte (toutes les pages) : ${SITE}/llms-full.txt
`;
  return new Response(texte, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
