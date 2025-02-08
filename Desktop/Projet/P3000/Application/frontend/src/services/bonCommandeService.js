const BASE_URL = "/api";

export const bonCommandeService = {
  getFournisseurs: async () => {
    const response = await fetch(`${BASE_URL}/get_fournisseurs/`);
    if (!response.ok)
      throw new Error("Erreur lors de la récupération des fournisseurs");
    return response.json();
  },

  getProductsByFournisseur: async (fournisseurId) => {
    const response = await fetch(
      `${BASE_URL}/products-by-fournisseur/?fournisseur=${encodeURIComponent(
        fournisseurId
      )}`
    );
    if (!response.ok)
      throw new Error("Erreur lors de la récupération des produits");
    return response.json();
  },

  generateBonCommandeNumber: async () => {
    const response = await fetch(`${BASE_URL}/generate-bon-commande-number/`);
    if (!response.ok) throw new Error("Erreur lors de la génération du numéro");
    return response.json();
  },

  createBonCommande: async (bonCommandeData) => {
    const response = await fetch(`${BASE_URL}/bons-commande/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bonCommandeData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || "Erreur lors de la création du bon de commande"
      );
    }
    return response.json();
  },
};
