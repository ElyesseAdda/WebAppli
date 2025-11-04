# 🎨 Exemples de Placement Lignes Spéciales

## ✅ **OUI, TOUS LES PLACEMENTS SONT POSSIBLES !**

---

## 📊 **EXEMPLES CONCRETS**

### **Exemple 1 : Entre deux parties**

```
INDEX GLOBAL | ELEMENT                | NUMÉRO
-------------+------------------------+--------
     1       | Partie: Peinture       | 1
     2       | Sous-partie: Intérieur | 1.1
     3       | Ligne détail: Mur      | 1.1.1
     4       | 🟦 REMISE 10%         | 1.1.2    ← ICI !
     5       | Sous-partie: Extérieur | 1.2
     6       | Ligne détail: Façade   | 1.2.1
     7       | 🟦 FRAIS TECHNIQUE    | 1.2.2    ← ICI !
     8       | Partie: Plomberie     | 2
     9       | 🟦 TAXE               | 2.1      ← ICI !
     10      | Sous-partie: Salle bain| 2.2
```

✅ **Lignes spéciales peuvent s'insérer** :
- Avant une partie
- Après une partie
- Entre deux parties
- Dans une sous-partie
- Entre deux sous-parties
- Entre deux lignes détails

---

### **Exemple 2 : Au tout début**

```
INDEX GLOBAL | ELEMENT                | NUMÉRO
-------------+------------------------+--------
     1       | 🟦 REMISE OUVRAGE     | 0        ← ICI !
     2       | Partie: Peinture       | 1
     3       | Partie: Plomberie     | 2
```

✅ **Ligne spéciale avant tout** : `index_global = 1`

---

### **Exemple 3 : Au milieu d'une hiérarchie**

```
INDEX GLOBAL | ELEMENT                | NUMÉRO
-------------+------------------------+--------
     1       | Partie: Peinture       | 1
     2       | Sous-partie: Intérieur | 1.1
     3       | Ligne détail: Mur      | 1.1.1
     4       | 🟦 REMISE CLIENT      | 1.1.2    ← ICI !
     5       | Ligne détail: Plafond  | 1.1.3
     6       | Sous-partie: Extérieur | 1.2
```

✅ **Ligne spéciale entre deux lignes détails** : `index_global = 4`

---

### **Exemple 4 : À la fin**

```
INDEX GLOBAL | ELEMENT                | NUMÉRO
-------------+------------------------+--------
     1       | Partie: Peinture       | 1
     2       | Partie: Plomberie     | 2
     3       | Partie: Électricité   | 3
     4       | 🟦 TOTAL TTC          | 3.1      ← ICI !
```

✅ **Ligne spéciale en fin de devis** : `index_global = 4`

---

### **Exemple 5 : Après chaque ligne détail**

```
INDEX GLOBAL | ELEMENT                | NUMÉRO
-------------+------------------------+--------
     1       | Partie: Peinture       | 1
     2       | Sous-partie: Intérieur | 1.1
     3       | Ligne détail: Mur      | 1.1.1
     4       | 🟦 +5% Urgence        | 1.1.2    ← ICI !
     5       | Ligne détail: Plafond  | 1.1.3
     6       | 🟦 +5% Urgence        | 1.1.4    ← ICI !
```

✅ **Même ligne spéciale répétée** : Possible !

---

## 🔄 **COMMENT ÇA MARCHE**

### **Algorithme de Génération de Numéro**

Pour une ligne spéciale à `index_global = 4` dans l'exemple 1 :

```javascript
// Trouver l'élément précédent
prev_item = { type: 'ligne_detail', numero: '1.1.1', index_global: 3 }

// Déterminer la profondeur
// Si le précédent est une ligne_détail, continuer sa hiérarchie
// Si le précédent est une sous-partie, créer une nouvelle profondeur
// etc.

numero = generateNumero(item, all_items)

// Résultat : "1.1.2" (continue après 1.1.1)
```

---

## 🎯 **RÈGLES DE NUMÉROTATION**

### **Pour les Lignes Spéciales**

1. **Si placée après une partie** :
   - Numéro = `{partie.numero}.1`

2. **Si placée après une sous-partie** :
   - Numéro = `{partie.numero}.{sous_partie.numero}.1`

3. **Si placée après une ligne détail** :
   - Numéro = `{ligne_detail.numero} + 1` (incrémenter)

4. **Si placée avant tout** :
   - Numéro = `0` ou `0.1`

---

## ✅ **RÉSUMÉ**

| Position | Possible ? | Numérotation |
|----------|-----------|--------------|
| Avant tout | ✅ OUI | 0 ou 0.1 |
| Entre parties | ✅ OUI | Auto |
| Après une partie | ✅ OUI | {partie}.1 |
| Dans une sous-partie | ✅ OUI | Auto |
| Entre lignes détails | ✅ OUI | Incrément |
| À la fin | ✅ OUI | Auto |

---

**CONCLUSION** : Avec l'index global, **vous pouvez placer les lignes spéciales EXACTEMENT où vous voulez !** 🎉

**Un seul mécanisme** : `index_global` définit la position, le numéro suit automatiquement.

