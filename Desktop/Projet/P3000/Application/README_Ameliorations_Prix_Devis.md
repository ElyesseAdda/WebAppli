# Améliorations du Composant de Création de Devis - Gestion des Prix

## Vue d'ensemble

Ce document décrit les améliorations apportées au composant `CreationDevis.js` pour une meilleure gestion des prix des prestations dans les devis.

## Fonctionnalités Ajoutées

### 1. Gestion Détaillée des Coûts

#### Nouveaux États

- `customCouts` : Stockage des coûts personnalisés (main d'œuvre et matériel)
- `customTauxFixes` : Stockage des taux fixes personnalisés
- `customMarges` : Stockage des marges personnalisées

#### Champs de Saisie

- **Main d'œuvre** : Coût de la main d'œuvre en euros
- **Matériel** : Coût du matériel en euros
- **Taux fixe** : Pourcentage de taux fixe
- **Marge** : Pourcentage de marge

### 2. Calcul Automatique des Prix

#### Formule de Calcul

```
Base = Main d'œuvre + Matériel
Montant Taux Fixe = Base × (Taux Fixe / 100)
Sous-total = Base + Montant Taux Fixe
Montant Marge = Sous-total × (Marge / 100)
Prix Final = Sous-total + Montant Marge
```

#### Fonction `calculatePriceFromCosts()`

Calcule automatiquement le prix basé sur les coûts saisis et applique la formule ci-dessus.

### 3. Interface Utilisateur Améliorée

#### Affichage des Prix

- Prix unitaire calculé automatiquement quand les coûts sont modifiés
- Affichage du détail du calcul en temps réel
- Indicateur visuel "Modifié" pour les lignes avec coûts personnalisés

#### Champs Interactifs

- Champs de coûts avec unités (€ et %)
- Prix unitaire en lecture seule quand calculé automatiquement
- Boutons "Sauvegarder" et "Réinitialiser"

#### Détail du Calcul

Affichage détaillé du calcul :

```
Détail du calcul: 15.00€ (MO) + 25.00€ (Mat) = 40.00€ (Base)
+ 8.00€ (Taux fixe 20%)
+ 9.60€ (Marge 20%)
```

### 4. Sauvegarde en Base de Données

#### Fonction `saveCustomCostsToDatabase()`

- Met à jour les coûts dans la base de données via l'API
- Utilise l'endpoint `/api/ligne-details/{id}/` avec méthode PUT
- Met à jour les données locales après sauvegarde
- Nettoie les coûts personnalisés temporaires

#### Données Sauvegardées

```javascript
{
  cout_main_oeuvre: 15.00,
  cout_materiel: 25.00,
  taux_fixe: 20.00,
  marge: 20.00,
  sous_partie: 1
}
```

### 5. Calcul des Totaux Estimés Amélioré

#### Utilisation des Coûts Personnalisés

- Les totaux estimés utilisent les coûts personnalisés s'ils existent
- Calcul de la moyenne pondérée des taux fixes personnalisés
- Mise à jour en temps réel des coûts estimés

#### Affichage des Statistiques

- Nombre de lignes avec prix calculés automatiquement
- Nombre de lignes avec prix manuels
- Coûts estimés main d'œuvre et matériel
- Marge estimée avec pourcentage

## Utilisation

### 1. Modification des Coûts

1. Sélectionner une ligne de détail
2. Modifier les champs de coûts (main d'œuvre, matériel, taux fixe, marge)
3. Le prix se calcule automatiquement
4. Cliquer sur "Sauvegarder" pour persister les modifications

### 2. Réinitialisation

- Cliquer sur "Réinitialiser" pour revenir aux valeurs par défaut
- Les modifications temporaires sont supprimées

### 3. Visualisation

- Le panneau flottant affiche les totaux en temps réel
- Les statistiques montrent la répartition des types de prix
- Les coûts estimés sont mis à jour automatiquement

## Avantages

### 1. Transparence

- Calcul détaillé et visible des prix
- Compréhension claire de la structure des coûts

### 2. Flexibilité

- Possibilité de personnaliser chaque ligne individuellement
- Conservation des valeurs par défaut si non modifiées

### 3. Précision

- Calculs automatiques évitant les erreurs manuelles
- Sauvegarde en base de données pour la persistance

### 4. Expérience Utilisateur

- Interface intuitive avec feedback visuel
- Calculs en temps réel
- Possibilité d'annuler les modifications

## Structure Technique

### Modèles Django

Le modèle `LigneDetail` supporte déjà :

- `cout_main_oeuvre` : Coût main d'œuvre
- `cout_materiel` : Coût matériel
- `taux_fixe` : Taux fixe en pourcentage
- `marge` : Marge en pourcentage
- `prix` : Prix final calculé

### API Endpoints

- `PUT /api/ligne-details/{id}/` : Mise à jour des lignes de détail
- Calcul automatique du prix côté serveur

### Composant React

- Gestion d'état locale pour les modifications temporaires
- Synchronisation avec la base de données
- Interface utilisateur réactive

## Évolutions Futures

### Fonctionnalités Possibles

1. **Historique des modifications** : Traçabilité des changements de prix
2. **Templates de coûts** : Sauvegarde de configurations de coûts réutilisables
3. **Validation avancée** : Contrôles de cohérence des prix
4. **Export des calculs** : Génération de rapports détaillés
5. **Comparaison de devis** : Analyse comparative des coûts

### Améliorations Techniques

1. **Optimisation des performances** : Mise en cache des calculs
2. **Validation côté client** : Vérifications en temps réel
3. **Undo/Redo** : Historique des modifications
4. **Bulk operations** : Modification en lot de plusieurs lignes

## Conclusion

Ces améliorations apportent une gestion plus fine et transparente des prix dans la création de devis, permettant aux utilisateurs de comprendre et contrôler précisément la structure des coûts de chaque prestation.
