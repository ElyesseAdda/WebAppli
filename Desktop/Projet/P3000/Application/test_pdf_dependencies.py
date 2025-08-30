#!/usr/bin/env python3
"""
Script pour tester les dépendances nécessaires à la génération de PDF
"""

import os
import subprocess
import sys

def test_node_js():
    """Test si Node.js est installé et accessible"""
    try:
        result = subprocess.run(['node', '--version'], capture_output=True, text=True, check=True)
        print(f"✅ Node.js est installé: {result.stdout.strip()}")
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("❌ Node.js n'est pas installé ou n'est pas accessible")
        return False

def test_puppeteer():
    """Test si Puppeteer est installé"""
    try:
        # Vérifier si puppeteer est dans node_modules
        puppeteer_path = os.path.join('frontend', 'node_modules', 'puppeteer')
        if os.path.exists(puppeteer_path):
            print("✅ Puppeteer est installé dans node_modules")
            return True
        else:
            print("❌ Puppeteer n'est pas installé dans node_modules")
            return False
    except Exception as e:
        print(f"❌ Erreur lors de la vérification de Puppeteer: {e}")
        return False

def test_scripts():
    """Test si les scripts de génération PDF existent"""
    scripts = [
        'frontend/src/components/generate_pdf.js',
        'frontend/src/components/generate_monthly_agents_pdf.js'
    ]
    
    all_exist = True
    for script in scripts:
        if os.path.exists(script):
            print(f"✅ Script trouvé: {script}")
        else:
            print(f"❌ Script manquant: {script}")
            all_exist = False
    
    return all_exist

def test_permissions():
    """Test les permissions d'écriture dans le dossier components"""
    components_dir = 'frontend/src/components'
    test_file = os.path.join(components_dir, 'test_write.tmp')
    
    try:
        with open(test_file, 'w') as f:
            f.write('test')
        os.remove(test_file)
        print("✅ Permissions d'écriture OK dans le dossier components")
        return True
    except Exception as e:
        print(f"❌ Problème de permissions d'écriture: {e}")
        return False

def test_paths():
    """Test les chemins utilisés dans les vues"""
    import os
    
    # Simuler le calcul de chemin comme dans les vues
    current_dir = os.path.abspath('.')
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath('api/views.py')))
    
    print(f"📁 Répertoire actuel: {current_dir}")
    print(f"📁 Base directory calculé: {base_dir}")
    
    paths_to_test = [
        os.path.join(base_dir, 'frontend', 'src', 'components', 'generate_pdf.js'),
        os.path.join(base_dir, 'frontend', 'src', 'components', 'generate_monthly_agents_pdf.js'),
        os.path.join(base_dir, 'frontend', 'src', 'components', 'planning_hebdo.pdf'),
        os.path.join(base_dir, 'frontend', 'src', 'components', 'monthly_agents_report.pdf')
    ]
    
    for path in paths_to_test:
        if os.path.exists(path):
            print(f"✅ Chemin accessible: {path}")
        else:
            print(f"❌ Chemin inaccessible: {path}")

def main():
    print("🔍 Test des dépendances pour la génération de PDF")
    print("=" * 50)
    
    tests = [
        ("Node.js", test_node_js),
        ("Puppeteer", test_puppeteer),
        ("Scripts", test_scripts),
        ("Permissions", test_permissions),
        ("Chemins", test_paths)
    ]
    
    results = {}
    for test_name, test_func in tests:
        print(f"\n🧪 Test: {test_name}")
        print("-" * 30)
        results[test_name] = test_func()
    
    print("\n" + "=" * 50)
    print("📊 Résumé des tests:")
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name}: {status}")
    
    if all(results.values()):
        print("\n🎉 Tous les tests sont passés ! La génération de PDF devrait fonctionner.")
    else:
        print("\n⚠️  Certains tests ont échoué. Vérifiez les dépendances manquantes.")

if __name__ == "__main__":
    main()
