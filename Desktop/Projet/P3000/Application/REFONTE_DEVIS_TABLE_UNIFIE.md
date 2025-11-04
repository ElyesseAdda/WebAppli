# 🔄 Refonte DevisTable - Rendu Unifié Complet

## 🎯 **OBJECTIF**

Afficher tous les éléments (parties, sous-parties, lignes détails, lignes spéciales) **dans l'ordre de leur `index_global`**, à leur position exacte.

---

## 📊 **ARCHITECTURE DU NOUVEAU RENDU**

### **Structure Actuelle (Legacy)**
```
selectedParties (hiérarchique)
  └─ Partie 1
      └─ SousPartie 1.1
          └─ Ligne 1.1.1
          └─ Ligne 1.1.2
      └─ SousPartie 1.2
  └─ Partie 2
  
+ pendingSpecialLines (séparé)
+ placedSpecialLines (séparé)
```

### **Nouvelle Structure (Unified)**
```
devisItems (liste plate triée par index_global)
  [1] Partie 1
  [2] SousPartie 1.1
  [3] Ligne 1.1.1
  [4] LigneSpéciale (remise)
  [5] Ligne 1.1.2
  [6] SousPartie 1.2
  [7] LigneSpéciale (note)
  [8] Partie 2
```

---

## 🔧 **IMPLÉMENTATION**

### **Étape 1 : Détection du mode de rendu**

```javascript
// Si devisItems contient des éléments, utiliser le rendu unifié
const useUnifiedRender = devisItems && devisItems.length > 0;
```

### **Étape 2 : Créer les composants Row**

Créer des composants simples pour chaque type :

```javascript
// Composant pour afficher une partie
const PartieRow = ({ partie, provided, snapshot, onToggleNumber, onRemove, onEdit }) => (
  <div ref={provided.innerRef} {...provided.draggableProps}>
    <div style={{ backgroundColor: 'rgba(27, 120, 188, 1)', color: 'white', ... }}>
      <div {...provided.dragHandleProps}>⋮⋮</div>
      <span>{partie.numero} {partie.titre}</span>
      <span>{montant}</span>
    </div>
  </div>
);

// Composant pour afficher une sous-partie
const SousPartieRow = ({ sousPartie, provided, snapshot, depth = 1 }) => (
  <div style={{ marginLeft: `${depth * 20}px` }}>
    ...
  </div>
);

// Composant pour afficher une ligne détail
const LigneDetailRow = ({ ligne, provided, snapshot, depth = 2 }) => (
  <div style={{ marginLeft: `${depth * 20}px` }}>
    ...
  </div>
);

// LigneSpecialeRow existe déjà ✅
```

### **Étape 3 : Rendu conditionnel**

```javascript
{useUnifiedRender ? (
  // NOUVEAU RENDU UNIFIÉ
  <UnifiedTableRender 
    items={devisItems}
    onReorder={handleUnifiedDragEnd}
    formatMontantEspace={formatMontantEspace}
    ...
  />
) : (
  // ANCIEN RENDU (si pas de devisItems)
  <LegacyTableRender 
    selectedParties={selectedParties}
    ...
  />
)}
```

---

## ⚡ **SOLUTION RAPIDE : Utiliser devisItems directement**

Au lieu de créer deux renders séparés, on peut **remplacer progressivement** le render actuel :

1. Parcourir `devisItems` au lieu de `selectedParties`
2. Afficher chaque élément selon son type
3. Garder le même style/structure

---

**Quelle approche préférez-vous ?**

A) Refonte complète avec nouveaux composants (2-3h)
B) Solution rapide : adapter le rendu existant (30min)

