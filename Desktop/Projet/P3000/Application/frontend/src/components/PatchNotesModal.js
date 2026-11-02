import React, { useCallback, useEffect, useState } from "react";
import PATCH_NOTES, {
  PATCH_NOTES_OPEN_EVENT,
  hasUnseenPatchNotes,
  markPatchNotesSeen,
} from "../config/patchNotes";
import "../../static/css/patchNotes.css";

function VisualAppelOffres() {
  return (
    <div className="pn-screen">
      <div className="pn-screen-bar">Appel d&apos;offres — crayon</div>
      <div className="pn-row">
        <span className="pn-chip pn-chip-ok">Chantier</span>
        <span className="pn-chip pn-chip-bdc">Société</span>
        <span className="pn-chip pn-chip-action">Client</span>
      </div>
      <p className="pn-caption">Nom, adresse et contact, sans créer de chantier.</p>
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

  if (key === "appel-offres-modifier" || feature.id === "appel-offres-modifier") {
    return <VisualAppelOffres />;
  }
  return null;
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

        <div className={`pn-body${feature.visual ? "" : " pn-body-text"}`}>
          {feature.visual ? (
            <div className="pn-visual">
              <FeatureVisual feature={feature} />
            </div>
          ) : null}

          <div className="pn-info">
            <span className={`pn-tag pn-tag-${feature.kind}`}>
              {feature.kind === "nouveau"
                ? "Nouveau"
                : feature.kind === "bugfix"
                  ? "Bug fix"
                  : "Amélioré"}
            </span>
            <h3>{feature.title}</h3>
            <p className="pn-where">{feature.where}</p>
            {feature.text ? <p className="pn-text">{feature.text}</p> : null}
            {Array.isArray(feature.fixes) && feature.fixes.length > 0 && (
              <ul className="pn-steps">
                {feature.fixes.map((fix) => (
                  <li key={fix}>{fix}</li>
                ))}
              </ul>
            )}
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
