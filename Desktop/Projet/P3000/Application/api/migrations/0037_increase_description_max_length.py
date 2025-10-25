# Generated manually to fix description field length constraints

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0036_increase_numero_max_length'),
    ]

    operations = [
        migrations.AlterField(
            model_name='lignedetail',
            name='description',
            field=models.CharField(max_length=1000),
        ),
        migrations.AlterField(
            model_name='fournisseur',
            name='description_fournisseur',
            field=models.CharField(blank=True, max_length=500, null=True),
        ),
        migrations.AlterField(
            model_name='materiel_produit',
            name='description_produit',
            field=models.CharField(max_length=500),
        ),
        migrations.AlterField(
            model_name='quitus',
            name='description_quitus',
            field=models.CharField(max_length=500),
        ),
        migrations.AlterField(
            model_name='parametres',
            name='description',
            field=models.CharField(blank=True, max_length=500),
        ),
        migrations.AlterField(
            model_name='chantierlignesupplementaire',
            name='description',
            field=models.CharField(max_length=500),
        ),
        migrations.AlterField(
            model_name='agencyexpense',
            name='description',
            field=models.CharField(max_length=500),
        ),
        migrations.AlterField(
            model_name='agencyexpenseoverride',
            name='description',
            field=models.CharField(max_length=500),
        ),
    ]
