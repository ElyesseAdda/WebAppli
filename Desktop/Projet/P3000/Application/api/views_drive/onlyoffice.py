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
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse


class OnlyOfficeManager:
    """
    Gestionnaire OnlyOffice pour l'édition de documents
    """
    
    @staticmethod
    def normalize_file_url(url: str) -> str:
        """
        Normalise l'URL du fichier pour qu'elle soit accessible depuis OnlyOffice (Docker).
        
        IMPORTANT : OnlyOffice (dans Docker) doit accéder au proxy Django via Internet (domaine public).
        En production, on utilise toujours le domaine public HTTPS (myp3000app.com) pour que
        OnlyOffice puisse télécharger les fichiers via le reverse proxy Nginx.
        
        En développement local : utilise host.docker.internal pour Docker Desktop
        
        Args:
            url: URL du fichier (proxy Django) originale
            
        Returns:
            URL normalisée pour OnlyOffice (toujours domaine public HTTPS en production)
        """
        import logging
        logger = logging.getLogger(__name__)
        
        parsed = urlparse(url)
        is_production = not settings.DEBUG
        
        if is_production:
            # En production : utiliser TOUJOURS le domaine public HTTPS
            # OnlyOffice (Docker) accède via Internet, donc il doit utiliser le domaine public
            if parsed.hostname in ('127.0.0.1', 'localhost'):
                query_string = f"?{parsed.query}" if parsed.query else ""
                return f"https://myp3000app.com{parsed.path}{query_string}"
            
            # Si l'URL utilise déjà le domaine public, s'assurer qu'elle est en HTTPS
            if parsed.hostname in ('myp3000app.com', 'www.myp3000app.com', '72.60.90.127'):
                if parsed.scheme != 'https':
                    query_string = f"?{parsed.query}" if parsed.query else ""
                    return f"https://{parsed.hostname}{parsed.path}{query_string}"
                return url
        else:
            # En développement : utiliser host.docker.internal pour Docker Desktop
            # Cela permet à OnlyOffice (dans Docker) d'accéder à Django sur la machine hôte
            if parsed.hostname in ('127.0.0.1', 'localhost'):
                query_string = f"?{parsed.query}" if parsed.query else ""
                return f"http://host.docker.internal:8000{parsed.path}{query_string}"
        
        return url
    
    @staticmethod
    def normalize_callback_url(url: str) -> str:
        """
        Normalise l'URL de callback pour qu'elle soit accessible depuis le conteneur Docker.
        
        IMPORTANT : En production, OnlyOffice (Docker) doit accéder au callback Django via localhost
        car ils sont sur le même serveur. Le callback est interne au serveur.
        
        En développement local (Docker Desktop Windows/Mac) : utilise host.docker.internal
        
        Args:
            url: URL de callback originale
            
        Returns:
            URL normalisée pour Docker
        """
        import logging
        logger = logging.getLogger(__name__)
        
        parsed = urlparse(url)
        is_production = not settings.DEBUG
        original_url = url
        
        # Si l'URL contient 127.0.0.1 ou localhost
        if parsed.hostname in ('127.0.0.1', 'localhost'):
            if is_production:
                # En production : utiliser le domaine public HTTPS
                # Docker (réseau bridge) ne peut pas accéder à localhost de l'hôte
                # On passe par Nginx/Internet pour atteindre Django
                query_string = f"?{parsed.query}" if parsed.query else ""
                normalized = f"https://myp3000app.com{parsed.path}{query_string}"
                logger.info(f"[OnlyOffice] Normalisation callback (PROD): {original_url[:100]}... -> {normalized[:100]}...")
                return normalized
            else:
                # En développement : utiliser host.docker.internal (Docker Desktop)
                query_string = f"?{parsed.query}" if parsed.query else ""
                normalized = f"http://host.docker.internal:8000{parsed.path}{query_string}"
                logger.info(f"[OnlyOffice] Normalisation callback (DEV): {original_url[:100]}... -> {normalized[:100]}...")
                return normalized
        
        # Si l'URL utilise un domaine/IP externe en production
        # OnlyOffice et Django sont sur le même serveur, donc utiliser localhost
        if is_production and parsed.hostname:
            onlyoffice_url = settings.ONLYOFFICE_SERVER_URL
            onlyoffice_parsed = urlparse(onlyoffice_url)
            
            # Liste des hostnames qui indiquent qu'on est sur le même serveur
            same_server_hostnames = [
                onlyoffice_parsed.hostname,
                'myp3000app.com',
                'www.myp3000app.com',
                '72.60.90.127',
                '127.0.0.1',
                'localhost'
            ]
            
            if (parsed.hostname in same_server_hostnames or 
                parsed.hostname in (settings.ALLOWED_HOSTS if hasattr(settings, 'ALLOWED_HOSTS') else [])):
                # Utiliser le domaine public HTTPS car Docker ne peut pas accéder à localhost
                query_string = f"?{parsed.query}" if parsed.query else ""
                normalized = f"https://myp3000app.com{parsed.path}{query_string}"
                logger.info(f"[OnlyOffice] Normalisation callback (PROD same server): {original_url[:100]}... -> {normalized[:100]}...")
                return normalized
        
        # Si l'URL utilise déjà un domaine/IP externe différent, la retourner telle quelle
        logger.info(f"[OnlyOffice] Callback URL non modifiée: {url[:100]}...")
        return url
    
    @staticmethod
    def get_document_type(file_name: str) -> str:
        """
        Détermine le type de document pour OnlyOffice
        
        Args:
            file_name: Nom du fichier
            
        Returns:
            Type de document (word, cell, slide, pdf)
        """
        extension = file_name.split('.')[-1].lower()
        
        word_extensions = ['doc', 'docx', 'docm', 'dot', 'dotx', 'dotm', 'odt', 'fodt', 'ott', 'rtf', 'txt']
        cell_extensions = ['xls', 'xlsx', 'xlsm', 'xlt', 'xltx', 'xltm', 'ods', 'fods', 'ots', 'csv']
        slide_extensions = ['ppt', 'pptx', 'pptm', 'pot', 'potx', 'potm', 'odp', 'fodp', 'otp']
        pdf_extensions = ['pdf']
        
        if extension in pdf_extensions:
            return 'pdf'
        elif extension in word_extensions:
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
            'odt', 'ods', 'odp', 'rtf', 'txt', 'csv',
            'pdf'  # Support PDF depuis OnlyOffice 8.1+
        ]
        return extension in editable_extensions
    
    @staticmethod
    def generate_clean_key(file_path: str, last_modified: str = None) -> tuple:
        """
        Génère une clé pour OnlyOffice basée sur le chemin et la date de modification
        
        Args:
            file_path: Chemin du fichier
            last_modified: Date de dernière modification du fichier (ISO format)
            
        Returns:
            Tuple (document_key, version)
        """
        import hashlib
        
        # Nettoyer le chemin
        clean_path = re.sub(r'[^a-zA-Z0-9._-]', '_', file_path)
        
        # Inclure la date de modification dans le hash pour détecter les changements
        if last_modified:
            # Utiliser la date de modification pour créer une clé unique
            # Si le fichier est remplacé, la date change et OnlyOffice créera un nouveau document
            key_string = f"{file_path}_{last_modified}"
        else:
            # Fallback : utiliser uniquement le chemin (comportement précédent)
            key_string = file_path
        
        # Hash MD5 pour unicité
        file_hash = hashlib.md5(key_string.encode()).hexdigest()[:12]
        
        # Clé incluant le hash basé sur le chemin et la date de modification
        document_key = f"{clean_path}_{file_hash}"
        
        # Version basée sur la dernière modification
        version = 1
        if last_modified:
            # Utiliser un hash de la date pour la version
            version_hash = hashlib.md5(last_modified.encode()).hexdigest()[:4]
            try:
                version = int(version_hash, 16) % 10000  # Convertir en nombre entre 0 et 9999
            except:
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
        # Désactiver la vérification SSL pour les certificats auto-signés
            verify_ssl = not settings.ONLYOFFICE_SERVER_URL.startswith('https://127.0.0.1') and not settings.ONLYOFFICE_SERVER_URL.startswith('https://72.60.90.127')
            response = requests.get(healthcheck_url, timeout=5, verify=verify_ssl)
            
            is_available = response.status_code == 200 and response.text.strip().lower() == 'true'
            
            return {
                'available': is_available,
                'server_url': settings.ONLYOFFICE_SERVER_URL,
                'jwt_enabled': settings.ONLYOFFICE_JWT_ENABLED
            }
        except requests.RequestException as e:
            # Si erreur SSL avec certificat auto-signé, réessayer sans vérification
            if 'SSL' in str(e) or 'certificate' in str(e).lower():
                try:
                    healthcheck_url = f"{settings.ONLYOFFICE_SERVER_URL}/healthcheck"
                    response = requests.get(healthcheck_url, timeout=5, verify=False)
                    is_available = response.status_code == 200 and response.text.strip().lower() == 'true'
                    return {
                        'available': is_available,
                        'server_url': settings.ONLYOFFICE_SERVER_URL,
                        'jwt_enabled': settings.ONLYOFFICE_JWT_ENABLED
                    }
                except:
                    pass
            
            return {
                'available': False,
                'error': f'OnlyOffice server is unreachable: {str(e)}',
                'server_url': settings.ONLYOFFICE_SERVER_URL,
                'jwt_enabled': settings.ONLYOFFICE_JWT_ENABLED
            }
    
    @staticmethod
    def create_config(file_path: str, file_name: str, file_url: str, 
                     callback_url: str, user_id: str, user_name: str, 
                     mode: str = 'edit', storage_manager=None) -> dict:
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
            storage_manager: Instance du StorageManager pour récupérer la date de modification
            
        Returns:
            Dict avec config et token
        """
        # Récupérer la date de dernière modification du fichier
        last_modified = None
        if storage_manager:
            try:
                metadata = storage_manager.get_object_metadata(file_path)
                if metadata and metadata.get('last_modified'):
                    last_modified = metadata['last_modified']
            except:
                # Si on ne peut pas récupérer la date, continuer sans
                pass
        
        # Générer une clé basée sur le chemin ET la date de modification
        # Si le fichier est remplacé, la date change et OnlyOffice créera un nouveau document
        document_key, version = OnlyOfficeManager.generate_clean_key(file_path, last_modified)
        
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
                    "chat": False,  # Désactiver chat (déplacé depuis customization)
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
                    "compactToolbar": False,  # Laisser la barre d'outils complète et ouverte
                    "forcesave": True,
                    "help": False,  # OPTIMISATION : Désactiver aide
                    "hideRightMenu": True,  # OPTIMISATION : Cacher menu droit
                    "logo": {
                        "image": "",
                        "url": ""
                    },
                    "zoom": 100,
                    "plugins": False,  # OPTIMISATION : Désactiver plugins
                },
                "callbackUrl": OnlyOfficeManager.normalize_callback_url(callback_url),
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
            try:
                token = jwt.encode(
                    config,
                    settings.ONLYOFFICE_JWT_SECRET,
                    algorithm='HS256'
                )
            except Exception as jwt_error:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Erreur lors de la génération du token JWT OnlyOffice: {str(jwt_error)}")
                # Ne pas lever l'erreur, continuer sans token (OnlyOffice peut fonctionner sans JWT)
                token = None
        
        return {
            "config": config,
            "token": token,
            "server_url": settings.ONLYOFFICE_SERVER_URL,
            "file_path": file_path,
            "jwt_enabled": settings.ONLYOFFICE_JWT_ENABLED  # Ajouter cette info pour le debug
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
                    # Préparer les headers pour la requête
                    headers = {}
                    final_url = download_url
                    
                    # Si JWT est activé, OnlyOffice nécessite le token dans l'URL
                    # OnlyOffice signe automatiquement les URLs qu'il génère, mais
                    # on doit vérifier si l'URL est déjà signée
                    if settings.ONLYOFFICE_JWT_ENABLED:
                        # Vérifier si l'URL contient déjà un token
                        parsed = urlparse(download_url)
                        query_params = parse_qs(parsed.query)
                        
                        # Si pas de token dans l'URL, l'ajouter
                        if 'token' not in query_params:
                            # Créer un token JWT pour l'accès au fichier
                            token_payload = {
                                'url': download_url,
                                'iat': int(time.time())
                            }
                            jwt_token = jwt.encode(
                                token_payload,
                                settings.ONLYOFFICE_JWT_SECRET,
                                algorithm='HS256'
                            )
                            
                            # Ajouter le token à l'URL
                            query_params['token'] = jwt_token
                            new_query = urlencode(query_params, doseq=True)
                            final_url = urlunparse((
                                parsed.scheme,
                                parsed.netloc,
                                parsed.path,
                                parsed.params,
                                new_query,
                                parsed.fragment
                            ))
                        else:
                            # L'URL contient déjà un token, l'utiliser telle quelle
                            final_url = download_url
                    
                    # Faire la requête avec l'URL signée
                    response = requests.get(final_url, headers=headers, timeout=30)
                    
                    # Si erreur 403, essayer sans token (au cas où OnlyOffice ne nécessite pas JWT pour cet endpoint)
                    if response.status_code == 403 and settings.ONLYOFFICE_JWT_ENABLED:
                        # Réessayer sans token JWT
                        response = requests.get(download_url, timeout=30)
                    
                    response.raise_for_status()
                    
                    # Upload le fichier modifié sur S3
                    file_content = response.content
                    success = storage_manager.upload_file_content(
                        key=file_path,
                        content=file_content
                    )
                    
                    if success:
                        try:
                            from django.contrib.auth.models import User as AuthUser
                            users = request_data.get('users', [])
                            user_label = 'OnlyOffice'
                            if users:
                                try:
                                    u = AuthUser.objects.get(pk=int(users[0]))
                                    first = (u.first_name or '').strip()
                                    last = (u.last_name or '').strip()
                                    if first and last:
                                        user_label = f"{first[0].upper()}.{last[0].upper()}"
                                    elif first:
                                        user_label = f"{first[0].upper()}"
                                    elif last:
                                        user_label = f"{last[0].upper()}"
                                    else:
                                        user_label = u.username
                                except (AuthUser.DoesNotExist, ValueError):
                                    user_label = str(users[0])
                            parts = file_path.rstrip('/').rsplit('/', 1)
                            folder = (parts[0] + '/') if len(parts) == 2 else ''
                            fname = parts[-1]
                            storage_manager.update_folder_metadata(folder, fname, user_label)
                        except Exception:
                            pass
                        return (True, {'error': 0}, status.HTTP_200_OK)
                    else:
                        return (False, {'error': 1}, status.HTTP_500_INTERNAL_SERVER_ERROR)
                    
                except requests.RequestException as e:
                    # Logger l'erreur pour diagnostic
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.error(f"Erreur lors du téléchargement depuis OnlyOffice: {e}, URL: {download_url}")
                    return (False, {'error': 1}, status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Pour tous les autres status, on retourne success
            return (True, {'error': 0}, status.HTTP_200_OK)
            
        except Exception as e:
            return (False, {'error': 1}, status.HTTP_500_INTERNAL_SERVER_ERROR)
