# 📁 **GUIDE - COPIE DRIVE LORS DE LA TRANSFORMATION**

## **📋 Vue d'ensemble**

Ce guide documente la nouvelle fonctionnalité de **copie** des dossiers Drive lors de la transformation d'un appel d'offres en chantier, au lieu du transfert (déplacement) précédent.

## **🔄 Changement de comportement**

### **Avant (Transfert) :**

- ❌ **Déplacement** des fichiers avec `move_s3_file`
- ❌ **Suppression** du dossier source
- ❌ **Perte** des fichiers originaux dans l'appel d'offres

### **Après (Copie) :**

- ✅ **Copie** des fichiers avec `copy_object` S3
- ✅ **Conservation** du dossier source
- ✅ **Duplication** des fichiers dans le nouveau chemin

## **📂 Structure des chemins**

### **Chemin source (Appel d'offres) :**

```
Drive/
└── Appels_Offres/
    └── [Societe_Slug]/
        └── [Appel_Offres_Name_Slug]/
            ├── Devis/
            └── DCE/
```

### **Chemin destination (Chantier) :**

```
Drive/
└── Chantiers/
    └── Société/
        └── [Societe_Slug]/
            └── [Chantier_Name_Slug]/
                ├── Devis/          (copié depuis l'appel d'offres)
                ├── DCE/            (copié depuis l'appel d'offres)
                ├── Situation/      (nouveau dossier)
                ├── Sous Traitant/  (nouveau dossier)
                └── Facture/        (nouveau dossier)
```

## **🔧 Implémentation technique**

### **1. Nouvelle méthode de copie**

#### **`copy_appel_offres_to_chantier()` (`api/drive_automation.py`)**

```python
def copy_appel_offres_to_chantier(self, societe_name: str, appel_offres_name: str, chantier_name: str) -> bool:
    """
    Copie un appel d'offres vers un chantier (COPIE les fichiers sans supprimer l'original)
    Chemin source: Appels_Offres/Societe/nom_appel_offres
    Chemin destination: Chantier/Societe/nom_chantier
    Note: Ne génère aucun PDF, copie seulement les fichiers existants
    """
    try:
        # Chemins source et destination
        source_path = f"{self.appels_offres_root}/{custom_slugify(societe_name)}/{custom_slugify(appel_offres_name)}"
        dest_societe_path = f"Chantier/{custom_slugify(societe_name)}"
        dest_chantier_path = f"{dest_societe_path}/{custom_slugify(chantier_name)}"

        # Créer la structure de destination du chantier
        self.create_chantier_structure(societe_name, chantier_name, root_path="Chantier")

        # Copier tous les fichiers et dossiers
        # ... (voir code complet)

        return True
    except Exception as e:
        print(f"❌ Erreur lors de la copie: {str(e)}")
        return False
```

### **2. Méthodes utilitaires de copie**

#### **`_copy_s3_file()` - Copie d'un fichier**

```python
def _copy_s3_file(self, source_path: str, dest_path: str) -> bool:
    """
    Copie un fichier dans S3 (sans supprimer l'original)
    """
    try:
        s3_client = get_s3_client()
        bucket_name = get_s3_bucket_name()

        # Copier le fichier
        copy_source = {'Bucket': bucket_name, 'Key': source_path}
        s3_client.copy_object(
            CopySource=copy_source,
            Bucket=bucket_name,
            Key=dest_path
        )

        return True
    except Exception as e:
        print(f"Erreur lors de la copie du fichier {source_path} vers {dest_path}: {str(e)}")
        return False
```

#### **`_copy_folder_recursive()` - Copie récursive de dossiers**

```python
def _copy_folder_recursive(self, source_folder: str, dest_folder: str):
    """
    Copie récursivement un dossier et son contenu
    """
    try:
        # Créer le dossier de destination
        create_s3_folder_recursive(dest_folder)

        # Lister le contenu
        content = list_s3_folder_content(source_folder)

        # Copier les fichiers
        for file in content['files']:
            source_file_path = f"{source_folder}/{file['name']}"
            dest_file_path = f"{dest_folder}/{file['name']}"
            self._copy_s3_file(source_file_path, dest_file_path)

        # Copier les sous-dossiers récursivement
        for subfolder in content['folders']:
            self._copy_folder_recursive(
                f"{source_folder}/{subfolder['name']}",
                f"{dest_folder}/{subfolder['name']}"
            )
    except Exception as e:
        print(f"Erreur lors de la copie du dossier {source_folder}: {str(e)}")
```

### **3. Modification de la vue de transformation**

#### **`transformer_en_chantier()` (`api/views.py`)**

```python
# Copier automatiquement les dossiers du drive vers le nouveau chemin
try:
    # Récupérer le nom de la société depuis l'appel d'offres
    societe_name = "Société par défaut"
    if appel_offres.societe:
        societe_name = appel_offres.societe.nom_societe
    elif hasattr(appel_offres, 'devis') and appel_offres.devis.first():
        devis = appel_offres.devis.first()
        if devis.societe:
            societe_name = devis.societe.nom

    # Utiliser le nom de l'appel d'offres et du chantier
    appel_offres_name = appel_offres.chantier_name
    chantier_name = chantier.chantier_name

    success = drive_automation.copy_appel_offres_to_chantier(
        societe_name=societe_name,
        appel_offres_name=appel_offres_name,
        chantier_name=chantier_name
    )

    if success:
        print("✅ Copie des dossiers Drive réussie")
    else:
        print("Erreur lors de la copie des dossiers du drive")
except Exception as e:
    print(f"Erreur lors de la copie automatique des dossiers: {str(e)}")
```

## **📊 Exemple concret**

### **Données du chantier :**

```json
{
  "id": 4,
  "chantier_name": "PARC LUMIERE",
  "societe": {
    "id": 2,
    "nom_societe": "IMMOBILIERE DE LANFANT",
    "ville_societe": "Vitrolle",
    "rue_societe": "42 Avenue de Rome, Le Forum",
    "codepostal_societe": "13127",
    "client_name": 4
  }
}
```

### **Transformation :**

#### **1. Chemin source :**

```
Appels_Offres/immobiliere-de-lanfant/parc-lumiere/
├── Devis/
│   └── devis_marche_001.pdf
└── DCE/
    └── cahier_charges.pdf
```

#### **2. Chemin destination :**

```
Chantiers/Société/immobiliere-de-lanfant/parc-lumiere/
├── Devis/                    (copié)
│   └── devis_marche_001.pdf  (copié)
├── DCE/                      (copié)
│   └── cahier_charges.pdf    (copié)
├── Situation/                (nouveau)
├── Sous Traitant/            (nouveau)
└── Facture/                  (nouveau)
```

## **🔍 Processus de copie détaillé**

### **1. Création de la structure**

- ✅ Création du dossier `Chantier/[Societe_Slug]/[Chantier_Name_Slug]/`
- ✅ Création de tous les sous-dossiers de chantier
- ✅ Conservation de la structure existante

### **2. Copie des fichiers**

- ✅ Copie de tous les fichiers à la racine
- ✅ Copie de tous les fichiers dans `Devis/`
- ✅ Copie de tous les fichiers dans `DCE/`
- ✅ Copie récursive des sous-dossiers

### **3. Logs de suivi**

```
🔄 Début de la copie: Appel d'offres → Chantier
   Source: Appels_Offres/immobiliere-de-lanfant/parc-lumiere
   Destination: Chantier/immobiliere-de-lanfant/parc-lumiere
📁 Contenu à copier: 2 fichiers, 2 dossiers
📄 Fichier copié: devis_marche_001.pdf
📄 Sous-fichier copié: Devis/devis_marche_001.pdf
📄 Sous-fichier copié: DCE/cahier_charges.pdf
✅ Copie réussie: Appels_Offres/... → Chantier/...
```

## **✅ Avantages de la copie**

### **1. Conservation des données**

- ✅ **Fichiers originaux** conservés dans l'appel d'offres
- ✅ **Historique** préservé
- ✅ **Traçabilité** complète

### **2. Flexibilité**

- ✅ **Modifications** possibles dans le chantier sans affecter l'original
- ✅ **Évolutions** indépendantes
- ✅ **Sécurité** des données

### **3. Conformité**

- ✅ **Audit trail** complet
- ✅ **Conformité** réglementaire
- ✅ **Archivage** automatique

## **🔧 Configuration**

### **Paramètres de la copie :**

- **Root path source** : `Appels_Offres`
- **Root path destination** : `Chantier`
- **Structure** : Identique avec ajout des dossiers chantier
- **Méthode** : `copy_object` S3 (copie native)

### **Gestion des erreurs :**

- ✅ **Logs détaillés** pour chaque opération
- ✅ **Continuation** en cas d'erreur sur un fichier
- ✅ **Rollback** possible en cas d'échec complet

## **🚀 Utilisation**

### **Déclenchement automatique :**

La copie se déclenche automatiquement lors de la transformation d'un appel d'offres validé en chantier via le bouton "Transformer en chantier" dans `GestionAppelsOffres.js`.

### **Résultat :**

- ✅ **Chantier créé** en base de données
- ✅ **Devis mis à jour** pour pointer vers le chantier
- ✅ **Fichiers copiés** dans le nouveau chemin Drive
- ✅ **Structure complète** créée pour le chantier

---

**📝 Note** : Cette fonctionnalité garantit la conservation des données originales tout en permettant l'évolution indépendante du chantier.
