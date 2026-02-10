/**
 * Palette de couleurs centralisée pour JavaScript/React
 * Client: Elekable
 * 
 * Ce fichier contient toutes les constantes de couleur utilisées dans l'application.
 * Pour changer les couleurs du client, modifiez uniquement ce fichier.
 * 
 * Note: Ces valeurs doivent rester synchronisées avec frontend/static/css/colors.css
 */

// Couleurs principales du client
// ffff00 = logo uniquement, ne plus utiliser dans l'app
// 001514 = prédominante (texte, primaire)
// 46acc2 = chargement, barres de progression, états "en attente"
// fcfcfc = texte sur fond noir
// f15152 = erreur
export const COLORS = {
  // Primaire (couleur prédominante, texte)
  primary: '#001514',
  primaryDark: '#000d0c',
  primaryLight: '#002a28',
  primaryRgb: '0, 21, 20',

  // Progression / chargement (barres, états en attente)
  progress: '#46acc2',
  progressDark: '#3a8fa5',
  progressLight: '#6bbdd4',
  progressRgb: '70, 172, 194',

  // Texte sur fond noir
  textOnDark: '#fcfcfc',
  textOnDarkRgb: '252, 252, 252',

  // Secondaire
  secondary: '#CAC4CE',
  secondaryDark: '#B5AEB9',
  secondaryLight: '#DDD9DF',
  secondaryRgb: '202, 196, 206',

  // Accent
  accent: '#46acc2',
  accentDark: '#3a8fa5',
  accentLight: '#6bbdd4',
  accentRgb: '70, 172, 194',

  // Sémantiques
  success: '#4CAF50',
  successDark: '#2e7d32',
  successLight: '#81c784',
  successRgb: '76, 175, 80',

  error: '#f15152',
  errorDark: '#d94546',
  errorLight: '#f37374',
  errorRgb: '241, 81, 82',

  warning: '#46acc2',
  warningDark: '#3a8fa5',
  warningLight: '#6bbdd4',
  warningRgb: '70, 172, 194',

  info: '#46acc2',
  infoDark: '#3a8fa5',
  infoLight: '#6bbdd4',
  infoRgb: '70, 172, 194',

  // Neutres (texte = prédominant #001514)
  text: '#001514',
  textMuted: '#333333',
  textLight: '#666666',

  border: '#dee2e6',
  borderLight: '#e5e7eb',
  borderDark: '#001514',

  background: '#ffffff',
  backgroundAlt: '#f8f9fa',
  backgroundHover: '#f3f4f6',
  backgroundDark: '#e9ecef',

  // Blanc et noir
  white: '#ffffff',
  black: '#000000',

  // Boutons d'action (couleurs d'origine conservées)
  actionButtonInfo: '#1976d2',
  actionButtonInfoHover: '#1565c0',
  actionButtonSuccess: '#2e7d32',
  actionButtonSuccessHover: '#1b5e20',
  actionButtonWarning: '#FF9800',
  actionButtonWarningHover: '#ef6c00',
  actionButtonDark: '#333333',
  actionButtonAccent: '#E53D00',
  actionButtonAccentHover: '#CC3600',
};

// Couleurs pour les graphiques (charts)
export const CHART_COLORS = {
  mainOeuvre: COLORS.info,
  materiel: COLORS.warning,
  sousTraitant: COLORS.success,
  tauxFixe: '#9C27B0',
  margePositive: COLORS.success,
  margeNegative: COLORS.error,
  // Couleurs additionnelles pour graphiques
  purple: '#8884d8',
  green: '#43A047',
  lightBlue: '#1565c0',
};

// Palette pour les plannings et calendriers (20 couleurs)
export const PLANNING_PALETTE = [
  COLORS.primary,
  COLORS.accent,
  '#e57373',
  '#81c784',
  '#ffd54f',
  '#ba68c8',
  '#4dd0e1',
  '#ff8a65',
  '#a1887f',
  '#90a4ae',
  '#f48fb1',
  '#80deea',
  '#c5e1a5',
  '#ffe082',
  '#ce93d8',
  '#80cbc4',
  '#ffcc80',
  '#b0bec5',
  '#ef9a9a',
  '#a5d6a7',
];

// Couleurs de statut
export const STATUS_COLORS = {
  en_attente: COLORS.warning,
  valide: COLORS.success,
  refuse: COLORS.error,
  en_cours: COLORS.info,
  termine: COLORS.success,
  annule: COLORS.textMuted,
};

// Helper pour créer des couleurs avec opacité
export const withOpacity = (color, opacity) => {
  // Si c'est une couleur RGB
  if (color.includes(',')) {
    return `rgba(${color}, ${opacity})`;
  }
  // Si c'est un hex
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

export default COLORS;
