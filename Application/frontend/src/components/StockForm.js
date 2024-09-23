import React, { useState } from 'react';
import ProductSelection from './ProductSelection';
import NewProductForm from './NewProductForm';
import SummaryList from './SummaryList';
import StockEntries from './StockEntries';

const StockForm = () => {
    const [summary, setSummary] = useState([]);
    const [showNewProductForm, setShowNewProductForm] = useState(false);

    const handleSelectProduct = (product) => {
        const quantite = prompt(`Entrez la quantité à ajouter pour ${product.nom_materiel}`);
        if (quantite && !isNaN(quantite)) {
            setSummary([...summary, { ...product, quantite: parseInt(quantite) }]);
        }
    };

    const handleAddProduct = (product) => {
        setSummary([...summary, product]);
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
        console.log("Validation des ajouts:", summary);
        // Envoyer la liste récapitulative au backend ici
    };

    return (
        <div>
            <h1>Gestion des Entrées de Stock</h1>
            <ProductSelection onSelectProduct={handleSelectProduct} />
            <button onClick={() => setShowNewProductForm(!showNewProductForm)}>
                {showNewProductForm ? 'Fermer le formulaire de création' : 'Nouveau Produit'}
            </button>
            {showNewProductForm && <NewProductForm onAddProduct={handleAddProduct} />}
            <SummaryList summary={summary} onRemoveProduct={handleRemoveProduct} onEditProduct={handleEditProduct} />
            <StockEntries summary={summary} onValidate={handleValidate} />
        </div>
    );
};

export default StockForm;
