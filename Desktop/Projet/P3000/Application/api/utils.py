from .models import Schedule, LaborCost, Agent, Chantier

# def recalculate_labor_costs_for_period(week=None, year=None, agent_id=None, chantier_id=None):
#     schedules = Schedule.objects.all()
#     if week:
#         schedules = schedules.filter(week=week)
#     if year:
#         schedules = schedules.filter(year=year)
#     if agent_id:
#         schedules = schedules.filter(agent_id=agent_id)
#     if chantier_id:
#         schedules = schedules.filter(chantier_id=chantier_id)

#     data = {}
#     for s in schedules:
#         key = (s.agent_id, s.chantier_id, s.week, s.year)
#         data.setdefault(key, 0)
#         data[key] += 1

#     for (agent_id, chantier_id, week, year), hours in data.items():
#         agent = Agent.objects.get(id=agent_id)
#         chantier = Chantier.objects.get(id=chantier_id)
#         cost = hours * (agent.taux_Horaire or 0)
#         LaborCost.objects.update_or_create(
#             agent=agent, chantier=chantier, week=week, year=year,
#             defaults={'hours': hours, 'cost': cost}
#         )

import os
import boto3
from django.utils.text import slugify
from pathlib import Path
import json
import re
from datetime import datetime

# Dossier local pour le stockage de test (sans importer settings)
LOCAL_STORAGE_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'local_storage')

def custom_slugify(text):
    """
    Slugification personnalisée qui préserve les majuscules au début des mots
    """
    if not text:
        return ""
    
    # Nettoyer le texte : supprimer les espaces multiples et normaliser
    text = re.sub(r'\s+', ' ', text.strip())
    
    # Remplacer les espaces par des tirets
    text = re.sub(r'\s+', '-', text)
    
    # Garder les caractères alphanumériques, tirets, underscores et points
    text = re.sub(r'[^a-zA-Z0-9\-_.]', '', text)
    
    # Supprimer les tirets multiples
    text = re.sub(r'-+', '-', text)
    
    # Supprimer les tirets en début et fin
    text = text.strip('-')
    
    # Préserver les majuscules au début des mots
    # Convertir en minuscules sauf la première lettre de chaque mot
    if text:
        # Diviser par les tirets et capitaliser chaque partie
        parts = text.split('-')
        capitalized_parts = []
        for part in parts:
            if part:
                # Capitaliser la première lettre et mettre le reste en minuscules
                capitalized_parts.append(part[0].upper() + part[1:].lower())
        text = '-'.join(capitalized_parts)
    
    return text or "Dossier"

def ensure_local_storage():
    """Crée le dossier de stockage local s'il n'existe pas"""
    if not os.path.exists(LOCAL_STORAGE_PATH):
        os.makedirs(LOCAL_STORAGE_PATH, exist_ok=True)

def get_s3_client():
    """
    Retourne un client S3 configuré ou utilise le stockage local
    """
    # Vérifier que les variables d'environnement sont définies
    access_key = os.getenv('AWS_ACCESS_KEY_ID')
    secret_key = os.getenv('AWS_SECRET_ACCESS_KEY')
    
    # Utiliser eu-north-1 comme demandé
    region = 'eu-north-1'
    
    endpoint_url = os.getenv('S3_ENDPOINT_URL')  # Garder pour compatibilité
    bucket_name = os.getenv('AWS_STORAGE_BUCKET_NAME')
    
    # Si S3 n'est pas configuré, utiliser le stockage local
    if not access_key or not secret_key or not bucket_name:
        return None
    
    # Préparer les paramètres du client
    client_params = {
        'service_name': 's3',
        'aws_access_key_id': access_key,
        'aws_secret_access_key': secret_key,
        'region_name': region,
        'config': boto3.session.Config(signature_version='s3v4')
    }
    
    # Ajouter endpoint_url seulement s'il n'est pas vide
    if endpoint_url and endpoint_url.strip():
        client_params['endpoint_url'] = endpoint_url.strip()
    
    try:
        return boto3.client(**client_params)
    except Exception as e:
        return None


def get_s3_bucket_name():
    """
    Retourne le nom du bucket S3 avec vérification
    """
    bucket_name = os.getenv('AWS_STORAGE_BUCKET_NAME')
    if not bucket_name:
        return None
    return bucket_name


def is_s3_available():
    """Vérifie si S3 est configuré et disponible"""
    try:
        client = get_s3_client()
        bucket = get_s3_bucket_name()
        return client is not None and bucket is not None
    except Exception as e:
        return False


def build_document_key(societe, chantier, category, filename, custom_folder=None):
    """
    Génère une clé S3 pour un document selon l'arborescence:
    companies/{societe_id}_{societe_slug}/chantiers/{chantier_id}_{chantier_slug}/{category}/{custom_folder}/{filename}

    Args:
        societe: instance du modèle Societe
        chantier: instance du modèle Chantier
        category: catégorie du document (devis, factures, etc.)
        filename: nom original du fichier
        custom_folder: nom du dossier personnalisé (optionnel)

    Returns:
        str: clé S3 complète
    """
    # Nettoyer et slugifier les noms
    societe_part = f"{societe.id}_{custom_slugify(societe.nom_societe)}" if societe else "sans_societe"
    chantier_part = f"{chantier.id}_{custom_slugify(chantier.chantier_name)}" if chantier else "sans_chantier"
    category_part = custom_slugify(category)

    # Nettoyer le nom de fichier
    name = Path(filename)
    safe_filename = f"{custom_slugify(name.stem)}{name.suffix.lower()}"

    # Construire le chemin
    if societe and chantier:
        base_path = f"companies/{societe_part}/chantiers/{chantier_part}/{category_part}"
        if custom_folder:
            base_path += f"/{custom_slugify(custom_folder)}"
        return f"{base_path}/{safe_filename}"
    elif societe:
        base_path = f"companies/{societe_part}/{category_part}"
        if custom_folder:
            base_path += f"/{custom_slugify(custom_folder)}"
        return f"{base_path}/{safe_filename}"
    else:
        base_path = f"documents/{category_part}"
        if custom_folder:
            base_path += f"/{custom_slugify(custom_folder)}"
        return f"{base_path}/{safe_filename}"


# Fonctions de stockage local pour les tests
def list_local_folders(prefix=""):
    """Liste les dossiers dans le stockage local"""
    try:
        ensure_local_storage()
        folders = []
        
        # Lire le fichier de métadonnées
        metadata_file = os.path.join(LOCAL_STORAGE_PATH, 'folders.json')
        
        if os.path.exists(metadata_file):
            with open(metadata_file, 'r') as f:
                all_folders = json.load(f)
            
            # Filtrer par préfixe
            for folder in all_folders:
                if folder['path'].startswith(prefix):
                    folders.append(folder)
        else:
            # Créer un fichier vide
            with open(metadata_file, 'w') as f:
                json.dump([], f)
        
        return folders
        
    except Exception as e:
        print(f"❌ Erreur dans list_local_folders: {e}")
        return []


def create_local_folder(folder_path):
    """Crée un dossier dans le stockage local"""
    ensure_local_storage()
    
    try:
        # Créer le dossier physique
        full_path = os.path.join(LOCAL_STORAGE_PATH, folder_path)
        os.makedirs(full_path, exist_ok=True)
        
        # Créer le fichier .keep
        keep_file = os.path.join(full_path, '.keep')
        with open(keep_file, 'w') as f:
            f.write('')
        
        # Ajouter aux métadonnées
        folder_name = folder_path.split('/')[-1]
        metadata_file = os.path.join(LOCAL_STORAGE_PATH, 'folders.json')
        
        folders = []
        if os.path.exists(metadata_file):
            with open(metadata_file, 'r') as f:
                folders = json.load(f)
        
        # Vérifier si le dossier existe déjà
        if not any(f['path'] == folder_path for f in folders):
            folders.append({
                'name': folder_name,
                'path': folder_path,
                'type': 'folder'
            })
            
            with open(metadata_file, 'w') as f:
                json.dump(folders, f, indent=2)
        
        return True
    except Exception as e:
        print(f"Erreur lors de la création du dossier local: {e}")
        return False


def delete_local_folder(folder_path):
    """Supprime un dossier du stockage local"""
    ensure_local_storage()
    
    try:
        # Supprimer le dossier physique
        full_path = os.path.join(LOCAL_STORAGE_PATH, folder_path)
        if os.path.exists(full_path):
            import shutil
            shutil.rmtree(full_path)
        
        # Supprimer des métadonnées
        metadata_file = os.path.join(LOCAL_STORAGE_PATH, 'folders.json')
        if os.path.exists(metadata_file):
            with open(metadata_file, 'r') as f:
                folders = json.load(f)
            
            folders = [f for f in folders if f['path'] != folder_path]
            
            with open(metadata_file, 'w') as f:
                json.dump(folders, f, indent=2)
        
        return True
    except Exception as e:
        print(f"Erreur lors de la suppression du dossier local: {e}")
        return False


# Fonctions S3
def generate_presigned_url(operation, key, expires_in=3600):
    """
    Génère une URL présignée pour S3

    Args:
        operation: 'get_object' ou 'put_object'
        key: clé S3
        expires_in: durée de validité en secondes

    Returns:
        str: URL présignée
    """
    if not is_s3_available():
        raise ValueError("S3 non configuré")
    
    s3_client = get_s3_client()
    bucket_name = get_s3_bucket_name()

    return s3_client.generate_presigned_url(
        operation,
        Params={
            'Bucket': bucket_name,
            'Key': key
        },
        ExpiresIn=expires_in
    )

def generate_presigned_url_for_display(key, expires_in=3600):
    """
    Génère une URL présignée pour l'affichage inline dans le navigateur

    Args:
        key: clé S3
        expires_in: durée de validité en secondes

    Returns:
        str: URL présignée pour l'affichage
    """
    if not is_s3_available():
        raise ValueError("S3 non configuré")
    
    s3_client = get_s3_client()
    bucket_name = get_s3_bucket_name()

    return s3_client.generate_presigned_url(
        'get_object',
        Params={
            'Bucket': bucket_name,
            'Key': key,
            'ResponseContentDisposition': 'inline',  # Force l'affichage au lieu du téléchargement
        },
        ExpiresIn=expires_in
    )


def generate_presigned_post(key, fields=None, conditions=None, expires_in=3600):
    """
    Génère une URL présignée POST pour upload direct

    Args:
        key: clé S3
        fields: champs additionnels
        conditions: conditions de validation
        expires_in: durée de validité en secondes

    Returns:
        dict: réponse avec URL et champs
    """
    if not is_s3_available():
        raise ValueError("S3 non configuré")
    
    s3_client = get_s3_client()
    bucket_name = get_s3_bucket_name()

    if fields is None:
        fields = {'acl': 'private'}

    if conditions is None:
        conditions = [
            {'acl': 'private'},
            ['content-length-range', 0, 100 * 1024 * 1024],  # 100 MB max
        ]

    return s3_client.generate_presigned_post(
        Bucket=bucket_name,
        Key=key,
        Fields=fields,
        Conditions=conditions,
        ExpiresIn=expires_in
    )


def list_s3_folders(prefix=""):
    """
    Liste les dossiers (préfixes) dans S3
    
    Args:
        prefix: préfixe pour filtrer les résultats
        
    Returns:
        list: liste des dossiers trouvés
    """
    try:
        # Vérifier si S3 est disponible
        s3_available = is_s3_available()
        
        if not s3_available:
            return list_local_folders(prefix)
        
        s3_client = get_s3_client()
        bucket_name = get_s3_bucket_name()
        
        response = s3_client.list_objects_v2(
            Bucket=bucket_name,
            Prefix=prefix,
            Delimiter='/'
        )
        
        folders = []
        if 'CommonPrefixes' in response:
            for obj in response['CommonPrefixes']:
                folder_name = obj['Prefix'].split('/')[-2]
                folders.append({
                    'name': folder_name,
                    'path': obj['Prefix'],
                    'type': 'folder'
                })
        
        return folders
        
    except Exception as e:
        print(f"❌ Erreur dans list_s3_folders: {e}")
        return []


def create_s3_folder(folder_path):
    """
    Crée un dossier virtuel dans S3 (en créant un objet vide)
    
    Args:
        folder_path: chemin complet du dossier
        
    Returns:
        bool: True si créé avec succès
    """
    if not is_s3_available():
        return create_local_folder(folder_path)
    
    s3_client = get_s3_client()
    bucket_name = get_s3_bucket_name()
    
    try:
        # Créer un objet vide pour représenter le dossier
        s3_client.put_object(
            Bucket=bucket_name,
            Key=f"{folder_path}/.keep"
        )
        return True
    except Exception as e:
        print(f"Erreur lors de la création du dossier S3: {e}")
        return False


def delete_s3_folder(folder_path):
    """
    Supprime un dossier et son contenu dans S3
    
    Args:
        folder_path: chemin complet du dossier
        
    Returns:
        bool: True si supprimé avec succès
    """
    if not is_s3_available():
        return delete_local_folder(folder_path)
    
    s3_client = get_s3_client()
    bucket_name = get_s3_bucket_name()
    
    try:
        # Lister tous les objets dans le dossier
        response = s3_client.list_objects_v2(
            Bucket=bucket_name,
            Prefix=folder_path
        )
        
        if 'Contents' in response:
            # Supprimer tous les objets
            objects_to_delete = [{'Key': obj['Key']} for obj in response['Contents']]
            s3_client.delete_objects(
                Bucket=bucket_name,
                Delete={'Objects': objects_to_delete}
            )
        
        return True
    except Exception as e:
        print(f"Erreur lors de la suppression du dossier S3: {e}")
        return False


# Nouvelles fonctions pour le drive complet
def list_s3_folder_content(folder_path=""):
    """
    Liste le contenu complet d'un dossier (fichiers + sous-dossiers)
    
    Args:
        folder_path: chemin du dossier à lister
        
    Returns:
        dict: {'folders': [...], 'files': [...]}
    """
    if not is_s3_available():
        return list_local_folder_content(folder_path)
    
    s3_client = get_s3_client()
    bucket_name = get_s3_bucket_name()
    
    try:
        # Lister tous les objets avec le préfixe
        response = s3_client.list_objects_v2(
            Bucket=bucket_name,
            Prefix=folder_path,
            Delimiter='/'
        )
        
        folders = []
        files = []
        
        # Traiter les dossiers (CommonPrefixes)
        if 'CommonPrefixes' in response:
            for obj in response['CommonPrefixes']:
                folder_name = obj['Prefix'].split('/')[-2]
                folders.append({
                    'name': folder_name,
                    'path': obj['Prefix'],
                    'type': 'folder'
                })
        
        # Traiter les fichiers (Contents)
        if 'Contents' in response:
            for obj in response['Contents']:
                # Ignorer les objets qui se terminent par '/' (dossiers)
                # ET ignorer les fichiers .keep
                if obj['Key'].endswith('/') or obj['Key'].endswith('/.keep'):
                    continue
                if not obj['Key'].endswith('/') and obj['Key'] != folder_path:
                    file_name = obj['Key'].split('/')[-1]
                    files.append({
                        'name': file_name,
                        'path': obj['Key'],
                        'size': obj['Size'],
                        'last_modified': obj['LastModified'],
                        'type': 'file'
                    })
        
        return {
            'folders': folders,
            'files': files
        }
        
    except Exception as e:
        print(f"Erreur lors de la liste du contenu S3: {e}")
        return {'folders': [], 'files': []}


def list_s3_folder_content_paginated(folder_path="", page=1, limit=50, sort_by='name', sort_order='asc'):
    """
    Liste le contenu d'un dossier avec pagination et tri (avec cache)
    
    Args:
        folder_path: chemin du dossier à lister
        page: numéro de page (commence à 1)
        limit: nombre d'éléments par page
        sort_by: critère de tri (name, size, date)
        sort_order: ordre de tri (asc, desc)
        
    Returns:
        dict: contenu paginé avec métadonnées de pagination
    """
    from django.core.cache import cache
    
    # Clé de cache pour ce dossier
    cache_key = f"folder_content_{folder_path}_{sort_by}_{sort_order}"
    
    # Vérifier le cache d'abord
    cached_data = cache.get(cache_key)
    if cached_data:
        # Appliquer la pagination sur les données en cache
        all_items = cached_data.get('all_items', [])
        total_items = len(all_items)
        total_pages = (total_items + limit - 1) // limit
        start_index = (page - 1) * limit
        end_index = start_index + limit
        
        paginated_items = all_items[start_index:end_index]
        page_folders = [item for item in paginated_items if item['type'] == 'folder']
        page_files = [item for item in paginated_items if item['type'] == 'file']
        
        return {
            'folders': page_folders,
            'files': page_files,
            'total_items': total_items,
            'total_pages': total_pages,
            'has_next': page < total_pages,
            'has_previous': page > 1
        }
    
    if not is_s3_available():
        return list_local_folder_content_paginated(folder_path, page, limit, sort_by, sort_order)
    
    s3_client = get_s3_client()
    bucket_name = get_s3_bucket_name()
    
    try:
        # Lister tous les objets avec le préfixe
        response = s3_client.list_objects_v2(
            Bucket=bucket_name,
            Prefix=folder_path,
            Delimiter='/'
        )
        
        folders = []
        files = []
        
        # Traiter les dossiers (CommonPrefixes)
        if 'CommonPrefixes' in response:
            for obj in response['CommonPrefixes']:
                folder_name = obj['Prefix'].split('/')[-2]
                folders.append({
                    'name': folder_name,
                    'path': obj['Prefix'],
                    'type': 'folder',
                    'size': 0,  # Les dossiers n'ont pas de taille
                    'last_modified': None
                })
        
        # Traiter les fichiers (Contents)
        if 'Contents' in response:
            for obj in response['Contents']:
                # Ignorer les objets qui se terminent par '/' (dossiers)
                # ET ignorer les fichiers .keep
                if obj['Key'].endswith('/') or obj['Key'].endswith('/.keep'):
                    continue
                if not obj['Key'].endswith('/') and obj['Key'] != folder_path:
                    file_name = obj['Key'].split('/')[-1]
                    files.append({
                        'name': file_name,
                        'path': obj['Key'],
                        'size': obj['Size'],
                        'last_modified': obj['LastModified'],
                        'type': 'file'
                    })
        
        # Combiner tous les éléments
        all_items = folders + files
        
        # Trier les éléments
        if sort_by == 'name':
            all_items.sort(key=lambda x: x['name'].lower(), reverse=(sort_order == 'desc'))
        elif sort_by == 'size':
            all_items.sort(key=lambda x: x.get('size', 0), reverse=(sort_order == 'desc'))
        elif sort_by == 'date':
            all_items.sort(key=lambda x: x.get('last_modified') or datetime.min, reverse=(sort_order == 'desc'))
        
        # Calculer la pagination
        total_items = len(all_items)
        total_pages = (total_items + limit - 1) // limit
        start_index = (page - 1) * limit
        end_index = start_index + limit
        
        # Extraire les éléments de la page
        paginated_items = all_items[start_index:end_index]
        
        # Séparer les dossiers et fichiers
        page_folders = [item for item in paginated_items if item['type'] == 'folder']
        page_files = [item for item in paginated_items if item['type'] == 'file']
        
        # Mettre en cache toutes les données (pas seulement la page actuelle)
        cache_data = {
            'all_items': all_items,
            'cached_at': datetime.now().isoformat()
        }
        cache.set(cache_key, cache_data, 900)  # Cache pendant 15 minutes
        
        return {
            'folders': page_folders,
            'files': page_files,
            'total_items': total_items,
            'total_pages': total_pages,
            'has_next': page < total_pages,
            'has_previous': page > 1
        }
        
    except Exception as e:
        print(f"Erreur lors de la liste paginée du contenu S3: {e}")
        return {
            'folders': [],
            'files': [],
            'total_items': 0,
            'total_pages': 0,
            'has_next': False,
            'has_previous': False
        }


def invalidate_folder_cache(folder_path=""):
    """
    Invalide le cache pour un dossier spécifique
    """
    from django.core.cache import cache
    
    # Invalider toutes les clés de cache pour ce dossier
    cache_patterns = [
        f"folder_content_{folder_path}_name_asc",
        f"folder_content_{folder_path}_name_desc", 
        f"folder_content_{folder_path}_size_asc",
        f"folder_content_{folder_path}_size_desc",
        f"folder_content_{folder_path}_date_asc",
        f"folder_content_{folder_path}_date_desc"
    ]
    
    for pattern in cache_patterns:
        cache.delete(pattern)
    
    # Invalider aussi le cache du dossier parent
    if folder_path:
        parent_path = '/'.join(folder_path.split('/')[:-1])
        if parent_path:
            invalidate_folder_cache(parent_path)


def list_local_folder_content(folder_path=""):
    """Liste le contenu d'un dossier dans le stockage local"""
    try:
        ensure_local_storage()
        folders = []
        files = []
        
        # Lire le fichier de métadonnées
        metadata_file = os.path.join(LOCAL_STORAGE_PATH, 'folders.json')
        
        if os.path.exists(metadata_file):
            with open(metadata_file, 'r') as f:
                all_folders = json.load(f)
            
            # Filtrer les dossiers du niveau actuel
            for folder in all_folders:
                if folder['path'].startswith(folder_path) and folder['path'] != folder_path:
                    # Vérifier si c'est un sous-dossier direct
                    relative_path = folder['path'][len(folder_path):].strip('/')
                    if '/' not in relative_path:
                        folders.append(folder)
        
        # Lister les fichiers dans le dossier
        full_path = os.path.join(LOCAL_STORAGE_PATH, folder_path)
        if os.path.exists(full_path):
            for item in os.listdir(full_path):
                item_path = os.path.join(full_path, item)
                if os.path.isfile(item_path) and item != '.keep':
                    files.append({
                        'name': item,
                        'path': f"{folder_path}/{item}",
                        'size': os.path.getsize(item_path),
                        'last_modified': datetime.fromtimestamp(os.path.getmtime(item_path)),
                        'type': 'file'
                    })
        
        return {
            'folders': folders,
            'files': files
        }
        
    except Exception as e:
        print(f"Erreur lors de la liste du contenu local: {e}")
        return {'folders': [], 'files': []}


def list_local_folder_content_paginated(folder_path="", page=1, limit=50, sort_by='name', sort_order='asc'):
    """Liste le contenu d'un dossier dans le stockage local avec pagination"""
    try:
        ensure_local_storage()
        folders = []
        files = []
        
        # Lire le fichier de métadonnées
        metadata_file = os.path.join(LOCAL_STORAGE_PATH, 'folders.json')
        
        if os.path.exists(metadata_file):
            with open(metadata_file, 'r') as f:
                all_folders = json.load(f)
            
            # Filtrer les dossiers du niveau actuel
            for folder in all_folders:
                if folder['path'].startswith(folder_path) and folder['path'] != folder_path:
                    # Vérifier si c'est un sous-dossier direct
                    relative_path = folder['path'][len(folder_path):].strip('/')
                    if '/' not in relative_path:
                        folder['size'] = 0
                        folder['last_modified'] = None
                        folders.append(folder)
        
        # Lister les fichiers dans le dossier
        full_path = os.path.join(LOCAL_STORAGE_PATH, folder_path)
        if os.path.exists(full_path):
            for item in os.listdir(full_path):
                item_path = os.path.join(full_path, item)
                if os.path.isfile(item_path) and item != '.keep':
                    files.append({
                        'name': item,
                        'path': f"{folder_path}/{item}",
                        'size': os.path.getsize(item_path),
                        'last_modified': datetime.fromtimestamp(os.path.getmtime(item_path)),
                        'type': 'file'
                    })
        
        # Combiner tous les éléments
        all_items = folders + files
        
        # Trier les éléments
        if sort_by == 'name':
            all_items.sort(key=lambda x: x['name'].lower(), reverse=(sort_order == 'desc'))
        elif sort_by == 'size':
            all_items.sort(key=lambda x: x.get('size', 0), reverse=(sort_order == 'desc'))
        elif sort_by == 'date':
            all_items.sort(key=lambda x: x.get('last_modified') or datetime.min, reverse=(sort_order == 'desc'))
        
        # Calculer la pagination
        total_items = len(all_items)
        total_pages = (total_items + limit - 1) // limit
        start_index = (page - 1) * limit
        end_index = start_index + limit
        
        # Extraire les éléments de la page
        paginated_items = all_items[start_index:end_index]
        
        # Séparer les dossiers et fichiers
        page_folders = [item for item in paginated_items if item['type'] == 'folder']
        page_files = [item for item in paginated_items if item['type'] == 'file']
        
        return {
            'folders': page_folders,
            'files': page_files,
            'total_items': total_items,
            'total_pages': total_pages,
            'has_next': page < total_pages,
            'has_previous': page > 1
        }
        
    except Exception as e:
        print(f"Erreur lors de la liste paginée du contenu local: {e}")
        return {
            'folders': [],
            'files': [],
            'total_items': 0,
            'total_pages': 0,
            'has_next': False,
            'has_previous': False
        }


def create_s3_folder_recursive(folder_path):
    """
    Crée un dossier de manière récursive (crée les dossiers parents si nécessaire)
    
    Args:
        folder_path: chemin complet du dossier
        
    Returns:
        bool: True si créé avec succès
    """
    if not is_s3_available():
        return create_local_folder_recursive(folder_path)
    
    s3_client = get_s3_client()
    bucket_name = get_s3_bucket_name()
    
    try:
        # Créer le dossier et tous ses parents
        parts = folder_path.split('/')
        current_path = ""
        
        for part in parts:
            if part:
                current_path = f"{current_path}/{part}" if current_path else part
                # Créer un objet vide pour représenter le dossier
                s3_client.put_object(
                    Bucket=bucket_name,
                    Key=f"{current_path}/.keep"
                )
        
        return True
    except Exception as e:
        print(f"Erreur lors de la création récursive du dossier S3: {e}")
        return False


def create_local_folder_recursive(folder_path):
    """Crée un dossier de manière récursive dans le stockage local"""
    ensure_local_storage()
    
    try:
        # Créer le dossier physique
        full_path = os.path.join(LOCAL_STORAGE_PATH, folder_path)
        os.makedirs(full_path, exist_ok=True)
        
        # Créer le fichier .keep
        keep_file = os.path.join(full_path, '.keep')
        with open(keep_file, 'w') as f:
            f.write('')
        
        # Ajouter aux métadonnées
        folder_name = folder_path.split('/')[-1]
        metadata_file = os.path.join(LOCAL_STORAGE_PATH, 'folders.json')
        
        folders = []
        if os.path.exists(metadata_file):
            with open(metadata_file, 'r') as f:
                folders = json.load(f)
        
        # Vérifier si le dossier existe déjà
        if not any(f['path'] == folder_path for f in folders):
            folders.append({
                'name': folder_name,
                'path': folder_path,
                'type': 'folder'
            })
            
            with open(metadata_file, 'w') as f:
                json.dump(folders, f, indent=2)
        
        return True
    except Exception as e:
        print(f"Erreur lors de la création récursive du dossier local: {e}")
        return False


def search_s3_files(search_term, folder_path=""):
    """
    Recherche des fichiers dans S3
    
    Args:
        search_term: terme de recherche
        folder_path: dossier de base pour la recherche
        
    Returns:
        dict: {'files': [...], 'folders': [...]}
    """
    if not is_s3_available():
        return search_local_files(search_term, folder_path)
    
    s3_client = get_s3_client()
    bucket_name = get_s3_bucket_name()
    
    try:
        # Lister tous les objets avec le préfixe
        response = s3_client.list_objects_v2(
            Bucket=bucket_name,
            Prefix=folder_path
        )
        
        files = []
        folders = []
        
        if 'Contents' in response:
            for obj in response['Contents']:
                file_name = obj['Key'].split('/')[-1]
                if search_term.lower() in file_name.lower():
                    if obj['Key'].endswith('/'):
                        folders.append({
                            'name': file_name,
                            'path': obj['Key'],
                            'type': 'folder'
                        })
                    else:
                        files.append({
                            'name': file_name,
                            'path': obj['Key'],
                            'size': obj['Size'],
                            'last_modified': obj['LastModified'],
                            'type': 'file'
                        })
        
        return {
            'files': files,
            'folders': folders
        }
        
    except Exception as e:
        print(f"Erreur lors de la recherche S3: {e}")
        return {'files': [], 'folders': []}


def search_local_files(search_term, folder_path=""):
    """Recherche des fichiers dans le stockage local"""
    try:
        ensure_local_storage()
        files = []
        folders = []
        
        # Rechercher dans les métadonnées
        metadata_file = os.path.join(LOCAL_STORAGE_PATH, 'folders.json')
        
        if os.path.exists(metadata_file):
            with open(metadata_file, 'r') as f:
                all_folders = json.load(f)
            
            for folder in all_folders:
                if folder['path'].startswith(folder_path) and search_term.lower() in folder['name'].lower():
                    folders.append(folder)
        
        # Rechercher dans les fichiers
        full_path = os.path.join(LOCAL_STORAGE_PATH, folder_path)
        if os.path.exists(full_path):
            for root, dirs, filenames in os.walk(full_path):
                for filename in filenames:
                    if search_term.lower() in filename.lower():
                        file_path = os.path.join(root, filename)
                        relative_path = os.path.relpath(file_path, LOCAL_STORAGE_PATH)
                        files.append({
                            'name': filename,
                            'path': relative_path,
                            'size': os.path.getsize(file_path),
                            'last_modified': datetime.fromtimestamp(os.path.getmtime(file_path)),
                            'type': 'file'
                        })
        
        return {
            'files': files,
            'folders': folders
        }
        
    except Exception as e:
        print(f"Erreur lors de la recherche locale: {e}")
        return {'files': [], 'folders': []}


def move_s3_file(source_path, destination_path):
    """
    Déplace un fichier dans S3
    
    Args:
        source_path: chemin source
        destination_path: chemin de destination
        
    Returns:
        bool: True si déplacé avec succès
    """
    if not is_s3_available():
        return move_local_file(source_path, destination_path)
    
    s3_client = get_s3_client()
    bucket_name = get_s3_bucket_name()
    
    try:
        # Copier vers la nouvelle destination
        s3_client.copy_object(
            Bucket=bucket_name,
            CopySource={'Bucket': bucket_name, 'Key': source_path},
            Key=destination_path
        )
        
        # Supprimer l'original
        s3_client.delete_object(
            Bucket=bucket_name,
            Key=source_path
        )
        
        return True
    except Exception as e:
        print(f"Erreur lors du déplacement S3: {e}")
        return False


def move_local_file(source_path, destination_path):
    """Déplace un fichier dans le stockage local"""
    try:
        source_full = os.path.join(LOCAL_STORAGE_PATH, source_path)
        dest_full = os.path.join(LOCAL_STORAGE_PATH, destination_path)
        
        # Créer le dossier de destination si nécessaire
        os.makedirs(os.path.dirname(dest_full), exist_ok=True)
        
        # Déplacer le fichier
        import shutil
        shutil.move(source_full, dest_full)
        
        return True
    except Exception as e:
        print(f"Erreur lors du déplacement local: {e}")
        return False


def rename_s3_item(old_path, new_name):
    """
    Renomme un fichier ou dossier dans S3
    
    Args:
        old_path: ancien chemin
        new_name: nouveau nom
        
    Returns:
        bool: True si renommé avec succès
    """
    if not is_s3_available():
        return rename_local_item(old_path, new_name)
    
    s3_client = get_s3_client()
    bucket_name = get_s3_bucket_name()
    
    try:
        # Construire le nouveau chemin
        parent_path = '/'.join(old_path.split('/')[:-1])
        new_path = f"{parent_path}/{new_name}"
        
        # Lister tous les objets avec l'ancien préfixe
        response = s3_client.list_objects_v2(
            Bucket=bucket_name,
            Prefix=old_path
        )
        
        if 'Contents' in response:
            for obj in response['Contents']:
                # Construire le nouveau chemin pour cet objet
                relative_path = obj['Key'][len(old_path):]
                new_obj_path = f"{new_path}{relative_path}"
                
                # Copier vers la nouvelle destination
                s3_client.copy_object(
                    Bucket=bucket_name,
                    CopySource={'Bucket': bucket_name, 'Key': obj['Key']},
                    Key=new_obj_path
                )
                
                # Supprimer l'original
                s3_client.delete_object(
                    Bucket=bucket_name,
                    Key=obj['Key']
                )
        
        return True
    except Exception as e:
        print(f"Erreur lors du renommage S3: {e}")
        return False


def rename_local_item(old_path, new_name):
    """Renomme un fichier ou dossier dans le stockage local"""
    try:
        old_full = os.path.join(LOCAL_STORAGE_PATH, old_path)
        parent_path = os.path.dirname(old_full)
        new_full = os.path.join(parent_path, new_name)
        
        # Renommer le fichier/dossier
        import shutil
        shutil.move(old_full, new_full)
        
        # Mettre à jour les métadonnées si c'est un dossier
        metadata_file = os.path.join(LOCAL_STORAGE_PATH, 'folders.json')
        if os.path.exists(metadata_file):
            with open(metadata_file, 'r') as f:
                folders = json.load(f)
            
            # Mettre à jour le chemin dans les métadonnées
            for folder in folders:
                if folder['path'] == old_path:
                    folder['path'] = new_full # Use new_full for the path in metadata
                    folder['name'] = new_name
                    break
            
            with open(metadata_file, 'w') as f:
                json.dump(folders, f, indent=2)
        
        return True
    except Exception as e:
        print(f"Erreur lors du renommage local: {e}")
        return False

def delete_s3_file(file_path):
    """Supprime un fichier dans S3"""
    if not is_s3_available():
        return delete_local_file(file_path)
    
    s3_client = get_s3_client()
    bucket_name = get_s3_bucket_name()
    
    try:
        s3_client.delete_object(
            Bucket=bucket_name,
            Key=file_path
        )
        return True
    except Exception as e:
        print(f"Erreur lors de la suppression du fichier S3: {e}")
        return False

def delete_local_file(file_path):
    """Supprime un fichier local"""
    try:
        local_path = os.path.join(LOCAL_STORAGE_PATH, file_path)
        if os.path.exists(local_path):
            os.remove(local_path)
        return True
    except Exception as e:
        print(f"Erreur lors de la suppression locale: {e}")
        return False

def rename_s3_item(old_path, new_name):
    """Renomme un fichier ou dossier dans S3"""
    if not is_s3_available():
        return rename_local_item(old_path, new_name)
    
    s3_client = get_s3_client()
    bucket_name = get_s3_bucket_name()
    
    try:
        # Déterminer si c'est un fichier ou un dossier
        is_folder = old_path.endswith('/')
        
        if is_folder:
            # Pour un dossier, on doit renommer tous les fichiers qu'il contient
            return rename_s3_folder(old_path, new_name)
        else:
            # Pour un fichier, on fait un copy + delete
            return rename_s3_file(old_path, new_name)
            
    except Exception as e:
        print(f"Erreur lors du renommage S3: {e}")
        return False, None

def rename_s3_file(old_path, new_name):
    """Renomme un fichier dans S3"""
    s3_client = get_s3_client()
    bucket_name = get_s3_bucket_name()
    
    try:
        # Extraire le chemin du dossier parent
        parent_path = '/'.join(old_path.split('/')[:-1])
        old_file_name = old_path.split('/')[-1]
        
        # Construire le nouveau chemin
        if parent_path:
            new_path = f"{parent_path}/{custom_slugify(new_name)}"
        else:
            new_path = custom_slugify(new_name)
        
        # Copier le fichier vers le nouveau chemin
        copy_source = {'Bucket': bucket_name, 'Key': old_path}
        s3_client.copy_object(
            CopySource=copy_source,
            Bucket=bucket_name,
            Key=new_path
        )
        
        # Supprimer l'ancien fichier
        s3_client.delete_object(
            Bucket=bucket_name,
            Key=old_path
        )
        
        return True, new_path
        
    except Exception as e:
        print(f"Erreur lors du renommage du fichier S3: {e}")
        return False, None

def rename_s3_folder(old_path, new_name):
    """Renomme un dossier dans S3 (renomme tous les fichiers qu'il contient)"""
    s3_client = get_s3_client()
    bucket_name = get_s3_bucket_name()
    
    try:
        # Extraire le chemin du dossier parent
        parent_path = '/'.join(old_path.rstrip('/').split('/')[:-1])
        old_folder_name = old_path.rstrip('/').split('/')[-1]
        
        # Construire le nouveau chemin du dossier
        if parent_path:
            new_folder_path = f"{parent_path}/{custom_slugify(new_name)}/"
        else:
            new_folder_path = f"{custom_slugify(new_name)}/"
        
        # Lister tous les fichiers dans l'ancien dossier
        response = s3_client.list_objects_v2(
            Bucket=bucket_name,
            Prefix=old_path
        )
        
        if 'Contents' not in response:
            # Dossier vide, créer juste le nouveau dossier
            s3_client.put_object(
                Bucket=bucket_name,
                Key=new_folder_path
            )
            # Supprimer l'ancien dossier vide
            s3_client.delete_object(
                Bucket=bucket_name,
                Key=old_path
            )
            return True, new_folder_path
        
        # Renommer chaque fichier
        for obj in response['Contents']:
            old_file_path = obj['Key']
            
            # Construire le nouveau chemin du fichier
            relative_path = old_file_path[len(old_path):]
            new_file_path = new_folder_path + relative_path
            
            # Copier vers le nouveau chemin
            copy_source = {'Bucket': bucket_name, 'Key': old_file_path}
            s3_client.copy_object(
                CopySource=copy_source,
                Bucket=bucket_name,
                Key=new_file_path
            )
            
            # Supprimer l'ancien fichier
            s3_client.delete_object(
                Bucket=bucket_name,
                Key=old_file_path
            )
        
        return True, new_folder_path
        
    except Exception as e:
        print(f"Erreur lors du renommage du dossier S3: {e}")
        return False, None

def rename_local_item(old_path, new_name):
    """Renomme un fichier ou dossier local"""
    try:
        old_local_path = os.path.join(LOCAL_STORAGE_PATH, old_path)
        
        if os.path.isdir(old_local_path):
            # C'est un dossier
            parent_path = os.path.dirname(old_local_path)
            new_folder_name = custom_slugify(new_name)
            new_local_path = os.path.join(parent_path, new_folder_name)
            
            os.rename(old_local_path, new_local_path)
            
            # Construire le nouveau chemin relatif
            new_path = os.path.relpath(new_local_path, LOCAL_STORAGE_PATH).replace('\\', '/') + '/'
            return True, new_path
        else:
            # C'est un fichier
            parent_path = os.path.dirname(old_local_path)
            file_extension = os.path.splitext(old_path)[1]
            new_file_name = custom_slugify(new_name) + file_extension
            new_local_path = os.path.join(parent_path, new_file_name)
            
            os.rename(old_local_path, new_local_path)
            
            # Construire le nouveau chemin relatif
            new_path = os.path.relpath(new_local_path, LOCAL_STORAGE_PATH).replace('\\', '/')
            return True, new_path
            
    except Exception as e:
        print(f"Erreur lors du renommage local: {e}")
        return False, None

def upload_file_to_s3_robust(local_file_path: str, s3_file_path: str) -> bool:
    """
    Upload robuste d'un fichier vers AWS S3 avec gestion complète du flux
    
    Args:
        local_file_path: Chemin du fichier local
        s3_file_path: Chemin du fichier dans S3
        
    Returns:
        bool: True si l'upload a réussi, False sinon
    """
    try:
        if not is_s3_available():
            print(f"❌ AWS S3 non disponible pour l'upload de {local_file_path}")
            return False
        
        s3_client = get_s3_client()
        bucket_name = get_s3_bucket_name()
        
        # Vérifier que le fichier local existe
        if not os.path.exists(local_file_path):
            print(f"❌ Fichier local introuvable: {local_file_path}")
            return False
        
        # Vérifier la taille du fichier
        file_size = os.path.getsize(local_file_path)
        print(f"📊 Taille du fichier: {file_size} octets ({file_size / (1024*1024):.2f} MB)")
        
        # Upload avec gestion de flux personnalisée
        print(f"🚀 Upload robuste de {local_file_path} vers S3: {s3_file_path}")
        
        # Lire le fichier en entier pour s'assurer qu'il n'y a pas de troncature
        with open(local_file_path, 'rb') as file:
            file_content = file.read()
            print(f"📖 Fichier lu en mémoire: {len(file_content)} octets")
            
            # Vérifier que tout le contenu a été lu
            if len(file_content) != file_size:
                print(f"❌ ERREUR: Contenu tronqué! Attendu: {file_size}, Lu: {len(file_content)}")
                return False
            
            # Upload du contenu complet
            s3_client.put_object(
                Bucket=bucket_name,
                Key=s3_file_path,
                Body=file_content,
                ContentType='application/pdf',
                ContentDisposition='inline',
                ServerSideEncryption='AES256'
            )
        
        print(f"✅ Fichier uploadé avec succès: {s3_file_path}")
        
        # Vérifier que le fichier a bien été uploadé
        try:
            response = s3_client.head_object(Bucket=bucket_name, Key=s3_file_path)
            uploaded_size = response['ContentLength']
            print(f"✅ Vérification S3: fichier uploadé avec {uploaded_size} octets")
            if uploaded_size != file_size:
                print(f"⚠️ ATTENTION: Taille différente! Local: {file_size}, S3: {uploaded_size}")
                return False
        except Exception as e:
            print(f"❌ Erreur lors de la vérification S3: {str(e)}")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Erreur lors de l'upload vers S3: {str(e)}")
        return False


def upload_file_to_s3(local_file_path: str, s3_file_path: str) -> bool:
    """
    Upload un fichier local vers AWS S3
    
    Args:
        local_file_path: Chemin du fichier local
        s3_file_path: Chemin du fichier dans S3
        
    Returns:
        bool: True si l'upload a réussi, False sinon
    """
    try:
        if not is_s3_available():
            print(f"❌ AWS S3 non disponible pour l'upload de {local_file_path}")
            return False
        
        s3_client = get_s3_client()
        bucket_name = get_s3_bucket_name()
        
        # Vérifier que le fichier local existe
        if not os.path.exists(local_file_path):
            print(f"❌ Fichier local introuvable: {local_file_path}")
            return False
        
        # Upload du fichier avec gestion complète du flux
        print(f"🚀 Upload de {local_file_path} vers S3: {s3_file_path}")
        
        # Utiliser upload_file au lieu de upload_fileobj pour une meilleure gestion des gros fichiers
        s3_client.upload_file(
            local_file_path,
            bucket_name,
            s3_file_path,
            ExtraArgs={
                'ContentType': 'application/pdf',
                'ContentDisposition': 'inline',
                'ServerSideEncryption': 'AES256'
            }
        )
        
        print(f"✅ Fichier uploadé avec succès: {s3_file_path}")
        return True
        
    except Exception as e:
        print(f"❌ Erreur lors de l'upload vers S3: {str(e)}")
        return False
