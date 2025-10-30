# Workflow Complet : Gestion des Lignes de Détails

## 🎯 Objectif
Permettre à l'utilisateur de gérer les lignes de détails dans le devis avec une expérience similaire aux parties et sous-parties.

## 📊 Structure des Données

### Base de données (LigneDetail)
```javascript
{
  id: number,
  sous_partie: number,  // FK vers SousPartie
  partie: number,       // FK vers Partie (nullable)
  description: string,  // "Peinture acrylique sur murs"
  unite: string,        // "m²", "unité", "h", etc.
  cout_main_oeuvre: decimal,  // Coût MO
  cout_materiel: decimal,     // Coût matériel
  taux_fixe: decimal,         // Taux fixe en %
  marge: decimal,             // Marge en %
  prix: decimal,              // Prix calculé automatiquement
  is_deleted: boolean
}
```

### Affichage dans le devis
```html
<!-- Exemple depuis preview_devis.html lignes 670-678 -->
<tr>
  <td class="ligne-details">Peinture acrylique sur murs</td>
  <td class="unitetableau">m²</td>
  <td class="quantitetableau">150</td>
  <td class="prixtableau">15.00 €</td>
  <td class="totalHttableau">2 250.00 €</td>
</tr>
```

## 🔄 Workflow Complet

### 1️⃣ Structure Hiérarchique
```
PARTIE (bleu foncé)
  ↓
  SOUS-PARTIE (gris clair)
    ↓
    LIGNES DE DÉTAILS (blanc)
      - Description
      - Unité
      - Quantité (dans le devis, pas dans LigneDetail)
      - Prix unitaire (prix calculé)
      - Total HT = Quantité × Prix unitaire
```

### 2️⃣ Ajout de Lignes de Détails

#### A. Barre de Recherche Fuzzy
- **Localisation** : Sous chaque sous-partie sélectionnée
- **Comportement** : Similaire à PartieSearch/SousPartieSearch
- **Recherche** : 
  - Dans toutes les lignes de la sous-partie actuelle
  - Recherche fuzzy (tolérance aux fautes de frappe)
  - Option "Créer" si aucun résultat

#### B. Création Automatique
```javascript
// Si aucune ligne trouvée, afficher option de création
{
  value: 'create',
  label: `✨ Créer "${inputValue}"`,
  data: { description: inputValue, isCreate: true }
}
```

#### C. Endpoint API
```
GET /api/lignes-details/search/?sous_partie={id}&q={search}
POST /api/lignes-details/
```

### 3️⃣ Affichage des Lignes de Détails

#### A. Layout dans le Tableau
```jsx
<tbody>
  {/* Pour chaque sous-partie */}
  {sousParties.map(sousPartie => (
    <>
      {/* Affichage sous-partie */}
      <tr className="sous-partie">
        <td colspan="5">
          {sousPartie.description}
          <span style="float: right">{sousPartie.total_sous_partie} €</span>
        </td>
      </tr>
      
      {/* Lignes de détails */}
      {sousPartie.lignes_details.map(ligne => (
        <tr>
          <td class="ligne-details">{ligne.description}</td>
          <td class="unitetableau">{ligne.unite}</td>
          <td class="quantitetableau">
            {/* Input éditable pour la quantité */}
            <input 
              type="number" 
              value={ligne.quantity} 
              onChange={handleQuantityChange}
            />
          </td>
          <td class="prixtableau">{ligne.prix} €</td>
          <td class="totalHttableau">
            {ligne.quantity * ligne.prix} €
          </td>
        </tr>
      ))}
    </>
  ))}
</tbody>
```

#### B. Champs Éditables
- ✅ **Description** : Non éditable (depuis la DB)
- ✅ **Unité** : Non éditable (depuis la DB)
- ✅ **Quantité** : **Éditable** (dans le devis uniquement)
- ✅ **Prix unitaire** : Non éditable (calculé automatiquement)
- ✅ **Total HT** : Calculé automatiquement (Quantité × Prix)

### 4️⃣ Actions sur les Lignes

#### A. Drag & Drop
- Réorganiser les lignes dans la sous-partie
- **Pas de numérotation** (contrairement aux parties)
- Mise à jour de l'ordre dans le devis

#### B. Édition
- **Quantité** : Édition inline
- **Description** : Bouton ✏️ pour ouvrir un modal
  - Modification de tous les champs (coût MO, matériel, taux, marge)
  - Recalcul du prix après modification
  - Mise à jour en DB

#### C. Suppression
- Bouton 🗑️ pour supprimer la ligne
- Confirmation avant suppression
- Soft delete : `is_deleted = true`

### 5️⃣ Calculs Automatiques

#### A. Prix d'une Ligne
```javascript
// Calcul automatique (déjà implémenté dans le modèle)
const base = cout_main_oeuvre + cout_materiel;
const montant_taux_fixe = base * (taux_fixe / 100);
const sous_total = base + montant_taux_fixe;
const montant_marge = sous_total * (marge / 100);
const prix = sous_total + montant_marge;
```

#### B. Total d'une Ligne
```javascript
const totalLigne = quantite * prix;
```

#### C. Total d'une Sous-Partie
```javascript
const totalSousPartie = sousPartie.lignes_details.reduce(
  (sum, ligne) => sum + (ligne.quantity * ligne.prix), 
  0
);
```

#### D. Total d'une Partie
```javascript
const totalPartie = partie.sousParties.reduce(
  (sum, sousPartie) => sum + sousPartie.total, 
  0
);
```

### 6️⃣ État des Données dans le Devis

#### A. Dans selectedParties
```javascript
selectedParties: [
  {
    id: 1,
    titre: "Peinture",
    total_partie: 5000,
    selectedSousParties: [
      {
        id: 10,
        description: "32 Peinture acrylique sur murs",
        selectedLignesDetails: [
          {
            id: 40,
            description: "Peinture mâte des pièces sèches",
            unite: "m²",
            cout_main_oeuvre: 10.00,
            cout_materiel: 5.00,
            taux_fixe: 20.00,
            marge: 20.00,
            prix: 18.00,  // Calculé automatiquement
            quantity: 150  // Ajouté dans le devis
          }
        ]
      }
    ]
  }
]
```

#### B. Sauvegarde
```javascript
// Lors de la sauvegarde du devis
const devisData = {
  // ... autres champs
  parties: selectedParties.map(partie => ({
    partie_id: partie.id,
    sous_parties: partie.selectedSousParties.map(sp => ({
      sous_partie_id: sp.id,
      lignes_details: sp.selectedLignesDetails.map(ld => ({
        ligne_detail_id: ld.id,
        quantity: ld.quantity  // Seule donnée qui change dans le devis
      }))
    }))
  }))
};
```

## 🎨 Composants à Créer

### 1. `LigneDetailSearch.js`
- Barre de recherche fuzzy
- Liste des lignes disponibles pour la sous-partie
- Option de création

### 2. `LigneDetailRow.js`
- Affichage d'une ligne de détail
- Input quantité (éditable)
- Boutons d'édition et suppression
- Drag handle pour réorganisation

### 3. Intégration dans `DevisTable.js`
- Affichage des lignes sous les sous-parties
- Drag & drop context
- Mise à jour des totaux

## 📝 Fonctions à Implémenter

### Dans DevisAvance.js
```javascript
// États
const [selectedLignesDetails, setSelectedLignesDetails] = useState({});

// Handlers
const handleLigneDetailSelect = (sousPartieId, ligneDetail);
const handleLigneDetailCreate = async (sousPartieId, description);
const handleLigneDetailRemove = (sousPartieId, ligneDetailId);
const handleLigneDetailEdit = async (sousPartieId, ligneDetailId);
const handleLigneDetailQuantityChange = (sousPartieId, ligneDetailId, quantity);
const handleLignesDetailsReorder = (sousPartieId, result);
```

## 🔗 Intégration API

### Endpoint de Recherche
```python
# api/views.py
@action(detail=False, methods=['get'])
def search(self, request):
    sous_partie_id = request.query_params.get('sous_partie', None)
    q = request.query_params.get('q', '').strip()
    
    queryset = LigneDetail.objects.filter(is_deleted=False)
    
    if sous_partie_id:
        queryset = queryset.filter(sous_partie_id=sous_partie_id)
    
    if q:
        queryset = queryset.filter(description__icontains=q)
    
    results = []
    for ld in queryset[:50]:
        results.append({
            'value': ld.id,
            'label': ld.description,
            'data': {
                'id': ld.id,
                'description': ld.description,
                'unite': ld.unite,
                'cout_main_oeuvre': str(ld.cout_main_oeuvre),
                'cout_materiel': str(ld.cout_materiel),
                'taux_fixe': str(ld.taux_fixe),
                'marge': str(ld.marge),
                'prix': str(ld.prix),
                'sous_partie': ld.sous_partie_id
            }
        })
    
    return Response(results)
```

### Endpoint de Création
```python
# Création via POST /api/lignes-details/
# Le prix sera calculé automatiquement dans le modèle
```

## ✅ Checklist d'Implémentation

- [ ] Créer le composant `LigneDetailSearch.js` avec recherche fuzzy
- [ ] Créer l'endpoint `/api/lignes-details/search/` côté API
- [ ] Ajouter l'état `selectedLignesDetails` dans `DevisAvance.js`
- [ ] Implémenter les handlers pour les lignes de détails
- [ ] Créer le composant `LigneDetailRow.js`
- [ ] Intégrer l'affichage dans `DevisTable.js` sous les sous-parties
- [ ] Implémenter le drag & drop pour les lignes
- [ ] Ajouter les inputs éditables pour les quantités
- [ ] Implémenter les boutons d'édition et suppression
- [ ] Calculer automatiquement les totaux
- [ ] Mettre à jour les totaux des sous-parties et parties
- [ ] Intégrer avec le système de sauvegarde du devis

## 🎯 Résultat Final

L'utilisateur pourra :
1. ✅ Rechercher des lignes de détails existantes avec la recherche fuzzy
2. ✅ Créer de nouvelles lignes si aucune correspondance
3. ✅ Ajuster les quantités pour chaque ligne
4. ✅ Réorganiser les lignes par drag & drop
5. ✅ Éditer les détails d'une ligne (coûts, marge, etc.)
6. ✅ Supprimer des lignes
7. ✅ Voir les totaux se mettre à jour automatiquement

