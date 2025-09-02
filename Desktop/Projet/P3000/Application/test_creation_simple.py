#!/usr/bin/env python
"""
Script de test simplifié pour la création automatique des dossiers S3
Teste uniquement la création automatique (sans transformation complexe)
"""

import os
import sys
import django
from datetime import datetime

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Application.settings')
django.setup()

from api.models import Societe, AppelOffres, Chantier
from api.drive_automation import drive_automation
from api.utils import list_s3_folders, list_s3_folder_content

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

def test_1_creation_societe():
    """Test 1: Création d'une société de test"""
    print_header("TEST 1: Création d'une société de test")
    
    try:
        # Créer une société de test
        societe = Societe.objects.create(
            nom_societe="Société Test Simple",
            ville_societe="Ville Test",
            rue_societe="Rue Test",
            codepostal_societe="12345",
            client_name_id=1  # Assurez-vous qu'un client existe
        )
        
        print_test_result(
            "Création société", 
            True, 
            f"Société créée: {societe.nom_societe} (ID: {societe.id})"
        )
        
        return societe
        
    except Exception as e:
        print_test_result(
            "Création société", 
            False, 
            f"Erreur: {str(e)}"
        )
        return None

def test_2_creation_appel_offres():
    """Test 2: Création d'un appel d'offres (déclenche la création automatique des dossiers S3)"""
    print_header("TEST 2: Création d'un appel d'offres")
    
    try:
        # Récupérer la société créée
        societe = Societe.objects.filter(nom_societe="Société Test Simple").first()
        if not societe:
            print_test_result(
                "Création appel d'offres", 
                False, 
                "Société de test non trouvée"
            )
            return None
        
        # Créer un appel d'offres
        appel_offres = AppelOffres.objects.create(
            chantier_name="Appel d'offres Test Simple",
            societe=societe,
            ville="Ville Test",
            rue="Rue Test",
            code_postal="12345",
            statut='en_attente'
        )
        
        print_test_result(
            "Création appel d'offres", 
            True, 
            f"Appel d'offres créé: {appel_offres.chantier_name} (ID: {appel_offres.id})"
        )
        
        # Attendre un peu pour que les signaux se déclenchent
        import time
        time.sleep(2)
        
        return appel_offres
        
    except Exception as e:
        print_test_result(
            "Création appel d'offres", 
            False, 
            f"Erreur: {str(e)}"
        )
        return None

def test_3_verification_dossiers_appel_offres():
    """Test 3: Vérification que les dossiers S3 ont été créés automatiquement"""
    print_header("TEST 3: Vérification des dossiers S3 créés automatiquement")
    
    try:
        # Récupérer l'appel d'offres créé
        appel_offres = AppelOffres.objects.filter(chantier_name="Appel d'offres Test Simple").first()
        if not appel_offres:
            print_test_result(
                "Vérification dossiers", 
                False, 
                "Appel d'offres de test non trouvé"
            )
            return False
        
        # Construire le chemin attendu
        expected_path = f"Appels_Offres/socit-test-simple/{appel_offres.id:03d}_appel-doffres-test-simple"
        
        # Vérifier que le dossier existe dans S3
        all_folders = list_s3_folders('')
        folder_exists = any(folder['path'] == expected_path for folder in all_folders)
        
        print_test_result(
            "Dossier principal créé", 
            folder_exists, 
            f"Chemin attendu: {expected_path}"
        )
        
        if folder_exists:
            # Vérifier le contenu du dossier
            content = list_s3_folder_content(expected_path)
            subfolders_created = len(content['folders']) > 0
            
            print_test_result(
                "Sous-dossiers créés", 
                subfolders_created, 
                f"Nombre de sous-dossiers: {len(content['folders'])}"
            )
            
            # Afficher les sous-dossiers créés
            if content['folders']:
                print("\n📁 Sous-dossiers créés:")
                for folder in content['folders']:
                    print(f"   📁 {folder['name']}")
            
            return folder_exists and subfolders_created
        else:
            return False
        
    except Exception as e:
        print_test_result(
            "Vérification dossiers", 
            False, 
            f"Erreur: {str(e)}"
        )
        return False

def test_4_creation_chantier_direct():
    """Test 4: Création directe d'un chantier (teste la création automatique des dossiers chantier)"""
    print_header("TEST 4: Création directe d'un chantier")
    
    try:
        # Récupérer la société
        societe = Societe.objects.filter(nom_societe="Société Test Simple").first()
        if not societe:
            print_test_result(
                "Création chantier", 
                False, 
                "Société de test non trouvée"
            )
            return None
        
        # Créer un chantier directement
        chantier = Chantier.objects.create(
            chantier_name="Chantier Test Simple",
            societe=societe,
            ville="Ville Test",
            rue="Rue Test",
            code_postal="12345"
        )
        
        print_test_result(
            "Création chantier", 
            True, 
            f"Chantier créé: {chantier.chantier_name} (ID: {chantier.id})"
        )
        
        # Attendre un peu pour que les signaux se déclenchent
        import time
        time.sleep(2)
        
        return chantier
        
    except Exception as e:
        print_test_result(
            "Création chantier", 
            False, 
            f"Erreur: {str(e)}"
        )
        return None

def test_5_verification_dossiers_chantier():
    """Test 5: Vérification des dossiers S3 du chantier créés automatiquement"""
    print_header("TEST 5: Vérification des dossiers S3 du chantier")
    
    try:
        # Récupérer le chantier créé
        chantier = Chantier.objects.filter(chantier_name="Chantier Test Simple").first()
        if not chantier:
            print_test_result(
                "Vérification dossiers chantier", 
                False, 
                "Chantier de test non trouvé"
            )
            return False
        
        # Construire le chemin attendu du chantier (utilise maintenant "Sociétés")
        expected_chantier_path = f"Sociétés/socit-test-simple/chantier-test-simple"
        
        # Vérifier que le dossier chantier existe
        all_folders = list_s3_folders('')
        chantier_folder_exists = any(folder['path'] == expected_chantier_path for folder in all_folders)
        
        print_test_result(
            "Dossier chantier créé", 
            chantier_folder_exists, 
            f"Chemin attendu: {expected_chantier_path}"
        )
        
        if chantier_folder_exists:
            # Vérifier le contenu du dossier chantier
            content = list_s3_folder_content(expected_chantier_path)
            subfolders_created = len(content['folders']) > 0
            
            print_test_result(
                "Sous-dossiers chantier créés", 
                subfolders_created, 
                f"Nombre de sous-dossiers: {len(content['folders'])}"
            )
            
            # Afficher les sous-dossiers créés
            if content['folders']:
                print("\n📁 Sous-dossiers du chantier:")
                for folder in content['folders']:
                    print(f"   📁 {folder['name']}")
            
            return chantier_folder_exists and subfolders_created
        else:
            return False
        
    except Exception as e:
        print_test_result(
            "Vérification dossiers chantier", 
            False, 
            f"Erreur: {str(e)}"
        )
        return False

def test_6_nettoyage():
    """Test 6: Nettoyage des données de test"""
    print_header("TEST 6: Nettoyage des données de test")
    
    try:
        # Supprimer le chantier
        chantier = Chantier.objects.filter(chantier_name="Chantier Test Simple").first()
        if chantier:
            chantier.delete()
            print_test_result(
                "Suppression chantier", 
                True, 
                "Chantier supprimé"
            )
        
        # Supprimer l'appel d'offres
        appel_offres = AppelOffres.objects.filter(chantier_name="Appel d'offres Test Simple").first()
        if appel_offres:
            appel_offres.delete()
            print_test_result(
                "Suppression appel d'offres", 
                True, 
                "Appel d'offres supprimé"
            )
        
        # Supprimer la société
        societe = Societe.objects.filter(nom_societe="Société Test Simple").first()
        if societe:
            societe.delete()
            print_test_result(
                "Suppression société", 
                True, 
                "Société supprimée"
            )
        
        return True
        
    except Exception as e:
        print_test_result(
            "Nettoyage", 
            False, 
            f"Erreur: {str(e)}"
        )
        return False

def main():
    """Fonction principale de test"""
    print("🚀 DÉMARRAGE DES TESTS SIMPLIFIÉS DE CRÉATION AUTOMATIQUE DES DOSSIERS S3")
    print(f"⏰ Heure de début: {datetime.now().strftime('%H:%M:%S')}")
    
    # Exécuter tous les tests
    test_results = []
    
    # Test 1: Création société
    societe = test_1_creation_societe()
    test_results.append(societe is not None)
    
    # Test 2: Création appel d'offres
    appel_offres = test_2_creation_appel_offres()
    test_results.append(appel_offres is not None)
    
    # Test 3: Vérification dossiers appel d'offres
    test_results.append(test_3_verification_dossiers_appel_offres())
    
    # Test 4: Création chantier direct
    chantier = test_4_creation_chantier_direct()
    test_results.append(chantier is not None)
    
    # Test 5: Vérification dossiers chantier
    test_results.append(test_5_verification_dossiers_chantier())
    
    # Test 6: Nettoyage
    test_results.append(test_6_nettoyage())
    
    # Résumé final
    print_header("RÉSUMÉ FINAL")
    passed_tests = sum(test_results)
    total_tests = len(test_results)
    
    print(f"📊 Résultats des tests simplifiés:")
    print(f"   ✅ Tests réussis: {passed_tests}/{total_tests}")
    print(f"   ❌ Tests échoués: {total_tests - passed_tests}/{total_tests}")
    
    if passed_tests == total_tests:
        print("🎉 TOUS LES TESTS SONT PASSÉS ! La création automatique des dossiers S3 fonctionne parfaitement !")
        print("🚀 Votre système est prêt pour la production !")
    else:
        print("⚠️  Certains tests ont échoué. Vérifiez les erreurs ci-dessus.")
        print("🔧 Vérifiez la configuration AWS S3 et les signaux Django.")
    
    print(f"⏰ Heure de fin: {datetime.now().strftime('%H:%M:%S')}")
    
    return passed_tests == total_tests

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
