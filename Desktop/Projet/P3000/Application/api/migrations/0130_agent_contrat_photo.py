from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0129_situation_list_indexes'),
    ]

    operations = [
        migrations.AddField(
            model_name='agent',
            name='type_contrat',
            field=models.CharField(
                blank=True,
                choices=[('cdi', 'CDI'), ('cdd', 'CDD')],
                help_text='Type de contrat (CDI ou CDD)',
                max_length=10,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='agent',
            name='fin_periode_essai',
            field=models.DateField(
                blank=True,
                help_text='Date de fin de période d\'essai',
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='agent',
            name='date_debut_contrat',
            field=models.DateField(
                blank=True,
                help_text='Date de début du contrat',
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='agent',
            name='date_fin_contrat',
            field=models.DateField(
                blank=True,
                help_text='Date de fin du contrat (CDD uniquement)',
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='agent',
            name='carte_btp',
            field=models.BooleanField(
                default=False,
                help_text='Possède une carte BTP',
            ),
        ),
        migrations.AddField(
            model_name='agent',
            name='photo_s3_key',
            field=models.CharField(
                blank=True,
                max_length=500,
                null=True,
                verbose_name='Clé S3 de la photo agent',
            ),
        ),
    ]
