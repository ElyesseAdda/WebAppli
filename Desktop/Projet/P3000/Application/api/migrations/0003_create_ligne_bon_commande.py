from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):
    dependencies = [
        ('api', '0002_auto_20250206_1736'),  # Assurez-vous que c'est la dernière migration
    ]

    operations = [
        migrations.CreateModel(
            name='LigneBonCommande',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('designation', models.CharField(max_length=255)),
                ('quantite', models.IntegerField()),
                ('prix_unitaire', models.DecimalField(decimal_places=2, max_digits=10)),
                ('total', models.DecimalField(decimal_places=2, max_digits=10)),
                ('bon_commande', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='lignes', to='api.boncommande')),
                ('produit', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='api.stock')),
            ],
        ),
    ] 