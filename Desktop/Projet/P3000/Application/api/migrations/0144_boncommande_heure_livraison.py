from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0143_devis_default_tag_en_attente'),
    ]

    operations = [
        migrations.AddField(
            model_name='boncommande',
            name='heure_livraison',
            field=models.TimeField(blank=True, null=True, verbose_name='Heure de livraison'),
        ),
    ]
