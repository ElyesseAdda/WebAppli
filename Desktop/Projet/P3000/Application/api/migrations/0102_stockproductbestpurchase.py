from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0101_add_commentaire_agency_expense_month'),
    ]

    operations = [
        migrations.CreateModel(
            name='StockProductBestPurchase',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('prix_unitaire', models.DecimalField(decimal_places=2, max_digits=10)),
                ('lieu_achat', models.CharField(max_length=150)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('produit', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='best_purchase', to='api.stockproduct')),
                ('purchase_item', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='best_purchase_refs', to='api.stockpurchaseitem')),
            ],
            options={
                'verbose_name': 'Meilleur achat produit',
                'verbose_name_plural': 'Meilleurs achats produits',
            },
        ),
    ]
