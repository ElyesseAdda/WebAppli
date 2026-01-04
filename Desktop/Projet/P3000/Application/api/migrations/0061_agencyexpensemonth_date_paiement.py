# Generated manually to add date_paiement field to existing AgencyExpenseMonth table
# NOTE: Le champ date_paiement existe déjà dans la migration 0060 (CreateModel)
# Cette migration est conservée pour maintenir la chaîne de dépendances avec 0062

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0060_agencyexpensemonth'),
    ]

    operations = [
        # Le champ date_paiement existe déjà dans le modèle créé par 0060
        # Aucune opération nécessaire
    ]

