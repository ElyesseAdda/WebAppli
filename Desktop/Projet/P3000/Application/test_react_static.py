#!/usr/bin/env python
"""
Script de test pour vérifier le fonctionnement du template tag react_static.
À exécuter depuis la racine du projet Django.
"""

import os
import sys
import django
from pathlib import Path

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Application.settings')
django.setup()

from frontend.templatetags.react_static import _load_manifest, react_static, react_static_exists

def test_manifest_loading():
    """Test du chargement du manifest"""
    print("🔍 Test du chargement du manifest...")
    
    manifest = _load_manifest()
    print(f"   Manifest chargé: {bool(manifest)}")
    print(f"   Structure: {type(manifest)}")
    
    if 'files' in manifest:
        files = manifest['files']
        print(f"   Nombre de fichiers: {len(files)}")
        print(f"   Fichiers trouvés: {list(files.keys())}")
        
        # Afficher quelques exemples
        for key, value in list(files.items())[:3]:
            print(f"   {key} -> {value}")
    else:
        print("   ⚠️ Aucun fichier trouvé dans le manifest")
    
    return manifest

def test_react_static_tag():
    """Test du template tag react_static"""
    print("\n🔗 Test du template tag react_static...")
    
    test_files = ['main.js', 'main.css', 'runtime-main.js', 'vendors~main.js']
    
    for file_path in test_files:
        try:
            url = react_static(file_path)
            exists = react_static_exists(file_path)
            status = "✅" if exists else "⚠️"
            print(f"   {status} {file_path}: {url}")
        except Exception as e:
            print(f"   ❌ {file_path}: Erreur - {e}")

def test_fallback():
    """Test du fallback pour les fichiers non trouvés"""
    print("\n🔄 Test du fallback...")
    
    non_existent_files = ['non-existent.js', 'test.css']
    
    for file_path in non_existent_files:
        try:
            url = react_static(file_path)
            exists = react_static_exists(file_path)
            print(f"   📁 {file_path}: {url} (existe: {exists})")
        except Exception as e:
            print(f"   ❌ {file_path}: Erreur - {e}")

def check_file_structure():
    """Vérifie la structure des fichiers"""
    print("\n📁 Vérification de la structure des fichiers...")
    
    base_dir = Path(__file__).parent
    frontend_static = base_dir / 'frontend' / 'static' / 'frontend'
    manifest_path = frontend_static / 'asset-manifest.json'
    
    print(f"   Répertoire frontend/static/frontend: {'✅' if frontend_static.exists() else '❌'}")
    print(f"   Manifest asset-manifest.json: {'✅' if manifest_path.exists() else '❌'}")
    
    if frontend_static.exists():
        files = list(frontend_static.glob('*'))
        print(f"   Fichiers dans le répertoire: {len(files)}")
        for file in files[:5]:  # Afficher les 5 premiers
            print(f"     - {file.name}")
        if len(files) > 5:
            print(f"     ... et {len(files) - 5} autres fichiers")

def main():
    """Fonction principale de test"""
    print("🚀 Test du template tag react_static")
    print("=" * 50)
    
    try:
        # Vérifier la structure
        check_file_structure()
        
        # Tester le chargement du manifest
        manifest = test_manifest_loading()
        
        # Tester le template tag
        test_react_static_tag()
        
        # Tester le fallback
        test_fallback()
        
        print("\n✅ Tests terminés avec succès!")
        
    except Exception as e:
        print(f"\n❌ Erreur lors des tests: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0

if __name__ == '__main__':
    sys.exit(main())
