#!/usr/bin/env python
"""
Script pour créer sur Elekable les mêmes identifiants que Peinture 3000.

À exécuter sur l'instance Elekable (base p3000db_elekable) :
  cd /var/www/elekable/Desktop/Projet/P3000/Application
  source /var/www/elekable/venv/bin/activate
  python create_users_elekable.py

Important : utilise Application.settings_production pour lire DATABASE_URL
du .env (p3000db_elekable), comme le fait Gunicorn. Sinon le script
écrirait dans la mauvaise base (p3000db) et la connexion échouerait.
"""

import os
import sys
import django
import secrets
import string

# Même settings que l'app en production (lit DATABASE_URL depuis .env)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Application.settings_production')
django.setup()

from django.contrib.auth import authenticate
from django.contrib.auth import get_user_model

User = get_user_model()


def generate_password(length=15):
    """Génère un mot de passe sécurisé."""
    uppercase = string.ascii_uppercase
    lowercase = string.ascii_lowercase
    digits = string.digits
    special = '#$@'
    password = [
        secrets.choice(uppercase),
        secrets.choice(lowercase),
        secrets.choice(digits),
        secrets.choice(special),
    ]
    all_chars = uppercase + lowercase + digits + special
    for _ in range(length - 4):
        password.append(secrets.choice(all_chars))
    secrets.SystemRandom().shuffle(password)
    return ''.join(password)


def create_or_update_user(username, first_name, last_name, password, is_staff=True, is_superuser=False, email=''):
    """Crée l'utilisateur s'il n'existe pas, sinon réinitialise son mot de passe (même identifiants que P3000)."""
    try:
        user = User.objects.filter(username=username).first()
        if user:
            user.set_password(password)
            user.first_name = first_name
            user.last_name = last_name
            user.email = email or f'{username}@elekable.fr'
            user.is_staff = is_staff
            user.is_superuser = is_superuser
            user.save()
            print(f"✅ Mot de passe réinitialisé pour '{username}' — {first_name} {last_name}")
            return True
        User.objects.create_user(
            username=username,
            password=password,
            first_name=first_name,
            last_name=last_name,
            email=email or f'{username}@elekable.fr',
            is_staff=is_staff,
            is_superuser=is_superuser,
        )
        print(f"✅ Utilisateur '{username}' créé — {first_name} {last_name}")
        return True
    except Exception as e:
        print(f"❌ Erreur pour '{username}': {e}")
        return False


def main():
    print("Création des identifiants Elekable (mêmes que Peinture 3000)")
    print("=" * 55)

    # Même liste que create_users_amelioration.py (Peinture 3000)
    users = [
        {'username': 'amajri', 'first_name': 'Amajri', 'last_name': 'User', 'password': 'K9#mP2$vL8@nQ4'},
        {'username': 'abelaoued', 'first_name': 'Abelaoued', 'last_name': 'User', 'password': 'R7#tN5$wX2@kM9'},
        {'username': 'saitatmane', 'first_name': 'Saitatmane', 'last_name': 'User', 'password': 'H4#jF8$qZ6@bP3'},
        {'username': 'rkefi', 'first_name': 'Rkefi', 'last_name': 'User', 'password': None},  # généré ci-dessous
    ]

    # Utilisateur admin (comme sur P3000)
    admin_user = {
        'username': 'admin',
        'first_name': 'Administrateur',
        'last_name': 'Elekable',
        'password': 'admin123',
        'is_staff': True,
        'is_superuser': True,
        'email': 'admin@elekable.fr',
    }

    created = 0

    for u in users:
        pwd = u.get('password') or generate_password()
        if create_or_update_user(u['username'], u['first_name'], u['last_name'], pwd):
            created += 1
            if not u.get('password'):
                print(f"   Mot de passe généré pour rkefi: {pwd}")

    if create_or_update_user(
        admin_user['username'],
        admin_user['first_name'],
        admin_user['last_name'],
        admin_user['password'],
        is_staff=admin_user.get('is_staff', True),
        is_superuser=admin_user.get('is_superuser', True),
        email=admin_user.get('email', ''),
    ):
        created += 1

    print("=" * 55)
    print(f"Résumé: {created} utilisateur(s) créé(s) ou mot(s) de passe réinitialisé(s).")
    print("Connexion: admin / admin123 — autres: mêmes identifiants que Peinture 3000.")

    # Vérification : test de connexion admin (même DB que l'app)
    print()
    if authenticate(username='admin', password='admin123'):
        print("✅ Vérification OK : admin / admin123 accepté par Django (même base que l'app).")
    else:
        print("⚠️  Vérification échec : admin / admin123 refusé. Vérifiez DJANGO_SETTINGS_MODULE et .env (DATABASE_URL).")


if __name__ == '__main__':
    main()
