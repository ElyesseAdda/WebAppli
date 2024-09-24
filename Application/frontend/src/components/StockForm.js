import React, { useState } from 'react';
import ProductSelection from './ProductSelection';


const StockForm = () => {
    const [summary, setSummary] = useState([]);
    const [showNewProductForm, setShowNewProductForm] = useState(false);

    // Fonction pour modifier la quantité d'un produit (ajouter ou retirer)
    const handleModifyQuantity = (product, quantite) => {
        const existingProductIndex = summary.findIndex(item => item.id === product.id);
        if (existingProductIndex >= 0) {
            // Mettre à jour la quantité si le produit existe déjà dans la liste des modifications
            const updatedSummary = summary.map((item, index) =>
                index === existingProductIndex ? { ...item, quantite: item.quantite + quantite } : item
            );
            setSummary(updatedSummary);
        } else {
            // Ajouter le produit à la liste des modifications
            setSummary([...summary, { ...product, quantite }]);
        }
    };

    const handleRemoveProduct = (index) => {
        const newSummary = summary.filter((_, i) => i !== index);
        setSummary(newSummary);
    };

    const handleEditProduct = (index) => {
        const newQuantite = prompt("Entrez la nouvelle quantité:");
        if (newQuantite && !isNaN(newQuantite)) {
            const updatedSummary = summary.map((item, i) =>
                i === index ? { ...item, quantite: parseInt(newQuantite) } : item
            );
            setSummary(updatedSummary);
        }
    };

    const handleValidate = () => {
        console.log("Validation des ajouts et retraits:", summary);
        // Envoyer la liste récapitulative au backend ici
    };

    return (
        <div>
            <h1 style={{color: 'white'}}>Gestion des Entrées et Sorties de Stock</h1>
            <ProductSelection onModifyQuantity={handleModifyQuantity} />
        </div>
    );
};

export default StockForm;
