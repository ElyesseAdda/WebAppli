import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CreationPartie from './CreationPartie'; // Assurez-vous que le chemin est correct
import './../../static/css/creationDevis.css';
import ListePartiesSousParties from './ListPartiesSousParties';

const CreationDevis = () => {
    const [chantiers, setChantiers] = useState([]);
    const [selectedChantierId, setSelectedChantierId] = useState('');
    const [parties, setParties] = useState([]);
    const [selectedParties, setSelectedParties] = useState([]);
    const [sousParties, setSousParties] = useState([]);
    const [filteredSousParties, setFilteredSousParties] = useState({});
    const [selectedSousParties, setSelectedSousParties] = useState([]);
    const [allLignesDetails, setAllLignesDetails] = useState([]);
    const [filteredLignesDetails, setFilteredLignesDetails] = useState([]);
    const [quantities, setQuantities] = useState({});
    const [customPrices, setCustomPrices] = useState({});
    const [showCreationPartie, setShowCreationPartie] = useState(false);
    const [newPartie, setNewPartie] = useState('');
    const [newSousPartie, setNewSousPartie] = useState('');
    const [selectedPartieForSousPartie, setSelectedPartieForSousPartie] = useState('');

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
            refreshPartiesAndSousParties();
        }
    }, [selectedChantierId]);

    const refreshPartiesAndSousParties = () => {
        axios.get('/api/parties/')
            .then(response => {
                setParties(response.data);
            })
            .catch(error => {
                console.error('Erreur lors du chargement des parties', error);
            });

        axios.get('/api/sous-parties/')
            .then(response => {
                setSousParties(response.data);
            })
            .catch(error => {
                console.error('Erreur lors du chargement des sous-parties', error);
            });
    };

    useEffect(() => {
        // Filtrage des sous-parties par partie cochée
        const newFilteredSousParties = {};
        selectedParties.forEach(partieId => {
            newFilteredSousParties[partieId] = sousParties.filter(sousPartie => sousPartie.partie === partieId);
        });
        setFilteredSousParties(newFilteredSousParties);
    }, [selectedParties, sousParties]);

    const handlePartiesChange = (partieId) => {
        const isSelected = selectedParties.includes(partieId);
        if (isSelected) {
            setSelectedParties(selectedParties.filter(id => id !== partieId));
            setSelectedSousParties(selectedSousParties.filter(sousPartie => sousPartie.partie !== partieId)); // Déselectionner les sous-parties si la partie est déselectionnée
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
                quantity: quantities[ligne.id] || 1,
                custom_price: customPrices[ligne.id] || ligne.prix
            }))
        };

        axios.post('./api/devisa', devisData)
            .then(response => {
                console.log('Devis généré:', response.data);
                return axios.get('./api/generate-pdf/');
            })
            .then(response => {
                console.log('PDF généré avec succès');
            })
            .catch(error => {
                console.error('Erreur lors de la génération du PDF:', error);
            });
    };

    const handlePreviewDevis = () => {
        const devisData = {
            chantier: selectedChantierId,
            parties: selectedParties.map(partieId => {
                // Pour chaque partie sélectionnée, associer uniquement les sous-parties cochées
                const filteredSousParties = selectedSousParties
                    .filter(sousPartieId => sousParties.find(sousPartie => sousPartie.id === sousPartieId && sousPartie.partie === partieId));
                
                return {
                    id: partieId,
                    titre: parties.find(partie => partie.id === partieId).titre,
                    sous_parties: filteredSousParties.map(sousPartieId => {
                        const sousPartie = sousParties.find(sousPartie => sousPartie.id === sousPartieId);
                        return {
                            id: sousPartie.id,
                            description: sousPartie.description,
                            lignes_details: filteredLignesDetails.filter(ligne => ligne.sous_partie === sousPartie.id)
                        };
                    })
                };
            })
        };
    
        // Ouvrir un nouvel onglet avec les données du devis
        const queryString = encodeURIComponent(JSON.stringify(devisData));
        const previewUrl = `/api/preview-devis/?devis=${queryString}`;
        window.open(previewUrl, '_blank');
    };

    const handleCreatePartie = () => {
        axios.post('/api/parties/', { titre: newPartie })
            .then(() => {
                setNewPartie('');
                refreshPartiesAndSousParties(); // Actualiser les parties après création
            })
            .catch(error => {
                console.error('Erreur lors de la création de la partie', error);
            });
    };

    const handleCreateSousPartie = () => {
        axios.post('/api/sous-parties/', { description: newSousPartie, partie: selectedPartieForSousPartie })
            .then(() => {
                setNewSousPartie('');
                refreshPartiesAndSousParties(); // Actualiser les sous-parties après création
            })
            .catch(error => {
                console.error('Erreur lors de la création de la sous-partie', error);
            });
    };

    return (
        <div>
            <ListePartiesSousParties />
            <div className="creation-devis-container">

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
                    {selectedParties.map(partieId => (
                        <div key={partieId}>
                            <h4>Sous-Parties pour {parties.find(partie => partie.id === partieId)?.titre}</h4>
                            {filteredSousParties[partieId]?.map(sousPartie => (
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

                <button onClick={handleGenerateDevis}>Générer Devis</button>
                <button onClick={handlePreviewDevis}>Prévisualiser Devis</button>

                <div className="creation-partie">
                    <h3>Créer une nouvelle Partie</h3>
                    <input 
                        type="text" 
                        value={newPartie} 
                        onChange={(e) => setNewPartie(e.target.value)} 
                        placeholder="Nom de la nouvelle Partie" 
                    />
                    <button onClick={handleCreatePartie}>Créer Partie</button>
                </div>

                <div className="creation-sous-partie">
                    <h3>Créer une nouvelle Sous-Partie</h3>
                    <select 
                        value={selectedPartieForSousPartie} 
                        onChange={(e) => setSelectedPartieForSousPartie(e.target.value)}
                    >
                        <option value="">-- Sélectionner une Partie --</option>
                        {parties.map(partie => (
                            <option key={partie.id} value={partie.id}>{partie.titre}</option>
                        ))}
                    </select>
                    <input 
                        type="text" 
                        value={newSousPartie} 
                        onChange={(e) => setNewSousPartie(e.target.value)} 
                        placeholder="Nom de la nouvelle Sous-Partie" 
                    />
                    <button onClick={handleCreateSousPartie}>Créer Sous-Partie</button>
                </div>
            </div>
        </div>
    );
};

export default CreationDevis;
