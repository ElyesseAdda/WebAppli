#!/usr/bin/env python3
"""
Script pour configurer l'environnement de production
"""

import os
import sys
import subprocess
import shutil
from pathlib import Path

def run_command(command, description):
    """Exécute une commande et affiche le résultat"""
    print(f"🔄 {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} - Succès")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} - Erreur: {e}")
        print(f"Sortie d'erreur: {e.stderr}")
        return False

def setup_production_environment():
    """Configure l'environnement de production"""
    print("🚀 Configuration de l'environnement de production P3000")
    print("=" * 50)
    
    # Vérifier que nous sommes dans le bon répertoire
    if not Path("manage.py").exists():
        print("❌ Erreur: Ce script doit être exécuté depuis la racine du projet")
        sys.exit(1)
    
    # 1. Créer le fichier .env de production
    print("\n📝 Configuration du fichier .env de production...")
    env_prod = Path("env.production")
    env_file = Path(".env")
    
    if env_prod.exists():
        shutil.copy(env_prod, env_file)
        print("✅ Fichier .env créé à partir de env.production")
    else:
        print("❌ Fichier env.production non trouvé")
        return False
    
    # 2. Créer les répertoires nécessaires
    print("\n📁 Création des répertoires...")
    directories = ["logs", "media", "staticfiles"]
    for directory in directories:
        Path(directory).mkdir(exist_ok=True)
        print(f"✅ Répertoire {directory} créé")
    
    # 3. Installer les dépendances de production
    print("\n📦 Installation des dépendances de production...")
    if not run_command("pip install -r requirements.txt", "Installation des dépendances Python"):
        return False
    
    # 4. Vérifier la configuration de la base de données
    print("\n🗄️ Vérification de la base de données de production...")
    
    # Vérifier si PostgreSQL est installé
    if not run_command("psql --version", "Vérification de PostgreSQL"):
        print("❌ PostgreSQL n'est pas installé")
        return False
    
    # Créer la base de données de production
    db_name = "p3000db_prod"
    db_user = "p3000user"
    
    # Créer l'utilisateur si nécessaire
    create_user_cmd = f"psql -c \"CREATE USER {db_user} WITH PASSWORD 'Boumediene30';\" postgres"
    run_command(create_user_cmd, f"Création de l'utilisateur {db_user}")
    
    # Créer la base de données
    create_db_cmd = f"createdb -U {db_user} {db_name}"
    if not run_command(create_db_cmd, f"Création de la base de données {db_name}"):
        print("⚠️ La base de données existe peut-être déjà")
    
    # 5. Exécuter les migrations
    print("\n🔄 Exécution des migrations...")
    if not run_command("python manage.py migrate", "Exécution des migrations Django"):
        return False
    
    # 6. Collecter les fichiers statiques
    print("\n📁 Collecte des fichiers statiques...")
    if not run_command("python manage.py collectstatic --noinput", "Collecte des fichiers statiques"):
        return False
    
    # 7. Vérifier la configuration de sécurité
    print("\n🔒 Vérification de la configuration de sécurité...")
    
    # Vérifier que DEBUG est False
    env_content = env_file.read_text()
    if "DEBUG=True" in env_content:
        print("⚠️ ATTENTION: DEBUG=True détecté dans le fichier .env")
        print("Pour la production, DEBUG doit être False")
    
    # Vérifier que SECRET_KEY est changé
    if "django-insecure" in env_content:
        print("⚠️ ATTENTION: SECRET_KEY par défaut détecté")
        print("Veuillez changer la SECRET_KEY pour la production")
    
    # 8. Créer un superutilisateur si nécessaire
    print("\n👤 Création d'un superutilisateur...")
    print("Veuillez créer un superutilisateur Django pour la production:")
    run_command("python manage.py createsuperuser", "Création du superutilisateur")
    
    # 9. Vérifier les permissions des fichiers
    print("\n🔐 Configuration des permissions...")
    
    # Permissions pour les logs
    run_command("chmod 755 logs", "Configuration des permissions du répertoire logs")
    run_command("chmod 644 logs/*.log", "Configuration des permissions des fichiers de logs")
    
    # Permissions pour les médias
    run_command("chmod 755 media", "Configuration des permissions du répertoire media")
    
    # Permissions pour les fichiers statiques
    run_command("chmod 755 staticfiles", "Configuration des permissions du répertoire staticfiles")
    
    print("\n🎉 Configuration de l'environnement de production terminée!")
    print("\n📋 Prochaines étapes:")
    print("1. Configurer le serveur web (Nginx/Apache)")
    print("2. Configurer Gunicorn ou uWSGI")
    print("3. Configurer les certificats SSL")
    print("4. Configurer les sauvegardes automatiques")
    print("5. Tester l'application en production")
    
    return True

if __name__ == "__main__":
    success = setup_production_environment()
    if not success:
        print("\n❌ Configuration échouée. Veuillez vérifier les erreurs ci-dessus.")
        sys.exit(1)
