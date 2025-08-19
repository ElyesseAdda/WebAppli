# Drive - Système de gestion de documents

## Vue d'ensemble

Le Drive est un système de gestion de documents intégré à votre application, permettant de stocker, organiser et partager des fichiers selon une arborescence métier (Société > Chantier > Catégorie).

## Fonctionnalités

- **Interface moderne** : Composant React avec Material-UI
- **Navigation intuitive** : Breadcrumb et navigation par dossiers
- **Upload avancé** : Glisser-déposer, upload multiple, barre de progression
- **Organisation métier** : Structure Société > Chantier > Catégorie
- **Sécurité** : URLs présignées S3, permissions par utilisateur
- **Prévisualisation** : Intégration avec votre système Puppeteer existant
- **Recherche** : Recherche par nom de fichier, société, chantier

## Architecture technique

### Backend (Django)

- **Modèle Document** : Stockage des métadonnées en PostgreSQL
- **API DRF** : Endpoints pour upload/download/listage
- **S3 Integration** : Stockage des fichiers via AWS S3
- **URLs présignées** : Sécurité et performance

### Frontend (React)

- **Composant Drive** : Interface utilisateur complète
- **Material-UI** : Design moderne et responsive
- **Drag & Drop** : Upload intuitif
- **Navigation** : Breadcrumb et navigation par dossiers

### Stockage (AWS S3)

- **Arborescence** : `companies/{societe_id}_{slug}/chantiers/{chantier_id}_{slug}/{category}/{filename}`
- **Sécurité** : Chiffrement SSE-S3, ACL privées
- **Performance** : Upload direct vers S3

## Installation

### 1. Prérequis

- Python 3.8+
- Node.js 14+
- Compte AWS avec accès S3
- Base de données PostgreSQL

### 2. Configuration AWS S3

#### Créer le bucket S3

```bash
# Via AWS CLI
aws s3 mb s3://agency-drive-prod --region eu-west-3

# Activer le chiffrement
aws s3api put-bucket-encryption \
  --bucket agency-drive-prod \
  --server-side-encryption-configuration '{
    "Rules": [
      {
        "ApplyServerSideEncryptionByDefault": {
          "SSEAlgorithm": "AES256"
        }
      }
    ]
  }'
```

#### Configurer CORS

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedOrigins": ["https://votre-domaine.com"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

#### Créer l'utilisateur IAM

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": ["arn:aws:s3:::agency-drive-prod"]
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": ["arn:aws:s3:::agency-drive-prod/*"]
    }
  ]
}
```

### 3. Installation des dépendances

#### Backend (Django)

```bash
pip install django-storages boto3
```

#### Frontend (React)

```bash
cd frontend
npm install
```

### 4. Configuration des variables d'environnement

Copier `env.example` vers `.env` et configurer :

```bash
# Configuration S3
S3_ACCESS_KEY=your_aws_access_key_here
S3_SECRET_KEY=your_aws_secret_key_here
S3_BUCKET_NAME=agency-drive-prod
S3_REGION=eu-west-3
S3_ENDPOINT_URL=  # Vide pour AWS S3

# Configuration Django
DEBUG=True
SECRET_KEY=your_django_secret_key_here
DATABASE_URL=postgresql://user:password@localhost/dbname

# Configuration CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://votre-domaine.com
```

### 5. Configuration Django

#### settings.py

```python
INSTALLED_APPS += ["storages"]

# Configuration S3
AWS_ACCESS_KEY_ID = os.getenv("S3_ACCESS_KEY")
AWS_SECRET_ACCESS_KEY = os.getenv("S3_SECRET_KEY")
AWS_STORAGE_BUCKET_NAME = os.getenv("S3_BUCKET_NAME")
AWS_S3_REGION_NAME = os.getenv("S3_REGION", "eu-west-3")
AWS_S3_SIGNATURE_VERSION = "s3v4"
AWS_DEFAULT_ACL = None

DEFAULT_FILE_STORAGE = "storages.backends.s3boto3.S3Boto3Storage"
```

### 6. Migration de la base de données

```bash
python manage.py makemigrations api
python manage.py migrate
```

### 7. Test de l'installation

```bash
# Démarrer le serveur Django
python manage.py runserver

# Démarrer le frontend (dans un autre terminal)
cd frontend
npm start
```

Accéder à `http://localhost:3000/drive` pour tester l'interface.

## Utilisation

### Navigation

1. **Accueil** : Liste des sociétés
2. **Société** : Sélection d'une société → Liste des chantiers
3. **Chantier** : Sélection d'un chantier → Liste des catégories
4. **Catégorie** : Sélection d'une catégorie → Liste des documents

### Upload de fichiers

1. **Glisser-déposer** : Glisser des fichiers dans la zone d'upload
2. **Sélection** : Cliquer sur "Upload" pour sélectionner des fichiers
3. **Catégorisation** : Choisir la catégorie appropriée
4. **Confirmation** : Cliquer sur "Upload" pour finaliser

### Gestion des documents

- **Prévisualisation** : Clic sur un document pour le prévisualiser
- **Téléchargement** : Bouton de téléchargement sur chaque document
- **Suppression** : Menu contextuel (clic droit) → Supprimer
- **Recherche** : Barre de recherche en haut de l'interface

## API Endpoints

### Drive API

- `GET /api/drive/` - Liste des documents
- `POST /api/drive/` - Créer un document
- `GET /api/drive/{id}/` - Détails d'un document
- `PUT /api/drive/{id}/` - Modifier un document
- `DELETE /api/drive/{id}/` - Supprimer un document

### Upload/Download

- `POST /api/drive/presign-upload/` - Générer URL présignée pour upload
- `POST /api/drive/confirm-upload/` - Confirmer l'upload
- `GET /api/drive/{id}/download/` - Générer URL présignée pour download

### Navigation

- `GET /api/drive/list-folders/` - Lister les dossiers avec pagination

## Intégration avec l'application existante

### Sauvegarde automatique des PDF générés

Pour intégrer la sauvegarde automatique des PDF générés par Puppeteer :

```python
# Dans votre code de génération de PDF
from api.utils import build_document_key
from django.core.files import File
from django.core.files.storage import default_storage

def save_generated_pdf_to_drive(quote, local_pdf_path):
    """Sauvegarde un PDF généré dans le drive"""
    try:
        # Générer la clé S3
        key = build_document_key(
            societe=quote.chantier.societe,
            chantier=quote.chantier,
            category='devis',
            filename=f"devis_{quote.numero}.pdf"
        )

        # Sauvegarder dans S3
        with open(local_pdf_path, 'rb') as f:
            default_storage.save(key, File(f))

        # Créer l'entrée en base
        Document.objects.create(
            s3_key=key,
            filename=f"devis_{quote.numero}.pdf",
            content_type='application/pdf',
            size=os.path.getsize(local_pdf_path),
            category='devis',
            societe=quote.chantier.societe,
            chantier=quote.chantier,
            owner=request.user,
            created_by=request.user
        )

        return True
    except Exception as e:
        print(f"Erreur lors de la sauvegarde du PDF: {e}")
        return False
```

### Ajout de liens vers le Drive

Dans vos composants existants, ajouter des liens vers le Drive :

```jsx
// Exemple dans un composant chantier
<Button
  variant="outlined"
  startIcon={<FolderIcon />}
  onClick={() =>
    navigate(
      `/drive?societe_id=${chantier.societe.id}&chantier_id=${chantier.id}`
    )
  }
>
  Voir les documents
</Button>
```

## Sécurité

### Permissions

- **Accès par utilisateur** : Chaque utilisateur ne voit que ses documents
- **Validation côté serveur** : Vérification des permissions sur chaque requête
- **URLs présignées** : Accès temporaire et sécurisé aux fichiers

### Bonnes pratiques

- **Taille maximale** : 100 MB par fichier (configurable)
- **Types autorisés** : Validation des types MIME
- **Quotas** : Possibilité d'ajouter des quotas par utilisateur
- **Audit** : Logs des actions (upload, download, suppression)

## Maintenance

### Sauvegarde

- **S3** : Rétention et versioning configurables
- **Base de données** : Sauvegarde régulière de la table `Document`
- **Logs** : Conservation des logs d'accès

### Monitoring

- **Utilisation S3** : Surveillance des coûts et de l'espace
- **Performance** : Monitoring des temps de réponse API
- **Erreurs** : Logs d'erreur et alertes

### Mise à jour

```bash
# Backend
pip install --upgrade django-storages boto3

# Frontend
cd frontend
npm update
```

## Dépannage

### Problèmes courants

1. **Erreur CORS** : Vérifier la configuration CORS S3
2. **Upload échoue** : Vérifier les permissions IAM
3. **URLs présignées expirées** : Augmenter la durée de validité
4. **Performance lente** : Vérifier la région S3 et la connexion

### Logs utiles

```bash
# Logs Django
python manage.py runserver --verbosity=2

# Logs S3 (via CloudWatch)
aws logs describe-log-groups --log-group-name-prefix "/aws/s3/agency-drive-prod"
```

## Support

Pour toute question ou problème :

1. Vérifier les logs Django et S3
2. Tester les endpoints API individuellement
3. Vérifier la configuration des variables d'environnement
4. Consulter la documentation AWS S3 et Django Storages

## Évolutions futures

- **WebDAV** : Montage comme lecteur réseau (macOS/Windows)
- **Versioning** : Gestion des versions de documents
- **Partage** : Liens de partage publics/privés
- **Recherche avancée** : Recherche plein-texte dans les documents
- **Antivirus** : Scan automatique des fichiers uploadés
- **Synchronisation** : Sync avec dossiers locaux
