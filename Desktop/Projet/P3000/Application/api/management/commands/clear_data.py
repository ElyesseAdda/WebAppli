from django.core.management.base import BaseCommand
from api.models import (
    FactureTS, Facture, Devis, Chantier, Client, Societe,
    Avenant, DevisLigne, 
    Partie, SousPartie, LigneDetail
)

class Command(BaseCommand):
    help = 'Supprime toutes les données liées aux chantiers, factures, devis, etc.'

    def handle(self, *args, **kwargs):
        try:
            self.stdout.write('Début de la suppression des données...')

            # Supprimer dans l'ordre pour respecter les contraintes de clé étrangère
            

            self.stdout.write('Suppression des factures TS...')
            FactureTS.objects.all().delete()

            self.stdout.write('Suppression des avenants...')
            Avenant.objects.all().delete()

            self.stdout.write('Suppression des factures...')
            Facture.objects.all().delete()

            self.stdout.write('Suppression des lignes de devis...')
            LigneDetail.objects.all().delete()
            SousPartie.objects.all().delete()
            Partie.objects.all().delete()
            DevisLigne.objects.all().delete()

            self.stdout.write('Suppression des devis...')
            Devis.objects.all().delete()

            self.stdout.write('Suppression des chantiers...')
            Chantier.objects.all().delete()

            self.stdout.write('Suppression des clients...')
            Client.objects.all().delete()

            self.stdout.write('Suppression des sociétés...')
            Societe.objects.all().delete()

            self.stdout.write(self.style.SUCCESS('Toutes les données ont été supprimées avec succès!'))

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Une erreur est survenue: {str(e)}')
            ) 