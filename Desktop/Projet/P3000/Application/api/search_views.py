"""
Vues pour la recherche dans le Drive
"""

from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
import json
import boto3
from botocore.exceptions import ClientError
from .utils import get_s3_client, get_s3_bucket_name, is_agent_photo_s3_path, is_drive_hidden_folder


@api_view(['GET'])
@permission_classes([AllowAny])
def search_in_drive(request):
    """
    Recherche des fichiers et dossiers dans le Drive S3
    """
    try:
        query = request.GET.get('query', '').strip()
        folder_path = request.GET.get('folder_path', '').strip()
        
        if not query:
            return JsonResponse({
                'success': False,
                'error': 'Le terme de recherche est requis'
            })
        
        print(f"🔍 Recherche de '{query}' dans '{folder_path}'")
        
        # Initialiser le client S3
        s3_client = get_s3_client()
        bucket_name = get_s3_bucket_name()
        
        # Construire le préfixe de recherche
        search_prefix = folder_path if folder_path else ""
        
        # Rechercher dans S3
        results = {
            'folders': [],
            'files': []
        }
        
        try:
            # Lister tous les objets avec le préfixe
            paginator = s3_client.get_paginator('list_objects_v2')
            page_iterator = paginator.paginate(
                Bucket=bucket_name,
                Prefix=search_prefix,
                Delimiter='/'
            )
            
            # Traiter les dossiers (CommonPrefixes)
            for page in page_iterator:
                if 'CommonPrefixes' in page:
                    for prefix_info in page['CommonPrefixes']:
                        prefix = prefix_info['Prefix']
                        folder_name = prefix.rstrip('/').split('/')[-1]
                        
                        parent_parts = prefix.rstrip('/').split('/')[:-1]
                        parent_path = '/'.join(parent_parts)
                        if is_drive_hidden_folder(parent_path, folder_name):
                            continue

                        # Vérifier si le nom du dossier correspond à la recherche
                        if query.lower() in folder_name.lower():
                            results['folders'].append({
                                'name': folder_name,
                                'path': prefix,
                                'type': 'folder'
                            })
                
                # Traiter les fichiers
                if 'Contents' in page:
                    for obj in page['Contents']:
                        key = obj['Key']

                        if is_agent_photo_s3_path(key):
                            continue
                        
                        # Ignorer les objets qui se terminent par / (dossiers)
                        if key.endswith('/'):
                            continue
                        
                        # Extraire le nom du fichier
                        file_name = key.split('/')[-1]
                        
                        # Vérifier si le nom du fichier correspond à la recherche
                        if query.lower() in file_name.lower():
                            # Déterminer le type de fichier
                            file_type = 'file'
                            if '.' in file_name:
                                file_type = file_name.split('.')[-1].lower()
                            
                            results['files'].append({
                                'name': file_name,
                                'path': key,
                                'type': file_type,
                                'size': obj.get('Size', 0),
                                'last_modified': obj.get('LastModified', '').isoformat() if obj.get('LastModified') else ''
                            })
            
            print(f"✅ Recherche terminée: {len(results['folders'])} dossiers, {len(results['files'])} fichiers trouvés")
            
            return JsonResponse({
                'success': True,
                'folders': results['folders'],
                'files': results['files'],
                'query': query,
                'folder_path': folder_path
            })
            
        except ClientError as e:
            print(f"❌ Erreur S3: {str(e)}")
            return JsonResponse({
                'success': False,
                'error': f'Erreur lors de la recherche S3: {str(e)}'
            })
            
    except Exception as e:
        print(f"❌ Erreur générale: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': f'Erreur lors de la recherche: {str(e)}'
        })
