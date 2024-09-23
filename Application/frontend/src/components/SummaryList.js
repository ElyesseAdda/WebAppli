import React from 'react';

const SummaryList = ({ summary, onRemoveProduct, onEditProduct }) => {
    return (
        <div>
            <h2>Liste des ajouts</h2>
            <table>
                <thead>
                    <tr>
                        <th>Code Produit</th>
                        <th>Nom</th>
                        <th>Quantité</th>
                        <th>Prix Total</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {summary.map((item, index) => (
                        <tr key={index}>
                            <td>{item.code_produit}</td>
                            <td>{item.nom_materiel}</td>
                            <td>{item.quantite}</td>
                            <td>{(item.quantite * item.prix_unitaire).toFixed(2)} €</td>
                            <td>
                                <button onClick={() => onEditProduct(index)}>Modifier</button>
                                <button onClick={() => onRemoveProduct(index)}>Supprimer</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default SummaryList;
