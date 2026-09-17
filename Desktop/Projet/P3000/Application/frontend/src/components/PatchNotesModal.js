import React, { useCallback, useEffect, useState } from "react";
import PATCH_NOTES, {
  PATCH_NOTES_OPEN_EVENT,
  hasUnseenPatchNotes,
  markPatchNotesSeen,
} from "../config/patchNotes";
import "../../static/css/patchNotes.css";

function VisualAgentConges() {
  return (
    <div className="pn-screen">
      <div className="pn-screen-bar">Carte Agent — Congés</div>
      <div className="pn-kpi-row">
        <div className="pn-kpi">
          <strong>0</strong>
          <span>Acquis</span>
        </div>
        <div className="pn-kpi pn-hit" data-label="Cliquez pour corriger">
          <strong>1,2</strong>
          <span>En cours</span>
        </div>
        <div className="pn-kpi">
          <strong>21</strong>
          <span>Prévision</span>
        </div>
        <div className="pn-kpi">
          <strong>0</strong>
          <span>Pris</span>
        </div>
      </div>
      <div className="pn-row pn-hit" data-label="Cliquez pour le détail">
        <span>Septembre 2026</span>
        <strong>1,02 j</strong>
      </div>
      <div className="pn-conges-detail">
        <div>2,5 × 9 / 22 = 1,02 j acquis</div>
        <div>9 présence · 4 absences</div>
      </div>
      <p className="pn-caption">
        Corrigez les compteurs au clic, puis ouvrez un mois pour voir le calcul.
      </p>
    </div>
  );
}

function VisualDevisTags() {
  return (
    <div className="pn-screen">
      <div className="pn-screen-bar">Liste des devis — tags</div>
      <div className="pn-row">
        <span className="pn-doc">DEV-2026-014</span>
        <span className="pn-tag-chips">
          <span className="pn-chip pn-chip-bdc">BDC reçus</span>
          <span className="pn-chip pn-chip-ok">Validé</span>
          <span className="pn-chip pn-chip-work">Travaux réalisés</span>
        </span>
      </div>
      <div className="pn-row">
        <span className="pn-doc">DEV-2026-015</span>
        <span className="pn-tag-chips">
          <span
            className="pn-hit pn-chip pn-chip-action"
            data-label="Cliquez pour modifier"
          >
            A facturer
          </span>
        </span>
      </div>
      <div className="pn-history-card">
        <div className="pn-history-meta">Aujourd&apos;hui — Marie</div>
        <div className="pn-history-flow">
          <span className="pn-chip pn-chip-action">A facturer</span>
          <span className="pn-arrow">→</span>
          <span className="pn-chip pn-chip-ok">Facturé</span>
        </div>
        <div className="pn-history-doc">
          Transformation en facture —{" "}
          <span className="pn-linkish">F2026-042</span>
        </div>
      </div>
      <p className="pn-caption">
        Plusieurs tags par devis, filtre par combinaison, et historique avec le
        numéro de document.
      </p>
    </div>
  );
}

function VisualDevisNotifications() {
  return (
    <div className="pn-screen">
      <div className="pn-screen-bar">Alertes — cloche en haut à droite</div>
      <div className="pn-notif-card">
        <div className="pn-notif-title">
          Jean — transformation en facture du devis DEV-2026-015
        </div>
        <div className="pn-history-doc">
          Transformation en facture —{" "}
          <span className="pn-hit pn-linkish" data-label="Ouvre la facture">
            F2026-042
          </span>
        </div>
        <div className="pn-history-flow">
          <span className="pn-chip pn-chip-action">A facturer</span>
          <span className="pn-arrow">→</span>
          <span className="pn-chip pn-chip-ok">Facturé</span>
        </div>
      </div>
      <div className="pn-notif-card is-muted">
        <div className="pn-notif-title">
          Sophie a modifié les tags du devis DEV-2026-014
        </div>
        <div className="pn-history-flow">
          <span className="pn-chip pn-chip-bdc">En attente BDC</span>
          <span className="pn-arrow">→</span>
          <span className="pn-chip pn-chip-bdc">BDC reçus</span>
        </div>
      </div>
      <p className="pn-caption">
        Vous etes alertes partout dans l&apos;app. Le numéro de facture ou
        d&apos;avenant est cliquable.
      </p>
    </div>
  );
}

function FeatureVisual({ feature }) {
  if (!feature) {
    return (
      <div className="pn-screen">
        <p className="pn-caption">Aperçu indisponible.</p>
      </div>
    );
  }

  const key = feature.visual || feature.id;

  if (key === "agent-conges" || feature.id === "agent-conges") {
    return <VisualAgentConges />;
  }
  if (key === "devis-tags" || feature.id === "devis-tags") {
    return <VisualDevisTags />;
  }
  if (key === "devis-notifications" || feature.id === "devis-notifications") {
    return <VisualDevisNotifications />;
  }

  return (
    <div className="pn-screen">
      <div className="pn-screen-bar">{feature.title}</div>
      <p className="pn-caption">{feature.text}</p>
    </div>
  );
}

const PatchNotesModal = () => {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const features = PATCH_NOTES.features || [];
  const lastIndex = Math.max(features.length - 1, 0);
  const feature = features[index] || null;
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
            <p className="pn-kicker">
              {PATCH_NOTES.date}
              {PATCH_NOTES.version ? ` · v${PATCH_NOTES.version}` : ""}
            </p>
            <h2 id="pn-title">{PATCH_NOTES.title}</h2>
            <p className="pn-intro">{PATCH_NOTES.intro}</p>
          </div>
          <button type="button" className="pn-close" onClick={handleClose} aria-label="Fermer">
            ×
          </button>
        </header>

        <div className="pn-body">
          <div className="pn-visual">
            <FeatureVisual feature={feature} />
          </div>

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
                J&apos;ai compris
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
