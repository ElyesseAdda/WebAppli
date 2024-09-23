import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ProductSelection = ({ onSelectProduct }) => {
    const [productList, setProductList] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = () => {
        axios.get('/api/stock/')
            .then(response => {
                setProductList(response.data);
            })
            .catch(error => {
                console.error("Erreur lors du chargement des produits:", error);
            });
    };

    const handleSearch = (e) => {
        setSearchQuery(e.target.value);
    };

    const filteredProducts = productList.filter(product =>
        product.nom_materiel.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div>
            <h2>Sélectionner un produit</h2>
            <input
                type="text"
                placeholder="Rechercher un produit..."
                value={searchQuery}
                onChange={handleSearch}
            />
            <ul>
                {filteredProducts.map(product => (
                    <li key={product.id} onClick={() => onSelectProduct(product)}>
                        {product.code_produit} - {product.nom_materiel} ({product.quantite_disponible} disponibles)
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default ProductSelection;
