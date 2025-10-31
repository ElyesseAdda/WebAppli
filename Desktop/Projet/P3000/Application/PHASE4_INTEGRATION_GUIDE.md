# 🔧 Phase 4 : Guide d'Intégration

## 📍 **Plan d'Intégration**

### **1️⃣ Ajout des États dans DevisAvance.js**

Ajouter les nouveaux états pour les lignes spéciales :

```javascript
// États pour les lignes spéciales en attente
const [pendingSpecialLines, setPendingSpecialLines] = useState([]);
const [editingSpecialLine, setEditingSpecialLine] = useState(null);
const [showEditModal, setShowEditModal] = useState(false);
```

### **2️⃣ Ajout des Handlers dans DevisAvance.js**

Ajouter les handlers pour gérer les lignes spéciales :

```javascript
// Ajouter une ligne en attente
const handleAddPendingSpecialLine = (line) => {
  setPendingSpecialLines(prev => [...prev, line]);
};

// Supprimer une ligne en attente
const handleRemovePendingSpecialLine = (lineId) => {
  setPendingSpecialLines(prev => prev.filter(line => line.id !== lineId));
};

// Ouvrir modal d'édition
const handleEditSpecialLine = (line) => {
  setEditingSpecialLine(line);
  setShowEditModal(true);
};

// Sauvegarder ligne éditée
const handleSaveSpecialLine = (updatedLine) => {
  setPendingSpecialLines(prev => prev.map(line => 
    line.id === updatedLine.id ? updatedLine : line
  ));
  setShowEditModal(false);
  setEditingSpecialLine(null);
};
```

### **3️⃣ Fonctions de Calcul**

Ajouter les fonctions de calcul pour BaseCalculationSelector :

```javascript
// Calculer le total global
const calculateGlobalTotal = (parties) => {
  return parties.reduce((total, partie) => {
    const partieTotal = (partie.selectedSousParties || []).reduce((partieSum, sp) => {
      const sousPartieTotal = (sp.selectedLignesDetails || []).reduce((spSum, ld) => {
        const prix = calculatePrice(ld);
        return spSum + (prix * (ld.quantity || 0));
      }, 0);
      return partieSum + sousPartieTotal;
    }, 0);
    return total + partieTotal;
  }, 0);
};

// Calculer le total d'une partie
const calculatePartieTotal = (partie) => {
  return (partie.selectedSousParties || []).reduce((sum, sp) => {
    const sousPartieTotal = (sp.selectedLignesDetails || []).reduce((spSum, ld) => {
      const prix = calculatePrice(ld);
      return spSum + (prix * (ld.quantity || 0));
    }, 0);
    return sum + sousPartieTotal;
  }, 0);
};

// Calculer le total d'une sous-partie
const calculateSousPartieTotal = (sousPartie) => {
  return (sousPartie.selectedLignesDetails || []).reduce((sum, ld) => {
    const prix = calculatePrice(ld);
    return sum + (prix * (ld.quantity || 0));
  }, 0);
};

// Calculer le prix d'une ligne de détail
const calculatePrice = (ligne) => {
  if (ligne.prix_devis !== null && ligne.prix_devis !== undefined) {
    return parseFloat(ligne.prix_devis);
  }
  const marge = ligne.marge_devis !== null && ligne.marge_devis !== undefined 
    ? parseFloat(ligne.marge_devis)
    : parseFloat(ligne.marge) || 0;
  const cout_main_oeuvre = parseFloat(ligne.cout_main_oeuvre) || 0;
  const cout_materiel = parseFloat(ligne.cout_materiel) || 0;
  const taux_fixe = parseFloat(ligne.taux_fixe) || 0;
  const base = cout_main_oeuvre + cout_materiel;
  const montant_taux_fixe = base * (taux_fixe / 100);
  const sous_total = base + montant_taux_fixe;
  const montant_marge = sous_total * (marge / 100);
  const prix = sous_total + montant_marge;
  return prix;
};
```

### **4️⃣ Props à Passer à DevisTable**

Passer les nouveaux props à DevisTable :

```javascript
<DevisTable
  // ... props existants ...
  
  // Nouveaux props pour lignes spéciales
  pendingSpecialLines={pendingSpecialLines}
  onAddPendingSpecialLine={handleAddPendingSpecialLine}
  onRemovePendingSpecialLine={handleRemovePendingSpecialLine}
  onEditSpecialLine={handleEditSpecialLine}
  editingSpecialLine={editingSpecialLine}
  showEditModal={showEditModal}
  onCloseEditModal={() => setShowEditModal(false)}
  onSaveSpecialLine={handleSaveSpecialLine}
  
  // Fonctions de calcul
  calculateGlobalTotal={calculateGlobalTotal}
  calculatePartieTotal={calculatePartieTotal}
  calculateSousPartieTotal={calculateSousPartieTotal}
  calculatePrice={calculatePrice}
/>
```

### **5️⃣ Intégration dans DevisTable.js**

#### **5.1 Imports**

```javascript
import SpecialLinesCreator from './LignesSpeciales/SpecialLinesCreator';
import PendingSpecialLines from './LignesSpeciales/PendingSpecialLines';
import SpecialLineEditModal from './LignesSpeciales/SpecialLineEditModal';
```

#### **5.2 Props dans la signature**

```javascript
const DevisTable = ({ 
  // ... props existants ...
  
  // Lignes spéciales
  pendingSpecialLines,
  onAddPendingSpecialLine,
  onRemovePendingSpecialLine,
  onEditSpecialLine,
  editingSpecialLine,
  showEditModal,
  onCloseEditModal,
  onSaveSpecialLine,
  
  // Fonctions de calcul
  calculateGlobalTotal,
  calculatePartieTotal,
  calculateSousPartieTotal,
  calculatePrice,
}) => {
```

#### **5.3 Intégration dans le JSX**

Après la fermeture du `</table>`, avant la fermeture de `</div>`, ajouter :

```javascript
<div style={{ padding: '20px', backgroundColor: '#f9f9f9' }}>
  {/* Créateur de lignes spéciales */}
  <SpecialLinesCreator
    onAddPendingLine={onAddPendingSpecialLine}
    formatMontantEspace={formatMontantEspace}
    selectedParties={selectedParties}
    calculatePartieTotal={calculatePartieTotal}
    calculateSousPartieTotal={calculateSousPartieTotal}
    calculatePrice={calculatePrice}
    calculateGlobalTotal={calculateGlobalTotal}
  />
  
  {/* Lignes en attente */}
  <PendingSpecialLines
    lines={pendingSpecialLines}
    onEdit={onEditSpecialLine}
    onRemove={onRemovePendingSpecialLine}
  />
  
  {/* Modal d'édition */}
  {showEditModal && editingSpecialLine && (
    <SpecialLineEditModal
      open={showEditModal}
      line={editingSpecialLine}
      onClose={onCloseEditModal}
      onSave={onSaveSpecialLine}
      formatMontantEspace={formatMontantEspace}
      selectedParties={selectedParties}
      calculatePartieTotal={calculatePartieTotal}
      calculateSousPartieTotal={calculateSousPartieTotal}
      calculatePrice={calculatePrice}
      calculateGlobalTotal={calculateGlobalTotal}
    />
  )}
</div>
```

---

## ✅ **Checklist d'Intégration**

- [ ] États ajoutés dans DevisAvance
- [ ] Handlers créés
- [ ] Fonctions de calcul créées
- [ ] Props passées à DevisTable
- [ ] Imports dans DevisTable
- [ ] Props dans signature DevisTable
- [ ] JSX intégré dans DevisTable
- [ ] Tests fonctionnels

---

## 🚀 **Prochaines Étapes**

1. Drag & Drop global des lignes
2. Rendu des lignes spéciales dans le tableau
3. Compatibilité avec anciens devis
4. Sync PDF

