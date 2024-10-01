import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SummaryList = ({ modifications, onModifyItem, onRemoveItem, onConfirmChanges }) => {
    // États locaux pour le chantier et l'agent
    const [chantier, setChantier] = useState('');
    const [agent, setAgent] = useState('');
    const [chantiers, setChantiers] = useState([]);

    // Récupérer la liste des chantiers lors du chargement du composant
    useEffect(() => {
        axios.get('/api/chantier/')  // Assurez-vous que cette URL correspond à votre API
            .then(response => {
                setChantiers(response.data);  // Mettre à jour la liste des chantiers
            })
            .catch(error => {
                console.error("Erreur lors de la récupération des chantiers :", error);
            });
    }, []);

    const handleConfirm = () => {
        // Pas d'alerte obligatoire pour le chantier et l'agent
        onConfirmChanges(chantier, agent);
    };

    return (
        <div>
            <h2>Résumé des modifications</h2>

            {/* Champs pour le chantier (select) et l'agent, placés en haut et alignés sur la même ligne */}
            <div style={{ display: 'flex', justifyContent: 'left', marginBottom: '20px' }}>
                <label style={{ marginRight: '20px' }}>
                    Chantier:     
                    <select 
                        value={chantier}
                        onChange={(e) => setChantier(e.target.value)}
                        style={{ padding: '5px' }}
                    >
                        <option value="">Sélectionnez un chantier</option>
                        {chantiers.map((chantier) => (
                            <option key={chantier.id} value={chantier.chantier_name}>
                                {chantier.chantier_name}
                            </option>
                        ))}
                    </select>
                </label>
                <label>
                    Agent:     
                    <input 
                        type="text" 
                        value={agent}
                        onChange={(e) => setAgent(e.target.value)}
                        placeholder="Nom de l'agent"
                    />
                </label>
            </div>

            <table style={tableStyle}>
                <thead>
                    <tr>
                        <th style={headerStyle}>Nom Produit</th>
                        <th style={headerStyle}>Quantité</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {modifications.map((item, index) => (
                        <tr key={index} style={{ backgroundColor: index % 2 === 0 ? 'white' : 'rgb(204, 204, 204)' }}>
                            <td>{item.nom_materiel}</td>
                            <td>{item.quantite}</td>
                            <td>
                                {/* Bouton Modifier */}
                                <button onClick={() => onModifyItem(item.id, item.quantite)} style={buttonStyle}>
                                    Modifier
                                </button>

                                {/* Bouton Supprimer avec couleur rouge et espacement de 10px */}
                                <button 
                                    onClick={() => onRemoveItem(item.id)} 
                                    style={{ ...buttonStyle, backgroundColor: 'red', marginLeft: '10px' }}
                                >
                                    Supprimer
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Bouton pour confirmer les modifications */}
            <button onClick={handleConfirm} style={confirmButtonStyle}>Confirmer les modifications</button>
        </div>
    );
};

// Styles
const tableStyle = {
    width: '80%',
    borderCollapse: 'collapse',
};

const headerStyle = {
    fontWeight: 'bold',
    textAlign: 'left',
    padding: '10px',
    borderBottom: '1px solid #ccc',
};

const buttonStyle = {
    padding: '8px 12px',
    cursor: 'pointer',
    borderRadius: '4px',
    border: 'none',
    color: 'white',
    fontWeight: 'bold',
};

const confirmButtonStyle = {
    marginTop: '20px',
    padding: '10px 20px',
    backgroundColor: 'green',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
};

export default SummaryList;
