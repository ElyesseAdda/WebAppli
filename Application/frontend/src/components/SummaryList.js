import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SummaryList = ({ modifications, onModifyItem, onRemoveItem, onConfirmChanges }) => {
    const [chantier, setChantier] = useState('');
    const [agent, setAgent] = useState('');
    const [chantiers, setChantiers] = useState([]);

    useEffect(() => {
        axios.get('/api/chantier/')
            .then(response => {
                setChantiers(response.data);
            })
            .catch(error => {
                console.error("Erreur lors de la récupération des chantiers :", error);
            });
    }, []);

    const handleConfirm = () => {
        // Ajout de log pour vérifier si chantier et agent sont bien sélectionnés
        console.log("Chantier sélectionné : ", chantier);
        console.log("Agent sélectionné : ", agent);
        
        onConfirmChanges(chantier, agent);
    };

    return (
        <div>
            <h2>Résumé des modifications</h2>

            {/* Champs pour le chantier (select) et l'agent */}
            <div style={{ display: 'flex', justifyContent: 'left', marginBottom: '20px' }}>
            <label style={{ marginRight: '20px' }}>
                Chantier:     
                <select 
                    value={chantier}  // L'ID du chantier
                    onChange={(e) => setChantier(e.target.value)}  // Assurez-vous de stocker l'ID du chantier
                    style={{ padding: '5px' }}
                >
                    <option value="">Sélectionnez un chantier</option>
                    {chantiers.map((chantier) => (
                        <option key={chantier.id} value={chantier.id}>  {/* Utilisez l'ID ici */}
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
                        <th style={{ ...headerStyle, ...actionCellStyle }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {modifications.map((item, index) => (
                        <tr key={index} style={{ backgroundColor: index % 2 === 0 ? 'white' : 'rgb(204, 204, 204)' }}>
                            <td style={cellStyle}>{item.nom_materiel}</td>
                            <td style={cellStyle}>{item.quantite}</td>
                            <td style={{ ...actionCellStyle, ...cellStyle }}>
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
    width: '90%',
    borderCollapse: 'collapse',
};

const headerStyle = {
    fontWeight: 'bold',
    textAlign: 'left',
    padding: '10px',
    borderBottom: '1px solid #ccc',
};

// Style pour les cellules du tableau
const cellStyle = {
    fontWeight: '700', // Un poids de police plus important pour les éléments du tableau
    padding: '8px',
};

const buttonStyle = {
    padding: '8px 12px',
    cursor: 'pointer',
    borderRadius: '4px',
    border: 'none',
    color: 'white',
    fontWeight: 'bold',
};

const actionCellStyle = {
    textAlign: 'center',
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
