#!/usr/bin/env python3
"""
Script simple pour creer des utilisateurs de test pour P3000
Usage: python manage.py shell -c "exec(open('create_users_simple.py').read())"
"""

import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Application.settings')
django.setup()

from django.contrib.auth.models import User

def create_users():
    """Creer des utilisateurs de test"""
    
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
            print(f"L'utilisateur '{username}' existe deja")
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
            print(f"Utilisateur '{username}' cree avec succes")
            
        except Exception as e:
            print(f"Erreur lors de la creation de l'utilisateur '{username}': {str(e)}")
    
    # Afficher le resume
    if created_users:
        print("\n" + "="*50)
        print("UTILISATEURS CREES")
        print("="*50)
        for user in created_users:
            print(f"Nom: {user['name']}")
            print(f"Nom d'utilisateur: {user['username']}")
            print(f"Mot de passe: {user['password']}")
            print()
    
    print("Script termine !")

if __name__ == "__main__":
    create_users()
