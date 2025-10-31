# 🎯 Solution : Sélection de Base de Calcul pour Pourcentages

## 📋 **Problème**

Quand l'utilisateur crée une ligne spéciale avec un **pourcentage**, il faut savoir **à partir de quel montant** calculer le %.

Exemple :
- "Remise 10%" → 10% de **quoi** ?
  - Du total du devis ?
  - D'une partie spécifique ?
  - D'une sous-partie ?
  - D'une ligne de détail ?

### **Bonus : Recalcul Dynamique** 🔥

**IMPORTANT** : Si le montant de la base change après la création, la ligne spéciale doit **se recalculer automatiquement**.

Exemple :
1. Ligne "Remise 10% de la partie PEINTURE (2500€)" = 250€
2. L'utilisateur modifie les lignes → PEINTURE devient 2800€
3. ✅ La remise se recalcule automatiquement : 280€

---

## ✅ **Solution : Modal de Sélection avec Overlay**

### **Workflow**

```
1. Utilisateur crée ligne spéciale
2. Sélectionne "Pourcentage"
3. ✅ Overlay s'active (écran assombri)
4. Montants deviennent cliquables (surbrillance)
5. Utilisateur clique sur un montant
6. ✅ Base de calcul enregistrée
7. Overlay se ferme
8. Ligne créée avec référence à la base
```

---

## 🎨 **Interface**

### **État Normal**
```
┌─────────────────────────────────────────────────────────┐
│  DEVIS                                                  │
│  ┌────────────────────────────────────────────────────┐ │
│  │ PARTIE : PEINTURE                      2500 €    │ │
│  │ ─────────────────────────────────────────────────│ │
│  │ SOUS-PARTIE : Préparation            1000 €      │ │
│  │ - Ligne détail 1            500 €                │ │
│  │ - Ligne détail 2            500 €                │ │
│  │ SOUS-PARTIE : Application             1500 €     │ │
│  │ - Ligne détail 3           1500 €                │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### **Mode Sélection (Overlay Actif)**
```
┌─────────────────────────────────────────────────────────┐
│  ╔═════════════════════════════════════════════════════╗ │
│  ║ 🔍 Sélectionnez la base de calcul ║                  │
│  ║                                                        ║ │
│  ║ Cliquez sur un montant ci-dessous pour               ║ │
│  ║ calculer le pourcentage à partir de celui-ci        ║ │
│  ╚═════════════════════════════════════════════════════╝ │
│                                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │ PARTIE : PEINTURE  ────► [2500 €] ← CLIQUEZ      │ │
│  │ ─────────────────────────────────────────────────│ │
│  │ SOUS-PARTIE : Préparation ──► [1000 €] ← CLIQUEZ│ │
│  │ - Ligne détail 1 ────────────► [500 €] ← CLIQUEZ│ │
│  │ - Ligne détail 2 ────────────► [500 €] ← CLIQUEZ│ │
│  │ SOUS-PARTIE : Application ───► [1500 €] ← CLIQUEZ│ │
│  │ - Ligne détail 3 ────────────► [1500 €] ← CLIQUEZ│ │
│  └────────────────────────────────────────────────────┘ │
│                                                           │
│  [Annuler la sélection]                                  │
└─────────────────────────────────────────────────────────┘
```

---

## 🎨 **Composant**

### **BaseCalculationSelector.js**

```javascript
import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, Button, Box } from '@mui/material';

const BaseCalculationSelector = ({ 
  open, 
  onClose, 
  onSelect,
  parties, // Tous les éléments du devis avec leurs totaux
  selectedParties
}) => {
  const [highlightedElement, setHighlightedElement] = useState(null);
  
  // Liste de tous les montants cliquables
  const selectableItems = [
    // Total global
    {
      id: 'global_total',
      label: '💰 TOTAL GLOBAL HT',
      amount: calculateGlobalTotal(),
      type: 'global',
      path: 'global'
    },
    // Partie
    ...selectedParties.map(partie => ({
      id: `partie_${partie.id}`,
      label: `📁 ${partie.titre}`,
      amount: calculatePartieTotal(partie),
      type: 'partie',
      path: `partie_${partie.id}`,
      partieId: partie.id
    })),
    // Sous-parties
    ...selectedParties.flatMap(partie => 
      partie.selectedSousParties.map(sp => ({
        id: `sous_partie_${sp.id}`,
        label: `📂 ${sp.titre}`,
        amount: calculateSousPartieTotal(sp),
        type: 'sous_partie',
        path: `partie_${partie.id}/sous_partie_${sp.id}`,
        partieId: partie.id,
        sousPartieId: sp.id
      }))
    ),
    // Lignes de détails
    ...selectedParties.flatMap(partie =>
      partie.selectedSousParties.flatMap(sp =>
        sp.selectedLignesDetails.map(ld => ({
          id: `ligne_detail_${ld.id}`,
          label: ld.description,
          amount: calculatePrice(ld) * (ld.quantity || 0),
          type: 'ligne_detail',
          path: `partie_${partie.id}/sous_partie_${sp.id}/ligne_detail_${ld.id}`,
          partieId: partie.id,
          sousPartieId: sp.id,
          ligneDetailId: ld.id
        }))
      )
    )
  ];
  
  const handleItemClick = (item) => {
    onSelect(item);
    onClose();
  };
  
  const handleItemHover = (itemId) => {
    setHighlightedElement(itemId);
  };
  
  return (
    <>
      {/* Overlay sombre */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          zIndex: 9998,
          display: open ? 'block' : 'none'
        }}
      />
      
      {/* Dialog en haut */}
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          style: {
            position: 'absolute',
            top: '20px',
            margin: 0,
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
          }
        }}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <span style={{ fontSize: '24px' }}>🔍</span>
            Sélectionnez la base de calcul
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ 
            mb: 2, 
            p: 2, 
            backgroundColor: '#e3f2fd',
            borderRadius: '4px',
            fontSize: '14px'
          }}>
            Cliquez sur un montant ci-dessous pour calculer le pourcentage à partir de celui-ci
          </Box>
          
          {/* Liste des montants */}
          <Box sx={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {selectableItems.map((item, index) => (
              <Box
                key={item.id}
                onClick={() => handleItemClick(item)}
                onMouseEnter={() => handleItemHover(item.id)}
                onMouseLeave={() => setHighlightedElement(null)}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  p: 2,
                  mb: 1,
                  cursor: 'pointer',
                  borderRadius: '4px',
                  backgroundColor: highlightedElement === item.id 
                    ? '#1976d2' 
                    : index % 2 === 0 
                      ? '#f5f5f5' 
                      : 'white',
                  color: highlightedElement === item.id ? 'white' : 'black',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: '#1976d2',
                    color: 'white',
                    transform: 'scale(1.02)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                },
                  border: highlightedElement === item.id 
                    ? '2px solid #fff' 
                    : '1px solid #e0e0e0'
                }}
              >
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1,
                  fontWeight: highlightedElement === item.id ? 'bold' : 'normal'
                }}>
                  <span style={{ 
                    fontSize: highlightedElement === item.id ? '20px' : '16px',
                    transition: 'all 0.2s ease'
                  }}>
                    {getIconForType(item.type)}
                  </span>
                  <span>{item.label}</span>
                </Box>
                <Box sx={{ 
                  fontSize: '18px',
                  fontWeight: 'bold',
                  backgroundColor: highlightedElement === item.id ? 'rgba(255,255,255,0.2)' : 'transparent',
                  px: 2,
                  py: 1,
                  borderRadius: '4px'
                }}>
                  {formatAmount(item.amount)} €
                </Box>
              </Box>
            ))}
          </Box>
          
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Button 
              variant="outlined" 
              onClick={onClose}
              sx={{ minWidth: '200px' }}
            >
              Annuler la sélection
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
};

const getIconForType = (type) => {
  switch(type) {
    case 'global': return '💰';
    case 'partie': return '📁';
    case 'sous_partie': return '📂';
    case 'ligne_detail': return '📄';
    default: return '💵';
  }
};

const formatAmount = (amount) => {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

export default BaseCalculationSelector;
```

---

## 🔄 **Intégration dans SpecialLinesCreator**

```javascript
// Dans SpecialLinesCreator.js
const [showBaseSelector, setShowBaseSelector] = useState(false);
const [selectedBase, setSelectedBase] = useState(null);

// Quand l'utilisateur change valueType vers "percentage"
const handleValueTypeChange = (valueType) => {
  setNewLine(prev => ({ ...prev, valueType }));
  
  if (valueType === 'percentage') {
    // Ouvrir le sélecteur
    setShowBaseSelector(true);
  } else {
    // Nettoyer la base si on revient à "fixe"
    setSelectedBase(null);
  }
};

// Quand l'utilisateur sélectionne une base
const handleBaseSelected = (base) => {
  setSelectedBase(base);
  setShowBaseSelector(false);
  
  // Afficher la sélection
  setNewLine(prev => ({
    ...prev,
    baseCalculation: {
      type: base.type,
      path: base.path,
      label: base.label,
      amount: base.amount
    }
  }));
};

return (
  <div className="special-lines-creator">
    {/* ... autres inputs ... */}
    
    {/* Selection type de valeur */}
    <RadioGroup value={newLine.valueType} onChange={handleValueTypeChange}>
      <FormControlLabel value="fixed" control={<Radio />} label="Montant fixe (€)" />
      <FormControlLabel value="percentage" control={<Radio />} label="Pourcentage (%)" />
    </RadioGroup>
    
    {/* Affichage de la base sélectionnée */}
    {newLine.baseCalculation && (
      <Box sx={{ 
        mt: 2, 
        p: 2, 
        backgroundColor: '#e8f5e9',
        borderRadius: '4px',
        border: '1px solid #4caf50'
      }}>
        <Box display="flex" alignItems="center" gap={1}>
          <span>✅</span>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Base de calcul sélectionnée :
            </Typography>
            <Typography variant="body1" fontWeight="bold">
              {getIconForType(newLine.baseCalculation.type)} {newLine.baseCalculation.label}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Montant : {formatAmount(newLine.baseCalculation.amount)} €
            </Typography>
          </Box>
        </Box>
        <Button 
          size="small" 
          onClick={() => {
            setShowBaseSelector(true);
            setNewLine(prev => ({ ...prev, baseCalculation: null }));
          }}
          sx={{ mt: 1 }}
        >
          Changer
        </Button>
      </Box>
    )}
    
    {/* Modal de sélection */}
    <BaseCalculationSelector
      open={showBaseSelector}
      onClose={() => setShowBaseSelector(false)}
      onSelect={handleBaseSelected}
      parties={selectedParties}
    />
  </div>
);
```

---

## 💾 **Structure de Données**

### **Ancienne Structure (Sans Base)**

```javascript
{
  description: "Remise commerciale",
  value: 10,
  valueType: "percentage",
  type: "reduction"
}
// ❌ Problème : 10% de QUOI ?
```

### **Nouvelle Structure (Avec Base)**

```javascript
{
  description: "Remise commerciale",
  value: 10,
  valueType: "percentage",
  type: "reduction",
  baseCalculation: {
    type: "partie", // "global" | "partie" | "sous_partie" | "ligne_detail"
    path: "partie_123", // Chemin pour retrouver la base
    label: "📁 PEINTURE", // Pour affichage
    amount: 2500 // Montant de référence
  }
}
// ✅ 10% de la partie PEINTURE (2500€) = 250€
```

---

## 🧮 **Calcul du Montant**

### **Fonction de Calcul avec Recalcul Dynamique**

```javascript
// Dans le calcul de la ligne spéciale
const calculateSpecialLineAmount = (line, allDevisData) => {
  if (line.valueType === 'percentage') {
    // Si baseCalculation existe, utiliser le montant de la base
    if (line.baseCalculation) {
      // 🔥 IMPORTANT : Recalculer dynamiquement le montant de la base
      const currentBaseAmount = getCurrentAmountForBase(
        line.baseCalculation.path,
        allDevisData
      );
      return (currentBaseAmount * line.value) / 100;
    }
    // Sinon, calculer sur le montant passé en paramètre (rétro-compatibilité)
    const baseAmount = allDevisData.globalTotal || 0;
    return (baseAmount * line.value) / 100;
  } else {
    return line.value;
  }
};

// Fonction pour obtenir le montant actuel de la base
const getCurrentAmountForBase = (path, devisData) => {
  // Parse le chemin : "global" | "partie_123" | "partie_123/sous_partie_456" | "partie_123/sous_partie_456/ligne_detail_789"
  const parts = path.split('/');
  
  if (parts.length === 1) {
    // Global
    if (parts[0] === 'global') {
      return calculateGlobalTotal(devisData.selectedParties);
    }
    // Partie seule
    if (parts[0].startsWith('partie_')) {
      const partieId = parts[0].replace('partie_', '');
      const partie = findPartieById(partieId, devisData.selectedParties);
      return partie ? calculatePartieTotal(partie) : 0;
    }
  }
  
  if (parts.length === 2) {
    // Sous-partie
    if (parts[1].startsWith('sous_partie_')) {
      const [partiePath, sousPartiePath] = parts;
      const partieId = partiePath.replace('partie_', '');
      const sousPartieId = sousPartiePath.replace('sous_partie_', '');
      const partie = findPartieById(partieId, devisData.selectedParties);
      if (partie) {
        const sousPartie = findSousPartieById(sousPartieId, partie);
        return sousPartie ? calculateSousPartieTotal(sousPartie) : 0;
      }
    }
  }
  
  if (parts.length === 3) {
    // Ligne de détail
    const [partiePath, sousPartiePath, lignePath] = parts;
    const partieId = partiePath.replace('partie_', '');
    const sousPartieId = sousPartiePath.replace('sous_partie_', '');
    const ligneId = lignePath.replace('ligne_detail_', '');
    const partie = findPartieById(partieId, devisData.selectedParties);
    if (partie) {
      const sousPartie = findSousPartieById(sousPartieId, partie);
      if (sousPartie) {
        const ligne = findLigneDetailById(ligneId, sousPartie);
        return ligne ? calculatePrice(ligne) * (ligne.quantity || 0) : 0;
      }
    }
  }
  
  return 0;
};

// Exemple d'utilisation avec recalcul dynamique
const montantRemise = calculateSpecialLineAmount(
  { 
    value: 10, 
    valueType: 'percentage',
    baseCalculation: {
      path: 'partie_123', // Référence dynamique à la partie
      type: 'partie'
    }
  },
  devisData // Tout le contexte du devis
);
// Résultat : 10% du montant ACTUEL de la partie (recalculé à chaque changement)
```

### **Utilisation dans le Render**

```javascript
// Dans DevisTable.js
const renderSpecialLine = (line, devisData) => {
  // Calculer le montant dynamiquement
  const montant = calculateSpecialLineAmount(line, devisData);
  
  // Obtenir le montant de la base pour affichage
  const baseAmount = line.baseCalculation 
    ? getCurrentAmountForBase(line.baseCalculation.path, devisData)
    : 0;
  
  return (
    <tr className="special-line">
      <td colSpan="4">
        {line.description}
        {line.valueType === 'percentage' && line.baseCalculation && (
          <Box component="span" sx={{ ml: 1, fontSize: '0.85em', color: 'text.secondary' }}>
            (10% de {line.baseCalculation.label})
          </Box>
        )}
      </td>
      <td>
        {line.type === 'reduction' && '-'}
        {formatAmount(montant)} €
        {/* Afficher l'info dynamique */}
        {line.valueType === 'percentage' && line.baseCalculation && (
          <Box component="span" sx={{ fontSize: '0.75em', color: 'text.secondary', ml: 0.5 }}>
            ({formatAmount(baseAmount)} €)
          </Box>
        )}
      </td>
    </tr>
  );
};
```

### **Exemple de Comportement**

**État Initial :**
```
Remise commerciale (10% de 📁 PEINTURE)     - 250.00 € (2500 €)
```

**Après modification des lignes de la partie PEINTURE :**
```
Remise commerciale (10% de 📁 PEINTURE)     - 280.00 € (2800 €)
```

**Le montant se recalcule automatiquement !** ✅

---

## 🔍 **Affichage dans le Devis**

Voir section "Utilisation dans le Render" ci-dessus pour le code d'affichage complet avec recalcul dynamique.

**Résultat dans le devis :**
```
Remise commerciale (10% de 📁 PEINTURE)     - 250.00 € (2500 €)
                                                    ↑ Calcul dynamique
```

---

## 🔄 **Migration Anciens Devis**

```python
# Dans la fonction de conversion
def _get_default_styles(self, line):
    """Styles par défaut pour conversion"""
    styles = {}
    
    # Si highlighted dans l'ancien, appliquer styles de base
    if line.get('isHighlighted'):
        styles['backgroundColor'] = '#ffff00'
        styles['fontWeight'] = 'bold'
    
    # Pour les pourcentages anciens sans base
    if line.get('valueType') == 'percentage' and not line.get('baseCalculation'):
        # Créer une base par défaut = global
        base = {
            'type': 'global',
            'path': 'global',
            'label': '💰 TOTAL GLOBAL HT',
            'amount': 0  # Sera calculé dynamiquement
        }
        line['baseCalculation'] = base
    
    return styles if styles else None
```

---

## 🎨 **Améliorations Visuelles**

### **Animation Overlay**

```css
.base-selector-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  animation: fadeIn 0.3s ease;
  z-index: 9998;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.selectable-item {
  transition: all 0.2s ease;
}

.selectable-item:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}
```

### **Indicateur Visuel**

```javascript
// Ajouter un badge sur les montants cliquables
const renderAmountBadge = (item) => {
  if (highlightedElement === item.id) {
    return (
      <Box sx={{
        position: 'absolute',
        right: '-80px',
        backgroundColor: '#1976d2',
        color: 'white',
        px: 1,
        py: 0.5,
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 'bold'
      }}>
        SELECTIONNEZ
      </Box>
    );
  }
  return null;
};
```

---

## 📝 **Résumé**

| Aspect | Solution |
|--------|----------|
| **Activation** | Quand valueType = "percentage" |
| **Overlay** | Écran assombri avec z-index |
| **Montants** | Clicables et surlignés au hover |
| **Sélection** | Enregistrée dans baseCalculation |
| **Affichage** | Badge "10% de ..." dans le devis |
| **Calcul** | Utilise baseCalculation.amount |
| **Migration** | Auto base = global si absent |

---

## ✅ **Avantages**

✅ **Intuitive** : Interface claire et visuelle  
✅ **Précise** : L'utilisateur voit exactement la base  
✅ **Flexible** : Peut sélectionner n'importe quel montant  
✅ **Informatif** : Affiche clairement le calcul dans le devis  
✅ **Compatible** : Rétro-compatibilité avec anciens devis

---

## 🚀 **Prochaines Étapes**

1. ✅ Créer composant BaseCalculationSelector
2. ⏳ Intégrer dans SpecialLinesCreator
3. ⏳ Modifier structure de données
4. ⏳ Implémenter calcul avec baseCalculation
5. ⏳ Tester sur devis existants
6. ⏳ Migration automatique

