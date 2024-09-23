import React, { useState, useEffect } from 'react';
import axios from 'axios';

const StockOut = () => {
    const [stocksOut, setStocksOut] = useState([]);
    const [editingStock, setEditingStock] = useState(null);  // Stock actuellement modifié

    // Fonction pour récupérer les stocks sortants
    const fetchStockOut = () => {
        axios.get('/api/stock-out/')
            .then(response => {
                setStocksOut(response.data);
            })
            .catch(error => {
                console.error('Erreur lors du chargement des stocks sortants:', error);
            });
    };

    // useEffect pour recharger les données après chaque modification
    useEffect(() => {
        fetchStockOut();
    }, [editingStock]);  // Chaque fois que "editingStock" change, on réexécute fetchStockOut

    // Fonction pour gérer la modification d'une ligne de stock
    const handleEditClick = (stock) => {
        setEditingStock(stock.id);
    };

    const handleSaveClick = (stock) => {
        // Code pour enregistrer la modification
        axios.put(`/api/stock-out/${stock.id}/`, stock)
            .then(() => {
                setEditingStock(null);
                fetchStockOut();  // Rafraîchir les données après la sauvegarde
            })
            .catch(error => {
                console.error('Erreur lors de la mise à jour:', error);
            });
    };

    const handleCancelClick = () => {
        setEditingStock(null);  // Annuler l'édition
    };

    return (
        <div>
            <h2>Sortie de Stock</h2>
            <table>
                <thead>
                    <tr>
                        <th>Code Produit</th>
                        <th>Nom Matériel</th>
                        <th>Fournisseur</th>
                        <th>Quantité Sortie</th>
                        <th>Quantité Restante</th>
                        <th>Prix du Stock Sortie</th>
                        <th>Chantier</th>
                        <th>Date de Sortie</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {stocksOut.map(stock => (
                        <tr key={stock.id}>
                            <td>{stock.code_produit}</td>
                            <td>{stock.nom_materiel}</td>
                            <td>{stock.fournisseur || 'N/A'}</td>
                            <td>{stock.quantite_sortie}</td>
                            <td>{stock.quantite_restante}</td>
                            <td>{(stock.quantite_sortie * stock.prix_unitaire).toFixed(2)} €</td>
                            <td>{stock.chantier}</td>
                            <td>{new Date(stock.date_sortie).toLocaleDateString()}</td>
                            <td>
                                {editingStock === stock.id ? (
                                    <>
                                        <button onClick={() => handleSaveClick(stock)}>Sauvegarder</button>
                                        <button onClick={handleCancelClick}>Annuler</button>
                                    </>
                                ) : (
                                    <button onClick={() => handleEditClick(stock)}>Modifier</button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default StockOut;
