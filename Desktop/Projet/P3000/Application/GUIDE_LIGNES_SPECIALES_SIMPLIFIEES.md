# Guide des Lignes Spéciales Simplifiées

## 🎯 **Objectif**

Simplifier la création des lignes spéciales en ne gardant que les champs essentiels et en calculant automatiquement les montants basés sur le pourcentage d'avancement.

## 📊 **Structure Simplifiée**

### **Avant (trop de champs) :**

```json
{
  "lignes_speciales": [
    {
      "description": "Remise commerciale",
      "montant_ht": 9367.11,
      "value": 9367.11,
      "valueType": "fixed",
      "type": "reduction",
      "niveau": "global",
      "partie_id": null,
      "sous_partie_id": null,
      "pourcentage_precedent": 0,
      "pourcentage_actuel": 0,
      "montant": 9367.11
    }
  ]
}
```

### **Après (structure simplifiée) :**

```json
{
  "lignes_speciales": [
    {
      "description": "Remise commerciale",
      "value": 9367.11,
      "valueType": "fixed",
      "type": "reduction",
      "pourcentage_precedent": 0,
      "pourcentage_actuel": 25.5
    }
  ]
}
```

## 🔧 **Champs Requis**

### **Champs obligatoires :**

- `description` : Description de la ligne spéciale
- `value` : Montant de base (fixe ou pourcentage)
- `valueType` : Type de valeur (`fixed` ou `percentage`)
- `type` : Type de ligne (`reduction` ou `ajout`)
- `pourcentage_actuel` : Pourcentage d'avancement actuel

### **Champs optionnels :**

- `pourcentage_precedent` : Pourcentage de la situation précédente (défaut: 0)

## 🧮 **Calcul Automatique**

Le système calcule automatiquement :

- `montant_ht` = (`value` × `pourcentage_actuel`) / 100
- `montant` = `montant_ht`
- `niveau` = `global` (toujours)

## 📝 **Exemple Complet**

```json
{
  "chantier": 1,
  "devis": 1,
  "mois": 6,
  "annee": 2024,
  "montant_ht_mois": 15000.0,
  "pourcentage_avancement": 25.5,
  "lignes_speciales": [
    {
      "description": "Remise commerciale",
      "value": 9367.11,
      "valueType": "fixed",
      "type": "reduction",
      "pourcentage_precedent": 0,
      "pourcentage_actuel": 25.5
    },
    {
      "description": "Frais de dossier",
      "value": 500.0,
      "valueType": "fixed",
      "type": "ajout",
      "pourcentage_precedent": 0,
      "pourcentage_actuel": 25.5
    }
  ]
}
```

## 🎯 **Avantages**

1. **Simplification** : Moins de champs à gérer côté frontend
2. **Cohérence** : Calcul automatique basé sur le pourcentage d'avancement
3. **Maintenance** : Code plus simple et plus lisible
4. **Fiabilité** : Moins de risques d'erreurs de saisie

## ⚠️ **Points d'Attention**

- Le `pourcentage_actuel` doit correspondre au pourcentage d'avancement de la situation
- Le `pourcentage_precedent` doit correspondre au pourcentage de la situation précédente
- Les montants sont calculés automatiquement, ne pas les envoyer manuellement

## 🔄 **Modifications Apportées**

### **Frontend (SituationCreationModal.js) :**

- ✅ Suppression des champs `niveau`, `partie_id`, `sous_partie_id`, `montant`, `montant_ht`
- ✅ Envoi uniquement des champs essentiels : `description`, `value`, `valueType`, `type`, `pourcentage_precedent`, `pourcentage_actuel`

### **Backend (models.py) :**

- ✅ Ajout de `default=0` pour `montant_ht` pour éviter les erreurs de validation
- ✅ Conservation de tous les champs pour la compatibilité avec les données existantes

### **Avantages :**

- 🎯 **Simplification** : Moins de champs à gérer côté frontend
- 🔧 **Maintenance** : Code plus simple et plus lisible
- 📊 **Cohérence** : Calcul automatique basé sur le pourcentage d'avancement
- 🛡️ **Compatibilité** : Les données existantes restent fonctionnelles
