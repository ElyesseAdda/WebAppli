const BASE_URL = "/api";

export const bonCommandeService = {
  getFournisseurs: async () => {
    const response = await fetch(`${BASE_URL}/get_fournisseurs/`);
    if (!response.ok)
      throw new Error("Erreur lors de la récupération des fournisseurs");
    return response.json();
  },

  getProductsByFournisseur: async (fournisseurId, codeRange = null) => {
    const url = `${BASE_URL}/products-by-fournisseur/?fournisseur=${encodeURIComponent(
      fournisseurId
    )}${codeRange ? `&code_range=${codeRange}` : ""}`;
    
    const response = await fetch(url);
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
      let errorMessage = "Erreur lors de la création du bon de commande";
      
      // Gestion spécifique des erreurs de numéro dupliqué
      if (errorData.error && errorData.error.includes("clé dupliquée") && errorData.error.includes("numero")) {
        try {
          // Extraire le numéro dupliqué du message d'erreur
          const duplicateMatch = errorData.error.match(/\(numero\)=\(([^)]+)\)/);
          if (duplicateMatch) {
            const duplicateNumber = duplicateMatch[1];
            
            // Extraire le numéro de séquence et ajouter +1
            const numberMatch = duplicateNumber.match(/BC-(\d+)/);
            if (numberMatch) {
              const currentSequence = parseInt(numberMatch[1]);
              const nextSequence = currentSequence + 1;
              const suggestedNumber = `BC-${nextSequence.toString().padStart(4, '0')}`;
              
              errorMessage = `❌ Ce numéro de bon de commande existe déjà. Veuillez choisir un autre numéro.\n\n💡 Suggestion : Le prochain numéro disponible est ${suggestedNumber}`;
            } else {
              // Fallback si on ne peut pas parser le numéro
              const nextNumberResponse = await fetch(`${BASE_URL}/generate-bon-commande-number/`);
              if (nextNumberResponse.ok) {
                const nextNumberData = await nextNumberResponse.json();
                errorMessage = `❌ Ce numéro de bon de commande existe déjà. Veuillez choisir un autre numéro.\n\n💡 Suggestion : Le prochain numéro disponible est ${nextNumberData.numero}`;
              } else {
                errorMessage = "❌ Ce numéro de bon de commande existe déjà. Veuillez choisir un autre numéro.";
              }
            }
          } else {
            // Fallback si on ne peut pas extraire le numéro dupliqué
            const nextNumberResponse = await fetch(`${BASE_URL}/generate-bon-commande-number/`);
            if (nextNumberResponse.ok) {
              const nextNumberData = await nextNumberResponse.json();
              errorMessage = `❌ Ce numéro de bon de commande existe déjà. Veuillez choisir un autre numéro.\n\n💡 Suggestion : Le prochain numéro disponible est ${nextNumberData.numero}`;
            } else {
              errorMessage = "❌ Ce numéro de bon de commande existe déjà. Veuillez choisir un autre numéro.";
            }
          }
        } catch (nextNumberError) {
          console.error("Erreur lors de la génération du numéro suggéré:", nextNumberError);
          errorMessage = "❌ Ce numéro de bon de commande existe déjà. Veuillez choisir un autre numéro.";
        }
      } else if (errorData.error) {
        errorMessage = `❌ ${errorData.error}`;
      }
      
      throw new Error(errorMessage);
    }
    return response.json();
  },
};
