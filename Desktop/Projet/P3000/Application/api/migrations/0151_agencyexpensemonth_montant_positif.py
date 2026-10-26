from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0150_facturesoustraitant_contrat'),
    ]

    operations = [
        migrations.AddField(
            model_name='agencyexpensemonth',
            name='is_montant_positif',
            field=models.BooleanField(
                default=False,
                help_text="Montant positif (crédit / entrée), distinct d'une dépense",
            ),
        ),
        migrations.AlterUniqueTogether(
            name='agencyexpensemonth',
            unique_together={
                ('description', 'category', 'month', 'year', 'agence', 'is_montant_positif'),
            },
        ),
    ]
