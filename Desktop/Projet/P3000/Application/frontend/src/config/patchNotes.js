/**
 * Notes de mise à jour affichées aux utilisateurs.
 *
 * Pour une nouvelle version :
 * 1. Changez PATCH_NOTES_ID (sinon le modal ne se rouvre pas)
 * 2. Incrémentez version
 * 3. Mettez à jour title, date et la liste features
 *
 * kind : "nouveau" | "ameliore"
 * visual : identifiant du dessin de boutons dans PatchNotesModal
 */
export const PATCH_NOTES_STORAGE_KEY = "p3000_seen_patch_notes";
export const PATCH_NOTES_OPEN_EVENT = "p3000:open-patch-notes";
export const PATCH_NOTES_SEEN_EVENT = "p3000:patch-notes-seen";

export const PATCH_NOTES_ID = "2026-09-15-tags-notifications-1.1.1";

const PATCH_NOTES = {
  id: PATCH_NOTES_ID,
  version: "1.1",
  title: "Quoi de neuf ?",
  date: "Septembre 2026",
  intro: "Suivez vos devis avec des tags, et soyez alertés dès qu'une facture ou un avenant est créé.",
  features: [
    {
      id: "devis-tags",
      kind: "nouveau",
      title: "Tags sur les devis",
      where: "Liste des devis et fiche chantier",
      text: "Chaque devis peut porter plusieurs tags (BDC, décision, travaux, actions). Cliquez sur les tags pour les modifier. Un filtre permet de retrouver une combinaison exacte. L’historique garde la trace des changements, y compris les transformations en facture ou avenant.",
      steps: [
        "Dans la liste des devis, cliquez sur les tags d’un devis",
        "Cochez un ou plusieurs tags (un seul par ligne : BDC, décision, travaux, actions)",
        "Utilisez le filtre Tags pour afficher les devis qui ont tous les tags choisis",
        "Cliquez sur l’icône historique pour voir Avant → Après, et le numéro de facture/avenant s’il y a eu une transformation",
      ],
      visual: "devis-tags",
    },
    {
      id: "devis-notifications",
      kind: "nouveau",
      title: "Alertes tags et nouvelles factures",
      where: "Cloche en haut à droite (toute l’application)",
      text: "Quand quelqu’un change les tags d’un devis, vous recevez une alerte. Si le devis est transformé en facture, avenant ou CIE, la notification affiche le type de transformation et le numéro du document. Un clic sur le numéro ouvre la facture dans un nouvel onglet.",
      steps: [
        "Ouvrez la cloche en haut à droite pour voir les alertes",
        "Lisez le changement de tags (Avant → Après)",
        "Si une facture a été créée, cliquez sur son numéro pour l’ouvrir",
        "Un clic sur l’alerte vous emmène aussi vers le chantier concerné",
      ],
      visual: "devis-notifications",
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
