# Différenciation des sources de données - Tableau Sous-Traitant

## 📊 Vue d'ensemble

Le tableau des sous-traitants agrège des données provenant de **trois sources distinctes** :

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

### 3️⃣ **Dépenses de sous-traitance Agence** (`AgencyExpenseMonth`)
- **Source** : Frais de structure avec catégorie "Sous-traitant"
- **Modèle Django** : `AgencyExpenseMonth` (filtré sur `category='Sous-traitant'`)
- **Caractéristiques** :
  - Description utilisée comme nom de sous-traitant
  - Chantier = "Agence" (chantier_id = 0)
  - Montant à payer depuis `amount`
  - Factures stockées dans le champ JSON `factures`
  - Dates : `date_reception_facture`, `date_paiement_reel`, `delai_paiement`

---

## 🔧 Solution : Champ `source_type`

Pour différencier clairement ces trois sources, un champ **`source_type`** a été ajouté dans les données retournées par le backend.

### Valeurs possibles :

| `source_type` | Source | Description |
|---------------|--------|-------------|
| `'facture_sous_traitant'` | `FactureSousTraitant` | Sous-traitant avec factures |
| `'agent_journalier'` | `LaborCost` | Agent journalier du planning |
| `'agency_expense'` | `AgencyExpenseMonth` | Dépense de sous-traitance depuis les frais de structure |

---

## 🔄 Backend : Récupération des données

### Endpoint : `GET /api/tableau-sous-traitant-global/`

**Fichier** : `api/views.py`, fonction `_get_tableau_sous_traitant_data()`

#### Étape 1 : Récupérer les factures des sous-traitants
```python
factures = FactureSousTraitant.objects.all()
# ...
data[key][sous_traitant_nom][facture.chantier_id]['source_type'] = 'facture_sous_traitant'
```

#### Étape 2 : Récupérer les agents journaliers
```python
labor_costs = LaborCost.objects.filter(agent__type_paiement='journalier')
# ...
data[key][agent_nom][lc.chantier_id]['source_type'] = 'agent_journalier'
```

#### Étape 3 : Récupérer les dépenses agence (AgencyExpenseMonth)
```python
agency_expenses_month = AgencyExpenseMonth.objects.filter(category='Sous-traitant')
# ...
data[key][sous_traitant_nom][chantier_id_val]['source_type'] = 'agency_expense'
data[key][sous_traitant_nom][chantier_id_val]['agency_expense_id'] = expense_month.id
```

#### Étape 4 : Mettre à jour avec les paiements (PaiementSousTraitant)
```python
paiements = PaiementSousTraitant.objects.all()
# Met à jour les montants payés et dates (sans écraser source_type)
```

#### Étape 5 : Mettre à jour avec les suivis mensuels (SuiviPaiementSousTraitantMensuel)
```python
suivis = SuiviPaiementSousTraitantMensuel.objects.all()
# Met à jour avec les données saisies manuellement (PRIORITÉ)
```

#### Étape 6 : Retourner les données avec `source_type`
```python
result.append({
    'mois': mois_key,
    'sous_traitant': sous_traitant,
    'chantier_id': chantier_id_val,
    # ...
    'source_type': valeurs.get('source_type', 'facture_sous_traitant'),
    'agency_expense_id': valeurs.get('agency_expense_id'),  # Pour AgencyExpenseMonth
    'suivi_paiement_id': valeurs.get('suivi_paiement_id'),  # Pour suivi manuel
})
```

---

## 🎨 Frontend : Utilisation des données

### Fichier : `frontend/src/components/chantier/TableauSousTraitant/TableauSousTraitant.js`

#### 1️⃣ Différenciation par source_type
```javascript
res.data.forEach((item) => {
  // ✅ Utiliser source_type pour différencier
  const isAgent = item.source_type === 'agent_journalier';
  const isAgencyExpense = item.source_type === 'agency_expense';
  const isFacture = item.source_type === 'facture_sous_traitant';
  
  // Traitement selon le type...
});
```

#### 2️⃣ Organisation des données
```javascript
filteredData.forEach((item) => {
  // ✅ Utiliser source_type pour différencier
  const isAgent = item.source_type === 'agent_journalier';
  const target = isAgent ? agentsJournaliers : autresSousTraitants;
  // ...
});
```

---

## 📝 Format des données retournées

### Sous-traitant avec factures (`facture_sous_traitant`)
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
  "source_type": "facture_sous_traitant"
}
```

### Agent journalier du planning (`agent_journalier`)
```json
{
  "mois": "09/25",
  "sous_traitant": "Jean Dupont",
  "chantier_id": 42,
  "chantier_name": "Chantier ABC",
  "a_payer": 2450.00,
  "paye": 0.00,
  "ecart": 2450.00,
  "factures": [],
  "date_paiement": null,
  "date_envoi": null,
  "date_paiement_prevue": null,
  "ecart_paiement_reel": null,
  "delai_paiement": 45,
  "source_type": "agent_journalier"
}
```

### Dépense agence (`agency_expense`)
```json
{
  "mois": "09/25",
  "sous_traitant": "Service Nettoyage Express",
  "chantier_id": 0,
  "chantier_name": "Agence",
  "a_payer": 850.00,
  "paye": 0.00,
  "ecart": 850.00,
  "factures": [
    {
      "numero": "FA-2025-123",
      "montant": 850.00
    }
  ],
  "date_paiement": null,
  "date_envoi": "2025-09-10",
  "date_paiement_prevue": "2025-10-25",
  "ecart_paiement_reel": null,
  "delai_paiement": 45,
  "source_type": "agency_expense",
  "agency_expense_id": 42
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
- ❌ Nécessite des exceptions codées en dur
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

1. **Dans la console du navigateur** :
   ```javascript
   // Afficher toutes les données
   console.log("Données API:", data);
   
   // Filtrer par source
   const factures = data.filter(item => item.source_type === 'facture_sous_traitant');
   const agents = data.filter(item => item.source_type === 'agent_journalier');
   const agencyExpenses = data.filter(item => item.source_type === 'agency_expense');
   
   console.log("Sous-traitants avec factures:", factures.length);
   console.log("Agents journaliers:", agents.length);
   console.log("Dépenses agence:", agencyExpenses.length);
   ```

---

## 📌 Résumé

| `source_type` | Modèle | Chantier | Factures | Caractéristique |
|---------------|--------|----------|----------|-----------------|
| `facture_sous_traitant` | `FactureSousTraitant` | Variable | Oui | Entreprises sous-traitantes |
| `agent_journalier` | `LaborCost` | Variable | Non | Agents du planning |
| `agency_expense` | `AgencyExpenseMonth` | "Agence" (0) | Optionnel | Frais de structure |

---

**Date de mise à jour** : 2 janvier 2026
