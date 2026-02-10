#!/usr/bin/env python
"""
Script pour créer les utilisateurs P3000 avec des mots de passe sécurisés
Exécuter avec: python create_users_amelioration.py
"""

import os
import sys
import django
import secrets
import string

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Application.settings')
django.setup()

from django.contrib.auth.models import User
from django.contrib.auth.hashers import make_password

def generate_password(length=15):
    """Génère un mot de passe sécurisé avec le même format que les autres utilisateurs"""
    # Caractères possibles : lettres majuscules, minuscules, chiffres, caractères spéciaux
    uppercase = string.ascii_uppercase
    lowercase = string.ascii_lowercase
    digits = string.digits
    special = '#$@'
    
    # Assurer au moins un caractère de chaque type
    password = [
        secrets.choice(uppercase),
        secrets.choice(lowercase),
        secrets.choice(digits),
        secrets.choice(special)
    ]
    
    # Remplir le reste avec des caractères aléatoires
    all_chars = uppercase + lowercase + digits + special
    for _ in range(length - 4):
        password.append(secrets.choice(all_chars))
    
    # Mélanger pour éviter un pattern prévisible
    secrets.SystemRandom().shuffle(password)
    
    return ''.join(password)

def create_user(username, first_name, last_name, password=None):
    """Créer un utilisateur avec le mot de passe hashé (ou mettre à jour le mdp si existe)."""
    try:
        user = User.objects.filter(username=username).first()
        if user:
            if password:
                user.set_password(password)
                user.first_name = first_name
                user.last_name = last_name
                user.save()
                print(f"✅ Mot de passe mis à jour pour '{username}' — {first_name} {last_name}")
            else:
                print(f"⚠️  L'utilisateur '{username}' existe déjà (mot de passe inchangé)")
            return True
        
        # Générer un mot de passe si non fourni
        if password is None:
            password = generate_password()
        
        # Créer l'utilisateur
        user = User.objects.create_user(
            username=username,
            password=password,
            first_name=first_name,
            last_name=last_name,
            email='',  # Pas d'email
            is_staff=True,  # Accès à l'admin
            is_superuser=False  # Pas de superuser
        )
        
        print(f"✅ Utilisateur '{username}' créé avec succès")
        print(f"   Nom complet: {first_name} {last_name}")
        print(f"   Mot de passe: {password}")
        print(f"   Accès admin: Oui")
        print()
        return True
        
    except Exception as e:
        print(f"❌ Erreur lors de la création de '{username}': {str(e)}")
        return False

def main():
    """Fonction principale"""
    from users_config import USERS_SHARED

    print("🚀 Création des utilisateurs P3000 (mêmes identifiants que Elekable)")
    print("=" * 50)
    
    # Même liste que Elekable (users_config.py)
    users_to_create = USERS_SHARED
    
    success_count = 0
    
    for user_data in users_to_create:
        if create_user(**user_data):
            success_count += 1
    
    print("=" * 50)
    print(f"📊 Résumé: {success_count}/{len(users_to_create)} utilisateurs créés")
    
    if success_count == len(users_to_create):
        print("🎉 Tous les utilisateurs ont été créés avec succès!")
    else:
        print("⚠️  Certains utilisateurs n'ont pas pu être créés")
    
    print("\n🔐 Informations de connexion:")
    print("URL: http://localhost:8000/login (ou votre domaine)")
    print("Utilisez les identifiants ci-dessus pour vous connecter")

if __name__ == '__main__':
    main()
