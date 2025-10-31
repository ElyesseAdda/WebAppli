# 📋 Workflow - Système de Lignes Spéciales dans DevisAvance.js

## 🎯 **Vue d'Ensemble**

Les lignes spéciales permettent d'ajouter des montants supplémentaires (réductions, additions) ou des informations de type "Affichage uniquement" à différents niveaux du devis :
- **Global** : En fin de devis (avant le montant total HT)
- **Partie** : Après chaque partie
- **Sous-partie** : Après chaque sous-partie

---

## 📊 **Structure de Données Actuelle**

### **Backend (Django)**
```python
# api/models.py - Devis
lignes_speciales = models.JSONField(default=dict, blank=True)

# Structure attendue :
{
    'global': [
        {
            'description': str,
            'value': float,
            'valueType': 'percentage' | 'fixed',
            'type': 'reduction' | 'addition' | 'display',
            'isHighlighted': bool
        }
    ],
    'parties': {
        'partie_id_1': [ligne_obj, ligne_obj, ...],
        'partie_id_2': [ligne_obj, ...],
        ...
    },
    'sousParties': {
        'sous_partie_id_1': [ligne_obj, ligne_obj, ...],
        'sous_partie_id_2': [ligne_obj, ...],
        ...
    }
}
```

### **Frontend (React)**
```javascript
// Dans DevisAvance.js
const [special_lines_global, setSpecialLinesGlobal] = useState([]); // ❌ N'utilise que 'global'

// Les parties et sous-parties DEVRAIENT avoir :
partie.special_lines = []
sousPartie.special_lines = []
```

---

## 🔍 **Analyse du Système Actuel**

### ✅ **Ce qui Fonctionne**
1. **Modal** : `SpecialLineModal.js` existe et propose :
   - Description
   - Type de valeur (pourcentage / montant fixe)
   - Type d'opération (réduction / addition / affichage)
   - Mise en évidence

2. **Affichage** : Dans `DevisTable.js` ligne 1258-1273
   - Les lignes globales s'affichent
   - Styling avec `highlighted` et `display-only`

3. **Backend API** : `calculate_special_lines` dans `api/views.py`
   - Calcule les montants
   - Gère les pourcentages et fixes

### ❌ **Ce qui NE Fonctionne PAS**

1. **Dans DevisAvance.js** :
   - ❌ Pas de gestion des lignes spéciales pour parties/sous-parties
   - ❌ `special_lines_global` est initialisé à `[]` et jamais mis à jour
   - ❌ Pas d'handlers pour ajouter/éditer/supprimer les lignes spéciales

2. **Dans DevisTable.js** :
   - ❌ Affiche uniquement les lignes globales
   - ❌ Pas de rendu des lignes pour parties/sous-parties
   - ❌ Pas de boutons "+" pour ajouter des lignes spéciales

3. **Structure de données** :
   - ❌ Les parties/sous-parties ne stockent pas leurs `special_lines`
   - ❌ Les calculs de totaux ne prennent pas en compte les lignes spéciales locales

---

## 🎨 **Fonctionnement dans CreationDevis.js et ModificationDevis.js**

Ces composants ANCIENS ont la gestion complète :

### **Gestion d'État**
```javascript
const [special_lines_global, setSpecialLinesGlobal] = useState([]);
const [special_lines_parties, setSpecialLinesParties] = useState({});
const [special_lines_sous_parties, setSpecialLinesSousParties] = useState({});
```

### **Handlers**
```javascript
handleAddSpecialLine = (target) => {
  // target = { type: 'global' | 'partie' | 'sousPartie', id: string }
  setCurrentSpecialLineTarget(target);
  setOpenSpecialLineModal(true);
}

handleSpecialLineSave = (lineData) => {
  // Sauvegarde selon le target
  if (target.type === 'global') {
    setSpecialLinesGlobal([...prev, newLine]);
  } else if (target.type === 'partie') {
    setSpecialLinesParties({...prev, [id]: [...lines, newLine]});
  }
}
```

### **Affichage dans le Tableau**
```html
<!-- Dans preview_devis.html -->
{% for special_line in partie.special_lines %}
  <tr class="special-line">
    <td>{{ special_line.description }}</td>
    <td>{{ special_line.montant }}</td>
  </tr>
{% endfor %}
```

---

## 🚀 **Workflow Proposé pour DevisAvance.js**

### **Phase 1 : Structure de Données**

#### **1.1 États dans DevisAvance.js**
```javascript
// Lignes globales (existe déjà mais vide)
const [special_lines_global, setSpecialLinesGlobal] = useState([]);

// Lignes pour chaque partie
const [special_lines_parties, setSpecialLinesParties] = useState({});

// Lignes pour chaque sous-partie
const [special_lines_sous_parties, setSpecialLinesSousParties] = useState({});

// États pour le modal
const [openSpecialLineModal, setOpenSpecialLineModal] = useState(false);
const [currentSpecialLineTarget, setCurrentSpecialLineTarget] = useState(null);
```

#### **1.2 Ajouter special_lines aux Parties/Sous-parties**
```javascript
// Quand on crée/sélectionne une partie
const newPartie = {
  id: partie.id,
  titre: partie.titre,
  domaine: partie.type,
  special_lines: [], // ✅ Ajouter ce champ
  sous_parties: [],
  // ...
};
```

### **Phase 2 : Handlers de Gestion**

#### **2.1 Ajouter une Ligne Spéciale**
```javascript
const handleAddSpecialLine = (target) => {
  // target = { type: 'global' | 'partie' | 'sousPartie', id: string }
  setCurrentSpecialLineTarget(target);
  setOpenSpecialLineModal(true);
};

const handleSpecialLineSave = (lineData) => {
  const target = currentSpecialLineTarget;
  
  const newLine = {
    description: lineData.description,
    value: parseFloat(lineData.value),
    valueType: lineData.valueType,
    type: lineData.type,
    isHighlighted: lineData.isHighlighted || false,
  };

  if (target.type === "global") {
    setSpecialLinesGlobal(prev => [...prev, newLine]);
  } else if (target.type === "partie") {
    setSpecialLinesParties(prev => ({
      ...prev,
      [target.id]: [...(prev[target.id] || []), newLine]
    }));
  } else if (target.type === "sousPartie") {
    setSpecialLinesSousParties(prev => ({
      ...prev,
      [target.id]: [...(prev[target.id] || []), newLine]
    }));
  }
  
  setOpenSpecialLineModal(false);
};
```

#### **2.2 Éditer une Ligne Spéciale**
```javascript
const handleEditSpecialLine = (target, index) => {
  // Récupérer la ligne existante
  let existingLine;
  if (target.type === 'global') {
    existingLine = special_lines_global[index];
  } else if (target.type === 'partie') {
    existingLine = special_lines_parties[target.id][index];
  } else {
    existingLine = special_lines_sous_parties[target.id][index];
  }
  
  // Pré-remplir le modal
  setCurrentSpecialLineTarget({...target, index});
  setOpenSpecialLineModal(true);
};

const handleSpecialLineUpdate = (lineData, target) => {
  if (target.type === 'global') {
    const updated = [...special_lines_global];
    updated[target.index] = lineData;
    setSpecialLinesGlobal(updated);
  }
  // Même logique pour parties et sous-parties
};
```

#### **2.3 Supprimer une Ligne Spéciale**
```javascript
const handleRemoveSpecialLine = (target, index) => {
  if (target.type === 'global') {
    setSpecialLinesGlobal(prev => prev.filter((_, i) => i !== index));
  } else if (target.type === 'partie') {
    setSpecialLinesParties(prev => ({
      ...prev,
      [target.id]: prev[target.id].filter((_, i) => i !== index)
    }));
  }
  // Même logique pour sous-parties
};
```

### **Phase 3 : Calcul des Montants**

#### **3.1 Calculer le Montant d'une Ligne**
```javascript
const calculateSpecialLineAmount = (specialLine, baseAmount) => {
  let montant = 0;
  
  // Calculer selon valueType
  if (specialLine.valueType === 'percentage') {
    montant = (baseAmount * specialLine.value) / 100;
  } else {
    montant = specialLine.value;
  }
  
  // Appliquer le signe selon le type
  if (specialLine.type === 'reduction') {
    montant = -montant;
  } else if (specialLine.type === 'addition') {
    montant = +montant;
  }
  // 'display' ne modifie pas le total
  
  return montant;
};
```

#### **3.2 Calculer les Totaux avec Lignes Spéciales**

```javascript
const calculateSousPartieTotal = (sousPartie) => {
  // Total des lignes de détails
  let total = sousPartie.selectedLignesDetails.reduce((sum, ld) => {
    return sum + (calculatePrice(ld) * parseFloat(ld.quantity || 0));
  }, 0);
  
  // Ajouter les lignes spéciales de la sous-partie
  const specialLines = special_lines_sous_parties[sousPartie.id] || [];
  specialLines.forEach(line => {
    if (line.type !== 'display') {
      total += calculateSpecialLineAmount(line, total);
    }
  });
  
  return total;
};

const calculatePartieTotal = (partie) => {
  // Total des sous-parties
  let total = partie.selectedSousParties.reduce((sum, sp) => {
    return sum + calculateSousPartieTotal(sp);
  }, 0);
  
  // Ajouter les lignes spéciales de la partie
  const specialLines = special_lines_parties[partie.id] || [];
  specialLines.forEach(line => {
    if (line.type !== 'display') {
      total += calculateSpecialLineAmount(line, total);
    }
  });
  
  return total;
};

const calculateGlobalTotal = () => {
  // Total de toutes les parties
  let total = selectedParties.reduce((sum, partie) => {
    return sum + calculatePartieTotal(partie);
  }, 0);
  
  // Ajouter les lignes spéciales globales
  special_lines_global.forEach(line => {
    if (line.type !== 'display') {
      total += calculateSpecialLineAmount(line, total);
    }
  });
  
  return total;
};
```

### **Phase 4 : Affichage dans DevisTable.js**

#### **4.1 Rendre les Lignes Spéciales de Parties**
```javascript
// Dans le rendu de chaque partie, après le titre
{special_lines_parties[partie.id]?.map((line, index) => (
  <tr key={index} className="special-line">
    <td colSpan="4">{line.description}</td>
    <td>
      {line.type === 'reduction' && '-'}
      {formatMontantEspace(calculateSpecialLineAmount(line, partieTotal))}
    </td>
  </tr>
))}
```

#### **4.2 Rendre les Lignes Spéciales de Sous-parties**
```javascript
// Dans le rendu de chaque sous-partie, après le titre
{special_lines_sous_parties[sousPartie.id]?.map((line, index) => (
  <tr key={index} className="special-line">
    <td colSpan="4">{line.description}</td>
    <td>
      {line.type === 'reduction' && '-'}
      {formatMontantEspace(calculateSpecialLineAmount(line, sousPartieTotal))}
    </td>
  </tr>
))}
```

#### **4.3 Ajouter les Boutons "+" pour Créer des Lignes**
```javascript
// Après chaque partie/sous-partie
<button onClick={() => handleAddSpecialLine({ type: 'partie', id: partie.id })}>
  + Ajouter une ligne spéciale
</button>
```

### **Phase 5 : Panneaux Hover pour Édition/Suppression**

#### **5.1 Similaire aux LigneDetails**
```javascript
// Dans le rendu de chaque ligne spéciale
{hoveredSpecialLineId === line.id && createPortal(
  <div style={{ /* style du panneau hover */ }}>
    <IconButton onClick={() => handleEditSpecialLine(target, index)}>
      <EditIcon />
    </IconButton>
    <IconButton onClick={() => handleRemoveSpecialLine(target, index)}>
      <FiX />
    </IconButton>
  </div>,
  document.body
)}
```

---

## 🎯 **Ordre d'Implémentation**

### **Étape 1 : Préparation**
1. Créer les états dans `DevisAvance.js`
2. Importer et configurer `SpecialLineModal`
3. Ajouter le champ `special_lines: []` aux parties/sous-parties

### **Étape 2 : Handlers de Base**
1. `handleAddSpecialLine`
2. `handleSpecialLineSave`
3. `handleEditSpecialLine`
4. `handleRemoveSpecialLine`

### **Étape 3 : Calculs**
1. `calculateSpecialLineAmount`
2. Modifier `calculateSousPartieTotal`
3. Modifier `calculatePartieTotal`
4. Modifier le calcul global

### **Étape 4 : Affichage**
1. Passer les props à `DevisTable.js`
2. Rendre les lignes spéciales dans le tableau
3. Ajouter les boutons "+"

### **Étape 5 : Hover Panels**
1. Ajouter les états hover pour les lignes spéciales
2. Créer les portals avec Edit/Remove
3. Animer les transitions

### **Étape 6 : Sauvegarde**
1. Préparer le payload pour l'API
2. Sauvegarder dans `lignes_speciales`
3. Charger depuis la base de données

---

## 🔒 **Points d'Attention**

1. **Calcul en cascade** : Les lignes spéciales doivent être calculées APRÈS les lignes normales
2. **Pourcentages** : Un pourcentage de 10% sur un total de 100€ = 10€ d'addition OU -10€ de réduction
3. **Type display** : Les lignes "display" ne modifient JAMAIS les totaux
4. **Performance** : Éviter les re-renders inutiles avec `React.memo` si nécessaire
5. **Validation** : Vérifier que les valeurs sont valides avant sauvegarde

---

## 📝 **Questions à Clarifier**

1. **Ordre d'affichage** : Les lignes spéciales doivent-elles pouvoir être réordonnées (drag & drop) ?
2. **Mise en évidence** : Quels styles appliquer pour `isHighlighted` ?
3. **Limites** : Y a-t-il un nombre max de lignes spéciales par niveau ?
4. **Conversion** : Faut-il pouvoir changer une ligne de "fixed" à "percentage" après création ?
5. **Historique** : Faut-il garder un historique des modifications des lignes spéciales ?

---

## 🎉 **Résultat Final Attendu**

Un système complet permettant :
- ✅ D'ajouter des lignes spéciales à tous les niveaux
- ✅ De les éditer et supprimer facilement
- ✅ De voir les montants calculer en temps réel
- ✅ D'afficher les lignes dans le tableau du devis
- ✅ De sauvegarder et charger depuis la base de données
- ✅ D'avoir une interface cohérente avec les hover panels

