"""
Drive Manager - Gestionnaire principal du Drive V2
"""

from typing import Dict, List, Optional, Tuple
from .storage import StorageManager
import re
import zipfile
import io
from ..utils import encode_filename_for_content_disposition


def normalize_filename(filename: str) -> str:
    """
    Normalise un nom de fichier ou dossier en remplaçant les espaces par des underscores
    
    RÈGLE : Remplacer UNIQUEMENT les espaces par des underscores
    AWS S3 accepte tous les caractères spéciaux SAUF les espaces
    
    Args:
        filename: Nom du fichier/dossier à normaliser
        
    Returns:
        Nom normalisé
    """
    if not filename:
        return filename
    
    # Remplacer UNIQUEMENT les espaces par des underscores
    # Tous les autres caractères spéciaux (&, @, #, etc.) sont autorisés par AWS S3
    normalized = filename.replace(' ', '_')
    # Spécifique: encoder le slash '/' pour éviter la création de sous-dossiers
    # Utiliser le caractère '∕' (U+2215) visuellement proche et sûr pour les clés S3
    normalized = normalized.replace('/', '∕')
    
    return normalized


def denormalize_filename(normalized_filename: str) -> str:
    """
    Convertit un nom de fichier normalisé (avec underscores) en nom d'affichage (avec espaces)
    C'est l'inverse de normalize_filename
    
    Args:
        normalized_filename: Nom normalisé avec underscores
        
    Returns:
        Nom d'affichage avec espaces
    """
    if not normalized_filename:
        return normalized_filename
    
    # Remplacer les underscores par des espaces pour l'affichage
    # Décoder le slash encodé '∕' (U+2215) vers '/'
    display_name = normalized_filename.replace('_', ' ')
    display_name = display_name.replace('∕', '/')
    
    return display_name


def normalize_path_segments(path: str) -> str:
    """
    Normalise tous les segments d'un chemin (dossiers et fichiers)
    
    Args:
        path: Chemin à normaliser (ex: "dossier parent/fichier avec espaces.pdf")
        
    Returns:
        Chemin normalisé (ex: "dossier_parent/fichier_avec_espaces.pdf")
    """
    if not path:
        return path
    
    # Séparer le chemin en segments
    segments = path.split('/')
    
    # Normaliser chaque segment (sauf le dernier s'il contient une extension)
    normalized_segments = []
    for i, segment in enumerate(segments):
        if segment:
            # Normaliser le segment
            normalized_segments.append(normalize_filename(segment))
        else:
            # Garder les slashes vides (pour les chemins absolus)
            normalized_segments.append('')
    
    # Rejoindre les segments
    return '/'.join(normalized_segments)


class DriveManager:
    """
    Gestionnaire principal du Drive V2
    Orchestre les opérations de stockage et la logique métier
    """
    
    def __init__(self):
        """Initialise le gestionnaire avec le storage manager"""
        self.storage = StorageManager()
    
    def normalize_path(self, path: str) -> str:
        """
        Normalise un chemin de dossier
        
        Args:
            path: Chemin à normaliser
            
        Returns:
            Chemin normalisé
        """
        if not path:
            return ""
        
        # Supprimer les slashes au début et à la fin
        path = path.strip('/')
        
        # S'assurer qu'il se termine par / pour les dossiers
        if path and not path.endswith('/'):
            path += '/'
        
        return path
    
    def get_folder_content(
        self,
        folder_path: str = ""
    ) -> Dict:
        """
        Récupère le contenu d'un dossier
        
        Args:
            folder_path: Chemin du dossier
            
        Returns:
            Dict avec folders, files et current_path
        """
        try:
            # Normaliser le chemin
            normalized_path = self.normalize_path(folder_path)
            
            # Récupérer le contenu via le storage manager
            content = self.storage.list_objects(prefix=normalized_path)
            
            # Trier les dossiers et fichiers par nom
            content['folders'] = sorted(
                content['folders'],
                key=lambda x: x['name'].lower()
            )
            content['files'] = sorted(
                content['files'],
                key=lambda x: x['name'].lower()
            )
            
            return content
            
        except Exception as e:
            raise
    
    def create_folder(
        self,
        parent_path: str,
        folder_name: str
    ) -> Dict:
        """
        Crée un nouveau dossier
        
        Args:
            parent_path: Chemin du dossier parent
            folder_name: Nom du nouveau dossier
            
        Returns:
            Dict avec le chemin du dossier créé
        """
        try:
            # Valider le nom du dossier
            if not folder_name or not folder_name.strip():
                raise ValueError("Le nom du dossier ne peut pas être vide")
            
            # Normaliser les chemins
            parent_path = self.normalize_path(parent_path)
            # Normaliser le nom du dossier (remplacer espaces par underscores)
            folder_name_normalized = normalize_filename(folder_name.strip())
            folder_name_display = folder_name.strip()  # Garder le nom original pour l'affichage
            
            # Construire le chemin complet avec le nom normalisé
            folder_path = f"{parent_path}{folder_name_normalized}/"
            
            # Créer le dossier
            success = self.storage.create_folder(folder_path)
            
            if success:
                return {
                    'success': True,
                    'folder_path': folder_path,
                    'folder_name': folder_name_normalized,
                    'folder_name_display': folder_name_display
                }
            else:
                raise Exception("Échec de la création du dossier")
            
        except Exception as e:
            raise
    
    def delete_item(
        self,
        item_path: str,
        is_folder: bool = False
    ) -> Dict:
        """
        Supprime un fichier ou un dossier
        
        Args:
            item_path: Chemin de l'élément
            is_folder: True si c'est un dossier
            
        Returns:
            Dict avec le résultat
        """
        try:
            # Avant de supprimer, invalider le cache OnlyOffice si c'est un fichier
            if not is_folder:
                from django.core.cache import cache
                from .onlyoffice import OnlyOfficeManager
                
                # Essayer de récupérer la date de modification avant suppression
                last_modified = None
                try:
                    metadata = self.storage.get_object_metadata(item_path)
                    if metadata and metadata.get('last_modified'):
                        last_modified = metadata['last_modified']
                except:
                    pass
                
                # Générer la clé avec et sans date de modification pour être sûr d'invalider
                try:
                    # Clé avec date de modification si disponible
                    if last_modified:
                        document_key, _ = OnlyOfficeManager.generate_clean_key(item_path, last_modified)
                        cache.delete(f"onlyoffice_key_{document_key}")
                    
                    # Aussi invalider avec la clé sans date (pour les anciens fichiers)
                    document_key_old, _ = OnlyOfficeManager.generate_clean_key(item_path, None)
                    cache.delete(f"onlyoffice_key_{document_key_old}")
                except:
                    # Si on ne peut pas invalider le cache, continuer quand même
                    pass
            
            if is_folder:
                success = self.storage.delete_folder(item_path)
            else:
                success = self.storage.delete_object(item_path)
            
            if success:
                return {
                    'success': True,
                    'message': 'Élément supprimé avec succès'
                }
            else:
                raise Exception("Échec de la suppression")
            
        except Exception as e:
            raise
    
    def get_download_url(
        self,
        file_path: str,
        expires_in: int = 3600
    ) -> str:
        """
        Génère une URL de téléchargement pour un fichier
        
        Args:
            file_path: Chemin du fichier
            expires_in: Durée de validité en secondes
            
        Returns:
            URL présignée
        """
        try:
            # Extraire le nom du fichier normalisé depuis le chemin S3
            normalized_file_name = file_path.split('/')[-1]
            # Convertir le nom normalisé en nom d'affichage (avec espaces)
            display_file_name = denormalize_filename(normalized_file_name)
            # Pour les URLs présignées S3, utiliser for_presigned_url=True
            disposition = encode_filename_for_content_disposition(display_file_name, for_presigned_url=True)
            
            url = self.storage.get_presigned_url(
                key=file_path,
                expires_in=expires_in,
                response_content_disposition=disposition
            )
            
            return url
            
        except Exception as e:
            raise
    
    def get_display_url(
        self,
        file_path: str,
        expires_in: int = 3600
    ) -> str:
        """
        Génère une URL d'affichage pour un fichier
        
        Args:
            file_path: Chemin du fichier
            expires_in: Durée de validité en secondes
            
        Returns:
            URL présignée
        """
        try:
            url = self.storage.get_presigned_url(
                key=file_path,
                expires_in=expires_in,
                response_content_disposition='inline'
            )
            
            return url
            
        except Exception as e:
            raise
    
    def get_onlyoffice_url(
        self,
        file_path: str,
        expires_in: int = 86400
    ) -> str:
        """
        Génère une URL pour OnlyOffice (sans response-content-disposition)
        
        Args:
            file_path: Chemin du fichier
            expires_in: Durée de validité en secondes (défaut: 24h)
            
        Returns:
            URL présignée
        """
        try:
            # OnlyOffice préfère des URLs simples sans response-content-disposition
            url = self.storage.get_presigned_url(
                key=file_path,
                expires_in=expires_in,
                response_content_disposition=None
            )
            
            return url
            
        except Exception as e:
            raise
    
    def get_upload_url(
        self,
        file_path: str,
        file_name: str,
        content_type: str = 'application/octet-stream'
    ) -> Dict:
        """
        Génère une URL d'upload pour un fichier
        
        Args:
            file_path: Chemin du dossier de destination
            file_name: Nom du fichier
            content_type: Type MIME du fichier
            
        Returns:
            Dict avec URL et fields
        """
        try:
            # Normaliser le chemin
            file_path = self.normalize_path(file_path)
            
            # Normaliser le nom du fichier (remplacer espaces par underscores)
            file_name_normalized = normalize_filename(file_name)
            
            # Construire la clé complète avec le nom normalisé
            full_key = f"{file_path}{file_name_normalized}"
            
            # Générer l'URL d'upload
            upload_data = self.storage.get_presigned_upload_url(
                key=full_key,
                content_type=content_type
            )
            
            return {
                'upload_url': upload_data['url'],
                'fields': upload_data['fields'],
                'file_path': full_key
            }
            
        except Exception as e:
            raise
    
    def search_files(
        self,
        search_term: str,
        folder_path: str = "",
        max_results: int = 100
    ) -> Dict:
        """
        Recherche des fichiers et dossiers
        
        Args:
            search_term: Terme de recherche
            folder_path: Dossier de base pour la recherche
            max_results: Nombre maximum de résultats
            
        Returns:
            Dict avec files et folders trouvés
        """
        try:
            # Normaliser le chemin
            folder_path = self.normalize_path(folder_path)
            
            # Rechercher via le storage manager
            results = self.storage.search_objects(
                search_term=search_term,
                prefix=folder_path,
                max_results=max_results
            )
            
            return results
            
        except Exception as e:
            raise
    
    def move_item(
        self,
        source_path: str,
        dest_path: str
    ) -> Dict:
        """
        Déplace un fichier ou dossier
        
        Args:
            source_path: Chemin source
            dest_path: Chemin destination (peut contenir le nom du fichier)
            
        Returns:
            Dict avec le résultat
        """
        try:
            # Normaliser le chemin de destination (normaliser les segments du chemin)
            dest_path_normalized = normalize_path_segments(dest_path)
            
            success = self.storage.move_object(source_path, dest_path_normalized)
            
            if success:
                return {
                    'success': True,
                    'message': 'Élément déplacé avec succès',
                    'new_path': dest_path_normalized
                }
            else:
                raise Exception("Échec du déplacement")
            
        except Exception as e:
            raise
    
    def rename_item(
        self,
        old_path: str,
        new_name: str
    ) -> Dict:
        """
        Renomme un fichier ou dossier
        
        Args:
            old_path: Ancien chemin
            new_name: Nouveau nom
            
        Returns:
            Dict avec le résultat
        """
        try:
            # Normaliser le nouveau nom (remplacer espaces par underscores)
            new_name_normalized = normalize_filename(new_name)
            
            # Extraire le chemin parent
            is_folder = old_path.endswith('/')
            
            # Déterminer le chemin parent et le nouveau chemin
            if '/' in old_path:
                # Le fichier/dossier est dans un sous-dossier
                if is_folder:
                    # Pour un dossier, enlever le dernier '/' puis extraire le parent
                    path_without_slash = old_path.rstrip('/')
                    parent_path = path_without_slash.rsplit('/', 1)[0] + '/' if '/' in path_without_slash else ''
                    new_path = f"{parent_path}{new_name_normalized}/"
                else:
                    # Pour un fichier
                    parent_path = old_path.rsplit('/', 1)[0] + '/' if '/' in old_path else ''
                    new_path = f"{parent_path}{new_name_normalized}"
            else:
                # Le fichier/dossier est à la racine
                parent_path = ''
                if is_folder:
                    new_path = f"{new_name_normalized}/"
                else:
                    new_path = new_name_normalized
            
            # Vérifier si la destination existe déjà (conflit)
            if is_folder:
                # Pour un dossier, vérifier si le dossier existe déjà
                folder_content = self.get_folder_content(parent_path)
                existing_folders = [f['path'] for f in folder_content.get('folders', [])]
                if new_path in existing_folders and new_path != old_path:
                    raise ValueError(f"Un dossier avec le nom '{new_name}' existe déjà")
            else:
                # Pour un fichier, vérifier si le fichier existe déjà
                folder_content = self.get_folder_content(parent_path)
                existing_files = [f['path'] for f in folder_content.get('files', [])]
                if new_path in existing_files and new_path != old_path:
                    raise ValueError(f"Un fichier avec le nom '{new_name}' existe déjà")
            
            # Déplacer l'élément
            success = self.storage.move_object(old_path, new_path)
            
            if success:
                return {
                    'success': True,
                    'message': 'Élément renommé avec succès',
                    'new_path': new_path
                }
            else:
                # Vérifier si le fichier source existe
                source_metadata = self.storage.get_object_metadata(old_path)
                if not source_metadata:
                    raise Exception(f"Le fichier ou dossier source '{old_path}' n'existe pas")
                raise Exception("Échec du renommage")
            
        except ValueError as e:
            # Erreur de conflit de nom
            raise
        except Exception as e:
            raise
    
    def get_breadcrumb(self, path: str) -> List[Dict]:
        """
        Génère le fil d'Ariane pour un chemin
        
        Args:
            path: Chemin actuel
            
        Returns:
            Liste de dicts avec name et path
        """
        if not path:
            return [{'name': 'Racine', 'path': ''}]
        
        breadcrumb = [{'name': 'Racine', 'path': ''}]
        
        parts = path.strip('/').split('/')
        current_path = ""
        
        for part in parts:
            if part:
                current_path += f"{part}/"
                breadcrumb.append({
                    'name': part,
                    'path': current_path
                })
        
        return breadcrumb
    
    def download_folder_as_zip(
        self,
        folder_path: str
    ) -> Tuple[bytes, str]:
        """
        Télécharge un dossier et tous ses fichiers dans un ZIP
        
        Args:
            folder_path: Chemin du dossier à télécharger
            
        Returns:
            Tuple (contenu_zip, nom_fichier_zip)
        """
        try:
            # Normaliser le chemin du dossier
            normalized_path = self.normalize_path(folder_path)
            
            # Récupérer le nom du dossier pour le nom du ZIP
            folder_name = normalized_path.rstrip('/').split('/')[-1] if normalized_path.rstrip('/') else 'dossier'
            zip_filename = f"{folder_name}.zip"
            
            # Créer un ZIP en mémoire
            zip_buffer = io.BytesIO()
            
            with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                # Récupérer récursivement tous les fichiers du dossier
                all_files = self._get_all_files_recursive(normalized_path)
                
                # Télécharger chaque fichier et l'ajouter au ZIP
                for file_info in all_files:
                    try:
                        # Télécharger le fichier depuis S3
                        file_content = self.storage.download_file_content(file_info['path'])
                        
                        # Calculer le chemin relatif dans le ZIP
                        # Enlever le préfixe du dossier parent pour garder la structure relative
                        relative_path = file_info['path'][len(normalized_path):]
                        
                        # Ajouter le fichier au ZIP avec son chemin relatif
                        zip_file.writestr(relative_path, file_content)
                    except Exception as e:
                        # Continuer même si un fichier échoue
                        print(f"Erreur lors du téléchargement de {file_info['path']}: {str(e)}")
                        continue
            
            # Retourner le contenu du ZIP
            zip_buffer.seek(0)
            return zip_buffer.read(), zip_filename
            
        except Exception as e:
            raise Exception(f"Erreur lors de la création du ZIP: {str(e)}")
    
    def _get_all_files_recursive(self, folder_path: str) -> List[Dict]:
        """
        Récupère récursivement tous les fichiers d'un dossier
        
        Args:
            folder_path: Chemin du dossier
            
        Returns:
            Liste de dicts avec path et name pour chaque fichier
        """
        all_files = []
        
        try:
            # Utiliser le storage pour lister récursivement
            # On utilise list_objects_v2 sans delimiter pour parcourir récursivement
            paginator = self.storage.s3_client.get_paginator('list_objects_v2')
            page_iterator = paginator.paginate(
                Bucket=self.storage.bucket_name,
                Prefix=folder_path
            )
            
            for page in page_iterator:
                if 'Contents' not in page:
                    continue
                
                for obj in page['Contents']:
                    key = obj['Key']
                    
                    # Ignorer les marqueurs de dossier (.keep, trailing /)
                    if key.endswith('/') or key.endswith('/.keep'):
                        continue
                    
                    # Ignorer le dossier lui-même si c'est un marqueur
                    if key == folder_path:
                        continue
                    
                    # Ajouter le fichier à la liste
                    file_name = key.split('/')[-1]
                    all_files.append({
                        'path': key,
                        'name': file_name
                    })
            
            return all_files
            
        except Exception as e:
            raise Exception(f"Erreur lors de la récupération récursive des fichiers: {str(e)}")
