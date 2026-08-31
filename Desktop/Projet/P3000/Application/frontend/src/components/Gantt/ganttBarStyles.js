/**
 * Styles visuels des barres Gantt.
 * Doit rester aligné avec ``_style_barre_css`` dans ``api/views_gantt.py`` (PDF).
 */

export const STYLES_BARRE = [
  { id: "plein", label: "Plein" },
  { id: "leger", label: "Léger" },
  { id: "degrade", label: "Dégradé" },
  { id: "hachure", label: "Hachuré" },
  { id: "hachure_croise", label: "Hachure croisée" },
  { id: "rayures_v", label: "Rayures vert." },
  { id: "rayures_h", label: "Rayures hor." },
  { id: "damier", label: "Damier" },
  { id: "contour", label: "Contour" },
  { id: "contour_epais", label: "Contour épais" },
  { id: "double", label: "Double contour" },
  { id: "pointille", label: "Pointillé" },
  { id: "tirets", label: "Tirets" },
  { id: "arrondi", label: "Arrondi" },
  { id: "ombre", label: "Ombre" },
  { id: "bord_gauche", label: "Bord gauche" },
  { id: "bord_haut", label: "Bord haut" },
  { id: "croix", label: "Croisillons" },
];

function hexToRgba(hex, alpha) {
  if (!hex || !hex.startsWith("#") || hex.length < 7) {
    return `rgba(25, 118, 210, ${alpha})`;
  }
  const h = hex.slice(1);
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const rayon = (styleBarre, estTitre) => {
  if (styleBarre === "arrondi") return "999px";
  return estTitre ? "2px" : "3px";
};

const opaciteTitre = (estTitre, plein = false) => {
  if (!estTitre) return 1;
  return plein ? 0.55 : 0.75;
};

/** Styles MUI ``sx`` pour une barre. */
export function sxBarreGantt(couleur, styleBarre = "plein", estTitre = false) {
  const c = couleur || "#1976d2";
  const borderRadius = rayon(styleBarre, estTitre);
  const clair = hexToRgba(c, 0.35);
  const tresClair = hexToRgba(c, 0.18);

  switch (styleBarre) {
    case "leger":
      return {
        backgroundColor: hexToRgba(c, 0.35),
        borderRadius,
        opacity: opaciteTitre(estTitre, true),
      };
    case "degrade":
      return {
        background: `linear-gradient(180deg, ${hexToRgba(c, 0.55)} 0%, ${c} 100%)`,
        borderRadius,
        opacity: opaciteTitre(estTitre, true),
      };
    case "hachure":
      return {
        backgroundColor: c,
        backgroundImage: `repeating-linear-gradient(-45deg, ${c}, ${c} 4px, rgba(255,255,255,0.38) 4px, rgba(255,255,255,0.38) 8px)`,
        borderRadius,
        opacity: opaciteTitre(estTitre),
      };
    case "hachure_croise":
      return {
        backgroundColor: c,
        backgroundImage: [
          `repeating-linear-gradient(-45deg, ${c}, ${c} 3px, rgba(255,255,255,0.35) 3px, rgba(255,255,255,0.35) 6px)`,
          `repeating-linear-gradient(45deg, ${c}, ${c} 3px, rgba(255,255,255,0.2) 3px, rgba(255,255,255,0.2) 6px)`,
        ].join(", "),
        borderRadius,
        opacity: opaciteTitre(estTitre),
      };
    case "rayures_v":
      return {
        backgroundColor: c,
        backgroundImage: `repeating-linear-gradient(90deg, ${c}, ${c} 5px, rgba(255,255,255,0.35) 5px, rgba(255,255,255,0.35) 10px)`,
        borderRadius,
        opacity: opaciteTitre(estTitre),
      };
    case "rayures_h":
      return {
        backgroundColor: c,
        backgroundImage: `repeating-linear-gradient(0deg, ${c}, ${c} 4px, rgba(255,255,255,0.35) 4px, rgba(255,255,255,0.35) 8px)`,
        borderRadius,
        opacity: opaciteTitre(estTitre),
      };
    case "damier":
      return {
        backgroundColor: clair,
        backgroundImage: [
          `linear-gradient(45deg, ${c} 25%, transparent 25%)`,
          `linear-gradient(-45deg, ${c} 25%, transparent 25%)`,
          `linear-gradient(45deg, transparent 75%, ${c} 75%)`,
          `linear-gradient(-45deg, transparent 75%, ${c} 75%)`,
        ].join(", "),
        backgroundSize: "8px 8px",
        backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0",
        borderRadius,
        opacity: opaciteTitre(estTitre),
      };
    case "contour":
      return {
        backgroundColor: "transparent",
        border: `2px solid ${c}`,
        borderRadius,
        opacity: 1,
      };
    case "contour_epais":
      return {
        backgroundColor: tresClair,
        border: `3px solid ${c}`,
        borderRadius,
        opacity: 1,
      };
    case "double":
      return {
        backgroundColor: tresClair,
        border: `2px solid ${c}`,
        borderRadius,
        boxShadow: `inset 0 0 0 1px ${c}`,
        opacity: 1,
      };
    case "pointille":
      return {
        backgroundColor: hexToRgba(c, 0.25),
        border: `2px dashed ${c}`,
        borderRadius,
        opacity: 1,
      };
    case "tirets":
      return {
        backgroundColor: "transparent",
        border: `2px dotted ${c}`,
        borderRadius,
        opacity: 1,
      };
    case "arrondi":
      return {
        backgroundColor: c,
        borderRadius,
        opacity: opaciteTitre(estTitre, true),
      };
    case "ombre":
      return {
        backgroundColor: c,
        borderRadius,
        boxShadow: `0 2px 4px ${hexToRgba(c, 0.55)}`,
        opacity: opaciteTitre(estTitre, true),
      };
    case "bord_gauche":
      return {
        backgroundColor: hexToRgba(c, 0.2),
        borderLeft: `5px solid ${c}`,
        borderRadius,
        opacity: 1,
      };
    case "bord_haut":
      return {
        backgroundColor: hexToRgba(c, 0.15),
        borderTop: `4px solid ${c}`,
        borderRadius,
        opacity: 1,
      };
    case "croix":
      return {
        backgroundColor: hexToRgba(c, 0.2),
        backgroundImage: [
          `repeating-linear-gradient(45deg, ${hexToRgba(c, 0.55)} 0, ${hexToRgba(c, 0.55)} 1px, transparent 1px, transparent 6px)`,
          `repeating-linear-gradient(-45deg, ${hexToRgba(c, 0.55)} 0, ${hexToRgba(c, 0.55)} 1px, transparent 1px, transparent 6px)`,
        ].join(", "),
        border: `1px solid ${c}`,
        borderRadius,
        opacity: 1,
      };
    default:
      return {
        backgroundColor: c,
        borderRadius,
        opacity: opaciteTitre(estTitre, true),
      };
  }
}

/** Aperçu miniature dans le sélecteur de style. */
export function sxApercuStyle(styleBarre, couleur = "#1976d2") {
  return {
    width: 52,
    height: 16,
    ...sxBarreGantt(couleur, styleBarre, false),
  };
}
