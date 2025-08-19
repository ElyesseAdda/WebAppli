#!/usr/bin/env python3
"""
Script pour générer une clé secrète Django sécurisée
"""
import secrets
import string

def generate_secret_key():
    """Génère une clé secrète Django sécurisée"""
    # Caractères autorisés pour Django SECRET_KEY
    chars = string.ascii_letters + string.digits + '!@#$%^&*(-_=+)'
    
    # Générer une clé de 50 caractères minimum
    secret_key = ''.join(secrets.choice(chars) for _ in range(50))
    
    return secret_key

if __name__ == "__main__":
    new_secret_key = generate_secret_key()
    print("🔑 Nouvelle clé secrète générée:")
    print(f"SECRET_KEY={new_secret_key}")
    print("\n📋 Copiez cette ligne dans votre fichier .env")
    print("⚠️  IMPORTANT: Gardez cette clé secrète et ne la partagez jamais!")
