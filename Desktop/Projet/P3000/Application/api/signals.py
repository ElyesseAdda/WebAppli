"""
Signaux Django pour l'automatisation du Drive
Déclenche automatiquement la création de dossiers S3
"""

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.core.exceptions import ObjectDoesNotExist
from .models import AppelOffres, Chantier, Societe
from .drive_automation import drive_automation


@receiver(post_save, sender=AppelOffres)
def create_appel_offres_folders(sender, instance, created, **kwargs):
    """
    Crée automatiquement la structure de dossiers S3 lors de la création d'un appel d'offres
    """
    if created:
        try:
            print(f"🎯 Création automatique des dossiers S3 pour l'appel d'offres: {instance.id}")
            
            # Récupérer le nom de la société
            societe_name = instance.societe.nom_societe if instance.societe else "Société par défaut"
            
            # Créer la structure de dossiers S3
            folder_path = drive_automation.create_appel_offres_structure(
                appel_offres_id=instance.id,
                societe_name=societe_name,
                appel_offres_name=instance.chantier_name
            )
            
            print(f"✅ Dossiers S3 créés avec succès: {folder_path}")
            
            # Optionnel: Enregistrer le chemin dans le modèle (si vous voulez le garder)
            # instance.folder_path = folder_path
            # instance.save(update_fields=['folder_path'])
            
        except Exception as e:
            print(f"❌ Erreur lors de la création des dossiers S3 pour l'appel d'offres {instance.id}: {str(e)}")
            # Ne pas faire échouer la création de l'appel d'offres à cause du Drive


@receiver(post_save, sender=Chantier)
def create_chantier_folders(sender, instance, created, **kwargs):
    """
    Crée automatiquement la structure de dossiers S3 lors de la création d'un chantier
    """
    if created:
        try:
            print(f"🏗️  Création automatique des dossiers S3 pour le chantier: {instance.chantier_name}")
            
            # Récupérer le nom de la société
            societe_name = instance.societe.nom_societe if instance.societe else "Société par défaut"
            
            # Créer la structure de dossiers S3
            folder_path = drive_automation.create_chantier_structure(
                societe_name=societe_name,
                chantier_name=instance.chantier_name
            )
            
            print(f"✅ Dossiers S3 créés avec succès: {folder_path}")
            
        except Exception as e:
            print(f"❌ Erreur lors de la création des dossiers S3 pour le chantier {instance.chantier_name}: {str(e)}")
            # Ne pas faire échouer la création du chantier à cause du Drive


@receiver(post_save, sender=AppelOffres)
def handle_appel_offres_transformation(sender, instance, **kwargs):
    """
    Gère la transformation d'un appel d'offres en chantier
    """
    # Vérifier si l'appel d'offres vient d'être validé
    if instance.statut == 'valide':
        try:
            print(f"🔄 Transformation de l'appel d'offres {instance.id} en chantier")
            
            # Récupérer le nom de la société
            societe_name = instance.societe.nom_societe if instance.societe else "Société par défaut"
            
            # Créer le chantier
            chantier = instance.transformer_en_chantier()
            
            # Transférer les dossiers S3 de l'appel d'offres vers le chantier
            success = drive_automation.transfer_appel_offres_to_chantier(
                appel_offres_id=instance.id,
                societe_name=societe_name,
                appel_offres_name=instance.chantier_name,
                chantier_name=chantier.chantier_name
            )
            
            if success:
                print(f"✅ Transfert S3 réussi: Appel d'offres {instance.id} → Chantier {chantier.id}")
            else:
                print(f"⚠️  Transfert S3 échoué pour l'appel d'offres {instance.id}")
            
        except Exception as e:
            print(f"❌ Erreur lors de la transformation de l'appel d'offres {instance.id}: {str(e)}")


@receiver(post_delete, sender=AppelOffres)
def cleanup_appel_offres_folders(sender, instance, **kwargs):
    """
    Nettoie les dossiers S3 lors de la suppression d'un appel d'offres
    """
    try:
        print(f"🗑️  Nettoyage des dossiers S3 pour l'appel d'offres: {instance.id}")
        
        # Récupérer le nom de la société
        societe_name = instance.societe.nom_societe if instance.societe else "Société par défaut"
        
        # Construire le chemin du dossier à supprimer
        folder_path = f"Appels_Offres/{drive_automation.custom_slugify(societe_name)}/{instance.id:03d}_{drive_automation.custom_slugify(instance.chantier_name)}"
        
        # Supprimer le dossier et son contenu
        drive_automation._delete_folder_recursive(folder_path)
        
        print(f"✅ Dossiers S3 supprimés: {folder_path}")
        
    except Exception as e:
        print(f"❌ Erreur lors du nettoyage des dossiers S3 pour l'appel d'offres {instance.id}: {str(e)}")


@receiver(post_delete, sender=Chantier)
def cleanup_chantier_folders(sender, instance, **kwargs):
    """
    Nettoie les dossiers S3 lors de la suppression d'un chantier
    """
    try:
        print(f"🗑️  Nettoyage des dossiers S3 pour le chantier: {instance.chantier_name}")
        
        # Récupérer le nom de la société
        societe_name = instance.societe.nom_societe if instance.societe else "Société par défaut"
        
        # Construire le chemin du dossier à supprimer (utilise maintenant "Sociétés")
        folder_path = f"Sociétés/{drive_automation.custom_slugify(societe_name)}/{drive_automation.custom_slugify(instance.chantier_name)}"
        
        # Supprimer le dossier et son contenu
        drive_automation._delete_folder_recursive(folder_path)
        
        print(f"✅ Dossiers S3 supprimés: {folder_path}")
        
    except Exception as e:
        print(f"❌ Erreur lors du nettoyage des dossiers S3 pour le chantier {instance.chantier_name}: {str(e)}")


def connect_signals():
    """
    Connecte tous les signaux (appelée dans apps.py)
    """
    print("🔌 Connexion des signaux Drive automatique...")
    # Les signaux sont automatiquement connectés grâce aux décorateurs @receiver


def disconnect_signals():
    """
    Déconnecte tous les signaux (pour les tests)
    """
    print("🔌 Déconnexion des signaux Drive automatique...")
    # Cette fonction peut être utile pour les tests
