from django.core.management.base import BaseCommand
from api.appel_offres_sync import sync_appel_offres_montants_depuis_devis


class Command(BaseCommand):
    help = (
        "Rafraîchit les montants (HT/TTC) des appels d'offres déjà transformés en chantier "
        "à partir du devis de chantier actuel (devis_chantier=True)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Affiche les modifications sans les enregistrer',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        if dry_run:
            self.stdout.write(self.style.WARNING('[DRY RUN] Aucune modification ne sera enregistrée.\n'))
        result = sync_appel_offres_montants_depuis_devis(dry_run=dry_run)
        self.stdout.write(f"Appels d'offres transformés traités : {result['updated'] + result['skipped'] + result['errors']}")
        self.stdout.write(self.style.SUCCESS(f"  → Mis à jour : {result['updated']}"))
        self.stdout.write(f"  → Déjà à jour / sans devis : {result['skipped']}")
        if result['errors']:
            self.stdout.write(self.style.ERROR(f"  → Erreurs : {result['errors']}"))
        for d in result['details']:
            if d.get('updated'):
                self.stdout.write(
                    f"  ✓ {d['chantier_name']} (id={d['id']}) → HT={d.get('montant_ht')} €, TTC={d.get('montant_ttc')} €"
                )
            elif d.get('error'):
                self.stdout.write(self.style.ERROR(f"  ✗ {d['chantier_name']} (id={d['id']}): {d['error']}"))
        if dry_run and result['updated']:
            self.stdout.write(self.style.WARNING('\nRelancez sans --dry-run pour appliquer les modifications.'))
