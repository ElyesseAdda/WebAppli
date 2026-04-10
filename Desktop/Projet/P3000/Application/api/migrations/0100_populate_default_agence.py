from django.db import migrations


def create_default_agence(apps, schema_editor):
    """
    Create the default 'Agence' entity, link it to the existing system chantier,
    and attach all existing AgencyExpenseMonth/AgencyExpense/AgencyExpenseAggregate
    records to it. Zero data loss.
    """
    Agence = apps.get_model('api', 'Agence')
    Chantier = apps.get_model('api', 'Chantier')
    AgencyExpenseMonth = apps.get_model('api', 'AgencyExpenseMonth')
    AgencyExpense = apps.get_model('api', 'AgencyExpense')
    AgencyExpenseAggregate = apps.get_model('api', 'AgencyExpenseAggregate')

    # Find existing system chantier of type 'agence'
    system_chantier = Chantier.objects.filter(chantier_type='agence').first()
    if not system_chantier:
        system_chantier = Chantier.objects.filter(chantier_name__iexact='Agence').first()

    # If no system chantier exists, create one
    if not system_chantier:
        system_chantier = Chantier.objects.create(
            chantier_name='Agence',
            is_system_chantier=True,
            chantier_type='agence',
            ville='Système',
            rue='Système',
            state_chantier='En Cours',
            description='Chantier système pour les heures au siège / agence',
        )

    # Create the default Agence
    agence, _ = Agence.objects.get_or_create(
        nom='Agence',
        defaults={'chantier': system_chantier},
    )
    # Ensure chantier link even if agence already existed
    if agence.chantier_id != system_chantier.id:
        agence.chantier = system_chantier
        agence.save(update_fields=['chantier'])

    # Attach all existing records to the default agence
    AgencyExpenseMonth.objects.filter(agence__isnull=True).update(agence=agence)
    AgencyExpense.objects.filter(agence__isnull=True).update(agence=agence)
    AgencyExpenseAggregate.objects.filter(agence__isnull=True).update(agence=agence)


def reverse_default_agence(apps, schema_editor):
    """Reverse: unlink all records from the default agence (set to null)."""
    AgencyExpenseMonth = apps.get_model('api', 'AgencyExpenseMonth')
    AgencyExpense = apps.get_model('api', 'AgencyExpense')
    AgencyExpenseAggregate = apps.get_model('api', 'AgencyExpenseAggregate')

    AgencyExpenseMonth.objects.all().update(agence=None)
    AgencyExpense.objects.all().update(agence=None)
    AgencyExpenseAggregate.objects.all().update(agence=None)


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0099_agence_model_and_fk'),
    ]

    operations = [
        migrations.RunPython(create_default_agence, reverse_default_agence),
    ]
