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

export const PATCH_NOTES_ID = "2026-11-02-recherche-devis-1.2";

const PATCH_NOTES = {
  id: PATCH_NOTES_ID,
  version: "1.2",
  title: "Quoi de neuf ?",
  date: "Novembre 2026",
  intro: "Une barre de recherche intelligente : une seule barre pour tout votre devis.",
  features: [
    {
      id: "recherche-devis",
      kind: "nouveau",
      title: "Une barre de recherche intelligente",
      where: "Devis",
      text: "Une seule barre pour tout votre devis. Tapez un mot : les parties, les sous-parties et les lignes de détail qui correspondent s'affichent ensemble.",
      steps: [
        "La barre est juste sous Désignation",
        "Une ligne ajoute sa partie et sa sous-partie si elles ne sont pas déjà dans le devis",
        "Une sous-partie ajoute seulement sa partie",
        "Le texte reste dans le champ : vous pouvez en ajouter plusieurs d'affilée",
        "Si rien ne correspond, créez une partie avec ce nom",
      ],
    },
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
