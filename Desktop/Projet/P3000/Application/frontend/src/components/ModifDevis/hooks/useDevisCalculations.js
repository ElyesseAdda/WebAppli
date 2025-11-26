/**
 * Hook personnalisé pour tous les calculs liés au devis
 * (prix, totaux, TVA, marges, etc.)
 */
import { useMemo, useCallback } from 'react';

/**
 * Hook pour les calculs du devis
 * @param {Array} devisItems - Items du devis
 * @param {number} tvaRate - Taux de TVA (par défaut 20%)
 * @returns {Object} Fonctions et valeurs calculées
 */
export const useDevisCalculations = (devisItems = [], tvaRate = 20) => {
  
  /**
   * Calcule le prix d'une ligne de détail
   */
  const calculatePrice = useCallback((ligne) => {
    // Si un prix_devis existe (prix personnalisé pour ce devis), l'utiliser
    if (ligne.prix_devis !== null && ligne.prix_devis !== undefined) {
      return parseFloat(ligne.prix_devis);
    }
    
    const cout_main_oeuvre = parseFloat(ligne.cout_main_oeuvre) || 0;
    const cout_materiel = parseFloat(ligne.cout_materiel) || 0;
    
    // Si pas de coûts, utiliser le prix de base (prix manuel ou prix du catalogue)
    if (cout_main_oeuvre === 0 && cout_materiel === 0) {
      return parseFloat(ligne.prix) || 0;
    }
    
    // Sinon, calculer avec les coûts
    const marge = ligne.marge_devis !== null && ligne.marge_devis !== undefined 
      ? parseFloat(ligne.marge_devis)
      : parseFloat(ligne.marge) || 0;
    
    const taux_fixe = parseFloat(ligne.taux_fixe) || 0;
    
    const base = cout_main_oeuvre + cout_materiel;
    const montant_taux_fixe = base * (taux_fixe / 100);
    const sous_total = base + montant_taux_fixe;
    const montant_marge = sous_total * (marge / 100);
    const prix = sous_total + montant_marge;
    
    return prix;
  }, []);

  /**
   * Calcule les bases brutes (sans lignes spéciales) pour les calculs de pourcentages
   */
  const calculerBasesBrutes = useCallback(() => {
    const bases = {
      sousParties: {},
      parties: {},
      global: 0
    };
    
    // 1. Calculer les bases des sous-parties (somme des lignes de détail)
    devisItems
      .filter(item => item.type === 'sous_partie')
      .forEach(sp => {
        const totalLignes = devisItems
          .filter(item => item.type === 'ligne_detail' && item.sous_partie_id === sp.id)
          .reduce((sum, ligne) => {
            const prix = calculatePrice(ligne);
            return sum + (prix * (ligne.quantity || 0));
          }, 0);
        
        bases.sousParties[sp.id] = totalLignes;
      });
    
    // 2. Calculer les bases des parties (somme des bases des sous-parties)
    devisItems
      .filter(item => item.type === 'partie')
      .forEach(partie => {
        const totalSPs = devisItems
          .filter(item => item.type === 'sous_partie' && item.partie_id === partie.id)
          .reduce((sum, sp) => sum + (bases.sousParties[sp.id] || 0), 0);
        
        bases.parties[partie.id] = totalSPs;
      });
    
    // 3. Calculer la base globale (somme des bases des parties)
    bases.global = devisItems
      .filter(item => item.type === 'partie')
      .reduce((sum, partie) => sum + (bases.parties[partie.id] || 0), 0);
    
    return bases;
  }, [devisItems, calculatePrice]);

  /**
   * Calcule le montant d'une ligne spéciale
   */
  const calculerMontantLigneSpeciale = useCallback((ligneSpeciale, bases, excludeLineId = null) => {
    const value = parseFloat(ligneSpeciale.value || 0);
    
    // Si montant fixe, retourner directement
    if (ligneSpeciale.value_type === 'fixed') {
      return value;
    }
    
    // Si pourcentage, utiliser baseCalculation
    if (ligneSpeciale.value_type === 'percentage' && ligneSpeciale.baseCalculation) {
      const baseCalc = ligneSpeciale.baseCalculation;
      let base = 0;
      
      // Récupérer la base selon le type
      if (baseCalc.type === 'sous_partie' && baseCalc.id) {
        base = bases.sousParties[baseCalc.id] || 0;
      } else if (baseCalc.type === 'partie' && baseCalc.id) {
        base = bases.parties[baseCalc.id] || 0;
      } else if (baseCalc.type === 'global') {
        base = bases.global || 0;
      }
      
      return base * (value / 100);
    }
    
    return 0;
  }, []);

  /**
   * Calcule le total d'une sous-partie (avec lignes spéciales)
   */
  const calculateSousPartieTotal = useCallback((sousPartie, basesOverride = null) => {
    const bases = basesOverride || calculerBasesBrutes();
    
    // Base : somme des lignes de détail
    let total = devisItems
      .filter(item => item.type === 'ligne_detail' && item.sous_partie_id === sousPartie.id)
      .reduce((sum, ligne) => {
        const prix = calculatePrice(ligne);
        return sum + (prix * (ligne.quantity || 0));
      }, 0);
    
    // Récupérer les lignes spéciales de cette sous-partie, triées par index_global
    const lignesSpeciales = devisItems
      .filter(item => 
        item.type === 'ligne_speciale' && 
        item.context_type === 'sous_partie' && 
        item.context_id === sousPartie.id
      )
      .sort((a, b) => a.index_global - b.index_global);
    
    // Appliquer les lignes spéciales séquentiellement
    lignesSpeciales.forEach(ls => {
      const montant = calculerMontantLigneSpeciale(ls, bases);
      
      if (ls.type_speciale === 'reduction') {
        total -= montant;
      } else if (ls.type_speciale === 'addition') {
        total += montant;
      }
    });
    
    return total;
  }, [devisItems, calculatePrice, calculerBasesBrutes, calculerMontantLigneSpeciale]);

  /**
   * Calcule le total d'une partie (avec lignes spéciales)
   */
  const calculatePartieTotal = useCallback((partie, basesOverride = null) => {
    const bases = basesOverride || calculerBasesBrutes();
    
    // Base : somme des sous-parties (avec leurs lignes spéciales déjà incluses)
    let total = devisItems
      .filter(item => item.type === 'sous_partie' && item.partie_id === partie.id)
      .reduce((sum, sp) => sum + calculateSousPartieTotal(sp, bases), 0);
    
    // Récupérer les lignes spéciales de cette partie, triées par index_global
    const lignesSpeciales = devisItems
      .filter(item => 
        item.type === 'ligne_speciale' && 
        item.context_type === 'partie' && 
        item.context_id === partie.id
      )
      .sort((a, b) => a.index_global - b.index_global);
    
    // Appliquer les lignes spéciales séquentiellement
    lignesSpeciales.forEach(ls => {
      const montant = calculerMontantLigneSpeciale(ls, bases);
      
      if (ls.type_speciale === 'reduction') {
        total -= montant;
      } else if (ls.type_speciale === 'addition') {
        total += montant;
      }
    });
    
    return total;
  }, [devisItems, calculateSousPartieTotal, calculerBasesBrutes, calculerMontantLigneSpeciale]);

  /**
   * Calcule le total global HT (sans une ligne spécifique si nécessaire)
   */
  const calculateGlobalTotalExcludingLine = useCallback((excludeLineId = null) => {
    const bases = calculerBasesBrutes();
    
    // Base : somme des parties (avec leurs lignes spéciales déjà incluses)
    let total = devisItems
      .filter(item => item.type === 'partie')
      .reduce((sum, partie) => sum + calculatePartieTotal(partie), 0);
    
    // Récupérer les lignes spéciales globales, triées par index_global, en excluant celle spécifiée
    const lignesSpeciales = devisItems
      .filter(item => 
        item.type === 'ligne_speciale' && 
        item.context_type === 'global' &&
        item.id !== excludeLineId
      )
      .sort((a, b) => a.index_global - b.index_global);
    
    // Appliquer les lignes spéciales séquentiellement
    lignesSpeciales.forEach(ls => {
      const montant = calculerMontantLigneSpeciale(ls, bases, excludeLineId);
      
      if (ls.type_speciale === 'reduction') {
        total -= montant;
      } else if (ls.type_speciale === 'addition') {
        total += montant;
      }
    });
    
    return total;
  }, [devisItems, calculatePartieTotal, calculerBasesBrutes, calculerMontantLigneSpeciale]);

  /**
   * Calcule le total global HT
   */
  const calculateGlobalTotal = useCallback(() => {
    return calculateGlobalTotalExcludingLine(null);
  }, [calculateGlobalTotalExcludingLine]);

  /**
   * Calcule le montant de la ligne récurrente (total jusqu'à cette ligne)
   */
  const calculateRecurringLineAmount = useCallback((lineOrId) => {
    const targetId = typeof lineOrId === 'object' ? lineOrId.id : lineOrId;
    if (!targetId) return 0;
    
    const targetLine = devisItems.find(item => item.id === targetId);
    if (!targetLine || targetLine.index_global === undefined) return 0;
    
    const sortedItems = [...devisItems].sort((a, b) => a.index_global - b.index_global);
    const bases = calculerBasesBrutes();
    
    let runningTotal = 0;
    
    for (const item of sortedItems) {
      if (item.index_global >= targetLine.index_global) break;
      
      if (item.type === 'partie') {
        runningTotal += calculatePartieTotal(item, bases);
      } else if (item.type === 'ligne_speciale' && item.context_type === 'global') {
        const amount = calculerMontantLigneSpeciale(item, bases, targetLine.id);
        if (item.type_speciale === 'addition') {
          runningTotal += amount;
        } else if (item.type_speciale === 'reduction') {
          runningTotal -= amount;
        }
      }
    }
    
    return runningTotal;
  }, [devisItems, calculatePartieTotal, calculerBasesBrutes, calculerMontantLigneSpeciale]);

  // Valeurs calculées mémorisées
  const totalHt = useMemo(() => calculateGlobalTotal(), [calculateGlobalTotal]);
  const tva = useMemo(() => totalHt * (tvaRate / 100), [totalHt, tvaRate]);
  const totalTtc = useMemo(() => totalHt + tva, [totalHt, tva]);

  /**
   * Calcule les totaux estimés (main d'œuvre, matériel, marge)
   */
  const estimatedTotals = useMemo(() => {
    let totals = {
      cout_estime_main_oeuvre: 0,
      cout_estime_materiel: 0,
      cout_avec_taux_fixe: 0,
      marge_estimee: 0,
    };

    const lignesDetails = devisItems.filter(item => item.type === 'ligne_detail');
    
    lignesDetails.forEach(ligne => {
      const quantity = parseFloat(ligne.quantity || 0);
      const cout_main_oeuvre = parseFloat(ligne.cout_main_oeuvre || 0);
      const cout_materiel = parseFloat(ligne.cout_materiel || 0);

      totals.cout_estime_main_oeuvre += cout_main_oeuvre * quantity;
      totals.cout_estime_materiel += cout_materiel * quantity;
    });

    const coutsDirects = totals.cout_estime_main_oeuvre + totals.cout_estime_materiel;

    let totalTauxFixe = 0;
    let totalQuantite = 0;
    
    lignesDetails.forEach(ligne => {
      const quantity = parseFloat(ligne.quantity || 0);
      const tauxPersonnalise = parseFloat(ligne.taux_fixe || 20);
      totalTauxFixe += tauxPersonnalise * quantity;
      totalQuantite += quantity;
    });

    const tauxFixeMoyen = totalQuantite > 0 ? totalTauxFixe / totalQuantite : 20;
    const montantTauxFixe = coutsDirects * (tauxFixeMoyen / 100);
    totals.cout_avec_taux_fixe = coutsDirects + montantTauxFixe;
    totals.marge_estimee = totalHt - totals.cout_avec_taux_fixe;

    // Arrondir
    totals.cout_estime_main_oeuvre = parseFloat(totals.cout_estime_main_oeuvre.toFixed(2));
    totals.cout_estime_materiel = parseFloat(totals.cout_estime_materiel.toFixed(2));
    totals.cout_avec_taux_fixe = parseFloat(totals.cout_avec_taux_fixe.toFixed(2));
    totals.marge_estimee = parseFloat(totals.marge_estimee.toFixed(2));

    return totals;
  }, [devisItems, totalHt]);

  /**
   * Vérifie si une ligne récurrente existe
   */
  const hasRecurringLine = useMemo(() => {
    return devisItems.some(item => 
      item.type === 'ligne_speciale' &&
      (item.isRecurringSpecial || item.description === 'Montant global HT des prestations unitaires')
    );
  }, [devisItems]);

  /**
   * Formate un montant avec espaces pour les milliers
   */
  const formatMontantEspace = useCallback((montant) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(montant).replace(/,/g, '.');
  }, []);

  return {
    // Fonctions de calcul
    calculatePrice,
    calculerBasesBrutes,
    calculerMontantLigneSpeciale,
    calculateSousPartieTotal,
    calculatePartieTotal,
    calculateGlobalTotal,
    calculateGlobalTotalExcludingLine,
    calculateRecurringLineAmount,
    
    // Valeurs calculées
    totalHt,
    tva,
    totalTtc,
    estimatedTotals,
    hasRecurringLine,
    
    // Utilitaires
    formatMontantEspace
  };
};

export default useDevisCalculations;

