"""
OnlyOffice Integration - Gestion de l'édition de documents
"""

from django.conf import settings
from django.core.cache import cache
from rest_framework import status
from rest_framework.response import Response
import jwt
import time
import requests
import re


class OnlyOfficeManager:
    """
    Gestionnaire OnlyOffice pour l'édition de documents
    """
    
    @staticmethod
    def get_document_type(file_name: str) -> str:
        """
        Détermine le type de document pour OnlyOffice
        
        Args:
            file_name: Nom du fichier
            
        Returns:
            Type de document (word, cell, slide)
        """
        extension = file_name.split('.')[-1].lower()
        
        word_extensions = ['doc', 'docx', 'docm', 'dot', 'dotx', 'dotm', 'odt', 'fodt', 'ott', 'rtf', 'txt']
        cell_extensions = ['xls', 'xlsx', 'xlsm', 'xlt', 'xltx', 'xltm', 'ods', 'fods', 'ots', 'csv']
        slide_extensions = ['ppt', 'pptx', 'pptm', 'pot', 'potx', 'potm', 'odp', 'fodp', 'otp']
        
        if extension in word_extensions:
            return 'word'
        elif extension in cell_extensions:
            return 'cell'
        elif extension in slide_extensions:
            return 'slide'
        else:
            return 'word'  # Par défaut
    
    @staticmethod
    def is_office_file(file_name: str) -> bool:
        """
        Vérifie si le fichier est éditable avec OnlyOffice
        
        Args:
            file_name: Nom du fichier
            
        Returns:
            True si le fichier est éditable
        """
        extension = file_name.split('.')[-1].lower()
        editable_extensions = [
            'doc', 'docx', 'docm', 'dot', 'dotx', 'dotm',
            'xls', 'xlsx', 'xlsm', 'xlt', 'xltx', 'xltm',
            'ppt', 'pptx', 'pptm', 'pot', 'potx', 'potm',
            'odt', 'ods', 'odp', 'rtf', 'txt', 'csv'
        ]
        return extension in editable_extensions
    
    @staticmethod
    def generate_clean_key(file_path: str) -> tuple:
        """
        Génère une clé STABLE pour OnlyOffice (sans timestamp)
        
        Args:
            file_path: Chemin du fichier
            
        Returns:
            Tuple (document_key, version)
        """
        import hashlib
        
        # OPTIMISATION : Clé stable basée sur le hash du chemin
        # Comme ça OnlyOffice reconnaît le même document et utilise son cache
        clean_path = re.sub(r'[^a-zA-Z0-9._-]', '_', file_path)
        
        # Hash MD5 court pour unicité
        file_hash = hashlib.md5(file_path.encode()).hexdigest()[:8]
        
        # Clé stable (pas de timestamp!)
        document_key = f"{clean_path}_{file_hash}"
        
        # Version basée sur la dernière modification (à implémenter si nécessaire)
        version = 1
        
        return document_key, version
    
    @staticmethod
    def check_availability() -> dict:
        """
        Vérifie si OnlyOffice est disponible
        
        Returns:
            Dict avec les infos de disponibilité
        """
        try:
            healthcheck_url = f"{settings.ONLYOFFICE_SERVER_URL}/healthcheck"
            response = requests.get(healthcheck_url, timeout=5)
            
            is_available = response.status_code == 200 and response.text.strip().lower() == 'true'
            
            return {
                'available': is_available,
                'server_url': settings.ONLYOFFICE_SERVER_URL,
                'jwt_enabled': settings.ONLYOFFICE_JWT_ENABLED
            }
        except requests.RequestException as e:
            return {
                'available': False,
                'error': 'OnlyOffice server is unreachable',
                'server_url': settings.ONLYOFFICE_SERVER_URL
            }
    
    @staticmethod
    def create_config(file_path: str, file_name: str, file_url: str, 
                     callback_url: str, user_id: str, user_name: str, 
                     mode: str = 'edit') -> dict:
        """
        Crée la configuration OnlyOffice
        
        Args:
            file_path: Chemin du fichier dans S3
            file_name: Nom du fichier
            file_url: URL du fichier S3
            callback_url: URL de callback
            user_id: ID utilisateur
            user_name: Nom utilisateur
            mode: Mode d'édition ('edit' ou 'view')
            
        Returns:
            Dict avec config et token
        """
        # Générer une clé STABLE (même clé à chaque ouverture du même fichier)
        document_key, version = OnlyOfficeManager.generate_clean_key(file_path)
        
        # Stocker la correspondance key -> file_path original dans le cache (7 jours)
        cache.set(f"onlyoffice_key_{document_key}", file_path, timeout=604800)
        
        # Configuration OnlyOffice
        config = {
            "document": {
                "fileType": file_name.split('.')[-1].lower(),
                "key": document_key,
                "title": file_name,
                "url": file_url,
                "permissions": {
                    "comment": mode == 'edit',
                    "copy": True,
                    "download": True,
                    "edit": mode == 'edit',
                    "fillForms": mode == 'edit',
                    "modifyContentControl": mode == 'edit',
                    "modifyFilter": mode == 'edit',
                    "print": True,
                    "review": mode == 'edit',
                }
            },
            "documentType": OnlyOfficeManager.get_document_type(file_name),
            "editorConfig": {
                "user": {
                    "id": user_id,
                    "name": user_name,
                },
                "customization": {
                    "autosave": True,
                    "comments": False,  # OPTIMISATION : Désactiver commentaires
                    "compactToolbar": True,  # OPTIMISATION : Toolbar compact
                    "forcesave": True,
                    "help": False,  # OPTIMISATION : Désactiver aide
                    "hideRightMenu": True,  # OPTIMISATION : Cacher menu droit
                    "logo": {
                        "image": "",
                        "url": ""
                    },
                    "zoom": 100,
                    "chat": False,  # OPTIMISATION : Désactiver chat
                    "plugins": False,  # OPTIMISATION : Désactiver plugins
                },
                "callbackUrl": callback_url.replace('127.0.0.1', 'host.docker.internal').replace('localhost', 'host.docker.internal'),
                "lang": "fr",
                "mode": mode,
            },
            "height": "100%",
            "width": "100%",
            "type": "desktop"
        }
        
        # Signer avec JWT si activé
        token = None
        if settings.ONLYOFFICE_JWT_ENABLED:
            token = jwt.encode(
                config,
                settings.ONLYOFFICE_JWT_SECRET,
                algorithm='HS256'
            )
        
        return {
            "config": config,
            "token": token,
            "server_url": settings.ONLYOFFICE_SERVER_URL,
            "file_path": file_path
        }
    
    @staticmethod
    def handle_callback(request_data: dict, request_headers: dict, storage_manager) -> tuple:
        """
        Traite le callback OnlyOffice
        
        Args:
            request_data: Données du callback
            request_headers: Headers de la requête
            storage_manager: Instance du StorageManager
            
        Returns:
            Tuple (success: bool, response_data: dict, status_code: int)
        """
        try:
            # Vérifier JWT si activé
            if settings.ONLYOFFICE_JWT_ENABLED:
                # OnlyOffice envoie le JWT dans le body sous la clé 'token'
                token = request_data.get('token', '')
                
                # Fallback: vérifier aussi dans les headers
                if not token:
                    auth_header = request_headers.get(settings.ONLYOFFICE_JWT_HEADER, '')
                    if auth_header.startswith('Bearer '):
                        token = auth_header.replace('Bearer ', '')
                
                # Vérifier le token
                if token:
                    try:
                        jwt.decode(token, settings.ONLYOFFICE_JWT_SECRET, algorithms=['HS256'])
                    except jwt.InvalidTokenError as e:
                        return (False, {'error': 1}, status.HTTP_403_FORBIDDEN)
                else:
                    return (False, {'error': 1}, status.HTTP_403_FORBIDDEN)
            
            status_code = request_data.get('status', 0)
            
            # Status 2 ou 6 : Document prêt pour la sauvegarde
            if status_code in [2, 6]:
                download_url = request_data.get('url')
                document_key = request_data.get('key', '')
                
                if not download_url:
                    return (False, {'error': 1}, status.HTTP_400_BAD_REQUEST)
                
                # Récupérer le file_path original depuis le cache
                file_path = cache.get(f"onlyoffice_key_{document_key}")
                
                if not file_path:
                    # Fallback : essayer d'extraire depuis la key
                    file_path = '_'.join(document_key.split('_')[:-1]) if '_' in document_key else document_key
                
                try:
                    # Télécharger le fichier modifié depuis OnlyOffice
                    response = requests.get(download_url, timeout=30)
                    response.raise_for_status()
                    
                    # Upload le fichier modifié sur S3
                    file_content = response.content
                    success = storage_manager.upload_file_content(
                        key=file_path,
                        content=file_content
                    )
                    
                    if success:
                        return (True, {'error': 0}, status.HTTP_200_OK)
                    else:
                        return (False, {'error': 1}, status.HTTP_500_INTERNAL_SERVER_ERROR)
                    
                except requests.RequestException as e:
                    return (False, {'error': 1}, status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Pour tous les autres status, on retourne success
            return (True, {'error': 0}, status.HTTP_200_OK)
            
        except Exception as e:
            return (False, {'error': 1}, status.HTTP_500_INTERNAL_SERVER_ERROR)
