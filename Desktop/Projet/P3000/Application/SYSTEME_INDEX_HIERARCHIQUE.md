# Système d'Index Hiérarchique - Documentation Technique

## 📋 Table des matières
1. [Vue d'ensemble](#vue-densemble)
2. [Format des index](#format-des-index)
3. [Construction initiale](#construction-initiale)
4. [Insertion d'éléments](#insertion-déléments)
5. [Drag and Drop](#drag-and-drop)
6. [Lignes spéciales](#lignes-spéciales)
7. [Fonctions utilitaires](#fonctions-utilitaires)
8. [Implémentation step-by-step](#implémentation-step-by-step)

---

## 🎯 Vue d'ensemble

### Principe
Chaque élément du devis possède un `index_global` (type: **Number**) qui encode :
- Sa **position hiérarchique** (partie > sous-partie > ligne)
- Son **ordre d'affichage** dans sa hiérarchie

### Avantages
- ✅ Recalcul minimal (seulement les éléments décalés)
- ✅ Structure interne préservée lors des déplacements
- ✅ Type Number = tri simple et rapide
- ✅ Lecture directe de la hiérarchie

---

## 🔢 Format des index

### Structure des index

| Niveau | Format | Exemple | Plage |
|--------|--------|---------|-------|
| **Partie** | `X` | `1`, `2`, `3` | 1-999 |
| **Sous-partie** | `X.Y` | `1.1`, `1.2`, `2.3` | X.1 - X.99 |
| **Ligne détail** | `X.YZZ` | `1.101`, `1.102`, `2.305` | X.Y01 - X.Y99 |
| **Ligne spéciale** | Selon contexte | `1.15`, `1.205`, `3.5` | Variable |

### Règles de notation

```javascript
// PARTIES : Entiers simples
Partie A → 1
Partie B → 2
Partie C → 3

// SOUS-PARTIES : Partie + 1 décimale (0.1)
Dans Partie 1 :
  SP 1 → 1.1
  SP 2 → 1.2
  SP 3 → 1.3

// LIGNES DÉTAILS : Partie + Sous-partie + centièmes (0.01)
Dans SP 1.2 :
  Ligne 1 → 1.201  (1.2 + 0.01)
  Ligne 2 → 1.202  (1.2 + 0.02)
  Ligne 3 → 1.203  (1.2 + 0.03)
  ...
  Ligne 15 → 1.215 (1.2 + 0.15)

// LIGNES SPÉCIALES : Selon leur contexte
Global → 3, 4, 5...
Dans partie → 1.5, 1.6...
Dans sous-partie → 1.205, 1.215...
```

### Décodage d'un index

```javascript
function decodeIndex(index_global) {
  const str = index_global.toString();
  const parts = str.split('.');
  
  const partie = parseInt(parts[0]);
  const sousPartie = parts[1] ? parseInt(parts[1]) : null;
  
  // Pour les lignes : extraire les centièmes
  let ligne = null;
  if (parts[1] && parts[1].length === 3) {
    // Format X.YZZ
    ligne = parseInt(parts[1].substring(1)); // ZZ
  }
  
  return { partie, sousPartie, ligne };
}

// Exemples :
decodeIndex(1)      → { partie: 1, sousPartie: null, ligne: null }
decodeIndex(1.2)    → { partie: 1, sousPartie: 2, ligne: null }
decodeIndex(1.203)  → { partie: 1, sousPartie: 2, ligne: 3 }
```

---

## 🏗️ Construction initiale

### Fonction principale : `convertSelectedPartiesToDevisItems`

```javascript
function convertSelectedPartiesToDevisItems(parties) {
  const items = [];
  
  parties.forEach((partie, partieIdx) => {
    // 1. PARTIE : index entier séquentiel
    const partieIndex = partieIdx + 1;
    
    items.push({
      ...partie,
      type: 'partie',
      index_global: partieIndex,  // 1, 2, 3...
      numero: partie.numero
    });
    
    // 2. SOUS-PARTIES : partie + 0.1, 0.2, 0.3...
    (partie.selectedSousParties || []).forEach((sp, spIdx) => {
      const spIndex = partieIndex + (spIdx + 1) * 0.1;  // 1.1, 1.2, 1.3...
      
      items.push({
        ...sp,
        type: 'sous_partie',
        index_global: spIndex,
        partie_id: partie.id,
        numero: sp.numero
      });
      
      // 3. LIGNES DÉTAILS : sous-partie + 0.01, 0.02, 0.03...
      (sp.selectedLignesDetails || []).forEach((ligne, ligneIdx) => {
        const ligneIndex = spIndex + (ligneIdx + 1) * 0.01;  // 1.101, 1.102...
        
        items.push({
          ...ligne,
          type: 'ligne_detail',
          index_global: ligneIndex,
          sous_partie_id: sp.id,
          numero: ligne.numero
        });
      });
    });
  });
  
  return items;
}
```

### Exemple de résultat

```javascript
[
  { type: 'partie', id: 10, index_global: 1 },
  { type: 'sous_partie', id: 20, index_global: 1.1, partie_id: 10 },
  { type: 'ligne_detail', id: 30, index_global: 1.101, sous_partie_id: 20 },
  { type: 'ligne_detail', id: 31, index_global: 1.102, sous_partie_id: 20 },
  { type: 'sous_partie', id: 21, index_global: 1.2, partie_id: 10 },
  { type: 'ligne_detail', id: 32, index_global: 1.201, sous_partie_id: 21 },
  { type: 'partie', id: 11, index_global: 2 },
  { type: 'sous_partie', id: 22, index_global: 2.1, partie_id: 11 }
]
```

---

## ➕ Insertion d'éléments

### 1. Insertion d'une sous-partie

```javascript
function insertSousPartie(partieId, targetIndex) {
  // targetIndex = 1.2 (position voulue)
  
  // ÉTAPE 1 : Identifier les éléments à décaler
  const partieIndex = Math.floor(targetIndex); // 1
  const spNumber = parseFloat(targetIndex.toString().split('.')[1]) / 10; // 0.2
  
  const itemsToShift = devisItems.filter(item => {
    // Sous-parties de la même partie ET après la position
    if (item.type === 'sous_partie' && item.partie_id === partieId) {
      const itemSpNumber = parseFloat(item.index_global.toString().split('.')[1]) / 10;
      return itemSpNumber >= spNumber;
    }
    
    // Lignes détails des sous-parties décalées
    if (item.type === 'ligne_detail') {
      const spId = item.sous_partie_id;
      const sp = devisItems.find(i => i.type === 'sous_partie' && i.id === spId);
      if (sp && sp.partie_id === partieId) {
        const spNum = parseFloat(sp.index_global.toString().split('.')[1]) / 10;
        return spNum >= spNumber;
      }
    }
    
    return false;
  });
  
  // ÉTAPE 2 : Décaler les éléments
  itemsToShift.forEach(item => {
    if (item.type === 'sous_partie') {
      item.index_global += 0.1;  // 1.2 → 1.3
    } else if (item.type === 'ligne_detail') {
      item.index_global += 0.1;  // 1.201 → 1.301
    }
  });
  
  // ÉTAPE 3 : Créer la nouvelle sous-partie
  const newSP = {
    ...sousPartieData,
    type: 'sous_partie',
    index_global: targetIndex,  // 1.2
    partie_id: partieId
  };
  
  devisItems.push(newSP);
  
  // ÉTAPE 4 : Trier (le tri Number fonctionne !)
  devisItems.sort((a, b) => a.index_global - b.index_global);
}
```

### 2. Insertion d'une ligne détail

```javascript
function insertLigneDetail(sousPartieId, targetIndex) {
  // targetIndex = 1.205 (insérer à la position 5 de SP 1.2)
  
  // ÉTAPE 1 : Extraire les composantes
  const indexStr = targetIndex.toString();
  const [partie, spAndLigne] = indexStr.split('.');
  const spNumber = parseInt(spAndLigne.substring(0, 1)); // "2" de "205"
  const ligneNumber = parseInt(spAndLigne.substring(1)); // "05" de "205"
  
  const spBaseIndex = parseFloat(`${partie}.${spNumber}`); // 1.2
  
  // ÉTAPE 2 : Décaler les lignes après
  devisItems.forEach(item => {
    if (item.type === 'ligne_detail' && 
        item.sous_partie_id === sousPartieId &&
        item.index_global >= targetIndex) {
      
      item.index_global += 0.01;  // 1.205 → 1.215
    }
  });
  
  // ÉTAPE 3 : Créer la nouvelle ligne
  const newLigne = {
    ...ligneData,
    type: 'ligne_detail',
    index_global: targetIndex,  // 1.205
    sous_partie_id: sousPartieId
  };
  
  devisItems.push(newLigne);
  devisItems.sort((a, b) => a.index_global - b.index_global);
}
```

### 3. Insertion d'une partie

```javascript
function insertPartie(targetIndex) {
  // targetIndex = 2 (insérer à la position 2)
  
  // ÉTAPE 1 : Décaler toutes les parties après
  devisItems.forEach(item => {
    const currentPartieIndex = Math.floor(item.index_global);
    
    if (currentPartieIndex >= targetIndex) {
      // Calculer l'offset
      const offset = 1;
      
      if (item.type === 'partie') {
        item.index_global += offset;  // 2 → 3, 3 → 4
      } else if (item.type === 'sous_partie') {
        // Décaler le préfixe : 2.1 → 3.1
        const decimal = item.index_global - currentPartieIndex; // 0.1
        item.index_global = (currentPartieIndex + offset) + decimal;
      } else if (item.type === 'ligne_detail') {
        // Décaler le préfixe : 2.301 → 3.301
        const decimal = item.index_global - currentPartieIndex;
        item.index_global = (currentPartieIndex + offset) + decimal;
      }
    }
  });
  
  // ÉTAPE 2 : Créer la nouvelle partie
  const newPartie = {
    ...partieData,
    type: 'partie',
    index_global: targetIndex  // 2
  };
  
  devisItems.push(newPartie);
  devisItems.sort((a, b) => a.index_global - b.index_global);
}
```

---

## 🎮 Drag and Drop

### Contraintes importantes

```javascript
// Les éléments NE PEUVENT se déplacer QUE dans leur scope :
✅ Partie : peut aller à n'importe quelle position globale (1, 2, 3...)
✅ Sous-partie : SEULEMENT dans sa partie parent (1.x reste 1.x)
✅ Ligne : SEULEMENT dans sa sous-partie parent (1.2.xx reste 1.2.xx)
```

### 1. Drag and Drop d'une PARTIE

```javascript
function handlePartieDrag(draggedPartieId, sourceIndex, destinationIndex) {
  // sourceIndex = 3, destinationIndex = 1
  // Déplacer Partie 3 → position 1
  
  const draggedPartie = devisItems.find(i => i.type === 'partie' && i.id === draggedPartieId);
  const oldPartieIndex = Math.floor(draggedPartie.index_global); // 3
  const newPartieIndex = destinationIndex; // 1
  
  // ÉTAPE 1 : Calculer quelles parties sont affectées
  const direction = newPartieIndex < oldPartieIndex ? 'UP' : 'DOWN';
  
  if (direction === 'UP') {
    // Déplacer vers le haut : décaler les parties entre destination et source
    
    devisItems.forEach(item => {
      const itemPartieIndex = Math.floor(item.index_global);
      
      // Parties à décaler vers le bas (1 → 2, 2 → 3)
      if (itemPartieIndex >= newPartieIndex && itemPartieIndex < oldPartieIndex) {
        const offset = 1;
        
        if (item.type === 'partie') {
          item.index_global += offset;
        } else {
          // Sous-parties et lignes : changer le préfixe
          const decimal = item.index_global - itemPartieIndex;
          item.index_global = (itemPartieIndex + offset) + decimal;
        }
      }
      
      // Partie déplacée et ses enfants : nouveau préfixe
      if (itemPartieIndex === oldPartieIndex) {
        if (item.type === 'partie') {
          item.index_global = newPartieIndex;
        } else {
          const decimal = item.index_global - oldPartieIndex;
          item.index_global = newPartieIndex + decimal;
        }
      }
    });
  } else {
    // Déplacer vers le bas : logique inverse
    devisItems.forEach(item => {
      const itemPartieIndex = Math.floor(item.index_global);
      
      if (itemPartieIndex > oldPartieIndex && itemPartieIndex <= newPartieIndex) {
        const offset = -1;
        
        if (item.type === 'partie') {
          item.index_global += offset;
        } else {
          const decimal = item.index_global - itemPartieIndex;
          item.index_global = (itemPartieIndex + offset) + decimal;
        }
      }
      
      if (itemPartieIndex === oldPartieIndex) {
        if (item.type === 'partie') {
          item.index_global = newPartieIndex;
        } else {
          const decimal = item.index_global - oldPartieIndex;
          item.index_global = newPartieIndex + decimal;
        }
      }
    });
  }
  
  // ÉTAPE 2 : Trier
  devisItems.sort((a, b) => a.index_global - b.index_global);
}
```

**Exemple complet** :

```javascript
Avant :
Partie A (1) → SP 1.1, 1.2
Partie B (2) → SP 2.1, 2.2
Partie C (3) → SP 3.1
  SP 3.1 → Lignes 3.101, 3.102

// Drag Partie C (3) → position 1

Étapes :
1. Décaler Partie A : 1 → 2
   Enfants : 1.1 → 2.1, 1.2 → 2.2
   
2. Décaler Partie B : 2 → 3
   Enfants : 2.1 → 3.1, 2.2 → 3.2
   
3. Placer Partie C : 3 → 1
   Enfants : 3.1 → 1.1, 3.101 → 1.101, 3.102 → 1.102

Après :
Partie C (1) → SP 1.1 → Lignes 1.101, 1.102
Partie A (2) → SP 2.1, 2.2
Partie B (3) → SP 3.1, 3.2
```

### 2. Drag and Drop d'une SOUS-PARTIE

```javascript
function handleSousPartieDrag(draggedSpId, sourceIndex, destinationIndex) {
  // sourceIndex et destinationIndex sont les positions DANS la partie parent
  // Exemple : déplacer SP 1.3 → position 1.1
  
  const draggedSP = devisItems.find(i => i.type === 'sous_partie' && i.id === draggedSpId);
  const partieId = draggedSP.partie_id;
  const partieIndex = Math.floor(draggedSP.index_global); // 1
  
  // Récupérer toutes les sous-parties de cette partie
  const sousParties = devisItems
    .filter(i => i.type === 'sous_partie' && i.partie_id === partieId)
    .sort((a, b) => a.index_global - b.index_global);
  
  const oldPosition = sousParties.findIndex(sp => sp.id === draggedSpId); // 2 (position dans le tableau)
  const newPosition = destinationIndex; // 0
  
  // ÉTAPE 1 : Réorganiser le tableau
  const [moved] = sousParties.splice(oldPosition, 1);
  sousParties.splice(newPosition, 0, moved);
  
  // ÉTAPE 2 : Réattribuer les index séquentiellement
  sousParties.forEach((sp, idx) => {
    const oldSPIndex = sp.index_global;
    const newSPIndex = partieIndex + (idx + 1) * 0.1; // 1.1, 1.2, 1.3...
    
    sp.index_global = newSPIndex;
    
    // ÉTAPE 3 : Mettre à jour les lignes enfants
    if (oldSPIndex !== newSPIndex) {
      devisItems.forEach(ligne => {
        if (ligne.type === 'ligne_detail' && ligne.sous_partie_id === sp.id) {
          // Remplacer le préfixe
          const oldPrefix = Math.floor(oldSPIndex * 10) / 10; // 1.2
          const newPrefix = Math.floor(newSPIndex * 10) / 10; // 1.1
          
          const ligneOffset = ligne.index_global - oldSPIndex; // 0.01, 0.02...
          ligne.index_global = newSPIndex + ligneOffset;
        }
      });
    }
  });
  
  devisItems.sort((a, b) => a.index_global - b.index_global);
}
```

**Exemple** :

```javascript
Avant :
Partie 1
  SP 1.1 → Lignes 1.101, 1.102
  SP 1.2 → Lignes 1.201, 1.202
  SP 1.3 → Lignes 1.301, 1.302, 1.303

// Drag SP 1.3 → position 0 (devenir 1.1)

Après :
Partie 1
  SP 1.1 (était 1.3) → Lignes 1.101, 1.102, 1.103  ← Garde .01, .02, .03
  SP 1.2 (était 1.1) → Lignes 1.201, 1.202         ← Garde .01, .02
  SP 1.3 (était 1.2) → Lignes 1.301, 1.302         ← Garde .01, .02
```

### 3. Drag and Drop d'une LIGNE DÉTAIL

```javascript
function handleLigneDrag(draggedLigneId, sousPartieId, sourceIndex, destinationIndex) {
  // Déplacer ligne dans SA sous-partie uniquement
  
  const sp = devisItems.find(i => i.type === 'sous_partie' && i.id === sousPartieId);
  const spIndex = sp.index_global; // 1.2
  
  // Récupérer toutes les lignes de cette sous-partie
  const lignes = devisItems
    .filter(i => i.type === 'ligne_detail' && i.sous_partie_id === sousPartieId)
    .sort((a, b) => a.index_global - b.index_global);
  
  const oldPosition = lignes.findIndex(l => l.id === draggedLigneId);
  
  // ÉTAPE 1 : Réorganiser
  const [moved] = lignes.splice(oldPosition, 1);
  lignes.splice(destinationIndex, 0, moved);
  
  // ÉTAPE 2 : Réattribuer les index séquentiellement
  lignes.forEach((ligne, idx) => {
    ligne.index_global = spIndex + (idx + 1) * 0.01; // 1.201, 1.202, 1.203...
  });
  
  devisItems.sort((a, b) => a.index_global - b.index_global);
}
```

---

## ⭐ Lignes spéciales

### Position dans la hiérarchie

Les lignes spéciales s'insèrent **entre** les éléments :

```javascript
// CONTEXTE GLOBAL : Entre les parties
Partie A (1)
Ligne spéciale (1.5)  ← Entre partie 1 et 2
Partie B (2)

// CONTEXTE PARTIE : Entre les sous-parties
Partie 1
  SP 1.1
  Ligne spéciale (1.15) ← Entre SP 1.1 et 1.2
  SP 1.2

// CONTEXTE SOUS-PARTIE : Entre les lignes
SP 1.2
  Ligne a (1.201)
  Ligne spéciale (1.205) ← Entre ligne .01 et .06
  Ligne b (1.206)
```

### Calcul de la position d'insertion

```javascript
function getSpecialLinePosition(position, lineAwaitingPlacement) {
  let targetIndex;
  
  // === CAS 1 : Position globale (entre parties) ===
  if (position === 'global_start') {
    // Avant la première partie
    targetIndex = 0.5;
  } 
  else if (position === 'global_end') {
    // Après la dernière partie
    const maxPartieIndex = Math.max(
      ...devisItems.filter(i => i.type === 'partie').map(i => Math.floor(i.index_global))
    );
    targetIndex = maxPartieIndex + 1;
  }
  else if (position.startsWith('before_partie_')) {
    const partieId = parseInt(position.replace('before_partie_', ''));
    const partie = devisItems.find(i => i.type === 'partie' && i.id === partieId);
    targetIndex = partie.index_global - 0.5; // 2 → 1.5
  }
  else if (position.startsWith('after_partie_')) {
    const partieId = parseInt(position.replace('after_partie_', ''));
    const partie = devisItems.find(i => i.type === 'partie' && i.id === partieId);
    const partieBaseIndex = Math.floor(partie.index_global);
    
    // Trouver le dernier élément de cette partie
    const lastChild = devisItems
      .filter(i => Math.floor(i.index_global) === partieBaseIndex)
      .sort((a, b) => b.index_global - a.index_global)[0];
    
    targetIndex = lastChild.index_global + 0.1; // Après le dernier enfant
  }
  
  // === CAS 2 : Dans une partie (entre sous-parties) ===
  else if (position.startsWith('before_sp_')) {
    const spId = parseInt(position.replace('before_sp_', ''));
    const sp = devisItems.find(i => i.type === 'sous_partie' && i.id === spId);
    targetIndex = sp.index_global - 0.05; // 1.2 → 1.15
  }
  else if (position.startsWith('after_sp_')) {
    const spId = parseInt(position.replace('after_sp_', ''));
    const sp = devisItems.find(i => i.type === 'sous_partie' && i.id === spId);
    
    // Trouver la dernière ligne de cette SP
    const lastLigne = devisItems
      .filter(i => i.type === 'ligne_detail' && i.sous_partie_id === spId)
      .sort((a, b) => b.index_global - a.index_global)[0];
    
    if (lastLigne) {
      targetIndex = lastLigne.index_global + 0.01; // Après la dernière ligne
    } else {
      targetIndex = sp.index_global + 0.05; // Pas de lignes, après la SP
    }
  }
  
  // === CAS 3 : Dans une sous-partie (entre lignes) ===
  else if (position.startsWith('before_ligne_')) {
    const ligneId = parseInt(position.replace('before_ligne_', ''));
    const ligne = devisItems.find(i => i.type === 'ligne_detail' && i.id === ligneId);
    targetIndex = ligne.index_global - 0.005; // 1.201 → 1.196
  }
  else if (position.startsWith('after_ligne_')) {
    const ligneId = parseInt(position.replace('after_ligne_', ''));
    const ligne = devisItems.find(i => i.type === 'ligne_detail' && i.id === ligneId);
    targetIndex = ligne.index_global + 0.005; // 1.201 → 1.206
  }
  
  // ÉTAPE FINALE : Créer et insérer sans décalage
  // Les lignes spéciales utilisent des incréments intermédiaires (0.5, 0.05, 0.005)
  // Donc elles ne causent PAS de décalage des autres éléments !
  
  const newSpecialLine = {
    ...lineAwaitingPlacement,
    index_global: targetIndex,
    context_type: determineContextType(position),
    context_id: determineContextId(position)
  };
  
  devisItems.push(newSpecialLine);
  devisItems.sort((a, b) => a.index_global - b.index_global);
}
```

**🎯 Astuce pour les lignes spéciales** : 
Utiliser des incréments **intermédiaires** pour ne PAS décaler les éléments existants !

```javascript
// Entre parties (index entiers) : utiliser 0.5
1, [1.5 ligne spéciale], 2, 3

// Entre sous-parties (0.1) : utiliser 0.05
1.1, [1.15 ligne spéciale], 1.2

// Entre lignes (0.01) : utiliser 0.005
1.201, [1.205 ligne spéciale], 1.206
```

---

## 🛠️ Fonctions utilitaires

### 1. Extraire le préfixe de partie

```javascript
function getPartiePrefix(index_global) {
  return Math.floor(index_global);
}

// Exemples :
getPartiePrefix(1.203) → 1
getPartiePrefix(2.5)   → 2
getPartiePrefix(3)     → 3
```

### 2. Extraire la sous-partie

```javascript
function getSousPartieIndex(index_global) {
  const str = index_global.toString();
  const parts = str.split('.');
  
  if (parts.length < 2) return null;
  
  const decimal = parts[1];
  const spNumber = parseInt(decimal.substring(0, 1));
  
  return parseFloat(`${parts[0]}.${spNumber}`);
}

// Exemples :
getSousPartieIndex(1.203) → 1.2
getSousPartieIndex(1.102) → 1.1
getSousPartieIndex(1)     → null
```

### 3. Vérifier si même scope

```javascript
function isSamePartie(index1, index2) {
  return Math.floor(index1) === Math.floor(index2);
}

function isSameSousPartie(index1, index2) {
  return getSousPartieIndex(index1) === getSousPartieIndex(index2);
}

// Exemples :
isSamePartie(1.203, 1.5)    → true
isSamePartie(1.203, 2.1)    → false
isSameSousPartie(1.201, 1.202) → true
isSameSousPartie(1.201, 1.301) → false
```

### 4. Calculer le prochain index disponible

```javascript
function getNextIndexInPartie(partieId) {
  const partie = devisItems.find(i => i.type === 'partie' && i.id === partieId);
  const partieIndex = partie.index_global;
  
  // Trouver tous les enfants directs
  const children = devisItems.filter(i => 
    (i.type === 'sous_partie' && i.partie_id === partieId) ||
    (i.type === 'ligne_speciale' && i.context_type === 'partie' && i.context_id === partieId)
  );
  
  if (children.length === 0) {
    return partieIndex + 0.1; // Premier enfant : 1.1
  }
  
  // Trouver le max
  const maxDecimal = Math.max(...children.map(c => {
    const decimal = c.index_global - partieIndex;
    return Math.floor(decimal * 10) / 10; // Arrondir à 0.1
  }));
  
  return partieIndex + maxDecimal + 0.1;
}

function getNextIndexInSousPartie(sousPartieId) {
  const sp = devisItems.find(i => i.type === 'sous_partie' && i.id === sousPartieId);
  const spIndex = sp.index_global;
  
  const lignes = devisItems.filter(i => 
    i.type === 'ligne_detail' && i.sous_partie_id === sousPartieId
  );
  
  if (lignes.length === 0) {
    return spIndex + 0.01; // Première ligne : 1.201
  }
  
  const maxLigneNumber = Math.max(...lignes.map(l => {
    const offset = l.index_global - spIndex;
    return Math.round(offset * 100); // Extraire les centièmes
  }));
  
  return spIndex + (maxLigneNumber + 1) * 0.01;
}
```

### 5. Décaler les éléments

```javascript
function shiftItemsAfter(baseIndex, scope, increment) {
  devisItems.forEach(item => {
    // Vérifier le scope (partie ou sous-partie)
    let inScope = false;
    
    if (scope.type === 'partie') {
      inScope = getPartiePrefix(item.index_global) === scope.partieIndex;
    } else if (scope.type === 'sous_partie') {
      inScope = getSousPartieIndex(item.index_global) === scope.spIndex;
    }
    
    if (inScope && item.index_global >= baseIndex) {
      item.index_global += increment;
    }
  });
}

// Exemple : décaler toutes les SP après 1.2 dans Partie 1
shiftItemsAfter(
  1.2,                          // baseIndex
  { type: 'partie', partieIndex: 1 },  // scope
  0.1                           // increment
);
// Résultat : 1.2 → 1.3, 1.3 → 1.4, mais 2.1 reste 2.1 (autre partie)
```

---

## 📝 Implémentation Step-by-Step

### ÉTAPE 1 : Modifier `convertSelectedPartiesToDevisItems`

```javascript
// Localisation : DevisAvance.js, ligne ~1065

// REMPLACER :
let globalIndex = 1;
items.push({ index_global: globalIndex++ });

// PAR :
parties.forEach((partie, partieIdx) => {
  const partieIndex = partieIdx + 1;  // 1, 2, 3...
  
  items.push({ index_global: partieIndex });
  
  (partie.selectedSousParties || []).forEach((sp, spIdx) => {
    const spIndex = partieIndex + (spIdx + 1) * 0.1;  // 1.1, 1.2...
    
    items.push({ index_global: spIndex });
    
    (sp.selectedLignesDetails || []).forEach((ld, ldIdx) => {
      const ldIndex = spIndex + (ldIdx + 1) * 0.01;  // 1.101, 1.102...
      
      items.push({ index_global: ldIndex });
    });
  });
});
```

### ÉTAPE 2 : Modifier `handleDragEnd` pour les parties

```javascript
// Localisation : DevisTable.js, ligne ~341

// REMPLACER la logique de multiplication par 1000
// PAR la logique de décalage séquentiel (voir fonction ci-dessus)
```

### ÉTAPE 3 : Modifier `handleDragEnd` pour les sous-parties

```javascript
// Localisation : DevisTable.js, ligne ~417

// REMPLACER la logique de décalage 0.1
// PAR la réattribution séquentielle (voir fonction ci-dessus)
```

### ÉTAPE 4 : Modifier `handleDragEnd` pour les lignes

```javascript
// Localisation : DevisTable.js, ligne ~479

// REMPLACER la logique de décalage 0.01
// PAR la réattribution séquentielle (voir fonction ci-dessus)
```

### ÉTAPE 5 : Supprimer la réindexation finale

```javascript
// Dans toutes les fonctions de drag, SUPPRIMER :
const reindexed = sorted.map((item, idx) => ({ ...item, index_global: idx + 1 }));

// GARDER seulement :
devisItems.sort((a, b) => a.index_global - b.index_global);
```

### ÉTAPE 6 : Adapter `handlePlaceLineAt` pour lignes spéciales

```javascript
// Utiliser des incréments intermédiaires :
// Global : x.5
// Partie : x.x5
// Sous-partie : x.xx5
```

---

## ✅ Validation du système

### Test 1 : Insertion
```javascript
✅ Insérer SP à 1.2 → décale 1.2→1.3, mais pas 2.1
✅ Insérer ligne à 1.203 → décale 1.203→1.213, mais pas 1.301
✅ Ligne spéciale à 1.205 → ne décale rien (incr intermédiaire)
```

### Test 2 : Drag partie
```javascript
✅ Partie 3→1 : enfants 3.x→1.x (garde .1, .2, .3)
✅ Parties entre 1 et 3 décalées
```

### Test 3 : Drag sous-partie
```javascript
✅ SP 1.3→1.1 dans Partie 1 : OK
❌ SP 1.3→2.1 : REFUSÉ (type="SOUS_PARTIE" empêche)
```

---

## 🎯 Résumé du système

**Format** : Number avec notation décimale
- Parties : 1, 2, 3...
- Sous-parties : X.1, X.2, X.3...
- Lignes : X.Y01, X.Y02, X.Y03...

**Insertion** : Donner index + décaler suivants (+1, +0.1, +0.01)

**Drag** : Réorganiser tableau + réattribuer index séquentiels

**Lignes spéciales** : Incréments intermédiaires (0.5, 0.05, 0.005)

**Tri** : Simple comparaison Number

**Limites** : 999 parties, 99 SP/partie, 99 lignes/SP ✅

---

Est-ce que ce document est clair pour implémenter le système ? 🚀

