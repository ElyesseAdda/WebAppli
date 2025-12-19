import axios from "axios";
import React, { useEffect, useState } from "react";
import { MdConstruction, MdEventAvailable, MdFolderOpen, MdBusiness, MdTableChart } from "react-icons/md";
import { SiGoogledrive } from "react-icons/si";
import { useLocation, useParams } from "react-router-dom";
import "./../../static/css/breadcrumb.css";

function matchPrefix(pathname, prefixes) {
  return prefixes.find((p) =>
    p === "/" ? pathname === "/" : pathname.startsWith(p)
  );
}

const sectionConfigs = [
  {
    key: "chantier",
    label: "Chantier",
    icon: MdConstruction,
    prefixes: [
      "/",
      "/ChantierDetail",
      "/GestionAppelsOffres",
      "/AgencyExpenses",
      "/ChantiersDashboard",
      "/TableauSuivi",
    ],
  },
  {
    key: "tableau",
    label: "Tableau",
    icon: MdTableChart,
    prefixes: [
      "/TableauFacturation",
      "/TableauFournisseur",
    ],
  },
  {
    key: "agent_planning",
    label: "Agent et planning",
    icon: MdEventAvailable,
    prefixes: ["/Agent", "/PlanningContainer", "/CalendrierAgentContainer"],
  },
  {
    key: "document",
    label: "Document",
    icon: MdFolderOpen,
    prefixes: [
      "/CreationDevis",
      "/BonCommande",
      "/ListeDevis",
      "/ListeSituation",
      "/ListeFactures",
      "/ListeBonCommande",
      "/DevisAvance",
    ],
  },
  {
    key: "fournisseurs",
    label: "Fournisseurs",
    icon: MdBusiness,
    prefixes: [
      "/ListeFournisseurs",
      "/ListeSousTraitants",
    ],
  },
  {
    key: "drive",
    label: "Drive",
    icon: SiGoogledrive,
    prefixes: ["/drive"], // placeholder if needed later
  },
];

const pageLabelByPrefix = [
  { prefix: "/", label: "Dashboard" },
  { prefix: "/ChantierDetail", label: "Récap Chantier" },
  { prefix: "/TableauFacturation", label: "Tableau Facturation" },
  { prefix: "/TableauFournisseur", label: "Tableau Fournisseur" },
  { prefix: "/GestionAppelsOffres", label: "Liste Appel offres" },
  { prefix: "/AgencyExpenses", label: "Agence" },
  { prefix: "/Agent", label: "Gestion agent" },
  { prefix: "/CalendrierAgentContainer", label: "Gestion agent" },
  { prefix: "/PlanningContainer", label: "Planning hebdo" },
  { prefix: "/CreationDevis", label: "Devis (création)" },
  { prefix: "/BonCommande", label: "Liste BC" },
  { prefix: "/ListeBonCommande", label: "Liste Bon de Commande" },
  { prefix: "/DevisAvance", label: "Devis" },
  { prefix: "/ListeDevis", label: "Liste Devis" },
  { prefix: "/ListeSituation", label: "Liste Situation" },
  { prefix: "/ListeFactures", label: "Liste facture" },
  { prefix: "/ListeFournisseurs", label: "Liste Fournisseurs" },
  { prefix: "/ListeSousTraitants", label: "Sous traitant" },
  { prefix: "/paiements-sous-traitant", label: "Paiements sous-traitant" },
];

const BreadcrumbHeader = ({ user, onLogout }) => {
  const location = useLocation();
  const params = useParams();
  const { pathname } = location;

  const section = sectionConfigs.find((cfg) =>
    matchPrefix(pathname, cfg.prefixes)
  );
  const SectionIcon = section?.icon || MdConstruction;

  const pageLabelEntry = pageLabelByPrefix.find((e) =>
    e.prefix === "/" ? pathname === "/" : pathname.startsWith(e.prefix)
  );
  const pageLabel = pageLabelEntry?.label || "";

  // Suffix contextuel: pour /ChantierDetail/:id, afficher le nom du chantier si possible
  const [chantierName, setChantierName] = useState("");
  const id = pathname.startsWith("/ChantierDetail/")
    ? params.id || pathname.split("/")[2]
    : null;

  useEffect(() => {
    let cancelled = false;
    const reset = () => {
      if (!cancelled) setChantierName("");
    };
    if (!id) {
      reset();
      return () => {
        cancelled = true;
      };
    }

    // 1) Essayer depuis l'historique local
    try {
      const hist = JSON.parse(localStorage.getItem("chantier_history") || "[]");
      const found = hist.find((c) => String(c.id) === String(id));
      if (found?.chantier_name) {
        setChantierName(found.chantier_name);
        return () => {
          cancelled = true;
        };
      }
    } catch (_) {}

    // 2) Fallback: requête API légère
    (async () => {
      try {
        const res = await axios.get(`/api/chantier/${id}/details/`);
        if (!cancelled) setChantierName(res.data?.nom || "");
      } catch (_) {
        if (!cancelled) setChantierName("");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
  };

  return (
    <div className="breadcrumb-header">
      <div className="breadcrumb-left">
        <div className="breadcrumb-icon">
          <SectionIcon />
        </div>
        <div className="breadcrumb-text">
          <div className="breadcrumb-line">
            <span className="breadcrumb-section">{section?.label || ""}</span>
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-page">{pageLabel}</span>
            {id && chantierName && (
              <>
                <span className="breadcrumb-sep">›</span>
                <span className="breadcrumb-context">{chantierName}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bouton de déconnexion intégré dans le breadcrumb */}
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
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16,17 21,12 16,7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
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
