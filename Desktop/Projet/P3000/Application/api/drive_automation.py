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
        "Devis_Marche",  # Dossier spécifique pour les devis de marché
        "DCE",           # Dossier des Cahiers des Charges
        "Plans",
        "Photos",
        "Documents_Techniques"
    ]
    
    # Structure des dossiers pour les chantiers
    CHANTIER_SUBFOLDERS = [
        "Devis",
        "Devis TS", 
        "Situation",
        "Avenant",
        "Sous Traitant",
        "Facture",
        "Planning",
        "Photos_Chantier",
        "Documents_Execution"
    ]
    
    def __init__(self):
        self.appels_offres_root = "Appels_Offres"
        self.chantiers_root = "Sociétés"  # Changé de "Chantiers" vers "Sociétés"
    
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
            
            print(f"🎯 Structure d'appel d'offres créée: {appel_offres_path}")
            return appel_offres_path
            
        except Exception as e:
            print(f"❌ Erreur lors de la création de la structure d'appel d'offres: {str(e)}")
            raise
    
    def create_chantier_structure(self, societe_name: str, chantier_name: str) -> str:
        """
        Crée la structure complète pour un chantier
        """
        try:
            # Créer le dossier société s'il n'existe pas
            societe_path = self.create_societe_folder_if_not_exists(societe_name, self.chantiers_root)
            
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
        Transfère un projet d'appel d'offres vers chantier
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


# Instance globale
drive_automation = DriveAutomation()
