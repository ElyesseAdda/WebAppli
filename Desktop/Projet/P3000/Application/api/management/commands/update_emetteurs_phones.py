from django.core.management.base import BaseCommand
from api.models import Emetteur

class Command(BaseCommand):
    help = 'Met à jour les numéros de téléphone des émetteurs existants'

    def add_arguments(self, parser):
        parser.add_argument(
            '--adel-phone',
            type=str,
            default='0761566672',
            help='Nouveau numéro de téléphone pour Adel'
        )
        parser.add_argument(
            '--amine-phone', 
            type=str,
            default='0756987448',
            help='Nouveau numéro de téléphone pour Amine'
        )

    def handle(self, *args, **options):
        # Nouvelles données des émetteurs
        updated_emetteurs = [
            {
                'name': 'Adel',
                'surname': 'Majri',
                'phone_Number': options['adel_phone']
            },
            {
                'name': 'Amine',
                'surname': 'Belaoued', 
                'phone_Number': options['amine_phone']
            }
        ]
        
        self.stdout.write("Mise à jour des numéros de téléphone des émetteurs...")
        
        for emetteur_data in updated_emetteurs:
            try:
                # Trouver l'émetteur existant
                emetteur = Emetteur.objects.get(
                    name=emetteur_data['name'],
                    surname=emetteur_data['surname']
                )
                
                # Sauvegarder l'ancien numéro
                old_phone = emetteur.phone_Number
                
                # Mettre à jour le numéro
                emetteur.phone_Number = emetteur_data['phone_Number']
                emetteur.save()
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f"✓ {emetteur.name} {emetteur.surname}: {old_phone} → {emetteur.phone_Number}"
                    )
                )
                
            except Emetteur.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(
                        f"✗ Émetteur {emetteur_data['name']} {emetteur_data['surname']} non trouvé"
                    )
                )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f"✗ Erreur lors de la mise à jour de {emetteur_data['name']}: {e}"
                    )
                )
        
        self.stdout.write(self.style.SUCCESS("\nMise à jour terminée !"))
