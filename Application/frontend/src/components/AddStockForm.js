import React, { useState } from 'react';
import axios from 'axios';

const AddStockForm = ({ onClose, onProductAdded }) => {  // Ajout de onProductAdded en prop
  const [codeProduit, setCodeProduit] = useState('');
  const [nomMateriel, setNomMateriel] = useState('');
  const [fournisseur, setFournisseur] = useState('');
  const [designation, setDesignation] = useState('');  // Nouveau champ
  const [prixUnitaire, setPrixUnitaire] = useState(0);
  const [quantiteDisponible, setQuantiteDisponible] = useState(0);
  const [quantiteMinimum, setQuantiteMinimum] = useState(0);  // Nouveau champ

  const handleSubmit = (e) => {
    e.preventDefault();

    const newStock = {
      code_produit: codeProduit,
      nom_materiel: nomMateriel,
      fournisseur: fournisseur || 'N/A',
      designation: designation || 'N/A',  // Désignation prise en compte
      quantite_disponible: quantiteDisponible,
      quantite_minimum: quantiteMinimum || 0,  // Quantité minimum prise en compte
      prix_unitaire: prixUnitaire,
    };

    axios.post('/api/stock/', newStock)
      .then(response => {
        console.log("Stock ajouté avec succès:", response.data);
        onProductAdded();  // Appel du callback pour indiquer qu'un produit a été ajouté
      })
      .catch(error => {
        console.error("Erreur lors de l'ajout du stock:", error);
      });
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'left',
      marginTop: '20px',
      marginBottom: '20px',
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '10px',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
        maxWidth: '600px',
        width: '100%',
      }}>
        <h3 style={{ textAlign: 'center' }}>Ajouter des stocks</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '15px' }}>
            <label>Code Produit:</label>
            <input
              type="text"
              value={codeProduit}
              onChange={(e) => setCodeProduit(e.target.value)}
              style={{
                width: '95%',
                padding: '10px',
                marginTop: '5px',
                borderRadius: '5px',
                border: '1px solid #ccc',
              }}
              required
            />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label>Nom Matériel:</label>
            <input
              type="text"
              value={nomMateriel}
              onChange={(e) => setNomMateriel(e.target.value)}
              style={{
                width: '95%',
                padding: '10px',
                marginTop: '5px',
                borderRadius: '5px',
                border: '1px solid #ccc',
              }}
              required
            />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label>Fournisseur (optionnel):</label>
            <input
              type="text"
              value={fournisseur}
              onChange={(e) => setFournisseur(e.target.value)}
              style={{
                width: '95%',
                padding: '10px',
                marginTop: '5px',
                borderRadius: '5px',
                border: '1px solid #ccc',
              }}
            />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label>Quantité Minimum (optionnel):</label>
            <input
              type="number"
              value={quantiteMinimum}
              onChange={(e) => setQuantiteMinimum(e.target.value)}
              style={{
                width: '95%',
                padding: '10px',
                marginTop: '5px',
                borderRadius: '5px',
                border: '1px solid #ccc',
              }}
            />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label>Désignation (optionnel):</label>
            <input
              type="text"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              style={{
                width: '95%',
                padding: '10px',
                marginTop: '5px',
                borderRadius: '5px',
                border: '1px solid #ccc',
              }}
            />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label>Quantité Disponible:</label>
            <input
              type="number"
              value={quantiteDisponible}
              onChange={(e) => setQuantiteDisponible(e.target.value)}
              style={{
                width: '95%',
                padding: '10px',
                marginTop: '5px',
                borderRadius: '5px',
                border: '1px solid #ccc',
              }}
              required
            />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label>Prix Unitaire:</label>
            <input
              type="number"
              step="0.01"
              value={prixUnitaire}
              onChange={(e) => setPrixUnitaire(e.target.value)}
              style={{
                width: '95%',
                padding: '10px',
                marginTop: '5px',
                borderRadius: '5px',
                border: '1px solid #ccc',
              }}
              required
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button type="submit" style={{
                padding: '10px 20px',
                backgroundColor: 'rgba(27, 120, 188, 1)',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                flex: 1,
            }}>
              Ajouter
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddStockForm;
