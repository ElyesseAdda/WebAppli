# Structure du Projet P3000

Ce document décrit l'organisation du projet et les conventions à suivre pour maintenir une structure claire et cohérente.

## 📁 Structure Générale du Projet

```
Application/
├── api/                    # Backend Django (API REST)
├── frontend/               # Frontend React
├── Application/           # Configuration Django principale
├── staticfiles/           # Fichiers statiques compilés
└── manage.py              # Script de gestion Django
```

---

## 🎨 Frontend (React)

### Structure des dossiers

```
frontend/src/
├── components/            # Composants React
│   ├── Dashboard/        # Composants du dashboard
│   │   ├── Dashboard.js                    # Composant principal
│   │   ├── DashboardFiltersContext.js      # Contexte React pour les filtres
│   │   └── ExampleChildComponent.js        # Exemple d'utilisation des filtres
│   ├── chantier/         # Composants liés aux chantiers
│   ├── Devis/            # Composants liés aux devis
│   ├── DriveV2/           # Composants du gestionnaire de fichiers
│   ├── ModifDevis/       # Composants de modification de devis
│   ├── shared/           # Composants partagés
│   └── [Autres composants]/
├── hooks/                 # Hooks React personnalisés
├── services/              # Services API (appels HTTP)
├── styles/                # Styles CSS et composants de style
├── utils/                 # Utilitaires et helpers
├── config/               # Fichiers de configuration
├── img/                   # Images statiques
└── App.js                 # Point d'entrée de l'application
```

### 📍 Où créer les fichiers frontend

#### **Composants React**

**Composants principaux (pages)**
- **Emplacement** : `frontend/src/components/`
- **Convention** : Nom en PascalCase, ex: `Dashboard.js`, `ListeChantier.js`
- **Exemples** :
  - `Dashboard.js` → Page principale du dashboard
  - `ListeChantier.js` → Liste des chantiers
  - `CreationDevis.js` → Création d'un devis

**Composants de module (groupés par fonctionnalité)**
- **Emplacement** : `frontend/src/components/[ModuleName]/`
- **Convention** : Créer un dossier avec la première lettre en majuscule
- **Exemples** :
  - `frontend/src/components/Dashboard/` → Tous les composants du dashboard
  - `frontend/src/components/chantier/` → Composants liés aux chantiers
  - `frontend/src/components/Devis/` → Composants liés aux devis

**Contexte React pour partager l'état entre composants**
- **Emplacement** : `frontend/src/components/[ModuleName]/[ModuleName]FiltersContext.js` ou similaire
- **Convention** : Nom en PascalCase avec suffixe `Context.js`
- **Exemples** :
  - `frontend/src/components/Dashboard/DashboardFiltersContext.js` → Contexte pour les filtres du Dashboard
- **Utilisation** : Utiliser React Context pour partager des filtres ou états entre composants parents et enfants
- **Pattern** : Créer un Provider et un hook personnalisé (ex: `useDashboardFilters()`)

**Sous-composants d'un module**
- **Emplacement** : `frontend/src/components/[ModuleName]/[SousModule]/`
- **Exemples** :
  - `frontend/src/components/chantier/TableauSousTraitant/` → Composants du tableau sous-traitant
  - `frontend/src/components/chantier/TableauFournisseur/` → Composants du tableau fournisseur

**Composants partagés (réutilisables)**
- **Emplacement** : `frontend/src/components/shared/`
- **Utilisation** : Composants utilisés dans plusieurs modules
- **Exemples** : Modals génériques, composants UI réutilisables

#### **Hooks personnalisés**

- **Emplacement** : `frontend/src/hooks/`
- **Convention** : Nom commençant par `use`, ex: `useAuth.js`, `useRegeneratePDF.js`
- **Exemples** :
  - `useAuth.js` → Gestion de l'authentification
  - `useRegeneratePDF.js` → Régénération de PDF
  - `useSituationsManager.js` → Gestion des situations

#### **Services API**

- **Emplacement** : `frontend/src/services/`
- **Convention** : Nom en camelCase avec suffixe `Service`, ex: `authService.js`
- **Exemples** :
  - `authService.js` → Appels API d'authentification
  - `chantierService.js` → Appels API des chantiers
  - `bonCommandeService.js` → Appels API des bons de commande

#### **Styles**

- **Emplacement** : `frontend/src/styles/`
- **Types de fichiers** :
  - `.css` → Styles CSS classiques
  - `.js` → Composants de style (ex: `tableStyles.js` pour Material-UI)

#### **Utilitaires**

- **Emplacement** : `frontend/src/utils/`
- **Convention** : Fonctions helper, helpers de formatage, etc.
- **Exemples** : Formatage de dates, validation, calculs

#### **Configuration**

- **Emplacement** : `frontend/src/config/`
- **Exemples** : Configuration des types de documents, constantes

### 🎛️ Système de Filtres du Dashboard

Le Dashboard utilise un système de filtres centralisé basé sur React Context pour partager les filtres entre tous les composants enfants.

#### **Structure des fichiers**

```
frontend/src/components/Dashboard/
├── Dashboard.js                    # Composant principal avec DashboardFiltersProvider
├── DashboardFiltersContext.js      # Contexte React et hook useDashboardFilters()
└── [Autres composants enfants]     # Composants qui utilisent les filtres
```

#### **Utilisation du système de filtres**

**1. Dans le composant parent (Dashboard.js)**
```javascript
import { DashboardFiltersProvider } from "./DashboardFiltersContext";

const Dashboard = () => {
  return (
    <DashboardFiltersProvider>
      {/* Composants enfants avec accès aux filtres */}
    </DashboardFiltersProvider>
  );
};
```

**2. Dans un composant enfant**
```javascript
import { useDashboardFilters } from "./DashboardFiltersContext";

const MonComposant = () => {
  const { selectedYear, updateYear } = useDashboardFilters();

  useEffect(() => {
    // Recharger les données quand l'année change
    fetchData(selectedYear);
  }, [selectedYear]);

  return <div>Année : {selectedYear}</div>;
};
```

#### **Filtres disponibles**

- **selectedYear** : Année sélectionnée (par défaut : année courante)
- **updateYear(year)** : Fonction pour mettre à jour l'année

#### **Ajouter un nouveau filtre**

Pour ajouter un nouveau filtre (ex: mois, chantier) :

1. **Modifier `DashboardFiltersContext.js`** :
```javascript
const [selectedMonth, setSelectedMonth] = useState(null);

const value = {
  selectedYear,
  selectedMonth,  // Nouveau filtre
  updateYear,
  updateMonth: (month) => setSelectedMonth(month),  // Nouvelle fonction
};
```

2. **Ajouter le sélecteur dans `DashboardFilters`** :
```javascript
<FormControl size="small" sx={{ minWidth: 150 }}>
  <InputLabel>Mois</InputLabel>
  <Select value={selectedMonth} onChange={(e) => updateMonth(e.target.value)}>
    {/* Options */}
  </Select>
</FormControl>
```

3. **Utiliser dans les composants enfants** :
```javascript
const { selectedYear, selectedMonth } = useDashboardFilters();
```

### 📝 Conventions de nommage Frontend

- **Composants** : PascalCase (`Dashboard.js`, `ChantierInfo.js`)
- **Hooks** : camelCase avec préfixe `use` (`useAuth.js`)
- **Services** : camelCase avec suffixe `Service` (`authService.js`)
- **Utilitaires** : camelCase (`formatDate.js`, `validateForm.js`)
- **Dossiers de modules** : Première lettre en majuscule (`Dashboard/`, `Devis/`)

---

## 🔧 Backend (Django)

### Structure des dossiers

```
api/
├── dashboard/             # Vues dédiées au dashboard
│   ├── __init__.py
│   └── views.py
├── views_drive/          # Vues pour le gestionnaire de fichiers
├── management/           # Commandes Django personnalisées
│   └── commands/
├── migrations/           # Migrations de base de données
├── templatetags/        # Template tags personnalisés
├── signaledrive/        # Signaux et automation Drive
├── models.py             # Modèles de données
├── serializers.py        # Serializers DRF
├── views.py              # Vues principales
├── urls.py               # Configuration des URLs
├── admin.py              # Configuration admin Django
└── [Autres fichiers de vues spécialisées]
```

### 📍 Où créer les fichiers backend

#### **Vues (Views)**

**Vues principales**
- **Emplacement** : `api/views.py`
- **Utilisation** : Vues générales, ViewSets principaux
- **Note** : Ce fichier peut devenir volumineux, préférez créer des modules séparés pour les nouvelles fonctionnalités

**Vues dédiées à un module**
- **Emplacement** : `api/[module_name]_views.py` ou `api/[module_name]/views.py`
- **Convention** : Nom en snake_case avec suffixe `_views.py`
- **Exemples** :
  - `api/dashboard/views.py` → Vues du dashboard (supporte les paramètres de filtrage : year, month, chantier_id)
  - `api/Devis_views.py` → Vues des devis
  - `api/SituationViews.py` → Vues des situations
  - `api/drive_views.py` → Vues du gestionnaire de fichiers

**Vues de modification spécialisées**
- **Emplacement** : `api/[module_name]_modification_views.py`
- **Exemples** :
  - `api/devis_modification_views.py` → Modification de devis
  - `api/situation_modification_views.py` → Modification de situations
  - `api/bon_commande_modification_views.py` → Modification de bons de commande

**Vues groupées dans un dossier**
- **Emplacement** : `api/[module_name]/views.py`
- **Utilisation** : Quand un module nécessite plusieurs fichiers
- **Exemples** :
  - `api/dashboard/views.py` → Dashboard avec plusieurs vues
  - `api/views_drive/views.py` → Gestionnaire de fichiers

#### **Modèles (Models)**

- **Emplacement** : `api/models.py`
- **Convention** : Classes en PascalCase
- **Note** : Tous les modèles sont dans ce fichier pour maintenir la cohérence

#### **Serializers**

- **Emplacement** : `api/serializers.py`
- **Convention** : Classes en PascalCase avec suffixe `Serializer`
- **Exemples** : `ChantierSerializer`, `DevisSerializer`

#### **URLs**

- **Emplacement** : `api/urls.py`
- **Convention** : Importer les vues depuis leurs modules respectifs
- **Exemple** :
  ```python
  from .dashboard.views import DashboardViewSet
  from .Devis_views import preview_devis_v2
  ```

#### **Commandes de gestion (Management Commands)**

- **Emplacement** : `api/management/commands/`
- **Convention** : Nom en snake_case, classe en PascalCase
- **Exemples** :
  - `create_test_users.py` → Création d'utilisateurs de test
  - `regenerate_pdfs.py` → Régénération de PDFs

#### **Utilitaires**

- **Emplacement** : `api/[module_name]_utils.py` ou `api/utils.py`
- **Exemples** :
  - `api/utils.py` → Utilitaires généraux
  - `api/ecole_utils.py` → Utilitaires spécifiques à l'école

#### **Middleware**

- **Emplacement** : `api/middleware.py` ou `api/[name]_middleware.py`
- **Exemples** :
  - `api/middleware.py` → Middleware général
  - `api/onlyoffice_middleware.py` → Middleware OnlyOffice

### 📝 Conventions de nommage Backend

- **Fichiers Python** : snake_case (`devis_views.py`, `situation_views.py`)
- **Classes** : PascalCase (`DashboardViewSet`, `ChantierSerializer`)
- **Fonctions** : snake_case (`get_chantier_stats`, `create_devis`)
- **Variables** : snake_case (`chantier_id`, `montant_ttc`)
- **Dossiers de modules** : snake_case (`dashboard/`, `views_drive/`)

---

## 🎯 Règles de Structure

### Quand créer un nouveau dossier de module ?

**Frontend** : Créer un dossier quand :
- Un module a plus de 3-4 composants liés
- Les composants partagent une logique commune
- Le module nécessite des sous-composants

**Backend** : Créer un dossier quand :
- Un module nécessite plusieurs fichiers de vues
- Le module a des utilitaires dédiés
- Le module nécessite une organisation complexe

### Quand créer un fichier séparé ?

**Frontend** :
- Composant réutilisable → `shared/`
- Hook personnalisé → `hooks/`
- Service API → `services/`
- Utilitaire → `utils/`

**Backend** :
- Vues spécialisées → `[module]_views.py`
- Vues de modification → `[module]_modification_views.py`
- Utilitaires spécifiques → `[module]_utils.py`

### Organisation des imports

**Frontend** :
```javascript
// 1. Imports React
import React, { useState, useEffect } from "react";

// 2. Imports Material-UI
import { Box, Button, Paper } from "@mui/material";

// 3. Imports de services/utilitaires
import axios from "axios";
import { useAuth } from "../hooks/useAuth";

// 4. Imports de composants locaux
import FactureModal from "./FactureModal";
import DatePaiementModal from "./DatePaiementModal";
```

**Backend** :
```python
# 1. Imports Django
from django.db.models import Sum, Q
from django.utils import timezone

# 2. Imports DRF
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

# 3. Imports locaux
from ..models import Chantier, Facture
from ..serializers import ChantierSerializer
```

---

## 📋 Checklist pour créer un nouveau module

### Frontend

- [ ] Créer le dossier dans `frontend/src/components/[ModuleName]/`
- [ ] Créer le composant principal `[ModuleName].js`
- [ ] Créer les sous-composants si nécessaire dans `[ModuleName]/[SousComposant]/`
- [ ] Créer un service dans `frontend/src/services/[moduleName]Service.js` si nécessaire
- [ ] Créer des hooks dans `frontend/src/hooks/use[ModuleName].js` si nécessaire
- [ ] Ajouter la route dans `frontend/src/components/App.js`
- [ ] Importer et utiliser le composant

### Backend

- [ ] Créer le dossier `api/[module_name]/` si nécessaire
- [ ] Créer `api/[module_name]/views.py` ou `api/[module_name]_views.py`
- [ ] Créer les serializers dans `api/serializers.py` si nécessaire
- [ ] Ajouter les URLs dans `api/urls.py`
- [ ] Importer les vues dans `api/urls.py`

---

## 🔍 Exemples Concrets

### Exemple 1 : Créer un nouveau module "Rapports"

**Frontend** :
```
frontend/src/components/
└── Rapports/
    ├── Rapports.js              # Composant principal
    ├── RapportChantier.js       # Sous-composant
    └── RapportFinancier.js      # Sous-composant
```

**Backend** :
```
api/
└── rapports/
    ├── __init__.py
    └── views.py                 # RapportViewSet
```

**URLs** :
```python
# api/urls.py
from .rapports.views import RapportViewSet

urlpatterns = [
    path('rapports/', RapportViewSet.as_view({'get': 'list'})),
]
```

### Exemple 2 : Créer un composant partagé

**Frontend** :
```
frontend/src/components/
└── shared/
    └── ConfirmDialog.js         # Dialog de confirmation réutilisable
```

**Utilisation** :
```javascript
import ConfirmDialog from "../shared/ConfirmDialog";
```

### Exemple 3 : Utiliser le système de filtres du Dashboard

**Frontend** :
```javascript
// Dashboard.js
import { DashboardFiltersProvider } from "./DashboardFiltersContext";

const Dashboard = () => {
  return (
    <DashboardFiltersProvider>
      <DashboardFilters />
      <DashboardContent />
      <MonComposantEnfant />
    </DashboardFiltersProvider>
  );
};

// MonComposantEnfant.js
import { useDashboardFilters } from "./DashboardFiltersContext";

const MonComposantEnfant = () => {
  const { selectedYear } = useDashboardFilters();
  
  return <div>Données pour l'année {selectedYear}</div>;
};
```

**Backend** :
```python
# api/dashboard/views.py
def list(self, request):
    # Récupérer les paramètres de filtrage
    year_param = request.query_params.get('year')
    year = int(year_param) if year_param else datetime.now().year
    
    # Utiliser year pour filtrer les données
    # ...
```

---

## 📚 Bonnes Pratiques

1. **Séparation des responsabilités** : Un composant = une responsabilité
2. **Réutilisabilité** : Créer des composants partagés pour éviter la duplication
3. **Nommage clair** : Les noms doivent être explicites et descriptifs
4. **Organisation logique** : Grouper les fichiers par fonctionnalité, pas par type
5. **Documentation** : Commenter le code complexe et les décisions importantes
6. **Cohérence** : Suivre les conventions établies dans ce document

---

## 🔄 Maintenance

Ce document doit être mis à jour lorsque :
- Une nouvelle structure de module est créée
- De nouvelles conventions sont établies
- Des changements majeurs dans l'organisation sont effectués

**Dernière mise à jour** : Décembre 2024

### 📝 Notes de mise à jour

**Décembre 2024** :
- Ajout du système de filtres centralisé pour le Dashboard
- Création de `DashboardFiltersContext.js` pour partager les filtres entre composants
- Support du paramètre `year` dans l'API dashboard
- Documentation du pattern Context pour les filtres partagés

