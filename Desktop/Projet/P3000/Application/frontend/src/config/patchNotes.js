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

export const PATCH_NOTES_ID = "2026-09-09-decoupage-recherche";

const PATCH_NOTES = {
  id: PATCH_NOTES_ID,
  title: "Quoi de neuf ?",
  date: "Septembre 2026",
  intro: "Voici les nouveautés de cette mise à jour.",
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
    {
      id: "decoupage-agence",
      kind: "nouveau",
      title: "Séparer l’agence et les chantiers d’un coup d’œil",
      where: "Tableau Fournisseur et Tableau Sous-Traitant",
      text: "Pour la comptabilité, un clic sur un montant ouvre un détail : ce qui concerne l’agence d’un côté, le reste des chantiers de l’autre. Sur l’année, les montants d’un même chantier sont regroupés pour une lecture plus claire.",
      steps: [
        "Dans le menu Tableau, ouvrez Tableau Fournisseur ou Tableau Sous-Traitant",
        "Cliquez sur un montant (ligne, récap du mois, ou totaux de l’année)",
        "Le détail montre la part agence et la part chantiers",
        "Sur le récapitulatif de l’année, chaque chantier n’apparaît qu’une fois, avec son total",
      ],
      visual: "decoupage-agence",
    },
    {
      id: "recherche-facturation",
      kind: "nouveau",
      title: "Retrouver un chantier plus vite dans la facturation",
      where: "Tableau Facturation",
      text: "Le récapitulatif en bas de page a maintenant une barre de recherche et les mêmes tris que les autres tableaux : plus gros montants, pourcentage d’avancement, ou ordre alphabétique.",
      steps: [
        "Dans le menu Tableau, ouvrez Tableau Facturation",
        "Descendez jusqu’au récapitulatif par chantier",
        "Tapez un nom de chantier ou de client dans la barre de recherche",
        "Utilisez les boutons à droite pour trier la liste comme vous le souhaitez",
      ],
      visual: "recherche-facturation",
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
