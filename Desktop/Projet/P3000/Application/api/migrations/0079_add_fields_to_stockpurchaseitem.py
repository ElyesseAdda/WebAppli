# Generated manually for adding montant_total and created_at to StockPurchaseItem

import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0078_stockpurchase_stockpurchaseitem'),
    ]

    operations = [
        # Ajouter montant_total avec une valeur par défaut temporaire
        migrations.AddField(
            model_name='stockpurchaseitem',
            name='montant_total',
            field=models.DecimalField(decimal_places=2, default=0, help_text='Total pour cet item (quantité × prix_unitaire)', max_digits=10),
        ),
        # Calculer montant_total pour les enregistrements existants
        migrations.RunSQL(
            sql='UPDATE api_stockpurchaseitem SET montant_total = quantite * prix_unitaire;',
            reverse_sql=migrations.RunSQL.noop,
        ),
        # Ajouter created_at avec une valeur par défaut temporaire
        migrations.AddField(
            model_name='stockpurchaseitem',
            name='created_at',
            field=models.DateTimeField(default=django.utils.timezone.now, help_text='Date de création de l\'enregistrement'),
        ),
        # Modifier created_at pour utiliser auto_now_add
        migrations.AlterField(
            model_name='stockpurchaseitem',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, help_text='Date de création de l\'enregistrement'),
        ),
        # Ajouter les index
        migrations.AddIndex(
            model_name='stockpurchaseitem',
            index=models.Index(fields=['produit', 'achat'], name='api_stockpr_produit_idx'),
        ),
        migrations.AddIndex(
            model_name='stockpurchaseitem',
            index=models.Index(fields=['achat', 'created_at'], name='api_stockpr_achat_id_idx'),
        ),
        # Modifier l'ordering
        migrations.AlterModelOptions(
            name='stockpurchaseitem',
            options={'ordering': ['-achat__date_achat', '-created_at'], 'verbose_name': 'Produit Acheté', 'verbose_name_plural': 'Produits Achetés'},
        ),
        # Modifier unite pour avoir une valeur par défaut
        migrations.AlterField(
            model_name='stockpurchaseitem',
            name='unite',
            field=models.CharField(default='pièce', help_text='Unité (toujours pièce)', max_length=50),
        ),
        # Modifier creer_produit pour avoir default=True
        migrations.AlterField(
            model_name='stockpurchaseitem',
            name='creer_produit',
            field=models.BooleanField(default=True, help_text='Créer le produit dans le stock après l\'achat'),
        ),
    ]
