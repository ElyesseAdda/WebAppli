import { Typography } from "@mui/material";
import React from "react";

/**
 * Formate un nombre avec une couleur selon sa valeur et une valeur de comparaison
 */
export const formatNumberWithColor = (value, compareValue) => {
  const number = parseFloat(value) || 0;
  const compare = parseFloat(compareValue) || 0;
  const isDifferent = Math.abs(number - compare) > 0.01;

  let color = "text.primary"; // noir par défaut
  if (number === 0) {
    color = "text.primary";
  } else if (compareValue === undefined || compareValue === null) {
    color = "rgba(27, 120, 188, 1)";
  } else if (isDifferent) {
    color = "error.main";
  } else {
    color = "rgba(27, 120, 188, 1)";
  }

  // Formater le nombre avec des espaces pour séparer les milliers
  const formattedNumber = Math.abs(number).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <Typography
      sx={{
        color: color,
        fontWeight: 500,
        fontSize: "0.75rem",
        fontFamily: "Roboto, Arial, sans-serif",
        whiteSpace: "nowrap",
      }}
    >
      {formattedNumber} €
    </Typography>
  );
};

/**
 * Formate une date au format DD/MM/YY
 */
export const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const year = date.getFullYear().toString().slice(-2); // 2 derniers chiffres
  return (
    date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: undefined,
    }) +
    "/" +
    year
  );
};

/**
 * Formate un montant avec couleur (vert pour positif, rouge pour négatif)
 */
export const formatMontant = (montant, forceNegative = false, type = null) => {
  const valeur = parseFloat(montant) || 0;
  const isNegatif = forceNegative || valeur < 0 || type === "deduction";
  const couleur = isNegatif ? "error.main" : "rgb(0, 168, 42)";

  // Formater le nombre avec des espaces pour séparer les milliers
  const formattedNumber = Math.abs(valeur).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <Typography
      sx={{
        color: couleur,
        fontFamily: "Roboto, Arial, sans-serif",
        fontWeight: 500,
        fontSize: "0.75rem",
        whiteSpace: "nowrap",
      }}
    >
      {isNegatif ? "-" : ""}
      {formattedNumber} €
    </Typography>
  );
};

/**
 * Obtient le nom du mois en français
 */
export const getMoisName = (mois) => {
  const moisNames = {
    1: "Janvier",
    2: "Février",
    3: "Mars",
    4: "Avril",
    5: "Mai",
    6: "Juin",
    7: "Juillet",
    8: "Août",
    9: "Septembre",
    10: "Octobre",
    11: "Novembre",
    12: "Décembre",
  };
  return moisNames[mois] || mois.toString().padStart(2, "0");
};

/**
 * Extrait le numéro de situation depuis une chaîne
 * Cherche spécifiquement "Situation n°X" dans le numéro original
 * Exemples :
 * - "Facture n°07.2026 - Situation n°01" → 1
 * - "Situation n°5" → 5
 * - "Facture n°07.2026" → "-" (pas de numéro de situation)
 */
export const extractSituationNumber = (numeroSituation) => {
  if (!numeroSituation) return "-";
  
  // Chercher spécifiquement "Situation n°X" dans le numéro
  const matchSituation = numeroSituation.match(/Situation\s*n°\s*(\d+)/i);
  if (matchSituation) {
    return parseInt(matchSituation[1]);
  }
  
  // Si pas de "Situation n°X", chercher le premier "n°X" (fallback)
  const match = numeroSituation.match(/n°\s*(\d+)/i);
  return match ? parseInt(match[1]) : "-";
};

/**
 * Formate un numéro de facture pour n'afficher que la partie principale
 * Enlève toutes les suites (y compris "Situation n°X")
 * Exemples :
 * - "Facture n°01.2026 - Suite 1" → "Facture n°01.2026"
 * - "Facture n°07.2026 - Situation n°01" → "Facture n°07.2026"
 * - "Facture n°123.2026" → "Facture n°123.2026"
 * - "Autre format" → "Autre format" (si le format est différent)
 */
export const formatFactureNumero = (numeroFacture) => {
  if (!numeroFacture) {
    return "-";
  }
  
  // Pattern pour détecter "Facture n°XX.XXXX" ou "Facture n°XXX.XXXX"
  // où XX/XXX est le numéro (2 ou 3 chiffres) et XXXX est l'année (4 chiffres)
  // On enlève tout ce qui suit (y compris "Situation n°X" et autres suites)
  const pattern = /^(Facture\s*n°\d{2,3}\.\d{4})/i;
  const match = numeroFacture.match(pattern);
  
  if (match) {
    // Si le format correspond, retourner seulement la partie principale (sans les suites, y compris Situation)
    const result = match[1];
    return result;
  }
  
  // Si le format ne correspond pas, retourner le numéro original
  return numeroFacture;
};

