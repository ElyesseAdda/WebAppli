import axios from "axios";
import React, { useEffect, useState } from "react";

const AddStockForm = ({ onClose, onProductAdded }) => {
  const [codeProduit, setCodeProduit] = useState("");
  const [fournisseur, setFournisseur] = useState("");
  const [designation, setDesignation] = useState("");
  const [prixUnitaire, setPrixUnitaire] = useState(0);
  const [quantiteDisponible, setQuantiteDisponible] = useState(0);

  // Fonction pour récupérer le dernier code produit
  useEffect(() => {
    axios
      .get("/api/stock/latest_code")
      .then((response) => {
        const lastCode = response.data.last_code_produit || "00"; // Par défaut, 'P000' si aucun produit n'est trouvé
        const nextCode = incrementCode(lastCode);
        setCodeProduit(nextCode);
      })
      .catch((error) => {
        console.error(
          "Erreur lors de la récupération du dernier code produit :",
          error
        );
      });
  }, []);

  // Fonction pour incrémenter le code produit
  const incrementCode = (lastCode) => {
    const codeNumber = parseInt(lastCode, 10) + 1; // Extraire le nombre et l'incrémenter
    return codeNumber.toString().padStart(lastCode.length, "0"); // Conserver le format avec le bon nombre de chiffres
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const newStock = {
      code_produit: codeProduit,
      fournisseur: parseInt(fournisseur) || null,
      designation: designation || "N/A",
      quantite_disponible: quantiteDisponible,
      prix_unitaire: prixUnitaire,
    };

    axios
      .post("/api/stock/", newStock)
      .then((response) => {
        console.log("Stock ajouté avec succès:", response.data);
        onProductAdded(); // Appel du callback pour indiquer qu'un produit a été ajouté
      })
      .catch((error) => {
        console.error("Erreur lors de l'ajout du stock:", error);
      });
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "left",
        marginTop: "20px",
        marginBottom: "20px",
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          padding: "20px",
          borderRadius: "10px",
          boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
          maxWidth: "600px",
          width: "100%",
        }}
      >
        <h3 style={{ textAlign: "center" }}>Ajouter des stocks</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "15px" }}>
            <label>Code Produit:</label>
            <input
              type="text"
              value={codeProduit}
              onChange={(e) => setCodeProduit(e.target.value)}
              style={{
                width: "95%",
                padding: "10px",
                marginTop: "5px",
                borderRadius: "5px",
                border: "1px solid #ccc",
              }}
              required
            />
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label>Fournisseur (optionnel):</label>
            <input
              type="text"
              value={fournisseur}
              onChange={(e) => setFournisseur(e.target.value)}
              style={{
                width: "95%",
                padding: "10px",
                marginTop: "5px",
                borderRadius: "5px",
                border: "1px solid #ccc",
              }}
            />
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label>Désignation (optionnel):</label>
            <input
              type="text"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              style={{
                width: "95%",
                padding: "10px",
                marginTop: "5px",
                borderRadius: "5px",
                border: "1px solid #ccc",
              }}
            />
          </div>
          <div style={{ marginBottom: "15px" }}>
            <label>Quantité Disponible:</label>
            <input
              type="number"
              value={quantiteDisponible}
              onChange={(e) => setQuantiteDisponible(e.target.value)}
              style={{
                width: "95%",
                padding: "10px",
                marginTop: "5px",
                borderRadius: "5px",
                border: "1px solid #ccc",
              }}
              required
            />
          </div>
          <div style={{ marginBottom: "15px" }}>
            <label>Prix Unitaire:</label>
            <input
              type="number"
              step="0.01"
              value={prixUnitaire}
              onChange={(e) => setPrixUnitaire(e.target.value)}
              style={{
                width: "95%",
                padding: "10px",
                marginTop: "5px",
                borderRadius: "5px",
                border: "1px solid #ccc",
              }}
              required
            />
          </div>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <button
              type="submit"
              style={{
                padding: "10px 20px",
                backgroundColor: "rgba(27, 120, 188, 1)",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
                flex: 1,
              }}
            >
              Ajouter
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddStockForm;
