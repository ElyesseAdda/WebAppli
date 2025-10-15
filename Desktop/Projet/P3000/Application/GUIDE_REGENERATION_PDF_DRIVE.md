# 🔄 Guide du Système Universel de Régénération de PDFs dans le Drive

## 📋 Vue d'ensemble

Ce guide explique comment utiliser le système universel de régénération de PDFs dans le Drive, qui permet de mettre à jour facilement tous les documents après modification d'un template HTML.

---

## 🎯 Fonctionnalités

Le système permet de **régénérer n'importe quel type de document PDF** dans le Drive :

- ✅ **Situations**
- ✅ **Contrats de sous-traitance**
- ✅ **Avenants de sous-traitance**
- ✅ **Bons de commande**
- ✅ **Factures**
- ✅ **Devis travaux** (à implémenter)
- ✅ **Devis marché** (à implémenter)

---

## 🖱️ **Utilisation via l'interface (Boutons)**

### **1. Situations**

#### **Liste des situations** (`/ListeSituation`)
- Un bouton icône 🔄 apparaît à côté du bouton de suppression
- Cliquez dessus pour régénérer la situation dans le Drive
- L'ancien fichier est automatiquement déplacé dans le dossier `Historique`

#### **Situations d'un chantier** (onglet Chantier)
- Même fonctionnement que la liste principale

### **2. Contrats et Avenants de Sous-traitance**

#### **Modal de sous-traitance**
- Dans le tableau des contrats et avenants
- Un bouton icône 🔄 apparaît dans la colonne "Actions"
- Régénère le contrat ou l'avenant sélectionné

### **3. Bons de Commande**

#### **Liste des bons de commande** (`/ListeBonCommande`)
- Cliquez sur le menu ⋮ (trois points)
- Sélectionnez **"Régénérer dans le Drive"**
- Confirmation requise avant régénération

### **4. Factures**

*(À implémenter - même logique que les bons de commande)*

---

## 💻 **Utilisation via la ligne de commande (Script de régénération en masse)**

Le script `regenerate_pdfs.py` permet de régénérer **plusieurs documents en une seule fois**.

### **Commandes de base**

```bash
# Voir ce qui serait régénéré (mode simulation)
python manage.py regenerate_pdfs --type=situation --dry-run

# Régénérer toutes les situations
python manage.py regenerate_pdfs --type=situation

# Régénérer tous les contrats de sous-traitance
python manage.py regenerate_pdfs --type=contrat_sous_traitance

# Régénérer tous les avenants
python manage.py regenerate_pdfs --type=avenant_sous_traitance

# Régénérer tous les bons de commande
python manage.py regenerate_pdfs --type=bon_commande

# Régénérer toutes les factures
python manage.py regenerate_pdfs --type=facture

# Régénérer TOUS les types de documents
python manage.py regenerate_pdfs --type=all
```

### **Options de filtrage**

```bash
# Filtrer par chantier
python manage.py regenerate_pdfs --type=situation --chantier=123

# Limiter le nombre de documents
python manage.py regenerate_pdfs --type=situation --limit=10

# Combiner plusieurs options
python manage.py regenerate_pdfs --type=situation --chantier=123 --limit=5 --dry-run
```

### **Options disponibles**

| Option | Description | Exemple |
|--------|-------------|---------|
| `--type` | Type de document (obligatoire) | `--type=situation` |
| `--chantier` | ID du chantier | `--chantier=123` |
| `--dry-run` | Mode simulation (aucun changement) | `--dry-run` |
| `--limit` | Nombre max de documents | `--limit=10` |

---

## 🛠️ **Pour les développeurs**

### **Architecture du système**

```
frontend/
├── src/
│   ├── config/
│   │   └── documentTypeConfig.js     # Configuration des types de documents
│   ├── hooks/
│   │   └── useRegeneratePDF.js       # Hook pour la logique de régénération
│   └── components/
│       └── shared/
│           └── RegeneratePDFButton.js # Composant bouton réutilisable

api/
└── management/
    └── commands/
        └── regenerate_pdfs.py         # Script de régénération en masse
```

### **Ajouter un nouveau type de document**

#### **1. Configuration** (`documentTypeConfig.js`)

```javascript
export const DOCUMENT_TYPES = {
  // ... types existants
  NOUVEAU_TYPE: 'nouveau_type',
};

export const DOCUMENT_CONFIG = {
  // ... configs existantes
  [DOCUMENT_TYPES.NOUVEAU_TYPE]: {
    label: 'Nouveau Type',
    endpoint: '/api/generate-nouveau-type-pdf-drive/',
    icon: '📄',
    confirmMessage: 'Êtes-vous sûr de vouloir régénérer ce document ?',
    successMessage: 'Document régénéré avec succès',
    errorMessage: 'Erreur lors de la régénération',
    buildParams: (documentData) => ({
      document_id: documentData.id,
      // ... autres paramètres
      force_replace: true,
    }),
  },
};
```

#### **2. Intégration dans l'interface**

```javascript
import { RegeneratePDFIconButton } from '../shared/RegeneratePDFButton';
import { DOCUMENT_TYPES } from '../config/documentTypeConfig';

// Dans votre composant de liste
<RegeneratePDFIconButton
  documentType={DOCUMENT_TYPES.NOUVEAU_TYPE}
  documentData={document}
  size="small"
  color="primary"
  onSuccess={() => console.log('✅ Régénéré avec succès')}
/>
```

#### **3. Ajouter au script de régénération**

Dans `regenerate_pdfs.py` :

```python
def add_arguments(self, parser):
    parser.add_argument(
        '--type',
        choices=[
            # ... types existants
            'nouveau_type',
        ],
    )

def handle(self, *args, **options):
    # ... code existant
    elif doc_type == 'nouveau_type':
        self.regenerate_nouveau_type(chantier_id, dry_run, limit)

def regenerate_nouveau_type(self, chantier_id=None, dry_run=False, limit=None):
    # Implémentation similaire aux autres méthodes
    pass
```

---

## 📊 **Variantes du bouton**

### **Bouton icône** (par défaut)
```javascript
<RegeneratePDFIconButton
  documentType={DOCUMENT_TYPES.SITUATION}
  documentData={situation}
/>
```

### **Bouton texte** (outlined)
```javascript
<RegeneratePDFTextButton
  documentType={DOCUMENT_TYPES.SITUATION}
  documentData={situation}
  label="Régénérer"
/>
```

### **Bouton plein** (contained)
```javascript
<RegeneratePDFFullButton
  documentType={DOCUMENT_TYPES.SITUATION}
  documentData={situation}
  label="Régénérer dans le Drive"
/>
```

### **Personnalisation**
```javascript
<RegeneratePDFButton
  documentType={DOCUMENT_TYPES.SITUATION}
  documentData={situation}
  variant="outlined"
  size="large"
  color="secondary"
  showConfirm={false}  // Pas de confirmation
  tooltipPlacement="bottom"
  onSuccess={(data) => {
    console.log('Succès!', data);
    // Recharger la liste, etc.
  }}
  onError={(error) => {
    console.error('Erreur!', error);
  }}
  disabled={!canRegenerate}
  sx={{ ml: 2 }}
/>
```

---

## ⚠️ **Points importants**

### **1. Gestion des fichiers existants**
- Le système utilise `force_replace=true` par défaut
- L'ancien fichier est déplacé dans `Historique` (suppression auto après 30 jours)
- Aucune perte de données

### **2. Sécurité**
- Une confirmation est demandée avant chaque régénération (via l'interface)
- Mode `--dry-run` disponible pour tester sans modifier

### **3. Performance**
- La régénération est asynchrone
- Un indicateur de chargement est affiché pendant le traitement
- Pour les régénérations en masse, utiliser le script avec `--limit`

### **4. Erreurs courantes**

**Erreur 404 : Document not found**
- Vérifiez que le document existe dans la base de données
- Vérifiez les paramètres passés (IDs corrects)

**Erreur 500 : Server error**
- Vérifiez les logs du serveur
- Vérifiez que tous les champs requis sont présents dans `documentData`

**Template non mis à jour**
- Videz le cache du navigateur
- Redémarrez le serveur Django

---

## 📝 **Exemples d'utilisation**

### **Scénario 1 : Modification du template de situation**

1. Modifiez `frontend/templates/preview_situation.html`
2. Testez sur une situation via le bouton dans l'interface
3. Si OK, régénérez toutes les situations :
   ```bash
   python manage.py regenerate_pdfs --type=situation
   ```

### **Scénario 2 : Correction d'un seul contrat**

1. Ouvrez la modal de sous-traitance
2. Trouvez le contrat à corriger
3. Cliquez sur le bouton 🔄 dans la colonne Actions
4. Confirmez la régénération

### **Scénario 3 : Mise à jour d'un chantier spécifique**

```bash
# Tester d'abord
python manage.py regenerate_pdfs --type=all --chantier=45 --dry-run

# Si OK, exécuter
python manage.py regenerate_pdfs --type=all --chantier=45
```

---

## 🔧 **Dépannage**

### **Le bouton n'apparaît pas**
- Vérifiez que le composant est bien importé
- Vérifiez la console navigateur pour les erreurs
- Redémarrez le serveur de développement React

### **La régénération échoue**
- Vérifiez les logs du serveur Django
- Vérifiez que l'endpoint API existe
- Vérifiez les paramètres dans `buildParams()`

### **L'ancien fichier n'est pas remplacé**
- Vérifiez que `force_replace: true` est bien défini
- Vérifiez les logs S3 dans la console serveur

---

## 📞 **Support**

Pour toute question ou problème :
1. Vérifiez d'abord ce guide
2. Consultez les logs serveur
3. Contactez l'équipe de développement

---

**Date de création** : Octobre 2025  
**Dernière mise à jour** : Octobre 2025  
**Version** : 1.0

