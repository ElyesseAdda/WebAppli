from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0128_ganttdiagramme_logo_client_s3_key'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='situation',
            index=models.Index(fields=['-annee', '-mois'], name='situation_annee_mois_idx'),
        ),
        migrations.AddIndex(
            model_name='situation',
            index=models.Index(fields=['statut'], name='situation_statut_idx'),
        ),
        migrations.AddIndex(
            model_name='situation',
            index=models.Index(fields=['chantier', '-annee', '-mois'], name='situation_chantier_periode_idx'),
        ),
        migrations.AddIndex(
            model_name='situation',
            index=models.Index(fields=['-date_creation'], name='situation_date_creation_idx'),
        ),
    ]
