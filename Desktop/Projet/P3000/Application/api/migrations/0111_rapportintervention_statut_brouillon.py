# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0110_rapportintervention_numero_annuel"),
    ]

    operations = [
        migrations.AlterField(
            model_name="rapportintervention",
            name="statut",
            field=models.CharField(
                choices=[
                    ("brouillon", "Brouillon"),
                    ("a_faire", "A faire"),
                    ("en_cours", "En cours"),
                    ("termine", "Terminé"),
                ],
                default="a_faire",
                max_length=20,
            ),
        ),
    ]
