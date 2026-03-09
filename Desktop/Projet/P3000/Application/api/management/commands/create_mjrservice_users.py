"""
Commande Django pour créer les utilisateurs MJR Service (Adel, Amine, Salima, Rania).
À exécuter sur l'instance MJR Service : python manage.py create_mjrservice_users
Pour réinitialiser les mots de passe des utilisateurs existants : python manage.py create_mjrservice_users --update-passwords
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import authenticate
from django.contrib.auth.models import User


class Command(BaseCommand):
    help = 'Crée les utilisateurs MJR Service (Adel, Amine, Salima, Rania)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--update-passwords',
            action='store_true',
            help='Met à jour les mots de passe (et noms/email) des utilisateurs existants pour qu\'ils correspondent à la liste.',
        )
        parser.add_argument(
            '--verify',
            action='store_true',
            help='Vérifie que les identifiants en base permettent bien de se connecter (authenticate).',
        )

    def handle(self, *args, **options):
        update_passwords = options['update_passwords']
        verify_only = options['verify']
        users_data = [
            {
                'username': 'amajri',
                'password': 'K9#mP2$vL8@nQ4',
                'first_name': 'Adel',
                'last_name': 'Majri',
                'email': 'amajri@mjrservices.fr',
                'is_staff': False,
                'is_superuser': False,
            },
            {
                'username': 'abelaoued',
                'password': 'R7#tN5$wX2@kM9',
                'first_name': 'Amine',
                'last_name': 'Belaoued',
                'email': 'abelaoued@mjrservices.fr',
                'is_staff': False,
                'is_superuser': False,
            },
            {
                'username': 'saitatmane',
                'password': 'H4#jF8$qZ6@bP3',
                'first_name': 'Salima',
                'last_name': 'Aitatmane',
                'email': 'saitatmane@mjrservices.fr',
                'is_staff': False,
                'is_superuser': False,
            },
            {
                'username': 'rkefi',
                'password': 'GZ$F8l5keQfl3nQ',
                'first_name': 'Rania',
                'last_name': 'Kefi',
                'email': 'rkefi@mjrservices.fr',
                'is_staff': False,
                'is_superuser': False,
            },
        ]

        if verify_only:
            self.stdout.write("Vérification des identifiants (comme à la connexion)...")
            for user_data in users_data:
                u = authenticate(
                    username=user_data['username'],
                    password=user_data['password'],
                )
                if u:
                    self.stdout.write(
                        self.style.SUCCESS(f"  {user_data['username']}: OK")
                    )
                else:
                    self.stdout.write(
                        self.style.ERROR(f"  {user_data['username']}: ÉCHEC (mdp ne correspond pas)")
                    )
            return

        created_users = []

        for user_data in users_data:
            username = user_data['username']

            try:
                user = User.objects.filter(username=username).first()
                if user:
                    if update_passwords:
                        user.set_password(user_data['password'])
                        user.first_name = user_data['first_name']
                        user.last_name = user_data['last_name']
                        user.email = user_data['email']
                        user.is_staff = user_data['is_staff']
                        user.is_superuser = user_data['is_superuser']
                        user.save()
                        created_users.append({
                            'username': username,
                            'password': user_data['password'],
                            'name': f"{user_data['first_name']} {user_data['last_name']}",
                        })
                        self.stdout.write(
                            self.style.SUCCESS(f"Mot de passe et profil de '{username}' mis à jour")
                        )
                    else:
                        self.stdout.write(
                            self.style.WARNING(f"L'utilisateur '{username}' existe déjà (utilisez --update-passwords pour réinitialiser le mot de passe)")
                        )
                    continue

                User.objects.create_user(
                    username=username,
                    password=user_data['password'],
                    email=user_data['email'],
                    first_name=user_data['first_name'],
                    last_name=user_data['last_name'],
                    is_staff=user_data['is_staff'],
                    is_superuser=user_data['is_superuser'],
                )
                created_users.append({
                    'username': username,
                    'password': user_data['password'],
                    'name': f"{user_data['first_name']} {user_data['last_name']}",
                })
                self.stdout.write(
                    self.style.SUCCESS(f"Utilisateur '{username}' créé avec succès")
                )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f"Erreur lors de la création/mise à jour de '{username}': {str(e)}"
                    )
                )

        if created_users:
            self.stdout.write("\n" + "=" * 50)
            title = "MOTS DE PASSE MJR SERVICE RÉINITIALISÉS" if update_passwords else "UTILISATEURS MJR SERVICE CRÉÉS"
            self.stdout.write(title)
            self.stdout.write("=" * 50)
            for u in created_users:
                self.stdout.write(f"  {u['name']} — login: {u['username']}")

        self.stdout.write(self.style.SUCCESS("\nCommande terminée."))
