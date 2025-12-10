"""
Gestionnaire pour le renommage de sociétés et chantiers dans S3
Déplace automatiquement tous les fichiers associés vers le nouveau chemin
"""

import logging
from typing import List, Tuple
from .utils import get_s3_client, get_s3_bucket_name, custom_slugify, is_s3_available
from .pdf_manager import PDFManager

logger = logging.getLogger(__name__)


class DriveRenameManager:
    """
    Gestionnaire pour le renommage de chemins S3
    """
    
    def __init__(self):
        self.s3_client = None
        self.bucket_name = None
        if is_s3_available():
            self.s3_client = get_s3_client()
            self.bucket_name = get_s3_bucket_name()
    
    def list_all_files_recursive(self, prefix: str) -> List[str]:
        """
        Liste récursivement tous les fichiers dans un préfixe S3
        
        Args:
            prefix: Préfixe du chemin S3 (ex: "Chantiers/Societe/Chantier/")
        
        Returns:
            List[str]: Liste des chemins complets des fichiers
        """
        if not self.s3_client:
            logger.warning("S3 non disponible, impossible de lister les fichiers")
            return []
        
        files = []
        paginator = self.s3_client.get_paginator('list_objects_v2')
        
        try:
            # Parcourir toutes les pages de résultats
            for page in paginator.paginate(Bucket=self.bucket_name, Prefix=prefix):
                if 'Contents' in page:
                    for obj in page['Contents']:
                        key = obj['Key']
                        # Ignorer les fichiers .keep et les dossiers (qui se terminent par /)
                        if not key.endswith('/') and not key.endswith('/.keep'):
                            files.append(key)
            
            logger.info(f"📋 {len(files)} fichiers trouvés dans {prefix}")
            return files
            
        except Exception as e:
            logger.error(f"❌ Erreur lors de la liste des fichiers dans {prefix}: {str(e)}")
            return []
    
    def move_file_in_s3(self, old_path: str, new_path: str) -> bool:
        """
        Déplace un fichier dans S3 (copie puis supprime l'ancien)
        Note: Dans S3, il n'y a pas d'opération de "renommage" native.
        Le chemin fait partie de la clé (nom) de l'objet, donc on doit
        copier vers une nouvelle clé puis supprimer l'ancienne.
        
        Args:
            old_path: Ancien chemin S3
            new_path: Nouveau chemin S3
        
        Returns:
            bool: True si succès, False sinon
        """
        if not self.s3_client:
            logger.warning("S3 non disponible, impossible de déplacer le fichier")
            return False
        
        try:
            # Dans S3, "renommer" = copier vers nouvelle clé puis supprimer l'ancienne
            # C'est la méthode standard et optimale pour S3
            copy_source = {
                'Bucket': self.bucket_name,
                'Key': old_path
            }
            self.s3_client.copy_object(
                CopySource=copy_source,
                Bucket=self.bucket_name,
                Key=new_path
            )
            
            # Supprimer l'ancien fichier
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=old_path
            )
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Erreur lors du déplacement de {old_path} vers {new_path}: {str(e)}")
            return False
    
    def move_folder_recursive(self, old_prefix: str, new_prefix: str) -> Tuple[int, int]:
        """
        Déplace récursivement tous les fichiers d'un dossier vers un nouveau chemin
        
        Args:
            old_prefix: Ancien préfixe (ex: "Chantiers/Societe_Ancienne/Chantier_Ancien/")
            new_prefix: Nouveau préfixe (ex: "Chantiers/Societe_Nouvelle/Chantier_Nouveau/")
        
        Returns:
            Tuple[int, int]: (nombre de fichiers déplacés, nombre d'erreurs)
        """
        if not self.s3_client:
            logger.warning("S3 non disponible, impossible de déplacer le dossier")
            return (0, 0)
        
        # S'assurer que les préfixes se terminent par /
        if not old_prefix.endswith('/'):
            old_prefix += '/'
        if not new_prefix.endswith('/'):
            new_prefix += '/'
        
        # Lister tous les fichiers dans l'ancien préfixe
        files = self.list_all_files_recursive(old_prefix)
        
        if not files:
            logger.info(f"ℹ️ Aucun fichier trouvé dans {old_prefix}")
            return (0, 0)
        
        moved_count = 0
        error_count = 0
        
        logger.info(f"🔄 Début du déplacement de {len(files)} fichiers de {old_prefix} vers {new_prefix}")
        
        # Optimisation: traiter par lots pour améliorer les performances
        batch_size = 100
        folders_created = set()  # Pour éviter de créer plusieurs fois le même dossier
        
        for i, old_file_path in enumerate(files):
            # Calculer le nouveau chemin en remplaçant le préfixe
            relative_path = old_file_path[len(old_prefix):]
            new_file_path = new_prefix + relative_path
            
            # Créer le dossier parent si nécessaire (une seule fois par dossier)
            new_folder = '/'.join(new_file_path.split('/')[:-1]) + '/'
            if new_folder not in folders_created:
                try:
                    # Créer le dossier (même vide, S3 le créera automatiquement lors du déplacement)
                    self.s3_client.put_object(
                        Bucket=self.bucket_name,
                        Key=new_folder + '.keep',
                        Body=b''
                    )
                    folders_created.add(new_folder)
                except Exception:
                    pass  # Le dossier existe peut-être déjà
            
            # Déplacer le fichier (dans S3, c'est toujours copy + delete)
            if self.move_file_in_s3(old_file_path, new_file_path):
                moved_count += 1
            else:
                error_count += 1
            
            # Log de progression pour les gros déplacements
            if (i + 1) % batch_size == 0:
                logger.info(f"📊 Progression: {i + 1}/{len(files)} fichiers traités ({moved_count} déplacés, {error_count} erreurs)")
        
        logger.info(f"✅ Déplacement terminé: {moved_count} fichiers déplacés, {error_count} erreurs")
        return (moved_count, error_count)
    
    def rename_chantier_path(self, old_societe_name: str, old_chantier_name: str,
                            new_societe_name: str, new_chantier_name: str) -> Tuple[int, int]:
        """
        Renomme le chemin d'un chantier dans S3
        
        Args:
            old_societe_name: Ancien nom de la société
            old_chantier_name: Ancien nom du chantier
            new_societe_name: Nouveau nom de la société
            new_chantier_name: Nouveau nom du chantier
        
        Returns:
            Tuple[int, int]: (nombre de fichiers déplacés, nombre d'erreurs)
        """
        old_societe_slug = custom_slugify(old_societe_name)
        old_chantier_slug = custom_slugify(old_chantier_name)
        new_societe_slug = custom_slugify(new_societe_name)
        new_chantier_slug = custom_slugify(new_chantier_name)
        
        old_prefix = f"Chantiers/{old_societe_slug}/{old_chantier_slug}/"
        new_prefix = f"Chantiers/{new_societe_slug}/{new_chantier_slug}/"
        
        logger.info(f"🔄 Renommage du chantier: {old_prefix} → {new_prefix}")
        
        return self.move_folder_recursive(old_prefix, new_prefix)
    
    def rename_societe_path(self, old_societe_name: str, new_societe_name: str) -> Tuple[int, int]:
        """
        Renomme le chemin d'une société dans S3 (tous ses chantiers)
        
        Args:
            old_societe_name: Ancien nom de la société
            new_societe_name: Nouveau nom de la société
        
        Returns:
            Tuple[int, int]: (nombre de fichiers déplacés, nombre d'erreurs)
        """
        old_societe_slug = custom_slugify(old_societe_name)
        new_societe_slug = custom_slugify(new_societe_name)
        
        old_prefix = f"Chantiers/{old_societe_slug}/"
        new_prefix = f"Chantiers/{new_societe_slug}/"
        
        logger.info(f"🔄 Renommage de la société: {old_prefix} → {new_prefix}")
        
        return self.move_folder_recursive(old_prefix, new_prefix)
    
    def rename_appel_offres_path(self, old_societe_name: str, old_appel_offres_name: str,
                                 new_societe_name: str, new_appel_offres_name: str) -> Tuple[int, int]:
        """
        Renomme le chemin d'un appel d'offres dans S3
        
        Args:
            old_societe_name: Ancien nom de la société
            old_appel_offres_name: Ancien nom de l'appel d'offres
            new_societe_name: Nouveau nom de la société
            new_appel_offres_name: Nouveau nom de l'appel d'offres
        
        Returns:
            Tuple[int, int]: (nombre de fichiers déplacés, nombre d'erreurs)
        """
        old_societe_slug = custom_slugify(old_societe_name)
        old_appel_offres_slug = custom_slugify(old_appel_offres_name)
        new_societe_slug = custom_slugify(new_societe_name)
        new_appel_offres_slug = custom_slugify(new_appel_offres_name)
        
        old_prefix = f"Appels_Offres/{old_societe_slug}/{old_appel_offres_slug}/"
        new_prefix = f"Appels_Offres/{new_societe_slug}/{new_appel_offres_slug}/"
        
        logger.info(f"🔄 Renommage de l'appel d'offres: {old_prefix} → {new_prefix}")
        
        return self.move_folder_recursive(old_prefix, new_prefix)


# Instance globale
drive_rename_manager = DriveRenameManager()

