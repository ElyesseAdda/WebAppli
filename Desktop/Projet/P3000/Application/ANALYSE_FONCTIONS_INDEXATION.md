# 📊 Analyse des fonctions d'indexation

## 🎯 Vue d'ensemble

Ce document liste **toutes les fonctions** qui manipulent `index_global` dans `DevisAvance.js` et `DevisTable.js`, avec leur utilité et leur statut après le refactoring.

---

## 📁 DEVISAVANCE.JS

### ✅ **Fonctions utilisant le DevisIndexManager** (À GARDER)

#### 1. `const { roundIndex, reindexSousPartie, reindexPartie, reindexAll } = DevisIndexManager;`
- **Ligne** : 984
- **Utilité** : Import des fonctions du manager
- **Status** : ✅ **GARDER** - C'est le point d'entrée du système centralisé

---

### 🔧 **Fonctions utilitaires d'indexation** (REDONDANTES avec DevisIndexManager)

#### 2. `getPartiePrefix(index_global)`
- **Ligne** : 1230
- **Utilité** : Extraire le préfixe de partie (1.205 → 1)
- **Existe dans manager** : ✅ OUI (`DevisIndexManager.getPartiePrefix`)
- **Status** : ❌ **SUPPRIMER** - Utiliser `DevisIndexManager.getPartiePrefix`

#### 3. `getSousPartieIndex(index_global)`
- **Ligne** : 1235
- **Utilité** : Extraire l'index de sous-partie (1.205 → 1.2)
- **Existe dans manager** : ✅ OUI (`DevisIndexManager.getSousPartieIndex`)
- **Status** : ❌ **SUPPRIMER** - Utiliser `DevisIndexManager.getSousPartieIndex`

#### 4. `isSamePartie(index1, index2)`
- **Ligne** : 1248
- **Utilité** : Vérifier si deux index appartiennent à la même partie
- **Existe dans manager** : ❌ NON
- **Status** : ⚠️ **OPTIONNEL** - Peut rester si utilisé, sinon supprimer

#### 5. `isSameSousPartie(index1, index2)`
- **Ligne** : 1253
- **Utilité** : Vérifier si deux index appartiennent à la même sous-partie
- **Existe dans manager** : ❌ NON
- **Status** : ⚠️ **OPTIONNEL** - Peut rester si utilisé, sinon supprimer

#### 6. `getNextIndexInPartie(partieId, items)`
- **Ligne** : 1258
- **Utilité** : Calculer le prochain index disponible dans une partie
- **Existe dans manager** : ⚠️ PARTIEL (`DevisIndexManager.getNextIndex` mais pour sous-parties)
- **Status** : ❌ **SUPPRIMER** - Ajouter au manager ou utiliser `getNextIndex`

#### 7. `getNextIndexInSousPartie(sousPartieId, items)`
- **Ligne** : 1284
- **Utilité** : Calculer le prochain index disponible dans une sous-partie
- **Existe dans manager** : ✅ OUI (`DevisIndexManager.getNextIndex`)
- **Status** : ❌ **SUPPRIMER** - Utiliser `DevisIndexManager.getNextIndex(items, 'sous_partie', sousPartieId)`

#### 8. `shiftItemsAfter(baseIndex, scope, increment, items)`
- **Ligne** : 1307
- **Utilité** : Décaler les éléments après un index donné
- **Existe dans manager** : ❌ NON
- **Usage** : ⚠️ **Non utilisé** (aucune référence trouvée)
- **Status** : ❌ **SUPPRIMER** - Code mort

---

### 🔄 **Fonctions de conversion** (PROBLÉMATIQUES)

#### 9. `convertSelectedPartiesToDevisItems(parties)`
- **Ligne** : 1329
- **Utilité** : Convertir `selectedParties` en `devisItems` avec calcul d'index
- **Problème** : ❌ **RECALCULE les index** alors que le manager les a déjà calculés
- **Usage** : Ligne 1410 dans `useEffect [selectedParties]`
- **Status** : ⚠️ **PROBLÉMATIQUE** - C'est ce qui ÉCRASE les index du manager !
- **Solution** :
  - **Option A** : Supprimer complètement et utiliser uniquement `devisItems`
  - **Option B** : Ne l'utiliser QUE pour l'initialisation (quand `devisItems` est vide)

**Code problématique** (ligne 1370) :
```javascript
const ldIndex = roundIndex(spIndex + (ldIdx + 1) * 0.001);
// ❌ RECALCULE l'index au lieu de préserver celui du manager
```

#### 10. `syncDevisItemsToSelectedParties(items)`
- **Ligne** : 1015
- **Utilité** : Synchroniser devisItems → selectedParties
- **Problème** : ⚠️ Complexité inutile si on supprime `selectedParties`
- **Status** : ⚠️ **À SUPPRIMER** si on adopte l'option 3 (devisItems uniquement)

---

### 📋 **Fonctions de traitement** (MANUELLES)

#### 11. `handlePartiesReorder(reorderedParties)`
- **Ligne** : 474
- **Utilité** : Réorganiser les parties après drag & drop
- **Calculs d'index** : ✅ Calcule et modifie les `index_global` manuellement (lignes 520, 722, 737)
- **Status** : ⚠️ **PEUT ÊTRE SIMPLIFIÉ** - Devrait utiliser `DevisIndexManager`

**Code manuel** (lignes 692-694) :
```javascript
const newSPIndex = partieIndex + (idx + 1) * 0.1; // 1.1, 1.2, 1.3...
return { ...sp, index_global: newSPIndex };
```
❌ **Calcul manuel au lieu d'utiliser le manager**

#### 12. `handleSousPartiesReorder(partieId, result)`
- **Ligne** : 679
- **Utilité** : Réorganiser les sous-parties après drag & drop
- **Calculs d'index** : ✅ Calcule les index manuellement (lignes 687-753)
- **Status** : ⚠️ **PEUT ÊTRE SIMPLIFIÉ** - Devrait utiliser `DevisIndexManager`

**Code manuel** (ligne 693) :
```javascript
const newSPIndex = partieIndex + (idx + 1) * 0.1;
```
❌ **Calcul manuel au lieu d'utiliser le manager**

#### 13. `handleLigneDetailSelect(partieId, sousPartieId, ligneDetail)`
- **Ligne** : 795
- **Utilité** : Ajouter une ligne détail et calculer son index
- **Calculs d'index** : ✅ Calcule le prochain index (lignes 805-826)
- **Status** : ⚠️ **PEUT ÊTRE SIMPLIFIÉ** - Devrait utiliser `DevisIndexManager.getNextIndex`

**Code manuel** (lignes 814-817) :
```javascript
nextIndex = roundIndex(spIndex + 0.001); // Premier: 1.101
const maxIndex = Math.max(...existingLignes.map(ld => ld.index_global));
nextIndex = roundIndex(maxIndex + 0.001); // Suivant: 1.102, 1.103...
```
❌ **Calcul manuel au lieu d'utiliser le manager**

---

### ✅ **Fonctions qui NE manipulent PAS l'index** (OK)

#### 14. `handleLigneDetailQuantityChange`, `handleLigneDetailMargeChange`, `handleLigneDetailPriceChange`
- **Utilité** : Modifier les propriétés des lignes (quantité, marge, prix)
- **Manipulation d'index** : ❌ NON - Juste lecture pour affichage
- **Status** : ✅ **GARDER** - Ne touchent pas à l'indexation

---

## 📁 DEVISTABLE.JS

### ✅ **Fonctions utilisant le DevisIndexManager** (CORRECTES)

#### 1. `handleDragEnd(result)`
- **Ligne** : 330
- **Utilité** : Gérer la fin du drag & drop
- **Utilise le manager** : ✅ OUI (ligne 339)
  ```javascript
  const reordered = DevisIndexManager.reorderAfterDrag(devisItems, result);
  ```
- **Status** : ✅ **GARDER** - Correctement refactorisé

---

### 📋 **Fonctions qui AFFICHENT l'index** (LECTURE SEULE)

#### 2. `handleToggleNumber(partieId)`
- **Ligne** : 396
- **Utilité** : Attribuer/enlever un numéro de partie
- **Manipulation d'index** : ❌ NON - Manipule `numero` (pas `index_global`)
- **Status** : ✅ **GARDER** - Ne touche pas à l'indexation

#### 3. Logs console dans les handlers `onMouseEnter`
- **Lignes** : 1027, 1265, 1349
- **Utilité** : Afficher l'index au hover (debug)
  ```javascript
  console.log(`⭐ Ligne spéciale "${item.description}" - Index: ${item.index_global}`);
  ```
- **Status** : ✅ **GARDER** - Utile pour le debug

---

### 📊 **Tri par index_global** (LECTURE SEULE - OK)

Dans DevisTable.js, il y a plusieurs `.sort((a, b) => a.index_global - b.index_global)` :
- **Lignes** : 354, 769, 1002, 1242
- **Utilité** : Afficher les éléments dans le bon ordre
- **Manipulation** : ❌ NON - Juste tri pour affichage
- **Status** : ✅ **GARDER** - Nécessaire pour l'affichage

---

## 📊 RÉSUMÉ : Fonctions à supprimer/simplifier

### ❌ **À SUPPRIMER** (Redondantes avec DevisIndexManager)

| Fichier | Fonction | Ligne | Remplacer par |
|---------|----------|-------|---------------|
| DevisAvance.js | `getPartiePrefix` | 1230 | `DevisIndexManager.getPartiePrefix` |
| DevisAvance.js | `getSousPartieIndex` | 1235 | `DevisIndexManager.getSousPartieIndex` |
| DevisAvance.js | `getNextIndexInSousPartie` | 1284 | `DevisIndexManager.getNextIndex(items, 'sous_partie', spId)` |
| DevisAvance.js | `shiftItemsAfter` | 1307 | ❌ **Code mort** - Supprimer |

---

### ⚠️ **À SIMPLIFIER** (Calculs manuels d'index)

| Fichier | Fonction | Ligne | Problème | Solution |
|---------|----------|-------|----------|----------|
| DevisAvance.js | `handlePartiesReorder` | 474 | Calcule manuellement les index (ligne 693) | Déléguer au manager |
| DevisAvance.js | `handleSousPartiesReorder` | 679 | Calcule manuellement les index (ligne 693) | Utiliser `DevisIndexManager.reorderAfterDrag` |
| DevisAvance.js | `handleLigneDetailSelect` | 795 | Calcule manuellement le prochain index (lignes 814-817) | Utiliser `DevisIndexManager.getNextIndex` |

---

### 🔥 **PROBLÈME PRINCIPAL** : `convertSelectedPartiesToDevisItems`

**Ligne** : 1329-1390

**Code problématique** (ligne 1370) :
```javascript
const ldIndex = roundIndex(spIndex + (ldIdx + 1) * 0.001);
```

**Pourquoi c'est problématique** :
1. Cette fonction est appelée par le `useEffect [selectedParties]`
2. Elle **RECALCULE tous les index** basés sur la position dans `selectedParties`
3. Elle **ÉCRASE** les index calculés par le manager lors du drag & drop
4. Résultat : Les lignes détails gardent leurs anciens index (1.102, 1.103) au lieu des nouveaux (1.202, 1.203)

**Solution** :
- **Option A** : Supprimer complètement `selectedParties` et utiliser uniquement `devisItems`
- **Option B** : Ne l'utiliser QUE pour l'initialisation (déjà fait, mais useEffect se déclenche quand même)
- **Option C** : NE JAMAIS recalculer les index, toujours les préserver de `devisItems`

---

## 🎯 PLAN D'ACTION RECOMMANDÉ

### Étape 1 : Supprimer les fonctions redondantes

```javascript
// ❌ SUPPRIMER ces fonctions locales
const getPartiePrefix = (index_global) => { ... };
const getSousPartieIndex = (index_global) => { ... };
const getNextIndexInSousPartie = (sousPartieId, items) => { ... };
const shiftItemsAfter = (baseIndex, scope, increment, items) => { ... };

// ✅ REMPLACER par
const { 
  roundIndex, 
  reindexSousPartie, 
  reindexPartie, 
  reindexAll,
  getPartiePrefix,
  getSousPartieIndex,
  getNextIndex
} = DevisIndexManager;
```

### Étape 2 : Simplifier `handlePartiesReorder`

**Avant** (ligne 692-694) :
```javascript
const newSPIndex = partieIndex + (idx + 1) * 0.1;
return { ...sp, index_global: newSPIndex };
```

**Après** :
```javascript
// Déléguer au manager
const reordered = DevisIndexManager.reorderAfterDrag(devisItems, {
  source: { droppableId: 'parties-global', index: sourceIndex },
  destination: { droppableId: 'parties-global', index: destIndex }
});
setDevisItems(reordered);
```

### Étape 3 : Simplifier `handleSousPartiesReorder`

**Avant** (lignes 687-753) : ~70 lignes de calculs manuels

**Après** :
```javascript
// Déléguer au manager
const reordered = DevisIndexManager.reorderAfterDrag(devisItems, result);
setDevisItems(reordered);
```

### Étape 4 : Simplifier `handleLigneDetailSelect`

**Avant** (lignes 814-817) :
```javascript
if (existingLignes.length === 0) {
  nextIndex = roundIndex(spIndex + 0.001);
} else {
  const maxIndex = Math.max(...existingLignes.map(ld => ld.index_global));
  nextIndex = roundIndex(maxIndex + 0.001);
}
```

**Après** :
```javascript
const nextIndex = DevisIndexManager.getNextIndex(devisItems, 'sous_partie', sousPartieId);
```

### Étape 5 : 🔥 **CORRIGER `convertSelectedPartiesToDevisItems`**

**PROBLÈME** : Cette fonction recalcule les index alors que le manager les a déjà calculés.

**Solution immédiate** : Ne JAMAIS recalculer, toujours utiliser l'index existant :

```javascript
// Ajouter les lignes détails
(sp.selectedLignesDetails || []).forEach((ld, ldIdx) => {
  // ✅ CRITIQUE : Si index_global existe, le PRÉSERVER (vient du manager)
  // Sinon calculer (cas d'ajout de ligne)
  let ldIndex;
  
  if (ld.index_global !== undefined && ld.index_global !== null) {
    ldIndex = ld.index_global; // ✅ PRÉSERVER du manager
    console.log(`✅ Index préservé: "${ld.description}" - ${ldIndex}`);
  } else {
    ldIndex = roundIndex(spIndex + (ldIdx + 1) * 0.001); // Calculer seulement si absent
    console.log(`➕ Index calculé: "${ld.description}" - ${ldIndex}`);
  }
  
  const ldItem = {
    ...ld,
    type: 'ligne_detail',
    id: ld.id,
    index_global: ldIndex,
    sous_partie_id: sp.id,
    // ... autres propriétés
  };
  
  items.push(ldItem);
});
```

**Mais le vrai problème** : Le `useEffect` ne devrait PAS se déclencher pendant un drag & drop !

---

## 🔍 ANALYSE DU FLUX PROBLÉMATIQUE

### Flux actuel (BUGGUÉ)

```
1. Drag & drop sous-partie 1.1 → 1.2
   ↓
2. DevisIndexManager.reorderAfterDrag()
   ✅ Calcule les NOUVEAUX index : 1.201, 1.202, 1.203
   ↓
3. handleDevisItemsReorder(reordered)
   ✅ Reçoit les items avec les NOUVEAUX index
   ↓
4. setDevisItems(withNumeros)
   ✅ Met à jour devisItems avec les NOUVEAUX index
   ↓
5. setIsSyncing(true)  ← Activé APRÈS setDevisItems
   ↓
6. syncDevisItemsToSelectedParties(withNumeros)
   ✅ Met à jour selectedParties avec les NOUVEAUX index
   ✅ setSelectedParties(synced) ← DÉCLENCHE le useEffect IMMÉDIATEMENT !
   ↓
7. useEffect [selectedParties] se déclenche
   ⚠️ isSyncing n'est PAS ENCORE true dans React (setState est asynchrone)
   ↓
8. convertSelectedPartiesToDevisItems(selectedParties)
   ❌ RECALCULE les index basés sur la position : 1.101, 1.102, 1.103
   ↓
9. setDevisItems(withNumeros)
   ❌ ÉCRASE les index du manager avec les ANCIENS index !
```

### Pourquoi `isSyncing` ne fonctionne pas ?

React **batch** les setState mais le `useEffect` peut se déclencher **entre deux batches**.

**Séquence réelle** :
```
setIsSyncing(true);              // Planifié pour le prochain render
setSelectedParties(synced);      // Planifié pour le prochain render
↓
React déclenche le render
↓
useEffect [selectedParties] SE DÉCLENCHE
↓
Vérifie isSyncing... mais c'est encore FALSE (ancien état) !
```

---

## ✅ SOLUTIONS POSSIBLES

### Solution 1 : 🔥 **Supprimer complètement `selectedParties`** (RECOMMANDÉ)

**Avantages** :
- ✅ Plus simple (une seule source de vérité)
- ✅ Pas de synchronisation
- ✅ Pas de boucles
- ✅ Le manager gère tout

**Inconvénients** :
- ⚠️ Gros refactoring (24 références à `selectedParties`)
- ⚠️ Faut adapter les composants enfants (PartieSearch, SousPartieSearch, etc.)

---

### Solution 2 : ⚡ **Ordre des setState** (RAPIDE)

Au lieu de :
```javascript
setDevisItems(withNumeros);          // 1
setIsSyncing(true);                  // 2 - TROP TARD
syncDevisItemsToSelectedParties(...);// 3
```

Faire :
```javascript
setIsSyncing(true);                  // 1 - AVANT !
setDevisItems(withNumeros);          // 2
syncDevisItemsToSelectedParties(...);// 3
```

**MAIS** : React peut quand même ne pas respecter l'ordre si dans des batches différents.

---

### Solution 3 : 🛡️ **Désactiver complètement le useEffect pendant le drag** (SÉCURISÉ)

```javascript
const [skipNextSync, setSkipNextSync] = useState(0);

// Dans handleDevisItemsReorder
setSkipNextSync(prev => prev + 1); // Incrémenter pour forcer le skip
setDevisItems(withNumeros);
syncDevisItemsToSelectedParties(withNumeros);

// Dans useEffect
useEffect(() => {
  if (isReordering || isSyncing || skipNextSync > 0) {
    if (skipNextSync > 0) {
      setSkipNextSync(prev => prev - 1); // Décrémenter
    }
    return;
  }
  // ...
}, [selectedParties, isReordering, isSyncing, skipNextSync]);
```

---

### Solution 4 : 🎯 **Préserver les index dans convertSelectedPartiesToDevisItems** (DÉJÀ ESSAYÉ)

C'est ce que j'ai fait, mais le problème est que `selectedParties` contient les **anciens index** !

---

## 🏆 RECOMMANDATION FINALE

**Solution combinée** :

1. **Immédiat** : Utiliser `setIsSyncing(true)` AVANT tout autre setState
2. **Court terme** : Supprimer le `useEffect` et gérer manuellement l'ajout/suppression de parties
3. **Long terme** : Supprimer complètement `selectedParties` (Option 3)

---

## 🔧 CORRECTIF IMMÉDIAT

Dans `handleDevisItemsReorder` (DevisAvance.js, ligne 1565) :

```javascript
// ❌ ANCIEN CODE (BUGGUÉ)
setDevisItems(withNumeros);
setIsSyncing(true);  // TROP TARD
syncDevisItemsToSelectedParties(withNumeros);

// ✅ NOUVEAU CODE (CORRIGÉ)
setIsSyncing(true);  // AVANT !
setDevisItems(withNumeros);
syncDevisItemsToSelectedParties(withNumeros);
```

---

**Voulez-vous que j'applique le correctif immédiat ou que je fasse le refactoring complet (Option 3) ?**

