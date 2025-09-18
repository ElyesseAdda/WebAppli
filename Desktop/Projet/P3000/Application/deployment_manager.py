#!/usr/bin/env python3
"""
Gestionnaire de déploiement pour P3000
Gère les versions, sauvegardes et rollbacks
"""

import os
import json
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path

class DeploymentManager:
    def __init__(self, project_dir=".", backup_dir="/var/backups/p3000"):
        self.project_dir = Path(project_dir)
        self.backup_dir = Path(backup_dir)
        self.deployment_log = self.project_dir / "deployment_history.json"
        
        # Créer les répertoires nécessaires
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialiser le log de déploiement
        if not self.deployment_log.exists():
            self.save_deployment_log([])
    
    def save_deployment_log(self, deployments):
        """Sauvegarde l'historique des déploiements"""
        with open(self.deployment_log, 'w') as f:
            json.dump(deployments, f, indent=2, default=str)
    
    def load_deployment_log(self):
        """Charge l'historique des déploiements"""
        try:
            with open(self.deployment_log, 'r') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return []
    
    def create_backup(self, version):
        """Crée une sauvegarde de la version actuelle"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_name = f"backup_{version}_{timestamp}"
        backup_path = self.backup_dir / backup_name
        
        print(f"🔄 Création de la sauvegarde: {backup_name}")
        
        # Créer le répertoire de sauvegarde
        backup_path.mkdir(parents=True, exist_ok=True)
        
        # Sauvegarder les fichiers statiques
        staticfiles_path = self.project_dir / "staticfiles"
        if staticfiles_path.exists():
            shutil.copytree(staticfiles_path, backup_path / "staticfiles")
            print("✅ Fichiers statiques sauvegardés")
        
        # Sauvegarder les templates
        templates_path = self.project_dir / "frontend" / "templates"
        if templates_path.exists():
            shutil.copytree(templates_path, backup_path / "templates")
            print("✅ Templates sauvegardés")
        
        # Sauvegarder le manifest
        manifest_path = self.project_dir / "staticfiles" / "staticfiles.json"
        if manifest_path.exists():
            shutil.copy2(manifest_path, backup_path / "staticfiles.json")
            print("✅ Manifest sauvegardé")
        
        return backup_name
    
    def rollback_to_version(self, version):
        """Effectue un rollback vers une version spécifique"""
        deployments = self.load_deployment_log()
        
        # Trouver la version cible
        target_deployment = None
        for deployment in deployments:
            if deployment['version'] == version:
                target_deployment = deployment
                break
        
        if not target_deployment:
            print(f"❌ Version {version} non trouvée")
            return False
        
        backup_name = target_deployment['backup_name']
        backup_path = self.backup_dir / backup_name
        
        if not backup_path.exists():
            print(f"❌ Sauvegarde {backup_name} non trouvée")
            return False
        
        print(f"🔄 Rollback vers la version {version}")
        
        # Restaurer les fichiers statiques
        if (backup_path / "staticfiles").exists():
            if (self.project_dir / "staticfiles").exists():
                shutil.rmtree(self.project_dir / "staticfiles")
            shutil.copytree(backup_path / "staticfiles", self.project_dir / "staticfiles")
            print("✅ Fichiers statiques restaurés")
        
        # Restaurer les templates
        if (backup_path / "templates").exists():
            templates_path = self.project_dir / "frontend" / "templates"
            if templates_path.exists():
                shutil.rmtree(templates_path)
            shutil.copytree(backup_path / "templates", templates_path)
            print("✅ Templates restaurés")
        
        # Redémarrer les services
        print("🔄 Redémarrage des services...")
        subprocess.run(["systemctl", "restart", "gunicorn"], check=True)
        subprocess.run(["systemctl", "restart", "nginx"], check=True)
        print("✅ Services redémarrés")
        
        print(f"✅ Rollback vers la version {version} terminé")
        return True
    
    def list_versions(self):
        """Affiche la liste des versions disponibles"""
        deployments = self.load_deployment_log()
        
        if not deployments:
            print("📋 Aucun déploiement trouvé")
            return
        
        print("📋 Versions disponibles:")
        print("=" * 50)
        
        for deployment in sorted(deployments, key=lambda x: x['timestamp'], reverse=True):
            status = "🟢" if deployment.get('status') == 'success' else "🔴"
            print(f"{status} Version: {deployment['version']}")
            print(f"   Date: {deployment['timestamp']}")
            print(f"   Sauvegarde: {deployment['backup_name']}")
            print()
    
    def deploy_version(self, version):
        """Déploie une nouvelle version"""
        print(f"🚀 Déploiement de la version {version}")
        
        # Créer une sauvegarde
        backup_name = self.create_backup(version)
        
        # Exécuter le build React
        print("🔄 Build React...")
        subprocess.run(["cd", "frontend", "&&", "npm", "run", "build"], 
                      shell=True, check=True, cwd=self.project_dir)
        
        # Exécuter collectstatic
        print("🔄 Collectstatic...")
        subprocess.run(["python", "manage.py", "collectstatic", "--noinput"], 
                      check=True, cwd=self.project_dir)
        
        # Redémarrer les services
        print("🔄 Redémarrage des services...")
        subprocess.run(["systemctl", "restart", "gunicorn"], check=True)
        subprocess.run(["systemctl", "restart", "nginx"], check=True)
        
        # Enregistrer le déploiement
        deployments = self.load_deployment_log()
        deployments.append({
            'version': version,
            'timestamp': datetime.now().isoformat(),
            'backup_name': backup_name,
            'status': 'success'
        })
        self.save_deployment_log(deployments)
        
        print(f"✅ Déploiement de la version {version} terminé")
    
    def cleanup_old_backups(self, keep_count=5):
        """Nettoie les anciennes sauvegardes"""
        deployments = self.load_deployment_log()
        
        # Trier par date et garder seulement les plus récentes
        sorted_deployments = sorted(deployments, 
                                  key=lambda x: x['timestamp'], 
                                  reverse=True)
        
        deployments_to_keep = sorted_deployments[:keep_count]
        deployments_to_remove = sorted_deployments[keep_count:]
        
        for deployment in deployments_to_remove:
            backup_path = self.backup_dir / deployment['backup_name']
            if backup_path.exists():
                shutil.rmtree(backup_path)
                print(f"🗑️  Sauvegarde supprimée: {deployment['backup_name']}")
        
        # Mettre à jour le log
        self.save_deployment_log(deployments_to_keep)
        print(f"✅ Nettoyage terminé, {keep_count} sauvegardes conservées")

def main():
    if len(sys.argv) < 2:
        print("Usage: python deployment_manager.py <command> [args]")
        print("Commands:")
        print("  deploy <version>     - Déployer une version")
        print("  rollback <version>   - Rollback vers une version")
        print("  list                 - Lister les versions")
        print("  cleanup [count]      - Nettoyer les anciennes sauvegardes")
        sys.exit(1)
    
    manager = DeploymentManager()
    command = sys.argv[1]
    
    if command == "deploy":
        if len(sys.argv) < 3:
            print("❌ Version requise pour le déploiement")
            sys.exit(1)
        version = sys.argv[2]
        manager.deploy_version(version)
    
    elif command == "rollback":
        if len(sys.argv) < 3:
            print("❌ Version requise pour le rollback")
            sys.exit(1)
        version = sys.argv[2]
        manager.rollback_to_version(version)
    
    elif command == "list":
        manager.list_versions()
    
    elif command == "cleanup":
        keep_count = int(sys.argv[2]) if len(sys.argv) > 2 else 5
        manager.cleanup_old_backups(keep_count)
    
    else:
        print(f"❌ Commande inconnue: {command}")
        sys.exit(1)

if __name__ == "__main__":
    main()
