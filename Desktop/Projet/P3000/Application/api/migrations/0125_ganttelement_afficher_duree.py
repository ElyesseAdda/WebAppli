from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0124_ganttdesignation_ganttdiagramme_ganttelement_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='ganttelement',
            name='afficher_duree',
            field=models.BooleanField(
                blank=True,
                default=None,
                help_text="Null = automatique selon la largeur, True/False = forcer l'affichage.",
                null=True,
                verbose_name='Afficher la durée sur la barre',
            ),
        ),
    ]
