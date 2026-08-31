from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0127_ganttdiagramme_afficher_logo_client'),
    ]

    operations = [
        migrations.AddField(
            model_name='ganttdiagramme',
            name='logo_client_s3_key',
            field=models.CharField(
                blank=True,
                max_length=500,
                null=True,
                verbose_name='Clé S3 du logo client',
            ),
        ),
    ]
