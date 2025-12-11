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
      {number.toFixed(2)} €
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
      {Math.abs(valeur).toFixed(2)} €
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
 */
export const extractSituationNumber = (numeroSituation) => {
  if (!numeroSituation) return "-";
  const match = numeroSituation.match(/n°(\d+)/);
  return match ? parseInt(match[1]) : numeroSituation;
};

