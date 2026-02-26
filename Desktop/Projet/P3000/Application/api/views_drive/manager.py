"""
Drive Manager - Gestionnaire principal du Drive V2
"""

from typing import Dict, List, Optional, Tuple
from .storage import StorageManager
import re
import zipfile
import io
from datetime import datetime
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

    def _build_historique_destination_path(self, item_path: str, is_folder: bool) -> str:
        """
        Construit un chemin de destination unique dans Historique.

        Args:
            item_path: Chemin source de l'élément
            is_folder: True si c'est un dossier

        Returns:
            Chemin destination dans Historique
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        clean_path = item_path.strip('/')

        if is_folder:
            folder_name = clean_path.split('/')[-1] if clean_path else "Dossier"
            # Conserver une trace de l'origine dans le nom pour éviter les collisions.
            source_hint = clean_path.replace('/', '__') if clean_path else "racine"
            return f"Historique/{folder_name}__{source_hint}__{timestamp}/"

        file_name = clean_path.split('/')[-1] if clean_path else "document"
        dot_index = file_name.rfind('.')
        if dot_index > 0:
            base_name = file_name[:dot_index]
            extension = file_name[dot_index:]
        else:
            base_name = file_name
            extension = ''

        source_hint = clean_path.replace('/', '__') if clean_path else "racine"
        return f"Historique/{base_name}__{source_hint}__{timestamp}{extension}"

    def _archive_item_to_historique(self, item_path: str, is_folder: bool) -> Tuple[bool, str]:
        """
        Archive un fichier/dossier dans Historique via un déplacement.

        Args:
            item_path: Chemin source
            is_folder: True si c'est un dossier

        Returns:
            Tuple (succès, chemin_destination)
        """
        # Si l'élément est déjà dans Historique, ne pas réarchiver.
        if item_path.startswith('Historique/'):
            return False, ""

        # S'assurer que le dossier Historique existe.
        self.storage.create_folder('Historique/')

        source_path = item_path
        if is_folder and not source_path.endswith('/'):
            source_path += '/'

        destination_path = self._build_historique_destination_path(source_path, is_folder)
        success = self.storage.move_object(source_path, destination_path)
        return success, destination_path
    
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
        folder_name: str,
        modified_by: Optional[str] = None
    ) -> Dict:
        """
        Crée un nouveau dossier
        
        Args:
            parent_path: Chemin du dossier parent
            folder_name: Nom du nouveau dossier
            modified_by: Nom de l'utilisateur qui crée le dossier
            
        Returns:
            Dict avec le chemin du dossier créé
        """
        try:
            if not folder_name or not folder_name.strip():
                raise ValueError("Le nom du dossier ne peut pas être vide")
            
            parent_path = self.normalize_path(parent_path)
            folder_name_normalized = normalize_filename(folder_name.strip())
            folder_name_display = folder_name.strip()
            
            folder_path = f"{parent_path}{folder_name_normalized}/"
            
            success = self.storage.create_folder(folder_path)
            
            if success:
                if modified_by:
                    self.storage.update_folder_metadata(
                        parent_path, folder_name_normalized + '/', modified_by
                    )
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
        is_folder: bool = False,
        modified_by: Optional[str] = None
    ) -> Dict:
        """
        Supprime un fichier ou un dossier
        
        Args:
            item_path: Chemin de l'élément
            is_folder: True si c'est un dossier
            modified_by: Nom de l'utilisateur qui supprime
            
        Returns:
            Dict avec le résultat
        """
        try:
            # Avant de supprimer, invalider le cache OnlyOffice si c'est un fichier
            if not is_folder:
                from django.core.cache import cache
                from .onlyoffice import OnlyOfficeManager
                
                last_modified = None
                try:
                    metadata = self.storage.get_object_metadata(item_path)
                    if metadata and metadata.get('last_modified'):
                        last_modified = metadata['last_modified']
                except:
                    pass
                
                try:
                    if last_modified:
                        document_key, _ = OnlyOfficeManager.generate_clean_key(item_path, last_modified)
                        cache.delete(f"onlyoffice_key_{document_key}")
                    
                    document_key_old, _ = OnlyOfficeManager.generate_clean_key(item_path, None)
                    cache.delete(f"onlyoffice_key_{document_key_old}")
                except:
                    pass

            # Déterminer le dossier parent et le nom de l'item pour le metadata
            parent_path = ''
            item_name = item_path
            clean = item_path.rstrip('/')
            if '/' in clean:
                parent_path = clean.rsplit('/', 1)[0] + '/'
                item_name = clean.rsplit('/', 1)[1]
            if is_folder:
                item_name += '/'

            if item_path.startswith('Historique/'):
                if is_folder:
                    success = self.storage.delete_folder(item_path)
                    self.storage.delete_folder_metadata_file(item_path)
                else:
                    success = self.storage.delete_object(item_path)
                operation_message = 'Élément supprimé définitivement depuis Historique'
                result_path = item_path
            else:
                success, archived_path = self._archive_item_to_historique(item_path, is_folder)
                operation_message = 'Élément déplacé vers Historique avec succès'
                result_path = archived_path
            
            if success:
                # Supprimer l'entrée du .metadata.json du dossier parent
                self.storage.remove_folder_metadata_entry(parent_path, item_name)
                return {
                    'success': True,
                    'message': operation_message,
                    'archived_path': result_path
                }
            else:
                raise Exception("Échec de l'archivage dans Historique")
            
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
        content_type: str = 'application/octet-stream',
        modified_by: Optional[str] = None
    ) -> Dict:
        """
        Génère une URL d'upload pour un fichier
        
        Args:
            file_path: Chemin du dossier de destination
            file_name: Nom du fichier
            content_type: Type MIME du fichier
            modified_by: Nom de l'utilisateur qui uploade
            
        Returns:
            Dict avec URL et fields
        """
        try:
            file_path = self.normalize_path(file_path)
            file_name_normalized = normalize_filename(file_name)
            full_key = f"{file_path}{file_name_normalized}"
            
            upload_data = self.storage.get_presigned_upload_url(
                key=full_key,
                content_type=content_type
            )
            
            if modified_by:
                self.storage.update_folder_metadata(
                    file_path, file_name_normalized, modified_by
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
        dest_path: str,
        modified_by: Optional[str] = None
    ) -> Dict:
        """
        Déplace un fichier ou dossier
        
        Args:
            source_path: Chemin source
            dest_path: Chemin destination (peut contenir le nom du fichier)
            modified_by: Nom de l'utilisateur qui déplace
            
        Returns:
            Dict avec le résultat
        """
        try:
            dest_path_normalized = normalize_path_segments(dest_path)
            
            # Déterminer le dossier parent source et le nom de l'item
            is_folder = source_path.endswith('/')
            clean_source = source_path.rstrip('/')
            if '/' in clean_source:
                old_parent = clean_source.rsplit('/', 1)[0] + '/'
                old_item_name = clean_source.rsplit('/', 1)[1]
            else:
                old_parent = ''
                old_item_name = clean_source
            if is_folder:
                old_item_name += '/'
            
            success = self.storage.move_object(source_path, dest_path_normalized)
            
            if success:
                # Supprimer l'entrée du .metadata.json source
                self.storage.remove_folder_metadata_entry(old_parent, old_item_name)
                
                # Ajouter l'entrée dans le .metadata.json destination
                if modified_by:
                    clean_dest = dest_path_normalized.rstrip('/')
                    if '/' in clean_dest:
                        new_parent = clean_dest.rsplit('/', 1)[0] + '/'
                        new_item_name = clean_dest.rsplit('/', 1)[1]
                    else:
                        new_parent = ''
                        new_item_name = clean_dest
                    if is_folder:
                        new_item_name += '/'
                    self.storage.update_folder_metadata(
                        new_parent, new_item_name, modified_by
                    )
                
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
        new_name: str,
        modified_by: Optional[str] = None
    ) -> Dict:
        """
        Renomme un fichier ou dossier
        
        Args:
            old_path: Ancien chemin
            new_name: Nouveau nom
            modified_by: Nom de l'utilisateur qui renomme
            
        Returns:
            Dict avec le résultat
        """
        try:
            new_name_normalized = normalize_filename(new_name)
            is_folder = old_path.endswith('/')
            
            if '/' in old_path:
                if is_folder:
                    path_without_slash = old_path.rstrip('/')
                    parent_path = path_without_slash.rsplit('/', 1)[0] + '/' if '/' in path_without_slash else ''
                    old_item_name = path_without_slash.rsplit('/', 1)[1] + '/'
                    new_path = f"{parent_path}{new_name_normalized}/"
                else:
                    parent_path = old_path.rsplit('/', 1)[0] + '/' if '/' in old_path else ''
                    old_item_name = old_path.rsplit('/', 1)[1]
                    new_path = f"{parent_path}{new_name_normalized}"
            else:
                parent_path = ''
                old_item_name = old_path + ('/' if is_folder else '')
                if is_folder:
                    new_path = f"{new_name_normalized}/"
                else:
                    new_path = new_name_normalized
            
            if is_folder:
                folder_content = self.get_folder_content(parent_path)
                existing_folders = [f['path'] for f in folder_content.get('folders', [])]
                if new_path in existing_folders and new_path != old_path:
                    raise ValueError(f"Un dossier avec le nom '{new_name}' existe déjà")
            else:
                folder_content = self.get_folder_content(parent_path)
                existing_files = [f['path'] for f in folder_content.get('files', [])]
                if new_path in existing_files and new_path != old_path:
                    raise ValueError(f"Un fichier avec le nom '{new_name}' existe déjà")
            
            success = self.storage.move_object(old_path, new_path)
            
            if success:
                # Mettre à jour le .metadata.json : supprimer l'ancien nom, ajouter le nouveau
                self.storage.remove_folder_metadata_entry(parent_path, old_item_name)
                new_meta_name = new_name_normalized + ('/' if is_folder else '')
                user = modified_by or ''
                if user:
                    self.storage.update_folder_metadata(parent_path, new_meta_name, user)
                
                return {
                    'success': True,
                    'message': 'Élément renommé avec succès',
                    'new_path': new_path
                }
            else:
                source_metadata = self.storage.get_object_metadata(old_path)
                if not source_metadata:
                    raise Exception(f"Le fichier ou dossier source '{old_path}' n'existe pas")
                raise Exception("Échec du renommage")
            
        except ValueError as e:
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
                    
                    # Ignorer les marqueurs de dossier (.keep, trailing /) et les metadata
                    if key.endswith('/') or key.endswith('/.keep') or key.endswith('/.metadata.json'):
                        continue
                    
                    if key == folder_path:
                        continue
                    
                    file_name = key.split('/')[-1]
                    all_files.append({
                        'path': key,
                        'name': file_name
                    })
            
            return all_files
            
        except Exception as e:
            raise Exception(f"Erreur lors de la récupération récursive des fichiers: {str(e)}")
