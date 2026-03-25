from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0106_alter_rapportintervention_dates_intervention'),
    ]

    operations = [
        migrations.AddField(
            model_name='rapportintervention',
            name='temps_taches',
            field=models.FloatField(default=0, verbose_name='Temps de taches (heures)'),
        ),
        migrations.AddField(
            model_name='rapportintervention',
            name='temps_trajet',
            field=models.FloatField(default=0, verbose_name='Temps de trajet (heures)'),
        ),
    ]
