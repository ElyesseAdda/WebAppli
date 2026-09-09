import React, { useCallback, useEffect, useState } from "react";
import {
  MdAdd,
  MdApps,
  MdDelete,
  MdDownload,
  MdFolder,
  MdPersonAdd,
  MdVisibilityOff,
  MdWarningAmber,
} from "react-icons/md";
import PATCH_NOTES, {
  PATCH_NOTES_OPEN_EVENT,
  hasUnseenPatchNotes,
  markPatchNotesSeen,
} from "../config/patchNotes";
import "../../static/css/patchNotes.css";

const VisualAgentCard = () => (
  <div className="pn-screen">
    <div className="pn-screen-bar">Carte Agent</div>
    <div className="pn-btn-row">
      <span className="pn-app-btn pn-app-btn-outline">
        <MdPersonAdd />
        Nouvel agent
      </span>
      <span className="pn-hit pn-app-btn pn-app-btn-outline" data-label="Créer un contrat">
        <MdAdd />
        Ajouter
      </span>
      <span className="pn-app-btn pn-app-btn-red">
        <MdDelete />
        Supprimer
      </span>
    </div>
    <div className="pn-row">
      <span className="pn-doc">CDI — 01/03/2026</span>
    </div>
    <p className="pn-caption">
      Menu Agent & Planning → Carte Agent. « Ajouter » crée un contrat, « Supprimer » retire l’agent.
    </p>
  </div>
);

const VisualContratDates = () => (
  <div className="pn-screen">
    <div className="pn-screen-bar">Planning, gestion agent, pointage</div>
    <div className="pn-row">
      <span className="pn-doc">Martin Dupont</span>
      <span className="pn-pill pn-pill-ok">Contrat en cours</span>
    </div>
    <div className="pn-row is-muted">
      <span className="pn-doc">Léa Bernard</span>
      <span className="pn-pill">Hors contrat</span>
    </div>
    <p className="pn-caption">
      Valable dans Planning hebdo, Gestion agent et Tableau de pointage.
    </p>
  </div>
);

const VisualHideRow = () => (
  <div className="pn-screen">
    <div className="pn-screen-bar">Tableau Fournisseur / Sous-Traitant</div>
    <button type="button" className="pn-app-btn pn-app-btn-outline">
      <MdVisibilityOff />
      Lignes masquées
    </button>
    <div className="pn-row">
      <span className="pn-doc">Fournisseur Martin</span>
      <span className="pn-hit" data-label="Masquer cette ligne">
        <MdVisibilityOff />
      </span>
    </div>
    <div className="pn-row is-muted">
      <span className="pn-doc">FAC-12-26 — 1 250 €</span>
    </div>
    <p className="pn-caption">
      L’œil barré est à droite de la ligne. « Lignes masquées » est en haut du tableau.
    </p>
  </div>
);

const VisualGantt = () => (
  <div className="pn-screen">
    <div className="pn-screen-bar">Diagrammes de Gantt</div>
    <div className="pn-gantt">
      <div className="pn-gantt-line">
        <span>Préparation</span>
        <i className="pn-gantt-bar" style={{ width: "38%" }} />
      </div>
      <div className="pn-gantt-line">
        <span>Travaux</span>
        <i className="pn-gantt-bar pn-gantt-bar-2" style={{ width: "55%", marginLeft: "18%" }} />
      </div>
      <div className="pn-gantt-line">
        <span>Livraison</span>
        <i className="pn-gantt-bar pn-gantt-bar-3" style={{ width: "22%", marginLeft: "68%" }} />
      </div>
    </div>
    <p className="pn-caption">
      Menu Agent & Planning → Diagrammes de Gantt. Chaque barre est une étape.
    </p>
  </div>
);

const VisualSidebarApps = () => (
  <div className="pn-screen">
    <div className="pn-screen-bar">Menu Applications</div>
    <div className="pn-sidebar-list">
      <span className="pn-sidebar-item">
        <MdApps /> Applications
      </span>
      <span className="pn-hit pn-sidebar-sub" data-label="Ouvre l’autre logiciel">
        Elekable
      </span>
      <span className="pn-sidebar-sub">MJR Services</span>
    </div>
    <p className="pn-caption">
      Cliquez d’abord sur Applications dans la barre de gauche, puis sur Elekable ou MJR Services.
    </p>
  </div>
);

const VisualRecapZero = () => (
  <div className="pn-screen">
    <div className="pn-screen-bar">Récap Financier</div>
    <div className="pn-btn-row">
      <span className="pn-status-refused">Refusé</span>
    </div>
    <div className="pn-row">
      <span>Total chantier</span>
      <strong className="pn-zero">0 €</strong>
    </div>
    <p className="pn-caption">
      Dans le chantier, onglet Récap Financier. Le devis se change dans Documents → Devis.
    </p>
  </div>
);

const VisualFactureAlerte = () => (
  <div className="pn-screen">
    <div className="pn-screen-bar">Devis</div>
    <div className="pn-alert">
      <MdWarningAmber />
      <span>Une facture existe déjà pour ce devis. Voulez-vous vraiment en créer une nouvelle ?</span>
    </div>
    <div className="pn-btn-row">
      <span className="pn-app-btn pn-app-btn-outline">Annuler</span>
      <span className="pn-hit pn-app-btn pn-app-btn-blue" data-label="Continuer quand même">
        Créer
      </span>
    </div>
    <p className="pn-caption">
      Trois points du devis → « Éditer en facture ». Un message s’affiche si une facture existe déjà.
    </p>
  </div>
);

const VisualDriveDownload = () => (
  <div className="pn-screen">
    <div className="pn-screen-bar">Drive</div>
    <div className="pn-row">
      <span className="pn-doc">
        <MdFolder className="pn-folder" />
        Dossier chantier
      </span>
      <span className="pn-hit" data-label="Télécharger">
        <MdDownload />
      </span>
    </div>
    <div className="pn-progress-box">
      <strong>Téléchargement en cours…</strong>
      <div className="pn-progress">
        <i style={{ width: "68%" }} />
      </div>
      <span>Plus rapide, vous pouvez changer de page.</span>
    </div>
    <p className="pn-caption">
      Menu Drive : l’icône de téléchargement est à droite du fichier ou du dossier.
    </p>
  </div>
);

const VISUALS = {
  "agent-card": VisualAgentCard,
  "contrat-dates": VisualContratDates,
  "hide-row": VisualHideRow,
  gantt: VisualGantt,
  "sidebar-apps": VisualSidebarApps,
  "recap-zero": VisualRecapZero,
  "facture-alerte": VisualFactureAlerte,
  "drive-download": VisualDriveDownload,
};

const PatchNotesModal = () => {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const features = PATCH_NOTES.features || [];
  const lastIndex = Math.max(features.length - 1, 0);
  const feature = features[index] || null;
  const Visual = feature ? VISUALS[feature.visual] : null;
  const isLast = index >= lastIndex;

  const handleClose = useCallback(() => {
    markPatchNotesSeen();
    setOpen(false);
    setIndex(0);
  }, []);

  useEffect(() => {
    if (hasUnseenPatchNotes()) {
      const timer = window.setTimeout(() => setOpen(true), 700);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, []);

  useEffect(() => {
    const onOpen = () => {
      setIndex(0);
      setOpen(true);
    };
    window.addEventListener(PATCH_NOTES_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(PATCH_NOTES_OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") handleClose();
      if (event.key === "ArrowRight") setIndex((i) => Math.min(i + 1, lastIndex));
      if (event.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, lastIndex, handleClose]);

  if (!open || !feature) return null;

  return (
    <div className="pn-overlay" role="dialog" aria-modal="true" aria-labelledby="pn-title">
      <div className="pn-modal">
        <header className="pn-header">
          <div>
            <p className="pn-kicker">{PATCH_NOTES.date}</p>
            <h2 id="pn-title">{PATCH_NOTES.title}</h2>
            <p className="pn-intro">{PATCH_NOTES.intro}</p>
          </div>
          <button type="button" className="pn-close" onClick={handleClose} aria-label="Fermer">
            ×
          </button>
        </header>

        <div className="pn-body">
          <div className="pn-visual">{Visual ? <Visual /> : null}</div>

          <div className="pn-info">
            <span className={`pn-tag pn-tag-${feature.kind}`}>
              {feature.kind === "nouveau" ? "Nouveau" : "Amélioré"}
            </span>
            <h3>{feature.title}</h3>
            <p className="pn-where">{feature.where}</p>
            <p className="pn-text">{feature.text}</p>
            {Array.isArray(feature.steps) && feature.steps.length > 0 && (
              <ol className="pn-steps">
                {feature.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            )}
          </div>
        </div>

        <footer className="pn-footer">
          <div className="pn-dots" role="tablist" aria-label="Pages">
            {features.map((item, i) => (
              <button
                key={item.id}
                type="button"
                className={`pn-dot${i === index ? " is-active" : ""}`}
                onClick={() => setIndex(i)}
                aria-label={`Nouveauté ${i + 1}`}
              />
            ))}
          </div>
          <div className="pn-actions">
            {index > 0 && (
              <button type="button" className="pn-btn pn-btn-ghost" onClick={() => setIndex((i) => i - 1)}>
                Retour
              </button>
            )}
            {isLast ? (
              <button type="button" className="pn-btn pn-btn-primary" onClick={handleClose}>
                J’ai compris
              </button>
            ) : (
              <button
                type="button"
                className="pn-btn pn-btn-primary"
                onClick={() => setIndex((i) => Math.min(i + 1, lastIndex))}
              >
                Suivant
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
};

export default PatchNotesModal;
