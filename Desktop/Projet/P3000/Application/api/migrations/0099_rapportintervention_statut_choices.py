# Generated manually - Migration des statuts rapport: A faire, En cours, Terminé

from django.db import migrations, models


def migrate_statut_values(apps, schema_editor):
    RapportIntervention = apps.get_model("api", "RapportIntervention")
    mapping = {"brouillon": "a_faire", "valide": "termine"}
    for old, new in mapping.items():
        RapportIntervention.objects.filter(statut=old).update(statut=new)


def reverse_migrate_statut(apps, schema_editor):
    RapportIntervention = apps.get_model("api", "RapportIntervention")
    mapping = {"a_faire": "brouillon", "termine": "valide"}
    for new, old in mapping.items():
        RapportIntervention.objects.filter(statut=new).update(statut=old)


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0098_remove_rapportintervention_adresse_residence_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="rapportintervention",
            name="statut",
            field=models.CharField(
                choices=[
                    ("a_faire", "A faire"),
                    ("en_cours", "En cours"),
                    ("termine", "Terminé"),
                ],
                default="a_faire",
                max_length=20,
            ),
        ),
        migrations.RunPython(migrate_statut_values, reverse_migrate_statut),
    ]
