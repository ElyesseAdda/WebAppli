import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ProductSelection from './ProductSelection';
import AddStockForm from './AddStockForm';
import SummaryList from './SummaryList';  // Import du composant SummaryList
import StockHistoryCard from './StockHistoryCard';

const StockForm = () => {
    const [summary, setSummary] = useState([]);  // Liste des modifications à valider
    const [productList, setProductList] = useState([]);  // Liste des produits actuels
    const [loading, setLoading] = useState(true);  // Indicateur de chargement
    const [forceUpdate, setForceUpdate] = useState(false);  // Rechargement forcé
    const [showSummary, setShowSummary] = useState(false);  // Gérer l'affichage de SummaryList
    const [showAddForm, setShowAddForm] = useState(false);  // Gérer l'affichage du formulaire d'ajout

    // Charger la liste des produits
    useEffect(() => {
        fetchProducts();  // Charger les produits au chargement de la page
    }, [forceUpdate]);

    // Fonction pour charger les produits
    const fetchProducts = () => {
        setLoading(true);  // Activer l'indicateur de chargement
        axios.get('/api/stock/')
            .then(response => {
                setProductList(response.data);  // Mettre à jour la liste des produits
                setLoading(false);  // Désactiver l'indicateur de chargement
            })
            .catch(error => {
                console.error("Erreur lors du chargement des produits:", error);
                setLoading(false);  // Désactiver l'indicateur de chargement même en cas d'erreur
            });
    };

    // Cette fonction sera appelée lorsqu'un nouveau produit est ajouté avec succès
    const handleProductAdded = () => {
        setForceUpdate(prev => !prev);  // Forcer le rechargement de la liste des produits
        setShowAddForm(false);  // Masquer le formulaire après ajout de produit
    };

    // Fonction pour ajouter ou retirer des quantités d'un produit et afficher SummaryList
    const handleModifyQuantity = (product, quantite) => {
        if (quantite === undefined || isNaN(quantite) || quantite === 0) {
            console.error("Quantité invalide:", quantite);
            return;
        }

        const existingProductIndex = summary.findIndex(item => item.id === product.id);

        if (existingProductIndex >= 0) {
            // Met à jour la quantité dans le résumé s'il existe déjà
            const updatedSummary = summary.map((item, index) =>
                index === existingProductIndex
                    ? { ...item, quantite: item.quantite + quantite }
                    : item
            );
            setSummary(updatedSummary);
        } else {
            // Ajoute un nouveau produit à la liste des modifications
            setSummary([...summary, { ...product, quantite }]);
        }

        // Afficher le composant SummaryList
        setShowSummary(true);
    };

    // Fonction pour modifier la quantité dans le SummaryList
    const handleModifyItem = (productId, newQuantity) => {
        if (isNaN(newQuantity) || newQuantity === 0) {
            console.error("Nouvelle quantité invalide:", newQuantity);
            return;
        }

        const updatedSummary = summary.map(item =>
            item.id === productId ? { ...item, quantite: newQuantity } : item
        );
        setSummary(updatedSummary);
    };

    // Fonction pour supprimer un élément du SummaryList
    const handleRemoveItem = (productId) => {
        const updatedSummary = summary.filter(item => item.id !== productId);
        setSummary(updatedSummary);
    };

    // Fonction pour valider les modifications, avec chantier et agent
    const handleValidateChanges = (chantierId, agentName) => {
        const promises = summary.map(item => {
            if (item.quantite > 0) {
                return handleAddStock(item, chantierId, agentName);
            } else {
                return handleRemoveStock(item, chantierId, agentName);
            }
        });
    
        Promise.all(promises).then(() => {
            setSummary([]);  // Réinitialiser la liste des modifications après validation
            setShowSummary(false);  // Cacher le composant SummaryList après validation
            setForceUpdate(prev => !prev);  // Rechargement forcé après validation
        });
    };

   const handleAddStock = (item, chantier, agent) => {
        return axios.post(`/api/stock/${item.id}/add_stock/`, { 
            quantite: item.quantite, 
            chantier_id: chantier,  // Assurez-vous que la clé est chantier_id
            agent_id: agent         // Assurez-vous que la clé est agent_id
        })
        .then(response => {
            console.log("Stock ajouté avec succès :", response.data);
        })
        .catch(error => {
            console.error("Erreur lors de l'ajout du stock :", error);
        });
        };
        
        const handleRemoveStock = (item, chantier, agent) => {
            const quantite = Math.abs(item.quantite);  // S'assurer que la quantité est positive
            return axios.post(`/api/stock/${item.id}/remove_stock/`, { 
                quantite, 
                chantier_id: chantier,  // Assurez-vous que la clé est chantier_id
                agent_id: agent         // Assurez-vous que la clé est agent_id
            })
            .then(response => {
                console.log("Stock retiré avec succès :", response.data);
            })
            .catch(error => {
                console.error("Erreur lors du retrait du stock :", error);
            });
        };

    return (
        <div>
            <h1 style={{color: 'white'}}>Gestion des Entrées et Sorties de Stock</h1>
            <StockHistoryCard />

            {/* Bouton pour afficher/masquer le formulaire d'ajout de produit */}
            <button
                onClick={() => setShowAddForm(!showAddForm)}
                style={{
                    padding: '10px 20px',
                    backgroundColor: 'white',
                    color: 'rgba(27, 120, 188, 1)',
                    border: 'none',
                    fontWeight: '700',
                    borderRadius: '5px',
                    marginBottom: '20px',
                    cursor: 'pointer',
                }}
            >
                {showAddForm ? "Fermer Formulaire" : "Nouveau Produit"}
            </button>

            {/* Afficher ou masquer le formulaire d'ajout de stock */}
            {showAddForm && (
                <AddStockForm onProductAdded={handleProductAdded}  />
            )}

            {loading ? (
                <p>Chargement des produits...</p>
            ) : (
                <ProductSelection 
                    productList={productList}  // Passer la liste des produits
                    onModifyQuantity={handleModifyQuantity}  // Passer la fonction de modification des quantités
                    onValidateChanges={handleValidateChanges}  // Passer la fonction de validation
                />
            )}

            {/* Afficher le composant SummaryList uniquement s'il y a des modifications */}
            {showSummary && (
                <SummaryList 
                    modifications={summary}
                    onModifyItem={handleModifyItem}
                    onRemoveItem={handleRemoveItem}
                    onConfirmChanges={handleValidateChanges}  // Passer la fonction de validation avec chantier et agent
                />
            )}
        </div>
        
    );
};

export default StockForm;
