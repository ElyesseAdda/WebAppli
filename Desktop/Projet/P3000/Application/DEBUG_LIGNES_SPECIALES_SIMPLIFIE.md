# Debug Lignes Spéciales - Version Simplifiée

## 🔍 **Problème**

Les lignes spéciales ne sont pas enregistrées dans la situation créée.

## 📋 **Logs Essentiels à Vérifier**

### **1. Chargement des Lignes Spéciales**

```
🔍 LIGNES SPÉCIALES: X lignes chargées
```

- ✅ Si X > 0 : Les lignes sont bien chargées
- ❌ Si X = 0 : Problème de chargement

### **2. Envoi des Lignes Spéciales**

```
🔍 LIGNES SPÉCIALES: X lignes à envoyer
```

- ✅ Si X > 0 : Les lignes sont envoyées au backend
- ❌ Si X = 0 : Problème d'envoi

## 🧪 **Test Rapide**

1. **Ouvrir la console du navigateur**
2. **Créer une situation**
3. **Vérifier les logs :**
   - `🔍 LIGNES SPÉCIALES: X lignes chargées`
   - `🔍 LIGNES SPÉCIALES: X lignes à envoyer`

## 📊 **Résultat Attendu**

**Console :**

```
🔍 LIGNES SPÉCIALES: 1 lignes chargées
🔍 LIGNES SPÉCIALES: 1 lignes à envoyer
```

**Base de données :**

- Situation créée avec ID
- Ligne spéciale "Remise commerciale" enregistrée

## 🔧 **Si Problème Persiste**

1. **Vérifier l'affichage** : La ligne spéciale doit apparaître dans le tableau
2. **Tester la modification** : Changer le pourcentage d'avancement
3. **Vérifier l'envoi** : Intercepter la requête avec les outils de développement
