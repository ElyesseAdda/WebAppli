from django.core.management.base import BaseCommand
from api.models import Emetteur


class Command(BaseCommand):
    help = 'Crée les émetteurs Adel et Amine'

    def handle(self, *args, **options):
        # Créer Adel
        adel, created = Emetteur.objects.get_or_create(
            name="Adel",
            surname="Majri",
            defaults={
                'email': "adel.majri@peinture3000.fr",
                'phone_Number': "0761566672",
                'is_active': True,
            }
        )
        if created:
            self.stdout.write(
                self.style.SUCCESS(f'Émetteur "{adel}" créé avec succès')
            )
        else:
            self.stdout.write(
                self.style.WARNING(f'Émetteur "{adel}" existe déjà')
            )

        # Créer Amine
        amine, created = Emetteur.objects.get_or_create(
            name="Amine",
            surname="Belaoued",
            defaults={
                'email': "amine.belaoued@peinture3000.fr",
                'phone_Number': "0770181227",
                'is_active': True,
            }
        )
        if created:
            self.stdout.write(
                self.style.SUCCESS(f'Émetteur "{amine}" créé avec succès')
            )
        else:
            self.stdout.write(
                self.style.WARNING(f'Émetteur "{amine}" existe déjà')
            )

        self.stdout.write(
            self.style.SUCCESS('Commande terminée avec succès!')
        )
