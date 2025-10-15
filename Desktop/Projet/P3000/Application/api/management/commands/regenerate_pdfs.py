"""
Management command pour régénérer les PDFs dans le Drive
Usage:
  python manage.py regenerate_pdfs --type=situation --dry-run
  python manage.py regenerate_pdfs --type=contrat_sous_traitance --chantier=123
  python manage.py regenerate_pdfs --type=all
"""

from django.core.management.base import BaseCommand, CommandError
from django.db.models import Q
from api.models import (
    Situation, ContratSousTraitance, AvenantSousTraitance,
    Devis, BonCommande, Facture, Chantier
)
import requests
from urllib.parse import urlencode


class Command(BaseCommand):
    help = 'Régénère les PDFs de documents dans le Drive avec les templates mis à jour'

    def add_arguments(self, parser):
        parser.add_argument(
            '--type',
            type=str,
            required=True,
            choices=[
                'situation', 
                'contrat_sous_traitance', 
                'avenant_sous_traitance',
                'devis_travaux',
                'bon_commande',
                'facture',
                'all'
            ],
            help='Type de document à régénérer'
        )
        
        parser.add_argument(
            '--chantier',
            type=int,
            help='ID du chantier (optionnel, pour filtrer par chantier)'
        )
        
        parser.add_argument(
            '--start-date',
            type=str,
            help='Date de début (format: YYYY-MM-DD)'
        )
        
        parser.add_argument(
            '--end-date',
            type=str,
            help='Date de fin (format: YYYY-MM-DD)'
        )
        
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Afficher ce qui serait régénéré sans effectuer les changements'
        )
        
        parser.add_argument(
            '--limit',
            type=int,
            help='Limiter le nombre de documents à régénérer'
        )

    def handle(self, *args, **options):
        doc_type = options['type']
        chantier_id = options.get('chantier')
        dry_run = options.get('dry_run', False)
        limit = options.get('limit')
        
        self.stdout.write(self.style.SUCCESS(
            f'\n{"="*60}\n'
            f'RÉGÉNÉRATION DE PDFs DANS LE DRIVE\n'
            f'{"="*60}\n'
        ))
        
        if dry_run:
            self.stdout.write(self.style.WARNING('MODE DRY-RUN ACTIVÉ (aucun changement ne sera effectué)\n'))
        
        # Régénérer selon le type
        if doc_type == 'all':
            self.regenerate_all_types(options)
        elif doc_type == 'situation':
            self.regenerate_situations(chantier_id, dry_run, limit)
        elif doc_type == 'contrat_sous_traitance':
            self.regenerate_contrats(chantier_id, dry_run, limit)
        elif doc_type == 'avenant_sous_traitance':
            self.regenerate_avenants(chantier_id, dry_run, limit)
        elif doc_type == 'devis_travaux':
            self.regenerate_devis(chantier_id, dry_run, limit)
        elif doc_type == 'bon_commande':
            self.regenerate_bons_commande(chantier_id, dry_run, limit)
        elif doc_type == 'facture':
            self.regenerate_factures(chantier_id, dry_run, limit)
        
        self.stdout.write(self.style.SUCCESS(f'\n{"="*60}\n'))

    def regenerate_all_types(self, options):
        """Régénère tous les types de documents"""
        chantier_id = options.get('chantier')
        dry_run = options.get('dry_run', False)
        limit = options.get('limit')
        
        self.regenerate_situations(chantier_id, dry_run, limit)
        self.regenerate_contrats(chantier_id, dry_run, limit)
        self.regenerate_avenants(chantier_id, dry_run, limit)
        self.regenerate_bons_commande(chantier_id, dry_run, limit)
        self.regenerate_factures(chantier_id, dry_run, limit)

    def regenerate_situations(self, chantier_id=None, dry_run=False, limit=None):
        """Régénère les situations"""
        self.stdout.write(self.style.HTTP_INFO('\n📋 SITUATIONS'))
        self.stdout.write('-' * 60)
        
        # Requête de base
        queryset = Situation.objects.select_related('chantier', 'chantier__societe')
        
        # Filtrer par chantier si spécifié
        if chantier_id:
            queryset = queryset.filter(chantier_id=chantier_id)
        
        # Appliquer la limite si spécifiée
        if limit:
            queryset = queryset[:limit]
        
        total = queryset.count()
        self.stdout.write(f'Nombre de situations à régénérer: {total}')
        
        if dry_run:
            for situation in queryset:
                self.stdout.write(
                    f'  ✓ {situation.numero_situation} - {situation.chantier.chantier_name}'
                )
            return
        
        # Régénérer chaque situation
        success = 0
        errors = 0
        
        for situation in queryset:
            try:
                # Construire les paramètres
                params = {
                    'situation_id': situation.id,
                    'chantier_id': situation.chantier.id,
                    'chantier_name': situation.chantier.chantier_name,
                    'societe_name': situation.chantier.societe.nom_societe if situation.chantier.societe else 'Société',
                    'numero_situation': situation.numero_situation,
                    'force_replace': 'true',
                }
                
                # Appel API
                url = f'http://localhost:8000/api/generate-situation-pdf-drive/?{urlencode(params)}'
                response = requests.get(url)
                
                if response.status_code == 200:
                    success += 1
                    self.stdout.write(
                        self.style.SUCCESS(f'  ✓ {situation.numero_situation} - {situation.chantier.chantier_name}')
                    )
                else:
                    errors += 1
                    self.stdout.write(
                        self.style.ERROR(f'  ✗ {situation.numero_situation} - Erreur: {response.status_code}')
                    )
                    
            except Exception as e:
                errors += 1
                self.stdout.write(
                    self.style.ERROR(f'  ✗ {situation.numero_situation} - Erreur: {str(e)}')
                )
        
        self.stdout.write(f'\nRésumé: {success} réussies, {errors} erreurs')

    def regenerate_contrats(self, chantier_id=None, dry_run=False, limit=None):
        """Régénère les contrats de sous-traitance"""
        self.stdout.write(self.style.HTTP_INFO('\n📄 CONTRATS DE SOUS-TRAITANCE'))
        self.stdout.write('-' * 60)
        
        queryset = ContratSousTraitance.objects.select_related('chantier', 'chantier__societe')
        
        if chantier_id:
            queryset = queryset.filter(chantier_id=chantier_id)
        
        if limit:
            queryset = queryset[:limit]
        
        total = queryset.count()
        self.stdout.write(f'Nombre de contrats à régénérer: {total}')
        
        if dry_run:
            for contrat in queryset:
                self.stdout.write(
                    f'  ✓ {contrat.contrat_name} - {contrat.chantier.chantier_name}'
                )
            return
        
        success = 0
        errors = 0
        
        for contrat in queryset:
            try:
                params = {
                    'contrat_id': contrat.id,
                    'chantier_id': contrat.chantier.id,
                    'chantier_name': contrat.chantier.chantier_name,
                    'societe_name': contrat.chantier.societe.nom_societe if contrat.chantier.societe else 'Société',
                    'contrat_name': contrat.contrat_name,
                    'force_replace': 'true',
                }
                
                url = f'http://localhost:8000/api/generate-contrat-sous-traitance-pdf-drive/?{urlencode(params)}'
                response = requests.get(url)
                
                if response.status_code == 200:
                    success += 1
                    self.stdout.write(
                        self.style.SUCCESS(f'  ✓ {contrat.contrat_name}')
                    )
                else:
                    errors += 1
                    self.stdout.write(
                        self.style.ERROR(f'  ✗ {contrat.contrat_name} - Erreur: {response.status_code}')
                    )
                    
            except Exception as e:
                errors += 1
                self.stdout.write(
                    self.style.ERROR(f'  ✗ {contrat.contrat_name} - Erreur: {str(e)}')
                )
        
        self.stdout.write(f'\nRésumé: {success} réussies, {errors} erreurs')

    def regenerate_avenants(self, chantier_id=None, dry_run=False, limit=None):
        """Régénère les avenants de sous-traitance"""
        self.stdout.write(self.style.HTTP_INFO('\n📑 AVENANTS DE SOUS-TRAITANCE'))
        self.stdout.write('-' * 60)
        
        queryset = AvenantSousTraitance.objects.select_related(
            'contrat', 'contrat__chantier', 'contrat__chantier__societe'
        )
        
        if chantier_id:
            queryset = queryset.filter(contrat__chantier_id=chantier_id)
        
        if limit:
            queryset = queryset[:limit]
        
        total = queryset.count()
        self.stdout.write(f'Nombre d\'avenants à régénérer: {total}')
        
        if dry_run:
            for avenant in queryset:
                self.stdout.write(
                    f'  ✓ Avenant n°{avenant.numero} - {avenant.contrat.contrat_name}'
                )
            return
        
        success = 0
        errors = 0
        
        for avenant in queryset:
            try:
                params = {
                    'avenant_id': avenant.id,
                    'contrat_id': avenant.contrat.id,
                    'chantier_id': avenant.contrat.chantier.id,
                    'chantier_name': avenant.contrat.chantier.chantier_name,
                    'societe_name': avenant.contrat.chantier.societe.nom_societe if avenant.contrat.chantier.societe else 'Société',
                    'avenant_name': avenant.avenant_name,
                    'force_replace': 'true',
                }
                
                url = f'http://localhost:8000/api/generate-avenant-sous-traitance-pdf-drive/?{urlencode(params)}'
                response = requests.get(url)
                
                if response.status_code == 200:
                    success += 1
                    self.stdout.write(
                        self.style.SUCCESS(f'  ✓ {avenant.avenant_name}')
                    )
                else:
                    errors += 1
                    self.stdout.write(
                        self.style.ERROR(f'  ✗ {avenant.avenant_name} - Erreur: {response.status_code}')
                    )
                    
            except Exception as e:
                errors += 1
                self.stdout.write(
                    self.style.ERROR(f'  ✗ {avenant.avenant_name} - Erreur: {str(e)}')
                )
        
        self.stdout.write(f'\nRésumé: {success} réussies, {errors} erreurs')

    def regenerate_devis(self, chantier_id=None, dry_run=False, limit=None):
        """Régénère les devis"""
        self.stdout.write(self.style.HTTP_INFO('\n💼 DEVIS TRAVAUX'))
        self.stdout.write('-' * 60)
        
        # À implémenter selon votre modèle Devis
        self.stdout.write(self.style.WARNING('Non implémenté pour le moment'))

    def regenerate_bons_commande(self, chantier_id=None, dry_run=False, limit=None):
        """Régénère les bons de commande"""
        self.stdout.write(self.style.HTTP_INFO('\n🛒 BONS DE COMMANDE'))
        self.stdout.write('-' * 60)
        
        queryset = BonCommande.objects.select_related('chantier', 'chantier__societe', 'fournisseur')
        
        if chantier_id:
            queryset = queryset.filter(chantier_id=chantier_id)
        
        if limit:
            queryset = queryset[:limit]
        
        total = queryset.count()
        self.stdout.write(f'Nombre de bons de commande à régénérer: {total}')
        
        if dry_run:
            for bc in queryset:
                self.stdout.write(
                    f'  ✓ {bc.numero_bon_commande} - {bc.chantier.chantier_name if bc.chantier else "N/A"}'
                )
            return
        
        success = 0
        errors = 0
        
        for bc in queryset:
            try:
                params = {
                    'bon_commande_id': bc.id,
                    'chantier_id': bc.chantier.id if bc.chantier else '',
                    'chantier_name': bc.chantier.chantier_name if bc.chantier else 'Chantier',
                    'societe_name': bc.chantier.societe.nom_societe if bc.chantier and bc.chantier.societe else 'Société',
                    'numero_bon_commande': bc.numero_bon_commande,
                    'fournisseur_name': bc.fournisseur.nom if bc.fournisseur else 'Fournisseur',
                    'force_replace': 'true',
                }
                
                url = f'http://localhost:8000/api/generate-bon-commande-pdf-drive/?{urlencode(params)}'
                response = requests.get(url)
                
                if response.status_code == 200:
                    success += 1
                    self.stdout.write(
                        self.style.SUCCESS(f'  ✓ {bc.numero_bon_commande}')
                    )
                else:
                    errors += 1
                    self.stdout.write(
                        self.style.ERROR(f'  ✗ {bc.numero_bon_commande} - Erreur: {response.status_code}')
                    )
                    
            except Exception as e:
                errors += 1
                self.stdout.write(
                    self.style.ERROR(f'  ✗ {bc.numero_bon_commande if hasattr(bc, "numero_bon_commande") else "BC"} - Erreur: {str(e)}')
                )
        
        self.stdout.write(f'\nRésumé: {success} réussies, {errors} erreurs')

    def regenerate_factures(self, chantier_id=None, dry_run=False, limit=None):
        """Régénère les factures"""
        self.stdout.write(self.style.HTTP_INFO('\n🧾 FACTURES'))
        self.stdout.write('-' * 60)
        
        queryset = Facture.objects.select_related('chantier', 'chantier__societe')
        
        if chantier_id:
            queryset = queryset.filter(chantier_id=chantier_id)
        
        if limit:
            queryset = queryset[:limit]
        
        total = queryset.count()
        self.stdout.write(f'Nombre de factures à régénérer: {total}')
        
        if dry_run:
            for facture in queryset:
                self.stdout.write(
                    f'  ✓ {facture.numero} - {facture.chantier.chantier_name if facture.chantier else "N/A"}'
                )
            return
        
        success = 0
        errors = 0
        
        for facture in queryset:
            try:
                params = {
                    'facture_id': facture.id,
                    'chantier_id': facture.chantier.id if facture.chantier else '',
                    'chantier_name': facture.chantier.chantier_name if facture.chantier else 'Chantier',
                    'societe_name': facture.chantier.societe.nom_societe if facture.chantier and facture.chantier.societe else 'Société',
                    'numero': facture.numero,
                    'force_replace': 'true',
                }
                
                url = f'http://localhost:8000/api/generate-facture-pdf-drive/?{urlencode(params)}'
                response = requests.get(url)
                
                if response.status_code == 200:
                    success += 1
                    self.stdout.write(
                        self.style.SUCCESS(f'  ✓ {facture.numero}')
                    )
                else:
                    errors += 1
                    self.stdout.write(
                        self.style.ERROR(f'  ✗ {facture.numero} - Erreur: {response.status_code}')
                    )
                    
            except Exception as e:
                errors += 1
                self.stdout.write(
                    self.style.ERROR(f'  ✗ {facture.numero if hasattr(facture, "numero") else "FACTURE"} - Erreur: {str(e)}')
                )
        
        self.stdout.write(f'\nRésumé: {success} réussies, {errors} erreurs')

