"""
Drive Manager - Gestionnaire principal du Drive V2
"""

from typing import Dict, List, Optional
from .storage import StorageManager
import re


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
            folder_name = folder_name.strip()
            
            # Construire le chemin complet
            folder_path = f"{parent_path}{folder_name}/"
            
            # Créer le dossier
            success = self.storage.create_folder(folder_path)
            
            if success:
                return {
                    'success': True,
                    'folder_path': folder_path,
                    'folder_name': folder_name
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
            # Extraire le nom du fichier pour le Content-Disposition
            file_name = file_path.split('/')[-1]
            disposition = f'attachment; filename="{file_name}"'
            
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
            
            # Construire la clé complète
            full_key = f"{file_path}{file_name}"
            
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
            dest_path: Chemin destination
            
        Returns:
            Dict avec le résultat
        """
        try:
            success = self.storage.move_object(source_path, dest_path)
            
            if success:
                return {
                    'success': True,
                    'message': 'Élément déplacé avec succès',
                    'new_path': dest_path
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
            # Extraire le chemin parent
            path_parts = old_path.rsplit('/', 2)
            
            if len(path_parts) >= 2:
                parent_path = path_parts[0] + '/'
                new_path = f"{parent_path}{new_name}"
                
                # Si c'est un dossier, ajouter le /
                if old_path.endswith('/'):
                    new_path += '/'
            else:
                new_path = new_name
            
            # Déplacer l'élément
            success = self.storage.move_object(old_path, new_path)
            
            if success:
                return {
                    'success': True,
                    'message': 'Élément renommé avec succès',
                    'new_path': new_path
                }
            else:
                raise Exception("Échec du renommage")
            
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
