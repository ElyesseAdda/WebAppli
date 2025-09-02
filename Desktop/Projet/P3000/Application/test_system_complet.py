#!/usr/bin/env python
"""
Script de test complet pour le système Drive
Teste toutes les fonctions de base avec AWS S3 (comme en production)
"""

import os
import sys
import django
import json
from datetime import datetime

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Application.settings')
django.setup()

from api.utils import (
    is_s3_available,
    get_s3_client,
    get_s3_bucket_name,
    create_s3_folder,
    list_s3_folders,
    delete_s3_folder,
    list_s3_folder_content
)

from api.drive_automation import DriveAutomation

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

def test_1_configuration():
    """Test 1: Vérification de la configuration AWS S3"""
    print_header("TEST 1: Configuration AWS S3")
    
    # Test 1.1: Vérifier si S3 est configuré
    s3_available = is_s3_available()
    print_test_result(
        "S3 disponible", 
        s3_available, 
        f"S3 configuré: {s3_available}"
    )
    
    # Test 1.2: Vérifier le client S3
    try:
        s3_client = get_s3_client()
        client_ok = s3_client is not None
        print_test_result(
            "Client S3 créé", 
            client_ok, 
            f"Client S3: {'OK' if client_ok else 'NOK'}"
        )
    except Exception as e:
        print_test_result(
            "Client S3 créé", 
            False, 
            f"Erreur: {str(e)}"
        )
        client_ok = False
    
    # Test 1.3: Vérifier le bucket S3
    try:
        bucket_name = get_s3_bucket_name()
        bucket_ok = bucket_name is not None
        print_test_result(
            "Bucket S3 accessible", 
            bucket_ok, 
            f"Bucket: {bucket_name if bucket_name else 'NON TROUVÉ'}"
        )
    except Exception as e:
        print_test_result(
            "Bucket S3 accessible", 
            False, 
            f"Erreur: {str(e)}"
        )
        bucket_ok = False
    
    return s3_available and client_ok and bucket_ok

def test_2_fonctions_s3():
    """Test 2: Fonctions de base AWS S3"""
    print_header("TEST 2: Fonctions AWS S3")
    
    test_folders = [
        "test_simple",
        "test/nested/folder",
        "test/avec/espaces_et_caracteres_speciaux"
    ]
    
    results = []
    
    # Test 2.1: Création de dossiers S3
    print("📁 Test de création de dossiers S3:")
    for folder in test_folders:
        try:
            success = create_s3_folder(folder)
            results.append(success)
            print_test_result(
                f"Création S3: {folder}", 
                success,
                "Dossier créé avec succès" if success else "Échec de création"
            )
        except Exception as e:
            results.append(False)
            print_test_result(
                f"Création S3: {folder}", 
                False,
                f"Exception: {str(e)}"
            )
    
    # Test 2.2: Listage des dossiers S3
    print("\n📋 Test de listage des dossiers S3:")
    try:
        all_folders = list_s3_folders('')
        print_test_result(
            "Listage complet S3", 
            True,
            f"Nombre de dossiers trouvés: {len(all_folders)}"
        )
        
        # Afficher la structure
        for folder in all_folders:
            print(f"   📁 {folder['name']} -> {folder['path']}")
            
    except Exception as e:
        print_test_result(
            "Listage complet S3", 
            False,
            f"Erreur: {str(e)}"
        )
    
    # Test 2.3: Listage avec préfixe
    print("\n🔍 Test de listage avec préfixe 'test':")
    try:
        test_folders = list_s3_folders('test')
        print_test_result(
            "Listage avec préfixe 'test'", 
            True,
            f"Nombre de dossiers 'test' trouvés: {len(test_folders)}"
        )
        
        for folder in test_folders:
            print(f"   📁 {folder['name']} -> {folder['path']}")
            
    except Exception as e:
        print_test_result(
            "Listage avec préfixe 'test'", 
            False,
            f"Erreur: {str(e)}"
        )
    
    # Test 2.4: Contenu d'un dossier spécifique
    print("\n📂 Test de contenu d'un dossier:")
    try:
        content = list_s3_folder_content('test_simple')
        print_test_result(
            "Contenu dossier 'test_simple'", 
            True,
            f"Dossiers: {len(content['folders'])}, Fichiers: {len(content['files'])}"
        )
        
    except Exception as e:
        print_test_result(
            "Contenu dossier 'test_simple'", 
            False,
            f"Erreur: {str(e)}"
        )
    
    return all(results)

def test_3_drive_automation():
    """Test 3: Fonctions de Drive Automation avec S3"""
    print_header("TEST 3: Drive Automation S3")
    
    try:
        # Créer une instance
        drive = DriveAutomation()
        print_test_result(
            "Création instance DriveAutomation", 
            True,
            "Instance créée avec succès"
        )
        
        # Test 3.1: Création de dossier société
        print("\n🏢 Test création dossier société:")
        try:
            societe_path = drive.create_societe_folder_if_not_exists(
                "Société Test S3", 
                "Chantiers"
            )
            print_test_result(
                "Création dossier société S3", 
                True,
                f"Chemin créé: {societe_path}"
            )
        except Exception as e:
            print_test_result(
                "Création dossier société S3", 
                False,
                f"Erreur: {str(e)}"
            )
        
        # Test 3.2: Création de structure de projet
        print("\n🏗️ Test création structure projet S3:")
        try:
            project_path = drive.create_project_structure(
                "Société Test S3", 
                "Projet Test S3", 
                "Chantiers"
            )
            print_test_result(
                "Création structure projet S3", 
                True,
                f"Chemin créé: {project_path}"
            )
        except Exception as e:
            print_test_result(
                "Création structure projet S3", 
                False,
                f"Erreur: {str(e)}"
            )
        
        return True
        
    except Exception as e:
        print_test_result(
            "Drive Automation S3 global", 
            False,
            f"Erreur générale: {str(e)}"
        )
        return False

def test_4_nettoyage_s3():
    """Test 4: Nettoyage des tests S3"""
    print_header("TEST 4: Nettoyage des tests S3")
    
    test_prefixes = ["test", "Chantiers/Société Test S3"]
    
    for prefix in test_prefixes:
        try:
            folders = list_s3_folders(prefix)
            for folder in folders:
                success = delete_s3_folder(folder['path'])
                print_test_result(
                    f"Suppression S3: {folder['path']}", 
                    success,
                    "Dossier supprimé" if success else "Échec de suppression"
                )
        except Exception as e:
            print_test_result(
                f"Suppression préfixe S3: {prefix}", 
                False,
                f"Erreur: {str(e)}"
            )

def test_5_verification_finale_s3():
    """Test 5: Vérification finale S3"""
    print_header("TEST 5: Vérification finale S3")
    
    try:
        # Vérifier qu'il ne reste que les dossiers de base
        remaining_folders = list_s3_folders('')
        base_folders = [f for f in remaining_folders if not f['path'].startswith('test')]
        
        print_test_result(
            "Nettoyage S3 réussi", 
            len(base_folders) == len(remaining_folders),
            f"Dossiers restants: {len(remaining_folders)} (base: {len(base_folders)})"
        )
        
        # Afficher la structure finale
        print("\n📁 Structure finale S3:")
        for folder in remaining_folders:
            print(f"   📁 {folder['name']} -> {folder['path']}")
            
    except Exception as e:
        print_test_result(
            "Vérification finale S3", 
            False,
            f"Erreur: {str(e)}"
        )

def main():
    """Fonction principale de test"""
    print("🚀 DÉMARRAGE DES TESTS COMPLETS DU SYSTÈME DRIVE (AWS S3)")
    print(f"⏰ Heure de début: {datetime.now().strftime('%H:%M:%S')}")
    print("🌐 Utilisation d'AWS S3 (comme en production)")
    
    # Exécuter tous les tests
    test_results = []
    
    # Test 1: Configuration AWS S3
    test_results.append(test_1_configuration())
    
    # Test 2: Fonctions AWS S3
    test_results.append(test_2_fonctions_s3())
    
    # Test 3: Drive Automation S3
    test_results.append(test_3_drive_automation())
    
    # Test 4: Nettoyage S3
    test_4_nettoyage_s3()
    
    # Test 5: Vérification finale S3
    test_5_verification_finale_s3()
    
    # Résumé final
    print_header("RÉSUMÉ FINAL")
    passed_tests = sum(test_results)
    total_tests = len(test_results)
    
    print(f"📊 Résultats des tests AWS S3:")
    print(f"   ✅ Tests réussis: {passed_tests}/{total_tests}")
    print(f"   ❌ Tests échoués: {total_tests - passed_tests}/{total_tests}")
    
    if passed_tests == total_tests:
        print("🎉 TOUS LES TESTS S3 SONT PASSÉS ! Le système est prêt pour la suite.")
        print("🌐 Votre configuration AWS S3 fonctionne parfaitement !")
    else:
        print("⚠️  Certains tests S3 ont échoué. Vérifiez les erreurs ci-dessus.")
        print("🔧 Vérifiez votre configuration AWS S3 (clés, bucket, permissions)")
    
    print(f"⏰ Heure de fin: {datetime.now().strftime('%H:%M:%S')}")
    
    return passed_tests == total_tests

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
