"""
Commande Django pour créer les utilisateurs de démonstration
Usage: python manage.py create_demo_users
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from api.models import Agence

User = get_user_model()


class Command(BaseCommand):
    help = 'Crée les utilisateurs de test pour l\'environnement de démonstration'

    def handle(self, *args, **options):
        self.stdout.write('🎯 Création des utilisateurs de démonstration...\n')

        # Créer l'agence de démonstration
        agence, created = Agence.objects.get_or_create(
            nom='Entreprise Démo BTP',
            defaults={
                'adresse': '123 Avenue de la Construction',
                'ville': 'Paris',
                'code_postal': '75001',
                'telephone': '01 23 45 67 89',
                'email': 'contact@entreprise-demo.com',
                'siret': '12345678901234',
            }
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS('✅ Agence de démonstration créée'))
        else:
            self.stdout.write('ℹ️  Agence de démonstration déjà existante')

        # Liste des utilisateurs à créer
        demo_users = [
            {
                'username': 'demo-admin',
                'email': 'demo-admin@entreprise.com',
                'first_name': 'Admin',
                'last_name': 'Démonstration',
                'password': 'DemoP3000!',
                'is_staff': True,
                'is_superuser': True,
                'role': 'Administrateur',
            },
            {
                'username': 'demo-chef',
                'email': 'demo-chef@entreprise.com',
                'first_name': 'Chef',
                'last_name': 'Chantier',
                'password': 'DemoP3000!',
                'is_staff': False,
                'is_superuser': False,
                'role': 'Chef de Chantier',
            },
            {
                'username': 'demo-compta',
                'email': 'demo-compta@entreprise.com',
                'first_name': 'Comptable',
                'last_name': 'Démo',
                'password': 'DemoP3000!',
                'is_staff': False,
                'is_superuser': False,
                'role': 'Comptable',
            },
            {
                'username': 'demo-commercial',
                'email': 'demo-commercial@entreprise.com',
                'first_name': 'Commercial',
                'last_name': 'Démo',
                'password': 'DemoP3000!',
                'is_staff': False,
                'is_superuser': False,
                'role': 'Commercial',
            },
            {
                'username': 'demo',
                'email': 'demo@entreprise.com',
                'first_name': 'Utilisateur',
                'last_name': 'Test',
                'password': 'DemoP3000!',
                'is_staff': False,
                'is_superuser': False,
                'role': 'Utilisateur',
            },
        ]

        created_count = 0
        updated_count = 0

        for user_data in demo_users:
            username = user_data.pop('username')
            password = user_data.pop('password')
            role = user_data.pop('role', 'Utilisateur')
            
            user, created = User.objects.get_or_create(
                username=username,
                defaults=user_data
            )
            
            if created:
                user.set_password(password)
                user.save()
                self.stdout.write(
                    self.style.SUCCESS(
                        f'✅ Utilisateur créé: {username} ({role})'
                    )
                )
                created_count += 1
            else:
                # Mettre à jour le mot de passe pour l'utilisateur existant
                user.set_password(password)
                for key, value in user_data.items():
                    setattr(user, key, value)
                user.save()
                self.stdout.write(
                    self.style.WARNING(
                        f'⚠️  Utilisateur mis à jour: {username} ({role})'
                    )
                )
                updated_count += 1

        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS(
            f'\n✅ Terminé!\n'
            f'   Créés: {created_count}\n'
            f'   Mis à jour: {updated_count}\n'
        ))
        self.stdout.write('\n📋 IDENTIFIANTS DE CONNEXION:')
        self.stdout.write('   Email: demo@entreprise.com (ou demo-admin, demo-chef, etc.)')
        self.stdout.write('   Mot de passe: DemoP3000!')
        self.stdout.write('='*60 + '\n')
