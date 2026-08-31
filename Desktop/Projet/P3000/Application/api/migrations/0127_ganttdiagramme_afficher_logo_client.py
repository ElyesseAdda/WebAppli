from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0126_ganttelement_style_barre'),
    ]

    operations = [
        migrations.AddField(
            model_name='ganttdiagramme',
            name='afficher_logo_client',
            field=models.BooleanField(
                default=False,
                verbose_name='Afficher le logo client dans le PDF',
            ),
        ),
    ]
