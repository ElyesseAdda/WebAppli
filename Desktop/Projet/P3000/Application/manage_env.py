#!/usr/bin/env python3
"""
Script de gestion des environnements P3000
Permet de basculer facilement entre les environnements local et production
"""

import os
import sys
import shutil
import subprocess
from pathlib import Path

def print_banner():
    """Affiche la bannière du script"""
    print("=" * 60)
    print("🚀 Gestionnaire d'environnements P3000")
    print("=" * 60)

def get_current_env():
    """Détermine l'environnement actuel"""
    env_file = Path(".env")
    if not env_file.exists():
        return "aucun"
    
    content = env_file.read_text()
    if "DEBUG=True" in content:
        return "local"
    elif "DEBUG=False" in content:
        return "production"
    else:
        return "inconnu"

def switch_to_local():
    """Bascule vers l'environnement local"""
    print("🔄 Basculement vers l'environnement LOCAL...")
    
    env_local = Path("env.local")
    env_file = Path(".env")
    
    if not env_local.exists():
        print("❌ Fichier env.local non trouvé")
        return False
    
    # Sauvegarder l'ancien fichier .env
    if env_file.exists():
        backup_file = Path(f".env.backup.{get_current_env()}")
        shutil.copy(env_file, backup_file)
        print(f"💾 Sauvegarde de l'ancien .env vers {backup_file}")
    
    # Copier le fichier local
    shutil.copy(env_local, env_file)
    print("✅ Environnement local activé")
    
    # Définir la variable d'environnement
    os.environ['DJANGO_ENV'] = 'local'
    
    return True

def switch_to_production():
    """Bascule vers l'environnement de production"""
    print("🔄 Basculement vers l'environnement PRODUCTION...")
    
    env_prod = Path("env.production")
    env_file = Path(".env")
    
    if not env_prod.exists():
        print("❌ Fichier env.production non trouvé")
        return False
    
    # Sauvegarder l'ancien fichier .env
    if env_file.exists():
        backup_file = Path(f".env.backup.{get_current_env()}")
        shutil.copy(env_file, backup_file)
        print(f"💾 Sauvegarde de l'ancien .env vers {backup_file}")
    
    # Copier le fichier de production
    shutil.copy(env_prod, env_file)
    print("✅ Environnement de production activé")
    
    # Définir la variable d'environnement
    os.environ['DJANGO_ENV'] = 'production'
    
    return True

def run_django_command(command):
    """Exécute une commande Django"""
    print(f"🔄 Exécution: {command}")
    try:
        result = subprocess.run(command, shell=True, check=True)
        print(f"✅ Commande exécutée avec succès")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Erreur lors de l'exécution: {e}")
        return False

def show_status():
    """Affiche le statut de l'environnement actuel"""
    current_env = get_current_env()
    print(f"📊 Environnement actuel: {current_env.upper()}")
    
    if current_env != "aucun":
        env_file = Path(".env")
        content = env_file.read_text()
        
        # Extraire quelques informations importantes
        debug_line = [line for line in content.split('\n') if line.startswith('DEBUG=')]
        db_line = [line for line in content.split('\n') if line.startswith('DATABASE_URL=')]
        
        if debug_line:
            print(f"🔧 DEBUG: {debug_line[0]}")
        if db_line:
            db_url = db_line[0].split('=')[1]
            if 'p3000db_local' in db_url:
                print("🗄️ Base de données: LOCALE")
            elif 'p3000db_prod' in db_url:
                print("🗄️ Base de données: PRODUCTION")
            else:
                print("🗄️ Base de données: AUTRE")

def setup_environment(env_type):
    """Configure un environnement complet"""
    if env_type == "local":
        script_path = Path("scripts/setup_local_env.py")
        if script_path.exists():
            print("🚀 Configuration de l'environnement local...")
            return subprocess.run([sys.executable, str(script_path)], check=True)
        else:
            print("❌ Script de configuration local non trouvé")
            return False
    elif env_type == "production":
        script_path = Path("scripts/setup_production_env.py")
        if script_path.exists():
            print("🚀 Configuration de l'environnement de production...")
            return subprocess.run([sys.executable, str(script_path)], check=True)
        else:
            print("❌ Script de configuration production non trouvé")
            return False

def show_help():
    """Affiche l'aide du script"""
    print("""
📖 Utilisation du gestionnaire d'environnements P3000:

Commandes disponibles:
  local          - Bascule vers l'environnement local
  production     - Bascule vers l'environnement de production
  status         - Affiche le statut de l'environnement actuel
  setup-local    - Configure complètement l'environnement local
  setup-prod     - Configure complètement l'environnement de production
  migrate        - Exécute les migrations Django
  collectstatic  - Collecte les fichiers statiques
  runserver      - Lance le serveur de développement
  help           - Affiche cette aide

Exemples:
  python manage_env.py local
  python manage_env.py production
  python manage_env.py setup-local
  python manage_env.py migrate
""")

def main():
    """Fonction principale"""
    print_banner()
    
    if len(sys.argv) < 2:
        show_status()
        print("\n💡 Utilisez 'python manage_env.py help' pour voir toutes les commandes")
        return
    
    command = sys.argv[1].lower()
    
    if command == "local":
        switch_to_local()
    elif command == "production":
        switch_to_production()
    elif command == "status":
        show_status()
    elif command == "setup-local":
        setup_environment("local")
    elif command == "setup-prod":
        setup_environment("production")
    elif command == "migrate":
        run_django_command("python manage.py migrate")
    elif command == "collectstatic":
        run_django_command("python manage.py collectstatic --noinput")
    elif command == "runserver":
        run_django_command("python manage.py runserver")
    elif command == "help":
        show_help()
    else:
        print(f"❌ Commande inconnue: {command}")
        show_help()

if __name__ == "__main__":
    main()
