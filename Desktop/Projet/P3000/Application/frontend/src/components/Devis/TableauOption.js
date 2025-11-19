import React, { useState, useMemo, useCallback } from 'react';
import axios from 'axios';
import DevisTable from './DevisTable';
import { DevisIndexManager } from '../../utils/DevisIndexManager';

const TableauOption = ({ 
  devisData,
  devisItems, // Les items du tableau principal pour filtrer ce qui est déjà utilisé
  formatMontantEspace,
  onTransferToMain // Callback pour transférer un élément vers le tableau principal
}) => {
  // États pour le tableau option
  const [devisItemsOptions, setDevisItemsOptions] = useState([]);
  const [isLoadingParties, setIsLoadingParties] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false); // État pour gérer l'ouverture/fermeture

  // ✅ Construire selectedPartiesOptions depuis devisItemsOptions pour les barres de recherche
  const selectedPartiesOptions = useMemo(() => {
    return devisItemsOptions
      .filter(item => item.type === 'partie')
      .map(partieItem => ({
        ...partieItem,
        type: partieItem.type_activite || 'PEINTURE'
      }));
  }, [devisItemsOptions]);

  // ✅ Enrichir devisItemsOptions de la même manière que devisItems
  const enrichedDevisItemsOptions = useMemo(() => {
    return devisItemsOptions.map(item => {
      if (item.type === 'partie') {
        return {
          ...item,
          selectedSousParties: devisItemsOptions
            .filter(i => i.type === 'sous_partie' && i.partie_id === item.id)
            .map(spItem => ({
              ...spItem,
              selectedLignesDetails: devisItemsOptions
                .filter(i => i.type === 'ligne_detail' && i.sous_partie_id === spItem.id)
            }))
        };
      } else if (item.type === 'sous_partie') {
        return {
          ...item,
          selectedLignesDetails: devisItemsOptions
            .filter(i => i.type === 'ligne_detail' && i.sous_partie_id === item.id)
        };
      }
      return item;
    });
  }, [devisItemsOptions]);

  // Utiliser les fonctions du DevisIndexManager
  const { 
    sortByIndexGlobal,
    getNextIndex
  } = DevisIndexManager;

  // Fonction pour rechercher les parties (pour React Select)
  // Charge toutes les parties disponibles (pas de filtre - toutes les parties peuvent être ajoutées en option)
  const searchParties = useCallback(async (inputValue) => {
    try {
      setIsLoadingParties(true);
      const params = {};
      if (inputValue) {
        params.q = inputValue;
      }
      
      const response = await axios.get('/api/parties/search/', { params });
      return response.data.options || [];
    } catch (error) {
      return [];
    } finally {
      setIsLoadingParties(false);
    }
  }, []);


  // Fonction pour créer une nouvelle partie
  const handlePartieCreate = async (inputValue) => {
    try {
      const response = await axios.post('/api/parties/', {
        titre: inputValue,
        type: 'PEINTURE',
        is_deleted: false
      });
      
      const parties = devisItemsOptions.filter(i => i.type === 'partie');
      const nextIndex = parties.length + 1;
      
      const newPartie = {
        id: response.data.id,
        type: 'partie',
        titre: response.data.titre,
        type_activite: response.data.type,
        index_global: nextIndex,
        isNew: true
      };
      
      setDevisItemsOptions(prev => sortByIndexGlobal([...prev, newPartie]));
      
      // Ne pas charger automatiquement les sous-parties
      // L'utilisateur devra les sélectionner manuellement via la barre de recherche
      
      return {
        value: newPartie.id,
        label: newPartie.titre,
        data: newPartie
      };
    } catch (error) {
      const tempPartie = {
        id: `temp_${Date.now()}`,
        type: 'partie',
        titre: inputValue,
        type_activite: 'PEINTURE',
        index_global: devisItemsOptions.filter(i => i.type === 'partie').length + 1,
        isNew: true,
        isTemp: true
      };
      
      setDevisItemsOptions(prev => sortByIndexGlobal([...prev, tempPartie]));
      
      return {
        value: tempPartie.id,
        label: tempPartie.titre,
        data: tempPartie
      };
    }
  };

  // Fonction pour éditer une partie
  const handlePartieEdit = (partieId) => {
    const partie = devisItemsOptions.find(item => item.type === 'partie' && item.id === partieId);
    if (partie) {
      const newTitre = prompt('Modifier le titre de la partie:', partie.titre);
      if (newTitre && newTitre.trim() !== partie.titre) {
        setDevisItemsOptions(prev => prev.map(item =>
          item.type === 'partie' && item.id === partieId
            ? { ...item, titre: newTitre.trim() }
            : item
        ));
        
        if (!partie.isNew && !partie.isTemp) {
          axios.patch(`/api/parties/${partieId}/`, {
            titre: newTitre.trim()
          }).catch(() => {
            // Erreur lors de la mise à jour
          });
        }
      }
    }
  };

  // Fonction pour créer une nouvelle sous-partie
  const handleSousPartieCreate = async (partieId, description) => {
    try {
      const response = await axios.post('/api/sous-parties/', {
        partie: partieId,
        description: description
      });
      
      if (response.data) {
        const partie = devisItemsOptions.find(i => i.type === 'partie' && i.id === partieId);
        if (!partie) return;
        
        const nextIndex = getNextIndex(devisItemsOptions, 'partie', partieId) || (partie.index_global + 0.1);
        
        const newSousPartie = {
          ...response.data,
          type: 'sous_partie',
          id: response.data.id,
          index_global: nextIndex,
          partie_id: partieId,
          numero: ''
        };
        
        setDevisItemsOptions(prev => sortByIndexGlobal([...prev, newSousPartie]));
      }
    } catch (error) {
      // Erreur lors de la création de la sous-partie
    }
  };

  // Éditer une sous-partie
  const handleSousPartieEdit = async (partieId, sousPartieId) => {
    const sousPartie = devisItemsOptions.find(item => item.type === 'sous_partie' && item.id === sousPartieId);
    if (!sousPartie) return;
    
    const newDescription = prompt('Modifier la description:', sousPartie.description);
    if (newDescription && newDescription.trim()) {
      try {
        await axios.patch(`/api/sous-parties/${sousPartieId}/`, {
          description: newDescription.trim()
        });
        
        setDevisItemsOptions(prev => prev.map(item =>
          item.type === 'sous_partie' && item.id === sousPartieId
            ? { ...item, description: newDescription.trim() }
            : item
        ));
      } catch (error) {
        // Erreur lors de la modification
      }
    }
  };

  // Éditer une ligne de détail
  const handleLigneDetailEdit = (ligneDetail) => {
    // Le modal d'édition est géré par DevisTable
  };

  // Calculer le prix d'une ligne de détail
  const calculatePrice = (ligne) => {
    if (ligne.prix_devis !== null && ligne.prix_devis !== undefined) {
      return parseFloat(ligne.prix_devis);
    }
    
    const cout_main_oeuvre = parseFloat(ligne.cout_main_oeuvre) || 0;
    const cout_materiel = parseFloat(ligne.cout_materiel) || 0;
    
    if (cout_main_oeuvre === 0 && cout_materiel === 0) {
      return parseFloat(ligne.prix) || 0;
    }
    
    const marge = ligne.marge_devis !== null && ligne.marge_devis !== undefined 
      ? parseFloat(ligne.marge_devis)
      : parseFloat(ligne.marge) || 0;
    
    const taux_fixe = parseFloat(ligne.taux_fixe) || 0;
    
    const base = cout_main_oeuvre + cout_materiel;
    const montant_taux_fixe = base * (taux_fixe / 100);
    const sous_total = base + montant_taux_fixe;
    const montant_marge = sous_total * (marge / 100);
    const prix = sous_total + montant_marge;
    
    return prix;
  };

  // Calculer le total d'une sous-partie
  const calculateSousPartieTotal = (sousPartie) => {
    let total = devisItemsOptions
      .filter(item => item.type === 'ligne_detail' && item.sous_partie_id === sousPartie.id)
      .reduce((sum, ligne) => {
        const prix = calculatePrice(ligne);
        return sum + (prix * (ligne.quantity || 0));
      }, 0);
    
    return total;
  };

  // Calculer le total d'une partie
  const calculatePartieTotal = (partie) => {
    let total = devisItemsOptions
      .filter(item => item.type === 'sous_partie' && item.partie_id === partie.id)
      .reduce((sum, sp) => sum + calculateSousPartieTotal(sp), 0);
    
    return total;
  };


  return (
    <div style={{
      backgroundColor: '#fff3cd',
      border: '2px solid #ffc107',
      borderRadius: '8px',
      padding: '25px',
      marginBottom: '30px',
      transition: 'all 0.3s ease'
    }}>
      <div 
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          marginBottom: isExpanded ? '20px' : '0',
          paddingBottom: isExpanded ? '10px' : '0',
          borderBottom: isExpanded ? '2px solid #ffc107' : 'none',
          transition: 'all 0.3s ease'
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h2 style={{
          color: '#856404',
          fontSize: '20px',
          fontWeight: 'bold',
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span style={{
            display: 'inline-block',
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s ease',
            fontSize: '16px'
          }}>
            ▶
          </span>
          ⭐ Options (prestations supplémentaires)
        </h2>
        <span style={{
          color: '#856404',
          fontSize: '14px',
          fontStyle: 'italic'
        }}>
          {isExpanded ? 'Cliquer pour réduire' : 'Cliquer pour développer'}
        </span>
      </div>
      
      {isExpanded && (
        <>
          <p style={{
            color: '#856404',
            fontSize: '14px',
            marginBottom: '20px',
            fontStyle: 'italic'
          }}>
            Les prestations ci-dessous sont proposées en option. Elles ne sont pas incluses dans le montant HT/TTC du récapitulatif.
          </p>
          
          <DevisTable 
        devisData={devisData}
        parties={[]}
        selectedParties={selectedPartiesOptions}
        mainDevisItems={devisItems}
        special_lines_global={[]}
        total_ht={0}
        formatMontantEspace={formatMontantEspace}
        onNatureTravauxChange={(value) => {
          // Ne rien faire pour le tableau option
        }}
        onPartieSelect={(selectedOption) => {
          if (!selectedOption) return;
          const alreadyExists = devisItemsOptions.some(item => item.type === 'partie' && item.id === selectedOption.value);
          if (alreadyExists) return;
          
          const parties = devisItemsOptions.filter(i => i.type === 'partie');
          const nextIndex = parties.length + 1;
          
          const newPartie = {
            ...selectedOption.data,
            type: 'partie',
            id: selectedOption.value,
            index_global: nextIndex,
            titre: selectedOption.data.titre,
            type_activite: selectedOption.data.type
          };
          
          setDevisItemsOptions(prev => sortByIndexGlobal([...prev, newPartie]));
          
          // Ne pas charger automatiquement les sous-parties
          // L'utilisateur devra les sélectionner manuellement via la barre de recherche
        }}
        onPartieCreate={handlePartieCreate}
        onPartieRemove={(partieId) => {
          setDevisItemsOptions(prev => {
            const sousPartiesIds = prev
              .filter(item => item.type === 'sous_partie' && item.partie_id === partieId)
              .map(sp => sp.id);
            
            return prev.filter(item => {
              if (item.type === 'partie' && item.id === partieId) return false;
              if (item.type === 'sous_partie' && item.partie_id === partieId) return false;
              if (item.type === 'ligne_detail' && sousPartiesIds.includes(item.sous_partie_id)) return false;
              return true;
            });
          });
        }}
        onPartieEdit={handlePartieEdit}
        onPartieNumeroChange={(partieId, newNumero) => {
          setDevisItemsOptions(prev => prev.map(item =>
            item.type === 'partie' && item.id === partieId
              ? { ...item, numero: newNumero }
              : item
          ));
        }}
        onPartiesReorder={() => {}}
        searchParties={searchParties}
        isLoadingParties={isLoadingParties}
        onSousPartieSelect={(partieId, sousPartie) => {
          const partie = devisItemsOptions.find(i => i.type === 'partie' && i.id === partieId);
          if (!partie) return;
          
          const alreadyExists = devisItemsOptions.some(item => item.type === 'sous_partie' && item.id === sousPartie.id);
          if (alreadyExists) return;
          
          const nextIndex = getNextIndex(devisItemsOptions, 'partie', partieId) || (partie.index_global + 0.1);
          
          const newSousPartie = {
            ...sousPartie,
            type: 'sous_partie',
            id: sousPartie.id,
            index_global: nextIndex,
            partie_id: partieId
          };
          
          setDevisItemsOptions(prev => sortByIndexGlobal([...prev, newSousPartie]));
        }}
        onSousPartieCreate={handleSousPartieCreate}
        onSousPartieRemove={(partieId, sousPartieId) => {
          setDevisItemsOptions(prev => prev.filter(item => {
            if (item.type === 'sous_partie' && item.id === sousPartieId) return false;
            if (item.type === 'ligne_detail' && item.sous_partie_id === sousPartieId) return false;
            return true;
          }));
        }}
        onSousPartieEdit={handleSousPartieEdit}
        onSousPartieNumeroChange={(partieId, sousPartieId, newNumero) => {
          const partie = devisItemsOptions.find(item => item.type === 'partie' && item.id === partieId);
          if (!partie) return;
          
          const parentNumero = partie.numero;
          const isParentNumeric = parentNumero && /^\d+$/.test(parentNumero);
          
          if (newNumero === '') {
            setDevisItemsOptions(prev => prev.map(item =>
              item.type === 'sous_partie' && item.id === sousPartieId
                ? { ...item, numero: '' }
                : item
            ));
            return;
          }
          
          let finalNumero = newNumero;
          if (isParentNumeric && /^\d+$/.test(newNumero)) {
            finalNumero = `${parentNumero}.${newNumero}`;
          }
          
          setDevisItemsOptions(prev => prev.map(item =>
            item.type === 'sous_partie' && item.id === sousPartieId
              ? { ...item, numero: finalNumero }
              : item
          ));
        }}
        onSousPartiesReorder={() => {}}
        onLigneDetailSelect={(partieId, sousPartieId, ligneDetail) => {
          const alreadyExists = devisItemsOptions.some(item => item.type === 'ligne_detail' && item.id === ligneDetail.id);
          if (alreadyExists) return;
          
          const nextIndex = getNextIndex(devisItemsOptions, 'sous_partie', sousPartieId);
          
          if (!nextIndex) {
            return;
          }
          
          const newLigneDetail = {
            ...ligneDetail,
            type: 'ligne_detail',
            id: ligneDetail.id,
            index_global: nextIndex,
            sous_partie_id: sousPartieId,
            quantity: 0
          };
          
          setDevisItemsOptions(prev => sortByIndexGlobal([...prev, newLigneDetail]));
        }}
        onLigneDetailCreate={() => {}}
        onLigneDetailQuantityChange={(partieId, sousPartieId, ligneDetailId, quantity) => {
          setDevisItemsOptions(prev => prev.map(item => {
            if (item.type === 'ligne_detail' && item.id === ligneDetailId) {
              return { ...item, quantity };
            }
            return item;
          }));
        }}
        onLigneDetailEdit={handleLigneDetailEdit}
        onLigneDetailRemove={(partieId, sousPartieId, ligneDetailId) => {
          setDevisItemsOptions(prev => prev.filter(item => 
            !(item.type === 'ligne_detail' && item.id === ligneDetailId)
          ));
        }}
        onLigneDetailMargeChange={(partieId, sousPartieId, ligneDetailId, marge) => {
          setDevisItemsOptions(prev => prev.map(item => {
            if (item.type === 'ligne_detail' && item.id === ligneDetailId) {
              const cout_total = parseFloat(item.cout_main_oeuvre || 0) + parseFloat(item.cout_materiel || 0);
              const taux_fixe = parseFloat(item.taux_fixe || 0);
              const prix_base = cout_total * (1 + taux_fixe / 100);
              const prix_calcule = prix_base * (1 + marge / 100);
              
              return { 
                ...item, 
                marge_devis: marge,
                prix_devis: prix_calcule
              };
            }
            return item;
          }));
        }}
        onLigneDetailPriceChange={(partieId, sousPartieId, ligneDetailId, prix) => {
          setDevisItemsOptions(prev => prev.map(item => {
            if (item.type === 'ligne_detail' && item.id === ligneDetailId) {
              const cout_total = parseFloat(item.cout_main_oeuvre || 0) + parseFloat(item.cout_materiel || 0);
              const taux_fixe = parseFloat(item.taux_fixe || 0);
              const prix_base = cout_total * (1 + taux_fixe / 100);
              const marge_implicite = prix_base > 0 ? ((prix / prix_base) - 1) * 100 : 0;
              
              return { 
                ...item, 
                prix_devis: prix,
                marge_devis: marge_implicite
              };
            }
            return item;
          }));
        }}
        pendingSpecialLines={[]}
        onAddPendingSpecialLine={() => {}}
        onRemovePendingSpecialLine={() => {}}
        onRemoveSpecialLine={() => {}}
        onMoveSpecialLine={() => {}}
        onEditSpecialLine={() => {}}
        editingSpecialLine={null}
        showEditModal={false}
        lineAwaitingPlacement={null}
        onPlaceLineAt={() => {}}
        onCancelPlacement={() => {}}
        onRequestReplacement={() => {}}
        onCloseEditModal={() => {}}
        onSaveSpecialLine={() => {}}
        onSpecialLinesReorder={() => {}}
        calculateGlobalTotal={() => 0}
        calculatePartieTotal={calculatePartieTotal}
        calculateSousPartieTotal={calculateSousPartieTotal}
        
        devisItems={enrichedDevisItemsOptions}
        onDevisItemsReorder={(reorderedItems) => {
          setDevisItemsOptions(reorderedItems);
        }}
        
        isSelectingBase={false}
        onBaseSelected={() => {}}
        onCancelBaseSelection={() => {}}
        pendingLineForBase={null}
        onClearPendingLineForBase={() => {}}
        
        // ✅ Props pour le transfert vers le tableau principal
        isOptionsTable={true}
        onTransferToMain={(itemToTransfer) => {
          // Retirer l'élément du tableau option (et ses enfants si c'est une partie ou sous-partie)
          setDevisItemsOptions(prev => {
            if (itemToTransfer.type === 'partie') {
              // Retirer la partie et toutes ses sous-parties et lignes
              const sousPartieIds = prev
                .filter(item => item.type === 'sous_partie' && item.partie_id === itemToTransfer.id)
                .map(sp => sp.id);
              
              return prev.filter(item => {
                if (item.type === 'partie' && item.id === itemToTransfer.id) return false;
                if (item.type === 'sous_partie' && item.partie_id === itemToTransfer.id) return false;
                if (item.type === 'ligne_detail' && sousPartieIds.includes(item.sous_partie_id)) return false;
                return true;
              });
            } else if (itemToTransfer.type === 'sous_partie') {
              // Retirer la sous-partie et toutes ses lignes
              return prev.filter(item => {
                if (item.type === 'sous_partie' && item.id === itemToTransfer.id) return false;
                if (item.type === 'ligne_detail' && item.sous_partie_id === itemToTransfer.id) return false;
                return true;
              });
            } else {
              // Retirer juste la ligne
              return prev.filter(item => !(item.type === 'ligne_detail' && item.id === itemToTransfer.id));
            }
          });
          
          // Appeler le callback parent pour ajouter au tableau principal
          onTransferToMain(itemToTransfer);
          
        }}
      />
        </>
      )}
    </div>
  );
};

export default TableauOption;

