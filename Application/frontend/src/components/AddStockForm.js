import React, { useState } from 'react';
import axios from 'axios';

const AddStockForm = ({ onClose }) => {
  const [codeProduit, setCodeProduit] = useState('');
  const [nomMateriel, setNomMateriel] = useState('');
  const [fournisseur, setFournisseur] = useState('');
  const [prixUnitaire, setPrixUnitaire] = useState(0);
  const [quantite, setQuantite] = useState(0);

  const handleSubmit = (e) => {
    e.preventDefault();

    const newStock = {
      code_produit: codeProduit,
      nom_materiel: nomMateriel,
      fournisseur: fournisseur,
      quantite_disponible: quantite,
      prix_unitaire: prixUnitaire,
    };

    axios.post('/api/stock/', newStock)
      .then(response => {
        console.log("Stock ajouté avec succès:", response.data);
        onClose();  // Fermer le formulaire après ajout
      })
      .catch(error => {
        console.error("Erreur lors de l'ajout du stock:", error);
      });
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <h3>Ajouter des stocks</h3>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Code Produit:</label>
          <input
            type="text"
            value={codeProduit}
            onChange={(e) => setCodeProduit(e.target.value)}
          />
        </div>
        <div>
          <label>Nom du Matériel:</label>
          <input
            type="text"
            value={nomMateriel}
            onChange={(e) => setNomMateriel(e.target.value)}
          />
        </div>
        <div>
          <label>Fournisseur:</label>
          <input
            type="text"
            value={fournisseur}
            onChange={(e) => setFournisseur(e.target.value)}
          />
        </div>
        <div>
          <label>Prix Unitaire:</label>
          <input
            type="number"
            step="0.01"
            value={prixUnitaire}
            onChange={(e) => setPrixUnitaire(e.target.value)}
          />
        </div>
        <div>
          <label>Quantité:</label>
          <input
            type="number"
            value={quantite}
            onChange={(e) => setQuantite(e.target.value)}
          />
        </div>
        <button type="submit">Ajouter</button>
        <button type="button" onClick={onClose}>Fermer</button>
      </form>
    </div>
  );
};

export default AddStockForm;
