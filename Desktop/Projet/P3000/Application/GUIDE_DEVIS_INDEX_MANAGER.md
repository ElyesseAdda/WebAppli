# 📖 Guide d'utilisation : DevisIndexManager

## 🎯 Vue d'ensemble

Le **DevisIndexManager** est un module centralisé qui gère tous les calculs d'`index_global` dans le système de devis. Il remplace les fonctions dispersées et garantit la cohérence du système hiérarchique.

## 🏗️ Architecture

```
DevisIndexManager.js (Source unique de vérité)
        ↓
    ┌───────────────┬─────────────────┐
    ↓               ↓                 ↓
DevisAvance.js  DevisTable.js   Autres composants
```

## 📦 Import

```javascript
import { DevisIndexManager } from '../utils/DevisIndexManager';
```

## 🔧 Fonctions principales

### 1. **Tri intelligent**

#### `sortPreservingVisualOrder(items, scopeType, scopeId, oldScopeIndex)`

Trie les éléments en préservant l'ordre visuel, même après un drag & drop.

**Exemple** :
```javascript
// Après drag d'une sous-partie 1.1 → 1.3
const items = [
  { id: 1, type: 'ligne_speciale', index_global: 1.201 }, // Ancienne position
  { id: 2, type: 'ligne_detail', index_global: 1.102 }    // Ancienne position
];

// ❌ Tri classique donnerait : 1.102, 1.201 (MAUVAIS ordre visuel)
// ✅ Notre tri donne : 1.201, 1.102 (BON ordre visuel préservé)

const sp = { id: 14, index_global: 1.3 };
const sorted = DevisIndexManager.sortPreservingVisualOrder(
  items, 
  'sous_partie', 
  14, 
  1.1  // Ancien index de la sous-partie
);
```

#### `sortByIndexGlobal(items)`

Tri simple par index_global (pour les cas sans conflit).

```javascript
const sorted = DevisIndexManager.sortByIndexGlobal(devisItems);
```

### 2. **Réindexation**

#### `reindexSousPartie(allItems, sousPartieId)`

Réindexe séquentiellement tous les éléments d'une sous-partie.

```javascript
const updated = DevisIndexManager.reindexSousPartie(devisItems, 16);
// Résultat : 1.201, 1.202, 1.203... (séquentiel)
```

#### `reindexPartie(allItems, partieId)`

Réindexe séquentiellement tous les éléments d'une partie.

```javascript
const updated = DevisIndexManager.reindexPartie(devisItems, 5);
// Résultat : 1.1, 1.2, 1.3... (sous-parties), puis leurs contenus
```

#### `reindexAll(items)`

Réindexe complètement tout le devis (hiérarchique).

```javascript
const updated = DevisIndexManager.reindexAll(devisItems);
```

### 3. **Insertion de lignes spéciales**

#### `insertAtPosition(allItems, newLine, position)`

Insère une ligne spéciale à une position spécifique.

**Positions supportées** :
- `'global_start'` : Début du devis
- `'before_ligne_5'` : Avant la ligne détail ID 5
- `'after_ligne_3'` : Après la ligne détail ID 3
- `'before_sp_12'` : Avant la sous-partie ID 12
- `'after_sp_8'` : Après la sous-partie ID 8
- `'before_partie_2'` : Avant la partie ID 2
- `'after_partie_1'` : Après la partie ID 1

**Exemple** :
```javascript
const newLine = {
  id: Date.now().toString(),
  description: 'Remise 10%',
  value: 10,
  value_type: 'percentage',
  type_speciale: 'remise'
};

const updated = DevisIndexManager.insertAtPosition(
  devisItems, 
  newLine, 
  'before_ligne_5'
);

// La ligne sera insérée et tous les éléments du scope seront réindexés
```

### 4. **Drag & Drop**

#### `reorderAfterDrag(allItems, result)`

Gère le réordonnancement après un drag & drop (react-beautiful-dnd).

**Exemple** :
```javascript
const handleDragEnd = (result) => {
  if (!result.destination) return;
  
  // ✅ Une seule ligne pour tout gérer !
  const reordered = DevisIndexManager.reorderAfterDrag(devisItems, result);
  
  setDevisItems(reordered);
};
```

### 5. **Utilitaires**

#### `roundIndex(index)`

Arrondit un index à 3 décimales pour éviter les erreurs de précision.

```javascript
const rounded = DevisIndexManager.roundIndex(1.1000000001); // 1.1
```

#### `getNextIndex(allItems, scopeType, scopeId)`

Calcule le prochain index disponible dans un scope.

```javascript
const nextIndex = DevisIndexManager.getNextIndex(
  devisItems, 
  'sous_partie', 
  16
);
// Retourne 1.205 si le dernier élément est à 1.204
```

## 💡 Cas d'usage courants

### Cas 1 : Placer une ligne spéciale

```javascript
const handlePlaceLineAt = (position) => {
  const newLine = {
    id: lineAwaitingPlacement.id,
    description: lineAwaitingPlacement.description,
    // ... autres propriétés
  };
  
  const updated = DevisIndexManager.insertAtPosition(
    devisItems, 
    newLine, 
    position
  );
  
  setDevisItems(updated);
};
```

### Cas 2 : Gérer le drag & drop

```javascript
const handleDragEnd = (result) => {
  if (!result.destination) return;
  
  const reordered = DevisIndexManager.reorderAfterDrag(devisItems, result);
  
  // Mettre à jour l'état
  onDevisItemsReorder(reordered);
};
```

### Cas 3 : Synchroniser après modification

```javascript
const handleDevisItemsReorder = (reorderedItems) => {
  setIsReordering(true);
  
  // Les items sont déjà réordonnés par le manager
  const sorted = DevisIndexManager.sortByIndexGlobal(reorderedItems);
  
  setDevisItems(sorted);
  syncDevisItemsToSelectedParties(sorted);
  
  setTimeout(() => setIsReordering(false), 100);
};
```

## 🎨 Système d'index hiérarchique

Le système utilise un index décimal avec 3 niveaux :

```
1.000       → Partie 1
1.100       → Sous-partie 1.1
1.101       → Ligne 1 de la sous-partie 1.1
1.102       → Ligne 2 de la sous-partie 1.1
1.103       → Ligne spéciale de la sous-partie 1.1
1.200       → Sous-partie 1.2
2.000       → Partie 2
```

### Incréments

```javascript
DevisIndexManager.INCREMENTS = {
  PARTIE: 1,           // 1, 2, 3...
  SOUS_PARTIE: 0.1,    // 1.1, 1.2, 1.3...
  LIGNE_DETAIL: 0.001, // 1.101, 1.102, 1.103...
  GLOBAL_SPECIAL: 0.5, // 0.5, 1.5, 2.5...
  PARTIE_SPECIAL: 0.05 // 1.05, 1.15...
};
```

## ⚠️ Bonnes pratiques

### ✅ À FAIRE

1. **Toujours utiliser le manager** pour les calculs d'index
2. **Valider les index** après modification avec `validateIndexes()`
3. **Utiliser les flags** `isReordering` et `isSyncing` pour éviter les boucles
4. **Trier après réindexation** avec `sortByIndexGlobal()`

```javascript
// ✅ BON
const updated = DevisIndexManager.reindexSousPartie(items, spId);
validateIndexes(updated, 'après réindexation');
setDevisItems(DevisIndexManager.sortByIndexGlobal(updated));
```

### ❌ À ÉVITER

1. **Ne pas calculer les index manuellement**
2. **Ne pas réindexer plusieurs fois** le même scope
3. **Ne pas trier par index absolu** après un drag & drop sans réindexer

```javascript
// ❌ MAUVAIS - Calcul manuel
item.index_global = sp.index_global + 0.001;

// ✅ BON - Utiliser le manager
const updated = DevisIndexManager.reindexSousPartie(items, spId);
```

## 🐛 Débogage

### Activer les logs détaillés

Le manager inclut des logs console pour le débogage :

```javascript
console.log('🔄 Réindexation SP 16 (base: 1.2):', /* détails */);
console.log('✅ Nouveaux index:', /* résultats */);
```

### Valider la cohérence

```javascript
const validateIndexes = (items, context = '') => {
  const errors = [];
  items.forEach(item => {
    if (item.index_global === undefined || isNaN(item.index_global)) {
      errors.push({ type: item.type, id: item.id, index_global: item.index_global });
    }
  });
  
  if (errors.length > 0) {
    console.error(`❌ Validation ${context} : ${errors.length} erreurs:`, errors);
    return false;
  }
  
  return true;
};
```

## 📊 Performances

Le manager est optimisé pour :
- ✅ **Pas de double réindexation** (une seule fonction centrale)
- ✅ **Tri intelligent** (préserve l'ordre visuel)
- ✅ **Calculs en O(n log n)** pour le tri
- ✅ **Validation optionnelle** (peut être désactivée en production)

## 🔗 Voir aussi

- `SYSTEME_INDEX_HIERARCHIQUE.md` : Détails du système d'indexation
- `GUIDE_UTILISATION_LIGNES_SPECIALES.md` : Guide des lignes spéciales
- `PLAN_REFACTORING_INDEX_MANAGER.md` : Plan de refactoring complet

---

**Dernière mise à jour** : Novembre 2024  
**Version** : 1.0.0

