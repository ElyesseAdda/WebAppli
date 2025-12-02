/**
 * Hook personnalisé pour tous les handlers de manipulation du devis
 * (parties, sous-parties, lignes de détail, lignes spéciales)
 */
import { useCallback, useState } from 'react';
import axios from 'axios';
import { DevisIndexManager } from '../../../utils/DevisIndexManager';

const {
  roundIndex,
  reindexAll,
  sortByIndexGlobal,
  getNextIndex,
  insertAtPosition,
  reorderAfterDrag
} = DevisIndexManager;

/**
 * Génère le prochain numéro de partie
 */
const getNextPartieNumero = (items = []) => {
  const numericValues = items
    .filter(item => item.type === 'partie' && item.numero && /^\d+$/.test(item.numero))
    .map(item => parseInt(item.numero, 10));
  if (numericValues.length === 0) {
    return '1';
  }
  return String(Math.max(...numericValues) + 1);
};

/**
 * Génère le prochain numéro de sous-partie
 */
const getNextSousPartieNumero = (items = [], partieId) => {
  if (!partieId) return '';
  
  const parentPartie = items.find(item => item.type === 'partie' && item.id === partieId);
  const parentNumero = parentPartie?.numero;
  
  if (!parentNumero || !/^\d+(\.\d+)?$/.test(parentNumero)) return '';
  
  const escapedParent = parentNumero.replace(/\./g, '\\.');
  const regex = new RegExp(`^${escapedParent}\\.(\\d+)$`);
  
  const existingIndexes = items
    .filter(item => item.type === 'sous_partie' && item.partie_id === partieId && item.numero && regex.test(item.numero))
    .map(item => {
      const match = item.numero.match(regex);
      return match ? parseInt(match[1], 10) : null;
    })
    .filter(index => index !== null);
  
  const nextIndex = existingIndexes.length ? Math.max(...existingIndexes) + 1 : 1;
  return `${parentNumero}.${nextIndex}`;
};

/**
 * Hook pour les handlers du devis
 * @param {Array} devisItems - Items du devis
 * @param {Function} setDevisItems - Setter pour les items
 * @param {Function} loadParties - Fonction pour recharger les parties disponibles (optionnel)
 * @returns {Object} Handlers
 */
export const useDevisHandlers = (devisItems, setDevisItems, loadParties = null) => {
  const [isReordering, setIsReordering] = useState(false);
  const [lineAwaitingPlacement, setLineAwaitingPlacement] = useState(null);
  const [isSelectingBase, setIsSelectingBase] = useState(false);
  const [pendingLineForBase, setPendingLineForBase] = useState(null);

  // ========== HANDLERS POUR PARTIES ==========

  /**
   * Sélectionner une partie existante
   */
  const handlePartieSelect = useCallback((selectedOption) => {
    if (!selectedOption) return;
    
    setDevisItems(prevItems => {
      const alreadyExists = prevItems.some(item => item.type === 'partie' && item.id === selectedOption.value);
      if (alreadyExists) return prevItems;
      
      const parties = prevItems.filter(i => i.type === 'partie');
      const nextIndex = parties.length + 1;
      const numero = selectedOption.data?.numero || getNextPartieNumero(prevItems);
      
      const newPartie = {
        ...selectedOption.data,
        type: 'partie',
        id: selectedOption.value,
        index_global: nextIndex,
        titre: selectedOption.data.titre,
        type_activite: selectedOption.data.type,
        numero
      };
      
      const updated = sortByIndexGlobal([...prevItems, newPartie]);
      return reindexAll(updated);
    });
  }, [setDevisItems]);

  /**
   * Créer une nouvelle partie
   */
  const handlePartieCreate = useCallback(async (inputValue) => {
    try {
      const response = await axios.post('/api/parties/', {
        titre: inputValue,
        type: 'PEINTURE',
        is_deleted: false
      });
      
      const apiPartie = {
        id: response.data.id,
        titre: response.data.titre,
        type_activite: response.data.type,
        isNew: true
      };
      
      setDevisItems(prevItems => {
        const parties = prevItems.filter(i => i.type === 'partie');
        const nextIndex = parties.length + 1;
        const numero = getNextPartieNumero(prevItems);
        const newPartie = {
          ...apiPartie,
          type: 'partie',
          index_global: nextIndex,
          numero
        };
        const updated = sortByIndexGlobal([...prevItems, newPartie]);
        return reindexAll(updated);
      });
      
      return {
        value: response.data.id,
        label: response.data.titre,
        data: apiPartie
      };
    } catch (error) {
      console.error('Erreur lors de la création de la partie:', error);
      throw error;
    }
  }, [setDevisItems]);

  /**
   * Supprimer une partie et tous ses enfants
   */
  const handlePartieRemove = useCallback(async (partieId) => {
    setDevisItems(prev => {
      const sousPartiesIds = prev
        .filter(item => item.type === 'sous_partie' && item.partie_id === partieId)
        .map(sp => sp.id);
      
      return prev.filter(item => {
        if (item.type === 'partie' && item.id === partieId) return false;
        if (item.type === 'sous_partie' && item.partie_id === partieId) return false;
        if (item.type === 'ligne_detail' && sousPartiesIds.includes(item.sous_partie_id)) return false;
        if (item.type === 'ligne_speciale' && item.context_type === 'partie' && item.context_id === partieId) return false;
        if (item.type === 'ligne_speciale' && item.context_type === 'sous_partie' && sousPartiesIds.includes(item.context_id)) return false;
        return true;
      });
    });
    
    // ✅ Recharger la liste des parties disponibles pour qu'elle réapparaisse dans la barre de recherche
    if (loadParties) {
      await loadParties();
    }
  }, [setDevisItems, loadParties]);

  /**
   * Éditer le titre d'une partie
   */
  const handlePartieEdit = useCallback(async (partieId) => {
    const partie = devisItems.find(item => item.type === 'partie' && item.id === partieId);
    if (!partie) return;
    
    const newTitre = prompt('Modifier le titre de la partie:', partie.titre);
    if (newTitre && newTitre.trim() !== partie.titre) {
      setDevisItems(prev => prev.map(item =>
        item.type === 'partie' && item.id === partieId
          ? { ...item, titre: newTitre.trim() }
          : item
      ));
      
      // Mettre à jour en BDD si partie existante
      if (!partie.isNew && !partie.isTemp) {
        try {
          await axios.patch(`/api/parties/${partieId}/`, { titre: newTitre.trim() });
        } catch (error) {
          console.error('Erreur lors de la mise à jour de la partie:', error);
        }
      }
    }
  }, [devisItems, setDevisItems]);

  /**
   * Modifier le numéro d'une partie
   */
  const handlePartieNumeroChange = useCallback((partieId, newNumero) => {
    setDevisItems(prev => prev.map(item =>
      item.type === 'partie' && item.id === partieId
        ? { ...item, numero: newNumero }
        : item
    ));
  }, [setDevisItems]);

  /**
   * Réordonner les parties
   */
  const handlePartiesReorder = useCallback((reorderedParties) => {
    // Les index sont déjà recalculés par DevisTable
  }, []);

  // ========== HANDLERS POUR SOUS-PARTIES ==========

  /**
   * Sélectionner une sous-partie existante
   */
  const handleSousPartieSelect = useCallback((partieId, sousPartie) => {
    if (!sousPartie) return;
    
    setDevisItems(prevItems => {
      const partie = prevItems.find(i => i.type === 'partie' && i.id === partieId);
      if (!partie) return prevItems;
      
      const nextIndex = getNextIndex(prevItems, 'partie', partieId) || (partie.index_global + 0.1);
      const numero = sousPartie.numero || getNextSousPartieNumero(prevItems, partieId);
      
      const newSousPartie = {
        ...sousPartie,
        type: 'sous_partie',
        id: sousPartie.id,
        index_global: nextIndex,
        partie_id: partieId,
        numero
      };
      
      const alreadyExists = prevItems.some(item => item.type === 'sous_partie' && item.id === sousPartie.id);
      if (alreadyExists) return prevItems;
      
      return sortByIndexGlobal([...prevItems, newSousPartie]);
    });
  }, [setDevisItems]);

  /**
   * Créer une nouvelle sous-partie
   */
  const handleSousPartieCreate = useCallback(async (partieId, description) => {
    try {
      const response = await axios.post('/api/sous-parties/', {
        partie: partieId,
        description: description
      });
      
      if (response.data) {
        handleSousPartieSelect(partieId, {
          ...response.data,
          numero: ''
        });
      }
    } catch (error) {
      console.error('Erreur lors de la création de la sous-partie:', error);
    }
  }, [handleSousPartieSelect]);

  /**
   * Supprimer une sous-partie et ses lignes
   */
  const handleSousPartieRemove = useCallback((partieId, sousPartieId) => {
    setDevisItems(prev => prev.filter(item => {
      if (item.type === 'sous_partie' && item.id === sousPartieId) return false;
      if (item.type === 'ligne_detail' && item.sous_partie_id === sousPartieId) return false;
      if (item.type === 'ligne_speciale' && item.context_type === 'sous_partie' && item.context_id === sousPartieId) return false;
      return true;
    }));
  }, [setDevisItems]);

  /**
   * Éditer une sous-partie
   */
  const handleSousPartieEdit = useCallback(async (partieId, sousPartieId) => {
    const sousPartie = devisItems.find(item => item.type === 'sous_partie' && item.id === sousPartieId);
    if (!sousPartie) return;
    
    const newDescription = prompt('Modifier la description:', sousPartie.description);
    if (newDescription && newDescription.trim()) {
      try {
        await axios.patch(`/api/sous-parties/${sousPartieId}/`, {
          description: newDescription.trim()
        });
        
        setDevisItems(prev => prev.map(item =>
          item.type === 'sous_partie' && item.id === sousPartieId
            ? { ...item, description: newDescription.trim() }
            : item
        ));
      } catch (error) {
        console.error('Erreur lors de la modification de la sous-partie:', error);
      }
    }
  }, [devisItems, setDevisItems]);

  /**
   * Modifier le numéro d'une sous-partie
   */
  const handleSousPartieNumeroChange = useCallback((partieId, sousPartieId, newNumero) => {
    const partie = devisItems.find(item => item.type === 'partie' && item.id === partieId);
    if (!partie) return;
    
    const parentNumero = partie.numero;
    const isParentNumeric = parentNumero && /^\d+$/.test(parentNumero);
    
    if (newNumero === '') {
      setDevisItems(prev => prev.map(item =>
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
    
    setDevisItems(prev => prev.map(item =>
      item.type === 'sous_partie' && item.id === sousPartieId
        ? { ...item, numero: finalNumero }
        : item
    ));
  }, [devisItems, setDevisItems]);

  /**
   * Réordonner les sous-parties
   */
  const handleSousPartiesReorder = useCallback((partieId, result) => {
    // Les index sont déjà recalculés par DevisTable
  }, []);

  // ========== HANDLERS POUR LIGNES DE DÉTAIL ==========

  /**
   * Sélectionner une ligne de détail
   */
  const handleLigneDetailSelect = useCallback((partieId, sousPartieId, ligneDetail) => {
    const nextIndex = getNextIndex(devisItems, 'sous_partie', sousPartieId);
    
    if (!nextIndex) return;
    
    const newLigneDetail = {
      ...ligneDetail,
      type: 'ligne_detail',
      id: ligneDetail.id,
      index_global: nextIndex,
      sous_partie_id: sousPartieId,
      quantity: 0
    };
    
    setDevisItems(prev => sortByIndexGlobal([...prev, newLigneDetail]));
  }, [devisItems, setDevisItems]);

  /**
   * Changer la quantité d'une ligne
   */
  const handleLigneDetailQuantityChange = useCallback((partieId, sousPartieId, ligneDetailId, quantity) => {
    setDevisItems(prev => prev.map(item => {
      if (item.type === 'ligne_detail' && item.id === ligneDetailId) {
        return { ...item, quantity };
      }
      return item;
    }));
  }, [setDevisItems]);

  /**
   * Supprimer une ligne de détail
   */
  const handleLigneDetailRemove = useCallback((partieId, sousPartieId, ligneDetailId) => {
    setDevisItems(prev => prev.filter(item => 
      !(item.type === 'ligne_detail' && item.id === ligneDetailId)
    ));
  }, [setDevisItems]);

  /**
   * Modifier la marge d'une ligne
   */
  const handleLigneDetailMargeChange = useCallback((partieId, sousPartieId, ligneDetailId, marge) => {
    setDevisItems(prev => prev.map(item => {
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
  }, [setDevisItems]);

  /**
   * Modifier le prix d'une ligne
   */
  const handleLigneDetailPriceChange = useCallback((partieId, sousPartieId, ligneDetailId, prix) => {
    setDevisItems(prev => prev.map(item => {
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
  }, [setDevisItems]);

  /**
   * Éditer une ligne de détail (ouvre le modal)
   */
  const handleLigneDetailEdit = useCallback((ligneDetail) => {
    // Le modal d'édition est géré par le composant parent
  }, []);

  /**
   * Créer une ligne de détail
   */
  const handleLigneDetailCreate = useCallback(async (sousPartieId, description) => {
    // À implémenter si nécessaire
  }, []);

  // ========== HANDLERS POUR LIGNES SPÉCIALES ==========

  /**
   * Ajouter une ligne spéciale en attente
   */
  const handleAddPendingSpecialLine = useCallback((line, requiresBaseSelection = false) => {
    if (requiresBaseSelection) {
      setPendingLineForBase(line);
      setIsSelectingBase(true);
    } else {
      setLineAwaitingPlacement(line);
    }
  }, []);

  /**
   * Supprimer une ligne spéciale
   */
  const handleRemoveSpecialLine = useCallback((lineId) => {
    setDevisItems(prev => prev.filter(item => !(item.type === 'ligne_speciale' && item.id === lineId)));
  }, [setDevisItems]);

  /**
   * Déplacer une ligne spéciale
   */
  const handleMoveSpecialLine = useCallback((lineId) => {
    const lineToMove = devisItems.find(item => item.type === 'ligne_speciale' && item.id === lineId);
    
    if (!lineToMove) return;
    
    setLineAwaitingPlacement({
      ...lineToMove,
      isMoving: true,
      originalId: lineId
    });
  }, [devisItems]);

  /**
   * Placer une ligne spéciale à une position
   */
  const handlePlaceLineAt = useCallback((position) => {
    if (!lineAwaitingPlacement) return;
    
    const line = lineAwaitingPlacement;
    setIsReordering(true);
    
    const { isMoving, originalId, data, ...lineWithoutFlags } = line;
    
    const newLine = {
      ...lineWithoutFlags,
      id: isMoving ? line.id : (line.id || Date.now().toString()),
      description: data?.description || line.description || '',
      value: data?.value || line.value,
      value_type: data?.valueType || line.value_type,
      type_speciale: data?.type || line.type_speciale,
      baseCalculation: line.baseCalculation,
      base_calculation: line.base_calculation,
      styles: line.styles,
      isMoving,
      originalId
    };
    
    const updated = insertAtPosition(devisItems, newLine, position);
    setDevisItems(updated);
    setLineAwaitingPlacement(null);
    
    setTimeout(() => setIsReordering(false), 100);
  }, [lineAwaitingPlacement, devisItems, setDevisItems]);

  /**
   * Annuler le placement
   */
  const handleCancelPlacement = useCallback(() => {
    setLineAwaitingPlacement(null);
  }, []);

  /**
   * Gérer la sélection de base pour une ligne en %
   */
  const handleBaseSelected = useCallback((baseInfo) => {
    if (!pendingLineForBase) return;
    
    const updatedLine = {
      ...pendingLineForBase,
      baseCalculation: baseInfo
    };
    
    setPendingLineForBase(updatedLine);
    setIsSelectingBase(false);
  }, [pendingLineForBase]);

  /**
   * Annuler la sélection de base
   */
  const handleCancelBaseSelection = useCallback(() => {
    setIsSelectingBase(false);
    setPendingLineForBase(null);
  }, []);

  /**
   * Nettoyer pendingLineForBase
   */
  const handleClearPendingLineForBase = useCallback(() => {
    setPendingLineForBase(null);
  }, []);

  // ========== HANDLER DE RÉORDONNANCEMENT GLOBAL ==========

  /**
   * Réordonner les items du devis (après drag & drop)
   */
  const handleDevisItemsReorder = useCallback(async (reorderedItems) => {
    setIsReordering(true);
    
    // Dédupliquer les items
    const uniqueItems = [];
    const seenIds = new Map();
    reorderedItems.forEach(item => {
      const key = `${item.type}_${item.id}`;
      if (!seenIds.has(key)) {
        seenIds.set(key, item);
        uniqueItems.push(item);
      }
    });
    
    const sorted = sortByIndexGlobal(uniqueItems);
    
    // Recalculer les numéros d'affichage
    const withNumeros = recalculateNumeros(sorted);
    
    setDevisItems(withNumeros);
    
    setTimeout(() => setIsReordering(false), 100);
  }, [setDevisItems]);

  /**
   * Recalcule les numéros après réorganisation
   */
  const recalculateNumeros = (items) => {
    const sorted = [...items].sort((a, b) => a.index_global - b.index_global);
    
    return sorted.map(item => {
      if (!item.numero) return item;
      
      const newNumero = generateNumero(item, sorted);
      return { ...item, numero: newNumero };
    });
  };

  /**
   * Génère le numéro d'un élément
   */
  const generateNumero = (item, allItems) => {
    const findParentById = (parentId) => allItems.find(e => e.id === parentId);

    if (item.type === 'partie') {
      const partiesNumeroteesBefore = allItems.filter(
        e => e.type === 'partie' && 
        e.index_global < item.index_global &&
        e.numero && /^\d+$/.test(e.numero)
      );
      return String(partiesNumeroteesBefore.length + 1);
    }

    if (item.type === 'sous_partie') {
      const partie = findParentById(item.partie_id);
      if (!partie || !partie.numero) return '';
      
      const regex = new RegExp('^' + partie.numero + '\\.(\\d+)$');
      
      const sousPartiesNumeroteesBefore = allItems.filter(
        e => e.type === 'sous_partie' && 
        e.partie_id === item.partie_id && 
        e.index_global < item.index_global &&
        e.numero && regex.test(e.numero)
      );
      
      return `${partie.numero}.${sousPartiesNumeroteesBefore.length + 1}`;
    }

    if (item.type === 'ligne_detail') {
      const sousPartie = findParentById(item.sous_partie_id);
      if (!sousPartie || !sousPartie.numero) return '';
      
      const regex = new RegExp('^' + sousPartie.numero.replace(/\./g, '\\.') + '\\.(\\d+)$');
      
      const lignesNumeroteesBefore = allItems.filter(
        e => e.type === 'ligne_detail' && 
        e.sous_partie_id === item.sous_partie_id && 
        e.index_global < item.index_global &&
        e.numero && regex.test(e.numero)
      );
      
      return `${sousPartie.numero}.${lignesNumeroteesBefore.length + 1}`;
    }

    return '';
  };

  return {
    // États
    isReordering,
    lineAwaitingPlacement,
    isSelectingBase,
    pendingLineForBase,
    
    // Handlers parties
    handlePartieSelect,
    handlePartieCreate,
    handlePartieRemove,
    handlePartieEdit,
    handlePartieNumeroChange,
    handlePartiesReorder,
    
    // Handlers sous-parties
    handleSousPartieSelect,
    handleSousPartieCreate,
    handleSousPartieRemove,
    handleSousPartieEdit,
    handleSousPartieNumeroChange,
    handleSousPartiesReorder,
    
    // Handlers lignes de détail
    handleLigneDetailSelect,
    handleLigneDetailCreate,
    handleLigneDetailQuantityChange,
    handleLigneDetailRemove,
    handleLigneDetailMargeChange,
    handleLigneDetailPriceChange,
    handleLigneDetailEdit,
    
    // Handlers lignes spéciales
    handleAddPendingSpecialLine,
    handleRemoveSpecialLine,
    handleMoveSpecialLine,
    handlePlaceLineAt,
    handleCancelPlacement,
    handleBaseSelected,
    handleCancelBaseSelection,
    handleClearPendingLineForBase,
    
    // Handler global
    handleDevisItemsReorder
  };
};

export default useDevisHandlers;


