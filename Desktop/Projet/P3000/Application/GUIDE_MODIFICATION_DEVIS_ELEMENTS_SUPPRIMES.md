# Guide : Modification de Devis avec Éléments Supprimés

## 🎯 **Fonctionnalité Implémentée**

Lors de la modification d'un devis existant, les parties, sous-parties et lignes de détail qui ont été supprimées (marquées avec `is_deleted=True`) restent maintenant visibles et utilisables, mais **uniquement celles qui étaient présentes dans le devis original**.

## 🔧 **Modifications Techniques**

### **Backend (API)**

#### **1. PartieViewSet**
- **Paramètres ajoutés** : `devis_id` et `include_deleted=true`
- **Logique** : En mode modification, récupère toutes les parties (y compris supprimées) mais filtre pour ne montrer que celles présentes dans le devis original
- **Filtrage** : Utilise `DevisLigne` pour identifier les parties du devis

#### **2. SousPartieViewSet**
- **Paramètres ajoutés** : `devis_id` et `include_deleted=true`
- **Logique** : Même principe que les parties, filtre par les sous-parties présentes dans le devis original
- **Filtrage** : Utilise `DevisLigne` pour identifier les sous-parties du devis

#### **3. LigneDetailViewSet**
- **Paramètres ajoutés** : `devis_id` et `include_deleted=true`
- **Logique** : Filtre les lignes de détail pour ne montrer que celles présentes dans le devis original
- **Filtrage** : Utilise `DevisLigne` pour identifier les lignes du devis

### **Frontend (ModificationDevis.js)**

#### **1. Chargement des Données**
```javascript
// Parties
const params = { 
  type: selectedPartieType,
  ...(devisId && { devis_id: devisId, include_deleted: 'true' })
};

// Sous-parties
const params = {
  ...(devisId && { devis_id: devisId, include_deleted: 'true' })
};

// Lignes de détail
const params = {
  id__in: selectedSousParties.join(","),
  ...(devisId && { devis_id: devisId, include_deleted: 'true' })
};
```

#### **2. Indicateurs Visuels**
- **Couleur rouge** : `#f44336` pour les éléments supprimés
- **Texte barré** : `textDecoration: 'line-through'`
- **Opacité réduite** : `opacity: 0.7`
- **Label "SUPPRIMÉ"** : Affiché à côté du nom

## 🎨 **Interface Utilisateur**

### **Éléments Supprimés Visibles**
- ✅ **Parties** : Titre en rouge barré + "(SUPPRIMÉ)"
- ✅ **Sous-parties** : Description en rouge barré + "(SUPPRIMÉ)"
- ✅ **Lignes de détail** : Description en rouge barré + "(SUPPRIMÉ)"

### **Comportement**
- **Sélection possible** : Les éléments supprimés peuvent être sélectionnés
- **Modification possible** : Les éléments supprimés peuvent être modifiés
- **Calcul inclus** : Les éléments supprimés sont inclus dans les calculs du devis

## 🔍 **Logique de Filtrage**

### **Mode Création (Comportement Normal)**
```python
# Filtre standard : seulement les éléments actifs
queryset = Partie.objects.filter(Q(is_deleted=False) | Q(is_deleted__isnull=True))
```

### **Mode Modification**
```python
# 1. Récupérer le devis original
devis = Devis.objects.get(id=devis_id)
devis_lignes = DevisLigne.objects.filter(devis=devis)

# 2. Extraire les IDs des éléments du devis
partie_ids = set()
for ligne in devis_lignes:
    if ligne.ligne_detail.partie:
        partie_ids.add(ligne.ligne_detail.partie.id)

# 3. Filtrer pour ne montrer que les éléments du devis
queryset = queryset.filter(id__in=partie_ids)
```

## 🚀 **Avantages**

1. **Cohérence** : Les devis existants restent modifiables même si des éléments ont été supprimés
2. **Sécurité** : Seuls les éléments du devis original sont visibles
3. **Flexibilité** : Possibilité de restaurer des éléments supprimés
4. **Transparence** : Indication visuelle claire des éléments supprimés
5. **Performance** : Filtrage efficace au niveau de la base de données

## 📝 **Utilisation**

### **Pour l'Utilisateur**
1. Ouvrir un devis existant en mode modification
2. Les éléments supprimés apparaissent en rouge avec "(SUPPRIMÉ)"
3. Ces éléments peuvent être sélectionnés et modifiés normalement
4. Les calculs incluent ces éléments supprimés

### **Pour le Développeur**
- **API** : Ajouter `devis_id` et `include_deleted=true` aux requêtes
- **Frontend** : Vérifier `devisId` pour activer le mode modification
- **Styling** : Utiliser les classes CSS pour les éléments supprimés

## 🔧 **Commandes de Test**

```bash
# Tester l'API avec les nouveaux paramètres
curl "http://localhost:8000/api/parties/?devis_id=123&include_deleted=true"
curl "http://localhost:8000/api/sous-parties/?devis_id=123&include_deleted=true"
curl "http://localhost:8000/api/ligne-details/?devis_id=123&include_deleted=true"
```

## ⚠️ **Points d'Attention**

1. **Performance** : Le filtrage par devis peut être coûteux sur de gros volumes
2. **Cohérence** : S'assurer que les éléments supprimés restent cohérents
3. **Interface** : L'utilisateur doit comprendre que les éléments sont supprimés
4. **Sauvegarde** : Les modifications sur les éléments supprimés sont sauvegardées

## 🎯 **Prochaines Améliorations Possibles**

1. **Bouton "Restaurer"** : Pour réactiver les éléments supprimés
2. **Filtre visuel** : Option pour masquer/afficher les éléments supprimés
3. **Historique** : Traçabilité des modifications sur les éléments supprimés
4. **Validation** : Vérification de la cohérence des données
