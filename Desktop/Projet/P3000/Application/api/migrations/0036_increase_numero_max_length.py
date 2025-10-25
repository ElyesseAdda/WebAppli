# Generated manually to fix numero field length constraints

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0034_alter_situation_date_creation'),
    ]

    operations = [
        migrations.AlterField(
            model_name='devis',
            name='numero',
            field=models.CharField(max_length=100, unique=True),
        ),
        migrations.AlterField(
            model_name='facture',
            name='numero',
            field=models.CharField(max_length=100, unique=True),
        ),
        migrations.AlterField(
            model_name='situation',
            name='numero_situation',
            field=models.CharField(max_length=100),
        ),
        migrations.AlterField(
            model_name='situation',
            name='numero_cp',
            field=models.CharField(blank=True, max_length=100, null=True, verbose_name='Numéro CP'),
        ),
    ]
