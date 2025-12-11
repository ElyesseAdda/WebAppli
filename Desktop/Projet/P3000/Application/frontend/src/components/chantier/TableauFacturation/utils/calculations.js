import { extractSituationNumber, formatMontant } from "./formatters";
import React from "react";

/**
 * Calcule l'écart entre le montant reçu et le montant de la situation
 */
export const calculerEcartMois = (situation) => {
  const montantHTSituation =
    parseFloat(situation.montant_apres_retenues) || 0;
  const montantRecuHT = parseFloat(situation.montant_reel_ht) || 0;
  const ecart = montantRecuHT - montantHTSituation;

  if (ecart === 0 || isNaN(ecart)) return "-";

  return formatMontant(ecart);
};

/**
 * Calcule la date de paiement prévue à partir de la date d'envoi et du délai
 */
export const calculateDatePaiement = (dateEnvoi, delai, formatDateFn) => {
  if (!dateEnvoi || !delai) return "-";

  try {
    const date = new Date(dateEnvoi);
    if (isNaN(date.getTime())) return "-";

    date.setDate(date.getDate() + parseInt(delai));
    return formatDateFn(date);
  } catch (error) {
    console.error("Erreur dans le calcul de la date de paiement:", error);
    return "-";
  }
};

/**
 * Calcule le retard en jours entre la date prévue et la date réelle
 */
export const calculateRetard = (datePrevue, dateReelle, formatDateFn) => {
  if (!datePrevue || !dateReelle || datePrevue === "-") {
    return "-";
  }

  try {
    // Convertir les dates en objets Date
    let datePrevueObj, dateReelleObj;

    // Traiter la date prévue (format DD/MM/YY)
    if (datePrevue.includes("/")) {
      const [jour, mois, annee] = datePrevue.split("/");
      const anneeComplete = annee.length === 2 ? `20${annee}` : annee;
      datePrevueObj = new Date(anneeComplete, mois - 1, jour);
    } else {
      datePrevueObj = new Date(datePrevue);
    }

    // Traiter la date réelle (format YYYY-MM-DD)
    dateReelleObj = new Date(dateReelle);

    // Vérifier que les dates sont valides
    if (isNaN(datePrevueObj.getTime()) || isNaN(dateReelleObj.getTime())) {
      return "-";
    }

    // Calculer la différence en millisecondes
    const differenceMs = dateReelleObj.getTime() - datePrevueObj.getTime();

    // Convertir en jours
    const differenceJours = Math.ceil(differenceMs / (1000 * 60 * 60 * 24));

    if (differenceJours > 0) {
      return `${differenceJours} jours de retard`;
    } else if (differenceJours < 0) {
      return `${Math.abs(differenceJours)} jours d'avance`;
    } else {
      return "À jour";
    }
  } catch (error) {
    console.error("Erreur dans le calcul du retard:", error);
    return "-";
  }
};

/**
 * Calcule les cumuls pour toutes les situations par chantier
 */
export const calculateCumulsBySituationId = (allSituations, extractSituationNumberFn) => {
  const cumulsMap = new Map();
  const chantiersMap = new Map();

  // Grouper les situations par chantier
  allSituations.forEach((situation) => {
    if (!chantiersMap.has(situation.chantier_id)) {
      chantiersMap.set(situation.chantier_id, []);
    }
    chantiersMap.get(situation.chantier_id).push(situation);
  });

  // Calculer les cumuls pour chaque chantier
  chantiersMap.forEach((situations, chantierId) => {
    // Trier les situations par mois/année puis par numéro
    const situationsTriees = [...situations].sort((a, b) => {
      if (a.annee !== b.annee) return a.annee - b.annee;
      if (a.mois !== b.mois) return a.mois - b.mois;
      const numA = extractSituationNumberFn(a.numero_situation);
      const numB = extractSituationNumberFn(b.numero_situation);
      return numA - numB;
    });

    // Calculer le cumul pour chaque situation
    let cumul = 0;
    situationsTriees.forEach((situation) => {
      cumul += parseFloat(situation.montant_apres_retenues) || 0;
      cumulsMap.set(situation.id, cumul);
    });
  });

  return cumulsMap;
};

/**
 * Trie les situations selon les critères de la vue globale
 */
export const sortSituations = (situations, extractSituationNumberFn) => {
  return [...situations].sort((a, b) => {
    // Trier par chantier, puis par mois, puis par numéro de situation
    if (a.chantier_name !== b.chantier_name) {
      return a.chantier_name.localeCompare(b.chantier_name);
    }
    if (a.mois !== b.mois) {
      return a.mois - b.mois;
    }
    const numA = extractSituationNumberFn(a.numero_situation);
    const numB = extractSituationNumberFn(b.numero_situation);
    return numA - numB;
  });
};

/**
 * Calcule les totaux globaux
 */
export const calculateTotaux = (allSituations) => {
  return allSituations.reduce(
    (acc, situation) => {
      return {
        montantHTSituation:
          acc.montantHTSituation +
          (parseFloat(situation.montant_apres_retenues) || 0),
        montantRecuHT:
          acc.montantRecuHT + (parseFloat(situation.montant_reel_ht) || 0),
        ecartMois:
          acc.ecartMois +
          (parseFloat(situation.montant_reel_ht || 0) -
            parseFloat(situation.montant_apres_retenues || 0)),
      };
    },
    {
      montantHTSituation: 0,
      montantRecuHT: 0,
      ecartMois: 0,
    }
  );
};

/**
 * Groupe les situations par mois et ajoute les sous-totaux
 */
export const groupSituationsByMonth = (situationsTriees) => {
  const moisAvecSituations = {};

  // Grouper les situations par mois
  situationsTriees.forEach((situation) => {
    const mois = situation.mois;
    if (!moisAvecSituations[mois]) {
      moisAvecSituations[mois] = [];
    }
    moisAvecSituations[mois].push(situation);
  });

  // Trier les mois
  const moisTries = Object.keys(moisAvecSituations).sort(
    (a, b) => parseInt(a) - parseInt(b)
  );

  // Créer une liste avec les situations et les sous-totaux
  const situationsAvecSousTotaux = [];
  moisTries.forEach((mois) => {
    const situationsDuMois = moisAvecSituations[mois];
    situationsAvecSousTotaux.push(...situationsDuMois);

    // Ajouter une ligne de sous-total après chaque mois
    const sousTotalMois = situationsDuMois.reduce((total, situation) => {
      return total + (parseFloat(situation.montant_apres_retenues) || 0);
    }, 0);

    situationsAvecSousTotaux.push({
      isSousTotal: true,
      mois: parseInt(mois),
      sousTotal: sousTotalMois,
    });
  });

  return situationsAvecSousTotaux;
};

