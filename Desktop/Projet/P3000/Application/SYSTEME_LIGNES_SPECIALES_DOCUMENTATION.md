# 📊 Documentation - Système de Lignes Spéciales

## 🎯 **Vue d'Ensemble**

Les lignes spéciales permettent d'ajouter des montants calculés dynamiquement ou des informations d'affichage à différents niveaux de hiérarchie du devis :
- **Global** : En fin de devis (après toutes les parties)
- **Partie** : Après chaque partie
- **Sous-partie** : Après chaque sous-partie

---

## 📋 **Types de Lignes Spéciales**

### **1️⃣ Type d'Opération (`type`)**

Chaque ligne spéciale peut être de **3 types** différents :

#### **A) `reduction`** 
- **Fonction** : Soustrait un montant du total
- **Affichage** : `-` devant le montant
- **Calcul** : Montant négatif appliqué au total
- **Exemple** : "Remise commerciale" - 500€

#### **B) `addition`**
- **Fonction** : Ajoute un montant au total
- **Affichage** : `+` implicite (pas de symbole visible)
- **Calcul** : Montant positif appliqué au total
- **Exemple** : "Frais de transport" + 150€

#### **C) `display`**
- **Fonction** : Affichage **uniquement**, ne modifie **pas** les totaux
- **Calcul** : **Aucun impact** sur les calculs
- **Affichage** : Style italique gris, bordure gauche
- **Exemple** : "Montant HT de référence" pour information

---

### **2️⃣ Type de Valeur (`valueType`)**

Chaque ligne peut avoir sa valeur exprimée de **2 façons** :

#### **A) `percentage`**
- **Calcul** : Pourcentage appliqué au montant de base
- **Formule** : `montant = (base_montant × value) / 100`
- **Exemple** : 10% de 1000€ = 100€

#### **B) `fixed`**
- **Calcul** : Montant fixe en euros
- **Formule** : `montant = value`
- **Exemple** : 500€ fixe

---

## 🔢 **Exemples Concrets**

### **Exemple 1 : Remise Commerciale Globale**
```json
{
  "description": "Remise commerciale",
  "value": 10,
  "valueType": "percentage",
  "type": "reduction",
  "isHighlighted": true
}
```
**Résultat** : -10% du total du devis

### **Exemple 2 : Frais de Transport par Partie**
```json
{
  "description": "Frais de transport",
  "value": 250,
  "valueType": "fixed",
  "type": "addition",
  "isHighlighted": false
}
```
**Résultat** : +250€ ajoutés à cette partie

### **Exemple 3 : Information de Référence**
```json
{
  "description": "Montant HT avant remise",
  "value": 5000,
  "valueType": "fixed",
  "type": "display",
  "isHighlighted": false
}
```
**Résultat** : Affichage d'information sans modification du total

### **Exemple 4 : Remise par Sous-partie**
```json
{
  "description": "Remise matériel",
  "value": 5,
  "valueType": "percentage",
  "type": "reduction",
  "isHighlighted": true
}
```
**Résultat** : -5% du montant de cette sous-partie

---

## 🎨 **Styles d'Affichage**

### **Classes CSS**

| Classe | Style | Utilisation |
|--------|-------|-------------|
| `.special-line` | Font: bold 0.9rem | Toutes les lignes spéciales |
| `.highlighted` | Fond jaune, texte rouge | Lignes marquées importantes |
| `.display-only` | Fond gris, bordure gauche | Type `display` uniquement |
| `.display-line` | Italique, texte gris | Texte des lignes `display` |
| `.special-line-spacer` | Hauteur 8px, transparent | Espacement avant la ligne |

### **Rendu Visuel**

#### **Ligne Normale**
```
Remise commerciale                    - 500.00 €
```

#### **Ligne en Évidence (`highlighted`)**
```
[BOLD] Remise commerciale            [BOLD] - 500.00 €
```

#### **Ligne Display**
```
[ITALIC] Montant HT de référence     [ITALIC] 5000.00 €
```

#### **Ligne Display + Highlighted**
```
[BOLD] Montant HT de référence       [BOLD] 5000.00 €
```

---

## 📐 **Calcul des Montants**

### **Ordre de Calcul**

Le calcul est effectué **en cascade** :

```
1. Total des lignes de détails
2. ▼ Appliquer lignes spéciales de la sous-partie
3. Total de la sous-partie
4. ▼ Appliquer lignes spéciales de la partie
5. Total de la partie
6. ▼ Appliquer lignes spéciales globales
7. Total Global HT
```

### **Formules**

#### **Pourcentage**
```javascript
if (valueType === 'percentage') {
    montant = (base_montant × value) / 100;
}
```

#### **Montant Fixe**
```javascript
if (valueType === 'fixed') {
    montant = value;
}
```

#### **Application**
```javascript
if (type === 'reduction') {
    total -= montant;  // Soustraire
} else if (type === 'addition') {
    total += montant;  // Ajouter
}
// 'display' ne fait rien
```

---

## 🗂️ **Structure de Données**

### **Backend (Django)**

```python
# api/models.py - Devis
lignes_speciales = models.JSONField(default=dict, blank=True)
```

**Structure attendue :**
```json
{
    "global": [
        {
            "description": "string",
            "value": float,
            "valueType": "percentage" | "fixed",
            "type": "reduction" | "addition" | "display",
            "isHighlighted": bool
        }
    ],
    "parties": {
        "partie_id_1": [ligne_obj, ligne_obj, ...],
        "partie_id_2": [ligne_obj, ...],
        ...
    },
    "sousParties": {
        "sous_partie_id_1": [ligne_obj, ligne_obj, ...],
        "sous_partie_id_2": [ligne_obj, ...],
        ...
    }
}
```

### **Frontend (React)**

```javascript
// États dans DevisAvance.js
const [special_lines_global, setSpecialLinesGlobal] = useState([]);
const [special_lines_parties, setSpecialLinesParties] = useState({});
const [special_lines_sous_parties, setSpecialLinesSousParties] = useState({});

// Structure d'une ligne
const specialLine = {
    description: "Remise commerciale",
    value: 10,
    valueType: "percentage",
    type: "reduction",
    isHighlighted: true
};
```

---

## 🔄 **Workflow d'Utilisation**

### **1️⃣ Ajouter une Ligne Spéciale**

```
1. Utilisateur clique sur bouton "+ Ajouter ligne spéciale"
2. Modal s'ouvre (SpecialLineModal.js)
3. Utilisateur saisit :
   - Description
   - Type de valeur (% ou €)
   - Valeur numérique
   - Type d'opération (réduction/addition/display)
   - Option : Mise en évidence
4. Clic sur "Sauvegarder"
5. Ligne ajoutée dans l'état React
6. Calculs mis à jour en temps réel
```

### **2️⃣ Éditer une Ligne Spéciale**

```
1. Hover sur la ligne → Icônes apparaissent
2. Clic sur icône "Éditer"
3. Modal s'ouvre pré-rempli
4. Modifications
5. Sauvegarde
6. Recalcul automatique
```

### **3️⃣ Supprimer une Ligne Spéciale**

```
1. Hover sur la ligne → Icônes apparaissent
2. Clic sur icône "X"
3. Confirmation (optionnel)
4. Ligne supprimée
5. Recalcul automatique
```

---

## 📍 **Niveaux d'Application**

### **Global**
- **Position** : En fin de devis, après toutes les parties
- **Base de calcul** : Total de toutes les parties
- **Cas d'usage** : Remise globale, frais généraux

### **Partie**
- **Position** : Après une partie complète
- **Base de calcul** : Total de cette partie
- **Cas d'usage** : Frais spécifiques par domaine

### **Sous-partie**
- **Position** : Après une sous-partie
- **Base de calcul** : Total de cette sous-partie
- **Cas d'usage** : Remise matériel, majoration chantier

---

## 🧪 **Cas de Test**

### **Test 1 : Réduction en Pourcentage**
**Entrée** : Devis de 1000€ + Réduction 10%
**Attendu** : Total = 900€

### **Test 2 : Addition Fixe**
**Entrée** : Partie 500€ + Frais transport 100€
**Attendu** : Total partie = 600€

### **Test 3 : Display Sans Impact**
**Entrée** : Total 1000€ + Ligne display 2000€
**Attendu** : Total reste 1000€

### **Test 4 : Combinaison**
**Entrée** : 
- Partie 1000€
- Réduction 10% (-100€)
- Frais 50€
**Attendu** : Total = 950€

### **Test 5 : Cascading**
**Entrée** :
- Sous-partie 500€
  - Remise 5% (-25€)
- Partie incluant 2 sous-parties = 1000€
  - Remise globale 10% (-100€)
**Attendu** : Total = 900€

---

## ⚠️ **Points d'Attention**

1. **Calculs en cascade** : Les lignes spéciales s'appliquent **après** les lignes normales
2. **Type display** : **JAMAIS** de modification des totaux
3. **Pourcentages** : Toujours calculés sur le montant **avant** application
4. **Validation** : Vérifier que `value > 0` avant sauvegarde
5. **Ordre** : L'ordre des lignes spéciales peut impacter le résultat si pourcentages multiples

---

## 🔧 **Endpoints API**

### **GET `/api/calculate_special_lines/<devis_id>/`**
Retourne le calcul de toutes les lignes spéciales d'un devis.

**Réponse :**
```json
{
    "results": {
        "global": {
            "lines": [ligne_obj, ...],
            "total": 0.00
        },
        "parties": {
            "partie_id": {
                "lines": [ligne_obj, ...],
                "total": 0.00
            }
        },
        "sous_parties": {
            "sous_partie_id": {
                "lines": [ligne_obj, ...],
                "total": 0.00
            }
        }
    },
    "total_general": 0.00
}
```

---

## 📝 **Résumé**

| Attribut | Valeurs Possibles | Description |
|----------|-------------------|-------------|
| `description` | string | Libellé de la ligne |
| `value` | float | Valeur numérique |
| `valueType` | `percentage`, `fixed` | Type de calcul |
| `type` | `reduction`, `addition`, `display` | Impact sur le total |
| `isHighlighted` | bool | Mise en évidence visuelle |

**Cas d'usage principaux :**
- ✅ Remises commerciales
- ✅ Frais de transport
- ✅ Majorations chantier
- ✅ Informations de référence
- ✅ Conditions particulières

