from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.utils.text import slugify
import os

from .models import Societe, Chantier
from .utils import custom_slugify


class DriveCompleteViewSet(viewsets.ViewSet):
    """
    ViewSet pour la gestion complète du drive AWS
    """
    permission_classes = [AllowAny]  # Temporaire pour le développement

    @action(detail=False, methods=['get'])
    def list_folder_content(self, request):
        """
        Liste le contenu d'un dossier spécifique (fichiers + sous-dossiers)
        """
        try:
            folder_path = request.query_params.get('folder_path', '')
            
            # Lister le contenu complet du dossier
            from .utils import list_s3_folder_content
            content = list_s3_folder_content(folder_path)
            
            return Response({
                'folders': content['folders'],
                'files': content['files'],
                'current_path': folder_path
            })

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def create_folder_anywhere(self, request):
        """
        Crée un dossier à n'importe quel endroit dans l'arborescence
        """
        try:
            parent_path = request.data.get('parent_path', '')
            folder_name = request.data.get('folder_name')
            
            if not folder_name:
                return Response({'error': 'Nom de dossier requis'}, status=status.HTTP_400_BAD_REQUEST)

            # Construire le chemin complet
            if parent_path:
                folder_path = f"{parent_path}/{custom_slugify(folder_name)}"
            else:
                folder_path = custom_slugify(folder_name)

            # Créer le dossier de manière récursive
            from .utils import create_s3_folder_recursive
            success = create_s3_folder_recursive(folder_path)

            if success:
                return Response({
                    'message': 'Dossier créé avec succès',
                    'folder_path': folder_path,
                    'folder_name': folder_name
                })
            else:
                return Response({'error': 'Erreur lors de la création du dossier'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['delete'])
    def delete_folder_anywhere(self, request):
        """
        Supprime un dossier et son contenu à n'importe quel endroit
        """
        try:
            folder_path = request.data.get('folder_path')
            
            if not folder_path:
                return Response({'error': 'Chemin du dossier requis'}, status=status.HTTP_400_BAD_REQUEST)

            # Supprimer le dossier dans S3
            from .utils import delete_s3_folder
            success = delete_s3_folder(folder_path)

            if success:
                return Response({'message': 'Dossier supprimé avec succès'})
            else:
                return Response({'error': 'Erreur lors de la suppression du dossier'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def get_file_download_url(self, request):
        """
        Génère une URL de téléchargement pour un fichier
        """
        try:
            file_path = request.query_params.get('file_path')
            
            if not file_path:
                return Response({'error': 'Chemin du fichier requis'}, status=status.HTTP_400_BAD_REQUEST)

            from .utils import generate_presigned_url
            download_url = generate_presigned_url('get_object', file_path, expires_in=3600)

            return Response({
                'download_url': download_url,
                'file_path': file_path
            })

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def get_file_display_url(self, request):
        """
        Génère une URL d'affichage pour un fichier (inline)
        """
        try:
            file_path = request.query_params.get('file_path')
            
            if not file_path:
                return Response({'error': 'Chemin du fichier requis'}, status=status.HTTP_400_BAD_REQUEST)

            from .utils import generate_presigned_url_for_display
            display_url = generate_presigned_url_for_display(file_path, expires_in=3600)

            return Response({
                'display_url': display_url,
                'file_path': file_path
            })

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def get_upload_url(self, request):
        """
        Génère une URL d'upload pour un fichier
        """
        try:
            file_path = request.data.get('file_path', '')
            file_name = request.data.get('file_name')
            
            if not file_name:
                return Response({'error': 'Nom du fichier requis'}, status=status.HTTP_400_BAD_REQUEST)

            # Construire le chemin complet
            if file_path:
                # Nettoyer le chemin pour éviter les doubles slashes
                clean_path = file_path.rstrip('/')
                full_path = f"{clean_path}/{custom_slugify(file_name)}"
            else:
                full_path = custom_slugify(file_name)

            from .utils import generate_presigned_post
            upload_data = generate_presigned_post(full_path)

            return Response({
                'upload_url': upload_data['url'],
                'fields': upload_data['fields'],
                'file_path': full_path
            })

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def search_files(self, request):
        """
        Recherche des fichiers dans le drive
        """
        try:
            search_term = request.query_params.get('search', '')
            folder_path = request.query_params.get('folder_path', '')
            
            if not search_term:
                return Response({'error': 'Terme de recherche requis'}, status=status.HTTP_400_BAD_REQUEST)

            from .utils import search_s3_files
            results = search_s3_files(search_term, folder_path)

            return Response({
                'files': results['files'],
                'folders': results['folders'],
                'search_term': search_term
            })

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def move_file(self, request):
        """
        Déplace un fichier d'un endroit à un autre
        """
        try:
            source_path = request.data.get('source_path')
            destination_path = request.data.get('destination_path')
            
            if not source_path or not destination_path:
                return Response({'error': 'Chemins source et destination requis'}, status=status.HTTP_400_BAD_REQUEST)

            from .utils import move_s3_file
            success = move_s3_file(source_path, destination_path)

            if success:
                return Response({'message': 'Fichier déplacé avec succès'})
            else:
                return Response({'error': 'Erreur lors du déplacement du fichier'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def rename_item(self, request):
        """
        Renomme un fichier ou un dossier
        """
        try:
            old_path = request.data.get('old_path')
            new_name = request.data.get('new_name')
            
            if not old_path or not new_name:
                return Response({'error': 'Ancien chemin et nouveau nom requis'}, status=status.HTTP_400_BAD_REQUEST)

            from .utils import rename_s3_item
            success, new_path = rename_s3_item(old_path, new_name)

            if success:
                return Response({
                    'message': 'Élément renommé avec succès',
                    'new_path': new_path
                })
            else:
                return Response({'error': 'Erreur lors du renommage'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['delete'])
    def delete_file(self, request):
        """
        Supprime un fichier
        """
        try:
            file_path = request.data.get('file_path')
            
            if not file_path:
                return Response({'error': 'Chemin du fichier requis'}, status=status.HTTP_400_BAD_REQUEST)

            from .utils import delete_s3_file
            success = delete_s3_file(file_path)

            if success:
                return Response({'message': 'Fichier supprimé avec succès'})
            else:
                return Response({'error': 'Erreur lors de la suppression du fichier'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['delete'])
    def delete_folder(self, request):
        """
        Supprime un dossier
        """
        try:
            folder_path = request.data.get('folder_path')
            
            if not folder_path:
                return Response({'error': 'Chemin du dossier requis'}, status=status.HTTP_400_BAD_REQUEST)

            from .utils import delete_s3_folder
            success = delete_s3_folder(folder_path)

            if success:
                return Response({'message': 'Dossier supprimé avec succès'})
            else:
                return Response({'error': 'Erreur lors de la suppression du dossier'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def preview_file(self, request):
        """
        Génère une prévisualisation PDF d'un fichier du drive
        """
        try:
            file_path = request.query_params.get('file_path')
            
            if not file_path:
                return Response({'error': 'Chemin du fichier requis'}, status=status.HTTP_400_BAD_REQUEST)

            # Vérifier que c'est un fichier PDF
            if not file_path.lower().endswith('.pdf'):
                return Response({'error': 'Seuls les fichiers PDF sont supportés'}, status=status.HTTP_400_BAD_REQUEST)

            from .utils import generate_presigned_url
            from django.http import HttpResponse
            import os
            import requests
            from io import BytesIO
            from PIL import Image
            import fitz  # PyMuPDF  

            # Obtenir l'URL du fichier
            file_url = generate_presigned_url('get_object', file_path, expires_in=3600)

            try:
                # Télécharger le PDF depuis S3
                response = requests.get(file_url, timeout=30)
                response.raise_for_status()
                
                # Ouvrir le PDF avec PyMuPDF
                pdf_document = fitz.open(stream=response.content, filetype="pdf")
                
                # Prendre la première page
                page = pdf_document[0]
                
                # Convertir en image avec une résolution élevée
                mat = fitz.Matrix(2.0, 2.0)  # Zoom 2x pour une meilleure qualité
                pix = page.get_pixmap(matrix=mat)
                
                # Convertir en PIL Image
                img_data = pix.tobytes("png")
                img = Image.open(BytesIO(img_data))
                
                # Convertir en bytes pour la réponse
                img_buffer = BytesIO()
                img.save(img_buffer, format='PNG', quality=95)
                img_buffer.seek(0)
                
                # Fermer le document
                pdf_document.close()
                
                # Retourner l'image
                response = HttpResponse(img_buffer.getvalue(), content_type='image/png')
                response['Content-Disposition'] = f'inline; filename="preview_{os.path.basename(file_path)}.png"'
                response['Cache-Control'] = 'public, max-age=3600'  # Cache pendant 1 heure
                return response

            except Exception as e:
                # En cas d'erreur, retourner l'URL directe du PDF
                return Response({
                    'error': f'Erreur lors de la génération de la prévisualisation: {str(e)}',
                    'fallback_url': file_url,
                    'message': 'Utilisez le lien de fallback pour voir le PDF directement'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except Exception as e:
            return Response({'error': f'Erreur lors de la prévisualisation: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
