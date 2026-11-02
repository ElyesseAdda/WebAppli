/**
 * Notes de mise à jour affichées aux utilisateurs.
 *
 * Pour une nouvelle version :
 * 1. Changez PATCH_NOTES_ID (sinon le modal ne se rouvre pas)
 * 2. Incrémentez version
 * 3. Mettez à jour title, date et la liste features
 *
 * kind : "nouveau" | "ameliore" | "bugfix"
 * visual : identifiant du dessin de boutons dans PatchNotesModal
 */
export const PATCH_NOTES_STORAGE_KEY = "p3000_seen_patch_notes";
export const PATCH_NOTES_OPEN_EVENT = "p3000:open-patch-notes";
export const PATCH_NOTES_SEEN_EVENT = "p3000:patch-notes-seen";

export const PATCH_NOTES_ID = "2026-11-02-bugfix-situation-1.2";

const PATCH_NOTES = {
  id: PATCH_NOTES_ID,
  version: "1.2",
  title: "Quoi de neuf ?",
  date: "Novembre 2026",
  intro: "Deux corrections, et un appel d'offres se modifie sans créer de chantier.",
  features: [
    {
      id: "bugfix",
      kind: "bugfix",
      title: "Corrections",
      where: "Devis et situations",
      fixes: [
        "Le nom tapé sur un devis est conservé.",
        "Le montant global HT d'une situation inclut les avenants.",
      ],
    },
    {
      id: "appel-offres-modifier",
      kind: "nouveau",
      title: "Corriger un appel d'offres",
      where: "Chantier → Appel d'Offre",
      text: "Le crayon ouvre trois onglets : Chantier, Société et Client. Vous modifiez ces fiches sans créer de chantier.",
      steps: [
        "Dans la liste, cliquez sur le crayon",
        "Chantier : nom et adresse du projet",
        "Société : nom et adresse",
        "Client : nom, e-mail et téléphone",
        "Enregistrer met à jour les trois fiches",
      ],
      visual: "appel-offres-modifier",
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
