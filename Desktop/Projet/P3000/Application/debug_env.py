#!/usr/bin/env python3
"""
Script pour déboguer les variables d'environnement CSRF
"""
import os
from pathlib import Path

# Charger le fichier .env manuellement
def load_env_file():
    """Charge les variables d'environnement depuis le fichier .env"""
    env_file = Path('.env')
    if env_file.exists():
        with open(env_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key.strip()] = value.strip().strip('"').strip("'")

# Charger le fichier .env
load_env_file()

print("🔍 Debug des variables d'environnement CSRF:")
print("=" * 50)

# Vérifier les variables CSRF
csrf_vars = [
    'CSRF_COOKIE_SECURE',
    'SESSION_COOKIE_SECURE',
    'CSRF_TRUSTED_ORIGINS',
    'CORS_ALLOWED_ORIGINS',
    'DEBUG'
]

for var in csrf_vars:
    value = os.getenv(var, 'NON_DÉFINI')
    print(f"{var}: {value} (type: {type(value)})")

print("\n" + "=" * 50)

# Test de la logique de settings.py
print("\n🧪 Test de la logique settings.py:")
print("=" * 50)

csrf_cookie_secure = os.getenv('CSRF_COOKIE_SECURE', 'False').lower() == 'true'
session_cookie_secure = os.getenv('SESSION_COOKIE_SECURE', 'False').lower() == 'true'

print(f"CSRF_COOKIE_SECURE (calculé): {csrf_cookie_secure}")
print(f"SESSION_COOKIE_SECURE (calculé): {session_cookie_secure}")

print("\n" + "=" * 50)
