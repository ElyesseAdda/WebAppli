import React, { useState, useEffect } from 'react';
import axios from 'axios';

const StockManagement = () => {
    const [stocks, setStocks] = useState([]);
    const [editingStock, setEditingStock] = useState(null);
    const [editedValues, setEditedValues] = useState({});

    useEffect(() => {
        fetchStocks();
    }, [editingStock]);

    const fetchStocks = () => {
        axios.get('/api/stock/')
            .then(response => {
                setStocks(response.data);
            })
            .catch(error => {
                console.error("Erreur lors du chargement des stocks:", error);
            });
    };

    const handleIncreaseStock = (id) => {
        const stock = stocks.find(item => item.id === id);
        const updatedStock = {
            ...stock,
            quantite_disponible: stock.quantite_disponible + 1
        };
        updateStock(id, updatedStock);
    };

    const handleDecreaseStock = (id) => {
        const stock = stocks.find(item => item.id === id);
        if (stock.quantite_disponible > 0) {
            const updatedStock = {
                ...stock,
                quantite_disponible: stock.quantite_disponible - 1
            };
            updateStock(id, updatedStock);
        }
    };

    const updateStock = (id, updatedStock) => {
        axios.put(`/api/stock/${id}/`, updatedStock)
            .then(response => {
                fetchStocks();
            })
            .catch(error => {
                console.error("Erreur lors de la mise à jour du stock:", error);
            });
    };

    // Fonction pour gérer la modification d'une ligne de stock
    const handleEditClick = (stock) => {
        setEditingStock(stock.id);
        setEditedValues({
            code_produit: stock.code_produit,
            nom_materiel: stock.nom_materiel,
            fournisseur: stock.fournisseur,
            prix_unitaire: stock.prix_unitaire,
        });
    };

    const handleSaveClick = (stock) => {
        // Sauvegarder les modifications via l'API
        axios.put(`/api/stock/${stock.id}/`, editedValues)
            .then(() => {
                setEditingStock(null);
                fetchStocks();  // Rafraîchir les données après la sauvegarde
            })
            .catch(error => {
                console.error('Erreur lors de la mise à jour:', error);
            });
    };

    const handleCancelClick = () => {
        setEditingStock(null);  // Annuler l'édition
    };

    // Fonction pour gérer les changements des valeurs éditées
    const handleChange = (e) => {
        setEditedValues({
            ...editedValues,
            [e.target.name]: e.target.value
        });
    };

    return (
        <div>
            <h2>Gestion des Stocks</h2>
            <table>
                <thead>
                    <tr>
                        <th>Code Produit</th>
                        <th>Nom Produit</th>
                        <th>Fournisseur</th>
                        <th>Prix Unitaire</th>
                        <th>Quantité Disponible</th>
                        <th>Prix Total Stock</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {stocks.map(stock => (
                        <tr key={stock.id}>
                            <td>{editingStock === stock.id ? (
                                <input 
                                    type="text" 
                                    name="code_produit" 
                                    value={editedValues.code_produit || ''} 
                                    onChange={handleChange} 
                                />
                            ) : (
                                stock.code_produit
                            )}</td>
                            <td>{editingStock === stock.id ? (
                                <input 
                                    type="text" 
                                    name="nom_materiel" 
                                    value={editedValues.nom_materiel || ''} 
                                    onChange={handleChange} 
                                />
                            ) : (
                                stock.nom_materiel
                            )}</td>
                            <td>{editingStock === stock.id ? (
                                <input 
                                    type="text" 
                                    name="fournisseur" 
                                    value={editedValues.fournisseur || ''} 
                                    onChange={handleChange} 
                                />
                            ) : (
                                stock.fournisseur || 'N/A'
                            )}</td>
                            <td>{editingStock === stock.id ? (
                                <input 
                                    type="number" 
                                    name="prix_unitaire" 
                                    value={editedValues.prix_unitaire || ''} 
                                    onChange={handleChange} 
                                />
                            ) : (
                                `${stock.prix_unitaire.toFixed(2)} €`
                            )}</td>
                            <td>{stock.quantite_disponible}</td>
                            <td>{(stock.quantite_disponible * stock.prix_unitaire).toFixed(2)} €</td>
                            <td>
                                {editingStock === stock.id ? (
                                    <>
                                        <button onClick={() => handleSaveClick(stock)}>Sauvegarder</button>
                                        <button onClick={handleCancelClick}>Annuler</button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => handleIncreaseStock(stock.id)}>+</button>
                                        <button onClick={() => handleDecreaseStock(stock.id)}>-</button>
                                        <button onClick={() => handleEditClick(stock)}>Modifier</button>
                                    </>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default StockManagement;
