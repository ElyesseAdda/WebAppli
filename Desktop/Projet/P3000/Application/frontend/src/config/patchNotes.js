/**
 * Notes de mise à jour affichées aux utilisateurs.
 *
 * Pour une nouvelle version :
 * 1. Changez PATCH_NOTES_ID (sinon le modal ne se rouvre pas)
 * 2. Mettez à jour title, date et la liste features
 *
 * kind : "nouveau" | "ameliore"
 * visual : identifiant du dessin de boutons dans PatchNotesModal
 */
export const PATCH_NOTES_STORAGE_KEY = "p3000_seen_patch_notes";
export const PATCH_NOTES_OPEN_EVENT = "p3000:open-patch-notes";
export const PATCH_NOTES_SEEN_EVENT = "p3000:patch-notes-seen";

export const PATCH_NOTES_ID = "2026-09-09-pointage-agence";

const PATCH_NOTES = {
  id: PATCH_NOTES_ID,
  title: "Quoi de neuf ?",
  date: "Septembre 2026",
  intro: "Voici la nouveauté de cette mise à jour.",
  features: [
    {
      id: "pointage-agence",
      kind: "ameliore",
      title: "Pointage et agence : un seul montant par agent",
      where: "Tableau de pointage et page Agence",
      text: "Quand les fiches de paie arrivent, le montant chargé remplace l’estimation du planning hebdo (et les ajustements sous-traitant) dans l’agence. Plus de double comptage. Si vous retirez ce montant, le planning et les ajustements réapparaissent.",
      steps: [
        "Dans le menu Tableau, ouvrez Tableau de pointage",
        "Saisissez le montant chargé, puis cochez Agence pour l’imputer (éventuellement réparti entre agences et chantier)",
        "Sur la page Agence, le planning hebdo et les ajustements de cet agent disparaissent : seul le montant chargé compte",
        "Si vous mettez le montant chargé à 0 (ou décochez Agence), le planning et les ajustements réapparaissent",
      ],
      visual: "pointage-agence",
    },
  ],
};

export const hasUnseenPatchNotes = () => {
  try {
    return localStorage.getItem(PATCH_NOTES_STORAGE_KEY) !== PATCH_NOTES.id;
  } catch (_) {
    return true;
  }
};

export const markPatchNotesSeen = () => {
  try {
    localStorage.setItem(PATCH_NOTES_STORAGE_KEY, PATCH_NOTES.id);
    window.dispatchEvent(new Event(PATCH_NOTES_SEEN_EVENT));
  } catch (_) {
    /* ignore */
  }
};

export const openPatchNotes = () => {
  window.dispatchEvent(new Event(PATCH_NOTES_OPEN_EVENT));
};

export default PATCH_NOTES;
