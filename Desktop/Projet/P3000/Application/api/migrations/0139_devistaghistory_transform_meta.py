from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0138_devis_tag_history'),
    ]

    operations = [
        migrations.AddField(
            model_name='devistaghistory',
            name='document_numero',
            field=models.CharField(blank=True, default='', max_length=100),
        ),
        migrations.AddField(
            model_name='devistaghistory',
            name='preview_url',
            field=models.CharField(blank=True, default='', max_length=500),
        ),
        migrations.AddField(
            model_name='devistaghistory',
            name='transform_type',
            field=models.CharField(
                blank=True,
                choices=[
                    ('facture', 'Facture'),
                    ('avenant', 'Avenant'),
                    ('cie', 'Facture CIE'),
                ],
                default='',
                max_length=20,
            ),
        ),
    ]
