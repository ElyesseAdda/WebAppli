"""
Signaux Django pour l'automatisation du Drive
Déclenche automatiquement la création de dossiers S3
"""

from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from django.core.exceptions import ObjectDoesNotExist
from .models import AppelOffres, Chantier, Devis, Societe
from .drive_automation import drive_automation
from .drive_rename_manager import drive_rename_manager
import logging

logger = logging.getLogger(__name__)


@receiver(pre_save, sender=AppelOffres)
def capture_old_appel_offres_name(sender, instance, **kwargs):
    """
    Capture l'ancien nom de l'appel d'offres avant la sauvegarde pour détecter les changements
    """
    if instance.pk:  # Si c'est une mise à jour (pas une création)
        try:
            old_instance = AppelOffres.objects.get(pk=instance.pk)
            # Stocker l'ancien nom dans l'instance pour l'utiliser dans post_save
            instance._old_chantier_name = old_instance.chantier_name
            instance._old_societe = old_instance.societe
        except AppelOffres.DoesNotExist:
            instance._old_chantier_name = None
            instance._old_societe = None


# ✅ Signal désactivé - La création des sous-dossiers est maintenant gérée via drive_path
# Les sous-dossiers sont créés explicitement dans create_devis et autres endroits de création
# @receiver(post_save, sender=AppelOffres)
# def create_appel_offres_folders(sender, instance, created, **kwargs):
#     """
#     DÉSACTIVÉ : La création des dossiers est maintenant gérée via drive_path
#     Les sous-dossiers sont créés explicitement lors de la création via create_subfolders_for_appel_offres()
#     """
#     pass
    else:
        # C'est une mise à jour - vérifier si le nom a changé
        old_chantier_name = getattr(instance, '_old_chantier_name', None)
        old_societe = getattr(instance, '_old_societe', None)
        
        if old_chantier_name and old_chantier_name != instance.chantier_name:
            # Le nom de l'appel d'offres a changé
            try:
                old_societe_name = old_societe.nom_societe if old_societe else "Société par défaut"
                new_societe_name = instance.societe.nom_societe if instance.societe else "Société par défaut"
                
                logger.info(f"🔄 Renommage de l'appel d'offres détecté: '{old_chantier_name}' → '{instance.chantier_name}'")
                
                # Déplacer tous les fichiers vers le nouveau chemin
                moved_count, error_count = drive_rename_manager.rename_appel_offres_path(
                    old_societe_name=old_societe_name,
                    old_appel_offres_name=old_chantier_name,
                    new_societe_name=new_societe_name,
                    new_appel_offres_name=instance.chantier_name
                )
                
                if moved_count > 0:
                    logger.info(f"✅ {moved_count} fichiers déplacés pour l'appel d'offres {instance.id}")
                if error_count > 0:
                    logger.warning(f"⚠️ {error_count} erreurs lors du déplacement des fichiers")
                    
            except Exception as e:
                logger.error(f"❌ Erreur lors du renommage de l'appel d'offres {instance.id}: {str(e)}")
        
        # Vérifier si la société a changé
        if old_societe and instance.societe and old_societe.id != instance.societe.id:
            # La société de l'appel d'offres a changé
            try:
                old_societe_name = old_societe.nom_societe if old_societe else "Société par défaut"
                new_societe_name = instance.societe.nom_societe if instance.societe else "Société par défaut"
                
                logger.info(f"🔄 Changement de société détecté pour l'appel d'offres {instance.id}: '{old_societe_name}' → '{new_societe_name}'")
                
                # Déplacer tous les fichiers vers le nouveau chemin
                moved_count, error_count = drive_rename_manager.rename_appel_offres_path(
                    old_societe_name=old_societe_name,
                    old_appel_offres_name=instance.chantier_name,
                    new_societe_name=new_societe_name,
                    new_appel_offres_name=instance.chantier_name
                )
                
                if moved_count > 0:
                    logger.info(f"✅ {moved_count} fichiers déplacés pour l'appel d'offres {instance.id}")
                if error_count > 0:
                    logger.warning(f"⚠️ {error_count} erreurs lors du déplacement des fichiers")
                    
            except Exception as e:
                logger.error(f"❌ Erreur lors du changement de société de l'appel d'offres {instance.id}: {str(e)}")


@receiver(pre_save, sender=Chantier)
def capture_old_chantier_name(sender, instance, **kwargs):
    """
    Capture l'ancien nom du chantier avant la sauvegarde pour détecter les changements
    """
    if instance.pk:  # Si c'est une mise à jour (pas une création)
        try:
            old_instance = Chantier.objects.get(pk=instance.pk)
            # Stocker l'ancien nom dans l'instance pour l'utiliser dans post_save
            instance._old_chantier_name = old_instance.chantier_name
            instance._old_societe = old_instance.societe
        except Chantier.DoesNotExist:
            instance._old_chantier_name = None
            instance._old_societe = None


# ✅ Signal désactivé - La création des sous-dossiers est maintenant gérée via drive_path
# Les sous-dossiers sont créés explicitement dans ChantierViewSet.create et autres endroits de création
# @receiver(post_save, sender=Chantier)
# def create_chantier_folders(sender, instance, created, **kwargs):
#     """
#     DÉSACTIVÉ : La création des dossiers est maintenant gérée via drive_path
#     Les sous-dossiers sont créés explicitement lors de la création via create_subfolders_for_chantier()
#     """
#     pass
    else:
        # C'est une mise à jour - vérifier si le nom a changé
        old_chantier_name = getattr(instance, '_old_chantier_name', None)
        old_societe = getattr(instance, '_old_societe', None)
        
        if old_chantier_name and old_chantier_name != instance.chantier_name:
            # Le nom du chantier a changé
            try:
                old_societe_name = old_societe.nom_societe if old_societe else "Société par défaut"
                new_societe_name = instance.societe.nom_societe if instance.societe else "Société par défaut"
                
                logger.info(f"🔄 Renommage du chantier détecté: '{old_chantier_name}' → '{instance.chantier_name}'")
                
                # Déplacer tous les fichiers vers le nouveau chemin
                moved_count, error_count = drive_rename_manager.rename_chantier_path(
                    old_societe_name=old_societe_name,
                    old_chantier_name=old_chantier_name,
                    new_societe_name=new_societe_name,
                    new_chantier_name=instance.chantier_name
                )
                
                if moved_count > 0:
                    logger.info(f"✅ {moved_count} fichiers déplacés pour le chantier {instance.id}")
                if error_count > 0:
                    logger.warning(f"⚠️ {error_count} erreurs lors du déplacement des fichiers")
                    
            except Exception as e:
                logger.error(f"❌ Erreur lors du renommage du chantier {instance.id}: {str(e)}")
        
        # Vérifier si la société a changé
        if old_societe and instance.societe and old_societe.id != instance.societe.id:
            # La société du chantier a changé
            try:
                old_societe_name = old_societe.nom_societe if old_societe else "Société par défaut"
                new_societe_name = instance.societe.nom_societe if instance.societe else "Société par défaut"
                
                logger.info(f"🔄 Changement de société détecté pour le chantier {instance.id}: '{old_societe_name}' → '{new_societe_name}'")
                
                # Déplacer tous les fichiers vers le nouveau chemin
                moved_count, error_count = drive_rename_manager.rename_chantier_path(
                    old_societe_name=old_societe_name,
                    old_chantier_name=instance.chantier_name,
                    new_societe_name=new_societe_name,
                    new_chantier_name=instance.chantier_name
                )
                
                if moved_count > 0:
                    logger.info(f"✅ {moved_count} fichiers déplacés pour le chantier {instance.id}")
                if error_count > 0:
                    logger.warning(f"⚠️ {error_count} erreurs lors du déplacement des fichiers")
                    
            except Exception as e:
                logger.error(f"❌ Erreur lors du changement de société du chantier {instance.id}: {str(e)}")


# Signal désactivé pour éviter les boucles infinies
# La transformation se fait maintenant uniquement via l'API manuelle
# @receiver(post_save, sender=AppelOffres)
# def handle_appel_offres_transformation(sender, instance, **kwargs):
#     """
#     Gère la transformation d'un appel d'offres en chantier
#     """
#     # Vérifier si l'appel d'offres vient d'être validé
#     if instance.statut == 'valide':
#         try:
#             print(f"🔄 Transformation de l'appel d'offres {instance.id} en chantier")
#             
#             # Récupérer le nom de la société
#             societe_name = instance.societe.nom_societe if instance.societe else "Société par défaut"
#             
#             # Créer le chantier
#             chantier = instance.transformer_en_chantier()
#             
#             # Copier les dossiers S3 de l'appel d'offres vers le chantier
#             success = drive_automation.copy_appel_offres_to_chantier(
#                 societe_name=societe_name,
#                 appel_offres_name=instance.chantier_name,
#                 chantier_name=chantier.chantier_name
#             )
#             
#             if success:
#                 print(f"✅ Copie S3 réussie: Appel d'offres {instance.id} → Chantier {chantier.id}")
#             else:
#                 print(f"⚠️  Copie S3 échouée pour l'appel d'offres {instance.id}")
#             
#         except Exception as e:
#             print(f"❌ Erreur lors de la transformation de l'appel d'offres {instance.id}: {str(e)}")


@receiver(post_delete, sender=AppelOffres)
def cleanup_appel_offres_folders(sender, instance, **kwargs):
    """
    Nettoie les dossiers S3 lors de la suppression d'un appel d'offres
    """
    try:
        # Récupérer le nom de la société
        societe_name = instance.societe.nom_societe if instance.societe else "Société par défaut"
        
        # Construire le chemin du dossier à supprimer (sans ID pour cohérence)
        folder_path = f"Appels_Offres/{drive_automation.custom_slugify(societe_name)}/{drive_automation.custom_slugify(instance.chantier_name)}"
        
        # Supprimer le dossier et son contenu
        drive_automation._delete_folder_recursive(folder_path)
        
    except Exception:
        pass


@receiver(pre_save, sender=Societe)
def capture_old_societe_name(sender, instance, **kwargs):
    """
    Capture l'ancien nom de la société avant la sauvegarde pour détecter les changements
    """
    if instance.pk:  # Si c'est une mise à jour (pas une création)
        try:
            old_instance = Societe.objects.get(pk=instance.pk)
            # Stocker l'ancien nom dans l'instance pour l'utiliser dans post_save
            instance._old_nom_societe = old_instance.nom_societe
        except Societe.DoesNotExist:
            instance._old_nom_societe = None


@receiver(post_save, sender=Societe)
def handle_societe_rename(sender, instance, created, **kwargs):
    """
    Gère le renommage d'une société en déplaçant tous les fichiers associés
    """
    if not created:
        old_nom_societe = getattr(instance, '_old_nom_societe', None)
        
        if old_nom_societe and old_nom_societe != instance.nom_societe:
            # Le nom de la société a changé
            try:
                logger.info(f"🔄 Renommage de la société détecté: '{old_nom_societe}' → '{instance.nom_societe}'")
                
                # Déplacer tous les fichiers de tous les chantiers de cette société
                moved_count, error_count = drive_rename_manager.rename_societe_path(
                    old_societe_name=old_nom_societe,
                    new_societe_name=instance.nom_societe
                )
                
                if moved_count > 0:
                    logger.info(f"✅ {moved_count} fichiers déplacés pour la société {instance.id}")
                if error_count > 0:
                    logger.warning(f"⚠️ {error_count} erreurs lors du déplacement des fichiers")
                    
            except Exception as e:
                logger.error(f"❌ Erreur lors du renommage de la société {instance.id}: {str(e)}")


@receiver(post_delete, sender=Chantier)
def cleanup_chantier_folders(sender, instance, **kwargs):
    """
    Nettoie les dossiers S3 lors de la suppression d'un chantier
    """
    try:
        # Récupérer le nom de la société
        societe_name = instance.societe.nom_societe if instance.societe else "Société par défaut"
        
        # Construire le chemin du dossier à supprimer (utilise maintenant "Chantiers")
        folder_path = f"Chantiers/{drive_automation.custom_slugify(societe_name)}/{drive_automation.custom_slugify(instance.chantier_name)}"
        
        # Supprimer le dossier et son contenu
        drive_automation._delete_folder_recursive(folder_path)
        
    except Exception:
        pass


@receiver(post_save, sender=Devis)
def sync_appel_offres_montants_on_devis_save(sender, instance, **kwargs):
    """
    Quand un devis de chantier (devis_chantier=True) est sauvegardé, met à jour :
    - les montants de l'appel d'offres lié (chantier_transformé = ce chantier) ;
    - les montants du chantier (montant_ht, montant_ttc) pour que le "marché" reste à jour.
    """
    if not getattr(instance, 'devis_chantier', False) or not getattr(instance, 'chantier_id', None):
        return
    from .appel_offres_sync import sync_single_appel_offres_from_devis, sync_chantier_montants_from_devis
    try:
        # Synchroniser le chantier (marché) avec le devis de marché
        if sync_chantier_montants_from_devis(instance):
            logger.debug(f"Montants du chantier {instance.chantier_id} synchronisés depuis le devis {instance.id}")
        # Synchroniser l'appel d'offres si le chantier en provient
        appel_offres = AppelOffres.objects.filter(chantier_transformé_id=instance.chantier_id).first()
        if appel_offres:
            sync_single_appel_offres_from_devis(appel_offres)
            logger.debug(f"Montants de l'appel d'offres {appel_offres.id} synchronisés depuis le devis {instance.id}")
    except Exception as e:
        logger.warning(f"Sync montants après save devis: {e}")


def connect_signals():
    """
    Connecte tous les signaux (appelée dans apps.py)
    """
    # Les signaux sont automatiquement connectés grâce aux décorateurs @receiver
    pass


def disconnect_signals():
    """
    Déconnecte tous les signaux (pour les tests)
    """
    # Cette fonction peut être utile pour les tests
    pass
