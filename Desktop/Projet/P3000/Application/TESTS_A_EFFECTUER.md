# 🧪 Tests à Effectuer - Lignes Spéciales

## ⚡ Tests Rapides (5 minutes)

### ✅ Test 1 : Ligne globale fixe
```
1. Ouvrir la console (F12)
2. Créer une ligne spéciale globale au début
3. Drag une partie
4. Vérifier console : "📊 Lignes spéciales après drag: [{index: 0.5}]"
5. ✅ L'index doit rester 0.5
```

### ✅ Test 2 : Déplacement fonctionne
```
1. Créer une ligne dans une partie
2. Cliquer sur bouton "Déplacer" (↕)
3. Console : "🔄 Démarrage du déplacement de la ligne"
4. Cliquer sur une nouvelle position
5. Console : "📍 Placement de la ligne... isMoving: true"
6. ✅ La ligne doit apparaître à la nouvelle position (pas de doublon)
```

### ✅ Test 3 : Index hiérarchiques préservés
```
1. Créer Partie A (index 1)
   - SP 1.1 (index 1.1)
     - Ligne 1 (index 1.101)
     - Ligne 2 (index 1.102)
2. Drag Partie A après une autre partie
3. Console : "📊 Parties après drag: [{id: ..., index: 2}]"
4. ✅ Vérifier que SP devient 2.1 et lignes 2.101, 2.102
```

---

## 🔍 Messages Console Attendus

### **Au chargement de la page**
```
🔄 === SYNCHRONISATION selectedParties → devisItems ===
📊 selectedParties: 0 parties
📊 Aucune partie sélectionnée...
✅ === FIN SYNCHRONISATION ===
```

### **Lors d'un drag de partie**
```
🎯 === DRAG END ===
📦 === DRAG DE PARTIE ===
📊 Parties après drag: [...]
📊 Lignes spéciales après drag: [...]
🔄 === SYNCHRONISATION selectedParties → devisItems ===
✅ Toutes les lignes spéciales préservées
✅ === FIN SYNCHRONISATION ===
```

### **Lors du déplacement d'une ligne**
```
🔄 Démarrage du déplacement de la ligne: {id: ..., context_type: ...}
📍 Placement de la ligne à la position: "after_ligne_..."
🔄 Déplacement détecté - Suppression de la ligne originale ID: ...
📊 Items après suppression: 15 items
✅ Création de la ligne à la nouvelle position: {...}
📋 Nombre total d'items après placement: 16
```

---

## ⚠️ Messages d'Erreur à Surveiller

### **❌ ALERTE : Perte de lignes spéciales**
```
❌ ALERTE : Perte de lignes spéciales ! {
  avant: 3,
  après: 2,
  perdues: [...]
}
```
**Action :** Contactez le développeur, problème de synchronisation

### **❌ Index non conformes détectés**
```
⚠️ Index non conformes détectés: [
  {type: 'partie', id: 10, index: 1.5, raison: 'doit être entier'}
]
```
**Action :** Problème d'indexation, à investiguer

### **❌ Ligne spéciale introuvable**
```
❌ Ligne spéciale introuvable: 123
```
**Action :** Rafraîchir la page, vérifier que la ligne existe

---

## ✅ Si Tout Va Bien

Vous devriez voir principalement ces messages :
```
✅ Toutes les lignes spéciales préservées
✅ === FIN SYNCHRONISATION ===
📊 Structure finale: {parties: X, sousParties: Y, ...}
```

Et PAS voir :
```
❌ ALERTE : ...
⚠️ ... détectés
❌ ... introuvable
```

---

## 🎯 Tests Avancés (Optionnels)

### Test 4 : Ligne suit sous-partie
```
1. Créer Partie A > SP 1.1 avec ligne spéciale
2. Drag SP 1.1 → position 1.2
3. Vérifier que la ligne suit (1.105 → 1.205)
```

### Test 5 : Calcul % dynamique
```
1. Créer ligne spéciale "-10%" sur Partie A
2. Noter le montant calculé
3. Modifier une quantité dans Partie A
4. Vérifier que la ligne se recalcule automatiquement
```

### Test 6 : Multiple drag & drop
```
1. Créer 3 parties avec lignes spéciales
2. Faire 5-10 drag & drop aléatoires
3. Vérifier qu'aucune ligne n'est perdue
4. Console : "✅ Toutes les lignes spéciales préservées"
```

---

## 📊 Grille de Validation

| Test | Description | Résultat | Commentaire |
|------|-------------|----------|-------------|
| 1 | Ligne 0.5 reste fixe | ⬜ OK / ⬜ KO | |
| 2 | Déplacement fonctionne | ⬜ OK / ⬜ KO | |
| 3 | Index hiérarchiques | ⬜ OK / ⬜ KO | |
| 4 | Ligne suit SP | ⬜ OK / ⬜ KO | |
| 5 | Calcul % dynamique | ⬜ OK / ⬜ KO | |
| 6 | Multiple drag | ⬜ OK / ⬜ KO | |

**Critère de succès :** Minimum 3/3 pour les tests rapides (1-3)

---

## 🔧 En Cas de Problème

### Problème détecté ?

1. **Noter** le test qui échoue
2. **Copier** les logs de la console
3. **Partager** avec le développeur

### Informations à fournir :

```
Test échoué : [Numéro du test]
Comportement attendu : [Ce qui devrait se passer]
Comportement observé : [Ce qui se passe réellement]
Logs console : [Copier-coller]
```

---

**Temps estimé pour tous les tests :** 10-15 minutes  
**Prérequis :** Application démarrée + Console ouverte (F12)  
**Recommandation :** Commencer par les 3 tests rapides

🎯 **Objectif : Valider que le refactoring n'a introduit aucune régression !**

