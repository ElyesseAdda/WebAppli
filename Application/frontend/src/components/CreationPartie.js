import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './../../static/css/partieForm.css';

const CreationPartie = () => {
    const [titre, setTitre] = useState('');
    const [description, setDescription] = useState('');
    const [partieId, setPartieId] = useState(''); // ID de la partie en cours d'édition ou sélectionnée
    const [parties, setParties] = useState([]);
    const [sousPartieId, setSousPartieId] = useState(''); // ID de la sous-partie en cours d'édition
    const [sousParties, setSousParties] = useState([]);
    const [ligneDescription, setLigneDescription] = useState('');
    const [unite, setUnite] = useState('');
    const [prix, setPrix] = useState('');
    const [searchTerm, setSearchTerm] = useState(''); // État pour le texte de recherche

    // États pour la gestion de l'édition
    const [editMode, setEditMode] = useState({});  // { type: 'partie' | 'sousPartie' | 'ligne', id: number }
    const [editValue, setEditValue] = useState('');

    // Fonction pour charger les parties et sous-parties existantes
    const loadParties = () => {
        axios.get('/api/parties/')
            .then(response => {
                setParties(response.data);
            })
            .catch(error => {
                console.error('Erreur lors du chargement des parties', error);
            });
    };

    useEffect(() => {
        loadParties();
    }, []);

    useEffect(() => {
        if (partieId) {
            axios.get(`/api/sous-parties/?partie=${partieId}`)
                .then(response => {
                    setSousParties(response.data);
                })
                .catch(error => {
                    console.error('Erreur lors du chargement des sous-parties', error);
                });
        }
    }, [partieId]);

    const handlePartieSubmit = (e) => {
        e.preventDefault();
        axios.post('/api/parties/', { titre })
            .then(response => {
                console.log('Partie créée', response.data);
                setTitre('');
                setPartieId(response.data.id);
                loadParties();  // Rafraîchir les parties
            })
            .catch(error => {
                console.error('Erreur lors de la création de la partie', error);
            });
    };

    const handleSousPartieSubmit = (e) => {
        e.preventDefault();
        if (!partieId) {
            alert('Veuillez sélectionner une partie.');
            return;
        }
        axios.post('/api/sous-parties/', { description, partie: partieId })
            .then(response => {
                console.log('Sous-partie créée', response.data);
                setDescription('');
                setSousPartieId(response.data.id); // Mettre à jour l'ID de la sous-partie nouvellement créée
                window.location.reload();  // Recharger la page après la création
            })
            .catch(error => {
                console.error('Erreur lors de la création de la sous-partie', error);
            });
    };

    const handleLigneDetailSubmit = (e) => {
        e.preventDefault();
        if (!sousPartieId) {
            alert('Veuillez sélectionner une sous-partie.');
            return;
        }
        axios.post('/api/ligne-details/', { description: ligneDescription, unite, prix, sous_partie: sousPartieId })
            .then(response => {
                console.log('Ligne de détail créée', response.data);
                setLigneDescription('');
                setUnite('');
                setPrix('');
                loadParties();  // Rafraîchir les lignes de détail
            })
            .catch(error => {
                console.error('Erreur lors de la création de la ligne de détail', error);
            });
    };

    // Fonctions pour gérer l'édition des éléments
    const handleEditClick = (type, id, value, relatedPartieId = null) => {
        setEditMode({ type, id });
        setEditValue(value);
        if (type === 'sousPartie') {
            setSousPartieId(id);  // Mémoriser l'id de la sous-partie en cours d'édition
            setPartieId(relatedPartieId); // Mémoriser l'id de la partie associée
        } else if (type === 'ligne') {
            setSousPartieId(relatedPartieId); // Mémoriser l'id de la sous-partie associée
        }
    };

    // Fonction pour valider la mise à jour des éléments (sans double validation)
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
            axios.put(`/api/sous-parties/${editMode.id}/`, { description: editValue, partie: partieId })
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
            const prixNumber = parseFloat(prix);

            // Ajout d'un console.log pour vérifier les données envoyées
            console.log('Données envoyées pour la mise à jour de la ligne de détail:', {
                description,
                unite,
                prix: prixNumber,
                sous_partie: sousPartieId, // Utiliser le sousPartieId mémorisé
            });

            axios.put(`/api/ligne-details/${editMode.id}/`, { description, unite, prix: prixNumber, sous_partie: sousPartieId })
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

    // Fonction de suppression avec double validation
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

    // Fonction pour filtrer les parties et sous-parties en fonction du terme de recherche
    const filteredParties = parties.filter(partie =>
        partie.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        partie.sous_parties.some(sousPartie =>
            sousPartie.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            sousPartie.lignes_details.some(ligne =>
                ligne.description.toLowerCase().includes(searchTerm.toLowerCase())
            )
        )
    );

    return (
        <div className='main-container'>
            <div className='partie'>
                <div className='new-partie'>
                    <h2>Création d'une Partie</h2>
                    <form onSubmit={handlePartieSubmit}>
                        <div style={{margin: "auto",}}>
                            <label>Titre de la Partie: </label>
                            <input 
                                type="text" 
                                value={titre} 
                                onChange={(e) => setTitre(e.target.value)} 
                            />
                        </div>
                        <button type="submit">Créer la Partie</button>
                    </form>
                </div>
                <div className='new-sousPartie'>
                    <h2>Création d'une Sous-Partie</h2>
                    <form onSubmit={handleSousPartieSubmit}>
                        <div style={{margin: "auto",}}>
                            <label>Relier à la Partie: </label>
                            <select 
                                value={partieId} 
                                onChange={(e) => setPartieId(e.target.value)}
                            >
                                <option value="">-- Sélectionner une Partie --</option>
                                {parties.map(partie => (
                                    <option key={partie.id} value={partie.id}>
                                        {partie.titre}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div style={{margin: "auto",}}>
                            <label>Description de la Sous-Partie: </label>
                            <input 
                                type="text" 
                                value={description} 
                                onChange={(e) => setDescription(e.target.value)} 
                            />
                        </div>
                        <button type="submit" disabled={!partieId}>Créer la Sous-Partie</button>
                    </form>
                </div>
                <div className='new-ligneDetail'>                   
                    <h2>Ajouter une Ligne de Détail à une Sous-Partie Existante</h2>
                    <form onSubmit={handleLigneDetailSubmit}>
                        <div style={{margin: "auto",}}>
                            <label>Sélectionner une Sous-Partie: </label>
                            <select 
                                value={sousPartieId} 
                                onChange={(e) => setSousPartieId(e.target.value)}
                            >
                                <option value="">-- Sélectionner une Sous-Partie --</option>
                                {sousParties.map(sousPartie => (
                                    <option key={sousPartie.id} value={sousPartie.id}>
                                        {sousPartie.description}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div style={{margin: "auto",}}>
                            <label>Description: </label>
                            <input 
                                type="text" 
                                value={ligneDescription} 
                                onChange={(e) => setLigneDescription(e.target.value)} 
                            />
                        </div>
                        <div style={{margin: "auto",}}>
                            <label>Unité: </label>
                            <input 
                                type="text" 
                                value={unite} 
                                onChange={(e) => setUnite(e.target.value)} 
                            />
                        </div>
                        <div style={{margin: "auto",}}>
                            <label>Prix: </label>
                            <input 
                                type="number" 
                                step="0.01"
                                value={prix} 
                                onChange={(e) => setPrix(e.target.value)} 
                            />
                        </div>
                        <button type="submit" disabled={!sousPartieId}>Ajouter la Ligne de Détail</button>
                    </form>
                </div>
            </div>
            <div className='list-sousPartie'>  
                <h2>Liste des Parties et Sous-Parties</h2>
                <div>
                    <input className='searchbar'
                        type="text" 
                        placeholder="Rechercher..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                    />
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
                    {editMode.id && (
                        <div>
                            <button className='valider' onClick={handleUpdate}>Valider</button>
                            <button className='supprimer' onClick={handleDelete}>Supprimer</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CreationPartie;
