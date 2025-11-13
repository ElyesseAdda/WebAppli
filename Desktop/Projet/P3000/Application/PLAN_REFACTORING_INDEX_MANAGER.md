# 🎯 Plan de Refactoring : Centralisation du système d'indexation

## 📋 Vue d'ensemble

**Objectif** : Créer un système centralisé de gestion des `index_global` pour éviter les conflits et les réindexations multiples qui causent le désordre des lignes spéciales.

**Problème actuel** : Les fonctions de tri et réindexation sont dispersées entre `DevisTable.js` et `DevisAvance.js`, ce qui crée :
- Double/triple réindexation lors d'un drag & drop
- Tri incohérent (par index absolu au lieu de position relative)
- Perte de l'ordre visuel lors du déplacement vers de nouvelles positions

---

## 🏗️ Architecture cible

```
┌─────────────────────────────────────────────────────────┐
│           DevisIndexManager.js (NOUVEAU)                │
│         Gestionnaire centralisé unique                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ✅ Source unique de vérité pour :                      │
│     - Calcul des index                                  │
│     - Tri des éléments                                  │
│     - Réindexation séquentielle                         │
│     - Insertion aux positions spécifiques               │
│                                                          │
└─────────────────────────────────────────────────────────┘
              ↓ utilisé par ↓
┌──────────────────────┐    ┌──────────────────────┐
│   DevisTable.js      │    │   DevisAvance.js     │
│   (Affichage)        │    │   (État principal)   │
├──────────────────────┤    ├──────────────────────┤
│ ✅ handleDragEnd    │    │ ✅ handlePlaceLineAt │
│    → Manager.reorder │    │    → Manager.insert  │
│ ✅ Pas de réindexe  │    │ ✅ setDevisItems     │
└──────────────────────┘    └──────────────────────┘
```

---

## 📝 Plan d'action détaillé

---

## **PHASE 1 : Création du module centralisé**

### **Étape 1.1 : Créer DevisIndexManager.js**

**Fichier** : `frontend/src/utils/DevisIndexManager.js`

**Contenu** :

```javascript
/**
 * 🎯 DevisIndexManager
 * Gestionnaire centralisé pour tous les calculs d'index_global dans le système de devis
 */

// ==========================================
// CONSTANTES
// ==========================================

const INCREMENTS = {
  PARTIE: 1,           // Parties : 1, 2, 3...
  SOUS_PARTIE: 0.1,    // Sous-parties : 1.1, 1.2, 1.3...
  LIGNE_DETAIL: 0.001, // Lignes : 1.101, 1.102, 1.103...
  GLOBAL_SPECIAL: 0.5, // Lignes spéciales globales : 0.5, 1.5, 2.5...
  PARTIE_SPECIAL: 0.05 // Lignes spéciales de partie : 1.05, 1.15...
};

// ==========================================
// FONCTIONS UTILITAIRES
// ==========================================

/**
 * Arrondir un index à 3 décimales pour éviter les erreurs de précision
 */
const roundIndex = (index) => {
  return Math.round(index * 1000) / 1000;
};

/**
 * Extraire le préfixe de partie (1.205 → 1)
 */
const getPartiePrefix = (index_global) => {
  return Math.floor(index_global);
};

/**
 * Extraire l'index de la sous-partie (1.205 → 1.2)
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
 */
const reindexSousPartie = (allItems, sousPartieId) => {
  const sp = allItems.find(i => i.type === 'sous_partie' && i.id === sousPartieId);
  if (!sp) {
    console.warn(`⚠️ Sous-partie ${sousPartieId} non trouvée`);
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
  
  console.log(`🔄 Réindexation SP ${sousPartieId} (base: ${sp.index_global}):`, sorted.map(i => ({
    type: i.type,
    id: i.id,
    old_index: i.index_global,
    relative_pos: getRelativePosition(i.index_global, oldSpIndex)
  })));
  
  // Réindexer séquentiellement : 1.101, 1.102, 1.103...
  const reindexed = sorted.map((item, idx) => ({
    ...item,
    index_global: roundIndex(sp.index_global + (idx + 1) * INCREMENTS.LIGNE_DETAIL)
  }));
  
  console.log(`✅ Nouveaux index:`, reindexed.map(i => ({
    type: i.type,
    id: i.id,
    new_index: i.index_global
  })));
  
  // Remplacer dans allItems
  return allItems.map(item => {
    const updated = reindexed.find(r => r.type === item.type && r.id === item.id);
    return updated || item;
  });
};

/**
 * Réindexer séquentiellement une partie
 */
const reindexPartie = (allItems, partieId) => {
  const partie = allItems.find(i => i.type === 'partie' && i.id === partieId);
  if (!partie) {
    console.warn(`⚠️ Partie ${partieId} non trouvée`);
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
 */
const reindexAll = (items) => {
  console.log('🔄 Réindexation complète du devis...');
  
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
  
  console.log('✅ Réindexation complète terminée');
  
  return sortByIndexGlobal(updated);
};

// ==========================================
// FONCTIONS D'INSERTION
// ==========================================

/**
 * Insérer une ligne spéciale à une position spécifique
 */
const insertAtPosition = (allItems, newLine, position) => {
  let context_type = 'global';
  let context_id = null;
  let insertIndex = -1;
  let scopeId = null;
  
  // Décoder la position
  if (position === 'global_start') {
    context_type = 'global';
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
  // ... autres positions (before_sp, after_sp, etc.)
  
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
  if (scopeId) {
    const sp = itemsWithoutOld.find(i => i.type === 'sous_partie' && i.id === scopeId);
    const itemsInSP = itemsWithoutOld.filter(i => 
      (i.type === 'ligne_detail' && i.sous_partie_id === scopeId) ||
      (i.type === 'ligne_speciale' && i.context_type === 'sous_partie' && i.context_id === scopeId)
    );
    
    const sorted = sortPreservingVisualOrder(itemsInSP, 'sous_partie', scopeId, sp.index_global);
    
    // Insérer à la position
    sorted.splice(insertIndex, 0, lineToInsert);
    
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
      result.push(inserted);
    }
    
    return sortByIndexGlobal(result);
  }
  
  // Fallback : simple ajout
  return sortByIndexGlobal([...itemsWithoutOld, lineToInsert]);
};

/**
 * Réordonner après un drag & drop
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
    
    // Recalculer les index de sous-parties
    const partie = allItems.find(i => i.type === 'partie' && i.id === partieId);
    sousParties.forEach((sp, idx) => {
      allItems = allItems.map(item => 
        item.type === 'sous_partie' && item.id === sp.id
          ? { ...item, index_global: roundIndex(partie.index_global + (idx + 1) * INCREMENTS.SOUS_PARTIE) }
          : item
      );
    });
    
    // Réindexer chaque sous-partie déplacée
    sousParties.forEach(sp => {
      allItems = reindexSousPartie(allItems, sp.id);
    });
    
    return sortByIndexGlobal(allItems);
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
```

**Pourquoi créer ce fichier** :
- ✅ **Une seule source de vérité** pour tous les calculs d'index
- ✅ **Tri intelligent** qui préserve l'ordre visuel
- ✅ **Réindexation cohérente** partout
- ✅ **Pas de doublons** de logique
- ✅ **Facile à tester** et débugger

---

## **PHASE 2 : Refactoring de DevisAvance.js**

### **Étape 2.1 : Importer le manager**

**Ligne 1** : Ajouter l'import
```javascript
import { DevisIndexManager } from '../utils/DevisIndexManager';
```

### **Étape 2.2 : Remplacer les fonctions locales**

**Supprimer** (lignes ~955-1087) :
- ❌ `roundIndex` (local)
- ❌ `reindexSousPartieSequentially` (local)
- ❌ `reindexPartieSequentially` (local)
- ❌ `reindexGlobalSequentially` (local)

**Remplacer par** :
```javascript
// Utiliser les fonctions du manager
const { roundIndex, reindexSousPartie, reindexPartie } = DevisIndexManager;
```

### **Étape 2.3 : Simplifier handlePlaceLineAt**

**Avant** (lignes 1095-1368) :
```javascript
const handlePlaceLineAt = (position) => {
  // 200+ lignes de calcul d'index et réindexation
  // ...
  if (context_type === 'sous_partie' && context_id) {
    reindexedItems = reindexSousPartieSequentially(newItems, context_id);
  }
  // ...
};
```

**Après** :
```javascript
const handlePlaceLineAt = (position) => {
  if (!lineAwaitingPlacement) return;
  
  setIsReordering(true);
  
  // ✅ Utiliser le manager pour l'insertion
  const updated = DevisIndexManager.insertAtPosition(
    devisItems, 
    lineAwaitingPlacement, 
    position
  );
  
  setDevisItems(updated);
  setLineAwaitingPlacement(null);
  
  // Synchroniser selectedParties
  syncDevisItemsToSelectedParties(updated);
  
  setTimeout(() => setIsReordering(false), 100);
};
```

**Réduction** : ~250 lignes → ~20 lignes ✅

### **Étape 2.4 : Simplifier handleDevisItemsReorder**

**Avant** (lignes 1707-2077) :
```javascript
const handleDevisItemsReorder = (reorderedItems) => {
  // Séparer parties, sous-parties, lignes...
  // Recalculer les index...
  // Réindexer chaque sous-partie...
  // Réindexer chaque partie...
  // Fusionner...
  // Re-trier...
  // ~370 lignes
};
```

**Après** :
```javascript
const handleDevisItemsReorder = (reorderedItems) => {
  setIsReordering(true);
  
  // ✅ Le manager s'occupe de tout
  setDevisItems(reorderedItems);
  
  // Synchroniser selectedParties
  syncDevisItemsToSelectedParties(reorderedItems);
  
  setTimeout(() => setIsReordering(false), 100);
  
  // Sauvegarder en BDD si nécessaire
  if (devisData.id) {
    saveOrderToDB(reorderedItems);
  }
};
```

**Réduction** : ~370 lignes → ~20 lignes ✅

### **Étape 2.5 : Créer syncDevisItemsToSelectedParties**

**Nouvelle fonction** (pour remplacer la logique dispersée) :

```javascript
/**
 * Synchroniser devisItems → selectedParties
 * Direction unique pour éviter les boucles
 */
const syncDevisItemsToSelectedParties = (items) => {
  const parties = items.filter(i => i.type === 'partie');
  
  const synced = parties.map(partieItem => {
    const oldPartie = selectedParties.find(p => p.id === partieItem.id);
    
    const sousParties = items
      .filter(i => i.type === 'sous_partie' && i.partie_id === partieItem.id)
      .map(spItem => {
        const oldSP = oldPartie?.selectedSousParties?.find(sp => sp.id === spItem.id);
        
        const lignesDetails = items
          .filter(i => i.type === 'ligne_detail' && i.sous_partie_id === spItem.id)
          .map(ldItem => ({
            ...ldItem,
            type: undefined // Retirer le type pour format original
          }));
        
        return {
          ...oldSP,
          ...spItem,
          type: undefined,
          index_global: spItem.index_global,
          selectedLignesDetails: lignesDetails
        };
      });
    
    return {
      ...oldPartie,
      ...partieItem,
      type: oldPartie?.type || 'PEINTURE',
      index_global: partieItem.index_global,
      selectedSousParties: sousParties
    };
  });
  
  setSelectedParties(synced);
};
```

### **Étape 2.6 : Simplifier convertSelectedPartiesToDevisItems**

**Avant** (lignes 1493-1641) :
```javascript
// Calcule les index OU les préserve
if (ld.index_global !== undefined) {
  ldIndex = ld.index_global;
} else {
  ldIndex = roundIndex(spIndex + (ldIdx + 1) * 0.001);
}
```

**Après** (plus besoin de cette logique complexe) :
```javascript
// Toujours préserver l'index_global (il est TOUJOURS présent maintenant)
const ldIndex = ld.index_global;

// Si pas d'index (cas rare), utiliser le manager
if (!ldIndex) {
  ldIndex = DevisIndexManager.getNextIndex(items, 'sous_partie', sp.id);
}
```

**Simplification** : La logique est garantie car on synchronise toujours.

---

## **PHASE 3 : Refactoring de DevisTable.js**

### **Étape 3.1 : Importer le manager**

```javascript
import { DevisIndexManager } from '../utils/DevisIndexManager';
```

### **Étape 3.2 : Simplifier handleDragEnd**

**Avant** (lignes 333-628) :
```javascript
const handleDragEnd = (result) => {
  // 300 lignes de logique de réordonnancement
  // Calculs d'index pour parties
  // Calculs d'index pour sous-parties
  // Calculs d'index pour lignes
  // Gestion des lignes spéciales
  // ...
};
```

**Après** :
```javascript
const handleDragEnd = (result) => {
  setDraggingType(null);
  
  if (!result.destination) return;
  
  // ✅ Le manager s'occupe de tout
  const reordered = DevisIndexManager.reorderAfterDrag(devisItems, result);
  
  // Mettre à jour via le handler parent
  if (onDevisItemsReorder) {
    onDevisItemsReorder(reordered);
  }
  
  // Mettre à jour selectedParties pour compatibilité
  if (result.source.droppableId === 'parties-global' && onPartiesReorder) {
    const parties = reordered.filter(i => i.type === 'partie');
    onPartiesReorder(parties);
  }
};
```

**Réduction** : ~300 lignes → ~20 lignes ✅

### **Étape 3.3 : Supprimer les fonctions locales**

**Supprimer** :
- ❌ `roundIndex` (ligne 304-306) → Utiliser `DevisIndexManager.roundIndex`

---

## **PHASE 4 : Tests et validation**

### **Étape 4.1 : Tests de placement initial**

**Scénarios** :
1. ✅ Placer ligne spéciale AVANT première ligne détail → Index `1.101`
2. ✅ Placer ligne spéciale APRÈS dernière ligne détail → Index `1.10X`
3. ✅ Placer ligne spéciale ENTRE deux lignes → Index séquentiel

**Validation** :
- Vérifier que `index_global` est correct
- Vérifier l'ordre visuel
- Vérifier les logs de réindexation

### **Étape 4.2 : Tests de drag & drop**

**Scénarios** :
1. ✅ Drag SP avec ligne spéciale en position 1 → Reste en position 1
2. ✅ Drag SP vers nouvelle position jamais utilisée → Ordre préservé
3. ✅ Drag SP retour vers ancienne position → Ordre préservé
4. ✅ Drag plusieurs fois de suite → Ordre stable

**Validation** :
- Vérifier l'ordre visuel après chaque drag
- Vérifier les `index_global` dans la console
- Vérifier que `selectedParties` est synchronisé

### **Étape 4.3 : Tests de repositionnement**

**Scénarios** :
1. ✅ Repositionner ligne spéciale → Nouvel ordre correct
2. ✅ Drag après repositionnement → Ordre préservé
3. ✅ Multiple repositionnements → Pas de conflit d'index

---

## **PHASE 5 : Nettoyage et optimisation**

### **Étape 5.1 : Supprimer le code mort**

**Dans DevisAvance.js**, supprimer :
- ❌ Fonctions de calcul d'index redondantes
- ❌ Logs de debug (ou les garder derrière un flag)
- ❌ Code commenté inutilisé

**Dans DevisTable.js**, supprimer :
- ❌ Logique de réindexation locale
- ❌ Calculs d'offset complexes

### **Étape 5.2 : Optimiser le useEffect**

**Actuel** : Se déclenche trop souvent
```javascript
useEffect(() => {
  if (isReordering) return;
  // convertSelectedPartiesToDevisItems
}, [selectedParties, isReordering]);
```

**Optimisé** : Se déclenche seulement quand nécessaire
```javascript
useEffect(() => {
  if (isReordering || isSyncing) return;
  // convertSelectedPartiesToDevisItems
}, [selectedParties, isReordering, isSyncing]);
```

### **Étape 5.3 : Ajouter des garde-fous**

```javascript
// Validation que tous les éléments ont un index_global valide
const validateIndexes = (items) => {
  items.forEach(item => {
    if (item.index_global === undefined || item.index_global === null) {
      console.error(`❌ Élément sans index_global:`, item);
    }
  });
};
```

---

## **PHASE 6 : Documentation**

### **Étape 6.1 : Documenter le DevisIndexManager**

- JSDoc pour chaque fonction
- Exemples d'utilisation
- Explication du système de tri préservant l'ordre visuel

### **Étape 6.2 : Mettre à jour les guides existants**

Mettre à jour :
- `SYSTEME_INDEX_HIERARCHIQUE.md`
- `TODO_REFACTORING_LIGNES_SPECIALES.md`
- `GUIDE_UTILISATION_LIGNES_SPECIALES.md`

---

## 📊 **Métriques de réduction**

| Fichier | Avant | Après | Réduction |
|---------|-------|-------|-----------|
| DevisAvance.js | ~2600 lignes | ~2000 lignes | -600 lignes |
| DevisTable.js | ~2350 lignes | ~2050 lignes | -300 lignes |
| **TOTAL** | **4950 lignes** | **4050 lignes** | **-900 lignes** |

**Nouveau fichier** : `DevisIndexManager.js` (~400 lignes)

**Bilan net** : -500 lignes de code dupliqué ✅

---

## 🎯 **Bénéfices attendus**

✅ **Ordre visuel toujours préservé** (tri par position relative)  
✅ **Pas de double réindexation** (une seule fonction centrale)  
✅ **Code 20% plus court** (-500 lignes)  
✅ **Plus maintenable** (logique centralisée)  
✅ **Plus rapide** (moins de calculs redondants)  
✅ **Plus fiable** (moins de cas edge)

---

## ⚠️ **Risques et mitigations**

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| Régression sur cas existants | Moyen | Élevé | Tests exhaustifs avant merge |
| Performance dégradée | Faible | Moyen | Profiling avant/après |
| Bugs d'arrondi | Faible | Faible | Utiliser roundIndex partout |

---

## 🚀 **Ordre d'implémentation recommandé**

### **Sprint 1 : Fondations** (2-3h)
- ✅ Créer `DevisIndexManager.js`
- ✅ Écrire les tests unitaires du manager
- ✅ Valider le tri préservant l'ordre visuel

### **Sprint 2 : Refactoring DevisAvance** (3-4h)
- ✅ Importer et utiliser le manager
- ✅ Simplifier `handlePlaceLineAt`
- ✅ Simplifier `handleDevisItemsReorder`
- ✅ Créer `syncDevisItemsToSelectedParties`

### **Sprint 3 : Refactoring DevisTable** (2-3h)
- ✅ Importer et utiliser le manager
- ✅ Simplifier `handleDragEnd`
- ✅ Supprimer code redondant

### **Sprint 4 : Tests et validation** (2-3h)
- ✅ Tester tous les scénarios
- ✅ Vérifier les performances
- ✅ Corriger les bugs éventuels

### **Sprint 5 : Nettoyage et documentation** (1-2h)
- ✅ Supprimer le code mort
- ✅ Mettre à jour la documentation
- ✅ Ajouter les JSDoc

**Total estimé** : 10-15 heures

---

## 🔧 **Points critiques à valider**

### **1. Tri par position relative**

**Question** : Comment trier des éléments qui viennent de scopes différents ?

**Réponse** : On ne trie que les éléments **du même scope**. Avant de trier, on filtre par :
- Même `sous_partie_id` pour les lignes détails
- Même `context_id` pour les lignes spéciales de sous-partie

**Exemple** :
```javascript
// ✅ BON : Trier dans le même scope
const itemsInSP = items.filter(i => i.sous_partie_id === 16);
const sorted = sortPreservingVisualOrder(itemsInSP, oldSpIndex);

// ❌ MAUVAIS : Trier des éléments de scopes différents
const allLignes = items.filter(i => i.type === 'ligne_detail');
const sorted = allLignes.sort(...); // Index de scopes différents !
```

### **2. Synchronisation unidirectionnelle**

**Question** : Qui est la source de vérité, `devisItems` ou `selectedParties` ?

**Réponse** : `devisItems` est la source de vérité.

**Flux** :
```
Action utilisateur
  ↓
Modification de devisItems (via Manager)
  ↓
Synchronisation devisItems → selectedParties
  ↓
useEffect désactivé (isReordering = true)
```

### **3. Gestion de l'état transitoire**

**Question** : Comment éviter que le `useEffect` ne se déclenche pendant les opérations ?

**Réponse** : Utiliser le flag `isReordering` de manière stricte :

```javascript
// Début d'opération
setIsReordering(true);

// Modifications de devisItems
const updated = DevisIndexManager.reorderAfterDrag(...);
setDevisItems(updated);

// Synchronisation
syncDevisItemsToSelectedParties(updated);

// Fin d'opération (après un délai pour être sûr)
setTimeout(() => setIsReordering(false), 100);
```

---

## 🧪 **Stratégie de test**

### **Tests unitaires du DevisIndexManager**

```javascript
describe('DevisIndexManager', () => {
  describe('sortPreservingVisualOrder', () => {
    it('préserve l\'ordre visuel avec des index de scopes différents', () => {
      const items = [
        { id: 1, type: 'ligne_detail', index_global: 1.102 },
        { id: 2, type: 'ligne_speciale', index_global: 1.201 }, // Était en position 1
        { id: 3, type: 'ligne_detail', index_global: 1.103 }
      ];
      
      const sorted = sortPreservingVisualOrder(items, 'sous_partie', 14, 1.1);
      
      expect(sorted[0].id).toBe(2); // Ligne spéciale en premier
      expect(sorted[1].id).toBe(1);
      expect(sorted[2].id).toBe(3);
    });
  });
  
  describe('reindexSousPartie', () => {
    it('réindexe séquentiellement en préservant l\'ordre', () => {
      const items = [
        { id: 1, type: 'sous_partie', index_global: 1.2 },
        { id: 2, type: 'ligne_speciale', index_global: 1.201, context_id: 1 },
        { id: 3, type: 'ligne_detail', index_global: 1.102, sous_partie_id: 1 }
      ];
      
      const reindexed = reindexSousPartie(items, 1);
      
      expect(reindexed.find(i => i.id === 2).index_global).toBe(1.201); // Ligne spéciale
      expect(reindexed.find(i => i.id === 3).index_global).toBe(1.202); // Ligne détail
    });
  });
});
```

### **Tests d'intégration**

**Scénario complet** :
1. Créer un devis avec 2 parties, 3 sous-parties, 10 lignes
2. Placer 5 lignes spéciales à différentes positions
3. Drag & drop chaque sous-partie vers différentes positions
4. Vérifier que l'ordre visuel est préservé à chaque étape

---

## 🎯 **Critères de succès**

✅ **Toutes les lignes spéciales restent à leur position visuelle** après n'importe quel drag & drop  
✅ **Pas de conflit d'index** (tous les index sont uniques)  
✅ **Pas de logs d'erreur** dans la console  
✅ **Pas de recalcul visible** (pas de "flash" à l'écran)  
✅ **Code réduit de 20%** minimum  
✅ **Tests unitaires passent à 100%**

---

## 📅 **Planning proposé**

### **Semaine 1**
- Jour 1-2 : Créer `DevisIndexManager.js` + tests unitaires
- Jour 3 : Valider le tri par position relative
- Jour 4-5 : Refactoring `DevisAvance.js`

### **Semaine 2**
- Jour 1-2 : Refactoring `DevisTable.js`
- Jour 3 : Tests d'intégration
- Jour 4 : Corrections de bugs
- Jour 5 : Documentation et nettoyage

---

## 🔄 **Migration progressive (option alternative)**

Si tu préfères une migration **sans risque**, on peut faire une **migration progressive** :

### **Étape 1 : Cohabitation**
- Créer `DevisIndexManager.js`
- Garder l'ancien code
- Utiliser le nouveau code seulement pour les **nouveaux placements**
- Flag dans les items : `{ usesNewSystem: true }`

### **Étape 2 : Migration graduelle**
- Migrer d'abord les **sous-parties** uniquement
- Puis les **parties**
- Puis le **niveau global**

### **Étape 3 : Suppression de l'ancien code**
- Une fois tous les tests validés
- Supprimer progressivement l'ancien code

---

## 🤔 **Décision à prendre**

**Option A : Refactoring complet** (recommandé)
- ✅ Plus propre
- ✅ Moins de dette technique
- ⚠️ Plus risqué à court terme
- ⏱️ 10-15h de travail

**Option B : Migration progressive**
- ✅ Moins risqué
- ✅ Testable par petits bouts
- ⚠️ Code plus complexe temporairement
- ⏱️ 15-20h de travail

**Quelle option préfères-tu ?** 🤔

---

## 📌 **Prochaines étapes immédiates**

Si tu valides le plan :

1. ✅ **Je crée `DevisIndexManager.js`** avec toutes les fonctions
2. ✅ **J'écris les tests unitaires** pour valider la logique
3. ✅ **Je refactorise `handlePlaceLineAt`** pour utiliser le manager
4. ✅ **On teste** que le placement fonctionne correctement
5. ✅ **Puis on continue** avec le reste du refactoring

**Veux-tu que je commence par créer le DevisIndexManager ?** 🚀

