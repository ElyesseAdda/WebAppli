# Merge chaîne Elekable (Vigik/rapports) + chaîne main (suivi paiement ST)
# Recréée pour compatibilité avec la base Elekable déjà migrée.

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0115_vigik_plus_multiple_photos'),
        ('api', '0119_suivipaiement_factures_st_masquees'),
    ]

    operations = [
    ]
