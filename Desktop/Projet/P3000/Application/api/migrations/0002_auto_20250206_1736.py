from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('api','0001_initial' ),  # Ajustez selon votre dernière migration
    ]

    operations = [
        migrations.AddField(
            model_name='boncommande',
            name='fournisseur',
            field=models.CharField(max_length=100),
            preserve_default=False,
        ),
    ]