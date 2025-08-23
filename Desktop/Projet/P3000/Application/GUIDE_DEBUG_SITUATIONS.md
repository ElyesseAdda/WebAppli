# 🔍 Guide de Debug - Situations

## Vue d'ensemble

Ce système de logging permet de tracer en détail le processus de création d'une situation, depuis le modal frontend jusqu'à la base de données, pour identifier les problèmes de mapping des données.

## 🎯 Objectif

Identifier pourquoi les montants calculés dans le modal ne correspondent pas aux données sauvegardées en DB.

## 🛠️ Composants du Système

### 1. Frontend - SituationLogger

**Fichier :** `frontend/src/components/CreationDocument/SituationCreationModal.js`

**Logs générés :**

- `MODAL_STATE` : État initial du modal (structure, avenants, etc.)
- `CALCULS_MODAL` : Tous les calculs effectués dans le modal
- `API_REQUEST` : Données envoyées à l'API
- `API_RESPONSE` : Réponse reçue de l'API
- `COMPARISON` : Comparaison entre données envoyées et reçues

### 2. Backend - Logs Console

**Fichier :** `api/views.py` (fonction `create_situation`)

**Logs générés :**

- Données reçues par l'API
- Données finales en base de données
- Données renvoyées au frontend

### 3. Interface Debug

**Fichier :** `frontend/src/components/debug/SituationDebugViewer.js`

**Fonctionnalités :**

- Affichage en temps réel des logs
- Persistance après rechargement de page
- Export des logs en JSON
- Interface accordéon pour explorer les données

## 📋 Utilisation

### Étape 1: Activer le Debug

Le composant `SituationDebugViewer` est automatiquement affiché dans l'onglet "Informations" du chantier.

### Étape 2: Créer une Situation

1. Aller dans l'onglet "Informations" d'un chantier
2. Cliquer sur "Gérer les situations"
3. Remplir le modal et créer la situation
4. Observer les logs qui s'accumulent

### Étape 3: Analyser les Logs

#### Frontend (Interface Debug)

- Cliquer sur l'accordéon "🔍 Debug Logs" en bas à droite
- Examiner les différentes catégories :
  - **MODAL_STATE** : Vérifier les données initiales
  - **CALCULS_MODAL** : Vérifier les calculs effectués
  - **API_REQUEST** : Vérifier les données envoyées
  - **API_RESPONSE** : Vérifier la réponse de l'API
  - **COMPARISON** : Comparer envoyé vs reçu

#### Backend (Console du serveur)

- Regarder la console Django pour voir :
  - Les données reçues par l'API
  - Les données stockées en DB
  - Les données renvoyées

### Étape 4: Export et Analyse

- Cliquer sur "Exporter" dans l'interface debug
- Analyser le fichier JSON pour identifier les écarts

## 🔍 Points Clés à Vérifier

### Champs Critiques

```json
{
  "montant_ht_mois": "Montant HT du mois",
  "montant_total_cumul_ht": "Cumul total HT",
  "montant_total_devis": "Total HT du devis",
  "pourcentage_avancement": "% d'avancement global",
  "montant_apres_retenues": "Montant après déductions",
  "tva": "TVA calculée",
  "retenue_garantie": "Retenue de garantie",
  "montant_prorata": "Prorata"
}
```

### Questions à se Poser

1. **Les calculs du modal sont-ils corrects ?**
   - Vérifier `CALCULS_MODAL`
2. **Les données sont-elles bien envoyées ?**
   - Comparer `CALCULS_MODAL` vs `API_REQUEST`
3. **L'API reçoit-elle les bonnes données ?**
   - Vérifier les logs backend "Données reçues"
4. **Les données sont-elles bien sauvegardées ?**
   - Vérifier les logs backend "Données en DB"
5. **La réponse est-elle cohérente ?**
   - Comparer `API_RESPONSE` vs logs backend "Réponse envoyée"

## 🚨 Problèmes Courants

### Champs à 0.00

- Vérifier si le champ est calculé côté frontend ou backend
- Vérifier si le champ est bien envoyé dans `API_REQUEST`

### Écarts de Calculs

- Comparer les formules frontend vs backend
- Vérifier les arrondis et conversions de types

### Champs Manquants

- Vérifier le serializer Django
- Vérifier les champs du modèle `Situation`

## 🧹 Nettoyage

Pour supprimer les logs :

- Interface : Cliquer sur "Vider"
- Manuellement : `localStorage.removeItem('situationDebugLogs')`
- Automatique : Les logs sont limités à 50 entrées

## ⚠️ Important

Ce système de debug est destiné au développement uniquement.
**Pensez à le désactiver en production !**
