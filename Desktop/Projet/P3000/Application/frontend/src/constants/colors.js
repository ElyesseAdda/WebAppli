/**
 * Palette de couleurs centralisée pour l'application.
 * Utilisée notamment par les composants Rapport d'intervention / Vigik+.
 */

export const COLORS = {
  // Couleurs principales
  primary: "#283747",
  primaryDark: "#1c2834",
  primaryLight: "#3b4a5c",

  // Accent (turquoise)
  accent: "#46acc2",
  accentDark: "#2f8a9f",
  accentLight: "#e1f3f7",

  // Succès (vert)
  success: "#2e7d32",
  successDark: "#1b5e20",
  successLight: "#e8f5e9",

  // Erreur (rouge)
  error: "#c62828",
  errorDark: "#8e0000",
  errorLight: "#ffebee",
  errorRgb: "198, 40, 40",

  // Info (bleu)
  info: "#1976d2",
  infoDark: "#1565c0",
  infoLight: "#e3f2fd",

  // Avertissement (orange)
  warning: "#ed6c02",
  warningDark: "#b25400",
  warningLight: "#fff4e5",

  // Textes
  textOnDark: "#ffffff",
  textPrimary: "#212121",
  textMuted: "#6b7280",
  textLight: "#9ca3af",

  // Fonds
  background: "#ffffff",
  backgroundAlt: "#f8f9fa",
  backgroundDark: "#f1f3f5",

  // Bordures
  border: "#e0e0e0",
  borderDark: "#bdbdbd",
  borderLight: "#eeeeee",
};

/**
 * Couleurs spécifiques aux graphes de coûts (DevisCostPieChart, etc.)
 */
export const DEVIS_COST_COLORS = {
  mainOeuvre: "#1976d2",
  materiel: "#ed6c02",
  tauxFixe: "#9c27b0",
  margePositive: "#2e7d32",
  margeNegative: "#c62828",
};

/**
 * Palette pour différencier des séries (ex. comparateur fournisseurs).
 */
export const FOURNISSEUR_COLORS = [
  "#1976d2",
  "#2e7d32",
  "#ed6c02",
  "#9c27b0",
  "#0097a7",
  "#c62828",
  "#6a1b9a",
  "#558b2f",
];

export default COLORS;
