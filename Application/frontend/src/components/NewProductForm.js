import React, { useState } from 'react';
import axios from 'axios';

const NewProductForm = ({ onAddProduct }) => {
    const [codeProduit, setCodeProduit] = useState('');
    const [nomMateriel, setNomMateriel] = useState('');
    const [fournisseur, setFournisseur] = useState('');
    const [quantite, setQuantite] = useState(0);
    const [prixUnitaire, setPrixUnitaire] = useState(0);

    const handleSubmit = (e) => {
        e.preventDefault();

        const newProduct = {
            code_produit: codeProduit,
            nom_materiel: nomMateriel,
            fournisseur: fournisseur,
            quantite_disponible: quantite,
            prix_unitaire: prixUnitaire,
        };

        axios.post('/api/stock/', newProduct)
            .then(response => {
                onAddProduct(response.data);  // Ajouter le nouveau produit à la liste
                setCodeProduit('');
                setNomMateriel('');
                setFournisseur('');
                setQuantite(0);
                setPrixUnitaire(0);
            })
            .catch(error => {
                console.error("Erreur lors de l'ajout du produit:", error);
            });
    };

    return (
        <form onSubmit={handleSubmit}>
            <h2>Créer un nouveau produit</h2>
            <div>
                <label>Code Produit:</label>
                <input type="text" value={codeProduit} onChange={(e) => setCodeProduit(e.target.value)} />
            </div>
            <div>
                <label>Nom du Matériel:</label>
                <input type="text" value={nomMateriel} onChange={(e) => setNomMateriel(e.target.value)} />
            </div>
            <div>
                <label>Fournisseur:</label>
                <input type="text" value={fournisseur} onChange={(e) => setFournisseur(e.target.value)} />
            </div>
            <div>
                <label>Quantité Disponible:</label>
                <input type="number" value={quantite} onChange={(e) => setQuantite(e.target.value)} />
            </div>
            <div>
                <label>Prix Unitaire:</label>
                <input type="number" step="0.01" value={prixUnitaire} onChange={(e) => setPrixUnitaire(e.target.value)} />
            </div>
            <button type="submit">Ajouter le produit</button>
        </form>
    );
};

export default NewProductForm;
