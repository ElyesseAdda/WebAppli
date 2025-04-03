import axios from "axios";

export const updateChantierMaterialCost = async (chantierId) => {
  try {
    // Récupérer tous les bons de commande du chantier
    const response = await axios.get(
      `/api/chantier/${chantierId}/bons-commande/`
    );

    // Calculer le total des bons de commande
    const totalMaterialCost = response.data.reduce((total, bon) => {
      return total + (parseFloat(bon.montant_total) || 0);
    }, 0);

    // Mettre à jour le chantier avec le nouveau cout_materiel
    await axios.patch(`/api/chantier/${chantierId}/`, {
      cout_materiel: totalMaterialCost,
    });

    return totalMaterialCost;
  } catch (error) {
    console.error("Erreur lors de la mise à jour du coût matériel:", error);
    throw error;
  }
};
