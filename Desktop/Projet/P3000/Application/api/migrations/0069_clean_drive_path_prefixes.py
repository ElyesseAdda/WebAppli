# Generated migration to clean drive_path prefixes

from django.db import migrations

def clean_drive_path_prefixes(apps, schema_editor):
    """
    Nettoie les drive_path existants en retirant les préfixes Appels_Offres/ et Chantiers/.
    Le drive_path stocké ne doit contenir que le chemin de base.
    """
    Chantier = apps.get_model('api', 'Chantier')
    AppelOffres = apps.get_model('api', 'AppelOffres')
    
    def clean_path(path):
        """Fonction utilitaire pour nettoyer un chemin"""
        if not path:
            return None
        
        path = str(path).strip()
        
        # Retirer les préfixes Appels_Offres/ et Chantiers/
        if path.startswith('Appels_Offres/'):
            path = path[len('Appels_Offres/'):]
        elif path.startswith('Chantiers/'):
            path = path[len('Chantiers/'):]
        
        # Nettoyer les slashes en début et fin
        path = path.strip('/')
        
        # Retourner None si vide après nettoyage
        if not path:
            return None
        
        return path
    
    # Nettoyer les chemins des chantiers
    chantiers = Chantier.objects.exclude(drive_path__isnull=True).exclude(drive_path='')
    updated_chantiers = 0
    for chantier in chantiers:
        cleaned_path = clean_path(chantier.drive_path)
        if cleaned_path != chantier.drive_path:
            chantier.drive_path = cleaned_path
            chantier.save(update_fields=['drive_path'])
            updated_chantiers += 1
    
    # Nettoyer les chemins des appels d'offres
    appels_offres = AppelOffres.objects.exclude(drive_path__isnull=True).exclude(drive_path='')
    updated_appels = 0
    for appel_offres in appels_offres:
        cleaned_path = clean_path(appel_offres.drive_path)
        if cleaned_path != appel_offres.drive_path:
            appel_offres.drive_path = cleaned_path
            appel_offres.save(update_fields=['drive_path'])
            updated_appels += 1
    
    print(f"Migration terminée : {updated_chantiers} chantiers et {updated_appels} appels d'offres nettoyés")

def reverse_clean_drive_path_prefixes(apps, schema_editor):
    """
    Fonction de rollback (ne fait rien car on ne peut pas restaurer les préfixes)
    """
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('api', '0068_appeloffres_drive_path_chantier_drive_path'),
    ]

    operations = [
        migrations.RunPython(clean_drive_path_prefixes, reverse_clean_drive_path_prefixes),
    ]

