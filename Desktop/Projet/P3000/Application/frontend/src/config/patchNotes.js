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

export const PATCH_NOTES_ID = "2026-09-09-v3";

const PATCH_NOTES = {
  id: PATCH_NOTES_ID,
  title: "Quoi de neuf ?",
  date: "Septembre 2026",
  intro: "Voici les nouveautés de cette mise à jour.",
  features: [
    {
      id: "carte-agent",
      kind: "nouveau",
      title: "Carte Agent : contrats et suppression",
      where: "Menu de gauche → Agent & Planning → Carte Agent",
      text: "Sur la fiche de l’agent, vous pouvez ajouter un contrat et supprimer l’agent.",
      steps: [
        "Dans le menu de gauche, ouvrez Agent & Planning, puis cliquez sur Carte Agent",
        "Le bouton « Ajouter » (à côté des contrats) crée un contrat",
        "Le bouton rouge « Supprimer » retire l’agent",
      ],
      visual: "agent-card",
    },
    {
      id: "dates-contrat",
      kind: "ameliore",
      title: "Les agents s’affichent selon leur contrat",
      where: "Planning hebdo, Gestion agent et Tableau de pointage",
      text: "Un agent n’apparaît que si la date affichée est dans son contrat.",
      steps: [
        "Les dates se règlent sur la Carte Agent (menu Agent & Planning → Carte Agent)",
        "Cela s’applique au Planning hebdo, à Gestion agent, et au Tableau de pointage (menu Tableau)",
      ],
      visual: "contrat-dates",
    },
    {
      id: "lignes-masquees",
      kind: "nouveau",
      title: "Masquer une ligne et factures plus justes",
      where: "Menu Tableau → Tableau Fournisseur ou Tableau Sous-Traitant",
      text: "Vous pouvez cacher une ligne. Les factures de ces lignes sont aussi plus fiables.",
      steps: [
        "Ouvrez Tableau Fournisseur ou Tableau Sous-Traitant dans le menu Tableau",
        "Cliquez sur l’œil barré à droite de la ligne pour la masquer",
        "Le bouton « Lignes masquées » en haut du tableau permet de les réafficher",
      ],
      visual: "hide-row",
    },
    {
      id: "gantt",
      kind: "nouveau",
      title: "Planning Gantt",
      where: "Menu de gauche → Agent & Planning → Diagrammes de Gantt",
      text: "Vous pouvez planifier les étapes d’un chantier sur un calendrier visuel.",
      steps: [
        "Dans le menu de gauche, ouvrez Agent & Planning",
        "Cliquez sur Diagrammes de Gantt",
        "Ajoutez une ligne avec une date de début et une date de fin",
      ],
      visual: "gantt",
    },
    {
      id: "sidebar-apps",
      kind: "nouveau",
      title: "Accès aux autres logiciels",
      where: "Menu de gauche → Applications",
      text: "Les boutons pour ouvrir Elekable ou MJR Services sont dans le menu Applications, en bas de la barre à gauche.",
      steps: [
        "Dans la barre de gauche, cliquez sur Applications",
        "Les boutons Elekable et MJR Services s’affichent juste en dessous",
        "Cliquez sur l’un d’eux pour ouvrir le logiciel",
      ],
      visual: "sidebar-apps",
    },
    {
      id: "recap-refuse",
      kind: "ameliore",
      title: "Récap financier à 0 si le devis est refusé",
      where: "Récap Chantier → onglet Récap Financier",
      text: "Si le devis du chantier passe à « Refusé », le récap financier de ce chantier affiche 0.",
      steps: [
        "Ouvrez le chantier (menu Chantier → Récap Chantier)",
        "Passez le devis à Refusé (Documents → Devis, puis Modifier l’état)",
        "L’onglet Récap Financier du chantier affiche alors 0",
      ],
      visual: "recap-zero",
    },
    {
      id: "facture-existante",
      kind: "nouveau",
      title: "Alerte si une facture existe déjà",
      where: "Liste Devis ou Documents du chantier → Devis",
      text: "Si une facture a déjà été créée à partir d’un devis, un message s’affiche avant d’en créer une nouvelle.",
      steps: [
        "Ouvrez la Liste Devis (menu Documents) ou l’onglet Devis d’un chantier",
        "Cliquez sur les trois points, puis sur « Éditer en facture »",
        "Si une facture existe déjà, un message d’alerte s’affiche",
      ],
      visual: "facture-alerte",
    },
    {
      id: "drive-gros-fichiers",
      kind: "ameliore",
      title: "Téléchargement plus rapide dans le Drive",
      where: "Menu de gauche → Drive",
      text: "Pour un gros fichier ou un dossier, une fenêtre de téléchargement s’ouvre. Le téléchargement est plus rapide.",
      steps: [
        "Cliquez sur Drive dans le menu de gauche",
        "Cliquez sur l’icône de téléchargement à droite du fichier ou du dossier",
        "Une fenêtre montre l’avancement du téléchargement",
      ],
      visual: "drive-download",
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
