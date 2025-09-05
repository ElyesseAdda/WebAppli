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
        "Devis",
        "DCE"           # Dossier des Cahiers des Charges
    ]
    
    # Structure des dossiers pour les chantiers
    CHANTIER_SUBFOLDERS = [
        "Devis",
        "Situation",
        "Sous Traitant",
        "Facture"
    ]
    
    def __init__(self):
        self.appels_offres_root = "Appels_Offres"
        self.chantiers_root = "Chantiers/Société"
    
    def custom_slugify(self, text: str) -> str:
        """
        Méthode utilitaire pour slugifier le texte (compatibilité avec l'ancien code)
        """
        return custom_slugify(text)
    
    def create_societe_folder_if_not_exists(self, societe_name: str, root_path: str) -> str:
        """
        Crée le dossier société s'il n'existe pas déjà
        """
        societe_path = f"{root_path}/{custom_slugify(societe_name)}"
        
        # Vérifier si le dossier existe déjà
        try:
            content = list_s3_folder_content(societe_path)
            if content['folders'] or content['files']:
                # Le dossier existe déjà
                return societe_path
        except:
            pass
        
        # Créer le dossier société
        success = create_s3_folder_recursive(societe_path)
        if not success:
            raise Exception(f"Impossible de créer le dossier société: {societe_path}")
        
        return societe_path
    
    def create_appel_offres_structure(self, appel_offres_id: int, societe_name: str, appel_offres_name: str) -> str:
        """
        Crée la structure complète pour un appel d'offres
        
        Args:
            appel_offres_id: ID de l'appel d'offres
            societe_name: Nom de la société
            appel_offres_name: Nom de l'appel d'offres
            
        Returns:
            str: Chemin complet créé
        """
        try:
            # Créer le dossier société s'il n'existe pas
            societe_path = self.create_societe_folder_if_not_exists(societe_name, self.appels_offres_root)
            
            # Créer le dossier de l'appel d'offres avec format: 001_Nom_Appel_Offre
            appel_offres_folder = f"{appel_offres_id:03d}_{custom_slugify(appel_offres_name)}"
            appel_offres_path = f"{societe_path}/{appel_offres_folder}"
            
            # Créer le dossier principal de l'appel d'offres
            success = create_s3_folder_recursive(appel_offres_path)
            if not success:
                raise Exception(f"Impossible de créer le dossier appel d'offres: {appel_offres_path}")
            
            # Créer tous les sous-dossiers spécifiques aux appels d'offres
            for subfolder in self.APPEL_OFFRES_SUBFOLDERS:
                subfolder_path = f"{appel_offres_path}/{subfolder}"
                success = create_s3_folder_recursive(subfolder_path)
                if not success:
                    print(f"⚠️  Impossible de créer le sous-dossier: {subfolder_path}")
                    # Continuer avec les autres dossiers
                else:
                    print(f"✅ Dossier créé: {subfolder_path}")
            
            # Créer le sous-dossier Devis_Marche dans le dossier Devis
            devis_marche_path = f"{appel_offres_path}/Devis/Devis_Marche"
            success = create_s3_folder_recursive(devis_marche_path)
            if not success:
                print(f"⚠️  Impossible de créer le sous-dossier Devis_Marche: {devis_marche_path}")
            else:
                print(f"✅ Dossier Devis_Marche créé: {devis_marche_path}")
            
            print(f"🎯 Structure d'appel d'offres créée: {appel_offres_path}")
            return appel_offres_path
            
        except Exception as e:
            print(f"❌ Erreur lors de la création de la structure d'appel d'offres: {str(e)}")
            raise
    
    def create_chantier_structure(self, societe_name: str, chantier_name: str, root_path: str = None) -> str:
        """
        Crée la structure complète pour un chantier
        """
        try:
            # Utiliser le root_path fourni ou le défaut
            if root_path is None:
                root_path = self.chantiers_root
            
            # Créer le dossier société s'il n'existe pas
            societe_path = self.create_societe_folder_if_not_exists(societe_name, root_path)
            
            # Créer le dossier chantier
            chantier_path = f"{societe_path}/{custom_slugify(chantier_name)}"
            success = create_s3_folder_recursive(chantier_path)
            if not success:
                raise Exception(f"Impossible de créer le dossier chantier: {chantier_path}")
            
            # Créer tous les sous-dossiers spécifiques aux chantiers
            for subfolder in self.CHANTIER_SUBFOLDERS:
                subfolder_path = f"{chantier_path}/{subfolder}"
                success = create_s3_folder_recursive(subfolder_path)
                if not success:
                    print(f"⚠️  Impossible de créer le sous-dossier: {subfolder_path}")
                    # Continuer avec les autres dossiers
                else:
                    print(f"✅ Dossier créé: {subfolder_path}")
            
            print(f"🏗️  Structure de chantier créée: {chantier_path}")
            return chantier_path
            
        except Exception as e:
            print(f"❌ Erreur lors de la création de la structure de chantier: {str(e)}")
            raise
    
    def create_project_structure(self, societe_name: str, project_name: str, root_path: str) -> str:
        """
        Crée la structure complète d'un projet (appel d'offres ou chantier)
        """
        # Créer le dossier société s'il n'existe pas
        societe_path = self.create_societe_folder_if_not_exists(societe_name, root_path)
        
        # Créer le dossier projet
        project_path = f"{societe_path}/{custom_slugify(project_name)}"
        success = create_s3_folder_recursive(project_path)
        if not success:
            raise Exception(f"Impossible de créer le dossier projet: {project_path}")
        
        # Créer tous les sous-dossiers
        for subfolder in self.CHANTIER_SUBFOLDERS:
            subfolder_path = f"{project_path}/{subfolder}"
            success = create_s3_folder_recursive(subfolder_path)
            if not success:
                raise Exception(f"Impossible de créer le sous-dossier: {subfolder_path}")
        
        return project_path
    
    def transfer_appel_offres_to_chantier(self, appel_offres_id: int, societe_name: str, appel_offres_name: str, chantier_name: str) -> bool:
        """
        Transfère un appel d'offres vers un chantier
        
        Args:
            appel_offres_id: ID de l'appel d'offres
            societe_name: Nom de la société
            appel_offres_name: Nom de l'appel d'offres
            chantier_name: Nom du chantier
            
        Returns:
            bool: True si le transfert a réussi
        """
        try:
            print(f"🔄 Début du transfert: Appel d'offres {appel_offres_id} → Chantier {chantier_name}")
            
            # Chemins source et destination
            source_path = f"{self.appels_offres_root}/{custom_slugify(societe_name)}/{appel_offres_id:03d}_{custom_slugify(appel_offres_name)}"
            dest_societe_path = f"{self.chantiers_root}/{custom_slugify(societe_name)}"
            dest_chantier_path = f"{dest_societe_path}/{custom_slugify(chantier_name)}"
            
            # Créer la structure de destination du chantier
            self.create_chantier_structure(societe_name, chantier_name)
            
            # Lister tout le contenu du projet source
            content = list_s3_folder_content(source_path)
            
            print(f"📁 Contenu à transférer: {len(content['files'])} fichiers, {len(content['folders'])} dossiers")
            
            # Transférer tous les fichiers
            for file in content['files']:
                source_file_path = f"{source_path}/{file['name']}"
                dest_file_path = f"{dest_chantier_path}/{file['name']}"
                move_s3_file(source_file_path, dest_file_path)
                print(f"📄 Fichier transféré: {file['name']}")
            
            # Transférer tous les dossiers (y compris les dossiers custom)
            for folder in content['folders']:
                source_folder_path = f"{source_path}/{folder['name']}"
                dest_folder_path = f"{dest_chantier_path}/{folder['name']}"
                
                # Créer le dossier de destination
                create_s3_folder_recursive(dest_folder_path)
                
                # Transférer le contenu du dossier
                folder_content = list_s3_folder_content(source_folder_path)
                
                for subfile in folder_content['files']:
                    source_subfile_path = f"{source_folder_path}/{subfile['name']}"
                    dest_subfile_path = f"{dest_folder_path}/{subfile['name']}"
                    move_s3_file(source_subfile_path, dest_subfile_path)
                    print(f"📄 Sous-fichier transféré: {folder['name']}/{subfile['name']}")
                
                # Transférer les sous-dossiers récursivement
                for subfolder in folder_content['folders']:
                    self._transfer_folder_recursive(
                        f"{source_folder_path}/{subfolder['name']}",
                        f"{dest_folder_path}/{subfolder['name']}"
                    )
                    print(f"📁 Sous-dossier transféré: {folder['name']}/{subfolder['name']}")
            
            # Supprimer le dossier source (appel d'offres)
            self._delete_folder_recursive(source_path)
            print(f"🗑️  Dossier source supprimé: {source_path}")
            
            print(f"✅ Transfert réussi: {source_path} → {dest_chantier_path}")
            return True
            
        except Exception as e:
            print(f"❌ Erreur lors du transfert: {str(e)}")
            return False
    
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
        except Exception as e:
            print(f"Erreur lors de la sauvegarde du document: {str(e)}")
            return False
    
    def transfer_project_to_chantier(self, societe_name: str, project_name: str) -> bool:
        """
        Transfère un projet d'appel d'offres vers chantier (DÉPLACE les fichiers)
        """
        try:
            # Chemins source et destination
            source_path = f"{self.appels_offres_root}/{custom_slugify(societe_name)}/{custom_slugify(project_name)}"
            dest_societe_path = f"{self.chantiers_root}/{custom_slugify(societe_name)}"
            dest_project_path = f"{dest_societe_path}/{custom_slugify(project_name)}"
            
            # Créer la structure de destination
            self.create_chantier_structure(societe_name, project_name)
            
            # Lister tout le contenu du projet source
            content = list_s3_folder_content(source_path)
            
            # Transférer tous les fichiers
            for file in content['files']:
                source_file_path = f"{source_path}/{file['name']}"
                dest_file_path = f"{dest_project_path}/{file['name']}"
                move_s3_file(source_file_path, dest_file_path)
            
            # Transférer tous les dossiers (y compris les dossiers custom)
            for folder in content['folders']:
                source_folder_path = f"{source_path}/{folder['name']}"
                dest_folder_path = f"{dest_project_path}/{folder['name']}"
                
                # Créer le dossier de destination
                create_s3_folder_recursive(dest_folder_path)
                
                # Transférer le contenu du dossier
                folder_content = list_s3_folder_content(source_folder_path)
                
                for subfile in folder_content['files']:
                    source_subfile_path = f"{source_folder_path}/{subfile['name']}"
                    dest_subfile_path = f"{dest_folder_path}/{subfile['name']}"
                    move_s3_file(source_subfile_path, dest_subfile_path)
                
                # Transférer les sous-dossiers récursivement
                for subfolder in folder_content['folders']:
                    self._transfer_folder_recursive(
                        f"{source_folder_path}/{subfolder['name']}",
                        f"{dest_folder_path}/{subfolder['name']}"
                    )
            
            # Supprimer le dossier source
            self._delete_folder_recursive(source_path)
            
            return True
            
        except Exception as e:
            print(f"Erreur lors du transfert: {str(e)}")
            return False
    
    def copy_appel_offres_to_chantier(self, societe_name: str, appel_offres_name: str, chantier_name: str) -> bool:
        """
        Copie un appel d'offres vers un chantier (COPIE les fichiers sans supprimer l'original)
        Chemin source: Appels_Offres/Societe/nom_appel_offres
        Chemin destination: Chantier/Societe/nom_chantier
        """
        try:
            print(f"🔄 Début de la copie: Appel d'offres → Chantier")
            print(f"   Source: Appels_Offres/{custom_slugify(societe_name)}/{custom_slugify(appel_offres_name)}")
            print(f"   Destination: Chantiers/Société/{custom_slugify(societe_name)}/{custom_slugify(chantier_name)}")
            
            # Chemins source et destination
            source_path = f"{self.appels_offres_root}/{custom_slugify(societe_name)}/{custom_slugify(appel_offres_name)}"
            dest_societe_path = f"Chantiers/Société/{custom_slugify(societe_name)}"
            dest_chantier_path = f"{dest_societe_path}/{custom_slugify(chantier_name)}"
            
            print(f"🔍 Chemins détaillés:")
            print(f"   Source: {source_path}")
            print(f"   Destination: {dest_chantier_path}")
            
            # S'assurer que les chemins se terminent par /
            if not source_path.endswith('/'):
                source_path += '/'
            if not dest_chantier_path.endswith('/'):
                dest_chantier_path += '/'
            
            print(f"🔍 Chemins corrigés:")
            print(f"   Source: {source_path}")
            print(f"   Destination: {dest_chantier_path}")
            
            # Lister tout le contenu du projet source AVANT de créer la structure
            content = list_s3_folder_content(source_path)
            
            print(f"📁 Contenu à copier: {len(content['files'])} fichiers, {len(content['folders'])} dossiers")
            print(f"🔍 Détail du contenu source:")
            print(f"   Fichiers: {[f['name'] for f in content['files']]}")
            print(f"   Dossiers: {[f['name'] for f in content['folders']]}")
            
            # Vérifier le contenu des dossiers Devis et DCE
            for folder in content['folders']:
                if folder['name'] in ['Devis', 'DCE']:
                    folder_content = list_s3_folder_content(f"{source_path}/{folder['name']}")
                    print(f"   📂 Contenu du dossier {folder['name']}: {len(folder_content['files'])} fichiers")
                    for file in folder_content['files']:
                        print(f"      📄 {file['name']}")
                    
                    # Vérifier aussi les sous-dossiers (comme Devis_Marche)
                    for subfolder in folder_content['folders']:
                        subfolder_content = list_s3_folder_content(f"{source_path}/{folder['name']}/{subfolder['name']}")
                        print(f"   📂 Contenu du sous-dossier {folder['name']}/{subfolder['name']}: {len(subfolder_content['files'])} fichiers")
                        for file in subfolder_content['files']:
                            print(f"      📄 {file['name']}")
            
            # Créer seulement le dossier racine du chantier
            create_s3_folder_recursive(dest_chantier_path)
            print(f"✅ Dossier racine créé: {dest_chantier_path}")
            
            # Créer seulement les dossiers spécifiques au chantier (Situation, Sous Traitant, Facture)
            # Ne pas créer Devis et DCE car ils seront copiés depuis l'appel d'offres
            existing_folders = [f['name'] for f in content['folders']]
            chantier_specific_folders = ["Situation", "Sous Traitant", "Facture"]
            
            for folder_name in chantier_specific_folders:
                if folder_name not in existing_folders:
                    folder_path = f"{dest_chantier_path.rstrip('/')}/{folder_name}"
                    create_s3_folder_recursive(folder_path)
                    print(f"✅ Dossier créé: {folder_path}")
            
            # Copier tous les fichiers
            for file in content['files']:
                source_file_path = f"{source_path.rstrip('/')}/{file['name']}"
                dest_file_path = f"{dest_chantier_path.rstrip('/')}/{file['name']}"
                self._copy_s3_file(source_file_path, dest_file_path)
                print(f"📄 Fichier copié: {file['name']}")
            
            # Copier tous les dossiers (Devis et DCE) directement dans le chantier
            for folder in content['folders']:
                source_folder_path = f"{source_path.rstrip('/')}/{folder['name']}"
                dest_folder_path = f"{dest_chantier_path.rstrip('/')}/{folder['name']}"
                
                print(f"📂 Copie du dossier: {folder['name']}")
                print(f"   Source: {source_folder_path}")
                print(f"   Destination: {dest_folder_path}")
                
                # Copier le contenu du dossier récursivement
                self._copy_folder_recursive(source_folder_path, dest_folder_path)
                print(f"📁 Dossier copié: {folder['name']}")
            
            print(f"✅ Copie réussie: {source_path} → {dest_chantier_path}")
            return True
            
        except Exception as e:
            print(f"❌ Erreur lors de la copie: {str(e)}")
            return False
    
    def _transfer_folder_recursive(self, source_folder: str, dest_folder: str):
        """
        Transfère récursivement un dossier et son contenu
        """
        # Créer le dossier de destination
        create_s3_folder_recursive(dest_folder)
        
        # Lister le contenu
        content = list_s3_folder_content(source_folder)
        
        # Transférer les fichiers
        for file in content['files']:
            source_file_path = f"{source_folder}/{file['name']}"
            dest_file_path = f"{dest_folder}/{file['name']}"
            move_s3_file(source_file_path, dest_file_path)
        
        # Transférer les sous-dossiers récursivement
        for subfolder in content['folders']:
            source_subfolder = f"{source_folder}/{subfolder['name']}"
            dest_subfolder = f"{dest_folder}/{subfolder['name']}"
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
                
        except Exception as e:
            print(f"Erreur lors de la suppression du dossier {folder_path}: {str(e)}")
    
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
            
        except Exception as e:
            print(f"Erreur lors de la copie du fichier {source_path} vers {dest_path}: {str(e)}")
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
            
            print(f"   📁 Contenu du dossier {source_folder}: {len(content['files'])} fichiers, {len(content['folders'])} dossiers")
            
            # Copier les fichiers
            for file in content['files']:
                source_file_path = f"{source_folder.rstrip('/')}/{file['name']}"
                dest_file_path = f"{dest_folder.rstrip('/')}/{file['name']}"
                self._copy_s3_file(source_file_path, dest_file_path)
                print(f"   📄 Fichier copié: {file['name']}")
            
            # Copier les sous-dossiers récursivement
            for subfolder in content['folders']:
                print(f"   📂 Copie du sous-dossier: {subfolder['name']}")
                self._copy_folder_recursive(
                    f"{source_folder.rstrip('/')}/{subfolder['name']}",
                    f"{dest_folder.rstrip('/')}/{subfolder['name']}"
                )
                
        except Exception as e:
            print(f"Erreur lors de la copie du dossier {source_folder}: {str(e)}")
    
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
            print(f"🗑️ Suppression de la structure d'appel d'offres: {appel_offres_name}")
            
            # Construire le chemin de l'appel d'offres
            appel_offres_path = f"{self.appels_offres_root}/{custom_slugify(societe_name)}/{custom_slugify(appel_offres_name)}"
            
            # Vérifier si le dossier existe
            content = list_s3_folder_content(appel_offres_path)
            if not content['files'] and not content['folders']:
                print(f"⚠️ Le dossier {appel_offres_path} n'existe pas ou est vide")
                return True
            
            # Supprimer récursivement tout le contenu
            self._delete_folder_recursive(appel_offres_path)
            
            print(f"✅ Structure d'appel d'offres supprimée: {appel_offres_path}")
            return True
            
        except Exception as e:
            print(f"❌ Erreur lors de la suppression de la structure d'appel d'offres: {str(e)}")
            return False


# Instance globale
drive_automation = DriveAutomation()
