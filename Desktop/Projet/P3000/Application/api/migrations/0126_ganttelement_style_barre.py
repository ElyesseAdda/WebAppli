from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0125_ganttelement_afficher_duree'),
    ]

    operations = [
        migrations.AddField(
            model_name='ganttelement',
            name='style_barre',
            field=models.CharField(
                choices=[
                    ('plein', 'Plein'),
                    ('hachure', 'Hachuré'),
                    ('contour', 'Contour'),
                    ('arrondi', 'Arrondi'),
                    ('pointille', 'Pointillé'),
                ],
                default='plein',
                max_length=20,
                verbose_name='Style de barre',
            ),
        ),
    ]
