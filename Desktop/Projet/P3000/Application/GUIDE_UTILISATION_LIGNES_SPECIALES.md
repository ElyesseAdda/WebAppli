# 📘 Guide d'Utilisation - Lignes Spéciales

## 🎯 Vue d'ensemble

Les lignes spéciales permettent d'ajouter des éléments personnalisés dans votre devis :
- ✅ **Réductions** (ex: -10%)
- ✅ **Additions** (ex: Frais de déplacement)
- ✅ **Affichages** (ex: Notes, séparateurs)

---

## 🔧 Système de Placement

### **Méthode unique : PlacementZone (zones cliquables)**

Lorsqu'une ligne spéciale est créée ou déplacée, des **zones de placement** apparaissent dans le tableau :

```
┌─────────────────────────────────────┐
│ ⬜ Cliquer ici pour placer (Début)  │  ← Zone globale
├─────────────────────────────────────┤
│ Partie A                            │
│   ⬜ Cliquer ici pour placer        │  ← Zone de partie
│   Sous-partie 1.1                   │
│     ⬜ Cliquer ici pour placer      │  ← Zone de sous-partie
│     Ligne 1                         │
│     ⬜ Cliquer ici pour placer      │  ← Entre lignes
│     Ligne 2                         │
├─────────────────────────────────────┤
│ ⬜ Cliquer ici pour placer (Fin)    │  ← Zone globale
└─────────────────────────────────────┘
```

**Avantages :**
- 🎯 **Précis** : Placement exact où vous voulez
- 👁️ **Visuel** : Effet glassmorphisme pour voir où vous placez
- 🔄 **Flexible** : Le context_type se calcule automatiquement

---

## 📝 Créer une Ligne Spéciale

### Étape 1 : Ouvrir le modal de création
Cliquez sur le bouton **"+ Créer ligne spéciale"** en bas à droite de l'écran.

### Étape 2 : Configurer la ligne
1. **Description** : Le texte qui apparaîtra dans le devis
2. **Type** : Réduction, Addition ou Affichage
3. **Valeur** : Montant fixe (€) ou Pourcentage (%)
4. **Styles** : Couleurs, police, alignement (optionnel)

### Étape 3 : Placer la ligne
- Des zones de placement apparaissent dans le tableau
- **Cliquez sur une zone** pour y placer la ligne
- La ligne adopte automatiquement le bon contexte

**Exemple :**
```
Si vous cliquez entre deux sous-parties :
→ context_type = 'partie'
→ La ligne sera liée à la partie

Si vous cliquez entre deux lignes détails :
→ context_type = 'sous_partie'
→ La ligne sera liée à la sous-partie
```

---

## 🔄 Déplacer une Ligne Spéciale

### Méthode : Bouton "Déplacer"

1. **Hover** sur la ligne spéciale dans le tableau
2. Une barre d'icônes apparaît à droite
3. **Cliquez sur l'icône "↕" (Déplacer)**
4. Les zones de placement réapparaissent
5. **Cliquez sur la nouvelle position**

**Changement de contexte automatique :**
```
Ligne initialement dans une partie (context_type='partie')
↓
Déplacer entre deux lignes détails
↓
Devient automatiquement context_type='sous_partie'
```

---

## ✏️ Éditer une Ligne Spéciale

1. **Hover** sur la ligne spéciale
2. **Cliquez sur l'icône "✏️" (Éditer)**
3. Modifiez les propriétés dans le modal
4. **Sauvegardez**

**Propriétés modifiables :**
- Description
- Valeur (montant ou pourcentage)
- Type (réduction/addition/affichage)
- Styles (couleurs, police, etc.)

---

## 🗑️ Supprimer une Ligne Spéciale

1. **Hover** sur la ligne spéciale
2. **Cliquez sur l'icône "❌" (Supprimer)**
3. **Confirmez** la suppression

---

## 🎨 Types de Lignes Spéciales

### 1. **Réduction** (type: 'reduction')
Soustrait un montant du total

**Exemples :**
- Remise commerciale : -10%
- Rabais : -500 €
- Geste commercial : -5%

**Affichage :** Montant en **rouge** avec signe **"-"**

---

### 2. **Addition** (type: 'addition')
Ajoute un montant au total

**Exemples :**
- Frais de déplacement : +150 €
- Supplément urgence : +20%
- Frais de dossier : +80 €

**Affichage :** Montant en **bleu** avec signe **"+"**

---

### 3. **Affichage** (type: 'display')
Affiche une information sans modifier le total

**Exemples :**
- Note : "Peinture garantie 10 ans"
- Séparateur de section
- Avertissement : "Acompte de 30% requis"

**Affichage :** Montant en **gris** sans signe

---

## 💡 Types de Valeurs

### **Montant Fixe** (value_type: 'fixed')
```
Exemple : 500 €
Calcul : Toujours 500 €, quelle que soit la base
```

### **Pourcentage** (value_type: 'percentage')
```
Exemple : 10% sur Partie A
Calcul : 
  - Partie A = 5000 €
  - Ligne spéciale = 5000 × 10% = 500 €
  - Si Partie A change → la ligne se recalcule automatiquement
```

**Sélection de la base (pour %) :**
- Après avoir choisi "pourcentage", vous devez sélectionner la base de calcul
- Cliquez sur une partie, sous-partie ou "Total global"
- Le calcul sera dynamique (mis à jour en temps réel)

---

## 🏗️ Contextes des Lignes Spéciales

### **Context_type : 'global'**
La ligne est placée **entre les parties**

**Position :** Début du devis, fin, ou entre deux parties  
**Comportement drag & drop :** Reste **fixe**, ne bouge jamais  
**Index type :** 0.5, 1.5, 2.5...

**Exemple :**
```
Ligne spéciale (global, 0.5) - "Remise exceptionnelle -10%"
Partie A (1)
Partie B (2)

→ Si vous drag Partie A après Partie B :
   Ligne spéciale reste à 0.5 ✅
```

---

### **Context_type : 'partie'**
La ligne est placée **dans une partie** (entre sous-parties)

**Position :** Début de partie, entre SP, fin de partie  
**Comportement drag & drop :** **Suit la partie**  
**Index type :** 1.05, 1.15, 1.25...

**Exemple :**
```
Partie A (1)
  SP 1.1
  Ligne spéciale (partie:A, 1.15) - "Frais matériel +5%"
  SP 1.2

→ Si vous drag Partie A en position 2 :
   Partie A devient (2)
   Ligne spéciale devient (2.15) ✅ (suit la partie !)
```

---

### **Context_type : 'sous_partie'**
La ligne est placée **dans une sous-partie** (entre lignes détails)

**Position :** Entre lignes de détail  
**Comportement drag & drop :** **Suit la sous-partie**  
**Index type :** 1.105, 1.205, 1.215...

**Exemple :**
```
Partie A (1)
  SP 1.1 (1.1)
    Ligne 1 (1.101)
    Ligne spéciale (sous_partie:1.1, 1.105) - "Rabais quantité -15%"
    Ligne 2 (1.102)

→ Si vous drag SP 1.1 pour qu'elle devienne SP 1.2 :
   SP devient (1.2)
   Ligne spéciale devient (1.205) ✅ (suit la SP !)
```

---

## 🎮 Comportement lors du Drag & Drop

### **Règle 1 : Lignes globales = FIXES**
```
Avant :
  Ligne spéciale (global, 0.5)
  Partie A (1)
  Partie B (2)

Après drag Partie A → position 2 :
  Ligne spéciale (global, 0.5) ← RESTE FIXE !
  Partie B (1)
  Partie A (2)
```

### **Règle 2 : Lignes de partie = SUIVENT**
```
Avant :
  Partie A (1)
    Ligne spéciale (partie:A, 1.15)
  Partie B (2)

Après drag Partie A → position 2 :
  Partie B (1)
  Partie A (2)
    Ligne spéciale (partie:A, 2.15) ← SUIT !
```

### **Règle 3 : Lignes de sous-partie = SUIVENT**
```
Avant :
  Partie A (1)
    SP 1.1
      Ligne spéciale (sous_partie:1.1, 1.105)
    SP 1.2

Après drag SP 1.1 → position 1.2 :
  Partie A (1)
    SP 1.2 (était 1.1)
      Ligne spéciale (sous_partie:1.2, 1.205) ← SUIT !
    SP 1.1 (était 1.2)
```

---

## 🧮 Calculs Dynamiques

### **Lignes avec pourcentage**

Les lignes spéciales en pourcentage sont **recalculées automatiquement** :

```
Partie A = 5000 €
Ligne spéciale : "Remise -10%" sur Partie A

Calcul initial : 5000 × 10% = 500 €

→ Si vous modifiez une quantité dans Partie A :
   Partie A devient 6000 €
   Ligne spéciale recalcule : 6000 × 10% = 600 € ✅
```

**Base de calcul :**
- **Partie** : Somme de toutes les sous-parties
- **Sous-partie** : Somme de toutes les lignes détails
- **Total global** : Somme de toutes les parties

---

## ⚠️ Limitations et Conseils

### **Limitations**

1. **Pas de drag & drop libre**
   - Les lignes spéciales ne sont PAS draggables
   - Utiliser le bouton "Déplacer" à la place

2. **Context_type automatique**
   - Le contexte est calculé selon la position cliquée
   - Pas de choix manuel du contexte

3. **Une seule base pour les %**
   - Une ligne en % ne peut avoir qu'une seule base de calcul
   - Pas de calculs composites (ex: Partie A + Partie B)

### **Bonnes Pratiques**

✅ **DO :**
- Placer les réductions globales au début ou à la fin
- Grouper les lignes spéciales par contexte
- Utiliser des descriptions claires
- Tester le calcul après création (vérifier le montant)

❌ **DON'T :**
- Ne pas créer trop de lignes spéciales (max 5-10 par devis)
- Ne pas utiliser des pourcentages négatifs (utiliser le type "réduction")
- Ne pas placer des lignes spéciales n'importe où (respecter la logique)

---

## 🔍 Dépannage

### **Problème : La ligne apparaît à double**
**Cause :** Bug lors du déplacement  
**Solution :** 
1. Supprimer les doublons manuellement
2. Rafraîchir la page
3. Vérifier la console pour des erreurs

### **Problème : La ligne ne se déplace pas**
**Cause :** Handler non connecté ou erreur JS  
**Solution :**
1. Ouvrir la console (F12)
2. Cliquer sur "Déplacer"
3. Vérifier le log : `🔄 Démarrage du déplacement de la ligne`
4. Cliquer sur une position
5. Vérifier le log : `📍 Placement de la ligne`

### **Problème : Le calcul % est incorrect**
**Cause :** Base de calcul mal sélectionnée  
**Solution :**
1. Éditer la ligne spéciale
2. Vérifier la base de calcul (partie, sous-partie, global)
3. Sauvegarder
4. Vérifier que le montant se recalcule

### **Problème : Ligne globale bouge lors du drag**
**Cause :** Bug corrigé dans la Phase 1  
**Solution :**
- Si le problème persiste, vérifier la console
- La ligne doit avoir `context_type: 'global'`
- Son index doit rester fixe (ex: 0.5 ne doit jamais changer)

---

## 📊 Index Hiérarchiques (Technique)

Pour les développeurs qui veulent comprendre le système :

| Élément | Format index | Exemple | Explication |
|---------|--------------|---------|-------------|
| Partie | `X` | `1, 2, 3` | Entier simple |
| Sous-partie | `X.Y` | `1.1, 1.2, 2.1` | Partie + décimale |
| Ligne détail | `X.YZZ` | `1.101, 1.202` | Sous-partie + centièmes |
| **Ligne spéciale (global)** | `X.5` | `0.5, 1.5, 2.5` | Entre parties |
| **Ligne spéciale (partie)** | `X.Y5` | `1.05, 1.15` | Entre sous-parties |
| **Ligne spéciale (sous-partie)** | `X.YZ5` | `1.105, 1.205` | Entre lignes |

**Règle clé :** Les incréments intermédiaires (0.5, 0.05, 0.005) permettent d'insérer des lignes **sans décaler** les autres éléments.

---

## ✅ Checklist de Validation

Avant de sauvegarder votre devis, vérifiez :

- [ ] Toutes les lignes spéciales sont au bon endroit
- [ ] Les montants calculés sont corrects
- [ ] Les lignes en % ont une base de calcul valide
- [ ] Pas de lignes dupliquées
- [ ] Le total global est cohérent
- [ ] Pas d'erreurs dans la console (F12)

---

## 📞 Support

**Problèmes persistants ?**
1. Vérifier la console (F12)
2. Noter les messages d'erreur
3. Tester dans un nouveau devis (pour isoler le problème)

**Logs utiles dans la console :**
- `🔄 === SYNCHRONISATION ===` : Conversion selectedParties → devisItems
- `🎯 === DRAG END ===` : Déplacement d'éléments
- `📍 Placement de la ligne` : Placement d'une ligne spéciale
- `✅ Toutes les lignes spéciales préservées` : Validation OK

---

**Version du système :** 2.0 (Hiérarchique)  
**Date de mise à jour :** 2025-01-XX  
**Statut :** ✅ Prêt pour utilisation

