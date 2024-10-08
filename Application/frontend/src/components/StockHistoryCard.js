import React, { useState, useEffect } from 'react';
import axios from 'axios';

const StockHistoryCard = () => {
    const [groupedHistory, setGroupedHistory] = useState({});
    const [selectedDate, setSelectedDate] = useState(null);
    const [filterType, setFilterType] = useState('');  // Filtre pour le type d'opération (ajout, retrait)
    const [searchQuery, setSearchQuery] = useState('');  // Barre de recherche
    const [currentPage, setCurrentPage] = useState(1);  // Pagination - page actuelle
    const [totalPages, setTotalPages] = useState(1);    // Pagination - nombre total de pages

    useEffect(() => {
        fetchHistory(currentPage);  // Charger l'historique au montage du composant
    }, [currentPage]);

    const fetchHistory = (page = 1) => {
        axios.get(`/api/historique_stock/?page=${page}`)
            .then(response => {
                const data = response.data.results || response.data;
                if (Array.isArray(data)) {
                    const grouped = groupBy(data, 'date_operation');
                    setGroupedHistory(grouped);
                    setTotalPages(response.data.total_pages || 1);  // Mettre à jour le nombre total de pages
                } else {
                    console.error("Les données récupérées ne sont pas un tableau :", data);
                }
            })
            .catch(error => {
                console.error("Erreur lors de la récupération de l'historique :", error);
            });
    };

    const groupBy = (array, key) => {
        return array.reduce((result, currentValue) => {
            const date = new Date(currentValue[key]);
            const formattedDate = `${date.toLocaleDateString()} - ${date.getHours()}:${date.getMinutes()}`;

            if (!result[formattedDate]) {
                result[formattedDate] = [];
            }
            result[formattedDate].push(currentValue);
            return result;
        }, {});
    };

    const showDetails = (date) => {
        setSelectedDate(date);
    };

    const hideDetails = () => {
        setSelectedDate(null);
    };

    const calculateSums = (operations) => {
        let totalAjout = 0;
        let totalRetrait = 0;

        operations.forEach(item => {
            const montant = parseFloat(item.montant) || 0;
            if (item.type_operation === 'ajout') {
                totalAjout += montant;
            } else if (item.type_operation === 'retrait') {
                totalRetrait += montant;
            }
        });

        return { totalAjout, totalRetrait };
    };

    // Fonction pour filtrer les cartes (groupes d'opérations) en fonction du filtre et de la recherche
    const filterCards = (groupedHistory) => {
        return Object.keys(groupedHistory).reduce((result, date) => {
            const operations = groupedHistory[date];
    
            const filteredOperations = operations.filter(item => {
                const matchType = filterType ? item.type_operation === filterType : true;
    
                // Ajouter le signe négatif si c'est un retrait
                const montantString = item.type_operation === 'retrait'
                    ? `-${item.montant.toString()}`
                    : item.montant.toString();
    
                const quantiteString = item.quantite ? item.quantite.toString() : '';
                const formattedDate = new Date(item.date_operation).toLocaleDateString();
    
                const matchSearch = searchQuery
                    ? (item.stock?.nom_materiel?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                       item.stock?.code_produit?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                       (item.chantier?.chantier_name && item.chantier.chantier_name.toLowerCase().includes(searchQuery.toLowerCase())) || 
                       (item.agent?.name && item.agent.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                       montantString.includes(searchQuery) || quantiteString.includes(searchQuery) ||
                       formattedDate.includes(searchQuery))
                    : true;
    
                return matchType && matchSearch;
            });
    
            if (filteredOperations.length > 0) {
                result[date] = filteredOperations;
            }
    
            return result;
        }, {});
    };
    

    const nextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };

    const prevPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    const filteredHistory = filterCards(groupedHistory);  // Appliquer le filtre aux cartes

    return (
        <div>
            <h2>Historique de gestion de stock</h2>

            {/* Barre de recherche */}
            <div style={{ marginBottom: '20px' }}>
                <input 
                    type="text" 
                    placeholder="Rechercher dans l'historique..." 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                    style={{ padding: '10px', width: '300px' }}
                />
            </div>

            {/* Sélecteur pour filtrer par type d'opération */}
            <div style={{ marginBottom: '20px' }}>
                <label htmlFor="filterType">Filtrer par type d'opération : </label>
                <select 
                    id="filterType" 
                    value={filterType} 
                    onChange={(e) => setFilterType(e.target.value)} 
                    style={{ padding: '10px', marginLeft: '10px' }}
                >
                    <option value="">Tous</option>
                    <option value="ajout">Ajouts</option>
                    <option value="retrait">Retraits</option>
                </select>
            </div>

            {/* Affichage des cartes horizontales */}
            {!selectedDate && (
                <div style={{ display: 'flex', overflowX: 'auto', gap: '20px' }}>
                    {Object.keys(filteredHistory).map((date, index) => {
                        const operations = filteredHistory[date];
                        const { totalAjout, totalRetrait } = calculateSums(operations);

                        return (
                            <div
                                key={index}
                                onClick={() => showDetails(date)}
                                style={{
                                    border: '1px solid #ccc',
                                    borderRadius: '8px',
                                    padding: '20px',
                                    cursor: 'pointer',
                                    minWidth: '300px',
                                    backgroundColor: '#f9f9f9',
                                    fontWeight: '700',
                                }}
                            >
                                <h2 style={{color: 'rgba(27, 120, 188, 1)'}}>{date}</h2>
                                <p>Opérations : {operations.length}</p>
                                {totalAjout > 0 && (
                                    <p style={{ color: 'green' }}>Ajouts : {totalAjout.toFixed(2)} €</p>
                                )}
                                {totalRetrait > 0 && (
                                    <p style={{ color: 'red' }}>Retraits : -{totalRetrait.toFixed(2)} €</p>
                                )}
                                {/* Affichage du chantier et agent s'ils sont spécifiés */}
                                {operations[0]?.chantier && (
                                    <p>Chantier : {operations[0].chantier.chantier_name}</p>
                                )}
                                {operations[0]?.agent && (
                                    <p>Agent : {operations[0].agent.name}</p>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Pagination */}
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <button onClick={prevPage} disabled={currentPage === 1} style={{ padding: '10px 20px' }}>
                    Précédent
                </button>
                <span>Page {currentPage} / {totalPages}</span>
                <button onClick={nextPage} disabled={currentPage === totalPages} style={{ padding: '10px 20px' }}>
                    Suivant
                </button>
            </div>

            {/* Affichage des détails groupés */}
            {selectedDate && (
                <div style={{ marginTop: '40px' }}>
                    <button onClick={hideDetails} style={{ marginBottom: '20px' }}>
                        Fermer les détails
                    </button>

                    <h3>Détails des opérations pour {selectedDate}</h3>
                    <table style={{ width: '95%', border: '1px solid #ccc', borderCollapse: 'collapse', marginBottom:'20px'}}>
                        <thead>
                            <tr>
                                <th style={{ padding: '10px', border: '1px solid #ccc', fontWeight: '700' }}>Code Produit</th>
                                <th style={{ padding: '10px', border: '1px solid #ccc', fontWeight: '700' }}>Produit</th>
                                <th style={{ padding: '10px', border: '1px solid #ccc', fontWeight: '700' }}>Quantité</th>
                                <th style={{ padding: '10px', border: '1px solid #ccc', fontWeight: '700' }}>Type d'opération</th>
                                <th style={{ padding: '10px', border: '1px solid #ccc', fontWeight: '700' }}>Montant</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredHistory[selectedDate]?.map((item, index) => (
                                <tr 
                                    key={index} 
                                    style={{ 
                                        backgroundColor: index % 2 === 0 ? '#ffffff' : '#d7d7d7', 
                                        fontWeight: '700' 
                                    }}
                                >
                                    <td style={{ padding: '10px', border: '1px solid #ccc' }}>{item.stock.code_produit}</td>
                                    <td style={{ padding: '10px', border: '1px solid #ccc' }}>{item.stock.nom_materiel}</td>
                                    <td style={{ padding: '10px', border: '1px solid #ccc' }}>{item.quantite}</td>
                                    <td style={{ padding: '10px', border: '1px solid #ccc' }}>{item.type_operation}</td>
                                    <td style={{ 
                                        padding: '10px', 
                                        border: '1px solid #ccc',
                                        color: item.type_operation === 'ajout' ? 'green' : 'red',
                                    }}>
                                        {item.type_operation === 'retrait' ? '-' : ''}{parseFloat(item.montant).toFixed(2)} €
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div style={{ marginTop: '20px', fontWeight: '700' }}>
                        {(() => {
                            const filteredOperations = filteredHistory[selectedDate];
                            const { totalAjout, totalRetrait } = calculateSums(filteredOperations);
                            return (
                                <>
                                    <p style={{ color: 'green' }}>Total Ajouts : {totalAjout.toFixed(2)} €</p>
                                    <p style={{ color: 'red' }}>Total Retraits : -{totalRetrait.toFixed(2)} €</p>
                                </>
                            );
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockHistoryCard;
