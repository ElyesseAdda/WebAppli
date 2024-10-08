import React, { useState } from 'react';
import axios from 'axios';
import { FiPlusCircle, FiMinusCircle } from "react-icons/fi";

const ProductSelection = ({ productList, setProductList, onModifyQuantity, onValidateChanges }) => {
    const [searchQuery, setSearchQuery] = useState('');  // Filtre pour la recherche générale
    const [designationQuery, setDesignationQuery] = useState('');  // Filtre pour la désignation
    const [fournisseurQuery, setFournisseurQuery] = useState('');  // Filtre pour le fournisseur
    const [showLowStock, setShowLowStock] = useState(false);  // Filtre pour afficher les stocks faibles
    const [editRowId, setEditRowId] = useState(null);  // Gérer la ligne en mode édition
    const [editedProduct, setEditedProduct] = useState({});  // Stocker les données modifiées

    // Gérer l'édition
    const handleEdit = (product) => {
        setEditRowId(product.id);  // Mettre la ligne en mode édition
        setEditedProduct(product);  // Mettre à jour les données de produit dans l'état
    };

    // Gérer la modification des champs d'input
    const handleInputChange = (e, field) => {
        setEditedProduct({
            ...editedProduct,
            [field]: e.target.value,
        });
    };

    // Fonction pour sauvegarder les modifications dans la base de données
    const handleSave = () => {
        axios.put(`/api/stock/${editedProduct.id}/`, editedProduct)
            .then(response => {
                console.log("Produit mis à jour avec succès :", response.data);

                // Mettre à jour la liste des produits avec le produit modifié
                setProductList((prevList) =>
                    prevList.map((item) =>
                        item.id === editedProduct.id ? { ...editedProduct } : item
                    )
                );

                // Quitter le mode édition après la sauvegarde
                setEditRowId(null);
                setEditedProduct({});  // Réinitialiser l'état de l'édition
            })
            .catch(error => {
                console.error("Erreur lors de la mise à jour du produit :", error);
            });
    };

    // Fonction pour annuler l'édition
    const handleCancelEdit = () => {
        setEditRowId(null);  // Quitter le mode édition
        setEditedProduct({});  // Réinitialiser les données
    };

    // Fonction pour ajouter ou modifier une quantité d'un produit
    const handleQuantityChange = (product, type) => {
        let action = type === 'add' ? 'ajouter' : 'retirer';
        const quantite = prompt(`Entrez la quantité à ${action} pour ${product.nom_materiel}`);
    
        if (quantite === 0) {
            console.log("Action annulée par l'utilisateur");
            return;
        }
    
        const quantityChange = parseInt(quantite);
    
        // Ajout de logs pour vérifier la quantité disponible
        console.log(`Quantité disponible pour ${product.nom_materiel}: ${product.quantite_disponible}`);
        console.log(`Quantité entrée: ${quantityChange}`);
    
        if (isNaN(quantityChange) || quantityChange <= 0) {
            alert("Veuillez entrer une quantité valide positive.");
            return;
        }
    
        if (action === 'retirer') {
            if ((-quantityChange) > product.quantite_disponible) {
                alert(`Impossible de retirer ${quantityChange} unités. Quantité disponible : ${product.quantite_disponible}.`);
                return;
            }

            onModifyQuantity(product, -quantityChange);  // Retrait avec quantité négative
        } else {
            onModifyQuantity(product, quantityChange);  // Ajout
        }
    };

    // Filtrer les produits en fonction de la recherche, désignation, fournisseur et stock faible
    const filteredProducts = productList.filter(product => {
        const matchesSearch = product.nom_materiel.toLowerCase().includes(searchQuery.toLowerCase()) || 
            product.code_produit.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesDesignation = designationQuery === '' || (product.designation && product.designation.toLowerCase().includes(designationQuery.toLowerCase()));
        const matchesFournisseur = fournisseurQuery === '' || (product.fournisseur && product.fournisseur.toLowerCase().includes(fournisseurQuery.toLowerCase()));
        const matchesLowStock = !showLowStock || (product.quantite_minimum && product.quantite_disponible < product.quantite_minimum);

        return matchesSearch && matchesDesignation && matchesFournisseur && matchesLowStock;
    });

    return (
        <div style={mainContainer}>
            <h2>Sélectionner un produit</h2>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                <input 
                    type="text"
                    placeholder="Rechercher un produit..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ width: '200px', marginRight: '10px' }}
                />
                <input 
                    type="text"
                    placeholder="Désignation..."
                    value={designationQuery}
                    onChange={(e) => setDesignationQuery(e.target.value)}
                    style={{ width: '150px', marginRight: '10px' }}
                />
                <input 
                    type="text"
                    placeholder="Fournisseur..."
                    value={fournisseurQuery}
                    onChange={(e) => setFournisseurQuery(e.target.value)}
                    style={{ width: '150px', marginRight: '10px' }}
                />
                <label style={{ marginBottom: '0px' }}>
                    <input 
                        type="checkbox"
                        checked={showLowStock}
                        onChange={(e) => setShowLowStock(e.target.checked)}
                        style={{ marginRight: '5px' }}
                    />
                    Stock faible
                </label>
            </div>
    
            <table style={tableStyle}>
                <thead>
                    <tr style={headerStyle}>
                        <th>Code Produit</th>
                        <th>Nom Produit</th>
                        <th>Fournisseur</th>
                        <th>Désignation</th>
                        <th>Quantité Disponible</th>
                        <th>Stock Minimum</th>
                        <th>Prix Unitaire</th>
                        <th>Prix Total</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredProducts.map((product, index) => {
                        const stockIsLow = product.quantite_minimum && product.quantite_disponible < product.quantite_minimum;
                        const isEditing = editRowId === product.id;  // Mode édition

                        return (
                            <tr 
                                key={product.id} 
                                style={{ backgroundColor: index % 2 === 0 ? '#d3d3d3' : '#ffffff', cursor: 'pointer' }}
                                onDoubleClick={() => handleEdit(product)}  // Activer l'édition par double-clic
                            >
                                {/* Champs modifiables */}
                                <td style={cellStyle}>
                                    {isEditing ? (
                                        <input 
                                            type="text"
                                            value={editedProduct.code_produit}
                                            onChange={(e) => handleInputChange(e, 'code_produit')}
                                        />
                                    ) : (
                                        product.code_produit
                                    )}
                                </td>
                                <td style={cellStyle}>
                                    {isEditing ? (
                                        <input 
                                            type="text"
                                            value={editedProduct.nom_materiel}
                                            onChange={(e) => handleInputChange(e, 'nom_materiel')}
                                        />
                                    ) : (
                                        product.nom_materiel
                                    )}
                                </td>
                                <td style={cellStyle}>{product.fournisseur || 'N/A'}</td>
                                <td style={cellStyle}>{product.designation || 'N/A'}</td>
                                <td style={{ ...cellStyle, color: stockIsLow ? 'red' : 'black' }}>
                                    {isEditing ? (
                                        <input 
                                            type="number"
                                            value={editedProduct.quantite_disponible}
                                            onChange={(e) => handleInputChange(e, 'quantite_disponible')}
                                        />
                                    ) : (
                                        product.quantite_disponible
                                    )}
                                </td>
                                <td style={cellStyle}>{product.quantite_minimum || 'N/A'}</td>
                                <td style={cellStyle}>
                                    {isEditing ? (
                                        <input 
                                            type="number"
                                            value={editedProduct.prix_unitaire}
                                            onChange={(e) => handleInputChange(e, 'prix_unitaire')}
                                            step="0.01"
                                        />
                                    ) : (
                                        product.prix_unitaire
                                    )}
                                </td>
                                <td style={cellStyle}>{(product.quantite_disponible * product.prix_unitaire).toFixed(2)} €</td>
                                <td style={cellStyle}>
                                    {isEditing ? (
                                        <>
                                            <button onClick={handleSave}>
                                                Sauvegarder
                                            </button>
                                            <button onClick={handleCancelEdit}>
                                                Annuler
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button onClick={(e) => { e.stopPropagation(); handleQuantityChange(product, 'add'); }} style={iconButtonStyle}>
                                                <FiPlusCircle style={{ color: 'green', fontSize: '20px' }} />
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); handleQuantityChange(product, 'remove'); }} style={iconButtonStyle}>
                                                <FiMinusCircle style={{ color: 'red', fontSize: '20px' }} />
                                            </button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

// Styles
const mainContainer = {
    borderRadius: '10px',
    backgroundColor: 'white',
    padding: '15px',
    paddingBottom: '40px',
    height: 'fit-content',
    width: 'fit-content',
};

const tableStyle = {
    borderCollapse: 'collapse',
    fontSize: '14px',
};

const headerStyle = {
    backgroundColor: 'rgba(27, 120, 188, 1)', 
    color: 'white',
    fontWeight: 'bold',
    fontSize: '15px',
};

const cellStyle = {
    padding: '8px',
    border: '1px solid #ccc',
    textAlign: 'center',
    fontWeight: '600',
};

const iconButtonStyle = {
    backgroundColor: 'transparent', 
    border: 'none',
    cursor: 'pointer'
};

export default ProductSelection;
