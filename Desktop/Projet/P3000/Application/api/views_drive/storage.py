"""
Storage Manager - Abstraction pour S3 avec les mêmes credentials
"""

import os
import boto3
from typing import Optional, Dict, List, BinaryIO
from datetime import datetime, timedelta
import mimetypes

# Mapping personnalisé pour les types MIME non reconnus par mimetypes
CUSTOM_MIME_TYPES = {
    '.dwg': 'application/acad',
    '.dxf': 'application/dxf',
}

def get_content_type(filename: str) -> str:
    """
    Détermine le type MIME d'un fichier en utilisant mimetypes et un mapping personnalisé
    
    Args:
        filename: Nom du fichier avec extension
        
    Returns:
        Type MIME du fichier
    """
    # Vérifier d'abord le mapping personnalisé
    extension = os.path.splitext(filename)[1].lower()
    if extension in CUSTOM_MIME_TYPES:
        return CUSTOM_MIME_TYPES[extension]
    
    # Utiliser mimetypes standard
    content_type, _ = mimetypes.guess_type(filename)
    return content_type or 'application/octet-stream'


class StorageManager:
    """
    Gestionnaire de stockage S3 - Réutilise les credentials existants
    """
    
    def __init__(self):
        """Initialise le client S3 avec les credentials existants"""
        self.access_key = os.getenv('AWS_ACCESS_KEY_ID')
        self.secret_key = os.getenv('AWS_SECRET_ACCESS_KEY')
        self.bucket_name = os.getenv('AWS_STORAGE_BUCKET_NAME')
        self.region = 'eu-north-1'
        
        if not all([self.access_key, self.secret_key, self.bucket_name]):
            raise ValueError("AWS credentials not configured")
        
        # Créer le client S3 avec endpoint régional (IMPORTANT pour eu-north-1)
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
            region_name=self.region,
            endpoint_url=f'https://s3.{self.region}.amazonaws.com',  # Force endpoint régional
            config=boto3.session.Config(
                signature_version='s3v4',
                s3={'addressing_style': 'virtual'}  # Style d'adressage virtuel
            )
        )
    
    def list_objects(
        self,
        prefix: str = "",
        delimiter: str = "/",
        max_keys: int = 1000
    ) -> Dict:
        """
        Liste les objets dans S3
        
        Args:
            prefix: Préfixe pour filtrer
            delimiter: Délimiteur pour la structure de dossiers
            max_keys: Nombre maximum d'objets à retourner
            
        Returns:
            Dict avec folders et files
        """
        try:
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=prefix,
                Delimiter=delimiter,
                MaxKeys=max_keys
            )
            
            folders = []
            files = []
            
            # Traiter les dossiers (CommonPrefixes)
            if 'CommonPrefixes' in response:
                for obj in response['CommonPrefixes']:
                    folder_path = obj['Prefix']
                    folder_name = folder_path.rstrip('/').split('/')[-1]
                    folders.append({
                        'name': folder_name,
                        'path': folder_path,
                        'type': 'folder'
                    })
            
            # Traiter les fichiers (Contents)
            if 'Contents' in response:
                for obj in response['Contents']:
                    # Ignorer les marqueurs de dossier (.keep, trailing /)
                    if obj['Key'].endswith('/') or obj['Key'].endswith('/.keep'):
                        continue
                    
                    if obj['Key'] != prefix:  # Ne pas inclure le dossier lui-même
                        file_name = obj['Key'].split('/')[-1]
                        
                        # Déterminer le type de contenu
                        content_type = get_content_type(file_name)
                        
                        files.append({
                            'name': file_name,
                            'path': obj['Key'],
                            'size': obj['Size'],
                            'last_modified': obj['LastModified'].isoformat(),
                            'type': 'file',
                            'content_type': content_type
                        })
            
            return {
                'folders': folders,
                'files': files,
                'current_path': prefix
            }
            
        except Exception as e:
            raise
    
    def get_presigned_url(
        self,
        key: str,
        expires_in: int = 7200,  # OPTIMISATION : 2h au lieu de 1h
        response_content_disposition: Optional[str] = None
    ) -> str:
        """
        Génère une URL présignée pour télécharger un fichier
        
        Args:
            key: Clé S3 du fichier
            expires_in: Durée de validité en secondes (défaut: 2h)
            response_content_disposition: Content-Disposition header
            
        Returns:
            URL présignée
        """
        try:
            params = {
                'Bucket': self.bucket_name,
                'Key': key
            }
            
            if response_content_disposition:
                params['ResponseContentDisposition'] = response_content_disposition
            
            # OPTIMISATION : Génération rapide sans vérification
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params=params,
                ExpiresIn=expires_in
            )
            
            return url
            
        except Exception as e:
            raise
    
    def get_presigned_upload_url(
        self,
        key: str,
        content_type: str = 'application/octet-stream',
        expires_in: int = 3600
    ) -> Dict:
        """
        Génère une URL présignée pour uploader un fichier
        
        Args:
            key: Clé S3 du fichier
            content_type: Type MIME du fichier
            expires_in: Durée de validité en secondes
            
        Returns:
            Dict avec URL et fields
        """
        try:
            response = self.s3_client.generate_presigned_post(
                Bucket=self.bucket_name,
                Key=key,
                Fields={
                    'Content-Type': content_type,
                    'acl': 'private'
                },
                Conditions=[
                    {'Content-Type': content_type},
                    {'acl': 'private'},
                    ['content-length-range', 0, 100 * 1024 * 1024]  # 100 MB max
                ],
                ExpiresIn=expires_in
            )
            
            return response
            
        except Exception as e:
            raise
    
    def create_folder(self, folder_path: str) -> bool:
        """
        Crée un dossier virtuel dans S3
        
        Args:
            folder_path: Chemin du dossier
            
        Returns:
            True si succès
        """
        try:
            # S'assurer que le chemin se termine par /
            if not folder_path.endswith('/'):
                folder_path += '/'
            
            # Créer un fichier .keep pour marquer le dossier
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=f"{folder_path}.keep",
                Body=b''
            )
            
            return True
            
        except Exception as e:
            return False
    
    def delete_object(self, key: str) -> bool:
        """
        Supprime un objet dans S3
        
        Args:
            key: Clé S3 de l'objet
            
        Returns:
            True si succès
        """
        try:
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=key
            )
            return True
            
        except Exception as e:
            return False
    
    def delete_folder(self, folder_path: str) -> bool:
        """
        Supprime un dossier et son contenu
        
        Args:
            folder_path: Chemin du dossier
            
        Returns:
            True si succès
        """
        try:
            # S'assurer que le chemin se termine par /
            if not folder_path.endswith('/'):
                folder_path += '/'
            
            # Lister tous les objets dans le dossier
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=folder_path
            )
            
            if 'Contents' in response:
                # Supprimer tous les objets
                objects_to_delete = [{'Key': obj['Key']} for obj in response['Contents']]
                
                self.s3_client.delete_objects(
                    Bucket=self.bucket_name,
                    Delete={'Objects': objects_to_delete}
                )
            
            return True
            
        except Exception as e:
            return False
    
    def copy_object(self, source_key: str, dest_key: str) -> bool:
        """
        Copie un objet dans S3
        
        Args:
            source_key: Clé source
            dest_key: Clé destination
            
        Returns:
            True si succès
        """
        try:
            copy_source = {
                'Bucket': self.bucket_name,
                'Key': source_key
            }
            
            self.s3_client.copy_object(
                CopySource=copy_source,
                Bucket=self.bucket_name,
                Key=dest_key
            )
            
            return True
            
        except Exception as e:
            return False
    
    def move_object(self, source_key: str, dest_key: str) -> bool:
        """
        Déplace un objet dans S3 (fichier ou dossier)
        
        Args:
            source_key: Clé source
            dest_key: Clé destination
            
        Returns:
            True si succès
        """
        try:
            # Si c'est un dossier (se termine par /), déplacer tous les objets du dossier
            if source_key.endswith('/'):
                # S'assurer que dest_key se termine aussi par /
                if not dest_key.endswith('/'):
                    dest_key += '/'
                
                # Lister tous les objets dans le dossier source
                response = self.s3_client.list_objects_v2(
                    Bucket=self.bucket_name,
                    Prefix=source_key
                )
                
                if 'Contents' not in response:
                    # Dossier vide, créer juste le .keep
                    self.s3_client.put_object(
                        Bucket=self.bucket_name,
                        Key=f"{dest_key}.keep",
                        Body=b''
                    )
                    # Supprimer l'ancien .keep
                    self.s3_client.delete_object(
                        Bucket=self.bucket_name,
                        Key=f"{source_key}.keep"
                    )
                    return True
                
                # Copier tous les objets
                objects_to_copy = response['Contents']
                for obj in objects_to_copy:
                    old_key = obj['Key']
                    # Remplacer le préfixe source par le préfixe destination
                    new_key = old_key.replace(source_key, dest_key, 1)
                    
                    # Copier l'objet
                    copy_source = {
                        'Bucket': self.bucket_name,
                        'Key': old_key
                    }
                    self.s3_client.copy_object(
                        CopySource=copy_source,
                        Bucket=self.bucket_name,
                        Key=new_key
                    )
                
                # Supprimer tous les anciens objets
                objects_to_delete = [{'Key': obj['Key']} for obj in objects_to_copy]
                self.s3_client.delete_objects(
                    Bucket=self.bucket_name,
                    Delete={'Objects': objects_to_delete}
                )
                
                return True
            else:
                # C'est un fichier, copier puis supprimer
                if self.copy_object(source_key, dest_key):
                    return self.delete_object(source_key)
                return False
            
        except Exception as e:
            return False
    
    def search_objects(
        self,
        search_term: str,
        prefix: str = "",
        max_results: int = 100
    ) -> Dict:
        """
        Recherche récursive des objets par nom dans tous les niveaux (optimisée)
        
        Args:
            search_term: Terme de recherche
            prefix: Préfixe pour limiter la recherche (optionnel)
            max_results: Nombre maximum de résultats
            
        Returns:
            Dict avec files et folders trouvés
        """
        try:
            folders = []
            files = []
            search_lower = search_term.lower()
            seen_folders = set()  # Pour éviter les doublons de dossiers
            seen_folder_paths = set()  # Pour tracker rapidement les chemins de dossiers vus
            
            # Utiliser un paginator pour gérer la pagination
            # SANS Delimiter pour parcourir récursivement tous les niveaux
            paginator = self.s3_client.get_paginator('list_objects_v2')
            page_iterator = paginator.paginate(
                Bucket=self.bucket_name,
                Prefix=prefix
                # Pas de Delimiter pour recherche récursive
            )
            
            # Fonction helper pour calculer la profondeur d'un chemin
            def get_depth(path):
                """Calcule la profondeur d'un chemin (nombre de segments)"""
                if not path:
                    return 0
                # Compter les segments non vides
                return len([p for p in path.rstrip('/').split('/') if p])
            
            # Fonction helper pour ajouter un dossier (évite la duplication de code)
            def add_folder_if_matches(folder_path, folder_name=None):
                """Ajoute un dossier s'il correspond à la recherche"""
                if folder_path in seen_folders:
                    return False
                    
                # Normaliser le chemin
                if not folder_path.endswith('/'):
                    folder_path += '/'
                
                # Extraire le nom si non fourni
                if folder_name is None:
                    folder_name = folder_path.rstrip('/').split('/')[-1] if folder_path.rstrip('/') else ''
                
                # Vérifier si le terme de recherche est dans le nom
                if folder_name and search_lower in folder_name.lower():
                    seen_folders.add(folder_path)
                    depth = get_depth(folder_path)
                    folders.append({
                        'name': folder_name,
                        'path': folder_path,
                        'type': 'folder',
                        'depth': depth  # Ajouter la profondeur pour le tri
                    })
                    return True
                return False
            
            for page in page_iterator:
                if 'Contents' not in page:
                    continue
                    
                for obj in page['Contents']:
                    key = obj['Key']
                    
                    # Arrêter tôt si on a assez de résultats
                    if len(folders) >= max_results:
                        break
                    
                    # Traiter les marqueurs de dossier (.keep)
                    if key.endswith('/.keep'):
                        folder_path = key[:-6]  # Enlever '/.keep'
                        add_folder_if_matches(folder_path)
                        continue
                    
                    # Traiter les marqueurs de dossier S3 (clé se terminant par /)
                    if key.endswith('/'):
                        folder_path = key
                        add_folder_if_matches(folder_path)
                        continue
                    
                    # Pour les fichiers, extraire les dossiers parents UNIQUEMENT si nécessaire
                    # Optimisation : ne parcourir les segments que si le terme de recherche
                    # pourrait être dans un segment du chemin
                    path_parts = key.split('/')
                    if len(path_parts) > 1:
                        # Vérifier d'abord si le terme est dans le chemin complet (plus rapide)
                        key_lower = key.lower()
                        if search_lower in key_lower:
                            # Construire les chemins de dossiers parents de manière optimisée
                            current_path = ''
                            for part in path_parts[:-1]:  # Exclure le nom du fichier
                                if part:
                                    current_path += part + '/'
                                    # Ne vérifier que si on n'a pas déjà vu ce chemin
                                    if current_path not in seen_folder_paths:
                                        seen_folder_paths.add(current_path)
                                        # Vérifier si ce segment correspond
                                        if search_lower in part.lower():
                                            add_folder_if_matches(current_path, part)
                                            
                                            # Arrêter si on a assez de résultats
                                            if len(folders) >= max_results:
                                                break
                        
                        # Traiter le fichier lui-même (si on cherche aussi les fichiers)
                        file_name = path_parts[-1]
                        if file_name and search_lower in file_name.lower():
                            content_type = get_content_type(file_name)
                            files.append({
                                'name': file_name,
                                'path': key,
                                'size': obj['Size'],
                                'last_modified': obj['LastModified'].isoformat(),
                                'type': 'file',
                                'content_type': content_type
                            })
                    
                    # Arrêter si on a atteint le maximum de résultats
                    if len(folders) >= max_results:
                        break
                
                # Arrêter la pagination si on a assez de résultats
                if len(folders) >= max_results:
                    break
            
            # Trier les dossiers par profondeur (niveau) puis par nom
            # Les dossiers moins profonds (plus proches de la racine) apparaissent en premier
            folders_sorted = sorted(
                folders,
                key=lambda x: (x.get('depth', 999), x['name'].lower())
            )
            
            return {
                'folders': folders_sorted[:max_results],  # S'assurer qu'on ne dépasse pas la limite
                'files': files[:max_results],
                'search_term': search_term
            }
            
        except Exception as e:
            raise
    
    def get_object_metadata(self, key: str) -> Optional[Dict]:
        """
        Récupère les métadonnées d'un objet
        
        Args:
            key: Clé S3 de l'objet
            
        Returns:
            Dict avec métadonnées ou None
        """
        try:
            response = self.s3_client.head_object(
                Bucket=self.bucket_name,
                Key=key
            )
            
            return {
                'content_type': response.get('ContentType'),
                'content_length': response.get('ContentLength'),
                'last_modified': response.get('LastModified').isoformat() if response.get('LastModified') else None,
                'metadata': response.get('Metadata', {})
            }
            
        except Exception as e:
            return None
    
    def upload_file_content(self, key: str, content: bytes) -> bool:
        """
        Upload du contenu binaire directement sur S3
        
        Args:
            key: Clé S3 du fichier
            content: Contenu binaire du fichier
            
        Returns:
            True si succès
        """
        try:
            # Déterminer le content type
            content_type = get_content_type(key)
            
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=key,
                Body=content,
                ContentType=content_type
            )
            
            return True
            
        except Exception as e:
            return False
    
    def download_file_content(self, key: str) -> bytes:
        """
        Télécharge le contenu d'un fichier depuis S3
        
        Args:
            key: Clé S3 du fichier
            
        Returns:
            Contenu binaire du fichier
        """
        try:
            response = self.s3_client.get_object(
                Bucket=self.bucket_name,
                Key=key
            )
            
            return response['Body'].read()
            
        except Exception as e:
            raise Exception(f"Erreur lors du téléchargement du fichier {key}: {str(e)}")