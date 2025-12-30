# Différenciation des sources de données - Tableau Sous-Traitant

## 📊 Vue d'ensemble

Le tableau des sous-traitants agrège des données provenant de **deux sources distinctes** :

### 1️⃣ **Factures de sous-traitants** (`FactureSousTraitant`)
- **Source** : Entreprises sous-traitantes avec contrats
- **Modèle Django** : `FactureSousTraitant`
- **Caractéristiques** :
  - Nom d'entreprise (ex: "ABCONDUITE", "STAR CLEAN")
  - Factures réelles avec numéros et montants
  - Dates de paiement, d'envoi, prévues
  - Paiements suivis via `PaiementSousTraitant` et `PaiementFactureSousTraitant`

### 2️⃣ **Agents journaliers du planning** (`LaborCost`)
- **Source** : Agents payés à la journée depuis le planning
- **Modèle Django** : `LaborCost` (filtré sur `agent__type_paiement='journalier'`)
- **Caractéristiques** :
  - Nom de personne au format "Prénom Nom" (ex: "Jean Dupont")
  - Pas de factures (liste vide)
  - Coûts calculés depuis le planning (heures normales, samedi, dimanche, férié, heures sup)
  - Convertis de semaines ISO en mois

---

## 🔧 Solution : Champ `source_type`

Pour différencier clairement ces deux sources, un champ **`source_type`** a été ajouté dans les données retournées par le backend.

### Valeurs possibles :

| `source_type` | Source | Description |
|---------------|--------|-------------|
| `'facture_sous_traitant'` | `FactureSousTraitant` | Sous-traitant avec factures |
| `'agent_journalier'` | `LaborCost` | Agent journalier du planning |

---

## 🔄 Backend : Récupération des données

### Endpoint : `GET /api/tableau-sous-traitant-global/`

**Fichier** : `api/views.py`, fonction `_get_tableau_sous_traitant_data()`

#### Étape 1 : Récupérer les factures des sous-traitants (lignes 9628-9784)
```python
factures = FactureSousTraitant.objects.all()
# ...
data[key][sous_traitant_nom][facture.chantier_id]['source_type'] = 'facture_sous_traitant'
```

#### Étape 2 : Récupérer les agents journaliers (lignes 9786-9832)
```python
labor_costs = LaborCost.objects.filter(agent__type_paiement='journalier')
# ...
data[key][agent_nom][lc.chantier_id]['source_type'] = 'agent_journalier'
```

#### Étape 3 : Mettre à jour avec les paiements (lignes 9834-9883)
```python
paiements = PaiementSousTraitant.objects.all()
# Met à jour les montants payés et dates (sans écraser source_type)
```

#### Étape 4 : Retourner les données avec `source_type` (lignes 9885-9914)
```python
result.append({
    'mois': mois_key,
    'sous_traitant': sous_traitant,
    'chantier_id': chantier_id_val,
    # ...
    'source_type': valeurs.get('source_type', 'facture_sous_traitant'),
})
```

---

## 🎨 Frontend : Utilisation des données

### Fichier : `frontend/src/components/chantier/TableauSousTraitant/TableauSousTraitant.js`

#### 1️⃣ Initialisation des données (ligne 89)
```javascript
res.data.forEach((item) => {
  // ✅ Utiliser source_type au lieu de isAgentJournalier()
  const isAgent = item.source_type === 'agent_journalier';
  
  if (isAgent) {
    // Regrouper les agents journaliers par mois/nom
    agentsJournaliersData[keyAgent] = { ... };
  } else {
    // Garder les sous-traitants séparés par chantier
    autresData.push(item);
  }
});
```

#### 2️⃣ Organisation des données (ligne 752)
```javascript
filteredData.forEach((item) => {
  // ✅ Utiliser source_type pour différencier
  const isAgent = item.source_type === 'agent_journalier';
  const target = isAgent ? agentsJournaliers : autresSousTraitants;
  // ...
});
```

#### 3️⃣ Ligne regroupée pour agents journaliers (ligne 873)
```javascript
organized[mois][sous_traitant] = [{
  // ...
  source_type: 'agent_journalier',  // Type de source depuis le backend
  isAgentJournalier: true,           // Flag pour rétrocompatibilité
  chantiersDetails: chantiersDetails, // Liste des chantiers
  // ...
}];
```

---

## 📝 Format des données retournées

### Sous-traitant avec factures
```json
{
  "mois": "09/25",
  "sous_traitant": "STAR CLEAN",
  "chantier_id": 39,
  "chantier_name": "Chantier Exemple",
  "a_payer": 1500.00,
  "paye": 1500.00,
  "ecart": 0.00,
  "factures": [
    {
      "id": 5,
      "numero_facture": "F-2025-001",
      "montant_facture": 1500.00,
      "payee": true,
      "date_paiement_facture": "2025-10-28"
    }
  ],
  "date_paiement": "2025-10-28",
  "date_envoi": "2025-09-15",
  "date_paiement_prevue": "2025-10-30",
  "ecart_paiement_reel": -2,
  "delai_paiement": 45,
  "source_type": "facture_sous_traitant"  // ✅ Identifiant explicite
}
```

### Agent journalier du planning
```json
{
  "mois": "09/25",
  "sous_traitant": "Jean Dupont",
  "chantier_id": 42,
  "chantier_name": "Chantier ABC",
  "a_payer": 2450.00,
  "paye": 0.00,
  "ecart": 2450.00,
  "factures": [],  // Pas de factures pour les agents
  "date_paiement": null,
  "date_envoi": null,
  "date_paiement_prevue": null,
  "ecart_paiement_reel": null,
  "delai_paiement": 45,
  "source_type": "agent_journalier"  // ✅ Identifiant explicite
}
```

---

## 🚨 Ancienne méthode (obsolète)

### ❌ Fonction `isAgentJournalier()` (obsolète)

Avant, la différenciation se faisait par **détection du format du nom** :
- "Prénom Nom" (avec espace) → Agent journalier
- Nom d'entreprise → Sous-traitant

**Problèmes** :
- ❌ Fragile : "STAR CLEAN" contient un espace
- ❌ Nécessite des exceptions codées en dur (ligne 731)
- ❌ Pas robuste si changement de format des noms

**Maintenant remplacée par** : `item.source_type === 'agent_journalier'`

---

## ✅ Avantages de la nouvelle approche

1. **🎯 Explicite** : La source est identifiée clairement dans les données
2. **🔒 Robuste** : Ne dépend plus du format du nom
3. **🧹 Maintenable** : Plus besoin de liste d'exceptions
4. **📊 Traçable** : On sait exactement d'où vient chaque donnée
5. **🔮 Extensible** : Facile d'ajouter d'autres sources si nécessaire

---

## 🧪 Tests

Pour vérifier que la différenciation fonctionne :

1. **Dans la console du backend** (terminal Django) :
   ```
   === RÉSUMÉ FINAL DES DATES DE PAIEMENT ===
   09/25 | STAR CLEAN | Chantier 39: date_paiement = 2025-10-28
   ```

2. **Dans la console du navigateur** :
   ```javascript
   // Afficher toutes les données
   console.log("Données API:", data);
   
   // Filtrer par source
   const factures = data.filter(item => item.source_type === 'facture_sous_traitant');
   const agents = data.filter(item => item.source_type === 'agent_journalier');
   
   console.log("Sous-traitants avec factures:", factures.length);
   console.log("Agents journaliers:", agents.length);
   ```

---

## 📌 Résumé

| Aspect | Avant | Maintenant |
|--------|-------|-----------|
| **Différenciation** | Par format du nom (fragile) | Par champ `source_type` (explicite) |
| **Robustesse** | ❌ Dépend du format | ✅ Indépendant du format |
| **Maintenabilité** | ❌ Exceptions en dur | ✅ Pas d'exceptions nécessaires |
| **Clarté** | ⚠️ Implicite | ✅ Explicite |
| **Traçabilité** | ❌ Difficile | ✅ Facile |

---

**Date de mise à jour** : 29 décembre 2025

