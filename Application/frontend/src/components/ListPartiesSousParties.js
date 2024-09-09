import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './../../static/css/listPartie.css';
import CreationPartie from './CreationPartie';
import { FaSearch } from "react-icons/fa";

const ListePartiesSousParties = () => {
    const [parties, setParties] = useState([]);
    const [editMode, setEditMode] = useState({});
    const [editValue, setEditValue] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Charger les parties au démarrage
    useEffect(() => {
        loadParties();
    }, []);

    // Charger les parties existantes
    const loadParties = () => {
        axios.get('/api/parties/')
            .then(response => {
                setParties(response.data);
            })
            .catch(error => {
                console.error('Erreur lors du chargement des parties', error);
            });
    };

    // Activer le mode édition
    const handleEditClick = (type, id, value, relatedPartieId = null) => {
        setEditMode({ type, id, relatedPartieId });
        setEditValue(value);
    };

    // Valider la mise à jour
    const handleUpdate = () => {
        if (editMode.type === 'partie') {
            axios.put(`/api/parties/${editMode.id}/`, { titre: editValue })
                .then(() => {
                    console.log('Partie mise à jour');
                    setEditMode({});
                    loadParties();
                })
                .catch(error => {
                    console.error('Erreur lors de la mise à jour de la partie', error);
                });
        } else if (editMode.type === 'sousPartie') {
            axios.put(`/api/sous-parties/${editMode.id}/`, { description: editValue, partie: editMode.relatedPartieId })
                .then(() => {
                    console.log('Sous-partie mise à jour');
                    setEditMode({});
                    loadParties();
                })
                .catch(error => {
                    console.error('Erreur lors de la mise à jour de la sous-partie', error);
                });
        } else if (editMode.type === 'ligne') {
            const [description, unite, prix] = editValue.split('|');
            axios.put(`/api/ligne-details/${editMode.id}/`, {
                description,
                unite,
                prix: parseFloat(prix),
                sous_partie: editMode.relatedPartieId
            })
                .then(() => {
                    console.log('Ligne de détail mise à jour');
                    setEditMode({});
                    loadParties();
                })
                .catch(error => {
                    console.error('Erreur lors de la mise à jour de la ligne de détail', error);
                });
        }
    };

    // Supprimer l'élément
    const handleDelete = () => {
        const confirmed = window.confirm('Êtes-vous sûr de vouloir supprimer cet élément ?');
        if (confirmed) {
            if (editMode.type === 'partie') {
                axios.delete(`/api/parties/${editMode.id}/`)
                    .then(() => {
                        console.log('Partie supprimée');
                        setEditMode({});
                        loadParties();
                    })
                    .catch(error => {
                        console.error('Erreur lors de la suppression de la partie', error);
                    });
            } else if (editMode.type === 'sousPartie') {
                axios.delete(`/api/sous-parties/${editMode.id}/`)
                    .then(() => {
                        console.log('Sous-partie supprimée');
                        setEditMode({});
                        loadParties();
                    })
                    .catch(error => {
                        console.error('Erreur lors de la suppression de la sous-partie', error);
                    });
            } else if (editMode.type === 'ligne') {
                axios.delete(`/api/ligne-details/${editMode.id}/`)
                    .then(() => {
                        console.log('Ligne de détail supprimée');
                        setEditMode({});
                        loadParties();
                    })
                    .catch(error => {
                        console.error('Erreur lors de la suppression de la ligne de détail', error);
                    });
            }
        }
    };

    // Filtrer les résultats avec le terme de recherche
    const filteredParties = parties.filter(partie =>
        // Vérifier que partie.titre existe avant d'appeler toLowerCase
        (partie.titre && partie.titre.toLowerCase().includes(searchTerm.toLowerCase())) ||
    
        // Vérifier que partie.sous_parties existe et n'est pas vide
        (partie.sous_parties && partie.sous_parties.some(sousPartie =>
            // Vérifier que sousPartie.description existe avant d'appeler toLowerCase
            (sousPartie.description && sousPartie.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
            
            // Vérifier que sousPartie.lignes_details existe et n'est pas vide
            (sousPartie.lignes_details && sousPartie.lignes_details.some(ligne =>
                // Vérifier que ligne.description existe avant d'appeler toLowerCase
                ligne.description && ligne.description.toLowerCase().includes(searchTerm.toLowerCase())
            ))
        ))
    );
    

    return (
        <div className='main-container'>
            {/* Barre de recherche */}
            <div className='searchbar-container'>
                <FaSearch className='search-icon' />
                <input
                    type="text"
                    className="searchbar"
                    placeholder="Rechercher..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Liste des Parties et Sous-Parties */}
            <div className='list-sousPartie'>
                <h2>Liste des Parties et Sous-Parties</h2>
                <div>
                    {filteredParties.map(partie => (
                        <div key={partie.id}>
                            {editMode.type === 'partie' && editMode.id === partie.id ? (
                                <input
                                    type="text"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                />
                            ) : (
                                <h3 onClick={() => handleEditClick('partie', partie.id, partie.titre)}>
                                    {partie.titre}
                                </h3>
                            )}
                            {partie.sous_parties.map(sousPartie => (
                                <div key={sousPartie.id}>
                                    {editMode.type === 'sousPartie' && editMode.id === sousPartie.id ? (
                                        <input
                                            type="text"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                        />
                                    ) : (
                                        <h4 onClick={() => handleEditClick('sousPartie', sousPartie.id, sousPartie.description, partie.id)}>
                                            {sousPartie.description}
                                        </h4>
                                    )}
                                    <ul>
                                        {sousPartie.lignes_details.map(ligne => (
                                            <li key={ligne.id}>
                                                {editMode.type === 'ligne' && editMode.id === ligne.id ? (
                                                    <div>
                                                        <input
                                                            type="text"
                                                            value={editValue.split('|')[0]}
                                                            onChange={(e) => setEditValue(`${e.target.value}|${editValue.split('|')[1]}|${editValue.split('|')[2]}`)}
                                                        />
                                                        <input
                                                            type="text"
                                                            value={editValue.split('|')[1]}
                                                            onChange={(e) => setEditValue(`${editValue.split('|')[0]}|${e.target.value}|${editValue.split('|')[2]}`)}
                                                        />
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={editValue.split('|')[2]}
                                                            onChange={(e) => setEditValue(`${editValue.split('|')[0]}|${editValue.split('|')[1]}|${e.target.value}`)}
                                                        />
                                                    </div>
                                                ) : (
                                                    <span onClick={() => handleEditClick('ligne', ligne.id, `${ligne.description}|${ligne.unite}|${ligne.prix}`, sousPartie.id)}>
                                                        {ligne.description} ({ligne.unite}) - {ligne.prix} €
                                                    </span>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
            
            {/* Bouton de validation et de suppression */}
            {editMode.id && (
                <div>
                    <button className='valider' onClick={handleUpdate}>Valider</button>
                    <button className='supprimer' onClick={handleDelete}>Supprimer</button>
                </div>
            )}
            
            {/* Formulaire de création de partie */}
            <CreationPartie refreshData={loadParties} />
        </div>
    );
};

export default ListePartiesSousParties;
