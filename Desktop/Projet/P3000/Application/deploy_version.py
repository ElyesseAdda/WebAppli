#!/usr/bin/env python3
"""
Script pour générer une version unique à chaque déploiement
Ce script doit être exécuté dans p3000-deploy
"""

import os
import json
import datetime
from pathlib import Path

def generate_deploy_version():
    """Génère une version unique pour le déploiement"""
    
    # Chemin vers le fichier de version
    version_file = Path(__file__).parent / 'deploy_version.json'
    
    # Générer une version basée sur la date/heure actuelle
    now = datetime.datetime.now()
    deploy_id = f"{now.strftime('%Y%m%d_%H%M%S')}_{os.getpid()}"
    
    # Informations de déploiement
    version_data = {
        'version': deploy_id,
        'deploy_date': now.isoformat(),
        'deploy_timestamp': int(now.timestamp()),
        'files_updated': [
            'api/',
            'frontend/',
            'Application/',
            'requirements.txt',
            'package.json'
        ]
    }
    
    # Écrire le fichier de version
    with open(version_file, 'w', encoding='utf-8') as f:
        json.dump(version_data, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Version de déploiement générée: {deploy_id}")
    print(f"📁 Fichier créé: {version_file}")
    
    return deploy_id

if __name__ == "__main__":
    generate_deploy_version()
