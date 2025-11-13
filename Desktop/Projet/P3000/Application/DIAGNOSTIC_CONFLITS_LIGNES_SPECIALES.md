# 🔍 Diagnostic des Conflits - Système de Lignes Spéciales

## ⚠️ PROBLÈMES CRITIQUES IDENTIFIÉS

---

## 1. 🚨 **CONFLIT MAJEUR : Deux systèmes d'indexation incompatibles**

### **DevisAvance.js** (Nouveau système hiérarchique)
```javascript
// Système décimal hiérarchique
Parties      : 1, 2, 3
Sous-parties : 1.1, 1.2, 2.1
Lignes       : 1.101, 1.102, 2.201
Spéciales    : 0.5, 1.15, 1.205 (incréments intermédiaires)
```

### **DevisTable.js** (Ancien système multiplicateur)
```javascript
// Système multiplicateur avec réindexation séquentielle
Parties      : idx * 1000  (1000, 2000, 3000)
Sous-parties : base + (idx % 1000)
Réindexation finale : sorted.map((item, idx) => idx + 1)
// ❌ Casse le système hiérarchique !
```

### **Impact :**
- ❌ DevisTable réindexe TOUS les items séquentiellement (1, 2, 3, 4...)
- ❌ Détruit la structure hiérarchique (1.1, 1.2 deviennent 2, 3)
- ❌ Les lignes spéciales perdent leurs incréments intermédiaires
- ❌ Le drag & drop casse les associations parent-enfant

**Localisation du problème :**
- `DevisTable.js` lignes 398, 463, 519, 621
- `handleDragEnd` appelle `onDevisItemsReorder(reindexed)`
- `reindexed` écrase les index hiérarchiques

---

## 2. 🔧 **PROBLÈME : Handler de déplacement non connecté**

### Dans **DevisAvance.js** :
```javascript
// Ligne 1111: Handler créé
const handleMoveSpecialLine = (lineId) => { ... }

// Ligne 2158: Prop passée à DevisTable
onMoveSpecialLine={handleMoveSpecialLine}
```

### Dans **DevisTable.js** :
```javascript
// Ligne 163: Prop NON REÇUE
onRemoveSpecialLine,  // ✅ Reçu
// onMoveSpecialLine,  // ❌ PAS dans les props !

// Ligne 2414: Utilise onRequestReplacement à la place
onClick={() => {
  if (line && onRequestReplacement) {
    onRequestReplacement(line);  // ❌ Ancien système
  }
}}
```

### **Impact :**
- ❌ Le nouveau handler `handleMoveSpecialLine` n'est jamais appelé
- ❌ Le bouton "Déplacer" utilise l'ancien système `onRequestReplacement`
- ❌ Les deux systèmes coexistent sans cohérence

---

## 3. 🎯 **PROBLÈME : Contexte de lignes spéciales mal géré**

### Dans **DevisTable.js handleDragEnd** :
```javascript
// Lignes 378-392: Logique de suivi des lignes spéciales
else if (item.type === 'ligne_speciale') {
  if (item.context_type === 'global') {
    return item; // ✅ OK
  } else if (item.context_type === 'partie') {
    const baseIndex = partieIndexMap.get(item.context_id);
    return { ...item, index_global: baseIndex + item.index_global % 1000 };
    // ❌ PROBLÈME : item.index_global % 1000 ne fonctionne pas avec le système décimal
    // Exemple : 1.15 % 1000 = 1.15 (pas l'offset voulu !)
  }
}
```

### **Impact :**
- ❌ Les lignes spéciales ne suivent pas correctement leur parent
- ❌ Le calcul de l'offset est incorrect avec des index décimaux
- ❌ Conflit avec la logique de DevisAvance qui calcule correctement l'offset

---

## 4. 📦 **PROBLÈME : Données dupliquées et incohérentes**

### Deux sources de vérité :
1. **`devisItems`** (système unifié) - utilisé par DevisTable pour le rendu
2. **`selectedParties`** (ancien système) - utilisé par DevisAvance pour la logique

### Synchronisation bidirectionnelle :
```javascript
// DevisAvance.js ligne 1290-1313
useEffect(() => {
  // Converti selectedParties → devisItems
  const convertedItems = convertSelectedPartiesToDevisItems(selectedParties);
  // Fusionne avec lignes spéciales
  // ❌ Peut créer des duplications si mal synchronisé
}, [selectedParties]);
```

### Dans **handleDevisItemsReorder** :
```javascript
// DevisAvance.js ligne 1492-1508
setSelectedParties(updatedSelectedParties);  // ✅ Synchronisation
```

### Dans **DevisTable.handleDragEnd** :
```javascript
// DevisTable.js ligne 405-411
if (onPartiesReorder) {
  onPartiesReorder(newParties);  // ❌ Mise à jour partielle
}
```

### **Impact :**
- ❌ Risque de désynchronisation entre les deux sources
- ❌ Les lignes spéciales peuvent être perdues
- ❌ Complexité accrue pour maintenir la cohérence

---

## 5. 🎨 **PROBLÈME : Gestion du placement visuellement confuse**

### Systèmes de placement qui coexistent :

#### A. **Zones de placement (PlacementZone)** :
```javascript
// DevisTable.js ligne 17-127
// Zones cliquables pour placer une ligne en attente
<PlacementZone 
  position="before_partie_10"
  onPlaceLineAt={onPlaceLineAt}
  lineAwaitingPlacement={lineAwaitingPlacement}
/>
```

#### B. **Drag & Drop (désactivé mais code présent)** :
```javascript
// DevisTable.js ligne 529-641
// Code commenté pour drag de lignes spéciales
// ❌ Crée de la confusion
```

#### C. **Bouton "Déplacer"** :
```javascript
// DevisTable.js ligne 2408-2429
// Appelle onRequestReplacement au lieu de onMoveSpecialLine
```

### **Impact :**
- ❌ Trois méthodes de déplacement différentes
- ❌ Certaines fonctionnent, d'autres non
- ❌ UX incohérente pour l'utilisateur

---

## 6. 🔄 **PROBLÈME : Recalcul des numéros d'affichage**

### Dans **DevisAvance.js** :
```javascript
// Ligne 1315-1389: recalculateNumeros
const generateNumero = (item, allItems) => {
  if (item.type === 'partie') {
    // Compte les parties NUMÉROTÉES avant
    const partiesNumeroteesBefore = allItems.filter(...)
    return String(partiesNumeroteesBefore.length + 1);
  }
  // ...
}
```

### Problème :
- ✅ Cette fonction est correcte
- ❌ MAIS elle est appelée sur des items avec index_global cassés par DevisTable
- ❌ Les numéros deviennent incohérents (1, 2, 1.1 au lieu de 1, 1.1, 1.2)

---

## 7. 📊 **PROBLÈME : Logs de débogage manquants dans DevisTable**

### Dans DevisTable.js :
```javascript
// Aucun log dans handleDragEnd
// ❌ Difficile de diagnostiquer les problèmes
```

### Dans DevisAvance.js :
```javascript
// Ligne 1054-1107: Logs détaillés
console.log('🔄 Déplacement détecté...');
console.log('✅ Création de la ligne...');
// ✅ Facilite le débogage
```

---

## 🎯 RÉSUMÉ DES CONFLITS

| # | Problème | Impact | Priorité |
|---|----------|--------|----------|
| 1 | Deux systèmes d'indexation incompatibles | 🔴 CRITIQUE - Casse tout | P0 |
| 2 | Handler de déplacement non connecté | 🟠 MAJEUR - Fonctionnalité cassée | P0 |
| 3 | Contexte de lignes spéciales mal géré | 🟠 MAJEUR - Lignes ne suivent pas | P0 |
| 4 | Données dupliquées (devisItems + selectedParties) | 🟡 MOYEN - Risque de bugs | P1 |
| 5 | Systèmes de placement multiples | 🟡 MOYEN - UX confuse | P1 |
| 6 | Recalcul des numéros incohérent | 🟡 MOYEN - Affichage incorrect | P2 |
| 7 | Logs de débogage manquants | 🟢 MINEUR - Difficulté diagnostic | P3 |

---

## 💡 SOLUTIONS PROPOSÉES

### **Solution 1 : Supprimer la réindexation dans DevisTable** (PRIORITAIRE)
```javascript
// ❌ SUPPRIMER DANS DevisTable.js (lignes 396-398, 461-463, 517-519)
const reindexed = sorted.map((item, idx) => ({ ...item, index_global: idx + 1 }));

// ✅ GARDER SEULEMENT
const sorted = updatedItems.sort((a, b) => a.index_global - b.index_global);
if (onDevisItemsReorder) {
  onDevisItemsReorder(sorted);  // Sans réindexation !
}
```

### **Solution 2 : Utiliser le système hiérarchique dans DevisTable**
```javascript
// Remplacer le système multiplicateur (idx * 1000)
// Par le système décimal (idx + 1, idx + 0.1, idx + 0.01)
// Comme dans handleDevisItemsReorder de DevisAvance
```

### **Solution 3 : Connecter handleMoveSpecialLine**
```javascript
// Dans DevisTable.js ligne 163, AJOUTER :
onMoveSpecialLine,  // Nouveau prop

// Dans DevisTable.js ligne 2414, REMPLACER :
onClick={() => {
  if (onMoveSpecialLine) {
    onMoveSpecialLine(hoveredSpecialLineId);
  }
}}
```

### **Solution 4 : Corriger le calcul d'offset pour lignes spéciales**
```javascript
// Dans DevisTable.js ligne 384, REMPLACER :
return { ...item, index_global: baseIndex + item.index_global % 1000 };

// PAR (comme dans DevisAvance) :
const oldPartieItem = devisItems.find(i => i.type === 'partie' && i.id === item.context_id);
if (oldPartieItem) {
  const oldPartieIndex = Math.floor(oldPartieItem.index_global);
  const offset = item.index_global - oldPartieIndex;
  return { ...item, index_global: baseIndex + offset };
}
```

### **Solution 5 : Simplifier - Une seule source de vérité**
À terme, migrer vers **devisItems uniquement** :
- Supprimer `selectedParties`
- Tout gérer via `devisItems`
- Simplifier la synchronisation

---

## 📝 PROCHAINES ÉTAPES

Voir le fichier `TODO_REFACTORING_LIGNES_SPECIALES.md` pour le plan d'action détaillé.

---

## 🔗 FICHIERS CONCERNÉS

1. **DevisAvance.js** (2323 lignes)
   - Gestion des handlers
   - Système hiérarchique
   - Synchronisation devisItems ↔ selectedParties

2. **DevisTable.js** (2497 lignes)
   - Affichage et rendu
   - Drag & Drop
   - ❌ Réindexation globale

3. **LigneSpecialeRow.js** (197 lignes)
   - Affichage des lignes spéciales
   - Calcul dynamique des montants

4. **SpecialLinesCreator.js** (432 lignes)
   - Création de lignes spéciales
   - Modal de configuration

---

**Date du diagnostic :** 2025-01-XX
**Statut :** 🔴 CRITIQUE - Nécessite refactoring immédiat

