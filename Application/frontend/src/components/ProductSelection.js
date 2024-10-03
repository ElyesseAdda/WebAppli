import React, { useState } from 'react';
import { FiPlusCircle, FiMinusCircle } from "react-icons/fi";

const ProductSelection = ({ productList, onModifyQuantity, onValidateChanges }) => {
    const [searchQuery, setSearchQuery] = useState('');  // Filtre pour la recherche générale
    const [designationQuery, setDesignationQuery] = useState('');  // Filtre pour la désignation
    const [fournisseurQuery, setFournisseurQuery] = useState('');  // Filtre pour le fournisseur
    const [showLowStock, setShowLowStock] = useState(false);  // Filtre pour afficher les stocks faibles

    // Fonction pour ajouter ou modifier une quantité d'un produit
    const handleQuantityChange = (product, type) => {
        let action = type === 'add' ? 'ajouter' : 'retirer';
        const quantite = prompt(`Entrez la quantité à ${action} pour ${product.nom_materiel}`);
        
        if (quantite === null) {
            console.log("Action annulée par l'utilisateur");
            return;
        }
        if (isNaN(quantite) || parseInt(quantite) <= 0) {
            alert("Veuillez entrer une quantité valide positive.");
            return;
        }

        const quantityChange = parseInt(quantite);

        // Demander chantier et agent uniquement lors du retrait
        let chantier = '';
        let agent = '';
        if (type === 'retirer') {
            chantier = prompt("Entrez le nom du chantier associé :");
            agent = prompt("Entrez le nom de l'agent qui a récupéré le matériel :");

            if (!chantier || !agent) {
                alert("Veuillez entrer un chantier et un nom d'agent.");
                return;
            }
        }

        if (type === 'retirer' && product.quantite_disponible < quantityChange) {
            alert("Quantité insuffisante pour retirer cette quantité.");
            return;
        }

        // Appel à onModifyQuantity avec chantier et agent pour les retraits
        onModifyQuantity(product, type === 'add' ? quantityChange : -quantityChange, chantier, agent);
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
                        return (
                            <tr 
                                key={product.id} 
                                style={{ backgroundColor: index % 2 === 0 ? '#d3d3d3' : '#ffffff', cursor: 'pointer' }}
                            >
                                <td style={cellStyle}>{product.code_produit}</td>
                                <td style={cellStyle}>{product.nom_materiel}</td>
                                <td style={cellStyle}>{product.fournisseur || 'N/A'}</td>
                                <td style={cellStyle}>{product.designation || 'N/A'}</td>
                                <td style={{ ...cellStyle, color: stockIsLow ? 'red' : 'black' }}>
                                    {product.quantite_disponible}
                                </td>
                                <td style={cellStyle}>{product.quantite_minimum || 'N/A'}</td>
                                <td style={cellStyle}>{product.prix_unitaire.toFixed(2)} €</td>
                                <td style={cellStyle}>{(product.quantite_disponible * product.prix_unitaire).toFixed(2)} €</td>
                                <td style={cellStyle}>
                                    <button onClick={(e) => { e.stopPropagation(); handleQuantityChange(product, 'add'); }} style={iconButtonStyle}>
                                        <FiPlusCircle style={{ color: 'green', fontSize: '20px' }} />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); handleQuantityChange(product, 'remove'); }} style={iconButtonStyle}>
                                        <FiMinusCircle style={{ color: 'red', fontSize: '20px' }} />
                                    </button>
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
