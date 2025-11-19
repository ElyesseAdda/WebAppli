/**
 * 🎯 DevisIndexManager
 * Gestionnaire centralisé pour tous les calculs d'index_global dans le système de devis
 * 
 * Ce module résout les problèmes de :
 * - Double/triple réindexation lors d'un drag & drop
 * - Tri incohérent (par index absolu au lieu de position relative)
 * - Perte de l'ordre visuel lors du déplacement vers de nouvelles positions
 */

// ==========================================
// CONSTANTES
// ==========================================

const INCREMENTS = {
  PARTIE: 1,            // Parties : 1, 2, 3...
  SOUS_PARTIE: 0.1,     // Sous-parties : 1.1, 1.2, 1.3...
  LIGNE_DETAIL: 0.001,  // Lignes : 1.101, 1.102, 1.103...
  GLOBAL_SPECIAL: 0.001,// Lignes spéciales globales : 0.001, 0.002, 0.003... (avant partie 1)
  PARTIE_SPECIAL: 0.05  // Lignes spéciales de partie : 1.05, 1.15...
};

// ==========================================
// FONCTIONS UTILITAIRES
// ==========================================

/**
 * Arrondir un index à 3 décimales pour éviter les erreurs de précision
 * @param {number} index - L'index à arrondir
 * @returns {number} Index arrondi à 3 décimales
 */
const roundIndex = (index) => {
  return Math.round(index * 1000) / 1000;
};

/**
 * Extraire le préfixe de partie (1.205 → 1)
 * @param {number} index_global - L'index global
 * @returns {number} Le numéro de partie
 */
const getPartiePrefix = (index_global) => {
  return Math.floor(index_global);
};

/**
 * Extraire l'index de la sous-partie (1.205 → 1.2)
 * @param {number} index_global - L'index global
 * @returns {number|null} L'index de la sous-partie ou null
 */
const getSousPartieIndex = (index_global) => {
  const str = index_global.toString();
  const parts = str.split('.');
  
  if (parts.length < 2) return null;
  
  const decimal = parts[1];
  const spNumber = parseInt(decimal.substring(0, 1));
  
  return parseFloat(`${parts[0]}.${spNumber}`);
};

/**
 * Extraire la position relative dans un scope
 * Ex: 1.203 dans SP 1.2 → position relative = 0.003
 * @param {number} index_global - L'index global de l'élément
 * @param {number} scopeBaseIndex - L'index de base du scope
 * @returns {number} Position relative
 */
const getRelativePosition = (index_global, scopeBaseIndex) => {
  return index_global - scopeBaseIndex;
};

// ==========================================
// FONCTIONS DE TRI
// ==========================================

/**
 * 🔑 FONCTION CLÉ : Trier les éléments en préservant l'ordre visuel
 * 
 * Problème résolu : Quand on drag SP 1.1 → 1.3, les éléments ont des index mixtes :
 * - Ligne spéciale : 1.201 (ancienne position)
 * - Ligne détail : 1.102 (ancienne position)
 * 
 * Le tri par index absolu donnerait : 1.102, 1.201 (MAUVAIS ordre visuel)
 * Notre tri donne : 1.201, 1.102 (BON ordre visuel préservé)
 * 
 * @param {Array} items - Les éléments à trier
 * @param {string} scopeType - Type de scope ('sous_partie', 'partie', 'global')
 * @param {number} scopeId - ID du scope
 * @param {number} oldScopeIndex - Index de l'ancien scope pour calculer les positions relatives
 * @returns {Array} Éléments triés par position relative
 */
const sortPreservingVisualOrder = (items, scopeType, scopeId, oldScopeIndex) => {
  if (items.length === 0) return items;
  
  // Calculer la position relative de chaque élément par rapport à l'ancien scope
  const itemsWithRelativePos = items.map(item => ({
    item,
    relativePos: getRelativePosition(item.index_global, oldScopeIndex)
  }));
  
  // Trier par position relative (pas par index absolu)
  itemsWithRelativePos.sort((a, b) => a.relativePos - b.relativePos);
  
  return itemsWithRelativePos.map(({ item }) => item);
};

/**
 * Trier simplement par index_global (pour les cas sans conflit)
 * @param {Array} items - Les éléments à trier
 * @returns {Array} Éléments triés par index_global
 */
const sortByIndexGlobal = (items) => {
  return [...items].sort((a, b) => a.index_global - b.index_global);
};

// ==========================================
// FONCTIONS DE RÉINDEXATION
// ==========================================

/**
 * Réindexer séquentiellement une sous-partie
 * Tous les éléments (lignes détails + lignes spéciales) sont réindexés en séquence
 * 
 * @param {Array} allItems - Tous les éléments du devis
 * @param {number} sousPartieId - ID de la sous-partie à réindexer
 * @returns {Array} Tous les éléments avec la sous-partie réindexée
 */
const reindexSousPartie = (allItems, sousPartieId) => {
  const sp = allItems.find(i => i.type === 'sous_partie' && i.id === sousPartieId);
  if (!sp) {
    return allItems;
  }
  
  const oldSpIndex = sp.index_global;
  
  // Récupérer tous les éléments de cette sous-partie
  const itemsInSP = allItems.filter(i => 
    (i.type === 'ligne_detail' && i.sous_partie_id === sousPartieId) ||
    (i.type === 'ligne_speciale' && i.context_type === 'sous_partie' && i.context_id === sousPartieId)
  );
  
  // ✅ CRITIQUE : Trier en préservant l'ordre visuel (pas par index absolu)
  const sorted = sortPreservingVisualOrder(itemsInSP, 'sous_partie', sousPartieId, oldSpIndex);
  
  // Réindexer séquentiellement : 1.101, 1.102, 1.103...
  const reindexed = sorted.map((item, idx) => ({
    ...item,
    index_global: roundIndex(sp.index_global + (idx + 1) * INCREMENTS.LIGNE_DETAIL)
  }));
  
  // Remplacer dans allItems
  return allItems.map(item => {
    const updated = reindexed.find(r => r.type === item.type && r.id === item.id);
    return updated || item;
  });
};

/**
 * Réindexer séquentiellement une partie
 * 
 * @param {Array} allItems - Tous les éléments du devis
 * @param {number} partieId - ID de la partie à réindexer
 * @returns {Array} Tous les éléments avec la partie réindexée
 */
const reindexPartie = (allItems, partieId) => {
  const partie = allItems.find(i => i.type === 'partie' && i.id === partieId);
  if (!partie) {
    return allItems;
  }
  
  const oldPartieIndex = partie.index_global;
  
  // Récupérer tous les éléments de cette partie (sous-parties + lignes spéciales)
  const itemsInPartie = allItems.filter(i => 
    (i.type === 'sous_partie' && i.partie_id === partieId) ||
    (i.type === 'ligne_speciale' && i.context_type === 'partie' && i.context_id === partieId)
  );
  
  // Trier en préservant l'ordre visuel
  const sorted = sortPreservingVisualOrder(itemsInPartie, 'partie', partieId, oldPartieIndex);
  
  // Réindexer séquentiellement : 1.1, 1.2, 1.3...
  const reindexed = sorted.map((item, idx) => ({
    ...item,
    index_global: roundIndex(partie.index_global + (idx + 1) * INCREMENTS.SOUS_PARTIE)
  }));
  
  // Remplacer dans allItems
  return allItems.map(item => {
    const updated = reindexed.find(r => r.type === item.type && r.id === item.id);
    return updated || item;
  });
};

/**
 * Réindexer tout le devis (hiérarchique complet)
 * 
 * @param {Array} items - Tous les éléments du devis
 * @returns {Array} Tous les éléments réindexés
 */
const reindexAll = (items) => {
  let updated = [...items];
  
  // 1. Réindexer les parties
  const parties = updated.filter(i => i.type === 'partie');
  parties.forEach((partie, idx) => {
    updated = updated.map(item => 
      item.type === 'partie' && item.id === partie.id
        ? { ...item, index_global: idx + 1 }
        : item
    );
  });
  
  // 2. Réindexer chaque partie (sous-parties + lignes spéciales de partie)
  parties.forEach(partie => {
    updated = reindexPartie(updated, partie.id);
  });
  
  // 3. Réindexer chaque sous-partie (lignes + lignes spéciales de sous-partie)
  const sousParties = updated.filter(i => i.type === 'sous_partie');
  sousParties.forEach(sp => {
    updated = reindexSousPartie(updated, sp.id);
  });
  
  return sortByIndexGlobal(updated);
};

// ==========================================
// FONCTIONS D'INSERTION
// ==========================================

/**
 * Insérer une ligne spéciale à une position spécifique
 * 
 * @param {Array} allItems - Tous les éléments du devis
 * @param {Object} newLine - La nouvelle ligne à insérer
 * @param {string} position - La position d'insertion (ex: 'before_ligne_5', 'after_ligne_3', 'global_start')
 * @returns {Array} Tous les éléments avec la nouvelle ligne insérée
 */
const insertAtPosition = (allItems, newLine, position) => {
  let context_type = 'global';
  let context_id = null;
  let insertIndex = -1;
  let scopeId = null;
  
  // Décoder la position
  if (position === 'global_start') {
    context_type = 'global';
    context_id = null;
    scopeId = 'global';
    // Insérer au début de tout
    insertIndex = 0;
  } 
  else if (position.startsWith('before_ligne_')) {
    const ligneId = parseInt(position.replace('before_ligne_', ''));
    const ligne = allItems.find(i => i.type === 'ligne_detail' && i.id === ligneId);
    
    if (ligne) {
      context_type = 'sous_partie';
      context_id = ligne.sous_partie_id;
      scopeId = ligne.sous_partie_id;
      
      const sp = allItems.find(i => i.type === 'sous_partie' && i.id === scopeId);
      const oldSpIndex = sp.index_global;
      
      // Récupérer tous les éléments de cette sous-partie
      const itemsInSP = allItems.filter(i => 
        (i.type === 'ligne_detail' && i.sous_partie_id === scopeId) ||
        (i.type === 'ligne_speciale' && i.context_type === 'sous_partie' && i.context_id === scopeId)
      );
      
      // Trier en préservant l'ordre visuel
      const sorted = sortPreservingVisualOrder(itemsInSP, 'sous_partie', scopeId, oldSpIndex);
      
      // Trouver la position de la ligne de référence
      insertIndex = sorted.findIndex(i => i.type === 'ligne_detail' && i.id === ligneId);
    }
  }
  else if (position.startsWith('after_ligne_')) {
    const ligneId = parseInt(position.replace('after_ligne_', ''));
    const ligne = allItems.find(i => i.type === 'ligne_detail' && i.id === ligneId);
    
    if (ligne) {
      context_type = 'sous_partie';
      context_id = ligne.sous_partie_id;
      scopeId = ligne.sous_partie_id;
      
      const sp = allItems.find(i => i.type === 'sous_partie' && i.id === scopeId);
      const oldSpIndex = sp.index_global;
      
      const itemsInSP = allItems.filter(i => 
        (i.type === 'ligne_detail' && i.sous_partie_id === scopeId) ||
        (i.type === 'ligne_speciale' && i.context_type === 'sous_partie' && i.context_id === scopeId)
      );
      
      const sorted = sortPreservingVisualOrder(itemsInSP, 'sous_partie', scopeId, oldSpIndex);
      insertIndex = sorted.findIndex(i => i.type === 'ligne_detail' && i.id === ligneId) + 1;
    }
  }
  else if (position.startsWith('before_sp_')) {
    const spId = parseInt(position.replace('before_sp_', ''));
    const sp = allItems.find(i => i.type === 'sous_partie' && i.id === spId);
    
    if (sp) {
      context_type = 'partie';
      context_id = sp.partie_id;
      scopeId = sp.partie_id;
      
      const partie = allItems.find(i => i.type === 'partie' && i.id === scopeId);
      const oldPartieIndex = partie.index_global;
      
      const itemsInPartie = allItems.filter(i => 
        (i.type === 'sous_partie' && i.partie_id === scopeId) ||
        (i.type === 'ligne_speciale' && i.context_type === 'partie' && i.context_id === scopeId)
      );
      
      const sorted = sortPreservingVisualOrder(itemsInPartie, 'partie', scopeId, oldPartieIndex);
      insertIndex = sorted.findIndex(i => i.type === 'sous_partie' && i.id === spId);
    }
  }
  else if (position.startsWith('after_sp_')) {
    const spId = parseInt(position.replace('after_sp_', ''));
    const sp = allItems.find(i => i.type === 'sous_partie' && i.id === spId);
    
    if (sp) {
      context_type = 'partie';
      context_id = sp.partie_id;
      scopeId = sp.partie_id;
      
      const partie = allItems.find(i => i.type === 'partie' && i.id === scopeId);
      const oldPartieIndex = partie.index_global;
      
      const itemsInPartie = allItems.filter(i => 
        (i.type === 'sous_partie' && i.partie_id === scopeId) ||
        (i.type === 'ligne_speciale' && i.context_type === 'partie' && i.context_id === scopeId)
      );
      
      const sorted = sortPreservingVisualOrder(itemsInPartie, 'partie', scopeId, oldPartieIndex);
      insertIndex = sorted.findIndex(i => i.type === 'sous_partie' && i.id === spId) + 1;
    }
  }
  else if (position.startsWith('before_partie_')) {
    const partieId = parseInt(position.replace('before_partie_', ''));
    context_type = 'global';
    context_id = null;
    scopeId = 'global';
    
    const parties = allItems.filter(i => i.type === 'partie').sort((a, b) => a.index_global - b.index_global);
    const targetPartie = parties.find(p => p.id === partieId);
    
    if (targetPartie) {
      // Trouver toutes les lignes globales avant cette partie
      const globalItemsBeforePartie = allItems.filter(i => 
        (i.type === 'partie' && i.index_global < targetPartie.index_global) ||
        (i.type === 'ligne_speciale' && i.context_type === 'global' && i.index_global < targetPartie.index_global)
      ).sort((a, b) => a.index_global - b.index_global);
      
      insertIndex = globalItemsBeforePartie.length;
    }
  }
  else if (position.startsWith('after_partie_')) {
    const partieId = parseInt(position.replace('after_partie_', ''));
    context_type = 'global';
    context_id = null;
    scopeId = 'global';
    
    const partie = allItems.find(i => i.type === 'partie' && i.id === partieId);
    
    if (partie) {
      // Trouver toutes les lignes globales jusqu'à cette partie incluse
      const globalItemsUpToPartie = allItems.filter(i => 
        (i.type === 'partie' && i.index_global <= partie.index_global) ||
        (i.type === 'ligne_speciale' && i.context_type === 'global' && i.index_global <= partie.index_global)
      ).sort((a, b) => a.index_global - b.index_global);
      
      insertIndex = globalItemsUpToPartie.length;
    }
  }
  
  // Créer la nouvelle ligne avec les métadonnées
  const lineToInsert = {
    ...newLine,
    type: 'ligne_speciale',
    context_type,
    context_id,
    index_global: 999 // Temporaire
  };
  
  // Supprimer l'ancienne ligne si déplacement
  let itemsWithoutOld = allItems;
  if (newLine.isMoving && newLine.originalId) {
    itemsWithoutOld = allItems.filter(i => 
      !(i.type === 'ligne_speciale' && i.id === newLine.originalId)
    );
  }
  
  // Insérer et réindexer le scope
  if (scopeId === 'global' && context_type === 'global') {
    // Récupérer tous les éléments globaux (parties + lignes spéciales globales)
    const globalItems = itemsWithoutOld.filter(i => 
      i.type === 'partie' ||
      (i.type === 'ligne_speciale' && i.context_type === 'global')
    ).sort((a, b) => a.index_global - b.index_global);
    
    // Insérer la ligne à la position
    globalItems.splice(insertIndex >= 0 ? insertIndex : 0, 0, lineToInsert);
    
    // Réindexer séquentiellement : 0.001, 0.002, 1, 1.001, 2, 2.001...
    // Les parties gardent leur index entier (1, 2, 3...)
    // Les lignes spéciales prennent des index décimaux
    let partieCount = 0;
    const reindexed = globalItems.map((item, idx) => {
      if (item.type === 'partie') {
        partieCount++;
        return { ...item, index_global: partieCount };
      } else {
        // Ligne spéciale globale
        if (partieCount === 0) {
          // Avant la première partie : 0.001, 0.002, 0.003...
          const specialsBefore = globalItems.slice(0, idx).filter(i => i.type === 'ligne_speciale');
          return { ...item, index_global: roundIndex((specialsBefore.length + 1) * INCREMENTS.GLOBAL_SPECIAL) };
        } else {
          // Entre/après des parties : 1.001, 1.002... 2.001, 2.002...
          const specialsAfterLastPartie = globalItems.slice(0, idx).filter(i => 
            i.type === 'ligne_speciale' && 
            globalItems.slice(0, globalItems.indexOf(i)).filter(gi => gi.type === 'partie').length === partieCount
          );
          return { ...item, index_global: roundIndex(partieCount + (specialsAfterLastPartie.length + 1) * INCREMENTS.GLOBAL_SPECIAL) };
        }
      }
    });
    
    // Reconstruire allItems
    const result = itemsWithoutOld.map(item => {
      const updated = reindexed.find(r => r.type === item.type && r.id === item.id);
      return updated || item;
    });
    
    // Ajouter la ligne si nouvelle
    if (!result.find(i => i.type === 'ligne_speciale' && i.id === lineToInsert.id)) {
      const inserted = reindexed.find(r => r.type === 'ligne_speciale' && r.id === lineToInsert.id);
      if (inserted) {
        result.push(inserted);
      }
    }
    
    return sortByIndexGlobal(result);
  }
  else if (scopeId && context_type === 'sous_partie') {
    const sp = itemsWithoutOld.find(i => i.type === 'sous_partie' && i.id === scopeId);
    const itemsInSP = itemsWithoutOld.filter(i => 
      (i.type === 'ligne_detail' && i.sous_partie_id === scopeId) ||
      (i.type === 'ligne_speciale' && i.context_type === 'sous_partie' && i.context_id === scopeId)
    );
    
    const sorted = sortPreservingVisualOrder(itemsInSP, 'sous_partie', scopeId, sp.index_global);
    
    // Insérer à la position
    sorted.splice(insertIndex >= 0 ? insertIndex : 0, 0, lineToInsert);
    
    // Réindexer séquentiellement
    const reindexed = sorted.map((item, idx) => ({
      ...item,
      index_global: roundIndex(sp.index_global + (idx + 1) * INCREMENTS.LIGNE_DETAIL)
    }));
    
    // Reconstruire
    const result = itemsWithoutOld.map(item => {
      const updated = reindexed.find(r => r.type === item.type && r.id === item.id);
      return updated || item;
    });
    
    // Ajouter la ligne si nouvelle
    if (!result.find(i => i.type === 'ligne_speciale' && i.id === lineToInsert.id)) {
      const inserted = reindexed.find(r => r.type === 'ligne_speciale' && r.id === lineToInsert.id);
      if (inserted) {
        result.push(inserted);
      }
    }
    
    return sortByIndexGlobal(result);
  }
  else if (scopeId && context_type === 'partie') {
    const partie = itemsWithoutOld.find(i => i.type === 'partie' && i.id === scopeId);
    const itemsInPartie = itemsWithoutOld.filter(i => 
      (i.type === 'sous_partie' && i.partie_id === scopeId) ||
      (i.type === 'ligne_speciale' && i.context_type === 'partie' && i.context_id === scopeId)
    );
    
    const sorted = sortPreservingVisualOrder(itemsInPartie, 'partie', scopeId, partie.index_global);
    
    // Insérer à la position
    sorted.splice(insertIndex >= 0 ? insertIndex : 0, 0, lineToInsert);
    
    // Réindexer séquentiellement
    const reindexed = sorted.map((item, idx) => ({
      ...item,
      index_global: roundIndex(partie.index_global + (idx + 1) * INCREMENTS.SOUS_PARTIE)
    }));
    
    // Reconstruire
    const result = itemsWithoutOld.map(item => {
      const updated = reindexed.find(r => r.type === item.type && r.id === item.id);
      return updated || item;
    });
    
    // Ajouter la ligne si nouvelle
    if (!result.find(i => i.type === 'ligne_speciale' && i.id === lineToInsert.id)) {
      const inserted = reindexed.find(r => r.type === 'ligne_speciale' && r.id === lineToInsert.id);
      if (inserted) {
        result.push(inserted);
      }
    }
    
    return sortByIndexGlobal(result);
  }
  
  // Fallback : simple ajout
  return sortByIndexGlobal([...itemsWithoutOld, lineToInsert]);
};

/**
 * Réordonner après un drag & drop
 * 
 * @param {Array} allItems - Tous les éléments du devis
 * @param {Object} result - Résultat du drag & drop (react-beautiful-dnd)
 * @returns {Array} Tous les éléments réordonnés
 */
const reorderAfterDrag = (allItems, result) => {
  const { source, destination, draggableId } = result;
  
  if (!destination) return allItems;
  
  // Drag & drop des parties
  if (source.droppableId === 'parties-global') {
    const partieId = parseInt(draggableId.replace('partie_', ''));
    
    const parties = allItems.filter(i => i.type === 'partie')
      .sort((a, b) => a.index_global - b.index_global);
    
    const [moved] = parties.splice(source.index, 1);
    parties.splice(destination.index, 0, moved);
    
    // Recalculer les index de parties
    parties.forEach((partie, idx) => {
      allItems = allItems.map(item => 
        item.type === 'partie' && item.id === partie.id
          ? { ...item, index_global: idx + 1 }
          : item
      );
    });
    
    // Réindexer toutes les parties (enfants inclus)
    parties.forEach(partie => {
      allItems = reindexPartie(allItems, partie.id);
    });
    
    // Réindexer toutes les sous-parties
    const sousParties = allItems.filter(i => i.type === 'sous_partie');
    sousParties.forEach(sp => {
      allItems = reindexSousPartie(allItems, sp.id);
    });
    
    return sortByIndexGlobal(allItems);
  }
  
  // Drag & drop des sous-parties
  if (source.droppableId.startsWith('sous-parties-')) {
    const partieId = parseInt(source.droppableId.replace('sous-parties-', ''));
    
    const sousParties = allItems.filter(i => i.type === 'sous_partie' && i.partie_id === partieId)
      .sort((a, b) => a.index_global - b.index_global);
    
    const [moved] = sousParties.splice(source.index, 1);
    sousParties.splice(destination.index, 0, moved);
    
    // ✅ CRITIQUE : Capturer les anciens index AVANT modification
    const oldIndexMap = new Map();
    sousParties.forEach(sp => {
      const spItem = allItems.find(i => i.type === 'sous_partie' && i.id === sp.id);
      oldIndexMap.set(sp.id, spItem.index_global);
    });
    
    // Recalculer les nouveaux index de sous-parties
    const partie = allItems.find(i => i.type === 'partie' && i.id === partieId);
    const newIndexMap = new Map();
    sousParties.forEach((sp, idx) => {
      const newIndex = roundIndex(partie.index_global + (idx + 1) * INCREMENTS.SOUS_PARTIE);
      newIndexMap.set(sp.id, newIndex);
    });
    
    // Mettre à jour les index des sous-parties
    allItems = allItems.map(item => {
      if (item.type === 'sous_partie' && newIndexMap.has(item.id)) {
        return { ...item, index_global: newIndexMap.get(item.id) };
      }
      return item;
    });
    
    // ✅ Réindexer chaque sous-partie avec l'ordre préservé
    sousParties.forEach(sp => {
      const oldSpIndex = oldIndexMap.get(sp.id);
      const newSpIndex = newIndexMap.get(sp.id);
      
      // Récupérer tous les éléments de cette sous-partie
      const itemsInSP = allItems.filter(i => 
        (i.type === 'ligne_detail' && i.sous_partie_id === sp.id) ||
        (i.type === 'ligne_speciale' && i.context_type === 'sous_partie' && i.context_id === sp.id)
      );
      
      if (itemsInSP.length === 0) {
        return;
      }
      
      // ✅ Trier en préservant l'ordre visuel avec l'ANCIEN index
      const sorted = sortPreservingVisualOrder(itemsInSP, 'sous_partie', sp.id, oldSpIndex);
      
      // Réindexer séquentiellement avec le NOUVEAU index de base
      const reindexed = sorted.map((item, idx) => ({
        ...item,
        index_global: roundIndex(newSpIndex + (idx + 1) * INCREMENTS.LIGNE_DETAIL)
      }));
      
      // Remplacer dans allItems
      allItems = allItems.map(item => {
        const updated = reindexed.find(r => r.type === item.type && r.id === item.id);
        return updated || item;
      });
    });
    
    const finalSorted = sortByIndexGlobal(allItems);
    
    return finalSorted;
  }
  
  // Drag & drop des lignes détails
  if (source.droppableId.startsWith('lignes-')) {
    const sousPartieId = parseInt(source.droppableId.replace('lignes-', ''));
    
    const sp = allItems.find(i => i.type === 'sous_partie' && i.id === sousPartieId);
    const oldSpIndex = sp.index_global;
    
    const lignesInSP = allItems.filter(i => 
      (i.type === 'ligne_detail' && i.sous_partie_id === sousPartieId) ||
      (i.type === 'ligne_speciale' && i.context_type === 'sous_partie' && i.context_id === sousPartieId)
    );
    
    // Trier en préservant l'ordre visuel
    const sorted = sortPreservingVisualOrder(lignesInSP, 'sous_partie', sousPartieId, oldSpIndex);
    
    // Extraire seulement les lignes détails pour le réordonnancement
    const lignesDetailsOnly = sorted.filter(i => i.type === 'ligne_detail');
    const [moved] = lignesDetailsOnly.splice(source.index, 1);
    lignesDetailsOnly.splice(destination.index, 0, moved);
    
    // Reconstruire avec les lignes spéciales à leur place
    const reordered = [];
    let ldIndex = 0;
    
    sorted.forEach(item => {
      if (item.type === 'ligne_detail') {
        reordered.push(lignesDetailsOnly[ldIndex]);
        ldIndex++;
      } else {
        reordered.push(item);
      }
    });
    
    // Réindexer séquentiellement
    const reindexed = reordered.map((item, idx) => ({
      ...item,
      index_global: roundIndex(sp.index_global + (idx + 1) * INCREMENTS.LIGNE_DETAIL)
    }));
    
    // Reconstruire allItems
    return allItems.map(item => {
      const updated = reindexed.find(r => r.type === item.type && r.id === item.id);
      return updated || item;
    });
  }
  
  return allItems;
};

/**
 * Calculer le prochain index disponible dans un scope
 * 
 * @param {Array} allItems - Tous les éléments du devis
 * @param {string} scopeType - Type de scope ('sous_partie', 'partie', 'global')
 * @param {number} scopeId - ID du scope
 * @returns {number|null} Le prochain index disponible
 */
const getNextIndex = (allItems, scopeType, scopeId) => {
  if (scopeType === 'sous_partie') {
    const sp = allItems.find(i => i.type === 'sous_partie' && i.id === scopeId);
    if (!sp) return null;
    
    const itemsInSP = allItems.filter(i => 
      (i.type === 'ligne_detail' && i.sous_partie_id === scopeId) ||
      (i.type === 'ligne_speciale' && i.context_type === 'sous_partie' && i.context_id === scopeId)
    );
    
    if (itemsInSP.length === 0) {
      return roundIndex(sp.index_global + INCREMENTS.LIGNE_DETAIL);
    }
    
    const maxIndex = Math.max(...itemsInSP.map(i => i.index_global));
    return roundIndex(maxIndex + INCREMENTS.LIGNE_DETAIL);
  }
  
  if (scopeType === 'partie') {
    const partie = allItems.find(i => i.type === 'partie' && i.id === scopeId);
    if (!partie) return null;
    
    const itemsInPartie = allItems.filter(i => 
      (i.type === 'sous_partie' && i.partie_id === scopeId) ||
      (i.type === 'ligne_speciale' && i.context_type === 'partie' && i.context_id === scopeId)
    );
    
    if (itemsInPartie.length === 0) {
      return roundIndex(partie.index_global + INCREMENTS.SOUS_PARTIE);
    }
    
    const maxIndex = Math.max(...itemsInPartie.map(i => i.index_global));
    return roundIndex(maxIndex + INCREMENTS.SOUS_PARTIE);
  }
  
  return null;
};

// ==========================================
// EXPORTS
// ==========================================

export const DevisIndexManager = {
  // Utilitaires
  roundIndex,
  getPartiePrefix,
  getSousPartieIndex,
  getRelativePosition,
  
  // Tri
  sortPreservingVisualOrder,
  sortByIndexGlobal,
  
  // Réindexation
  reindexSousPartie,
  reindexPartie,
  reindexAll,
  
  // Insertion
  insertAtPosition,
  
  // Réordonnancement
  reorderAfterDrag,
  
  // Utilitaires
  getNextIndex,
  
  // Constantes
  INCREMENTS
};

export default DevisIndexManager;

