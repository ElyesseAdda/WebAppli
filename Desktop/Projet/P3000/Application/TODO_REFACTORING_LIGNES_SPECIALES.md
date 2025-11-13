# 📋 TODO - Refactoring Système de Lignes Spéciales

## 🎯 Objectif
Unifier et corriger le système de gestion des lignes spéciales pour éliminer les conflits entre DevisAvance.js et DevisTable.js.

---

## ⚡ PHASE 1 : CORRECTIONS CRITIQUES (P0) - 2-3h

### ✅ TODO 1.1 : Supprimer la réindexation globale dans DevisTable
**Priorité :** 🔴 CRITIQUE  
**Temps estimé :** 30 min  
**Fichier :** `DevisTable.js`

**Actions :**
1. Ligne 396-398 (drag partie) :
   ```javascript
   // ❌ SUPPRIMER
   const reindexed = sorted.map((item, idx) => ({ ...item, index_global: idx + 1 }));
   
   // ✅ REMPLACER PAR
   // Pas de réindexation, juste trier
   onDevisItemsReorder(sorted);
   ```

2. Ligne 461-463 (drag sous-partie) :
   ```javascript
   // ❌ SUPPRIMER
   const reindexed = sorted.map((item, idx) => ({ ...item, index_global: idx + 1 }));
   
   // ✅ REMPLACER PAR
   onDevisItemsReorder(sorted);
   ```

3. Ligne 517-519 (drag ligne détail) :
   ```javascript
   // ❌ SUPPRIMER
   const reindexed = sorted.map((item, idx) => ({ ...item, index_global: idx + 1 }));
   
   // ✅ REMPLACER PAR
   onDevisItemsReorder(sorted);
   ```

**Test :**
- Drag une partie → vérifier que les index restent hiérarchiques (1, 1.1, 1.101)
- Vérifier qu'une ligne globale à 0.5 reste à 0.5

---

### ✅ TODO 1.2 : Migrer vers le système hiérarchique dans DevisTable
**Priorité :** 🔴 CRITIQUE  
**Temps estimé :** 1h  
**Fichier :** `DevisTable.js`

**Actions :**

#### A. Drag & drop des parties (ligne 356-394)
```javascript
// ❌ SUPPRIMER le système multiplicateur
const partieIndexMap = new Map();
partieItems.forEach((partie, idx) => {
  partieIndexMap.set(partie.id, (idx + 1) * 1000); // ❌
});

// ✅ UTILISER le système hiérarchique
const partieIndexMap = new Map();
partieItems.forEach((partie, idx) => {
  partieIndexMap.set(partie.id, idx + 1);  // 1, 2, 3...
});

// ❌ SUPPRIMER les calculs avec % 1000
return { ...item, index_global: baseIndex + item.index_global % 1000 };

// ✅ COPIER la logique de DevisAvance.js (ligne 1559-1573)
const oldPartieItem = devisItems.find(i => i.type === 'partie' && i.id === item.context_id);
if (!oldPartieItem) return { ...item };
const oldPartieIndex = Math.floor(oldPartieItem.index_global);
const offset = item.index_global - oldPartieIndex;
return { ...item, index_global: partieIndexMap.get(item.context_id) + offset };
```

#### B. Drag & drop des sous-parties (ligne 435-459)
```javascript
// ❌ SUPPRIMER
spIndexMap.set(sp.id, sp.index_global + idx * 0.1);

// ✅ REMPLACER PAR (comme DevisAvance ligne 690-692)
const partieItem = devisItems.find(i => i.type === 'partie' && i.id === partieId);
const partieIndex = partieItem.index_global;
const newSPIndex = partieIndex + (idx + 1) * 0.1; // 1.1, 1.2, 1.3...
spIndexMap.set(sp.id, newSPIndex);
```

#### C. Drag & drop des lignes détails (ligne 497-515)
```javascript
// ❌ SUPPRIMER
ligneIndexMap.set(ligne.id, ligne.index_global + idx * 0.01);

// ✅ REMPLACER PAR (comme DevisAvance ligne 1467)
const sp = devisItems.find(i => i.type === 'sous_partie' && i.id === sousPartieId);
const spIndex = sp.index_global;
const newLigneIndex = spIndex + (idx + 1) * 0.01; // 1.101, 1.102...
ligneIndexMap.set(ligne.id, newLigneIndex);
```

**Test :**
- Drag plusieurs parties, SP, lignes
- Vérifier la console que les index sont corrects (1, 1.1, 1.101)
- Vérifier que les lignes spéciales suivent correctement

---

### ✅ TODO 1.3 : Connecter handleMoveSpecialLine
**Priorité :** 🔴 CRITIQUE  
**Temps estimé :** 15 min  
**Fichiers :** `DevisTable.js`

**Actions :**

1. Ligne 163 - Ajouter le prop :
   ```javascript
   onRemoveSpecialLine,
   onMoveSpecialLine,  // ✅ AJOUTER
   onEditSpecialLine,
   ```

2. Ligne 2412 - Utiliser le nouveau handler :
   ```javascript
   // ❌ SUPPRIMER
   onClick={() => {
     const line = devisItems.find(item => item.type === 'ligne_speciale' && item.id === hoveredSpecialLineId);
     if (line && onRequestReplacement) {
       onRequestReplacement(line);
     }
   }}
   
   // ✅ REMPLACER PAR
   onClick={() => {
     if (onMoveSpecialLine) {
       onMoveSpecialLine(hoveredSpecialLineId);
     }
   }}
   ```

**Test :**
- Cliquer sur le bouton "Déplacer" d'une ligne spéciale
- Vérifier dans la console : `🔄 Démarrage du déplacement de la ligne`
- Cliquer sur une nouvelle position
- Vérifier que la ligne se déplace correctement

---

### ✅ TODO 1.4 : Ajouter logs de débogage dans DevisTable
**Priorité :** 🟠 MAJEUR  
**Temps estimé :** 15 min  
**Fichier :** `DevisTable.js`

**Actions :**

Ajouter des logs dans `handleDragEnd` :
```javascript
const handleDragEnd = (result) => {
  console.log('🎯 === DRAG END ===', {
    source: result.source,
    destination: result.destination,
    draggableId: result.draggableId
  });
  
  // ... code existant ...
  
  // Après chaque section de drag
  console.log('📊 Items mis à jour:', sorted.map(i => ({
    type: i.type,
    id: i.id,
    index_global: i.index_global
  })));
  
  // Avant d'appeler onDevisItemsReorder
  console.log('✅ Appel de onDevisItemsReorder avec', sorted.length, 'items');
}
```

---

## 🔧 PHASE 2 : SIMPLIFICATIONS (P1) - 2-3h

### ✅ TODO 2.1 : Nettoyer le code drag & drop commenté
**Priorité :** 🟡 MOYEN  
**Temps estimé :** 30 min  
**Fichier :** `DevisTable.js`

**Actions :**
1. Supprimer les lignes 529-641 (code commenté pour drag de lignes spéciales)
2. Supprimer les références à `onRequestReplacement` si plus utilisé
3. Nettoyer les imports inutilisés

---

### ✅ TODO 2.2 : Simplifier la synchronisation devisItems ↔ selectedParties
**Priorité :** 🟡 MOYEN  
**Temps estimé :** 1h  
**Fichier :** `DevisAvance.js`

**Options :**

**Option A : Garder les deux (court terme)**
- Documenter clairement quelle source est la référence
- Ajouter des validations de cohérence
- Logs si désynchronisation détectée

**Option B : Migrer vers devisItems uniquement (long terme)**
- Supprimer `selectedParties`
- Tout gérer via `devisItems`
- Reconstruire `selectedParties` uniquement pour l'API backend

**Recommandation :** Option A pour l'instant (moins risqué)

**Actions pour Option A :**
```javascript
// Dans useEffect ligne 1290
useEffect(() => {
  if (isReordering) return;
  
  // ✅ AJOUTER validation
  console.log('🔄 Synchronisation selectedParties → devisItems');
  console.log('📊 selectedParties:', selectedParties.length);
  console.log('📊 devisItems avant:', devisItems.length);
  
  // ... code existant ...
  
  console.log('📊 devisItems après:', withNumeros.length);
  
  // ✅ AJOUTER vérification cohérence
  const lignesSpecialesCount = withNumeros.filter(i => i.type === 'ligne_speciale').length;
  const prevLignesSpecialesCount = prevItems.filter(i => i.type === 'ligne_speciale').length;
  if (lignesSpecialesCount !== prevLignesSpecialesCount) {
    console.warn('⚠️ Nombre de lignes spéciales a changé:', 
      prevLignesSpecialesCount, '→', lignesSpecialesCount);
  }
}, [selectedParties, isReordering]);
```

---

### ✅ TODO 2.3 : Unifier les systèmes de placement
**Priorité :** 🟡 MOYEN  
**Temps estimé :** 1h  
**Fichiers :** `DevisTable.js`, `DevisAvance.js`

**Actions :**

1. **Garder uniquement :** PlacementZone + bouton Déplacer
2. **Supprimer :** Code drag & drop de lignes spéciales (déjà commenté)
3. **Documenter :** UX claire :
   - Créer ligne → cliquer sur zone de placement
   - Déplacer ligne → bouton → cliquer sur zone
   - Éditer ligne → bouton éditer

---

## 📈 PHASE 3 : AMÉLIORATIONS (P2) - 1-2h

### ✅ TODO 3.1 : Améliorer le recalcul des numéros
**Priorité :** 🟢 MINEUR  
**Temps estimé :** 30 min  
**Fichier :** `DevisAvance.js`

**Actions :**
- Ajouter validation des index avant recalcul
- Vérifier que les index sont bien hiérarchiques
- Logs d'avertissement si incohérences

---

### ✅ TODO 3.2 : Ajouter des tests visuels
**Priorité :** 🟢 MINEUR  
**Temps estimé :** 1h  

**Actions :**
Créer un document de tests visuels avec captures d'écran :
- Avant/après drag partie
- Avant/après drag sous-partie
- Ligne spéciale suit parent
- Ligne globale reste fixe

---

### ✅ TODO 3.3 : Documentation utilisateur
**Priorité :** 🟢 MINEUR  
**Temps estimé :** 30 min  

**Actions :**
Créer `GUIDE_LIGNES_SPECIALES.md` avec :
- Comment créer une ligne spéciale
- Comment la placer
- Comment la déplacer
- Comment l'éditer
- Limitations et comportements

---

## 🧪 PHASE 4 : VALIDATION (P3) - 1h

### ✅ TODO 4.1 : Tests manuels complets
**Priorité :** 🔴 CRITIQUE avant mise en prod  
**Temps estimé :** 30 min  

**Scénarios à tester :**

1. **Création et placement**
   - [ ] Créer ligne globale → placer au début (index 0.5)
   - [ ] Créer ligne de partie → placer entre SP
   - [ ] Créer ligne de sous-partie → placer entre lignes détail

2. **Drag & drop avec lignes spéciales**
   - [ ] Drag partie avec ligne spéciale attachée → vérifier qu'elle suit
   - [ ] Drag sous-partie avec ligne spéciale → vérifier qu'elle suit
   - [ ] Drag partie → ligne globale doit rester fixe

3. **Déplacement via bouton**
   - [ ] Déplacer ligne de partie → sous-partie (context change)
   - [ ] Déplacer ligne de sous-partie → global (context change)
   - [ ] Vérifier que l'ancienne ligne disparaît bien

4. **Calculs et totaux**
   - [ ] Ligne spéciale % → vérifier calcul dynamique
   - [ ] Modifier quantité → vérifier recalcul ligne spéciale
   - [ ] Total global correct avec lignes spéciales

5. **Edge cases**
   - [ ] Supprimer une partie avec ligne spéciale attachée
   - [ ] Multiples lignes spéciales dans même contexte
   - [ ] Ligne spéciale au début et à la fin

---

### ✅ TODO 4.2 : Validation technique
**Priorité :** 🟠 MAJEUR  
**Temps estimé :** 30 min  

**Actions :**
```javascript
// Ajouter fonction de validation dans DevisAvance.js
const validateIndexHierarchy = (items) => {
  const errors = [];
  
  items.forEach(item => {
    if (item.type === 'partie') {
      // Doit être entier
      if (item.index_global % 1 !== 0) {
        errors.push(`Partie ${item.id} a un index non entier: ${item.index_global}`);
      }
    } else if (item.type === 'sous_partie') {
      // Doit être X.Y (une décimale)
      const str = item.index_global.toString();
      const parts = str.split('.');
      if (parts.length !== 2 || parts[1].length !== 1) {
        errors.push(`Sous-partie ${item.id} a un mauvais format: ${item.index_global}`);
      }
    } else if (item.type === 'ligne_detail') {
      // Doit être X.YZZ (trois décimales)
      const str = item.index_global.toString();
      const parts = str.split('.');
      if (parts.length !== 2 || parts[1].length !== 3) {
        errors.push(`Ligne ${item.id} a un mauvais format: ${item.index_global}`);
      }
    } else if (item.type === 'ligne_speciale' && item.context_type !== 'global') {
      // Doit avoir un incrément intermédiaire
      // 0.5, 0.05, 0.005 ou équivalents
    }
  });
  
  if (errors.length > 0) {
    console.error('❌ Erreurs de hiérarchie:', errors);
  } else {
    console.log('✅ Hiérarchie valide');
  }
  
  return errors.length === 0;
};

// Appeler après chaque réorganisation
```

---

## 📊 RÉCAPITULATIF DES PRIORITÉS

| Phase | Tâches | Temps estimé | Priorité | Bloquant |
|-------|--------|--------------|----------|----------|
| **Phase 1** | 4 TODO (1.1 à 1.4) | 2-3h | 🔴 P0 | ✅ OUI |
| **Phase 2** | 3 TODO (2.1 à 2.3) | 2-3h | 🟡 P1 | ⚠️ Recommandé |
| **Phase 3** | 3 TODO (3.1 à 3.3) | 1-2h | 🟢 P2 | ❌ Non |
| **Phase 4** | 2 TODO (4.1 à 4.2) | 1h | 🔴 P0 | ✅ Avant prod |

**TOTAL ESTIMÉ :** 6-9 heures de travail

---

## 🎯 ORDRE D'EXÉCUTION RECOMMANDÉ

### Jour 1 (3-4h) - Corrections critiques
1. ✅ TODO 1.1 - Supprimer réindexation (30 min)
2. ✅ TODO 1.2 - Migrer vers hiérarchique (1h)
3. ✅ TODO 1.4 - Ajouter logs (15 min)
4. ✅ TODO 1.3 - Connecter handleMoveSpecialLine (15 min)
5. ✅ TODO 4.1 - Tests manuels basiques (1h)

### Jour 2 (2-3h) - Simplifications
6. ✅ TODO 2.1 - Nettoyer code commenté (30 min)
7. ✅ TODO 2.2 - Simplifier synchronisation (1h)
8. ✅ TODO 2.3 - Unifier placement (1h)
9. ✅ TODO 4.2 - Validation technique (30 min)

### Jour 3 (1-2h) - Améliorations (optionnel)
10. ✅ TODO 3.1 - Améliorer recalcul (30 min)
11. ✅ TODO 3.2 - Tests visuels (1h)
12. ✅ TODO 3.3 - Documentation (30 min)

---

## 🚀 MISE EN PRODUCTION

**Avant de déployer :**
- [ ] Phase 1 complète (TODO 1.1 à 1.4)
- [ ] Tests manuels Phase 4.1 validés
- [ ] Validation technique Phase 4.2 passée
- [ ] Backup de la base de données
- [ ] Tests sur environnement de staging

**Recommandations :**
- Déployer d'abord Phase 1 uniquement
- Observer en production 1-2 jours
- Puis déployer Phase 2 si stable
- Phase 3 en dernier (améliorations non critiques)

---

**Date de création :** 2025-01-XX  
**Dernière mise à jour :** 2025-01-XX  
**Statut :** 📝 TODO - En attente de validation

