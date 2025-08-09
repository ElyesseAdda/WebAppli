import axios from "axios";
import React, { useEffect, useState } from "react";
import { MdConstruction, MdEventAvailable, MdFolderOpen } from "react-icons/md";
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
      "/TableauFacturation",
      "/GestionAppelsOffres",
      "/AgencyExpenses",
      "/ChantiersDashboard",
      "/TableauSuivi",
    ],
  },
  {
    key: "agent_planning",
    label: "Agent et planning",
    icon: MdEventAvailable,
    prefixes: ["/Agent", "/PlanningContainer"],
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
  { prefix: "/GestionAppelsOffres", label: "Liste Appel offres" },
  { prefix: "/AgencyExpenses", label: "Agence" },
  { prefix: "/Agent", label: "Gestion agent" },
  { prefix: "/PlanningContainer", label: "Planning hebdo" },
  { prefix: "/CreationDevis", label: "Devis (création)" },
  { prefix: "/BonCommande", label: "Liste BC" },
  { prefix: "/ListeDevis", label: "Liste Devis" },
  { prefix: "/ListeSituation", label: "Liste Situation" },
  { prefix: "/ListeFactures", label: "Liste facture" },
  { prefix: "/paiements-sous-traitant", label: "Paiements sous-traitant" },
];

const BreadcrumbHeader = () => {
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

  return (
    <div className="breadcrumb-header">
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
  );
};

export default BreadcrumbHeader;
