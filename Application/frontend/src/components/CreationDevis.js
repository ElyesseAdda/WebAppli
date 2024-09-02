import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CreationPartie from './CreationPartie'; // Assurez-vous que le chemin est correct
import './../../static/css/creationDevis.css';

const CreationDevis = () => {
    const [chantiers, setChantiers] = useState([]);
    const [selectedChantierId, setSelectedChantierId] = useState('');
    const [parties, setParties] = useState([]);
    const [selectedParties, setSelectedParties] = useState([]);
    const [sousParties, setSousParties] = useState([]);
    const [filteredSousParties, setFilteredSousParties] = useState([]);
    const [selectedSousParties, setSelectedSousParties] = useState([]);
    const [allLignesDetails, setAllLignesDetails] = useState([]);
    const [filteredLignesDetails, setFilteredLignesDetails] = useState([]);
    const [quantities, setQuantities] = useState({});
    const [customPrices, setCustomPrices] = useState({});
    const [showCreationPartie, setShowCreationPartie] = useState(false); // État pour afficher ou masquer CreationPartie.js

    useEffect(() => {
        axios.get('/api/chantier/')
            .then(response => {
                setChantiers(response.data);
            })
            .catch(error => {
                console.error('Erreur lors du chargement des chantiers', error);
            });
    }, []);

    useEffect(() => {
        if (selectedChantierId) {
            axios.get('/api/parties/')
                .then(response => {
                    setParties(response.data);
                })
                .catch(error => {
                    console.error('Erreur lors du chargement des parties', error);
                });
        }
    }, [selectedChantierId]);

    useEffect(() => {
        axios.get('/api/sous-parties/')
            .then(response => {
                setSousParties(response.data);
            })
            .catch(error => {
                console.error('Erreur lors du chargement des sous-parties', error);
            });
    }, []);

    useEffect(() => {
        if (selectedParties.length > 0) {
            const filtered = sousParties.filter(sousPartie =>
                selectedParties.includes(sousPartie.partie)
            );
            setFilteredSousParties(filtered);
        } else {
            setFilteredSousParties([]);
        }
    }, [selectedParties, sousParties]);

    const handlePartiesChange = (partieId) => {
        const isSelected = selectedParties.includes(partieId);
        if (isSelected) {
            setSelectedParties(selectedParties.filter(id => id !== partieId));
        } else {
            setSelectedParties([...selectedParties, partieId]);
        }
    };

    const handleSousPartiesChange = (sousPartieId) => {
        const isSelected = selectedSousParties.includes(sousPartieId);
        if (isSelected) {
            setSelectedSousParties(selectedSousParties.filter(id => id !== sousPartieId));
        } else {
            setSelectedSousParties([...selectedSousParties, sousPartieId]);
        }
    };

    useEffect(() => {
        if (selectedSousParties.length > 0) {
            axios.get('/api/ligne-details/')
                .then(response => {
                    setAllLignesDetails(response.data);
                })
                .catch(error => {
                    console.error('Erreur lors du chargement des lignes de détail', error);
                });
        } else {
            setAllLignesDetails([]);
        }
    }, [selectedSousParties]);

    useEffect(() => {
        const filtered = allLignesDetails.filter(ligne =>
            selectedSousParties.includes(ligne.sous_partie)
        );
        setFilteredLignesDetails(filtered);
    }, [allLignesDetails, selectedSousParties]);

    const handleQuantityChange = (ligneId, quantity) => {
        setQuantities({ ...quantities, [ligneId]: quantity });
    };

    const handlePriceChange = (ligneId, price) => {
        setCustomPrices({ ...customPrices, [ligneId]: price });
    };

    const handleGenerateDevis = () => {
        const devisData = {
            chantier: selectedChantierId,
            parties: selectedParties,
            sous_parties: selectedSousParties,
            lignes_details: filteredLignesDetails.map(ligne => ({
                id: ligne.id,
                quantity: quantities[ligne.id] || 1,  // Par défaut à 1 si non modifié
                custom_price: customPrices[ligne.id] || ligne.prix  // Utiliser le prix modifié ou le prix original
            }))
        };

        axios.post('/api/devis/', devisData)
            .then(response => {
                console.log('Devis généré:', response.data);
                // Logique pour rediriger ou afficher le PDF du devis
            })
            .catch(error => {
                console.error('Erreur lors de la génération du devis', error);
            });
    };

    return (
        <div className="creation-devis-container">
            <h2>Création de Devis</h2>

            <button onClick={() => setShowCreationPartie(true)}>
                Ajouter une Partie ou Sous-Partie
            </button>

            {showCreationPartie && (
                <div className="creation-partie-overlay">
                    <div className="creation-partie-container">
                        <button onClick={() => setShowCreationPartie(false)}>Fermer</button>
                        <CreationPartie />
                    </div>
                </div>
            )}

            <div className="chantier-selection">
                <label>Sélectionner le Chantier:</label>
                <select
                    value={selectedChantierId}
                    onChange={(e) => setSelectedChantierId(e.target.value)}
                >
                    <option value="">-- Sélectionner un Chantier --</option>
                    {chantiers.map(chantier => (
                        <option key={chantier.id} value={chantier.id}>
                            {chantier.chantier_name}
                        </option>
                    ))}
                </select>
            </div>

            <div className="parties-selection">
                <h3>Sélectionner les Parties</h3>
                {parties.map(partie => (
                    <div key={partie.id}>
                        <input
                            type="checkbox"
                            checked={selectedParties.includes(partie.id)}
                            onChange={() => handlePartiesChange(partie.id)}
                        />
                        <label>{partie.titre}</label>
                    </div>
                ))}
            </div>

            <div className="sous-parties-selection">
                <h3>Sélectionner les Sous-Parties</h3>
                {filteredSousParties.map(sousPartie => (
                    <div key={sousPartie.id}>
                        <input
                            type="checkbox"
                            checked={selectedSousParties.includes(sousPartie.id)}
                            onChange={() => handleSousPartiesChange(sousPartie.id)}
                        />
                        <label>{sousPartie.description}</label>
                    </div>
                ))}
            </div>

            <div className="lignes-details">
                <h3>Lignes de Détail</h3>
                {filteredLignesDetails.map(ligne => (
                    <div key={ligne.id} className="ligne-detail">
                        <div>
                            <label>Description: </label>
                            <span>{ligne.description}</span>
                        </div>
                        <div>
                            <label>Unité: </label>
                            <span>{ligne.unite}</span>
                        </div>
                        <div>
                            <label>Quantité: </label>
                            <input
                                type="number"
                                value={quantities[ligne.id] || ''}
                                onChange={(e) => handleQuantityChange(ligne.id, e.target.value)}
                            />
                        </div>
                        <div>
                            <label>Prix Unitaire: </label>
                            <input
                                type="number"
                                step="0.01"
                                value={customPrices[ligne.id] || ligne.prix}
                                onChange={(e) => handlePriceChange(ligne.id, e.target.value)}
                            />
                        </div>
                    </div>
                ))}
            </div>

            <button onClick={handleGenerateDevis}>Générer le Devis</button>
        </div>
    );
};

export default CreationDevis;
