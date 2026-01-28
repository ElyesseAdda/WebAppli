import { useEffect } from "react";
import { matchPath, useLocation } from "react-router-dom";

const BASE_TITLE = "Webapplication P3000";

const ROUTE_TITLES = [
  { path: "/", title: "Dashboard" },
  { path: "/login", title: "Connexion" },
  { path: "/distributeurs", title: "Distributeurs automatiques" },
  { path: "/ListeChantier", title: "Liste des chantiers" },
  { path: "/ChantiersDashboard", title: "Chantiers - Dashboard" },
  { path: "/chantier/:id", title: "Chantier" },
  { path: "/ChantierDetail/:id", title: "Chantier - Détails" },
  { path: "/ChantierTabs", title: "Chantier - Vue avancée" },
  { path: "/CreationDevis", title: "Creation devis" },
  { path: "/DevisAvance", title: "Devis - Avance" },
  { path: "/ListeDevis", title: "Liste des devis" },
  { path: "/ModificationDevis/:devisId", title: "Modification devis" },
  { path: "/ModificationDevisV2/:devisId", title: "Modification devis V2" },
  { path: "/ListeFactures", title: "Liste des factures" },
  { path: "/ListeSituation", title: "Liste des situations" },
  { path: "/ListeBonCommande", title: "Liste des bons de commande" },
  { path: "/BonCommandeModif", title: "Bon de commande" },
  { path: "/ModificationBC/:id", title: "Bon de commande - Modification" },
  { path: "/ListeFournisseurs", title: "Liste des fournisseurs" },
  { path: "/ListeSousTraitants", title: "Liste des sous-traitants" },
  { path: "/TableauFacturation", title: "Tableau facturation" },
  { path: "/TableauFournisseur", title: "Tableau fournisseur" },
  { path: "/TableauSousTraitant", title: "Tableau sous-traitant" },
  { path: "/TableauSuivi", title: "Tableau suivi" },
  { path: "/PlanningContainer", title: "Planning" },
  { path: "/CalendrierAgentContainer", title: "Calendrier agents" },
  { path: "/AgentCardContainer", title: "Agents" },
  { path: "/AgencyExpenses", title: "Frais d'agence" },
  { path: "/ChantiersDrivePaths", title: "Chantiers - Drive" },
  { path: "/drive", title: "Drive" },
  { path: "/drive-v2", title: "Drive V2" },
  { path: "/drive-v2/preview", title: "Previsualisation fichier" },
  { path: "/drive-v2/editor", title: "Editeur de fichier" },
  { path: "/paiements-sous-traitant/:chantierId/:sousTraitantId", title: "Paiements sous-traitant" },
  { path: "/GestionAppelsOffres", title: "Appels d'offres" },
  { path: "/StockForm", title: "Stock" },
];

const resolveTitle = (pathname) => {
  const match = ROUTE_TITLES.find((route) =>
    matchPath({ path: route.path, end: true }, pathname)
  );
  if (!match) {
    return BASE_TITLE;
  }
  return `${match.title} | ${BASE_TITLE}`;
};

const PageTitleManager = () => {
  const location = useLocation();

  useEffect(() => {
    document.title = resolveTitle(location.pathname);
  }, [location.pathname]);

  return null;
};

export default PageTitleManager;
