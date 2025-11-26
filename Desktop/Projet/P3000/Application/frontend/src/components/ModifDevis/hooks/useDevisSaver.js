/**
 * Hook personnalisé pour sauvegarder les modifications d'un devis
 * Gère la mise à jour de toutes les entités liées (lignes, lignes spéciales, etc.)
 */
import { useState, useCallback } from 'react';
import axios from 'axios';
import { transformToLegacyFormat, validateBeforeTransform } from '../../../utils/DevisLegacyTransformer';

/**
 * Hook pour sauvegarder les modifications d'un devis existant
 * @param {string|number} devisId - ID du devis à modifier
 * @returns {Object} État et fonctions du saver
 */
export const useDevisSaver = (devisId) => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [lastSaveTime, setLastSaveTime] = useState(null);

  /**
   * Calcule le prix d'une ligne de détail
   */
  const calculatePrice = useCallback((ligne) => {
    if (ligne.prix_devis !== null && ligne.prix_devis !== undefined) {
      return parseFloat(ligne.prix_devis);
    }
    
    const cout_main_oeuvre = parseFloat(ligne.cout_main_oeuvre) || 0;
    const cout_materiel = parseFloat(ligne.cout_materiel) || 0;
    
    if (cout_main_oeuvre === 0 && cout_materiel === 0) {
      return parseFloat(ligne.prix) || 0;
    }
    
    const marge = ligne.marge_devis !== null && ligne.marge_devis !== undefined 
      ? parseFloat(ligne.marge_devis)
      : parseFloat(ligne.marge) || 0;
    
    const taux_fixe = parseFloat(ligne.taux_fixe) || 0;
    
    const base = cout_main_oeuvre + cout_materiel;
    const montant_taux_fixe = base * (taux_fixe / 100);
    const sous_total = base + montant_taux_fixe;
    const montant_marge = sous_total * (marge / 100);
    
    return sous_total + montant_marge;
  }, []);

  /**
   * Calcule les coûts estimés du devis
   */
  const calculateEstimatedTotals = useCallback((devisItems, tauxFixe = 20) => {
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
      const tauxPersonnalise = parseFloat(ligne.taux_fixe || tauxFixe || 20);
      totalTauxFixe += tauxPersonnalise * quantity;
      totalQuantite += quantity;
    });

    const tauxFixeMoyen = totalQuantite > 0 ? totalTauxFixe / totalQuantite : (tauxFixe || 20);
    const montantTauxFixe = coutsDirects * (tauxFixeMoyen / 100);
    totals.cout_avec_taux_fixe = coutsDirects + montantTauxFixe;

    // Arrondir
    totals.cout_estime_main_oeuvre = parseFloat(totals.cout_estime_main_oeuvre.toFixed(2));
    totals.cout_estime_materiel = parseFloat(totals.cout_estime_materiel.toFixed(2));
    totals.cout_avec_taux_fixe = parseFloat(totals.cout_avec_taux_fixe.toFixed(2));

    return totals;
  }, []);

  /**
   * Sauvegarde les modifications du devis
   * @param {Object} params - Paramètres de sauvegarde
   */
  const saveDevis = useCallback(async ({
    devisItems,
    devisData,
    selectedChantierId,
    clientId,
    totalHt,
    totalTtc,
    tauxFixe = 20,
    devisType = 'normal',
    pendingChantierData = null,
    societeId = null
  }) => {
    if (!devisId) {
      setSaveError('Aucun ID de devis fourni');
      return { success: false, error: 'Aucun ID de devis fourni' };
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      // Valider les données avant transformation
      const validation = validateBeforeTransform({
        devisItems,
        devisData,
        selectedChantierId
      });
      
      if (!validation.valid) {
        const errorMsg = `Erreurs de validation:\n${validation.errors.join('\n')}`;
        setSaveError(errorMsg);
        return { success: false, error: errorMsg };
      }

      // Calculer les totaux estimés
      const totals = calculateEstimatedTotals(devisItems, tauxFixe);
      totals.marge_estimee = totalHt - totals.cout_avec_taux_fixe;

      // Transformer les données vers le format legacy
      const legacyDevis = transformToLegacyFormat({
        devisItems,
        devisData: {
          ...devisData,
          price_ht: totalHt,
          price_ttc: totalTtc
        },
        selectedChantierId,
        clientIds: clientId ? [clientId] : [],
        devisType,
        pendingChantierData,
        societeId,
        totals,
        tauxFixe
      });

      // Appel API pour mettre à jour le devis
      const response = await axios.put(`/api/devisa/${devisId}/`, legacyDevis);

      if (response.data) {
        // Recalculer les coûts du devis
        try {
          await axios.post(`/api/devis/${devisId}/recalculer-couts/`);
        } catch (recalcError) {
          console.warn('Erreur lors du recalcul des coûts:', recalcError);
        }

        setLastSaveTime(new Date());
        return { success: true, data: response.data };
      }

      return { success: true, data: response.data };

    } catch (err) {
      const errorMessage = err.response?.data?.error 
        || err.response?.data?.detail 
        || err.message 
        || 'Erreur lors de la sauvegarde';
      
      setSaveError(errorMessage);
      console.error('Erreur lors de la sauvegarde du devis:', err);
      
      return { success: false, error: errorMessage };
    } finally {
      setIsSaving(false);
    }
  }, [devisId, calculateEstimatedTotals]);

  /**
   * Sauvegarde les lignes spéciales individuellement
   */
  const saveSpecialLines = useCallback(async (devisItems) => {
    if (!devisId) return { success: false, error: 'Aucun ID de devis' };

    const specialLines = devisItems.filter(item => item.type === 'ligne_speciale');
    
    try {
      for (const line of specialLines) {
        const isNewLine = typeof line.id === 'string' || !line.dbId;
        
        const lineData = {
          description: line.description,
          type_speciale: line.type_speciale,
          value_type: line.value_type,
          value: line.value,
          base_calculation: line.baseCalculation ? {
            type: line.baseCalculation.type,
            id: line.baseCalculation.id,
            label: line.baseCalculation.label
          } : null,
          styles: line.styles || {},
          index_global: line.index_global,
          context_type: line.context_type,
          context_id: line.context_id
        };

        if (isNewLine) {
          await axios.post(`/api/devis/${devisId}/ligne-speciale/create/`, lineData);
        } else {
          await axios.put(`/api/devis/${devisId}/ligne-speciale/${line.id}/update/`, lineData);
        }
      }

      return { success: true };
    } catch (err) {
      console.error('Erreur lors de la sauvegarde des lignes spéciales:', err);
      return { success: false, error: err.message };
    }
  }, [devisId]);

  /**
   * Met à jour l'ordre des éléments du devis
   */
  const updateOrder = useCallback(async (devisItems) => {
    if (!devisId) return { success: false, error: 'Aucun ID de devis' };

    try {
      await axios.post(`/api/devis/${devisId}/update-order/`, {
        items: devisItems.map(item => ({
          type: item.type,
          id: item.id,
          index_global: item.index_global
        }))
      });

      return { success: true };
    } catch (err) {
      console.error('Erreur lors de la mise à jour de l\'ordre:', err);
      return { success: false, error: err.message };
    }
  }, [devisId]);

  /**
   * Supprime une ligne spéciale
   */
  const deleteSpecialLine = useCallback(async (lineId) => {
    if (!devisId) return { success: false, error: 'Aucun ID de devis' };

    try {
      await axios.delete(`/api/devis/${devisId}/ligne-speciale/${lineId}/delete/`);
      return { success: true };
    } catch (err) {
      console.error('Erreur lors de la suppression de la ligne spéciale:', err);
      return { success: false, error: err.message };
    }
  }, [devisId]);

  return {
    isSaving,
    saveError,
    lastSaveTime,
    saveDevis,
    saveSpecialLines,
    updateOrder,
    deleteSpecialLine,
    calculatePrice,
    calculateEstimatedTotals
  };
};

export default useDevisSaver;


