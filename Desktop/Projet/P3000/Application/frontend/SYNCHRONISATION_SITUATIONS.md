# Synchronisation des Situations

## Vue d'ensemble

Ce système permet de synchroniser automatiquement les modifications des situations entre les composants `ChantierInfoTab.js` et `TableauSuivi.js` grâce à un hook personnalisé `useSituationsManager`.

## Architecture

### Hook `useSituationsManager`

Le hook centralise toute la logique de gestion des situations :

- **Chargement** : Récupère les situations depuis l'API
- **Mise à jour** : Met à jour les situations via l'API et l'état local
- **Synchronisation** : Maintient la cohérence entre tous les composants

### Fonctions disponibles

```javascript
const {
  situations, // Array des situations
  loading, // Boolean de chargement
  error, // Erreur éventuelle
  loadSituations, // Fonction de rechargement
  updateSituation, // Mise à jour complète
  updateDateEnvoi, // Mise à jour date d'envoi + délai
  updatePaiement, // Mise à jour montant + date paiement
} = useSituationsManager(chantierId);
```

## Utilisation

### Dans ChantierInfoTab.js

```javascript
import { useSituationsManager } from "../../hooks/useSituationsManager";

const ChantierInfoTab = ({ chantierData }) => {
  const { situations, updateDateEnvoi, updatePaiement } = useSituationsManager(
    chantierData?.id
  );

  // Les situations sont automatiquement synchronisées
  // Les modifications sont reflétées dans TableauSuivi.js
};
```

### Dans TableauSuivi.js

```javascript
import { useSituationsManager } from "../hooks/useSituationsManager";

const TableauSuivi = () => {
  const { situations, updateDateEnvoi, updatePaiement } =
    useSituationsManager(selectedChantierId);

  // Les situations sont automatiquement synchronisées
  // Les modifications sont reflétées dans ChantierInfoTab.js
};
```

## Avantages

1. **Synchronisation automatique** : Plus besoin de gérer manuellement les états
2. **Code DRY** : Logique centralisée dans un seul endroit
3. **Maintenance facile** : Modifications dans un seul fichier
4. **Performance** : Évite les rechargements inutiles
5. **Cohérence** : Garantit que les données sont identiques partout

## Fonctionnement

1. Quand un composant modifie une situation via le hook
2. L'API est appelée pour persister les données
3. L'état local du hook est mis à jour
4. Tous les composants utilisant le hook sont automatiquement re-rendus
5. Les données restent synchronisées

## Exemple de modification

```javascript
// Dans n'importe quel composant
const handleUpdateDateEnvoi = async (situationId, dateEnvoi, delaiPaiement) => {
  try {
    await updateDateEnvoi(situationId, dateEnvoi, delaiPaiement);
    // La modification est automatiquement visible dans tous les composants
  } catch (error) {
    console.error("Erreur lors de la mise à jour:", error);
  }
};
```

## Migration

Si vous ajoutez de nouveaux composants qui gèrent les situations, il suffit d'importer et d'utiliser le hook :

```javascript
import { useSituationsManager } from "../hooks/useSituationsManager";

const NouveauComposant = ({ chantierId }) => {
  const { situations, updateDateEnvoi, updatePaiement } =
    useSituationsManager(chantierId);

  // Votre logique ici...
};
```
