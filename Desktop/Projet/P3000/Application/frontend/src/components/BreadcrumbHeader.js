import axios from "axios";
import React, { useEffect, useMemo, useState } from "react";
import { FaHandshake } from "react-icons/fa";
import {
  MdAdminPanelSettings,
  MdApps,
  MdConstruction,
  MdEventAvailable,
  MdFolderOpen,
  MdFolderShared,
  MdTableChart,
} from "react-icons/md";
import { SiGoogledrive } from "react-icons/si";
import { matchPath, useLocation, useParams } from "react-router-dom";
import "./../../static/css/breadcrumb.css";

/** Routes du breadcrumb — les chemins les plus spécifiques en premier. */
const BREADCRUMB_ROUTES = [
  { path: "/ChantierDetail/:id", section: "Chantier", page: "Récap Chantier", icon: MdConstruction, chantierContext: true },
  { path: "/chantier/:id", section: "Chantier", page: "Chantier", icon: MdConstruction },
  { path: "/agence/:agenceId/expenses", section: "Chantier", page: "dynamicAgence", icon: MdConstruction, agenceContext: true },
  { path: "/gantt/:id", section: "Agent & Planning", page: "Diagramme de Gantt", icon: MdEventAvailable },
  { path: "/ModificationDevisV2/:devisId", section: "Documents", page: "Modification devis", icon: MdFolderOpen },
  { path: "/ModificationDevis/:devisId", section: "Documents", page: "Modification devis", icon: MdFolderOpen },
  { path: "/ModificationBC/:id", section: "Documents", page: "Modification bon de commande", icon: MdFolderOpen },
  { path: "/RapportIntervention/:id/preview", section: "Documents", page: "Aperçu rapport", icon: MdFolderOpen },
  { path: "/RapportIntervention/:id", section: "Documents", page: "Rapport d'intervention", icon: MdFolderOpen },
  { path: "/RapportIntervention/nouveau", section: "Documents", page: "Nouveau rapport", icon: MdFolderOpen },
  { path: "/paiements-sous-traitant/:chantierId/:sousTraitantId", section: "Tableau", page: "Paiements sous-traitant", icon: MdTableChart },
  { path: "/drive-v2/preview", section: "Drive", page: "Prévisualisation", icon: SiGoogledrive },
  { path: "/drive-v2/editor", section: "Drive", page: "Éditeur de fichier", icon: SiGoogledrive },
  { path: "/", section: "Chantier", page: "Dashboard", icon: MdConstruction },
  { path: "/ChantiersDashboard", section: "Chantier", page: "Dashboard chantiers", icon: MdConstruction },
  { path: "/ListeChantier", section: "Chantier", page: "Liste des chantiers", icon: MdConstruction },
  { path: "/ChantierTabs", section: "Chantier", page: "Vue chantier", icon: MdConstruction },
  { path: "/GestionAppelsOffres", section: "Chantier", page: "Appel d'offre", icon: MdConstruction },
  { path: "/AgencyExpenses", section: "Chantier", page: "Agence", icon: MdConstruction },
  { path: "/TableauFacturation", section: "Tableau", page: "Tableau Facturation", icon: MdTableChart },
  { path: "/TableauFournisseur", section: "Tableau", page: "Tableau Fournisseur", icon: MdTableChart },
  { path: "/TableauSousTraitant", section: "Tableau", page: "Tableau Sous-Traitant", icon: MdTableChart },
  { path: "/TableauPointage", section: "Tableau", page: "Tableau de pointage", icon: MdTableChart },
  { path: "/TableauSuivi", section: "Chantier", page: "Tableau suivi", icon: MdConstruction },
  { path: "/CalendrierAgentContainer", section: "Agent & Planning", page: "Gestion agent", icon: MdEventAvailable },
  { path: "/AgentCardContainer", section: "Agent & Planning", page: "Carte agent", icon: MdEventAvailable },
  { path: "/PlanningContainer", section: "Agent & Planning", page: "Planning hebdo", icon: MdEventAvailable },
  { path: "/gantt", section: "Agent & Planning", page: "Diagrammes de Gantt", icon: MdEventAvailable },
  { path: "/ListeDevis", section: "Documents", page: "Liste Devis", icon: MdFolderOpen },
  { path: "/ListeSituation", section: "Documents", page: "Liste Situation", icon: MdFolderOpen },
  { path: "/ListeFactures", section: "Documents", page: "Liste facture", icon: MdFolderOpen },
  { path: "/ListeBonCommande", section: "Documents", page: "Liste Bon de Commande", icon: MdFolderOpen },
  { path: "/RapportsIntervention", section: "Documents", page: "Rapports d'intervention", icon: MdFolderOpen },
  { path: "/DevisAvance", section: "Documents", page: "Devis", icon: MdFolderOpen },
  { path: "/CreationDevis", section: "Documents", page: "Création devis", icon: MdFolderOpen },
  { path: "/BonCommandeModif", section: "Documents", page: "Bon de commande", icon: MdFolderOpen },
  { path: "/ListeClient", section: "Collaborateur", page: "Liste Clients", icon: FaHandshake },
  { path: "/ListeFournisseurs", section: "Collaborateur", page: "Liste Fournisseurs", icon: FaHandshake },
  { path: "/ListeSousTraitants", section: "Collaborateur", page: "Sous-traitant", icon: FaHandshake },
  { path: "/ComparateurFournisseurs", section: "Collaborateur", page: "Comparateur", icon: FaHandshake },
  { path: "/UsersManagement", section: "Admin", page: "Utilisateurs", icon: MdAdminPanelSettings },
  { path: "/admin/agences", section: "Admin", page: "Gestion agences", icon: MdAdminPanelSettings },
  { path: "/drive-recovery", section: "Admin", page: "Récupération Drive", icon: MdAdminPanelSettings },
  { path: "/drive-v2", section: "Drive", page: "Drive", icon: SiGoogledrive },
  { path: "/drive", section: "Drive", page: "Drive", icon: SiGoogledrive },
  { path: "/ChantiersDrivePaths", section: "Drive", page: "Chemins Drive", icon: MdFolderShared },
  { path: "/StockForm", section: "Chantier", page: "Stock", icon: MdConstruction },
  { path: "/distributeurs", section: "Applications", page: "Distributeurs", icon: MdApps },
  { path: "/mobile-home", section: "Application", page: "Accueil mobile", icon: MdApps },
  { path: "/drive-mobile", section: "Drive", page: "Drive mobile", icon: SiGoogledrive },
  { path: "/rapports-mobile", section: "Documents", page: "Rapports mobile", icon: MdFolderOpen },
];

const findBreadcrumbRoute = (pathname) =>
  BREADCRUMB_ROUTES.find((route) =>
    matchPath({ path: route.path, end: true }, pathname)
  );

const BreadcrumbHeader = ({ user, onLogout }) => {
  const location = useLocation();
  const params = useParams();
  const { pathname } = location;

  const matchedRoute = useMemo(
    () => findBreadcrumbRoute(pathname),
    [pathname]
  );

  const SectionIcon = matchedRoute?.icon || MdConstruction;
  const sectionLabel = matchedRoute?.section || "";

  const [agenceName, setAgenceName] = useState("");
  const agenceIdFromUrl = matchedRoute?.agenceContext
    ? params.agenceId || pathname.match(/^\/agence\/(\d+)\/expenses/)?.[1]
    : null;

  useEffect(() => {
    if (!agenceIdFromUrl) {
      setAgenceName("");
      return;
    }
    axios
      .get(`/api/agences/${agenceIdFromUrl}/`)
      .then((res) => setAgenceName(res.data?.nom || "Agence"))
      .catch(() => setAgenceName("Agence"));
  }, [agenceIdFromUrl]);

  const pageLabel = useMemo(() => {
    if (!matchedRoute) return "";
    if (matchedRoute.page === "dynamicAgence") {
      return agenceName || "Agence";
    }
    return matchedRoute.page;
  }, [matchedRoute, agenceName]);

  const [chantierName, setChantierName] = useState("");
  const chantierId = matchedRoute?.chantierContext
    ? params.id || pathname.split("/")[2]
    : null;

  useEffect(() => {
    let cancelled = false;
    if (!chantierId) {
      setChantierName("");
      return undefined;
    }

    try {
      const hist = JSON.parse(localStorage.getItem("chantier_history") || "[]");
      const found = hist.find((c) => String(c.id) === String(chantierId));
      if (found?.chantier_name) {
        setChantierName(found.chantier_name);
        return undefined;
      }
    } catch (_) {
      /* ignore */
    }

    (async () => {
      try {
        const res = await axios.get(`/api/chantier/${chantierId}/details/`);
        if (!cancelled) setChantierName(res.data?.nom || "");
      } catch (_) {
        if (!cancelled) setChantierName("");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [chantierId]);

  const handleLogout = () => {
    if (onLogout) onLogout();
  };

  const showSection = Boolean(sectionLabel);
  const showPage = Boolean(pageLabel);
  const showContext = Boolean(chantierId && chantierName);

  return (
    <div className="breadcrumb-header">
      <div className="breadcrumb-left">
        <div className="breadcrumb-icon">
          <SectionIcon />
        </div>
        <div className="breadcrumb-text">
          <div className="breadcrumb-line">
            {showSection && (
              <span className="breadcrumb-section">{sectionLabel}</span>
            )}
            {showSection && showPage && (
              <span className="breadcrumb-sep">›</span>
            )}
            {showPage && (
              <span className="breadcrumb-page">{pageLabel}</span>
            )}
            {showContext && (
              <>
                <span className="breadcrumb-sep">›</span>
                <span className="breadcrumb-context">{chantierName}</span>
              </>
            )}
            {!showSection && !showPage && !showContext && (
              <span className="breadcrumb-page">Application</span>
            )}
          </div>
        </div>
      </div>

      {user && (
        <div className="breadcrumb-right">
          <div className="user-section">
            <span className="user-name">
              {user.first_name || user.username || "Utilisateur"}
            </span>
            <button
              className="logout-button"
              onClick={handleLogout}
              title="Se déconnecter"
              type="button"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16,17 21,12 16,7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Déconnexion
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BreadcrumbHeader;
