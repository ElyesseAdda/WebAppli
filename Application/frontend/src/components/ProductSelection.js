import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiPlusCircle, FiMinusCircle } from "react-icons/fi";

const ProductSelection = ({ onModifyQuantity }) => {
    const [productList, setProductList] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSummaryList, setShowSummaryList] = useState(false); 
    const [summary, setSummary] = useState([]);  
    const [isEditing, setIsEditing] = useState(false);   
    const [editedProductList, setEditedProductList] = useState([]);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = () => {
        axios.get('/api/stock/')
            .then(response => {
                setProductList(response.data);
                setEditedProductList(response.data);
            })
            .catch(error => {
                console.error("Erreur lors du chargement des produits:", error);
            });
    };

    const handleSearch = (e) => {
        const query = e.target.value.toLowerCase();
        setSearchQuery(query);
    };

    const filteredProducts = editedProductList.filter(product =>
        product.nom_materiel.toLowerCase().includes(searchQuery.toLowerCase()) || 
        product.code_produit.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (product.fournisseur && product.fournisseur.toLowerCase().includes(searchQuery.toLowerCase())) 
    );

    const handleQuantityChange = (product, type) => {
        let action = type === 'add' ? 'ajouter' : 'retirer';
        const quantite = prompt(`Entrez la quantité à ${action} pour ${product.nom_materiel}`);
    
        if (quantite === null) return; 
        if (isNaN(quantite) || parseInt(quantite) <= 0) {
            alert("Veuillez entrer une quantité valide positive.");
            return;
        }
    
        const quantityChange = parseInt(quantite);
    
        if (type === 'retirer' && product.quantite_disponible < quantityChange) {
            alert("Quantité insuffisante pour retirer cette quantité.");
            return;
        }
    
        const newItem = {
            id: product.id,
            code_produit: product.code_produit,
            nom_materiel: product.nom_materiel,
            quantite: type === 'add' ? quantityChange : -quantityChange,
            prix_unitaire: product.prix_unitaire
        };
    
        setSummary([...summary, newItem]); 
        setShowSummaryList(true); 
    };

    const handleRemoveProduct = (index) => {
        const newSummary = [...summary];
        newSummary.splice(index, 1);
        setSummary(newSummary);
        if (newSummary.length === 0) setShowSummaryList(false);
    };

    const handleEditProduct = (index) => {
        const product = summary[index];
        const newQuantity = prompt(`Modifier la quantité pour ${product.nom_materiel}`, product.quantite);
        if (newQuantity !== null && !isNaN(newQuantity) && parseInt(newQuantity) !== 0) {
            const newSummary = [...summary];
            newSummary[index].quantite = parseInt(newQuantity);
            setSummary(newSummary);
        }
    };

    const toggleEditMode = () => {
        setIsEditing(!isEditing);
    };

    const handleSaveChanges = () => {
        setIsEditing(false);
        console.log("Produits modifiés:", editedProductList);
    };

    const handleProductChange = (index, field, value) => {
        const updatedProducts = [...editedProductList];
        updatedProducts[index][field] = value;
        setEditedProductList(updatedProducts);
    };

    const handleValidateChanges = () => {
        summary.forEach(item => {
            if (item.quantite > 0) {
                handleAddStock(item);
            } else {
                handleRemoveStock(item);
            }
        });

        setSummary([]);
        setShowSummaryList(false);
        fetchProducts();  // Refetch products after validation
    };

    const handleAddStock = (item) => {
        axios.post(`/api/stock/${item.id}/add_stock/`, {
            quantite: item.quantite,
            commentaire: "Ajout de stock"
        })
        .then(response => {
            console.log("Stock ajouté avec succès :", response.data);
            
            setProductList(prevProductList => prevProductList.map(product => {
                if (product.id === item.id) {
                    return { ...product, quantite_disponible: product.quantite_disponible + item.quantite };
                }
                return product;
            }));
        })
        .catch(error => {
            console.error("Erreur lors de l'ajout du stock :", error);
        });
    };

    const handleRemoveStock = (item) => {
        axios.post(`/api/stock/${item.id}/remove_stock/`, {
            quantite: -item.quantite,
            chantier_id: item.chantier_id,
            agent_id: item.agent_id,
            commentaire: "Retrait de stock"
        })
        .then(response => {
            console.log("Stock retiré avec succès :", response.data);
            
            setProductList(prevProductList => prevProductList.map(product => {
                if (product.id === item.id) {
                    return { ...product, quantite_disponible: product.quantite_disponible - item.quantite };
                }
                return product;
            }));
        })
        .catch(error => {
            console.error("Erreur lors du retrait du stock :", error);
        });
    };

    return (
        <div style={mainContainer}>
            <h2>Sélectionner un produit</h2>
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '20px' }}>
                <input 
                    type="text"
                    placeholder="Rechercher un produit..."
                    value={searchQuery}
                    onChange={handleSearch}
                    style={{ width: '300px', marginRight: 'auto' }}
                />
                <button onClick={toggleEditMode}>
                    {isEditing ? 'Enregistrer' : 'Modifier'}
                </button>
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
                        const stockIsLow = product.stock_minimum && product.quantite_disponible < product.stock_minimum;
                        return (
                            <tr key={product.id} style={{ backgroundColor: index % 2 === 0 ? '#d3d3d3' : '#ffffff' }}>
                                <td style={cellStyle}>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={product.code_produit}
                                            onChange={(e) => handleProductChange(index, 'code_produit', e.target.value)}
                                        />
                                    ) : product.code_produit}
                                </td>
                                <td style={cellStyle}>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={product.nom_materiel}
                                            onChange={(e) => handleProductChange(index, 'nom_materiel', e.target.value)}
                                        />
                                    ) : product.nom_materiel}
                                </td>
                                <td style={cellStyle}>{product.fournisseur || 'N/A'}</td>
                                <td style={cellStyle}>{product.designation || 'N/A'}</td>
                                <td style={{ ...cellStyle, color: stockIsLow ? 'red' : 'black' }}>
                                    {product.quantite_disponible}
                                </td>
                                <td style={cellStyle}>{product.stock_minimum || 'N/A'}</td>
                                <td style={cellStyle}>{product.prix_unitaire.toFixed(2)} €</td>
                                <td style={cellStyle}>{(product.quantite_disponible * product.prix_unitaire).toFixed(2)} €</td>
                                <td style={cellStyle}>
                                    <button onClick={() => handleQuantityChange(product, 'add')} style={iconButtonStyle}>
                                        <FiPlusCircle style={{ color: 'green', fontSize: '20px', backgroundColor: 'transparent' }} />
                                    </button>
                                    <button onClick={() => handleQuantityChange(product, 'remove')} style={iconButtonStyle}>
                                        <FiMinusCircle style={{ color: 'red', fontSize: '20px', backgroundColor: 'transparent' }} />
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {isEditing && (
                <div style={{ textAlign: 'right', marginTop: '20px' }}>
                    <button onClick={handleSaveChanges}>Enregistrer les modifications</button>
                </div>
            )}

            {showSummaryList && (
                <div style={summaryContainerStyle}>
                    <h2>Liste des ajouts et retraits</h2>
                    <ul style={listStyle}>
                        {summary.map((item, index) => (
                            <li 
                                key={index} 
                                style={{ 
                                    ...listItemStyle, 
                                    backgroundColor: index % 2 === 0 ? '#d3d3d3' : '#ffffff', 
                                    padding: '20px', 
                                    borderRadius: '10px' 
                                }}>
                                <div>
                                    <h3 style={productAdd}>{item.nom_materiel}</h3>
                                    <p style={labelStyle}><strong>Code Produit :</strong></p> 
                                    <p style={valueStyle}>{item.code_produit}</p>
                                    <p style={labelStyle}><strong>Quantité Changement :</strong></p>
                                    <p style={{ ...valueStyle, color: item.quantite > 0 ? 'green' : 'red' }}>
                                        {item.quantite > 0 ? `+${item.quantite}` : item.quantite}
                                    </p>
                                    <p style={labelStyle}><strong>Prix Total :</strong></p>
                                    <p style={valueStyle}>{(item.quantite * item.prix_unitaire).toFixed(2)} €</p>
                                </div>
                                <div style={buttonContainerStyle}>
                                    <button onClick={() => handleEditProduct(index)}>Modifier</button>
                                    <button 
                                        onClick={() => handleRemoveProduct(index)} 
                                        style={deleteButtonStyle}
                                    >
                                        Supprimer
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                    <button onClick={handleValidateChanges} style={validateButtonStyle}>Valider les changements</button>
                </div>
            )}
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

const summaryContainerStyle = {
    backgroundColor: 'white',
    borderRadius: '10px',
    padding: '20px',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
    marginTop: '20px',
};

const listStyle = {
    listStyleType: 'none',
    padding: 0,
};

const listItemStyle = {
    borderBottom: '1px solid #ccc',
    paddingBottom: '20px',
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'space-between',
};

const buttonContainerStyle = {
    display: 'flex',
    gap: '10px',
};

const productAdd = {
    backgroundColor: 'transparent',
    color: 'rgba(27, 120, 188, 1)'
};

const labelStyle = {
    fontWeight: '400', 
};

const valueStyle = {
    fontWeight: '600', 
};

const deleteButtonStyle = {
    backgroundColor: 'red',
    color: 'white',
    borderRadius: '5px',
    border: 'none',
    cursor: 'pointer'
};

const iconButtonStyle = {
    backgroundColor: 'transparent', 
    border: 'none',
    cursor: 'pointer'
};

const validateButtonStyle = {
    backgroundColor: 'green',
    color: 'white',
    borderRadius: '5px',
    border: 'none',
    padding: '10px 20px',
    cursor: 'pointer',
    marginTop: '20px'
};

export default ProductSelection;
