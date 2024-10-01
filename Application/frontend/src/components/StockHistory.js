import React from 'react';

const StockHistory = ({ movements, selectedProduct }) => {
    return (
        <div>
            {selectedProduct ? (
                <div>
                    <h2>Historique des mouvements pour le produit {selectedProduct}</h2>
                    {movements.length > 0 ? (
                        <table>
                            <thead>
                                <tr>
                                    <th>Date</th>  {/* Nouvelle colonne pour la date */}
                                    <th>Type</th>
                                    <th>Quantité</th>
                                    <th>Chantier</th>
                                    <th>Agent</th>
                                </tr>
                            </thead>
                            <tbody>
                                {movements.map((movement) => (
                                    <tr key={movement.id}>
                                        <td>{new Date(movement.date_mouvement).toLocaleDateString()}</td>  {/* Affichage de la date */}
                                        <td>{movement.mouvement_type}</td>
                                        <td>{movement.quantite}</td>
                                        <td>{movement.chantier ? movement.chantier.nom : 'N/A'}</td>
                                        <td>{movement.agent ? movement.agent.name : 'N/A'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p>Aucun mouvement trouvé pour ce produit.</p>
                    )}
                </div>
            ) : (
                <p>Sélectionnez un produit pour voir l'historique des mouvements.</p>
            )}
        </div>
    );
};

export default StockHistory;
