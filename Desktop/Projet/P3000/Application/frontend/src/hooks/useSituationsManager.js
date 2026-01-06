import axios from "axios";
import { useCallback, useEffect, useState } from "react";

export const useSituationsManager = (chantierId) => {
  const [situations, setSituations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Charger les situations
  const loadSituations = useCallback(async () => {
    if (!chantierId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(
        `/api/chantier/${chantierId}/situations/`
      );
      setSituations(response.data);
    } catch (err) {
      setError(err.message);
      console.error("Erreur lors du chargement des situations:", err);
    } finally {
      setLoading(false);
    }
  }, [chantierId]);

  // Mettre à jour une situation
  const updateSituation = useCallback(async (situationId, updateData) => {
    try {
      const response = await axios.patch(
        `/api/situations/${situationId}/`,
        updateData
      );

      // Mettre à jour la situation dans l'état local
      setSituations((prevSituations) =>
        prevSituations.map((situation) =>
          situation.id === situationId
            ? { ...situation, ...response.data }
            : situation
        )
      );

      return response.data;
    } catch (err) {
      setError(err.message);
      console.error("Erreur lors de la mise à jour de la situation:", err);
      throw err;
    }
  }, []);

  // Mettre à jour la date d'envoi et le délai de paiement
  const updateDateEnvoi = useCallback(
    async (situationId, dateEnvoi, delaiPaiement) => {
      const updateData = {};
      if (dateEnvoi !== undefined) updateData.date_envoi = dateEnvoi;
      if (delaiPaiement !== undefined)
        updateData.delai_paiement = delaiPaiement;

      return await updateSituation(situationId, updateData);
    },
    [updateSituation]
  );

  // Mettre à jour le paiement
  const updatePaiement = useCallback(
    async (situationId, montantRecu, datePaiementReel) => {
      const updateData = {};
      if (montantRecu !== undefined) updateData.montant_reel_ht = montantRecu;
      if (datePaiementReel !== undefined)
        updateData.date_paiement_reel = datePaiementReel;

      return await updateSituation(situationId, updateData);
    },
    [updateSituation]
  );

  // Réinitialiser/supprimer le paiement
  const resetPaiement = useCallback(
    async (situationId) => {
      const updateData = {
        montant_reel_ht: null,
        date_paiement_reel: null,
      };
      return await updateSituation(situationId, updateData);
    },
    [updateSituation]
  );

  // Charger les situations au montage et quand chantierId change
  useEffect(() => {
    loadSituations();
  }, [loadSituations]);

  return {
    situations,
    loading,
    error,
    loadSituations,
    updateSituation,
    updateDateEnvoi,
    updatePaiement,
    resetPaiement,
  };
};
