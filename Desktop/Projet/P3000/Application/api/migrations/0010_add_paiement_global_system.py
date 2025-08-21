# Generated manually for production migration

from django.db import migrations, models
import django.db.models.deletion
from datetime import date

def check_and_populate_existing_data(apps, schema_editor):
    """Vérifie et complète les données existantes si nécessaire"""
    PaiementSousTraitant = apps.get_model('api', 'PaiementSousTraitant')
    
    for paiement in PaiementSousTraitant.objects.all():
        # Si date_paiement n'existe pas encore, la créer à partir de mois/année
        if not hasattr(paiement, 'date_paiement') or paiement.date_paiement is None:
            if paiement.mois and paiement.annee:
                paiement.date_paiement = date(paiement.annee, paiement.mois, 1)
            else:
                paiement.date_paiement = date.today()
        
        # Si montant_facture_ht n'existe pas, le créer
        if not hasattr(paiement, 'montant_facture_ht') or paiement.montant_facture_ht is None:
            paiement.montant_facture_ht = 0
        
        paiement.save()

class Migration(migrations.Migration):

    dependencies = [
        ('api', '0009_update_paiement_sous_traitant_model_v2'),
    ]

    operations = [
        # Étape 1: Vérifier et compléter les données existantes
        migrations.RunPython(check_and_populate_existing_data, reverse_code=migrations.RunPython.noop),
        
        # Étape 2: Créer le nouveau modèle pour les paiements globaux
        migrations.CreateModel(
            name='PaiementGlobalSousTraitant',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date_paiement', models.DateField()),
                ('montant_paye_ht', models.DecimalField(max_digits=12, decimal_places=2)),
                ('date_paiement_reel', models.DateField(blank=True, null=True)),
                ('commentaire', models.TextField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('chantier', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='paiements_globaux_sous_traitant', to='api.chantier')),
                ('sous_traitant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='paiements_globaux', to='api.soustraitant')),
            ],
            options={
                'verbose_name': 'Paiement Global Sous-Traitant',
                'verbose_name_plural': 'Paiements Globaux Sous-Traitants',
                'ordering': ['chantier', 'sous_traitant', 'date_paiement'],
                'unique_together': {('chantier', 'sous_traitant', 'date_paiement')},
            },
        ),
    ]
