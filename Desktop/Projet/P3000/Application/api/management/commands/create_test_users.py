from django.core.management.base import BaseCommand
from django.contrib.auth.models import User

class Command(BaseCommand):
    help = 'Creer des utilisateurs de test pour P3000'

    def handle(self, *args, **options):
        # Liste des utilisateurs a creer
        users_data = [
            {
                'username': 'admin',
                'password': 'admin123',
                'first_name': 'Administrateur',
                'last_name': 'P3000',
                'email': 'admin@p3000.com',
                'is_staff': True,
                'is_superuser': True
            },
            {
                'username': 'user1',
                'password': 'user123',
                'first_name': 'Utilisateur',
                'last_name': 'Test 1',
                'email': 'user1@p3000.com',
                'is_staff': False,
                'is_superuser': False
            },
            {
                'username': 'user2',
                'password': 'user123',
                'first_name': 'Utilisateur',
                'last_name': 'Test 2',
                'email': 'user2@p3000.com',
                'is_staff': False,
                'is_superuser': False
            }
        ]
        
        created_users = []
        
        for user_data in users_data:
            username = user_data['username']
            
            # Verifier si l'utilisateur existe deja
            if User.objects.filter(username=username).exists():
                self.stdout.write(
                    self.style.WARNING(f"L'utilisateur '{username}' existe deja")
                )
                continue
            
            # Creer l'utilisateur
            try:
                user = User.objects.create_user(
                    username=username,
                    password=user_data['password'],
                    email=user_data['email'],
                    first_name=user_data['first_name'],
                    last_name=user_data['last_name'],
                    is_staff=user_data['is_staff'],
                    is_superuser=user_data['is_superuser']
                )
                created_users.append({
                    'username': username,
                    'password': user_data['password'],
                    'name': f"{user_data['first_name']} {user_data['last_name']}"
                })
                self.stdout.write(
                    self.style.SUCCESS(f"Utilisateur '{username}' cree avec succes")
                )
                
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f"Erreur lors de la creation de l'utilisateur '{username}': {str(e)}")
                )
        
        # Afficher le resume
        if created_users:
            self.stdout.write("\n" + "="*50)
            self.stdout.write("UTILISATEURS CREES")
            self.stdout.write("="*50)
            for user in created_users:
                self.stdout.write(f"Nom: {user['name']}")
                self.stdout.write(f"Nom d'utilisateur: {user['username']}")
                self.stdout.write(f"Mot de passe: {user['password']}")
                self.stdout.write("")
        
        self.stdout.write(
            self.style.SUCCESS("Script termine !")
        )
