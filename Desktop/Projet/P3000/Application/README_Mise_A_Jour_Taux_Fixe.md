# 🔄 Mise à Jour Automatique du Taux Fixe

## 📋 Vue d'Ensemble

Cette fonctionnalité permet de modifier le taux fixe global et de recalculer automatiquement toutes les lignes de détail existantes avec le nouveau taux fixe.

## 🎯 Fonctionnalités

### ✅ Mise à Jour Globale

- Modification du taux fixe dans les paramètres système
- Recalcul automatique de toutes les lignes de détail existantes
- Mise à jour des prix basée sur la formule : `prix = (base + montant_taux_fixe + montant_marge)`

### 📊 Interface Utilisateur

- Modal de mise à jour avec validation
- Affichage du nombre de lignes mises à jour
- Exemples de lignes modifiées avec leurs nouveaux prix
- Indicateur de progression pendant la mise à jour

### 🔄 Synchronisation

- Mise à jour en temps réel dans l'interface de création de devis
- Nettoyage automatique des coûts personnalisés obsolètes
- Rafraîchissement des données sans rechargement de page

## 🛠️ Architecture Technique

### Backend (Django)

#### Vue `update_taux_fixe`

```python
@api_view(['POST'])
def update_taux_fixe(request):
    # 1. Mise à jour du paramètre global
    # 2. Récupération de toutes les lignes de détail
    # 3. Recalcul du prix pour chaque ligne
    # 4. Sauvegarde en base de données
    # 5. Retour des données mises à jour
```

#### Calcul du Prix

```python
# Formule de calcul avec arrondis à 2 décimales
base = (cout_main_oeuvre + cout_materiel).quantize(TWOPLACES)
montant_taux_fixe = (base * (taux_fixe / 100)).quantize(TWOPLACES)
sous_total = (base + montant_taux_fixe).quantize(TWOPLACES)
montant_marge = (sous_total * (marge / 100)).quantize(TWOPLACES)
prix = (sous_total + montant_marge).quantize(TWOPLACES)
```

### Frontend (React)

#### Composant `UpdateTauxFixeModal`

- Gestion de l'état de chargement
- Affichage des informations de mise à jour
- Callback vers le composant parent

#### Composant `CreationDevis`

- Fonction `handleTauxFixeUpdated` pour synchroniser les données
- Mise à jour des états `allLignesDetails` et `filteredLignesDetails`
- Nettoyage des coûts personnalisés

## 🚀 Utilisation

### 1. Accès à la Fonctionnalité

1. Cliquer sur "Créer une nouvelle partie"
2. Dans le modal, cliquer sur "Modifier Taux Fixe"

### 2. Modification du Taux Fixe

1. Saisir le nouveau taux fixe (ex: 19.00)
2. Cliquer sur "Mettre à jour"
3. Attendre la confirmation de mise à jour

### 3. Résultats

- ✅ Taux fixe mis à jour dans les paramètres
- 📊 Toutes les lignes de détail recalculées
- 🔄 Interface mise à jour automatiquement

## 📈 Exemple de Calcul

### Avant (Taux fixe : 15%)

```
Ligne : "Peinture mur"
- Main d'œuvre : 10.00€
- Matériel : 5.00€
- Base : 15.00€
- Taux fixe (15%) : 2.25€
- Sous-total : 17.25€
- Marge (20%) : 3.45€
- Prix final : 20.70€
```

### Après (Taux fixe : 19%)

```
Ligne : "Peinture mur"
- Main d'œuvre : 10.00€
- Matériel : 5.00€
- Base : 15.00€
- Taux fixe (19%) : 2.85€
- Sous-total : 17.85€
- Marge (20%) : 3.57€
- Prix final : 21.42€
```

## 🔧 Configuration

### Paramètres de Base

- **Précision décimale** : 2 décimales
- **Arrondis** : À chaque étape du calcul
- **Validation** : Taux fixe positif obligatoire

### Performance

- **Mise à jour en lot** : Toutes les lignes en une seule opération
- **Transaction atomique** : Rollback en cas d'erreur
- **Optimisation** : Calculs avec `Decimal` pour la précision

## 🛡️ Sécurité et Validation

### Validation des Données

- Vérification que le taux fixe est un nombre positif
- Gestion des erreurs de conversion
- Rollback automatique en cas d'échec

### Gestion d'Erreurs

- Messages d'erreur explicites
- Indicateurs visuels de chargement
- Timeout de sécurité pour les opérations longues

## 🔄 Évolutions Futures

### Fonctionnalités Prévues

- [ ] Mise à jour sélective par chantier
- [ ] Historique des modifications de taux fixe
- [ ] Prévisualisation des impacts avant mise à jour
- [ ] Export des lignes modifiées

### Optimisations

- [ ] Mise à jour asynchrone pour les gros volumes
- [ ] Cache des calculs intermédiaires
- [ ] Indexation des lignes par taux fixe

## 📝 Notes Techniques

### Dépendances

- Django REST Framework
- React Material-UI
- Axios pour les appels API

### Base de Données

- Table `Parametres` : Stockage du taux fixe global
- Table `LigneDetail` : Lignes de détail avec prix calculés
- Contraintes de précision décimale

### API Endpoints

- `POST /api/update-taux-fixe/` : Mise à jour du taux fixe
- `GET /api/parametres/taux-fixe/` : Récupération du taux fixe actuel
