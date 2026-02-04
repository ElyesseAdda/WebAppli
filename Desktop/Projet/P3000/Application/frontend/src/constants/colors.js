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
export const COLORS = {
  // Primaire
  primary: '#40798C',
  primaryDark: '#2D5563',
  primaryLight: '#6A9FB5',
  primaryRgb: '64, 121, 140',
  
  // Secondaire
  secondary: '#CAC4CE',
  secondaryDark: '#B5AEB9',
  secondaryLight: '#DDD9DF',
  secondaryRgb: '202, 196, 206',
  
  // Accent
  accent: '#E53D00',
  accentDark: '#CC3600',
  accentLight: '#FF5722',
  accentRgb: '229, 61, 0',
  
  // Sémantiques
  success: '#4CAF50',
  successDark: '#2e7d32',
  successLight: '#81c784',
  successRgb: '76, 175, 80',
  
  error: '#d32f2f',
  errorDark: '#c62828',
  errorLight: '#ef5350',
  errorRgb: '211, 47, 47',
  
  warning: '#FF9800',
  warningDark: '#ef6c00',
  warningLight: '#ffb74d',
  warningRgb: '255, 152, 0',
  
  info: '#2196F3',
  infoDark: '#1976d2',
  infoLight: '#64b5f6',
  infoRgb: '33, 150, 243',
  
  // Neutres
  text: '#333333',
  textMuted: '#666666',
  textLight: '#999999',
  
  border: '#dee2e6',
  borderLight: '#e5e7eb',
  borderDark: '#ccc',
  
  background: '#ffffff',
  backgroundAlt: '#f8f9fa',
  backgroundHover: '#f3f4f6',
  backgroundDark: '#e9ecef',
  
  // Blanc et noir
  white: '#ffffff',
  black: '#000000',
};

// Couleurs pour les graphiques (charts)
export const CHART_COLORS = {
  mainOeuvre: COLORS.info,
  materiel: COLORS.warning,
  sousTraitant: COLORS.success,
  tauxFixe: '#9C27B0',
  margePositive: COLORS.success,
  margeNegative: COLORS.error,
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
