import React, { useCallback, useEffect, useState } from "react";
import PATCH_NOTES, {
  PATCH_NOTES_OPEN_EVENT,
  hasUnseenPatchNotes,
  markPatchNotesSeen,
} from "../config/patchNotes";
import "../../static/css/patchNotes.css";

const VisualPointageAgence = () => (
  <div className="pn-screen">
    <div className="pn-screen-bar">Agence — dépenses du mois</div>
    <div className="pn-row is-muted">
      <span className="pn-doc">Planning hebdo — Agent</span>
      <span className="pn-pill">Masqué</span>
    </div>
    <div className="pn-row is-muted">
      <span className="pn-doc">Ajustement sous-traitant</span>
      <span className="pn-pill">Masqué</span>
    </div>
    <div className="pn-row">
      <span className="pn-doc pn-hit" data-label="Compte dans l’agence">
        Pointage — montant chargé
      </span>
      <span className="pn-pill pn-pill-ok">Conservé</span>
    </div>
    <p className="pn-caption">
      Dès que le montant chargé est imputé à l’agence, il remplace le planning et les ajustements.
      S’il est retiré, ceux-ci réapparaissent.
    </p>
  </div>
);

const VISUALS = {
  "pointage-agence": VisualPointageAgence,
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
