import { useEffect, useState } from "react";
import { matchPath, useLocation } from "react-router-dom";
import entrepriseConfigService from "../services/entrepriseConfigService";

const DEFAULT_TITLE = "Webapplication P3000";

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

const resolveTitle = (pathname, baseTitle) => {
  const match = ROUTE_TITLES.find((route) =>
    matchPath({ path: route.path, end: true }, pathname)
  );
  if (!match) {
    return baseTitle;
  }
  return `${match.title} | ${baseTitle}`;
};

const PageTitleManager = () => {
  const location = useLocation();
  const [baseTitle, setBaseTitle] = useState(DEFAULT_TITLE);

  useEffect(() => {
    entrepriseConfigService.getConfig().then((config) => {
      if (config && config.nom_application) {
        setBaseTitle(config.nom_application);
      }
    });
  }, []);

  useEffect(() => {
    document.title = resolveTitle(location.pathname, baseTitle);
  }, [location.pathname, baseTitle]);

  return null;
};

export default PageTitleManager;
