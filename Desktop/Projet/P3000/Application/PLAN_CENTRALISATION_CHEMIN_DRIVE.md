# Plan de Centralisation du Chemin Drive par Chantier

## 📋 Objectif

Centraliser le stockage du chemin relatif du drive pour chaque chantier et appel d'offres dans la base de données afin d'éviter les erreurs et d'assurer la cohérence dans toute l'application.

---

## 🎯 Récapitulatif du Workflow Complet

### Vue d'Ensemble du Système

```
┌─────────────────────────────────────────────────────────────────┐
│                    CRÉATION D'APPEL D'OFFRES                     │
│                    (depuis DevisAvance.js)                       │
└─────────────────────────────────────────────────────────────────┘
                         │
                         ▼
            ┌────────────────────────┐
            │ Utilisateur peut voir   │
            │ et modifier le chemin   │
            │ via DrivePathSelector   │
            └────────────────────────┘
                         │
            ┌────────────┴────────────┐
            │                         │
            ▼                         ▼
    ┌──────────────┐         ┌──────────────┐
    │ Chemin       │         │ Chemin        │
    │ modifié ?    │         │ non modifié ? │
    └──────────────┘         └──────────────┘
            │                         │
            ▼                         ▼
    ┌──────────────┐         ┌──────────────┐
    │ drive_path   │         │ drive_path     │
    │ = chemin     │         │ = NULL         │
    │ personnalisé│         │ (calcul auto)  │
    └──────────────┘         └──────────────┘
            │                         │
            └────────────┬────────────┘
                         │
                         ▼
            ┌────────────────────────┐
            │ AppelOffres créé avec  │
            │ drive_path (ou NULL)   │
            └────────────────────────┘
                         │
                         ▼
    ┌─────────────────────────────────────┐
    │ GÉNÉRATION DE DOCUMENTS              │
    │ (devis, etc.)                        │
    │                                      │
    │ Chemin utilisé :                     │
    │ Appels_Offres/{drive_path}/Devis/    │
    └─────────────────────────────────────┘
                         │
                         ▼
    ┌─────────────────────────────────────┐
    │ VALIDATION DE L'APPEL D'OFFRES       │
    │ (statut = "valide")                  │
    └─────────────────────────────────────┘
                         │
                         ▼
    ┌─────────────────────────────────────┐
    │ TRANSFORMATION EN CHANTIER          │
    │ (depuis GestionAppelsOffres.js)     │
    │                                      │
    │ 1. Chantier créé                    │
    │ 2. drive_path copié :               │
    │    chantier.drive_path =            │
    │    appel_offres.drive_path          │
    │ 3. Fichiers transférés :            │
    │    Appels_Offres/{chemin}/          │
    │    → Chantiers/{chemin}/            │
    └─────────────────────────────────────┘
                         │
                         ▼
    ┌─────────────────────────────────────┐
    │ GÉNÉRATION DE DOCUMENTS DU CHANTIER │
    │                                      │
    │ Tous les documents utilisent :      │
    │ Chantiers/{drive_path}/{type}/      │
    │                                      │
    │ Types de documents :                 │
    │ - Factures → /Facture/              │
    │ - Devis → /Devis/                   │
    │ - Situations → /Situation/          │
    │ - Contrats ST → /Sous_Traitant/     │
    │ - Avenants → /Documents_Execution/  │
    │ - Bons de commande → /Bon_Commande/ │
    └─────────────────────────────────────┘
```

### Points Clés du Workflow

1. **Appels d'Offres** :
   - Chemin stocké dans `appel_offres.drive_path`
   - Documents stockés dans : `Appels_Offres/{drive_path}/{type}/`
   - Si `drive_path` est NULL → calcul automatique : `{societe_slug}/{chantier_slug}`

2. **Transformation en Chantier** :
   - Le `drive_path` est **copié** de l'appel d'offres vers le chantier
   - Les fichiers sont **transférés** de `Appels_Offres/{chemin}/` vers `Chantiers/{chemin}/`
   - La structure des dossiers est **préservée**

3. **Chantiers** :
   - Chemin stocké dans `chantier.drive_path`
   - Documents stockés dans : `Chantiers/{drive_path}/{type}/{sous_dossier}/`
   - Si `drive_path` est NULL → calcul automatique : `{societe_slug}/{chantier_slug}`

4. **Modification du Chemin** :
   - Possible depuis "Chemins Drive" dans la sidebar
   - Possible lors de la création depuis DevisAvance
   - Le chemin modifié est **persistant** et ne change pas si le nom change

---

## 🔍 Analyse de la Situation Actuelle

### État Actuel
- Le chemin du drive est **calculé dynamiquement** à partir de :
  - `societe.nom_societe` (slugifié)
  - `chantier.chantier_name` (slugifié)
- Format actuel : `Chantiers/{societe_slug}/{chantier_slug}`
- Le chemin est recalculé à chaque utilisation dans différents endroits :
  - `api/pdf_manager.py` (méthode `get_s3_folder_path`)
  - `api/views.py` (fonction `get_chantiers_drive_paths`)
  - `frontend/src/components/chantier/ChantierInfoTab.js`
  - `api/drive_automation.py`
  - Et d'autres endroits...

### Problèmes Identifiés
1. ❌ **Incohérence** : Le chemin peut varier si le nom de la société ou du chantier change
2. ❌ **Duplication de code** : La logique de calcul est répétée dans plusieurs fichiers
3. ❌ **Risque d'erreurs** : Si la fonction `custom_slugify` change, tous les chemins changent
4. ❌ **Pas de personnalisation** : Impossible de définir un chemin personnalisé différent du calcul automatique

---

## 🎯 Solution Proposée

### 1. Ajout d'un Champ dans les Modèles Chantier et AppelOffres

**Fichier : `api/models.py`**

#### 1.1. Modèle Chantier

Ajouter un champ `drive_path` dans le modèle `Chantier` :
- Type : `CharField(max_length=500)`
- Nullable : `True` (pour les chantiers existants)
- Blank : `True`
- Default : `None` (vide par défaut, calculé automatiquement si nécessaire)

**Réponses confirmées :**
- ✅ Longueur maximale : **500 caractères**
- ✅ Modifiable manuellement : **Oui, depuis l'interface "Chemins Drive"**
- ✅ Validation : **Oui, interdire les caractères spéciaux non gérés par AWS**
- ✅ Un seul champ : **Oui, avec logique de fallback** (si vide, calculer automatiquement)

### 2. Migration de la Base de Données

**Fichier : `api/migrations/XXXX_add_drive_path_to_chantier_and_appel_offres.py`**

Étapes :
1. Créer une migration pour ajouter le champ `drive_path` dans **Chantier** et **AppelOffres**
2. ❌ **PAS de migration de données** : Les anciens chantiers/appels d'offres gardent leur `drive_path = NULL`
3. Le calcul automatique se fera à la volée via `get_drive_path()`

**Code de migration de schéma :**
```python
from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('api', 'XXXX_previous_migration'),
    ]

    operations = [
        migrations.AddField(
            model_name='chantier',
            name='drive_path',
            field=models.CharField(
                blank=True,
                help_text="Chemin personnalisé dans le drive. Si vide, sera calculé automatiquement à partir du nom de la société et du chantier.",
                max_length=500,
                null=True,
                verbose_name='Chemin du drive'
            ),
        ),
        migrations.AddField(
            model_name='appeloffres',
            name='drive_path',
            field=models.CharField(
                blank=True,
                help_text="Chemin personnalisé dans le drive. Si vide, sera calculé automatiquement à partir du nom de la société et du chantier.",
                max_length=500,
                null=True,
                verbose_name='Chemin du drive'
            ),
        ),
    ]
```

### 3. Modification des Modèles Chantier et AppelOffres

**Fichier : `api/models.py`**

#### 3.1. Modèle Chantier

Ajouter :
- Le champ `drive_path`
- Une méthode `get_drive_path()` qui retourne le chemin personnalisé ou calcule le chemin par défaut

#### 3.2. Modèle AppelOffres

Ajouter :
- Le champ `drive_path`
- Une méthode `get_drive_path()` identique au Chantier

#### 3.3. Modification de la méthode `transformer_en_chantier()`

**Important :** Modifier la méthode `transformer_en_chantier()` dans `AppelOffres` pour :
- Copier le `drive_path` de l'appel d'offres vers le chantier créé
- Si `appel_offres.drive_path` est défini → `chantier.drive_path = appel_offres.drive_path`
- Si `appel_offres.drive_path` est NULL → `chantier.drive_path = NULL` (calcul automatique)

**Code à implémenter :**
```python
class Chantier(models.Model):
    # ... champs existants ...
    drive_path = models.CharField(
        max_length=500,
        blank=True,
        null=True,
        verbose_name="Chemin du drive",
        help_text="Chemin personnalisé dans le drive. Si vide, sera calculé automatiquement à partir du nom de la société et du chantier."
    )
    
    def get_drive_path(self):
        """
        Retourne le chemin du drive (personnalisé ou calculé).
        
        Priorité :
        1. Si drive_path est défini → retourne drive_path
        2. Sinon → calcule automatiquement {societe_slug}/{chantier_slug}
        3. Si pas de société → retourne None
        """
        if self.drive_path and self.drive_path.strip():
            return self.drive_path.strip()
        # Calculer le chemin par défaut
        if self.societe:
            from api.utils import custom_slugify
            societe_slug = custom_slugify(self.societe.nom_societe)
            chantier_slug = custom_slugify(self.chantier_name)
            return f"{societe_slug}/{chantier_slug}"
        return None
    
    def validate_drive_path(self, value):
        """
        Valide le format du chemin drive.
        Interdit les caractères spéciaux non gérés par AWS S3.
        """
        if not value:
            return value
        
        # Caractères interdits par AWS S3
        forbidden_chars = ['\\', ':', '*', '?', '"', '<', '>', '|', '\x00', '\x01']
        for char in forbidden_chars:
            if char in value:
                raise ValidationError(
                    f"Le chemin contient un caractère interdit : '{char}'. "
                    f"Caractères interdits : {', '.join(forbidden_chars)}"
                )
        
        # Vérifier que le chemin ne commence/termine pas par /
        value = value.strip('/')
        
        return value
```

#### 1.2. Modèle AppelOffres

Ajouter un champ `drive_path` dans le modèle `AppelOffres` (identique au Chantier) :

```python
class AppelOffres(models.Model):
    # ... champs existants ...
    drive_path = models.CharField(
        max_length=500,
        blank=True,
        null=True,
        verbose_name="Chemin du drive",
        help_text="Chemin personnalisé dans le drive. Si vide, sera calculé automatiquement à partir du nom de la société et du chantier."
    )
    
    def get_drive_path(self):
        """
        Retourne le chemin du drive (personnalisé ou calculé).
        
        Priorité :
        1. Si drive_path est défini → retourne drive_path
        2. Sinon → calcule automatiquement {societe_slug}/{chantier_slug}
        3. Si pas de société → retourne None
        """
        if self.drive_path and self.drive_path.strip():
            return self.drive_path.strip()
        # Calculer le chemin par défaut
        if self.societe:
            from api.utils import custom_slugify
            societe_slug = custom_slugify(self.societe.nom_societe)
            chantier_slug = custom_slugify(self.chantier_name)
            return f"{societe_slug}/{chantier_slug}"
        return None
    
    def validate_drive_path(self, value):
        """
        Valide le format du chemin drive.
        Interdit les caractères spéciaux non gérés par AWS S3.
        """
        if not value:
            return value
        
        # Caractères interdits par AWS S3
        forbidden_chars = ['\\', ':', '*', '?', '"', '<', '>', '|', '\x00', '\x01']
        for char in forbidden_chars:
            if char in value:
                raise ValidationError(
                    f"Le chemin contient un caractère interdit : '{char}'. "
                    f"Caractères interdits : {', '.join(forbidden_chars)}"
                )
        
        # Vérifier que le chemin ne commence/termine pas par /
        value = value.strip('/')
        
        return value
```

### 4. Modification des Serializers

**Fichier : `api/serializers.py`**

Ajouter le champ `drive_path` dans :
- `ChantierSerializer` (lecture/écriture)
- `ChantierDetailSerializer` (lecture/écriture)
- `AppelOffresSerializer` (lecture/écriture)

**Réponses confirmées :**
- ✅ Le champ est **modifiable via l'API** (lecture/écriture)
- ✅ Inclure le champ `drive_path` dans les serializers pour permettre la modification

### 5. Modification de la Logique de Génération de PDF

**Fichier : `api/pdf_manager.py`**

Modifier la méthode `get_s3_folder_path()` pour :
1. Vérifier si un `chantier_id` est fourni → utiliser `chantier.get_drive_path()`
2. Vérifier si un `appel_offres_id` est fourni → utiliser `appel_offres.get_drive_path()`
3. Sinon, utiliser le calcul automatique comme avant

**Exemple :**
```python
def get_s3_folder_path(self, document_type: str, societe_name: str, **kwargs) -> str:
    # Si un chemin personnalisé est fourni (depuis DevisAvance), l'utiliser en priorité
    if 'custom_path' in kwargs and kwargs['custom_path']:
        custom_path = kwargs['custom_path'].strip().strip('/')
        subfolder = self.document_type_folders.get(document_type, 'Devis')
        return f"{custom_path}/{subfolder}" if custom_path else subfolder
    
    # Si un appel_offres_id est fourni, utiliser le chemin de l'appel d'offres
    if 'appel_offres_id' in kwargs and kwargs['appel_offres_id']:
        from .models import AppelOffres
        try:
            appel_offres = AppelOffres.objects.get(id=kwargs['appel_offres_id'])
            base_path = appel_offres.get_drive_path()
            if base_path:
                subfolder = self.document_type_folders.get(document_type, 'Devis')
                # ✅ Structure pour appels d'offres : Appels_Offres/{base_path}/{subfolder}
                return f"Appels_Offres/{base_path}/{subfolder}"
        except AppelOffres.DoesNotExist:
            pass
    
    # Si un chantier_id est fourni, utiliser le chemin du chantier
    if 'chantier_id' in kwargs and kwargs['chantier_id']:
        from .models import Chantier
        try:
            chantier = Chantier.objects.get(id=kwargs['chantier_id'])
            base_path = chantier.get_drive_path()
            if base_path:
                subfolder = self.document_type_folders.get(document_type, 'Devis')
                # ✅ Structure pour chantiers : Chantiers/{base_path}/{subfolder}
                # Pour certains types, ajouter un sous-dossier supplémentaire (ex: fournisseur, entreprise)
                if document_type == 'bon_commande' and 'fournisseur_name' in kwargs:
                    fournisseur_slug = custom_slugify(kwargs['fournisseur_name'])
                    return f"Chantiers/{base_path}/{subfolder}/{fournisseur_slug}"
                elif document_type in ['contrat_sous_traitance', 'avenant_sous_traitance'] and 'sous_traitant_name' in kwargs:
                    sous_traitant_slug = custom_slugify(kwargs['sous_traitant_name'])
                    return f"Chantiers/{base_path}/Sous_Traitant/{sous_traitant_slug}"
                return f"Chantiers/{base_path}/{subfolder}"
        except Chantier.DoesNotExist:
            pass
    
    # Fallback : calculer le chemin comme avant
    # ... reste du code existant ...
```

### 6. Modification des Fonctions de Transfert

**Fichier : `api/drive_automation.py`**

#### 6.1. Fonction de Transfert Appel d'Offres → Chantier

Modifier la fonction `transfer_appel_offres_to_chantier()` (ou `copy_appel_offres_to_chantier()`) pour :
- Utiliser `appel_offres.get_drive_path()` au lieu de calculer le chemin source
- Utiliser `chantier.get_drive_path()` au lieu de calculer le chemin destination
- **Source** : `Appels_Offres/{appel_offres.get_drive_path()}/`
- **Destination** : `Chantiers/{chantier.get_drive_path()}/`
- Transférer tous les fichiers et dossiers en préservant la structure

#### 6.2. Nouvelle Fonction : Transfert lors de Modification de Chemin

Créer une nouvelle fonction `transfer_chantier_drive_path()` pour transférer les fichiers lors de la modification du chemin :

```python
def transfer_chantier_drive_path(self, chantier, ancien_chemin: str, nouveau_chemin: str) -> bool:
    """
    Transfère tous les fichiers d'un chantier d'un chemin vers un autre.
    
    Args:
        chantier: Instance Chantier
        ancien_chemin: Ancien chemin (relatif, sans préfixe Chantiers/)
        nouveau_chemin: Nouveau chemin (relatif, sans préfixe Chantiers/)
        
    Returns:
        bool: True si le transfert a réussi
    """
    try:
        # Chemins complets
        source_path = f"Chantiers/{ancien_chemin}"
        dest_path = f"Chantiers/{nouveau_chemin}"
        
        # Créer la structure de destination si nécessaire
        create_s3_folder_recursive(dest_path)
        
        # Lister tout le contenu du dossier source
        content = list_s3_folder_content(source_path)
        
        # Transférer tous les fichiers et dossiers récursivement
        # ... logique de transfert similaire à transfer_appel_offres_to_chantier ...
        
        return True
    except Exception as e:
        print(f"Erreur lors du transfert : {str(e)}")
        return False

def transfer_appel_offres_drive_path(self, appel_offres, ancien_chemin: str, nouveau_chemin: str) -> bool:
    """
    Transfère tous les fichiers d'un appel d'offres d'un chemin vers un autre.
    Même logique que transfer_chantier_drive_path mais pour Appels_Offres.
    """
    # ... logique similaire ...
```

**Code à modifier pour `transfer_appel_offres_to_chantier()` :**
```python
def transfer_appel_offres_to_chantier(self, appel_offres, chantier) -> bool:
    """
    Transfère un appel d'offres vers un chantier en utilisant les drive_path.
    
    Args:
        appel_offres: Instance AppelOffres
        chantier: Instance Chantier
        
    Returns:
        bool: True si le transfert a réussi
    """
    try:
        # Utiliser les drive_path des modèles
        source_base = appel_offres.get_drive_path()
        dest_base = chantier.get_drive_path()
        
        if not source_base or not dest_base:
            raise ValueError("Les chemins source et destination doivent être définis")
        
        # Chemins complets
        source_path = f"Appels_Offres/{source_base}"
        dest_path = f"Chantiers/{dest_base}"
        
        # Créer la structure de destination si nécessaire
        create_s3_folder_recursive(dest_path)
        
        # Lister tout le contenu du dossier source
        content = list_s3_folder_content(source_path)
        
        # Transférer tous les fichiers et dossiers récursivement
        # ... logique de transfert similaire à la fonction existante ...
        
        return True
    except Exception as e:
        print(f"Erreur lors du transfert : {str(e)}")
        return False
```

### 7. Modification des Endpoints API

**Fichiers à modifier :**
- `api/pdf_views.py` : Tous les endpoints de génération de PDF
- `api/views.py` : 
  - Endpoint `get_chantiers_drive_paths` : Utiliser `get_drive_path()` pour chantiers ET appels d'offres
  - Endpoint `transformer_en_chantier` : Utiliser les `drive_path` pour le transfert
  - Endpoint de création/modification de chantier/appel d'offres : Accepter `drive_path`

**Actions :**
- Utiliser `chantier.get_drive_path()` et `appel_offres.get_drive_path()` au lieu de calculer
- Permettre la modification du `drive_path` lors de la création/modification
- Modifier `transformer_en_chantier` pour copier le `drive_path` et utiliser la fonction de transfert mise à jour

### 8. Modification du Frontend

**Fichiers à modifier :**

#### 7.1. ChantiersDrivePaths.js (PRIORITÉ)
- ✅ **Existe déjà** : Interface de visualisation des chemins
- 🔧 **À modifier** :
  - Ajouter un bouton "Modifier" pour chaque chantier
  - Ouvrir un modal avec `DrivePathSelector` (comme dans DevisAvance)
  - Permettre la modification du `drive_path`
  - Ajouter un bouton "Réinitialiser" pour vider le `drive_path` (retour au calcul automatique)
  - Appeler l'API pour mettre à jour le `drive_path` du chantier

#### 7.2. DevisAvance.js (PRIORITÉ pour Appels d'Offres)
- ✅ **Déjà implémenté** : Le composant `DrivePathSelector` existe et fonctionne
- ✅ **Déjà implémenté** : L'affichage et la modification du chemin sont fonctionnels
- 🔧 **À modifier** :
  - Lors de la sauvegarde du devis (`handleSaveDevis`), si `devisType === "chantier"` (appel d'offres) :
    - Si `customDrivePath` est défini (utilisateur a modifié le chemin) :
      - Inclure `drive_path: customDrivePath` dans les données de création de l'appel d'offres
    - Si `customDrivePath` est `null` (utilisateur n'a pas modifié) :
      - Ne pas inclure `drive_path` (reste NULL, calcul automatique)
  - Lors de la sauvegarde du devis, si `devisType === "normal"` (chantier) :
    - Si `customDrivePath` est défini :
      - Inclure `drive_path: customDrivePath` dans les données de création du chantier
    - Si `customDrivePath` est `null` :
      - Ne pas inclure `drive_path` (reste NULL, calcul automatique)

#### 7.3. ChantierInfoTab.js
- 🔧 **À modifier** :
  - Afficher le `drive_path` du chantier (ou le chemin calculé si vide)
  - Utiliser `chantier.get_drive_path()` via l'API au lieu de calculer localement

#### 7.4. ListeDevis.js
- 🔧 **À modifier** :
  - Récupérer le `drive_path` du chantier lors de la génération automatique de PDF
  - Passer le `drive_path` à `generatePDFDrive` si disponible

#### 7.5. Autres composants
- Identifier tous les endroits où le chemin est calculé
- Remplacer par l'utilisation du `drive_path` du chantier via l'API

### 9. Gestion des Signaux Django

**Fichier : `api/signals.py`**

**Réponse confirmée :** ❌ **Ne PAS mettre à jour automatiquement** le `drive_path` si le nom change.

**Comportement :**
- Lors de la création d'un chantier : Le `drive_path` reste **vide (NULL)** par défaut
- Lors de la modification du nom : Le `drive_path` **reste inchangé** (s'il était personnalisé)
- Le calcul automatique se fait uniquement lors de l'utilisation (méthode `get_drive_path()`)

**Pas de signal nécessaire** pour la mise à jour automatique, car :
- Le `drive_path` est laissé vide par défaut
- Le calcul se fait à la volée via `get_drive_path()`
- Seule la modification manuelle depuis "Chemins Drive" enregistre un `drive_path`

### 10. Migration des Données Existantes

**Réponse confirmée :** ✅ **Seulement migrer les nouveaux chantiers** + **Enregistrer lors de la modification manuelle**

**Stratégie :**
- ❌ **Ne PAS** créer de script de migration automatique pour les anciens chantiers
- ✅ Les anciens chantiers gardent leur `drive_path = NULL`
- ✅ Le système calcule automatiquement le chemin pour eux (rétrocompatibilité)
- ✅ Lorsqu'un utilisateur modifie le chemin d'un chantier existant depuis "Chemins Drive", le `drive_path` est enregistré

**Pas de script de migration nécessaire**, car :
- Les anciens chantiers fonctionnent avec le calcul automatique
- Seuls les nouveaux chantiers ou ceux modifiés manuellement auront un `drive_path` défini
- C'est une approche progressive et non intrusive

### 11. Tests et Validation

**Points à tester :**
- [ ] Création d'un **appel d'offres** depuis DevisAvance avec `drive_path` vide (doit calculer automatiquement)
- [ ] Création d'un **appel d'offres** depuis DevisAvance avec `drive_path` personnalisé (doit être enregistré)
- [ ] Génération de PDF pour un appel d'offres (doit utiliser `Appels_Offres/{drive_path}/Devis/`)
- [ ] Transformation d'un appel d'offres en chantier :
  - [ ] Le `drive_path` est copié du appel d'offres vers le chantier
  - [ ] Les fichiers sont transférés de `Appels_Offres/{chemin}` vers `Chantiers/{chemin}`
  - [ ] La structure des dossiers est préservée
- [ ] Création d'un nouveau **chantier** avec `drive_path` vide (doit calculer automatiquement)
- [ ] Création d'un nouveau **chantier** avec `drive_path` personnalisé
- [ ] Modification d'un chantier/appel d'offres existant depuis "Chemins Drive" :
  - [ ] Le transfert des fichiers de l'ancien vers le nouveau chemin fonctionne
  - [ ] Tous les dossiers et fichiers sont transférés (récursif)
  - [ ] La structure est préservée
  - [ ] Le nouveau chemin est enregistré en base de données
  - [ ] Gestion des erreurs si le transfert échoue
- [ ] Génération de PDF avec un chantier ayant un `drive_path` :
  - [ ] Factures : `Chantiers/{drive_path}/Facture/`
  - [ ] Devis : `Chantiers/{drive_path}/Devis/`
  - [ ] Situations : `Chantiers/{drive_path}/Situation/`
  - [ ] Contrats sous-traitants : `Chantiers/{drive_path}/Sous_Traitant/{entreprise}/`
  - [ ] Avenants : `Chantiers/{drive_path}/Documents_Execution/`
  - [ ] Bons de commande : `Chantiers/{drive_path}/Bon_Commande/{fournisseur}/`
- [ ] Génération de PDF avec un chantier/appel d'offres sans `drive_path` (fallback)
- [ ] Compatibilité avec les anciens chantiers/appels d'offres

---

## 📝 Checklist d'Implémentation

### Phase 1 : Préparation ✅
- [x] Définir la longueur maximale du champ `drive_path` → **500 caractères**
- [x] Décider si le champ est modifiable par l'utilisateur → **Oui, depuis "Chemins Drive"**
- [x] Décider de la stratégie de mise à jour → **Manuelle uniquement**
- [ ] Créer un backup de la base de données

### Phase 2 : Modèle et Migration
- [ ] Ajouter le champ `drive_path` dans le modèle `Chantier` (500 caractères, nullable)
- [ ] Ajouter le champ `drive_path` dans le modèle `AppelOffres` (500 caractères, nullable)
- [ ] Ajouter la méthode `get_drive_path()` dans les deux modèles
- [ ] Ajouter la méthode de validation `validate_drive_path()` dans les deux modèles
- [ ] Créer la migration de schéma pour les deux modèles (pas de migration de données nécessaire)
- [ ] Tester les migrations sur une copie de la base de données

### Phase 3 : Backend
- [ ] Modifier `pdf_manager.py` pour utiliser `chantier.get_drive_path()` et `appel_offres.get_drive_path()`
  - [ ] Structure pour appels d'offres : `Appels_Offres/{drive_path}/{subfolder}`
  - [ ] Structure pour chantiers : `Chantiers/{drive_path}/{subfolder}`
- [ ] Modifier `create_devis` dans `views.py` pour accepter et enregistrer `drive_path` lors de la création
- [ ] Modifier `transformer_en_chantier` dans `views.py` :
  - [ ] Copier `appel_offres.drive_path` vers `chantier.drive_path`
  - [ ] Utiliser la fonction de transfert mise à jour avec les `drive_path`
- [ ] Modifier `drive_automation.py` :
  - [ ] Fonction `transfer_appel_offres_to_chantier` pour utiliser les `drive_path`
  - [ ] Créer fonction `transfer_chantier_drive_path` pour transférer lors de la modification
  - [ ] Créer fonction `transfer_appel_offres_drive_path` pour transférer lors de la modification
- [ ] Modifier les endpoints API pour utiliser le nouveau champ
- [ ] Créer les endpoints de modification du chemin (`update_chantier_drive_path`, `update_appel_offres_drive_path`)
- [ ] Modifier `get_chantiers_drive_paths` pour utiliser `get_drive_path()` (chantiers ET appels d'offres)

### Phase 4 : Frontend
- [ ] **PRIORITÉ 1** : Modifier `DevisAvance.js` pour enregistrer le `drive_path` lors de la création
  - [ ] Dans `handleSaveDevis`, si `customDrivePath` est défini, l'inclure dans les données envoyées à l'API
  - [ ] Pour les appels d'offres : inclure `drive_path: customDrivePath` dans `appel_offres_data`
  - [ ] Pour les chantiers : inclure `drive_path: customDrivePath` dans `chantier_data`
- [ ] **PRIORITÉ 2** : Modifier `ChantiersDrivePaths.js` pour permettre la modification du chemin
  - [ ] Ajouter un bouton "Modifier" pour chaque chantier/appel d'offres
  - [ ] Intégrer `DrivePathSelector` dans un modal
  - [ ] Ajouter un bouton "Réinitialiser" pour vider le `drive_path`
  - [ ] Appeler l'endpoint API pour mettre à jour le `drive_path`
  - [ ] Afficher un indicateur de progression lors du transfert des fichiers
  - [ ] Gérer les erreurs de transfert et afficher des messages appropriés
- [ ] Modifier `ChantierInfoTab.js` pour utiliser le `drive_path` du chantier
- [ ] Modifier `ListeDevis.js` pour utiliser le `drive_path` du chantier/appel d'offres
- [ ] Identifier et modifier tous les autres composants concernés

### Phase 5 : Tests
- [ ] Tests unitaires pour le modèle
- [ ] Tests d'intégration pour les endpoints
- [ ] Tests de migration des données
- [ ] Tests end-to-end pour la génération de PDF

### Phase 6 : Déploiement
- [ ] Déployer les migrations en production
- [ ] Exécuter le script de migration des données
- [ ] Vérifier que tout fonctionne correctement
- [ ] Monitorer les erreurs potentielles

---

## ✅ Réponses aux Questions

### Questions Techniques - RÉPONDUES
1. **Longueur du champ** : ✅ **500 caractères** - Confirmé
2. **Modification** : ✅ **Modifiable depuis l'interface "Chemins Drive" dans la sidebar**
3. **Validation** : ✅ **Oui, interdire uniquement les caractères spéciaux non gérés par AWS**
4. **Mise à jour automatique** : ✅ **Non, seulement lors de la mise à jour manuelle par l'utilisateur dans "Chemins Drive"**
5. **Chemin personnalisé** : ✅ **Un seul champ avec logique de fallback** (si vide, calculer automatiquement)

### Questions Fonctionnelles - RÉPONDUES
1. **Compatibilité** : ✅ **Oui, maintenir la compatibilité avec les anciens chantiers** (fallback sur calcul automatique)
2. **Migration** : ✅ **Seulement migrer les nouveaux chantiers** + **Enregistrer le chemin lors de la modification manuelle d'un chantier existant**
3. **Interface** : ✅ **L'interface existe déjà** : "Chemins Drive" dans la sidebar (`/ChantiersDrivePaths`)
4. **Notifications** : ⚠️ À déterminer selon les besoins

### Questions de Sécurité - À DÉTERMINER
1. **Validation** : ✅ **Oui, valider les caractères autorisés par AWS S3**
2. **Permissions** : ⚠️ À déterminer (probablement tous les utilisateurs authentifiés)
3. **Audit** : ⚠️ À déterminer (recommandé : logger les modifications)

---

## 👤 Workflow Utilisateur - Fonctionnement et Implications

### Vue d'Ensemble

Le système de chemin drive centralisé permet de :
1. **Stocker** le chemin personnalisé de chaque chantier dans la base de données
2. **Utiliser** ce chemin partout dans l'application pour éviter les erreurs
3. **Modifier** le chemin depuis l'interface "Chemins Drive" dans la sidebar
4. **Calculer automatiquement** le chemin si non défini (rétrocompatibilité)

---

### 📍 Scénarios d'Utilisation

#### Scénario 1 : Création d'un Devis de Travaux (Appel d'Offres) depuis DevisAvance ⭐ PRIORITÉ

**Workflow détaillé :**

**Étape 1 : Préparation du devis**
1. L'utilisateur ouvre `DevisAvance.js`
2. Il sélectionne ou crée une société et un chantier
3. Il définit `devisType = "chantier"` (appel d'offres)
4. Le système calcule automatiquement le chemin par défaut : `{societe_slug}/{chantier_slug}`
   - Ce chemin est affiché dans la section "📁 Chemin du drive pour les documents"

**Étape 2 : Visualisation du chemin (optionnel)**
5. L'utilisateur peut **voir le chemin calculé** dans l'interface :
   - Chemin par défaut affiché : `{societe_slug}/{chantier_slug}`
   - Message : "Chemin par défaut : {chemin_calculé}"

**Étape 3 : Modification du chemin (optionnel)**
6. Si l'utilisateur souhaite un chemin différent, il clique sur **"Modifier le chemin"**
7. Un modal `DrivePathSelector` s'ouvre :
   - Navigation dans le drive
   - Sélection d'un dossier
   - Confirmation du chemin sélectionné
8. Le chemin personnalisé est affiché dans l'interface :
   - Remplace l'affichage du chemin par défaut
   - Bouton "Réinitialiser au chemin par défaut" apparaît

**Étape 4 : Sauvegarde du devis**
9. L'utilisateur clique sur **"💾 Sauvegarder le devis"**
10. La fonction `handleSaveDevis()` est exécutée :
    - Si `customDrivePath !== null` (utilisateur a modifié) :
      - Le `drive_path` est **inclus dans les données** de création de l'appel d'offres
      - Format : `appel_offres_data['drive_path'] = customDrivePath`
    - Si `customDrivePath === null` (utilisateur n'a pas modifié) :
      - Le `drive_path` **n'est PAS inclus** dans les données
      - L'AppelOffres sera créé avec `drive_path = NULL`
11. L'appel d'offres est créé via l'API `/api/create-devis/`
12. Le `drive_path` est **enregistré en base de données** si fourni

**Étape 5 : Génération de documents pour l'appel d'offres**
13. Lors de la génération automatique du PDF (redirection vers ListeDevis) :
    - Le système récupère l'AppelOffres créé
    - Il appelle `appel_offres.get_drive_path()` :
      - Si `drive_path` est défini → utilise ce chemin
      - Si `drive_path` est NULL → calcule automatiquement `{societe_slug}/{chantier_slug}`
    - Le document est stocké au chemin : `Appels_Offres/{base_path}/Devis/{nom_fichier}.pdf`
    - **Structure complète** : `Appels_Offres/{chemin_defini}/Devis/{nom_fichier}.pdf`

**Implications :**
- ✅ L'utilisateur peut voir et modifier le chemin **avant** la création de l'appel d'offres
- ✅ Le chemin personnalisé est **enregistré directement** lors de la création de l'appel d'offres
- ✅ Les nouveaux appels d'offres fonctionnent immédiatement (calcul automatique si pas de chemin personnalisé)
- ✅ Le chemin est **persistant** : une fois enregistré, il ne change pas même si le nom change
- ⚠️ Si l'utilisateur ne modifie pas le chemin, il reste NULL et sera calculé à chaque utilisation

#### Scénario 1bis : Création d'un Nouveau Chantier (Normal)

**Workflow :**
1. L'utilisateur crée un nouveau chantier (via DevisAvance avec devisType = "normal" ou autre interface)
2. Le système calcule automatiquement le chemin par défaut : `{societe_slug}/{chantier_slug}`
3. Le champ `drive_path` est **laissé vide** (NULL) dans la base de données
4. Lors de la génération de documents (devis, factures, etc.), le système :
   - Vérifie si `chantier.drive_path` existe
   - Si vide, calcule le chemin automatiquement
   - Utilise ce chemin pour stocker les documents dans le drive

**Implications :**
- ✅ Les nouveaux chantiers fonctionnent immédiatement sans configuration
- ✅ Le chemin est calculé de manière cohérente partout
- ⚠️ Si le nom du chantier ou de la société change, le chemin calculé change aussi (mais le `drive_path` stocké reste vide)

#### Scénario 2 : Transformation d'un Appel d'Offres en Chantier ⭐ IMPORTANT

**Workflow détaillé :**

**Étape 1 : Validation de l'appel d'offres**
1. L'appel d'offres est créé avec son `drive_path` (personnalisé ou NULL)
2. L'appel d'offres est validé (statut = "valide") depuis `GestionAppelsOffres.js`

**Étape 2 : Transformation en chantier**
3. L'utilisateur clique sur "Transformer en chantier" dans `GestionAppelsOffres.js`
4. La fonction `transformer_en_chantier()` est appelée :
   - Un nouveau `Chantier` est créé avec les données de l'appel d'offres
   - **Le `drive_path` de l'appel d'offres est copié dans le chantier** :
     - Si `appel_offres.drive_path` est défini → `chantier.drive_path = appel_offres.drive_path`
     - Si `appel_offres.drive_path` est NULL → `chantier.drive_path = NULL` (calcul automatique)

**Étape 3 : Transfert des fichiers dans le drive**
5. Le système appelle `drive_automation.copy_appel_offres_to_chantier()` :
   - **Source** : `Appels_Offres/{appel_offres.get_drive_path()}/`
   - **Destination** : `Chantiers/{chantier.get_drive_path()}/`
   - Tous les fichiers et dossiers sont **copiés/déplacés** du dossier appel d'offres vers le dossier chantier
   - Structure préservée : les sous-dossiers (Devis, Factures, etc.) sont maintenus

**Étape 4 : Utilisation du chemin pour les documents du chantier**
6. Une fois le chantier créé, tous les futurs documents utilisent le `drive_path` du chantier :
   - **Factures** : `Chantiers/{chemin_chantier}/Facture/{nom_fichier}.pdf`
   - **Devis** : `Chantiers/{chemin_chantier}/Devis/{nom_fichier}.pdf`
   - **Situations** : `Chantiers/{chemin_chantier}/Situation/{nom_fichier}.pdf`
   - **Contrats sous-traitants** : `Chantiers/{chemin_chantier}/Sous_Traitant/{entreprise}/{nom_fichier}.pdf`
   - **Avenants** : `Chantiers/{chemin_chantier}/Documents_Execution/{nom_fichier}.pdf`
   - **Bons de commande** : `Chantiers/{chemin_chantier}/Bon_Commande/{fournisseur}/{nom_fichier}.pdf`
   - Etc.

**Implications :**
- ✅ Le chemin de l'appel d'offres est **hérité** par le chantier lors de la transformation
- ✅ Les fichiers sont **transférés** automatiquement du dossier appel d'offres vers le dossier chantier
- ✅ Tous les documents futurs du chantier utilisent le **même chemin de base**
- ✅ La structure des sous-dossiers est **préservée** lors du transfert
- ⚠️ Si le `drive_path` de l'appel d'offres était NULL, le chantier utilisera le calcul automatique

#### Scénario 3 : Modification du Chemin depuis "Chemins Drive" ⭐ IMPORTANT

**Workflow détaillé :**

**Étape 1 : Accès à l'interface**
1. L'utilisateur accède à "Chemins Drive" depuis la sidebar
2. Il voit la liste de tous les **chantiers et appels d'offres** avec leur chemin actuel (calculé ou personnalisé)
3. Il peut :
   - **Voir** le chemin actuel (affiché en monospace)
   - **Copier** le chemin (bouton copier)
   - **Ouvrir** le dossier dans le drive (bouton ouvrir)
   - **Modifier** le chemin (nouvelle fonctionnalité à ajouter)

**Étape 2 : Modification du chemin**
1. L'utilisateur clique sur "Modifier" pour un chantier ou un appel d'offres
2. Un modal s'ouvre avec :
   - Le chemin actuel (calculé ou personnalisé)
   - Un sélecteur de chemin dans le drive (comme dans DevisAvance)
   - Option pour réinitialiser au chemin par défaut
3. L'utilisateur sélectionne un nouveau chemin
4. Le système :
   - **Valide** le chemin (caractères autorisés par AWS)
   - **Détermine l'ancien chemin** :
     - Si `drive_path` était défini → utiliser `drive_path`
     - Si `drive_path` était NULL → calculer l'ancien chemin : `{societe_slug}/{chantier_slug}`
   - **Détermine le nouveau chemin** : le chemin sélectionné par l'utilisateur

**Étape 3 : Transfert des fichiers (CRITIQUE)**
5. Le système **transfère tous les fichiers et dossiers** de l'ancien chemin vers le nouveau :
   - **Pour un chantier** :
     - Source : `Chantiers/{ancien_chemin}/`
     - Destination : `Chantiers/{nouveau_chemin}/`
   - **Pour un appel d'offres** :
     - Source : `Appels_Offres/{ancien_chemin}/`
     - Destination : `Appels_Offres/{nouveau_chemin}/`
6. Le transfert inclut :
   - Tous les fichiers à la racine
   - Tous les dossiers et leur contenu (récursif) :
     - `/Devis/` et tous ses fichiers
     - `/Facture/` et tous ses fichiers
     - `/Situation/` et tous ses fichiers
     - `/Sous_Traitant/` et tous ses sous-dossiers/fichiers
     - `/Documents_Execution/` et tous ses fichiers
     - `/Bon_Commande/` et tous ses sous-dossiers/fichiers
     - Tous les autres dossiers personnalisés
7. La **structure complète est préservée** lors du transfert

**Étape 4 : Mise à jour en base de données**
8. Une fois le transfert terminé avec succès :
   - **Enregistrer** le nouveau chemin dans `chantier.drive_path` ou `appel_offres.drive_path`
   - **Supprimer** l'ancien dossier (optionnel, ou le laisser vide)
   - **Met à jour** l'affichage dans la liste

**Étape 5 : Gestion des erreurs**
9. Si le transfert échoue :
   - **Ne pas** modifier le `drive_path` en base de données
   - Afficher un message d'erreur à l'utilisateur
   - Proposer de réessayer ou d'annuler

**Implications :**
- ✅ **Tous les documents existants sont transférés** automatiquement vers le nouveau chemin
- ✅ La structure des dossiers est **préservée** lors du transfert
- ✅ Le chemin personnalisé est **persistant** et ne change pas si le nom change
- ✅ Tous les futurs documents utiliseront le nouveau chemin personnalisé
- ⚠️ Le transfert peut prendre du temps si beaucoup de fichiers
- ⚠️ L'utilisateur doit s'assurer que le nouveau chemin existe dans le drive (ou le créer)
- ⚠️ Pour les appels d'offres : le chemin modifié sera utilisé pour les futurs documents ET sera hérité lors de la transformation

#### Scénario 4 : Génération de Documents (Devis, Factures, Situations, etc.)

**Workflow pour un Chantier :**
1. L'utilisateur génère un document (ex: facture, situation, contrat sous-traitant, etc.)
2. Le système récupère le chantier associé
3. Le système appelle `chantier.get_drive_path()` qui :
   - Si `drive_path` est défini → retourne `drive_path`
   - Si `drive_path` est vide → calcule `{societe_slug}/{chantier_slug}`
4. Le système détermine le sous-dossier selon le type de document :
   - **Factures** : `/Facture`
   - **Devis** : `/Devis`
   - **Situations** : `/Situation`
   - **Contrats sous-traitants** : `/Sous_Traitant/{entreprise}`
   - **Avenants** : `/Documents_Execution`
   - **Bons de commande** : `/Bon_Commande/{fournisseur}`
5. Le document est stocké au chemin final : `Chantiers/{drive_path}/{sous_dossier}/{nom_fichier}.pdf`

**Workflow pour un Appel d'Offres :**
1. L'utilisateur génère un document (ex: devis de marché)
2. Le système récupère l'appel d'offres associé
3. Le système appelle `appel_offres.get_drive_path()` qui :
   - Si `drive_path` est défini → retourne `drive_path`
   - Si `drive_path` est vide → calcule `{societe_slug}/{chantier_slug}`
4. Le système ajoute le sous-dossier du type de document (ex: `/Devis/Devis_Marche`)
5. Le document est stocké au chemin final : `Appels_Offres/{drive_path}/Devis/Devis_Marche/{nom_fichier}.pdf`

**Implications :**
- ✅ Cohérence : tous les documents d'un même chantier utilisent le même chemin de base
- ✅ Flexibilité : possibilité de personnaliser le chemin par chantier
- ✅ Rétrocompatibilité : les anciens chantiers sans `drive_path` continuent de fonctionner

#### Scénario 5 : Modification du Nom d'un Chantier ou d'une Société

**Workflow :**
1. L'utilisateur modifie le nom d'un chantier ou d'une société
2. Le système **ne modifie pas automatiquement** le `drive_path`
3. Si `drive_path` était vide :
   - Il reste vide
   - Le chemin calculé change automatiquement (car basé sur les nouveaux noms)
4. Si `drive_path` était personnalisé :
   - Il reste inchangé
   - Le chemin utilisé reste le même (personnalisé)
   - Le chemin calculé change, mais n'est pas utilisé

**Implications :**
- ✅ Les chemins personnalisés sont **stables** et ne changent pas avec les modifications de noms
- ⚠️ Si l'utilisateur veut utiliser le nouveau chemin calculé, il doit réinitialiser le `drive_path` manuellement
- ✅ Les documents continuent d'être stockés au même endroit (pas de rupture)

---

### 🔄 Flux de Données

```
┌─────────────────────────────────────────────────────────────┐
│                    CRÉATION DE CHANTIER                      │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
            ┌────────────────────────┐
            │ drive_path = NULL      │
            │ (vide par défaut)      │
            └────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              GÉNÉRATION DE DOCUMENT                         │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
            ┌────────────────────────┐
            │ chantier.get_drive_   │
            │ path() appelé         │
            └────────────────────────┘
                         │
            ┌────────────┴────────────┐
            │                         │
            ▼                         ▼
    ┌──────────────┐         ┌──────────────┐
    │ drive_path   │         │ drive_path   │
    │ défini ?     │         │ vide ?       │
    └──────────────┘         └──────────────┘
            │                         │
            ▼                         ▼
    ┌──────────────┐         ┌──────────────┐
    │ Utiliser     │         │ Calculer     │
    │ drive_path   │         │ automatique  │
    │ stocké       │         │ {societe}/   │
    └──────────────┘         │ {chantier}   │
            │                 └──────────────┘
            │                         │
            └────────────┬─────────────┘
                         │
                         ▼
            ┌────────────────────────┐
            │ Chemin final utilisé   │
            │ {base_path}/{type}/    │
            │ {filename}            │
            └────────────────────────┘
```

---

### 🎯 Points Clés du Workflow

#### 1. **Calcul Automatique vs Personnalisation**
- **Par défaut** : Le chemin est calculé automatiquement à partir des noms
- **Personnalisation** : L'utilisateur peut définir un chemin personnalisé depuis "Chemins Drive"
- **Priorité** : Le chemin personnalisé a toujours la priorité sur le calcul automatique

#### 2. **Persistance**
- Le `drive_path` est **stocké en base de données** et persiste entre les sessions
- Une fois défini, il ne change **pas automatiquement** même si les noms changent
- L'utilisateur doit **modifier manuellement** pour changer le chemin

#### 3. **Rétrocompatibilité**
- Les anciens chantiers sans `drive_path` continuent de fonctionner
- Le système calcule automatiquement le chemin si `drive_path` est vide
- Aucune migration forcée nécessaire

#### 4. **Validation et Sécurité**
- Le chemin est **validé** avant enregistrement (caractères autorisés par AWS)
- Les caractères spéciaux non gérés par AWS sont **interdits**
- Le format est vérifié pour éviter les erreurs de stockage

---

### ⚠️ Implications et Considérations

#### Implications Positives ✅
1. **Cohérence** : Tous les documents d'un chantier utilisent le même chemin de base
2. **Flexibilité** : Possibilité de personnaliser le chemin selon les besoins
3. **Stabilité** : Les chemins personnalisés ne changent pas avec les modifications de noms
4. **Simplicité** : Les nouveaux chantiers fonctionnent sans configuration

#### Points d'Attention ⚠️
1. **Documents existants** : Les documents déjà générés ne sont **pas déplacés** automatiquement si le chemin change
2. **Cohérence des noms** : Si le nom du chantier change, le chemin calculé change aussi (mais pas le chemin personnalisé)
3. **Validation** : L'utilisateur doit s'assurer que le chemin personnalisé existe dans le drive
4. **Migration** : Les anciens chantiers gardent leur comportement actuel (calcul dynamique)

#### Actions Requises de l'Utilisateur
1. **Vérifier** les chemins dans "Chemins Drive" après création de chantiers
2. **Personnaliser** les chemins si nécessaire (organisation spécifique)
3. **Valider** que les chemins personnalisés existent dans le drive
4. **Réinitialiser** au chemin par défaut si besoin (bouton dans l'interface)

---

## 🚀 Ordre d'Exécution Recommandé - Par Où Commencer ?

### ⭐ Ordre Logique Recommandé (Minimise les Risques)

#### **ÉTAPE 1 : Backup et Préparation** (15 min)
```
✅ Faire un backup de la base de données
✅ Vérifier que l'environnement de développement fonctionne
✅ S'assurer que les tests actuels passent
```

**Commandes :**
```bash
# Backup de la base de données (local)
pg_dump -U p3000user p3000db_local > backup_avant_drive_path_$(date +%Y%m%d_%H%M%S).sql

# Vérifier que tout fonctionne
python manage.py check
python manage.py showmigrations
```

---

#### **ÉTAPE 2 : Modèle et Migration** (30-45 min) ⭐ COMMENCER ICI
```
✅ Ajouter le champ drive_path dans Chantier et AppelOffres
✅ Ajouter la méthode get_drive_path() dans les deux modèles
✅ Créer la migration
✅ Tester la migration sur une copie locale
```

**Pourquoi commencer ici ?**
- ✅ C'est la **base** de tout le système
- ✅ Le champ est **nullable**, donc ne casse pas l'existant
- ✅ On peut **tester** les méthodes `get_drive_path()` immédiatement
- ✅ **Risque minimal** : les anciens chantiers continuent de fonctionner

**Fichiers à modifier :**
1. `api/models.py` - Ajouter les champs et méthodes
2. Créer la migration : `python manage.py makemigrations`
3. Tester : `python manage.py migrate`

**Test rapide après cette étape :**
```python
# Dans le shell Django
python manage.py shell
>>> from api.models import Chantier, AppelOffres
>>> chantier = Chantier.objects.first()
>>> print(chantier.get_drive_path())  # Doit fonctionner même si drive_path est NULL
```

---

#### **ÉTAPE 3 : Serializers et Endpoints de Lecture** (30 min)
```
✅ Ajouter drive_path dans les serializers
✅ Modifier get_chantiers_drive_paths pour utiliser get_drive_path()
✅ Tester que l'API retourne bien les chemins
```

**Pourquoi cette étape ?**
- ✅ Permet de **vérifier** que les méthodes fonctionnent
- ✅ **Pas de modification** de la logique de génération de PDF (pas de risque)
- ✅ On peut **tester** via l'interface "Chemins Drive" existante

**Fichiers à modifier :**
1. `api/serializers.py` - Ajouter `drive_path` dans ChantierSerializer et AppelOffresSerializer
2. `api/views.py` - Modifier `get_chantiers_drive_paths`

**Test rapide :**
- Ouvrir "Chemins Drive" dans l'interface
- Vérifier que les chemins s'affichent correctement

---

#### **ÉTAPE 4 : Modification de DevisAvance.js** (45 min) ⭐ PRIORITÉ FRONTEND
```
✅ Modifier handleSaveDevis pour inclure drive_path lors de la création
✅ Tester la création d'un appel d'offres avec chemin personnalisé
✅ Vérifier que le drive_path est bien enregistré en base
```

**Pourquoi cette étape ?**
- ✅ C'est le **workflow principal** (création depuis DevisAvance)
- ✅ L'interface existe déjà (DrivePathSelector)
- ✅ On peut **tester** immédiatement en créant un appel d'offres
- ✅ **Impact limité** : seulement la création, pas les documents existants

**Fichiers à modifier :**
1. `api/views.py` - Modifier `create_devis` pour accepter `drive_path`
2. `frontend/src/components/DevisAvance.js` - Inclure `drive_path` dans les données

**Test rapide :**
- Créer un appel d'offres depuis DevisAvance avec un chemin personnalisé
- Vérifier en base que `drive_path` est bien enregistré

---

#### **ÉTAPE 5 : Modification de pdf_manager.py** (1h)
```
✅ Modifier get_s3_folder_path() pour utiliser les drive_path
✅ Tester la génération de PDF avec un chantier/appel d'offres ayant un drive_path
✅ Tester avec un chantier/appel d'offres sans drive_path (fallback)
```

**Pourquoi cette étape ?**
- ✅ C'est le **cœur** du système de stockage
- ✅ On peut **tester** immédiatement en générant un PDF
- ✅ **Risque modéré** : mais on peut tester avant de déployer

**Fichiers à modifier :**
1. `api/pdf_manager.py` - Modifier `get_s3_folder_path()`

**Test rapide :**
- Générer un PDF pour un appel d'offres avec `drive_path`
- Vérifier qu'il est stocké au bon endroit dans S3

---

#### **ÉTAPE 6 : Transformation Appel d'Offres → Chantier** (1h)
```
✅ Modifier transformer_en_chantier() pour copier le drive_path
✅ Modifier drive_automation.py pour utiliser les drive_path
✅ Tester la transformation complète
```

**Pourquoi cette étape ?**
- ✅ Complète le workflow principal
- ✅ On peut **tester** en transformant un appel d'offres
- ✅ **Risque modéré** : mais testable avant production

**Fichiers à modifier :**
1. `api/models.py` - Modifier `transformer_en_chantier()`
2. `api/drive_automation.py` - Modifier `transfer_appel_offres_to_chantier()`
3. `api/views.py` - Modifier l'endpoint `transformer_en_chantier`

---

#### **ÉTAPE 7 : Modification depuis "Chemins Drive"** (2h) ⭐ COMPLEXE
```
✅ Créer les fonctions de transfert (transfer_chantier_drive_path, etc.)
✅ Créer les endpoints update_chantier_drive_path et update_appel_offres_drive_path
✅ Modifier ChantiersDrivePaths.js pour permettre la modification
✅ Tester le transfert complet de fichiers
```

**Pourquoi cette étape en dernier ?**
- ⚠️ C'est la **plus complexe** (transfert de fichiers)
- ⚠️ **Risque élevé** si mal implémenté (perte de fichiers)
- ⚠️ Nécessite des **tests approfondis**
- ✅ Mais c'est une fonctionnalité **importante** pour l'utilisateur

**Fichiers à modifier :**
1. `api/drive_automation.py` - Créer les nouvelles fonctions de transfert
2. `api/views.py` - Créer les endpoints de modification
3. `frontend/src/components/ChantiersDrivePaths.js` - Ajouter l'interface de modification

**Test approfondi requis :**
- Tester avec un chantier ayant beaucoup de fichiers
- Vérifier que tous les fichiers sont transférés
- Vérifier que la structure est préservée
- Tester la gestion d'erreurs

---

#### **ÉTAPE 8 : Autres Composants Frontend** (1h)
```
✅ Modifier ChantierInfoTab.js
✅ Modifier ListeDevis.js
✅ Identifier et modifier les autres composants
```

**Pourquoi cette étape ?**
- ✅ Complète l'intégration
- ✅ **Risque faible** : modifications mineures
- ✅ Améliore la cohérence de l'application

---

### 📊 Résumé de l'Ordre Recommandé

| Étape | Priorité | Durée | Risque | Testable |
|-------|----------|-------|--------|----------|
| 1. Backup | ⚠️ Critique | 15 min | Faible | ✅ |
| 2. Modèle + Migration | ⭐ **COMMENCER** | 30-45 min | Faible | ✅ |
| 3. Serializers + Lecture | 🔵 Important | 30 min | Faible | ✅ |
| 4. DevisAvance (création) | ⭐ Priorité | 45 min | Modéré | ✅ |
| 5. pdf_manager.py | 🔵 Important | 1h | Modéré | ✅ |
| 6. Transformation | 🔵 Important | 1h | Modéré | ✅ |
| 7. Modification "Chemins Drive" | ⚠️ Complexe | 2h | Élevé | ✅ |
| 8. Autres composants | 🟢 Optionnel | 1h | Faible | ✅ |

**Total estimé : ~6-7 heures de développement**

---

### 🎯 Ma Recommandation : Commencer par l'ÉTAPE 2

**Pourquoi ?**
1. ✅ **Base solide** : Tout le reste dépend de cette étape
2. ✅ **Risque minimal** : Le champ est nullable, ne casse rien
3. ✅ **Testable immédiatement** : On peut tester `get_drive_path()` tout de suite
4. ✅ **Progression logique** : Une fois fait, on peut enchaîner sur les autres étapes

**Ensuite, enchaîner avec :**
- Étape 3 (Serializers) → Pour vérifier que ça fonctionne
- Étape 4 (DevisAvance) → Pour tester le workflow principal
- Étape 5 (pdf_manager) → Pour utiliser le système complet
- Étape 6 (Transformation) → Pour compléter le workflow
- Étape 7 (Modification) → Pour la fonctionnalité avancée

---

### ⚠️ Points d'Attention

1. **Ne pas sauter l'étape 1** (backup) - C'est critique !
2. **Tester chaque étape** avant de passer à la suivante
3. **Commencer en local** avant de déployer en production
4. **L'étape 7 est la plus risquée** - Prendre le temps de bien tester le transfert

---

### 🧪 Tests à Faire Après Chaque Étape

**Après Étape 2 :**
- [ ] Migration appliquée sans erreur
- [ ] `get_drive_path()` fonctionne pour un chantier avec `drive_path = NULL`
- [ ] `get_drive_path()` fonctionne pour un chantier avec `drive_path` défini

**Après Étape 3 :**
- [ ] L'API `get_chantiers_drive_paths` retourne les chemins corrects
- [ ] L'interface "Chemins Drive" affiche les chemins

**Après Étape 4 :**
- [ ] Création d'appel d'offres avec `drive_path` personnalisé fonctionne
- [ ] Le `drive_path` est bien enregistré en base de données

**Après Étape 5 :**
- [ ] Génération de PDF utilise le bon chemin
- [ ] Le PDF est stocké au bon endroit dans S3

**Après Étape 6 :**
- [ ] Transformation copie bien le `drive_path`
- [ ] Les fichiers sont transférés correctement

**Après Étape 7 :**
- [ ] Modification du chemin transfère tous les fichiers
- [ ] Aucun fichier n'est perdu
- [ ] La structure est préservée

---

## 📚 Fichiers à Modifier

### Backend
- `api/models.py` - Ajout du champ `drive_path` dans Chantier et AppelOffres + méthode `get_drive_path()` + validation
- `api/models.py` - Modification de `transformer_en_chantier()` pour copier le `drive_path` de l'appel d'offres vers le chantier
- `api/migrations/` - Création de la migration de schéma pour Chantier et AppelOffres (pas de migration de données)
- `api/serializers.py` - Ajout du champ dans les serializers (Chantier, AppelOffres) - lecture/écriture
- `api/pdf_manager.py` - Utilisation du `drive_path` :
  - Structure appels d'offres : `Appels_Offres/{drive_path}/{subfolder}`
  - Structure chantiers : `Chantiers/{drive_path}/{subfolder}`
- `api/drive_automation.py` - Modification des fonctions de transfert :
  - `transfer_appel_offres_to_chantier()` : utiliser les `drive_path` des modèles
  - Nouvelle fonction `transfer_chantier_drive_path()` : transférer lors de la modification du chemin
  - Nouvelle fonction `transfer_appel_offres_drive_path()` : transférer lors de la modification du chemin des modèles
- `api/pdf_views.py` - Modification des endpoints pour utiliser les `drive_path`
- `api/views.py` - Modification des endpoints :
  - `get_chantiers_drive_paths` : Utiliser `get_drive_path()` pour chantiers ET appels d'offres
  - `create_devis` : Accepter `drive_path` dans les données et l'enregistrer dans l'AppelOffres ou Chantier créé
  - `transformer_en_chantier` : Copier le `drive_path` et utiliser la fonction de transfert mise à jour
  - Nouvel endpoint : `update_chantier_drive_path` pour modifier le chemin depuis l'interface
    - **Déterminer l'ancien chemin** :
      - Si `chantier.drive_path` est défini → utiliser `chantier.drive_path`
      - Si `chantier.drive_path` est NULL → calculer : `{societe_slug}/{chantier_slug}`
    - **Transférer tous les fichiers** de `Chantiers/{ancien_chemin}/` vers `Chantiers/{nouveau_chemin}/`
      - Transférer récursivement tous les fichiers et dossiers
      - Préserver la structure complète
    - **Enregistrer le nouveau chemin** dans `chantier.drive_path` en base de données
    - **Retourner le statut** du transfert (succès/échec)
  - Nouvel endpoint : `update_appel_offres_drive_path` pour modifier le chemin depuis l'interface
    - **Même logique** que pour les chantiers mais pour Appels_Offres
    - Transférer de `Appels_Offres/{ancien_chemin}/` vers `Appels_Offres/{nouveau_chemin}/`
- `api/utils.py` - Fonction de validation des caractères AWS S3 si nécessaire

### Frontend
- `frontend/src/components/ChantiersDrivePaths.js` - **PRIORITÉ** : Ajouter modification du chemin (chantiers ET appels d'offres)
- `frontend/src/components/DevisAvance.js` - **PRIORITÉ** : Enregistrer le `drive_path` lors de la création d'appel d'offres/chantier
- `frontend/src/components/GestionAppelsOffres.js` - Afficher le `drive_path` de l'appel d'offres (optionnel)
- `frontend/src/components/chantier/ChantierInfoTab.js` - Utiliser le `drive_path` du chantier
- `frontend/src/components/ListeDevis.js` - Utiliser le `drive_path` du chantier/appel d'offres
- `frontend/src/components/Devis/DrivePathSelector.js` - ✅ Existe déjà, réutilisable
- Tous les autres composants qui calculent/utilisent le chemin

---

## ⚠️ Points d'Attention

1. **Rétrocompatibilité** : S'assurer que les anciens chantiers sans `drive_path` continuent de fonctionner
2. **Performance** : Éviter les requêtes N+1 lors de la récupération des chantiers avec leur `drive_path`
3. **Cohérence** : S'assurer que tous les endroits utilisent la même logique
4. **Migration** : Tester la migration sur une copie de la base de données avant la production
5. **Rollback** : Prévoir un plan de rollback en cas de problème

---

## 📞 Support

En cas de questions ou de problèmes lors de l'implémentation, référez-vous à ce document et aux questions listées ci-dessus.

---

## 🎯 Récapitulatif Final du Workflow Complet

### Flux Principal

```
1. CRÉATION D'APPEL D'OFFRES (DevisAvance.js)
   ├─ Chemin calculé automatiquement : {societe_slug}/{chantier_slug}
   ├─ Utilisateur peut voir/modifier le chemin
   ├─ Si modifié → drive_path enregistré dans AppelOffres
   └─ Documents stockés dans : Appels_Offres/{drive_path}/Devis/

2. TRANSFORMATION EN CHANTIER (GestionAppelsOffres.js)
   ├─ drive_path copié : chantier.drive_path = appel_offres.drive_path
   ├─ Fichiers transférés : Appels_Offres/{chemin}/ → Chantiers/{chemin}/
   └─ Structure préservée

3. MODIFICATION DU CHEMIN (Chemins Drive)
   ├─ Utilisateur modifie le chemin d'un chantier/appel d'offres
   ├─ Ancien chemin déterminé (drive_path ou calculé)
   ├─ Transfert complet : ancien_chemin/ → nouveau_chemin/
   │  └─ Tous les fichiers et dossiers transférés récursivement
   └─ Nouveau chemin enregistré en base de données

4. GÉNÉRATION DE DOCUMENTS
   ├─ Utilise drive_path si défini, sinon calcul automatique
   ├─ Chantiers : Chantiers/{drive_path}/{type}/{sous_dossier}/
   └─ Appels d'offres : Appels_Offres/{drive_path}/Devis/
```

### Points Critiques

1. **Transfert lors de modification** : ⚠️ **OBLIGATOIRE** - Tous les fichiers doivent être transférés
2. **Héritage lors de transformation** : Le `drive_path` de l'appel d'offres est copié vers le chantier
3. **Rétrocompatibilité** : Les anciens chantiers sans `drive_path` continuent de fonctionner (calcul automatique)
4. **Persistance** : Le `drive_path` personnalisé ne change pas si le nom change

