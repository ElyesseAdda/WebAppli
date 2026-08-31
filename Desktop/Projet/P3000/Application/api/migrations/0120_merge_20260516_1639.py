# Merge des deux chaînes parallèles au niveau 0115 :
# - Elekable (Vigik/rapports) : 0115_vigik_plus_multiple_photos
# - Main (P3000)            : 0115_pointagemensuel_repartition_montant_charge
# Recréée pour compatibilité avec la base Elekable déjà migrée.

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0115_vigik_plus_multiple_photos'),
        ('api', '0115_pointagemensuel_repartition_montant_charge'),
    ]
    operations = [
    ]
