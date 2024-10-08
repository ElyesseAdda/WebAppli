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
        console.log("Chantier sélectionné : ", chantier);
        console.log("Agent sélectionné : ", agent);
        
        onConfirmChanges(chantier, agent);
    };

    return (
        <div>
            <h2>Résumé des modifications</h2>

            {/* Champs pour le chantier (select) et l'agent */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'left', marginBottom: '10px' }}> 
                <label style={{ marginBottom: '10px', width: '60%' }}>
                    Chantier:  
                    <select 
                        value={chantier}  // L'ID du chantier
                        onChange={(e) => setChantier(e.target.value)}  // Assurez-vous de stocker l'ID du chantier
                        style={{ padding: '10px', width: '60%' }} 
                    >
                        <option value="">Sélectionnez un chantier</option>
                        {chantiers.map((chantier) => (
                            <option key={chantier.id} value={chantier.id}> 
                                {chantier.chantier_name}
                            </option>
                        ))}
                    </select>
                </label>
                <label style={{ marginBottom: '10px', width: '60%' }}> 
                    Agent:  
                    <input 
                        type="text" 
                        value={agent}
                        onChange={(e) => setAgent(e.target.value)}
                        placeholder="Nom de l'agent"
                        style={{ padding: '10px', width: '60%' }}  
                    />
                </label>
            </div>

            <table style={tableStyle}>
                <thead>
                    <tr>
                        <th style={headerStyle}>Nom Produit</th>
                        <th style={headerStyle}>Prix Unitaire</th>
                        <th style={headerStyle}>Quantité</th>
                        <th style={headerStyle}>Montant Total</th>
                        <th style={{ ...headerStyle, ...actionCellStyle }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {modifications.map((item, index) => {
                        const montantTotal = (item.prix_unitaire * item.quantite).toFixed(2);  // Calcul du montant total
                        const montantTotalStyle = { color: montantTotal >= 0 ? 'green' : 'red' };  // Style conditionnel

                        return (
                            <tr key={index} style={{ backgroundColor: index % 2 === 0 ? 'white' : 'rgb(204, 204, 204)' }}>
                                <td style={cellStyle}>{item.nom_materiel}</td>
                                
                                {/* Affichage du prix unitaire */}
                                <td style={cellStyle}>
                                    {item.prix_unitaire.toFixed(2)} €
                                </td>

                                {/* La quantité peut être positive ou négative selon l'opération */}
                                <td style={cellStyle}>
                                    <input 
                                        type="number" 
                                        value={item.quantite}
                                        onChange={(e) => {
                                            const newQuantity = Number(e.target.value);
                                            // Permet de gérer des valeurs négatives pour les retraits
                                            onModifyItem(item.id, newQuantity);
                                        }}
                                        style={{ width: '60px' }}
                                    />
                                </td>

                                {/* Affichage du montant total avec couleur conditionnelle */}
                                <td style={{ ...cellStyle, ...montantTotalStyle }}>
                                    {montantTotal} €
                                </td>

                                <td style={{ ...actionCellStyle, ...cellStyle }}>
                                    {/* Bouton Supprimer avec couleur rouge et espacement de 10px */}
                                    <button 
                                        onClick={() => onRemoveItem(item.id)} 
                                        style={{ ...buttonStyle, backgroundColor: 'red', marginLeft: '10px' }}
                                    >
                                        Supprimer
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
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
