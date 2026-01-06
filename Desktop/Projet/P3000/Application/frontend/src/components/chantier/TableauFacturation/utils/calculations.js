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
export const calculateTotaux = (allSituations, allFactures = []) => {
  const totauxSituations = allSituations.reduce(
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

  // Ajouter les factures aux totaux
  const totauxFactures = allFactures.reduce(
    (acc, facture) => {
      const priceHt = parseFloat(facture.price_ht) || 0;
      const montantRecu = facture.state_facture === 'Payée' ? priceHt : 0;
      return {
        montantHTSituation: acc.montantHTSituation + priceHt,
        montantRecuHT: acc.montantRecuHT + montantRecu,
        ecartMois: acc.ecartMois + (montantRecu - priceHt),
      };
    },
    {
      montantHTSituation: 0,
      montantRecuHT: 0,
      ecartMois: 0,
    }
  );

  return {
    montantHTSituation: totauxSituations.montantHTSituation + totauxFactures.montantHTSituation,
    montantRecuHT: totauxSituations.montantRecuHT + totauxFactures.montantRecuHT,
    ecartMois: totauxSituations.ecartMois + totauxFactures.ecartMois,
  };
};

/**
 * Groupe les situations et factures par mois et ajoute les sous-totaux
 */
export const groupSituationsByMonth = (situationsTriees, facturesTriees = []) => {
  const moisAvecItems = {};

  // Grouper les situations par mois
  situationsTriees.forEach((situation) => {
    const mois = situation.mois;
    if (!moisAvecItems[mois]) {
      moisAvecItems[mois] = { situations: [], factures: [] };
    }
    moisAvecItems[mois].situations.push(situation);
  });

  // Grouper les factures par mois (utiliser date_creation pour les factures)
  facturesTriees.forEach((facture) => {
    let mois;
    if (facture.date_creation) {
      const date = new Date(facture.date_creation);
      mois = date.getMonth() + 1;
    } else {
      return; // Ignorer les factures sans date
    }
    
    if (!moisAvecItems[mois]) {
      moisAvecItems[mois] = { situations: [], factures: [] };
    }
    moisAvecItems[mois].factures.push(facture);
  });

  // Trier les mois
  const moisTries = Object.keys(moisAvecItems).sort(
    (a, b) => parseInt(a) - parseInt(b)
  );

  // Créer une liste avec les situations, factures et les sous-totaux
  const itemsAvecSousTotaux = [];
  moisTries.forEach((mois) => {
    const { situations, factures } = moisAvecItems[mois];
    
    // Ajouter les situations du mois
    itemsAvecSousTotaux.push(...situations);
    
    // Ajouter les factures du mois
    itemsAvecSousTotaux.push(...factures);

    // Ajouter une ligne de sous-total après chaque mois
    const sousTotalSituations = situations.reduce((total, situation) => {
      return total + (parseFloat(situation.montant_apres_retenues) || 0);
    }, 0);
    
    const sousTotalFactures = factures.reduce((total, facture) => {
      return total + (parseFloat(facture.price_ht) || 0);
    }, 0);

    const sousTotalMois = sousTotalSituations + sousTotalFactures;

    itemsAvecSousTotaux.push({
      isSousTotal: true,
      mois: parseInt(mois),
      sousTotal: sousTotalMois,
    });
  });

  return itemsAvecSousTotaux;
};

