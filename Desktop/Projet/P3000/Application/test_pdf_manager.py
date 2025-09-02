#!/usr/bin/env python
"""
Script de test pour le nouveau système de gestion des PDFs
Teste la génération et le stockage des PDFs dans AWS S3
"""

import os
import sys
import django
from datetime import datetime

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Application.settings')
django.setup()

from api.pdf_manager import pdf_manager
from api.models import Societe, Chantier, AppelOffres

def print_header(title):
    """Affiche un en-tête formaté"""
    print(f"\n{'='*60}")
    print(f"🧪 {title}")
    print(f"{'='*60}")

def print_test_result(test_name, success, details=""):
    """Affiche le résultat d'un test"""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status} {test_name}")
    if details:
        print(f"   📝 {details}")

def test_1_generation_noms_fichiers():
    """Test 1: Génération automatique des noms de fichiers PDF"""
    print_header("TEST 1: Génération automatique des noms de fichiers PDF")
    
    test_cases = [
        {
            'type': 'planning_hebdo',
            'params': {'week': 35, 'year': 2025},
            'expected_pattern': 'planning_semaine_35_2025_'
        },
        {
            'type': 'planning_mensuel',
            'params': {'month': 8, 'year': 2025},
            'expected_pattern': 'planning_aout_2025_'
        },
        {
            'type': 'rapport_agents',
            'params': {'month': 8, 'year': 2025},
            'expected_pattern': 'rapport_agents_aout_2025_'
        },
        {
            'type': 'devis_travaux',
            'params': {'chantier_name': 'Chantier Test', 'chantier_id': 123},
            'expected_pattern': 'devis_travaux_123_chantier-test_'
        },
        {
            'type': 'devis_marche',
            'params': {'appel_offres_name': 'Appel Test', 'appel_offres_id': 456},
            'expected_pattern': 'devis_marche_456_appel-test_'
        }
    ]
    
    all_tests_passed = True
    
    for test_case in test_cases:
        try:
            filename = pdf_manager.generate_pdf_filename(
                test_case['type'], 
                **test_case['params']
            )
            
            # Vérifier que le nom contient le pattern attendu
            pattern_found = test_case['expected_pattern'] in filename
            all_tests_passed = all_tests_passed and pattern_found
            
            print_test_result(
                f"Génération nom {test_case['type']}", 
                pattern_found, 
                f"Nom généré: {filename}"
            )
            
        except Exception as e:
            print_test_result(
                f"Génération nom {test_case['type']}", 
                False, 
                f"Erreur: {str(e)}"
            )
            all_tests_passed = False
    
    return all_tests_passed

def test_2_determination_chemins_s3():
    """Test 2: Détermination automatique des chemins S3"""
    print_header("TEST 2: Détermination automatique des chemins S3")
    
    test_cases = [
        {
            'type': 'planning_hebdo',
            'societe': 'Société Test',
            'params': {'chantier_name': 'Chantier Test'},
            'expected_pattern': 'Sociétés/socit-test/chantier-test/Planning'
        },
        {
            'type': 'devis_travaux',
            'societe': 'Société Test',
            'params': {'chantier_name': 'Chantier Test'},
            'expected_pattern': 'Sociétés/socit-test/chantier-test/Devis'
        },
        {
            'type': 'devis_marche',
            'societe': 'Société Test',
            'params': {'appel_offres_name': 'Appel Test', 'appel_offres_id': 123},
            'expected_pattern': 'Appels_Offres/socit-test/123_appel-test/Devis_Marche'
        },
        {
            'type': 'rapport_agents',
            'societe': 'Société Test',
            'params': {'chantier_name': 'Chantier Test'},
            'expected_pattern': 'Sociétés/socit-test/chantier-test/Documents_Execution'
        }
    ]
    
    all_tests_passed = True
    
    for test_case in test_cases:
        try:
            s3_path = pdf_manager.get_s3_folder_path(
                test_case['type'],
                test_case['societe'],
                **test_case['params']
            )
            
            # Vérifier que le chemin contient le pattern attendu
            pattern_found = test_case['expected_pattern'] in s3_path
            all_tests_passed = all_tests_passed and pattern_found
            
            print_test_result(
                f"Chemin S3 {test_case['type']}", 
                pattern_found, 
                f"Chemin généré: {s3_path}"
            )
            
        except Exception as e:
            print_test_result(
                f"Chemin S3 {test_case['type']}", 
                False, 
                f"Erreur: {str(e)}"
            )
            all_tests_passed = False
    
    return all_tests_passed

def test_3_verification_dependances():
    """Test 3: Vérification des dépendances (Node.js, Puppeteer, scripts)"""
    print_header("TEST 3: Vérification des dépendances")
    
    try:
        deps_ok, error_msg = pdf_manager.check_dependencies()
        
        print_test_result(
            "Vérification dépendances", 
            deps_ok, 
            f"Message: {error_msg if not deps_ok else 'Toutes les dépendances sont OK'}"
        )
        
        return deps_ok
        
    except Exception as e:
        print_test_result(
            "Vérification dépendances", 
            False, 
            f"Erreur: {str(e)}"
        )
        return False

def test_4_simulation_generation_pdf():
    """Test 4: Simulation de la génération et stockage d'un PDF (sans réellement le faire)"""
    print_header("TEST 4: Simulation de la génération et stockage d'un PDF")
    
    try:
        # Simuler les paramètres d'un planning hebdomadaire
        document_type = 'planning_hebdo'
        preview_url = "http://localhost:8000/api/preview-planning-hebdo/?week=35&year=2025"
        societe_name = "Société Test"
        params = {'week': 35, 'year': 2025, 'chantier_name': 'Chantier Test'}
        
        # Générer le nom de fichier
        filename = pdf_manager.generate_pdf_filename(document_type, **params)
        print(f"📄 Nom de fichier généré: {filename}")
        
        # Déterminer le chemin S3
        s3_folder_path = pdf_manager.get_s3_folder_path(document_type, societe_name, **params)
        print(f"📁 Chemin S3 déterminé: {s3_folder_path}")
        
        # Chemin complet du fichier S3
        s3_file_path = f"{s3_folder_path}/{filename}"
        print(f"🚀 Fichier S3 complet: {s3_file_path}")
        
        print_test_result(
            "Simulation génération PDF", 
            True, 
            f"Simulation réussie - Fichier: {s3_file_path}"
        )
        
        return True
        
    except Exception as e:
        print_test_result(
            "Simulation génération PDF", 
            False, 
            f"Erreur: {str(e)}"
        )
        return False

def main():
    """Fonction principale de test"""
    print("🚀 DÉMARRAGE DES TESTS DU SYSTÈME DE GESTION DES PDFs")
    print(f"⏰ Heure de début: {datetime.now().strftime('%H:%M:%S')}")
    
    # Exécuter tous les tests
    test_results = []
    
    # Test 1: Génération des noms de fichiers
    test_results.append(test_1_generation_noms_fichiers())
    
    # Test 2: Détermination des chemins S3
    test_results.append(test_2_determination_chemins_s3())
    
    # Test 3: Vérification des dépendances
    test_results.append(test_3_verification_dependances())
    
    # Test 4: Simulation de génération PDF
    test_results.append(test_4_simulation_generation_pdf())
    
    # Résumé final
    print_header("RÉSUMÉ FINAL")
    passed_tests = sum(test_results)
    total_tests = len(test_results)
    
    print(f"📊 Résultats des tests du système PDF:")
    print(f"   ✅ Tests réussis: {passed_tests}/{total_tests}")
    print(f"   ❌ Tests échoués: {total_tests - passed_tests}/{total_tests}")
    
    if passed_tests == total_tests:
        print("🎉 TOUS LES TESTS SONT PASSÉS ! Le système de gestion des PDFs est prêt !")
        print("🚀 Vous pouvez maintenant modifier vos vues pour utiliser ce système !")
    else:
        print("⚠️  Certains tests ont échoué. Vérifiez les erreurs ci-dessus.")
        print("🔧 Vérifiez la configuration et les dépendances.")
    
    print(f"⏰ Heure de fin: {datetime.now().strftime('%H:%M:%S')}")
    
    return passed_tests == total_tests

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
