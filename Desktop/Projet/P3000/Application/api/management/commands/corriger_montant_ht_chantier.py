from django.core.management.base import BaseCommand
from django.db import transaction
from api.models import Chantier, AppelOffres, Devis


class Command(BaseCommand):
    help = 'Corrige le montant_ht d\'un chantier en s\'appuyant sur le montant du devis de marché associé'

    def add_arguments(self, parser):
        parser.add_argument(
            'chantier_id',
            type=int,
            help='ID du chantier à corriger'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Affiche les modifications sans les appliquer'
        )

    def handle(self, *args, **options):
        chantier_id = options['chantier_id']
        dry_run = options['dry_run']

        try:
            # Récupérer le chantier
            chantier = Chantier.objects.get(id=chantier_id)
            self.stdout.write(f"\nChantier trouvé : {chantier.chantier_name} (ID: {chantier.id})")
            self.stdout.write(f"Montant HT actuel : {chantier.montant_ht}")
            
            # Trouver l'appel d'offres qui a été transformé en ce chantier
            try:
                appel_offres = AppelOffres.objects.get(chantier_transformé=chantier)
                self.stdout.write(f"\nAppel d'offres trouvé : {appel_offres.chantier_name} (ID: {appel_offres.id})")
                self.stdout.write(f"Montant HT de l'appel d'offres : {appel_offres.montant_ht}")
            except AppelOffres.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(
                        f"\n✗ Aucun appel d'offres trouvé pour ce chantier. "
                        f"Le chantier n'a peut-être pas été créé depuis un appel d'offres."
                    )
                )
                return
            except AppelOffres.MultipleObjectsReturned:
                self.stdout.write(
                    self.style.WARNING(
                        f"\n⚠ Plusieurs appels d'offres trouvés pour ce chantier. "
                        f"Utilisation du premier trouvé."
                    )
                )
                appel_offres = AppelOffres.objects.filter(chantier_transformé=chantier).first()
            
            # Trouver le devis associé à cet appel d'offres
            devis = appel_offres.devis.first()
            
            if not devis:
                self.stdout.write(
                    self.style.ERROR(
                        f"\n✗ Aucun devis trouvé pour l'appel d'offres {appel_offres.chantier_name}. "
                        f"Impossible de corriger le montant."
                    )
                )
                return
            
            # Vérifier s'il y a plusieurs devis
            devis_count = appel_offres.devis.count()
            if devis_count > 1:
                self.stdout.write(
                    self.style.WARNING(
                        f"\n⚠ {devis_count} devis trouvés pour cet appel d'offres. "
                        f"Utilisation du premier devis (ID: {devis.id}, Numéro: {devis.numero})."
                    )
                )
            
            self.stdout.write(f"\nDevis trouvé : {devis.numero} (ID: {devis.id})")
            self.stdout.write(f"Montant HT du devis : {devis.price_ht}")
            
            # Comparer les montants
            ancien_montant = chantier.montant_ht
            nouveau_montant = float(devis.price_ht)
            
            if ancien_montant == nouveau_montant:
                self.stdout.write(
                    self.style.SUCCESS(
                        f"\n✓ Les montants sont déjà identiques ({ancien_montant}). Aucune modification nécessaire."
                    )
                )
                return
            
            self.stdout.write(f"\nComparaison des montants :")
            self.stdout.write(f"  - Montant HT actuel du chantier : {ancien_montant}")
            self.stdout.write(f"  - Montant HT du devis de marché : {nouveau_montant}")
            self.stdout.write(f"  - Différence : {nouveau_montant - ancien_montant}")
            
            if dry_run:
                self.stdout.write(
                    self.style.WARNING(
                        f"\n[DRY RUN] Le montant serait modifié de {ancien_montant} à {nouveau_montant}"
                    )
                )
                return
            
            # Appliquer la correction
            with transaction.atomic():
                chantier.montant_ht = nouveau_montant
                chantier.save()
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f"\n✓ Montant HT du chantier corrigé avec succès !"
                    )
                )
                self.stdout.write(f"  Ancien montant : {ancien_montant}")
                self.stdout.write(f"  Nouveau montant : {nouveau_montant}")
                
        except Chantier.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(
                    f"\n✗ Chantier avec l'ID {chantier_id} non trouvé."
                )
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(
                    f"\n✗ Erreur lors de la correction : {str(e)}"
                )
            )
            import traceback
            self.stdout.write(traceback.format_exc())

