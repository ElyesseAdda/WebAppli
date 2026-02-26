"""
Drive V2 Views - API endpoints pour le Drive V2
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.clickjacking import xframe_options_exempt
from django.utils.decorators import method_decorator
from rest_framework.permissions import AllowAny
from django.http import StreamingHttpResponse, JsonResponse, HttpResponse
import requests
from .manager import DriveManager, normalize_filename
from .onlyoffice import OnlyOfficeManager
from ..utils import encode_filename_for_content_disposition
import io


class DriveV2ViewSet(viewsets.ViewSet):
    """
    ViewSet pour le Drive V2
    """
    permission_classes = [IsAuthenticated]
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.drive_manager = DriveManager()

    def _get_modified_by(self, request):
        """Retourne les initiales (Prénom Nom -> P.N.) de l'utilisateur."""
        user = request.user
        first = (user.first_name or '').strip()
        last = (user.last_name or '').strip()
        if first and last:
            return f"{first[0].upper()}.{last[0].upper()}"
        if first:
            return f"{first[0].upper()}"
        if last:
            return f"{last[0].upper()}"
        return user.username
    
    @action(detail=False, methods=['get'], url_path='list-content')
    def list_content(self, request):
        """
        Liste le contenu d'un dossier
        
        Query params:
            - folder_path: Chemin du dossier (optionnel)
        """
        try:
            folder_path = request.query_params.get('folder_path', '')
            content = self.drive_manager.get_folder_content(folder_path)
            
            return Response(content, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'], url_path='create-folder')
    def create_folder(self, request):
        """
        Crée un nouveau dossier
        
        Body:
            - parent_path: Chemin du dossier parent
            - folder_name: Nom du nouveau dossier
        """
        try:
            parent_path = request.data.get('parent_path', '')
            folder_name = request.data.get('folder_name')
            
            if not folder_name:
                return Response(
                    {'error': 'folder_name est requis'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            modified_by = self._get_modified_by(request)
            result = self.drive_manager.create_folder(parent_path, folder_name, modified_by=modified_by)
            return Response(result, status=status.HTTP_201_CREATED)
            
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['delete'], url_path='delete-item')
    def delete_item(self, request):
        """
        Supprime un fichier ou un dossier
        
        Body:
            - item_path: Chemin de l'élément
            - is_folder: True si c'est un dossier (optionnel)
        """
        try:
            # Accepter les paramètres dans le body (JSON) ET en query params
            # pour supporter les appels axios.delete(..., { params: ... }).
            item_path = request.data.get('item_path') or request.query_params.get('item_path')

            raw_is_folder = request.data.get('is_folder', None)
            if raw_is_folder is None:
                raw_is_folder = request.query_params.get('is_folder', None)

            if raw_is_folder is None:
                item_type = request.data.get('item_type') or request.query_params.get('item_type')
                is_folder = str(item_type).lower() == 'folder'
            else:
                is_folder = str(raw_is_folder).lower() in ('true', '1', 'yes', 'on')
            
            if not item_path:
                return Response(
                    {'error': 'item_path est requis'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            modified_by = self._get_modified_by(request)
            result = self.drive_manager.delete_item(item_path, is_folder, modified_by=modified_by)
            return Response(result, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], url_path='download-url')
    def get_download_url(self, request):
        """
        Génère une URL de téléchargement pour un fichier
        
        Query params:
            - file_path: Chemin du fichier
            - expires_in: Durée de validité en secondes (optionnel, défaut: 3600)
        """
        try:
            file_path = request.query_params.get('file_path')
            expires_in = int(request.query_params.get('expires_in', 3600))
            
            if not file_path:
                return Response(
                    {'error': 'file_path est requis'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            url = self.drive_manager.get_download_url(file_path, expires_in)
            
            return Response({
                'download_url': url,
                'file_path': file_path
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], url_path='download-folder')
    def download_folder(self, request):
        """
        Télécharge un dossier et tous ses fichiers dans un ZIP
        
        Query params:
            - folder_path: Chemin du dossier à télécharger
        """
        try:
            folder_path = request.query_params.get('folder_path')
            
            if not folder_path:
                return Response(
                    {'error': 'folder_path est requis'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Créer le ZIP avec tous les fichiers du dossier
            zip_content, zip_filename = self.drive_manager.download_folder_as_zip(folder_path)
            
            # Créer la réponse HTTP avec le ZIP
            response = HttpResponse(zip_content, content_type='application/zip')
            response['Content-Disposition'] = encode_filename_for_content_disposition(zip_filename, 'attachment')
            response['Content-Length'] = len(zip_content)
            
            return response
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], url_path='display-url')
    def get_display_url(self, request):
        """
        Génère une URL d'affichage pour un fichier
        
        Query params:
            - file_path: Chemin du fichier
            - expires_in: Durée de validité en secondes (optionnel, défaut: 3600)
        """
        try:
            file_path = request.query_params.get('file_path')
            expires_in = int(request.query_params.get('expires_in', 3600))
            
            if not file_path:
                return Response(
                    {'error': 'file_path est requis'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            url = self.drive_manager.get_display_url(file_path, expires_in)
            
            return Response({
                'display_url': url,
                'file_path': file_path
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'], url_path='upload-url')
    def get_upload_url(self, request):
        """
        Génère une URL d'upload pour un fichier
        
        Body:
            - file_path: Chemin du dossier de destination
            - file_name: Nom du fichier
            - content_type: Type MIME du fichier (optionnel)
        """
        try:
            file_path = request.data.get('file_path', '')
            file_name = request.data.get('file_name')
            content_type = request.data.get('content_type', 'application/octet-stream')
            
            if not file_name:
                return Response(
                    {'error': 'file_name est requis'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            modified_by = self._get_modified_by(request)
            result = self.drive_manager.get_upload_url(
                file_path,
                file_name,
                content_type,
                modified_by=modified_by
            )
            
            return Response(result, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], url_path='search')
    def search_files(self, request):
        """
        Recherche des fichiers et dossiers
        
        Query params:
            - search_term: Terme de recherche
            - folder_path: Dossier de base pour la recherche (optionnel)
            - max_results: Nombre maximum de résultats (optionnel, défaut: 100)
        """
        try:
            search_term = request.query_params.get('search_term', '')
            folder_path = request.query_params.get('folder_path', '')
            max_results = int(request.query_params.get('max_results', 100))
            
            if not search_term:
                return Response(
                    {'error': 'search_term est requis'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            results = self.drive_manager.search_files(
                search_term,
                folder_path,
                max_results
            )
            
            return Response(results, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'], url_path='move-item')
    def move_item(self, request):
        """
        Déplace un fichier ou dossier
        
        Body:
            - source_path: Chemin source
            - dest_path: Chemin destination
        """
        try:
            source_path = request.data.get('source_path')
            dest_path = request.data.get('dest_path')
            
            if not source_path or not dest_path:
                return Response(
                    {'error': 'source_path et dest_path sont requis'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            modified_by = self._get_modified_by(request)
            result = self.drive_manager.move_item(source_path, dest_path, modified_by=modified_by)
            return Response(result, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'], url_path='rename-item')
    def rename_item(self, request):
        """
        Renomme un fichier ou dossier
        
        Body:
            - old_path: Ancien chemin
            - new_name: Nouveau nom
        """
        try:
            old_path = request.data.get('old_path')
            new_name = request.data.get('new_name')
            
            if not old_path or not new_name:
                return Response(
                    {'error': 'old_path et new_name sont requis'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            modified_by = self._get_modified_by(request)
            result = self.drive_manager.rename_item(old_path, new_name, modified_by=modified_by)
            return Response(result, status=status.HTTP_200_OK)
            
        except ValueError as e:
            # Erreur de conflit de nom (message clair pour l'utilisateur)
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], url_path='breadcrumb')
    def get_breadcrumb(self, request):
        """
        Génère le fil d'Ariane pour un chemin
        
        Query params:
            - path: Chemin actuel
        """
        try:
            path = request.query_params.get('path', '')
            breadcrumb = self.drive_manager.get_breadcrumb(path)
            
            return Response({
                'breadcrumb': breadcrumb
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    
    @action(detail=False, methods=['get', 'options'], url_path='proxy-file', permission_classes=[AllowAny])
    @method_decorator(xframe_options_exempt)  # Désactive X-Frame-Options pour OnlyOffice
    @method_decorator(csrf_exempt)
    def proxy_file(self, request):
        """
        Proxy intelligent pour servir les fichiers S3 via le backend
        (Utilisé par OnlyOffice qui ne peut pas accéder directement à S3 depuis Docker)
        
        Solution robuste : Normalisation Unicode intelligente (NFC/NFD) + Authentification par token
        
        Query params:
            - file_path: Chemin du fichier dans S3 (peut être URL-encodé avec accents)
            - token: Token JWT temporaire pour OnlyOffice (optionnel si authentification Django disponible)
        """
        # Gérer les requêtes OPTIONS (preflight CORS)
        if request.method == 'OPTIONS':
            response = Response(status=status.HTTP_200_OK)
            response['Access-Control-Allow-Origin'] = '*'
            response['Access-Control-Allow-Methods'] = 'GET, HEAD, OPTIONS'
            response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
            response['Access-Control-Max-Age'] = '3600'
            return response
        
        try:
            # 1. Récupérer le chemin brut envoyé par OnlyOffice/React (peut être URL-encodé)
            raw_path = request.query_params.get('file_path')
            token = request.query_params.get('token')
            
            if not raw_path:
                return Response(
                    {'error': 'file_path est requis'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # 2. Décoder les caractères URL (ex: %20 -> espace, %C3%A9 -> é, %CC%82 -> accent circonflexe)
            from urllib.parse import unquote
            import logging
            logger = logging.getLogger(__name__)
            
            decoded_path = unquote(raw_path)
            
            # Solution 2 : Vérifier le token si fourni (pour OnlyOffice)
            # Sinon, vérifier l'authentification Django normale
            if token:
                try:
                    import jwt
                    import time
                    from django.conf import settings
                    token_secret = f"{settings.SECRET_KEY}_onlyoffice_file_token"
                    
                    # Décoder et vérifier le token
                    payload = jwt.decode(token, token_secret, algorithms=['HS256'])
                    
                    # Vérifier que le file_path correspond au token
                    # IMPORTANT : Le token contient maintenant le chemin ORIGINAL (non normalisé)
                    # On doit comparer de manière tolérante aux différences Unicode (NFC/NFD)
                    import unicodedata
                    token_file_path = payload.get('file_path', '')
                    
                    # Normaliser les deux en NFC pour comparer (tolérant aux différences NFD/NFC)
                    token_normalized = unicodedata.normalize('NFC', token_file_path)
                    decoded_normalized = unicodedata.normalize('NFC', decoded_path)
                    
                    # Comparer après normalisation (tolérant aux différences NFD/NFC)
                    # Aussi accepter si les chemins originaux correspondent exactement
                    if token_normalized != decoded_normalized and token_file_path != decoded_path:
                        return Response(
                            {'error': 'Token invalide pour ce fichier'},
                            status=status.HTTP_403_FORBIDDEN
                        )
                    
                    # Token valide, continuer
                except jwt.InvalidTokenError:
                    return Response(
                        {'error': 'Token invalide'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            else:
                # Pas de token : vérifier l'authentification Django normale
                if not request.user.is_authenticated:
                    return Response(
                        {'error': 'Authentification requise'},
                        status=status.HTTP_401_UNAUTHORIZED
                    )
            
            # 3. RECHERCHE MAGIQUE DANS S3 : Essayer plusieurs formats Unicode
            # AWS S3 est strict : le nom doit correspondre EXACTEMENT au nom stocké
            # Les fichiers peuvent être stockés en NFC, NFD, ou format original
            import unicodedata
            from botocore.exceptions import ClientError
            
            s3_client = self.drive_manager.storage.s3_client
            bucket_name = self.drive_manager.storage.bucket_name
            
            # STRATÉGIE : Essayer dans l'ordre : original -> NFC -> NFD
            # Car le fichier est stocké avec le nom original (peut être NFD ou NFC)
            final_key = None
            s3_meta = None
            
            # Tentative 1 : Chemin original (celui qui vient de l'URL/token)
            try:
                final_key = decoded_path
                s3_meta = s3_client.head_object(Bucket=bucket_name, Key=final_key)
            except ClientError as e:
                error_code = e.response.get('Error', {}).get('Code', '')
                if error_code == 'NoSuchKey':
                    # Tentative 2 : Format NFC
                    try:
                        final_key = unicodedata.normalize('NFC', decoded_path)
                        s3_meta = s3_client.head_object(Bucket=bucket_name, Key=final_key)
                    except ClientError as nfc_error:
                        nfc_error_code = nfc_error.response.get('Error', {}).get('Code', '')
                        if nfc_error_code == 'NoSuchKey':
                            # Tentative 3 : Format NFD
                            try:
                                final_key = unicodedata.normalize('NFD', decoded_path)
                                s3_meta = s3_client.head_object(Bucket=bucket_name, Key=final_key)
                            except ClientError as nfd_error:
                                # Toutes les tentatives ont échoué
                                logger.error(f"Fichier introuvable sur S3: {decoded_path}")
                                return Response(
                                    {'error': f"Fichier introuvable sur S3: {decoded_path}. Vérifiez que le nom du fichier correspond exactement."},
                                    status=status.HTTP_404_NOT_FOUND
                                )
                        else:
                            raise
                else:
                    raise
            
            # 4. Si on arrive ici, le fichier existe. On lance le téléchargement (Stream)
            s3_response = s3_client.get_object(Bucket=bucket_name, Key=final_key)
            
            # 5. Définition du type MIME correct selon l'extension
            content_type = 'application/octet-stream'
            ext = final_key.lower().split('.')[-1] if '.' in final_key else ''
            if ext == 'xlsx':
                content_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            elif ext == 'xls':
                content_type = 'application/vnd.ms-excel'
            elif ext == 'docx':
                content_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            elif ext == 'doc':
                content_type = 'application/msword'
            elif ext == 'pptx':
                content_type = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
            elif ext == 'ppt':
                content_type = 'application/vnd.ms-powerpoint'
            elif ext == 'pdf':
                content_type = 'application/pdf'
            
            # Utiliser le Content-Type de S3 s'il est valide
            if s3_response.get('ContentType') and s3_response['ContentType'] != 'application/octet-stream':
                content_type = s3_response['ContentType']
            
            # 6. Créer la réponse avec streaming pour les gros fichiers
            response = StreamingHttpResponse(
                s3_response['Body'].iter_chunks(),
                content_type=content_type
            )
            
            # 7. Gestion propre du nom de fichier pour le téléchargement (gère les accents)
            # IMPORTANT : Utiliser 'attachment' au lieu de 'inline' pour OnlyOffice
            # OnlyOffice a besoin de 'attachment' pour traiter le fichier comme un téléchargement physique
            filename = normalize_filename(final_key.split('/')[-1])
            response['Content-Disposition'] = encode_filename_for_content_disposition(filename, 'attachment')
            response['Content-Length'] = s3_meta['ContentLength']
            response['Accept-Ranges'] = 'bytes'
            
            # Headers pour OnlyOffice
            response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response['Pragma'] = 'no-cache'
            response['Expires'] = '0'
            
            # Headers CORS pour permettre à OnlyOffice (Docker) d'accéder au fichier
            # OnlyOffice fait des requêtes cross-origin depuis son conteneur Docker
            # IMPORTANT : Utiliser '*' pour Access-Control-Allow-Origin (OnlyOffice ne peut pas envoyer d'origin spécifique)
            # Si on utilise '*', on ne peut PAS utiliser Access-Control-Allow-Credentials: true
            response['Access-Control-Allow-Origin'] = '*'
            response['Access-Control-Allow-Methods'] = 'GET, HEAD, OPTIONS'
            response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With, Range'
            response['Access-Control-Expose-Headers'] = 'Content-Length, Content-Range, Content-Type, Accept-Ranges'
            
            return response
            
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Erreur dans proxy_file: {str(e)}", exc_info=True)
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'], url_path='onlyoffice-config')
    def get_onlyoffice_config(self, request):
        """
        Génère la configuration OnlyOffice pour éditer un fichier
        
        Body:
            - file_path: Chemin du fichier dans S3
            - file_name: Nom du fichier
            - mode: 'edit' ou 'view' (optionnel, défaut: 'edit')
            - use_proxy: true pour utiliser le proxy Django au lieu de l'URL S3 directe
        """
        # S'assurer que la réponse sera toujours en JSON
        # En cas d'erreur d'authentification, DRF peut renvoyer du HTML
        try:
            # Vérifier l'authentification manuellement pour avoir un meilleur contrôle
            if not request.user.is_authenticated:
                return Response(
                    {'error': 'Authentification requise', 'error_type': 'AuthenticationError'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
        except Exception as auth_error:
            return Response(
                {'error': f'Erreur d\'authentification: {str(auth_error)}', 'error_type': 'AuthenticationError'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        try:
            file_path = request.data.get('file_path')
            file_name = request.data.get('file_name')
            mode = request.data.get('mode', 'edit')
            use_proxy = request.data.get('use_proxy', False)
            
            if not file_path or not file_name:
                return Response(
                    {'error': 'file_path et file_name sont requis'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Vérifier que le fichier est éditable
            if not OnlyOfficeManager.is_office_file(file_name):
                return Response(
                    {'error': 'Ce type de fichier n\'est pas éditable avec OnlyOffice'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Solution 2 : Utiliser le proxy Django avec authentification par token
            # OnlyOffice ne peut pas télécharger directement depuis S3 (problème réseau Docker)
            # On utilise le proxy Django qui a accès à S3, avec un token temporaire au lieu de cookies
            import logging
            import jwt
            import time
            from urllib.parse import urlencode
            
            logger = logging.getLogger(__name__)
            
            # Normaliser le file_path ET file_name en Unicode NFC pour éviter les erreurs S3 avec les accents
            # Problème : macOS/Linux peut encoder les accents en NFD (U+004F + U+0302) au lieu de NFC (U+00D4)
            # AWS S3 est strict : le nom dans l'URL signée doit correspondre exactement au nom réel du fichier
            import unicodedata
            # IMPORTANT : Ne PAS normaliser ici, garder le chemin original
            # Le fichier dans S3 est stocké avec le nom original (peut être NFD ou NFC)
            # On normalisera seulement lors de la recherche dans S3 (dans proxy_file)
            file_path_for_token = file_path  # Garder le chemin original pour le token
            file_name_normalized = normalize_filename(unicodedata.normalize('NFC', file_name))
            
            # Générer un token temporaire pour OnlyOffice (valide 24h)
            # IMPORTANT : Utiliser le file_path ORIGINAL (non normalisé) dans le token
            # Car le fichier dans S3 est stocké avec le nom original
            token_payload = {
                'file_path': file_path_for_token,  # Utiliser le chemin ORIGINAL
                'user_id': str(request.user.id),
                'exp': int(time.time()) + 86400,  # Expiration dans 24h
                'iat': int(time.time())
            }
            
            # Créer un secret pour les tokens OnlyOffice (utiliser le secret Django + un suffixe)
            # NOTE: settings est déjà importé au début du fichier, pas besoin de le réimporter
            token_secret = f"{settings.SECRET_KEY}_onlyoffice_file_token"
            file_token = jwt.encode(token_payload, token_secret, algorithm='HS256')
            
            # Construire l'URL du proxy avec le token
            # IMPORTANT : Utiliser le file_path ORIGINAL dans l'URL
            params = urlencode({
                'file_path': file_path_for_token,  # Utiliser le chemin ORIGINAL
                'token': file_token
            })
            file_url = request.build_absolute_uri(f'/api/drive-v2/proxy-file/?{params}')
            
            # Normaliser l'URL pour qu'elle soit accessible depuis OnlyOffice (Docker)
            # IMPORTANT : En DEV, utilise host.docker.internal pour Docker Desktop
            # En PROD, utilise le domaine public HTTPS
            file_url = OnlyOfficeManager.normalize_file_url(file_url)
            
            # URL de callback pour sauvegarder les modifications
            callback_url = request.build_absolute_uri('/api/drive-v2/onlyoffice-callback/')
            # Normaliser l'URL pour qu'elle soit accessible depuis Docker
            callback_url = OnlyOfficeManager.normalize_callback_url(callback_url)
            
            # Vérifier que drive_manager et storage sont disponibles
            if not hasattr(self, 'drive_manager') or self.drive_manager is None:
                raise ValueError("DriveManager n'est pas initialisé")
            
            storage_manager = getattr(self.drive_manager, 'storage', None)
            
            try:
                # IMPORTANT : Utiliser le file_path original pour create_config
                # (la normalisation sera gérée dans proxy_file lors de la recherche S3)
                result = OnlyOfficeManager.create_config(
                    file_path=file_path_for_token,  # Utiliser le chemin ORIGINAL
                    file_name=file_name_normalized,   # Utiliser le nom normalisé pour l'affichage
                    file_url=file_url,
                    callback_url=callback_url,
                    user_id=str(request.user.id),
                    user_name=request.user.get_full_name() or request.user.username,
                    mode=mode,
                    storage_manager=storage_manager
                )
                return Response(result, status=status.HTTP_200_OK)
            except Exception as config_error:
                logger.error(f"Erreur lors de la création de la configuration OnlyOffice: {str(config_error)}", exc_info=True)
                raise  # Re-lancer pour être capturé par le except principal
            
        except Exception as e:
            import traceback
            import logging
            error_logger = logging.getLogger(__name__)
            error_traceback = traceback.format_exc()
            error_logger.error(f"Erreur 500 dans get_onlyoffice_config: {str(e)}")
            error_logger.error(f"Traceback complet:\n{error_traceback}")
            return Response(
                {
                    'error': str(e),
                    'error_type': type(e).__name__,
                    'traceback': error_traceback if settings.DEBUG else None
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'], url_path='onlyoffice-callback', 
            permission_classes=[AllowAny], authentication_classes=[])
    def onlyoffice_callback(self, request):
        """
        Callback OnlyOffice pour sauvegarder les modifications du document
        Note: Pas d'authentification Django car OnlyOffice utilise son propre JWT
        """
        try:
            success, response_data, status_code = OnlyOfficeManager.handle_callback(
                request_data=request.data,
                request_headers=request.headers,
                storage_manager=self.drive_manager.storage
            )
            
            return Response(response_data, status=status_code)
            
        except Exception as e:
            return Response({'error': 1}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'], url_path='check-onlyoffice', permission_classes=[AllowAny])
    def check_onlyoffice(self, request):
        """
        Vérifie si OnlyOffice est disponible et accessible
        """
        result = OnlyOfficeManager.check_availability()
        return Response(result, status=status.HTTP_200_OK)


# Vue fonction pour vérifier OnlyOffice (en dehors du ViewSet pour éviter les problèmes de permissions)
@csrf_exempt
def check_onlyoffice_view(request):
    """
    Vérifie si OnlyOffice est disponible et accessible
    Pas d'authentification requise pour permettre la vérification depuis le frontend
    """
    if request.method != 'GET':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    try:
        # Charger les variables depuis os.environ si elles ne sont pas dans settings
        # (pour gérer le cas où Gunicorn ne charge pas le .env correctement)
        import os
        from pathlib import Path
        
        # Essayer d'abord depuis settings
        onlyoffice_url = getattr(settings, 'ONLYOFFICE_SERVER_URL', None)
        jwt_enabled = getattr(settings, 'ONLYOFFICE_JWT_ENABLED', None)
        
        # Si pas trouvé dans settings, charger depuis os.environ
        if not onlyoffice_url:
            onlyoffice_url = os.getenv('ONLYOFFICE_SERVER_URL', None)
        
        if jwt_enabled is None:
            jwt_enabled_str = os.getenv('ONLYOFFICE_JWT_ENABLED', 'true')
            jwt_enabled = jwt_enabled_str.lower() == 'true' if jwt_enabled_str else True
        
        # Si toujours pas trouvé, essayer de charger directement depuis .env
        if not onlyoffice_url:
            try:
                env_file = Path(settings.BASE_DIR) / '.env'
                if env_file.exists():
                    with open(env_file, 'r', encoding='utf-8') as f:
                        for line in f:
                            line = line.strip()
                            if line and not line.startswith('#') and '=' in line:
                                key, value = line.split('=', 1)
                                key = key.strip()
                                value = value.strip().strip('"').strip("'")
                                if key == 'ONLYOFFICE_SERVER_URL' and not onlyoffice_url:
                                    onlyoffice_url = value
                                elif key == 'ONLYOFFICE_JWT_ENABLED' and jwt_enabled is None:
                                    jwt_enabled = value.lower() == 'true'
            except Exception:
                pass  # Ignorer les erreurs de lecture du .env
        
        # Si les variables ne sont toujours pas trouvées
        if not onlyoffice_url:
            return JsonResponse({
                'available': False,
                'error': 'OnlyOffice configuration not found',
                'server_url': 'Not configured',
                'jwt_enabled': False
            }, status=200)
        
        # Tester la connexion directement
        import requests
        import urllib3
        urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)  # Désactiver les warnings SSL
        
        healthcheck_url = f"{onlyoffice_url}/healthcheck"
        try:
            # Si l'URL est HTTPS avec une IP, désactiver la vérification SSL (certificat auto-signé)
            verify_ssl = not (onlyoffice_url.startswith('https://127.0.0.1') or onlyoffice_url.startswith('https://72.60.90.127'))
            response = requests.get(healthcheck_url, timeout=5, verify=verify_ssl)
            is_available = response.status_code == 200 and response.text.strip().lower() == 'true'
            
            return JsonResponse({
                'available': is_available,
                'server_url': onlyoffice_url,
                'jwt_enabled': jwt_enabled
            }, status=200)
        except requests.RequestException as e:
            # Si erreur SSL, réessayer sans vérification
            if 'SSL' in str(e) or 'certificate' in str(e).lower():
                try:
                    response = requests.get(healthcheck_url, timeout=5, verify=False)
                    is_available = response.status_code == 200 and response.text.strip().lower() == 'true'
                    return JsonResponse({
                        'available': is_available,
                        'server_url': onlyoffice_url,
                        'jwt_enabled': jwt_enabled
                    }, status=200)
                except:
                    pass
            
            return JsonResponse({
                'available': False,
                'error': f'OnlyOffice server is unreachable: {str(e)}',
                'server_url': onlyoffice_url,
                'jwt_enabled': jwt_enabled
            }, status=200)
        
    except Exception as e:
        return JsonResponse({
            'available': False,
            'error': str(e),
            'server_url': 'Not configured',
            'jwt_enabled': False
        }, status=200)  # Status 200 pour permettre au frontend de gérer l'erreur


# Vue fonction pour le proxy (en dehors du ViewSet pour éviter les problèmes de permissions)
# IMPORTANT : @xframe_options_exempt désactive X-Frame-Options pour cette vue
# OnlyOffice a besoin que cet en-tête soit absent pour télécharger les fichiers
@xframe_options_exempt
@csrf_exempt
def proxy_file_view(request):
    """
    Proxy pour servir les fichiers S3 via le backend
    (Utilisé par OnlyOffice si il ne peut pas accéder directement à S3)
    Pas d'authentification requise car OnlyOffice n'envoie pas de credentials Django
    """
    # Gérer les requêtes OPTIONS (preflight CORS)
    if request.method == 'OPTIONS':
        response = JsonResponse({}, status=200)
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'GET, HEAD, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With, Range'
        response['Access-Control-Max-Age'] = '3600'
        return response
    
    if request.method not in ['GET', 'HEAD']:
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    try:
        file_path = request.GET.get('file_path')
        
        if not file_path:
            return JsonResponse({'error': 'file_path est requis'}, status=400)
        
        # Initialiser le DriveManager pour accéder au storage
        drive_manager = DriveManager()
        
        # Télécharger le fichier depuis S3
        s3_client = drive_manager.storage.s3_client
        bucket_name = drive_manager.storage.bucket_name
        
        s3_response = s3_client.get_object(
            Bucket=bucket_name,
            Key=file_path
        )
        
        # Créer la réponse HTTP avec le contenu du fichier
        response = StreamingHttpResponse(
            s3_response['Body'].iter_chunks(),
            content_type=s3_response.get('ContentType', 'application/octet-stream')
        )
        
        # Ajouter les headers
        response['Content-Length'] = s3_response['ContentLength']
        filename = normalize_filename(file_path.split("/")[-1])
        # IMPORTANT : Utiliser 'attachment' au lieu de 'inline' pour OnlyOffice
        # OnlyOffice a besoin de 'attachment' pour traiter le fichier comme un téléchargement physique
        response['Content-Disposition'] = encode_filename_for_content_disposition(filename, 'attachment')
        response['Accept-Ranges'] = 'bytes'
        response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response['Pragma'] = 'no-cache'
        response['Expires'] = '0'
        
        # Headers CORS pour permettre à OnlyOffice (Docker) d'accéder au fichier
        # IMPORTANT : Utiliser '*' pour Access-Control-Allow-Origin (OnlyOffice ne peut pas envoyer d'origin spécifique)
        # Si on utilise '*', on ne peut PAS utiliser Access-Control-Allow-Credentials: true
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'GET, HEAD, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With, Range'
        response['Access-Control-Expose-Headers'] = 'Content-Length, Content-Range, Content-Type, Accept-Ranges'
        
        return response
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# Vue fonction pour le callback OnlyOffice (en dehors du ViewSet pour éviter les problèmes de permissions)
@csrf_exempt
def onlyoffice_callback_view(request):
    """
    Callback OnlyOffice pour sauvegarder les modifications du document
    Pas d'authentification Django car OnlyOffice utilise son propre JWT
    """
    if request.method not in ['POST', 'OPTIONS']:
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    # Répondre OK aux requêtes OPTIONS (CORS preflight)
    if request.method == 'OPTIONS':
        return JsonResponse({'error': 0}, status=200)
    
    try:
        import json
        
        # Parser le body JSON
        try:
            request_data = json.loads(request.body.decode('utf-8'))
        except:
            request_data = {}
        
        # Initialiser le DriveManager
        drive_manager = DriveManager()
        
        # Traiter le callback via OnlyOfficeManager
        success, response_data, status_code = OnlyOfficeManager.handle_callback(
            request_data=request_data,
            request_headers=dict(request.headers),
            storage_manager=drive_manager.storage
        )
        
        return JsonResponse(response_data, status=status_code)
        
    except Exception as e:
        return JsonResponse({'error': 1}, status=500)
