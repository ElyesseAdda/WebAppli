from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0107_rapportintervention_temps_intervention"),
    ]

    operations = [
        migrations.AddField(
            model_name="rapportintervention",
            name="devis_a_faire",
            field=models.BooleanField(default=False, verbose_name="Devis à faire"),
        ),
    ]
