"""
Module d'automatisation pour le drive
Gère la création automatique de dossiers et le transfert de fichiers
"""

import os
from typing import List, Dict, Optional
from .utils import (
    create_s3_folder_recursive,
    list_s3_folder_content,
    move_s3_file,
    delete_s3_file,
    custom_slugify
)


class DriveAutomation:
    """
    Classe pour automatiser les opérations du drive
    """
    
    # Structure des dossiers pour les appels d'offres
    APPEL_OFFRES_SUBFOLDERS = [
        "DEVIS",
        "DCE"           # Dossier des Cahiers des Charges
    ]
    
    # Structure des dossiers pour les chantiers
    CHANTIER_SUBFOLDERS = [
        "DEVIS",
        "SITUATION",
        "SOUS_TRAITANT",
        "FACTURE"
    ]
    
    def __init__(self):
        self.appels_offres_root = "Appels_Offres"
        self.chantiers_root = "Chantiers"
    
    def custom_slugify(self, text: str) -> str:
        """
        Méthode utilitaire pour slugifier le texte (compatibilité avec l'ancien code)
        """
        return custom_slugify(text)
    
    # ⚠️ MÉTHODE DÉSACTIVÉE - Utiliser le système drive_path à la place
    # Le dossier société est maintenant géré via drive_path (societe_slug/chantier_slug)
    # def create_societe_folder_if_not_exists(self, societe_name: str, root_path: str) -> str:
    #     """
    #     Crée le dossier société s'il n'existe pas déjà
    #     """
    #     societe_path = f"{root_path}/{custom_slugify(societe_name)}"
    #     
    #     # Vérifier si le dossier existe déjà
    #     try:
    #         content = list_s3_folder_content(societe_path)
    #         if content['folders'] or content['files']:
    #             # Le dossier existe déjà
    #             return societe_path
    #     except:
    #         pass
    #     
    #     # Créer le dossier société
    #     success = create_s3_folder_recursive(societe_path)
    #     if not success:
    #         raise Exception(f"Impossible de créer le dossier société: {societe_path}")
    #     
    #     return societe_path
    
    # ⚠️ MÉTHODE DÉSACTIVÉE - Utiliser create_subfolders_for_appel_offres() à la place
    # Cette méthode utilise maintenant drive_path pour déterminer le chemin
    # def create_appel_offres_structure(self, societe_name: str, appel_offres_name: str, appel_offres_id: Optional[int] = None) -> str:
    #     """
    #     Crée la structure complète pour un appel d'offres
    #     
    #     Args:
    #         societe_name: Nom de la société
    #         appel_offres_name: Nom de l'appel d'offres
    #         appel_offres_id: ID de l'appel d'offres (optionnel, non utilisé dans le chemin)
    #         
    #     Returns:
    #         str: Chemin complet créé
    #     """
    #     try:
    #         # Créer le dossier société s'il n'existe pas
    #         societe_path = self.create_societe_folder_if_not_exists(societe_name, self.appels_offres_root)
    #         
    #         # Créer le dossier de l'appel d'offres avec format: Nom_Appel_Offre (sans ID pour cohérence)
    #         appel_offres_folder = custom_slugify(appel_offres_name)
    #         appel_offres_path = f"{societe_path}/{appel_offres_folder}"
    #         
    #         # Créer le dossier principal de l'appel d'offres
    #         success = create_s3_folder_recursive(appel_offres_path)
    #         if not success:
    #             raise Exception(f"Impossible de créer le dossier appel d'offres: {appel_offres_path}")
    #         
    #         # Créer tous les sous-dossiers spécifiques aux appels d'offres
    #         for subfolder in self.APPEL_OFFRES_SUBFOLDERS:
    #             subfolder_path = f"{appel_offres_path}/{subfolder}"
    #             create_s3_folder_recursive(subfolder_path)
    #         
    #         # Créer le sous-dossier Devis_Marche dans le dossier Devis
    #         devis_marche_path = f"{appel_offres_path}/Devis/Devis_Marche"
    #         create_s3_folder_recursive(devis_marche_path)
    #         
    #         return appel_offres_path
    #         
    #     except Exception as e:
    #         raise
    pass
    
    # ⚠️ MÉTHODE DÉSACTIVÉE - Utiliser create_subfolders_for_chantier() à la place
    # Cette méthode utilise maintenant drive_path pour déterminer le chemin
    def create_chantier_structure(self, societe_name: str, chantier_name: str, root_path: str = None) -> str:
        # """
        # Crée la structure complète pour un chantier
        # """
        # try:
        #     # Utiliser le root_path fourni ou le défaut
        #     if root_path is None:
        #         root_path = self.chantiers_root
        #     
        #     # Créer le dossier société s'il n'existe pas
        #     societe_path = self.create_societe_folder_if_not_exists(societe_name, root_path)
        #     
        #     # Créer le dossier chantier
        #     chantier_path = f"{societe_path}/{custom_slugify(chantier_name)}"
        #     success = create_s3_folder_recursive(chantier_path)
        #     if not success:
        #         raise Exception(f"Impossible de créer le dossier chantier: {chantier_path}")
        #     
        #     # Créer tous les sous-dossiers spécifiques aux chantiers
        #     for subfolder in self.CHANTIER_SUBFOLDERS:
        #         subfolder_path = f"{chantier_path}/{subfolder}"
        #         create_s3_folder_recursive(subfolder_path)
        #     
        #     return chantier_path
        #     
        # except Exception as e:
        #     raise
        pass
    
    def create_subfolders_for_appel_offres(self, appel_offres) -> bool:
        """
        Crée les sous-dossiers pour un appel d'offres en utilisant drive_path.
        
        Args:
            appel_offres: Instance AppelOffres
            
        Returns:
            bool: True si les sous-dossiers ont été créés avec succès
        """
        try:
            # Obtenir le chemin via get_drive_path() (peut contenir le préfixe Appels_Offres/ ou non)
            base_path = appel_offres.get_drive_path()
            if not base_path:
                # Pas de chemin disponible, on ne crée pas les sous-dossiers
                return False
            
            # Déterminer le chemin complet
            # Si le chemin commence déjà par "Appels_Offres/", l'utiliser tel quel
            # Sinon, ajouter le préfixe
            if base_path.startswith('Appels_Offres/'):
                full_path = base_path
            else:
                full_path = f"{self.appels_offres_root}/{base_path}"
            
            # Créer le dossier principal s'il n'existe pas
            create_s3_folder_recursive(full_path)
            
            # Créer tous les sous-dossiers spécifiques aux appels d'offres
            for subfolder in self.APPEL_OFFRES_SUBFOLDERS:
                subfolder_path = f"{full_path}/{subfolder}"
                create_s3_folder_recursive(subfolder_path)
            
            # Créer le sous-dossier DEVIS_MARCHE dans le dossier DEVIS
            devis_marche_path = f"{full_path}/DEVIS/DEVIS_MARCHE"
            create_s3_folder_recursive(devis_marche_path)
            
            return True
            
        except Exception as e:
            print(f"❌ Erreur lors de la création des sous-dossiers pour l'appel d'offres {appel_offres.id}: {str(e)}")
            return False
    
    def create_subfolders_for_chantier(self, chantier) -> bool:
        """
        Crée les sous-dossiers pour un chantier en utilisant drive_path.
        
        Args:
            chantier: Instance Chantier
            
        Returns:
            bool: True si les sous-dossiers ont été créés avec succès
        """
        try:
            # Obtenir le chemin de base via get_drive_path() (utilise drive_path ou calcul automatique)
            base_path = chantier.get_drive_path()
            if not base_path:
                # Pas de chemin disponible, on ne crée pas les sous-dossiers
                return False
            
            # Construire le chemin complet avec le préfixe Chantiers/
            full_path = f"{self.chantiers_root}/{base_path}"
            
            # Créer le dossier principal s'il n'existe pas
            create_s3_folder_recursive(full_path)
            
            # Créer tous les sous-dossiers spécifiques aux chantiers
            for subfolder in self.CHANTIER_SUBFOLDERS:
                subfolder_path = f"{full_path}/{subfolder}"
                create_s3_folder_recursive(subfolder_path)
            
            return True
            
        except Exception as e:
            print(f"❌ Erreur lors de la création des sous-dossiers pour le chantier {chantier.id}: {str(e)}")
            return False
    
    # ⚠️ MÉTHODE DÉSACTIVÉE - Utiliser le système drive_path à la place
    # def create_project_structure(self, societe_name: str, project_name: str, root_path: str) -> str:
    #     """
    #     Crée la structure complète d'un projet (appel d'offres ou chantier)
    #     """
    #     # Créer le dossier société s'il n'existe pas
    #     societe_path = self.create_societe_folder_if_not_exists(societe_name, root_path)
    #     
    #     # Créer le dossier projet
    #     project_path = f"{societe_path}/{custom_slugify(project_name)}"
    #     success = create_s3_folder_recursive(project_path)
    #     if not success:
    #         raise Exception(f"Impossible de créer le dossier projet: {project_path}")
    #     
    #     # Créer tous les sous-dossiers
    #     for subfolder in self.CHANTIER_SUBFOLDERS:
    #         subfolder_path = f"{project_path}/{subfolder}"
    #         success = create_s3_folder_recursive(subfolder_path)
    #         if not success:
    #             raise Exception(f"Impossible de créer le sous-dossier: {subfolder_path}")
    #     
    #     return project_path
    pass
    
    def transfer_appel_offres_to_chantier(self, societe_name: str, appel_offres_name: str, chantier_name: str, appel_offres_id: Optional[int] = None) -> bool:
        # """
        # Transfère un appel d'offres vers un chantier (DÉPLACE les fichiers et supprime l'original)
        # 
        # Args:
        #     societe_name: Nom de la société
        #     appel_offres_name: Nom de l'appel d'offres
        #     chantier_name: Nom du chantier
        #     appel_offres_id: ID de l'appel d'offres (optionnel, non utilisé dans le chemin)
        #     
        # Returns:
        #     bool: True si le transfert a réussi
        # """
        # try:
        #     # Chemins source et destination (sans ID pour cohérence)
        #     source_path = f"{self.appels_offres_root}/{custom_slugify(societe_name)}/{custom_slugify(appel_offres_name)}"
        #     dest_societe_path = f"{self.chantiers_root}/{custom_slugify(societe_name)}"
        #     dest_chantier_path = f"{dest_societe_path}/{custom_slugify(chantier_name)}"
        #     
        #     # Créer la structure de destination du chantier
        #     self.create_chantier_structure(societe_name, chantier_name)
        #     
        #     # Lister tout le contenu du projet source
        #     content = list_s3_folder_content(source_path)
        #     
        #     # Transférer tous les fichiers
        #     for file in content['files']:
        #         source_file_path = f"{source_path}/{file['name']}"
        #         dest_file_path = f"{dest_chantier_path}/{file['name']}"
        #         move_s3_file(source_file_path, dest_file_path)
        #     
        #     # Transférer tous les dossiers (y compris les dossiers custom)
        #     for folder in content['folders']:
        #         source_folder_path = f"{source_path}/{folder['name']}"
        #         dest_folder_path = f"{dest_chantier_path}/{folder['name']}"
        #         
        #         # Créer le dossier de destination
        #         create_s3_folder_recursive(dest_folder_path)
        #         
        #         # Transférer le contenu du dossier
        #         folder_content = list_s3_folder_content(source_folder_path)
        #         
        #         for subfile in folder_content['files']:
        #             source_subfile_path = f"{source_folder_path}/{subfile['name']}"
        #             dest_subfile_path = f"{dest_folder_path}/{subfile['name']}"
        #             move_s3_file(source_subfile_path, dest_subfile_path)
        #         
        #         # Transférer les sous-dossiers récursivement
        #         for subfolder in folder_content['folders']:
        #             self._transfer_folder_recursive(
        #                 f"{source_folder_path}/{subfolder['name']}",
        #                 f"{dest_folder_path}/{subfolder['name']}"
        #             )
        #     
        #     # Supprimer le dossier source (appel d'offres)
        #     self._delete_folder_recursive(source_path)
        #     
        #     return True
        #     
        # except Exception:
        #     return False
        pass
    
    def save_document_to_folder(self, document_path: str, target_folder: str, filename: str) -> bool:
        """
        Sauvegarde un document dans un dossier spécifique
        """
        try:
            # Construire le chemin de destination
            destination_path = f"{target_folder}/{custom_slugify(filename)}"
            
            # Déplacer le fichier
            success = move_s3_file(document_path, destination_path)
            return success
        except Exception:
            return False
    
    # ⚠️ MÉTHODE DÉSACTIVÉE - Utiliser copy_appel_offres_to_chantier_by_path() à la place
    # Cette méthode utilise maintenant les chemins drive_path directement
    # def transfer_project_to_chantier(self, societe_name: str, project_name: str) -> bool:
    #     """
    #     Transfère un projet d'appel d'offres vers chantier (DÉPLACE les fichiers)
    #     """
    #     try:
    #         # Chemins source et destination
    #         source_path = f"{self.appels_offres_root}/{custom_slugify(societe_name)}/{custom_slugify(project_name)}"
    #         dest_societe_path = f"{self.chantiers_root}/{custom_slugify(societe_name)}"
    #         dest_project_path = f"{dest_societe_path}/{custom_slugify(project_name)}"
    #         
    #         # Créer la structure de destination
    #         self.create_chantier_structure(societe_name, project_name)
    #         
    #         # Lister tout le contenu du projet source
    #         content = list_s3_folder_content(source_path)
    #         
    #         # Transférer tous les fichiers
    #         for file in content['files']:
    #             source_file_path = f"{source_path}/{file['name']}"
    #             dest_file_path = f"{dest_project_path}/{file['name']}"
    #             move_s3_file(source_file_path, dest_file_path)
    #         
    #         # Transférer tous les dossiers (y compris les dossiers custom)
    #         for folder in content['folders']:
    #             source_folder_path = f"{source_path}/{folder['name']}"
    #             dest_folder_path = f"{dest_project_path}/{folder['name']}"
    #             
    #             # Créer le dossier de destination
    #             create_s3_folder_recursive(dest_folder_path)
    #             
    #             # Transférer le contenu du dossier
    #             folder_content = list_s3_folder_content(source_folder_path)
    #             
    #             for subfile in folder_content['files']:
    #                 source_subfile_path = f"{source_folder_path}/{subfile['name']}"
    #                 dest_subfile_path = f"{dest_folder_path}/{subfile['name']}"
    #                 move_s3_file(source_subfile_path, dest_subfile_path)
    #             
    #             # Transférer les sous-dossiers récursivement
    #             for subfolder in folder_content['folders']:
    #                 self._transfer_folder_recursive(
    #                     f"{source_folder_path}/{subfolder['name']}",
    #                     f"{dest_folder_path}/{subfolder['name']}"
    #                 )
    #         
    #         # Supprimer le dossier source
    #         self._delete_folder_recursive(source_path)
    #         
    #         return True
    #         
    #     except Exception:
    #         return False
    pass
    
    def copy_appel_offres_to_chantier(self, societe_name: str, appel_offres_name: str, chantier_name: str) -> bool:
        """
        Copie un appel d'offres vers un chantier (COPIE les fichiers sans supprimer l'original)
        Chemin source: Appels_Offres/Societe/nom_appel_offres
        Chemin destination: Chantier/Societe/nom_chantier
        
        ⚠️ DEPRECATED : Utiliser copy_appel_offres_to_chantier_by_path() à la place
        """
        try:
            # Chemins source et destination
            source_path = f"{self.appels_offres_root}/{custom_slugify(societe_name)}/{custom_slugify(appel_offres_name)}"
            dest_societe_path = f"Chantiers/{custom_slugify(societe_name)}"
            dest_chantier_path = f"{dest_societe_path}/{custom_slugify(chantier_name)}"
            
            # S'assurer que les chemins se terminent par /
            if not source_path.endswith('/'):
                source_path += '/'
            if not dest_chantier_path.endswith('/'):
                dest_chantier_path += '/'
            
            # Lister tout le contenu du projet source AVANT de créer la structure
            content = list_s3_folder_content(source_path)
            
            # Créer seulement le dossier racine du chantier
            create_s3_folder_recursive(dest_chantier_path)
            
            # Créer seulement les dossiers spécifiques au chantier (SITUATION, SOUS_TRAITANT, FACTURE)
            # Ne pas créer DEVIS et DCE car ils seront copiés depuis l'appel d'offres
            existing_folders = [f['name'] for f in content['folders']]
            chantier_specific_folders = ["SITUATION", "SOUS_TRAITANT", "FACTURE"]
            
            for folder_name in chantier_specific_folders:
                if folder_name not in existing_folders:
                    folder_path = f"{dest_chantier_path.rstrip('/')}/{folder_name}"
                    create_s3_folder_recursive(folder_path)
            
            # Copier tous les fichiers
            for file in content['files']:
                source_file_path = f"{source_path.rstrip('/')}/{file['name']}"
                dest_file_path = f"{dest_chantier_path.rstrip('/')}/{file['name']}"
                self._copy_s3_file(source_file_path, dest_file_path)
            
            # Copier tous les dossiers (DEVIS et DCE) directement dans le chantier
            for folder in content['folders']:
                source_folder_path = f"{source_path.rstrip('/')}/{folder['name']}"
                dest_folder_path = f"{dest_chantier_path.rstrip('/')}/{folder['name']}"
                
                # Copier le contenu du dossier récursivement
                self._copy_folder_recursive(source_folder_path, dest_folder_path)
            
            return True
            
        except Exception:
            return False
    
    def copy_appel_offres_to_chantier_by_path(self, source_path: str, dest_path: str) -> bool:
        """
        Copie un appel d'offres vers un chantier en utilisant les chemins complets.
        
        Args:
            source_path: Chemin source complet (ex: "Appels_Offres/Zonia/Testcontact")
            dest_path: Chemin destination complet (ex: "Chantiers/Zonia/Testcontact")
            
        Returns:
            bool: True si le transfert a réussi
        """
        try:
            # S'assurer que les chemins se terminent par /
            if not source_path.endswith('/'):
                source_path += '/'
            if not dest_path.endswith('/'):
                dest_path += '/'
            
            # Lister tout le contenu du projet source AVANT de créer la structure
            content = list_s3_folder_content(source_path)
            
            # Créer le dossier racine du chantier
            create_s3_folder_recursive(dest_path)
            
            # Créer seulement les dossiers spécifiques au chantier (SITUATION, SOUS_TRAITANT, FACTURE)
            # Ne pas créer DEVIS et DCE car ils seront copiés depuis l'appel d'offres
            existing_folders = [f['name'] for f in content['folders']]
            chantier_specific_folders = ["SITUATION", "SOUS_TRAITANT", "FACTURE"]
            
            for folder_name in chantier_specific_folders:
                if folder_name not in existing_folders:
                    folder_path = f"{dest_path.rstrip('/')}/{folder_name}"
                    create_s3_folder_recursive(folder_path)
            
            # Copier tous les fichiers
            for file in content['files']:
                source_file_path = f"{source_path.rstrip('/')}/{file['name']}"
                dest_file_path = f"{dest_path.rstrip('/')}/{file['name']}"
                self._copy_s3_file(source_file_path, dest_file_path)
            
            # Copier tous les dossiers (DEVIS et DCE) directement dans le chantier
            for folder in content['folders']:
                source_folder_path = f"{source_path.rstrip('/')}/{folder['name']}"
                dest_folder_path = f"{dest_path.rstrip('/')}/{folder['name']}"
                
                # Copier le contenu du dossier récursivement
                self._copy_folder_recursive(source_folder_path, dest_folder_path)
            
            return True
            
        except Exception as e:
            import traceback
            print(f"Erreur lors de la copie des fichiers : {str(e)}")
            print(traceback.format_exc())
            return False
    
    def _transfer_folder_recursive(self, source_folder: str, dest_folder: str):
        """
        Transfère récursivement un dossier et son contenu
        """
        # S'assurer que les chemins se terminent par /
        if not source_folder.endswith('/'):
            source_folder += '/'
        if not dest_folder.endswith('/'):
            dest_folder += '/'
        
        # Créer le dossier de destination
        create_s3_folder_recursive(dest_folder)
        
        # Lister le contenu
        try:
            content = list_s3_folder_content(source_folder)
        except Exception as e:
            return
        
        # Transférer les fichiers
        for file in content['files']:
            # Utiliser file['path'] qui contient le chemin complet, ou construire le chemin
            source_file_path = file.get('path') or f"{source_folder.rstrip('/')}/{file['name']}"
            # Construire le chemin de destination en remplaçant le préfixe source par le préfixe destination
            source_folder_clean = source_folder.rstrip('/')
            if source_file_path.startswith(source_folder_clean):
                relative_path = source_file_path[len(source_folder_clean):].lstrip('/')
                dest_file_path = f"{dest_folder.rstrip('/')}/{relative_path}"
            else:
                # Fallback : utiliser le nom du fichier uniquement
                dest_file_path = f"{dest_folder.rstrip('/')}/{file['name']}"
            
            move_s3_file(source_file_path, dest_file_path)
        
        # Transférer les sous-dossiers récursivement
        for subfolder in content['folders']:
            # Utiliser subfolder['path'] qui contient le chemin complet, ou construire le chemin
            source_subfolder = subfolder.get('path') or f"{source_folder.rstrip('/')}/{subfolder['name']}"
            # Construire le chemin de destination en remplaçant le préfixe source par le préfixe destination
            # Utiliser startswith pour éviter les remplacements incorrects
            source_folder_clean = source_folder.rstrip('/')
            if source_subfolder.startswith(source_folder_clean):
                relative_path = source_subfolder[len(source_folder_clean):].lstrip('/')
                dest_subfolder = f"{dest_folder.rstrip('/')}/{relative_path}"
            else:
                # Fallback : utiliser le nom du dossier uniquement
                dest_subfolder = f"{dest_folder.rstrip('/')}/{subfolder['name']}"
            self._transfer_folder_recursive(source_subfolder, dest_subfolder)
    
    def _delete_folder_recursive(self, folder_path: str):
        """
        Supprime récursivement un dossier et son contenu
        """
        try:
            content = list_s3_folder_content(folder_path)
            
            # Supprimer les fichiers
            for file in content['files']:
                file_path = f"{folder_path}/{file['name']}"
                delete_s3_file(file_path)
            
            # Supprimer les sous-dossiers récursivement
            for subfolder in content['folders']:
                subfolder_path = f"{folder_path}/{subfolder['name']}"
                self._delete_folder_recursive(subfolder_path)
            
            # Supprimer le dossier lui-même (fichier .keep)
            keep_file_path = f"{folder_path}/.keep"
            try:
                delete_s3_file(keep_file_path)
            except:
                pass
                
        except Exception:
            pass
    
    def _copy_s3_file(self, source_path: str, dest_path: str) -> bool:
        """
        Copie un fichier dans S3 (sans supprimer l'original)
        """
        try:
            from .utils import get_s3_client, get_s3_bucket_name
            
            s3_client = get_s3_client()
            bucket_name = get_s3_bucket_name()
            
            # Copier le fichier
            copy_source = {'Bucket': bucket_name, 'Key': source_path}
            s3_client.copy_object(
                CopySource=copy_source,
                Bucket=bucket_name,
                Key=dest_path
            )
            
            return True
            
        except Exception:
            return False
    
    def _copy_folder_recursive(self, source_folder: str, dest_folder: str):
        """
        Copie récursivement un dossier et son contenu
        """
        try:
            # S'assurer que les chemins se terminent par /
            if not source_folder.endswith('/'):
                source_folder += '/'
            if not dest_folder.endswith('/'):
                dest_folder += '/'
            
            # Créer le dossier de destination
            create_s3_folder_recursive(dest_folder)
            
            # Lister le contenu
            content = list_s3_folder_content(source_folder)
            
            # Copier les fichiers
            for file in content['files']:
                source_file_path = f"{source_folder.rstrip('/')}/{file['name']}"
                dest_file_path = f"{dest_folder.rstrip('/')}/{file['name']}"
                self._copy_s3_file(source_file_path, dest_file_path)
            
            # Copier les sous-dossiers récursivement
            for subfolder in content['folders']:
                self._copy_folder_recursive(
                    f"{source_folder.rstrip('/')}/{subfolder['name']}",
                    f"{dest_folder.rstrip('/')}/{subfolder['name']}"
                )
                
        except Exception:
            pass
    
    def delete_appel_offres_structure(self, societe_name: str, appel_offres_name: str) -> bool:
        """
        Supprime complètement la structure de dossiers d'un appel d'offres
        
        Args:
            societe_name: Nom de la société
            appel_offres_name: Nom de l'appel d'offres
            
        Returns:
            bool: True si la suppression a réussi
        """
        try:
            # Construire le chemin de l'appel d'offres
            appel_offres_path = f"{self.appels_offres_root}/{custom_slugify(societe_name)}/{custom_slugify(appel_offres_name)}"
            
            # Vérifier si le dossier existe
            content = list_s3_folder_content(appel_offres_path)
            if not content['files'] and not content['folders']:
                return True
            
            # Supprimer récursivement tout le contenu
            self._delete_folder_recursive(appel_offres_path)
            
            return True
            
        except Exception:
            return False
    
    def list_all_s3_objects_recursive(self, prefix: str) -> List[Dict]:
        """
        Liste récursivement tous les objets (fichiers) dans un préfixe donné.
        Utilise le paginator AWS pour gérer la pagination automatiquement.
        
        Args:
            prefix: Préfixe du chemin (doit se terminer par /)
            
        Returns:
            List[Dict]: Liste de dictionnaires contenant 'Key' (chemin complet) et autres métadonnées
        """
        from .utils import get_s3_client, get_s3_bucket_name, is_s3_available
        
        if not is_s3_available():
            # Pour le stockage local, utiliser list_local_folder_content
            from .utils import list_local_folder_content
            content = list_local_folder_content(prefix)
            all_files = []
            for file in content['files']:
                all_files.append({'Key': file['path']})
            for folder in content['folders']:
                # Récursif pour les dossiers locaux
                sub_files = self.list_all_s3_objects_recursive(folder['path'])
                all_files.extend(sub_files)
            return all_files
        
        s3_client = get_s3_client()
        bucket_name = get_s3_bucket_name()
        
        all_objects = []
        
        try:
            # Utiliser le paginator pour gérer automatiquement la pagination
            # SANS Delimiter pour obtenir TOUS les objets récursivement
            paginator = s3_client.get_paginator('list_objects_v2')
            page_iterator = paginator.paginate(
                Bucket=bucket_name,
                Prefix=prefix
                # Pas de Delimiter = liste récursive complète
            )
            
            for page in page_iterator:
                if 'Contents' in page:
                    for obj in page['Contents']:
                        # Ignorer les objets .keep (marqueurs de dossiers)
                        if obj['Key'].endswith('/.keep'):
                            continue
                        # Ignorer les objets qui se terminent par / (ce sont des dossiers vides)
                        if obj['Key'].endswith('/'):
                            continue
                        all_objects.append(obj)
            
            return all_objects
            
        except Exception as e:
            import traceback
            print(f"❌ Erreur lors de la liste récursive: {str(e)}")
            print(traceback.format_exc())
            return []
    
    def transfer_chantier_drive_path(self, ancien_chemin: str, nouveau_chemin: str) -> bool:
        """
        Transfère tous les fichiers d'un chantier d'un chemin vers un autre.
        Utilise une liste récursive complète pour s'assurer de transférer TOUS les fichiers.
        
        Args:
            ancien_chemin: Ancien chemin (relatif, sans préfixe Chantiers/)
            nouveau_chemin: Nouveau chemin (relatif, sans préfixe Chantiers/)
            
        Returns:
            bool: True si le transfert a réussi
        """
        try:
            # Construire les chemins complets
            source_path = f"{self.chantiers_root}/{ancien_chemin}"
            dest_path = f"{self.chantiers_root}/{nouveau_chemin}"
            
            # S'assurer que les chemins se terminent par /
            if not source_path.endswith('/'):
                source_path += '/'
            if not dest_path.endswith('/'):
                dest_path += '/'
            
            # Lister récursivement TOUS les objets (fichiers) dans le dossier source
            all_objects = self.list_all_s3_objects_recursive(source_path)
            
            if not all_objects:
                return True  # Pas d'erreur si le dossier est vide
            
            # Créer la structure de destination si nécessaire
            create_s3_folder_recursive(dest_path)
            
            # Transférer tous les fichiers
            for obj in all_objects:
                source_key = obj['Key']
                
                # Vérifier que le fichier commence bien par le préfixe source
                if not source_key.startswith(source_path):
                    continue
                
                # Calculer le chemin de destination en remplaçant le préfixe source par le préfixe destination
                relative_path = source_key[len(source_path):]
                dest_key = dest_path + relative_path
                
                # Créer les dossiers parents si nécessaire
                dest_dir = '/'.join(dest_key.split('/')[:-1])
                if dest_dir:
                    create_s3_folder_recursive(dest_dir + '/')
                
                success = move_s3_file(source_key, dest_key)
                if not success:
                    return False
            
            return True
            
        except Exception as e:
            import traceback
            print(f"❌ Erreur lors du transfert du chantier : {str(e)}")
            print(traceback.format_exc())
            return False
    
    def transfer_appel_offres_drive_path(self, ancien_chemin: str, nouveau_chemin: str) -> bool:
        """
        Transfère tous les fichiers d'un appel d'offres d'un chemin vers un autre.
        Utilise une liste récursive complète pour s'assurer de transférer TOUS les fichiers.
        
        Args:
            ancien_chemin: Ancien chemin (relatif, sans préfixe Appels_Offres/)
            nouveau_chemin: Nouveau chemin (relatif, sans préfixe Appels_Offres/)
            
        Returns:
            bool: True si le transfert a réussi
        """
        try:
            # Construire les chemins complets
            source_path = f"{self.appels_offres_root}/{ancien_chemin}"
            dest_path = f"{self.appels_offres_root}/{nouveau_chemin}"
            
            # S'assurer que les chemins se terminent par /
            if not source_path.endswith('/'):
                source_path += '/'
            if not dest_path.endswith('/'):
                dest_path += '/'
            
            # Lister récursivement TOUS les objets (fichiers) dans le dossier source
            all_objects = self.list_all_s3_objects_recursive(source_path)
            
            if not all_objects:
                return True  # Pas d'erreur si le dossier est vide
            
            # Créer la structure de destination si nécessaire
            create_s3_folder_recursive(dest_path)
            
            # Transférer tous les fichiers
            for obj in all_objects:
                source_key = obj['Key']
                
                # Vérifier que le fichier commence bien par le préfixe source
                if not source_key.startswith(source_path):
                    continue
                
                # Calculer le chemin de destination en remplaçant le préfixe source par le préfixe destination
                relative_path = source_key[len(source_path):]
                dest_key = dest_path + relative_path
                
                # Créer les dossiers parents si nécessaire
                dest_dir = '/'.join(dest_key.split('/')[:-1])
                if dest_dir:
                    create_s3_folder_recursive(dest_dir + '/')
                
                success = move_s3_file(source_key, dest_key)
                if not success:
                    return False
            
            return True
            
        except Exception as e:
            import traceback
            print(f"❌ Erreur lors du transfert de l'appel d'offres : {str(e)}")
            print(traceback.format_exc())
            return False


# Instance globale
drive_automation = DriveAutomation()
