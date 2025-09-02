#!/usr/bin/env python
"""
Script pour créer les utilisateurs P3000 avec des mots de passe sécurisés
Exécuter avec: python create_users_amelioration.py
"""

import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Application.settings')
django.setup()

from django.contrib.auth.models import User
from django.contrib.auth.hashers import make_password

def create_user(username, first_name, last_name, password):
    """Créer un utilisateur avec le mot de passe hashé"""
    try:
        # Vérifier si l'utilisateur existe déjà
        if User.objects.filter(username=username).exists():
            print(f"❌ L'utilisateur '{username}' existe déjà")
            return False
        
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
    print("🚀 Création des utilisateurs P3000")
    print("=" * 50)
    
    # Liste des utilisateurs à créer
    users_to_create = [
        {
            'username': 'amajri',
            'first_name': 'Amajri',
            'last_name': 'User',
            'password': 'K9#mP2$vL8@nQ4'
        },
        {
            'username': 'abelaoued',
            'first_name': 'Abelaoued', 
            'last_name': 'User',
            'password': 'R7#tN5$wX2@kM9'
        },
        {
            'username': 'saitatmane',
            'first_name': 'Saitatmane',
            'last_name': 'User', 
            'password': 'H4#jF8$qZ6@bP3'
        }
    ]
    
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
