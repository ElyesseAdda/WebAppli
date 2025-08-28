from django.core.management.base import BaseCommand
from api.models import Devis
import json
from decimal import Decimal


class Command(BaseCommand):
    help = 'Migre les lignes spéciales des devis existants pour ajouter les montants calculés'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Affiche les changements sans les appliquer',
        )
        parser.add_argument(
            '--devis-id',
            type=int,
            help='Migrer un devis spécifique par son ID',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        devis_id = options.get('devis_id')
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('Mode DRY RUN - Aucun changement ne sera appliqué')
            )

        # Filtrer les devis à traiter
        if devis_id:
            devis_queryset = Devis.objects.filter(id=devis_id)
            if not devis_queryset.exists():
                self.stdout.write(
                    self.style.ERROR(f'Devis avec ID {devis_id} non trouvé')
                )
                return
        else:
            devis_queryset = Devis.objects.all()

        total_devis = devis_queryset.count()
        devis_modifies = 0
        erreurs = 0

        self.stdout.write(f'Traitement de {total_devis} devis...\n')

        for devis in devis_queryset:
            try:
                if self.migrer_devis(devis, dry_run):
                    devis_modifies += 1
                    self.stdout.write(
                        self.style.SUCCESS(f'✓ Devis {devis.numero} (ID: {devis.id}) traité')
                    )
                else:
                    self.stdout.write(f'- Devis {devis.numero} (ID: {devis.id}) - Aucun changement nécessaire')
                    
            except Exception as e:
                erreurs += 1
                self.stdout.write(
                    self.style.ERROR(f'✗ Erreur pour devis {devis.numero} (ID: {devis.id}): {str(e)}')
                )

        # Résumé
        self.stdout.write('\n' + '='*50)
        self.stdout.write(f'RÉSUMÉ:')
        self.stdout.write(f'- Devis traités: {total_devis}')
        self.stdout.write(f'- Devis modifiés: {devis_modifies}')
        self.stdout.write(f'- Erreurs: {erreurs}')
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('\nMode DRY RUN - Aucun changement appliqué')
            )
            self.stdout.write('Pour appliquer les changements, relancez sans --dry-run')

    def migrer_devis(self, devis, dry_run=False):
        """
        Migre un devis en ajoutant les montants calculés aux lignes spéciales
        Retourne True si des modifications ont été faites, False sinon
        """
        if not devis.lignes_speciales:
            return False

        lignes_speciales_modifiees = dict(devis.lignes_speciales)
        modifications_faites = False

        # Traiter les lignes globales
        if 'global' in lignes_speciales_modifiees:
            for ligne in lignes_speciales_modifiees['global']:
                if self.ajouter_montant_calcule(ligne, devis.price_ht):
                    modifications_faites = True

        # Traiter les lignes des parties
        if 'parties' in lignes_speciales_modifiees:
            for partie_id, lignes in lignes_speciales_modifiees['parties'].items():
                for ligne in lignes:
                    if self.ajouter_montant_calcule(ligne, devis.price_ht):
                        modifications_faites = True

        # Traiter les lignes des sous-parties
        if 'sousParties' in lignes_speciales_modifiees:
            for sous_partie_id, lignes in lignes_speciales_modifiees['sousParties'].items():
                for ligne in lignes:
                    if self.ajouter_montant_calcule(ligne, devis.price_ht):
                        modifications_faites = True

        # Sauvegarder si des modifications ont été faites et qu'on n'est pas en dry-run
        if modifications_faites and not dry_run:
            devis.lignes_speciales = lignes_speciales_modifiees
            devis.save(update_fields=['lignes_speciales'])

        return modifications_faites

    def ajouter_montant_calcule(self, ligne, price_ht):
        """
        Ajoute le montant_calcule à une ligne spéciale si elle ne l'a pas déjà
        Retourne True si une modification a été faite, False sinon
        """
        if 'montant_calcule' in ligne:
            return False  # Déjà présent

        try:
            if ligne.get('valueType') == 'percentage':
                montant_calcule = (float(price_ht) * float(ligne['value'])) / 100
            else:
                montant_calcule = float(ligne['value'])
            
            ligne['montant_calcule'] = round(montant_calcule, 2)
            return True
            
        except (ValueError, KeyError, TypeError) as e:
            raise Exception(f"Erreur lors du calcul du montant pour ligne '{ligne.get('description', 'N/A')}': {str(e)}")
