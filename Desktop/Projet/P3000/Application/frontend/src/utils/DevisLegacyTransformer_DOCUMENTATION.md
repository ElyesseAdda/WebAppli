# Documentation : Origine des champs dans DevisLegacyTransformer

Ce document explique d'où viennent les informations pour chaque champ transformé vers le format legacy.

---

## 📋 INFORMATIONS DE BASE DU DEVIS

### `numero`
**Source :** `devisData.numero` dans `DevisAvance.js`
- **Composant :** `<DevisHeader />` (ligne 1666-1677)
- **État initial :** Vide `''`
- **Génération :** Via `generateDevisNumber()` (lignes 285-321)
  - Appel API : `/api/get-next-devis-number/`
  - Format selon le type :
    - **Chantier existant :** `"Devis n°017.2025 - TS n°001"`
    - **Nouveau chantier :** `"Devis n°017.2025 - Devis travaux"`
- **Modification manuelle :** Possible via `DevisHeader` (onDateChange avec 'numero')

### `date_creation`
**Source :** `devisData.date_creation` dans `DevisAvance.js`
- **Composant :** `<DevisHeader />` (ligne 41-48)
- **État initial :** `new Date().toISOString().split('T')[0]` → format `"YYYY-MM-DD"` (ex: `"2025-09-08"`)
- **Format frontend :** `"YYYY-MM-DD"` (juste la date, sans heure)
- **Format API attendu :** `"YYYY-MM-DDTHH:mm:ss.sssZ"` (ISO 8601 complet, ex: `"2025-09-08T13:09:18.806841Z"`)
- **Transformation :** Via `convertDateToISO()` dans le transformer
  - Convertit `"YYYY-MM-DD"` → `"YYYY-MM-DDTHH:mm:ss.sssZ"` avec heure à `00:00:00.000Z`
  - Si déjà au format ISO, préserve tel quel
  - Si pas de date, utilise la date actuelle
- **Modification manuelle :** Possible via `<DevisHeader />` (input type="date")

### `chantier`
**Source :** `selectedChantierId` dans `DevisAvance.js`
- **État :** `selectedChantierId` (ligne 71)
- **Sélection :** 
  - Via `<Select>` chantier existant (ligne 1448-1463)
  - Via création nouveau chantier → `handleChantierCreation()` → `-1`
- **Valeur transformée :** 
  - Si `null` ou `-1` → `null` (devis travaux)
  - Sinon → ID du chantier

### `price_ht`
**Source :** `total_ht` dans `DevisAvance.js`
- **État :** `total_ht` (ligne 52)
- **Calcul :** Via `useEffect` (lignes 1340-1355)
  - Appelle `calculateGlobalTotal()` qui calcule le total HT incluant toutes les lignes spéciales
- **Mise à jour :** Automatique quand `devisItems` ou `tva_rate` change

### `price_ttc`
**Source :** `montant_ttc` dans `DevisAvance.js`
- **État :** `montant_ttc` (ligne 54)
- **Calcul :** Via `useEffect` (lignes 1340-1355)
  - `montant_ttc = total_ht + tva`
- **Mise à jour :** Automatique quand `total_ht` ou `tva_rate` change

### `tva_rate`
**Source :** `devisData.tva_rate` dans `DevisAvance.js`
- **État initial :** `20` (ligne 22)
- **Composant :** `<DevisRecap />` (ligne 1689)
- **Modification :** Via `onTvaRateChange` dans `DevisRecap`

### `nature_travaux`
**Source :** `devisData.nature_travaux` dans `DevisAvance.js`
- **État initial :** Vide `''` (ligne 21)
- **Composant :** `<DevisTable />` (ligne 1608)
- **Modification :** Via `onNatureTravauxChange` dans `DevisTable`

### `description`
**Source :** `devisData.description` dans `DevisAvance.js`
- **État initial :** `undefined` (non défini dans l'état initial)
- **Note :** Champ non utilisé actuellement dans l'interface, mais présent dans le modèle

### `status`
**Source :** Fixé à `'En attente'` dans le transformer
- **Valeur :** Toujours `'En attente'` lors de la création
- **Modification :** Non géré actuellement dans `DevisAvance`

### `devis_chantier`
**Source :** Calculé automatiquement depuis `selectedChantierId`
- **Logique :** 
  - Si `selectedChantierId === null` ou `=== -1` → `true` (devis travaux)
  - Sinon → `false` (TS pour chantier existant)

---

## 📦 LIGNES DE DÉTAIL (`lignes`)

### Structure de chaque ligne
```javascript
{
  ligne: ID,           // ID de la ligne de détail
  quantity: "2.00",    // Quantité
  custom_price: "10.00", // Prix unitaire calculé
  numero: 1            // ✅ Numéro de la ligne (optionnel, pour compatibilité avec anciens devis)
}
```

### Extraction depuis `devisItems`
**Source :** `devisItems` filtré par `type === 'ligne_detail'`

#### `ligne` (ID)
- **Source :** `ligne.id` dans `devisItems`
- **Origine :** Lors de l'ajout via `handleLigneDetailSelect()` (ligne 667)
  - Sélection depuis `<LigneDetailSearch />`
  - Ligne récupérée depuis l'API `/api/ligne-detail/`
  - Ajoutée dans `devisItems` avec `type: 'ligne_detail'`

#### `quantity`
- **Source :** `ligne.quantity` dans `devisItems`
- **Initialisation :** `0` lors de l'ajout (ligne 682)
- **Modification :** Via `handleLigneDetailQuantityChange()` (ligne 695)
  - Composant : Cellule de quantité dans `<DevisTable />`
  - Mise à jour directe dans `devisItems`

#### `custom_price`
- **Source :** Calculé via `calculatePrice(ligne)` dans le transformer
- **Logique de calcul :**
  1. Si `prix_devis` existe → utilise `prix_devis` (prix personnalisé)
  2. Sinon, si coûts présents (`cout_main_oeuvre` ou `cout_materiel`) :
     - Base = `cout_main_oeuvre + cout_materiel`
     - + Taux fixe = `base * (taux_fixe / 100)`
     - Sous-total = `base + montant_taux_fixe`
     - + Marge = `sous_total * (marge / 100)`
     - Prix = `sous_total + montant_marge`
  3. Sinon → utilise `prix` (prix de base de la ligne)
- **Champs utilisés depuis `devisItems[ligne]` :**
  - `prix_devis` (si présent)
  - `cout_main_oeuvre`
  - `cout_materiel`
  - `taux_fixe`
  - `marge_devis` ou `marge`
  - `prix` (prix de base)

#### `numero`
- **Source :** `ligne.numero` dans `devisItems`
- **Origine :** Attribué via un bouton dans `<DevisTable />` (similaire aux parties et sous-parties)
- **Format :** Nombre entier (Integer)
- **Gestion des anciens devis :**
  - Si `numero` existe et est valide (> 0) → inclus dans le payload
  - Si `numero` est `null`, `undefined`, `''` ou `0` → **non inclus** (le modèle utilisera `default=0`)
- **Modèle backend :** `DevisLigne.numero` avec `blank=True, default=0` pour compatibilité avec les anciens devis
- **Note :** Les anciens devis sans numéro utiliseront automatiquement `default=0` du modèle

---

## 🎯 LIGNES SPÉCIALES (`lignes_speciales`)

### Organisation
```javascript
{
  global: [],           // Lignes globales
  parties: {           // Par partie
    "partieId": [...]
  },
  sousParties: {      // Par sous-partie
    "sousPartieId": [...]
  }
}
```

### Extraction depuis `devisItems`
**Source :** `devisItems` filtré par `type === 'ligne_speciale'`

#### Structure de chaque ligne spéciale
```javascript
{
  description: "...",
  type: "reduction" | "addition" | "display",
  value: 10,
  value_type: "fixed" | "percentage",
  amount: 50,  // Calculé
  index_global: 123,  // ✅ Index global pour conserver l'ordre
  styles: {},
  base_calculation: {  // Si pourcentage
    type: "sous_partie" | "partie" | "global",
    id: 123,
    label: "..."
  }
}
```

#### `description`
- **Source :** `ls.description` dans `devisItems`
- **Origine :** Saisie dans `<SpecialLinesCreator />` ou `<SpecialLineEditModal />`

#### `type` (type_speciale)
- **Source :** `ls.type_speciale` dans `devisItems`
- **Origine :** Sélection dans `<SpecialLinesCreator />` : `reduction`, `addition`, `display`

#### `value`
- **Source :** `ls.value` dans `devisItems`
- **Origine :** Saisie dans `<SpecialLinesCreator />` ou `<SpecialLineEditModal />`
- **Type :** Nombre (fixe) ou pourcentage

#### `value_type`
- **Source :** `ls.value_type` dans `devisItems`
- **Origine :** Sélection dans `<SpecialLinesCreator />` : `fixed` ou `percentage`

#### `amount` (calculé)
- **Source :** Calculé via `calculateSpecialLineAmount()` dans le transformer
- **Logique :**
  - Si `value_type === 'fixed'` → retourne `value`
  - Si `value_type === 'percentage'` :
    - Récupère la base selon `baseCalculation.type` :
      - `sous_partie` → `bases.sousParties[baseCalculation.id]`
      - `partie` → `bases.parties[baseCalculation.id]`
      - `global` → `bases.global`
    - Calcul : `base * (value / 100)`

#### `styles`
- **Source :** `ls.styles` dans `devisItems`
- **Origine :** Sélection dans `<SpecialLinesCreator />` (couleurs, gras, etc.)
- **Structure :** Objet contenant les styles CSS pour l'affichage
  - `fontWeight` : `'bold'` | `'normal'` | `undefined`
  - `fontStyle` : `'italic'` | `'normal'` | `undefined`
  - `textDecoration` : `'underline'` | `'none'` | `undefined`
  - `color` : `string` (couleur hex, ex: `'#000000'`) | `undefined`
  - `backgroundColor` : `string` (couleur hex, ex: `'#ffffff'`) | `undefined`
  - `textAlign` : `'left'` | `'center'` | `'right'` | `undefined`
  - Autres styles CSS possibles
- **Préservation :** Tous les styles sont préservés dans le transformer pour être sauvegardés en base de données
- **Sauvegarde :** Les styles sont enregistrés dans le JSONField `lignes_speciales` du modèle `Devis` pour l'affichage ultérieur

#### `index_global`
- **Source :** `ls.index_global` dans `devisItems`
- **Origine :** Attribué par `DevisIndexManager.getNextIndex()` lors de la création
- **Format :** Nombre entier (Integer)
- **Usage :** Pour conserver l'ordre des lignes spéciales dans le devis
- **Note :** Les lignes spéciales sont triées par `index_global` avant d'être organisées par contexte

#### `base_calculation`
- **Source :** `ls.baseCalculation` dans `devisItems`
- **Origine :** Sélection dans `<SpecialLinesCreator />` lorsque `value_type === 'percentage'`
  - Mode sélection de base activé (`isSelectingBase`)
  - Sélection d'une partie/sous-partie/total global
- **Structure :**
  ```javascript
  {
    type: "sous_partie" | "partie" | "global",
    id: 123,  // ou null pour global
    label: "Partie A"
  }
  ```

#### Organisation par contexte
- **`context_type` :** `'global'` | `'partie'` | `'sous_partie'` (depuis `ls.context_type`)
- **`context_id` :** ID du contexte (depuis `ls.context_id`)
- **Placement :** Via `handlePlaceLineAt()` (ligne 815) après clic dans le tableau

---

## 💰 COÛTS ESTIMÉS

### `cout_estime_main_oeuvre`
**Source :** Calculé via `calculateEstimatedCosts()` dans le transformer
- **Méthode :** 
  - Parcourt toutes les lignes de type `'ligne_detail'` dans `devisItems`
  - Somme : `(ligne.cout_main_oeuvre || 0) * (ligne.quantity || 0)`
- **Champs utilisés :**
  - `ligne.cout_main_oeuvre` depuis `devisItems`
  - `ligne.quantity` depuis `devisItems`

### `cout_estime_materiel`
**Source :** Calculé via `calculateEstimatedCosts()` dans le transformer
- **Méthode :**
  - Parcourt toutes les lignes de type `'ligne_detail'` dans `devisItems`
  - Somme : `(ligne.cout_materiel || 0) * (ligne.quantity || 0)`
- **Champs utilisés :**
  - `ligne.cout_materiel` depuis `devisItems`
  - `ligne.quantity` depuis `devisItems`

---

## 👥 RELATIONS

### `client` (array d'IDs)
**Source :** `clientIds` passé au transformer
- **Récupération :**
  1. Depuis `clientId` (état ligne 79) si défini
  2. Sinon, via `getClientIdFromChantier(selectedChantierId)` (ligne 1384)
     - Récupère le chantier via API
     - Récupère la société associée
     - Récupère le client associé à la société
- **Stockage de `clientId` :**
  - Lors de la sélection d'un chantier (lignes 215, 246)
  - Récupéré depuis `chantierData.societe.client_name`

---

## 📊 MÉTADONNÉES

### `parties_metadata`
**Source :** Actuellement fixé à `{}` (vide)
- **Note :** Non utilisé dans le nouveau système unifié

### `version_systeme_lignes`
**Source :** Fixé à `1` (legacy) dans le transformer

### `mode`
**Source :** Fixé à `'legacy'` dans le transformer

### `items`
**Source :** Fixé à `[]` (vide) pour le mode legacy

---

## 📝 RÉSUMÉ DES ÉTATS ET COMPOSANTS

### États principaux dans `DevisAvance.js`
1. **`devisData`** (ligne 18) : Données de base du devis
   - `numero`, `date_creation`, `nature_travaux`, `tva_rate`, `price_ht`, `price_ttc`

2. **`devisItems`** (ligne 65) : Source de vérité unique
   - Array de tous les items (parties, sous-parties, lignes, lignes spéciales)
   - Chaque item a un `type`, `id`, `index_global`

3. **`total_ht`** (ligne 52) : Total HT calculé automatiquement

4. **`montant_ttc`** (ligne 54) : Total TTC calculé automatiquement

5. **`selectedChantierId`** (ligne 71) : ID du chantier sélectionné

6. **`clientId`** (ligne 79) : ID du client associé

### Composants qui modifient les données
- **`<DevisHeader />`** : Modifie `devisData.numero` et `devisData.date_creation`
- **`<DevisTable />`** : 
  - Ajoute/modifie parties, sous-parties, lignes de détail
  - Gère les lignes spéciales
  - Modifie quantités, prix, marges
- **`<DevisRecap />`** : Modifie `devisData.tva_rate`
- **`<SpecialLinesCreator />`** : Crée les lignes spéciales
- **`<SpecialLineEditModal />`** : Modifie les lignes spéciales existantes

---

## 🔄 FLUX DE TRANSFORMATION

1. **Extraction des lignes** : `extractLignes(devisItems)`
   - Filtre `type === 'ligne_detail'`
   - Calcule le prix pour chaque ligne
   - Formate `{ ligne: ID, quantity: qty, custom_price: price }`

2. **Organisation des lignes spéciales** : `organizeSpecialLines(devisItems)`
   - Filtre `type === 'ligne_speciale'`
   - Calcule les bases brutes
   - Calcule les montants
   - Organise par contexte (global, parties, sousParties)

3. **Calcul des coûts** : `calculateEstimatedCosts(devisItems)`
   - Parcourt les lignes de détail
   - Somme les coûts main d'œuvre et matériel

4. **Construction du payload** : `transformToLegacyFormat()`
   - Assemble tous les champs
   - Récupère les informations depuis `devisData`, `devisItems`, `selectedChantierId`, `clientIds`

