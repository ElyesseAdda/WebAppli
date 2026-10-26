#!/usr/bin/env python3
"""
Script de test pour vérifier le fix de numérotation des devis.
"""
import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Application.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

django.setup()

from django.db import transaction
from api.numero_documents import (
    peek_devis_numero,
    claim_devis_numero,
    peek_facture_numero,
    claim_facture_numero,
    format_devis_numero,
)
from api.models import Devis, Facture, Chantier, Societe, Client
from datetime import datetime

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

def print_test(name):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}Test: {name}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.RESET}")

def print_success(msg):
    print(f"{Colors.GREEN}✓ {msg}{Colors.RESET}")

def print_error(msg):
    print(f"{Colors.RED}✗ {msg}{Colors.RESET}")

def print_info(msg):
    print(f"{Colors.YELLOW}ℹ {msg}{Colors.RESET}")

def test_1_devis_numero_basic():
    """Test 1: Vérifier que le numéro peek est celui qui est enregistré"""
    print_test("Test 1 - Numéro peek = numéro enregistré")
    
    try:
        year = datetime.now().year
        
        # Simuler le comportement frontend: récupérer le prochain numéro
        peek_result = peek_devis_numero(is_ts=False, chantier_id=None, year=year)
        numero_peek = peek_result['numero']
        print_info(f"Numéro obtenu par peek: {numero_peek}")
        
        # Simuler le comportement backend: réserver ce numéro
        numero_claim = claim_devis_numero(numero_peek, is_ts=False, chantier_id=None, year=year)
        print_info(f"Numéro réservé par claim: {numero_claim}")
        
        # Vérifier qu'ils sont identiques
        if numero_peek == numero_claim:
            print_success(f"Le numéro peek correspond au numéro claim: {numero_peek}")
            return True
        else:
            print_error(f"ÉCHEC: peek={numero_peek} != claim={numero_claim}")
            return False
            
    except Exception as e:
        print_error(f"Erreur lors du test: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_2_devis_numero_manual_edit():
    """Test 2: Vérifier qu'un numéro édité manuellement est accepté"""
    print_test("Test 2 - Édition manuelle du numéro")
    
    try:
        year = datetime.now().year
        
        # Obtenir le prochain numéro normal
        peek_result = peek_devis_numero(is_ts=False, chantier_id=None, year=year)
        sequence_normal = int(peek_result['sequence'])
        print_info(f"Séquence normale attendue: {sequence_normal}")
        
        # Simuler une édition manuelle: utiliser une séquence plus élevée
        sequence_manuelle = sequence_normal + 5
        numero_manuel = format_devis_numero(sequence_manuelle, year)
        print_info(f"Numéro édité manuellement: {numero_manuel}")
        
        # Essayer de réserver ce numéro manuel
        numero_claim = claim_devis_numero(numero_manuel, is_ts=False, chantier_id=None, year=year)
        print_info(f"Numéro réservé: {numero_claim}")
        
        # Vérifier que le numéro manuel a été respecté
        if numero_manuel == numero_claim:
            print_success(f"Le numéro manuel a été accepté: {numero_manuel}")
            return True
        else:
            print_error(f"ÉCHEC: Le numéro manuel n'a pas été respecté")
            print_error(f"  Demandé: {numero_manuel}")
            print_error(f"  Obtenu:  {numero_claim}")
            return False
            
    except Exception as e:
        print_error(f"Erreur lors du test: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_3_facture_numero():
    """Test 3: Vérifier le même comportement pour les factures"""
    print_test("Test 3 - Numérotation des factures")
    
    try:
        year = datetime.now().year
        
        # Obtenir le prochain numéro
        peek_result = peek_facture_numero(year=year)
        numero_peek = peek_result['numero']
        print_info(f"Numéro de facture obtenu par peek: {numero_peek}")
        
        # Réserver ce numéro
        numero_claim = claim_facture_numero(numero_peek, year=year)
        print_info(f"Numéro de facture réservé: {numero_claim}")
        
        # Vérifier qu'ils sont identiques
        if numero_peek == numero_claim:
            print_success(f"Le numéro de facture peek correspond au claim: {numero_peek}")
            return True
        else:
            print_error(f"ÉCHEC: peek={numero_peek} != claim={numero_claim}")
            return False
            
    except Exception as e:
        print_error(f"Erreur lors du test: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_4_race_condition():
    """Test 4: Simuler une race condition entre deux créations"""
    print_test("Test 4 - Race condition (deux créations simultanées)")
    
    try:
        year = datetime.now().year
        
        # Les deux utilisateurs récupèrent le même numéro
        peek_1 = peek_devis_numero(is_ts=False, chantier_id=None, year=year)
        numero_peek_1 = peek_1['numero']
        print_info(f"Utilisateur 1 obtient: {numero_peek_1}")
        
        peek_2 = peek_devis_numero(is_ts=False, chantier_id=None, year=year)
        numero_peek_2 = peek_2['numero']
        print_info(f"Utilisateur 2 obtient: {numero_peek_2}")
        
        if numero_peek_1 != numero_peek_2:
            print_error(f"ATTENTION: Les deux peek ont donné des numéros différents")
            print_error(f"Cela peut arriver si un devis a été créé entre les deux appels")
        
        # Le premier utilisateur enregistre son devis
        numero_claim_1 = claim_devis_numero(numero_peek_1, is_ts=False, chantier_id=None, year=year)
        print_info(f"Utilisateur 1 réserve: {numero_claim_1}")
        
        # Le deuxième utilisateur essaie d'enregistrer avec le même numéro
        numero_claim_2 = claim_devis_numero(numero_peek_2, is_ts=False, chantier_id=None, year=year)
        print_info(f"Utilisateur 2 réserve: {numero_claim_2}")
        
        # Les numéros doivent être différents
        if numero_claim_1 != numero_claim_2:
            print_success(f"Les deux utilisateurs ont obtenu des numéros différents")
            print_success(f"  Utilisateur 1: {numero_claim_1}")
            print_success(f"  Utilisateur 2: {numero_claim_2}")
            return True
        else:
            print_error(f"ÉCHEC: Les deux utilisateurs ont le même numéro: {numero_claim_1}")
            return False
            
    except Exception as e:
        print_error(f"Erreur lors du test: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_5_devis_ts():
    """Test 5: Vérifier les devis avec TS (Travaux Supplémentaires)"""
    print_test("Test 5 - Devis avec Travaux Supplémentaires (TS)")
    
    try:
        year = datetime.now().year
        
        # Trouver ou créer un chantier pour le test
        chantier = Chantier.objects.first()
        if not chantier:
            print_info("Aucun chantier trouvé, création d'un chantier de test...")
            # Créer un client et une société pour le test
            client = Client.objects.first()
            if not client:
                client = Client.objects.create(
                    name="Client",
                    surname="Test",
                    client_mail="test@test.com"
                )
            societe = Societe.objects.first()
            if not societe:
                societe = Societe.objects.create(
                    nom_societe="Société Test",
                    client_name=client,
                    ville_societe="Paris",
                    rue_societe="1 rue Test",
                    codepostal_societe="75001"
                )
            chantier = Chantier.objects.create(
                chantier_name="Chantier Test TS",
                societe=societe,
                ville="Paris",
                rue="1 rue Test",
                code_postal="75001"
            )
        
        chantier_id = chantier.id
        print_info(f"Chantier utilisé: ID={chantier_id}, Nom={chantier.chantier_name}")
        
        # Obtenir un numéro TS
        peek_result = peek_devis_numero(is_ts=True, chantier_id=chantier_id, year=year)
        numero_peek = peek_result['numero']
        print_info(f"Numéro TS obtenu par peek: {numero_peek}")
        
        # Réserver ce numéro TS
        numero_claim = claim_devis_numero(numero_peek, is_ts=True, chantier_id=chantier_id, year=year)
        print_info(f"Numéro TS réservé: {numero_claim}")
        
        # Vérifier qu'ils sont identiques
        if numero_peek == numero_claim:
            print_success(f"Le numéro TS peek correspond au claim: {numero_peek}")
            return True
        else:
            print_error(f"ÉCHEC: peek={numero_peek} != claim={numero_claim}")
            return False
            
    except Exception as e:
        print_error(f"Erreur lors du test: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Exécuter tous les tests"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}TESTS DE NUMÉROTATION DES DOCUMENTS{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.RESET}")
    
    results = []
    
    # Test 1: Numéro de base
    results.append(("Test 1 - Numéro peek = claim", test_1_devis_numero_basic()))
    
    # Test 2: Édition manuelle
    results.append(("Test 2 - Édition manuelle", test_2_devis_numero_manual_edit()))
    
    # Test 3: Factures
    results.append(("Test 3 - Factures", test_3_facture_numero()))
    
    # Test 4: Race condition
    results.append(("Test 4 - Race condition", test_4_race_condition()))
    
    # Test 5: Devis TS
    results.append(("Test 5 - Devis TS", test_5_devis_ts()))
    
    # Afficher le résumé
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}RÉSUMÉ DES TESTS{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.RESET}\n")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        if result:
            print_success(f"{name}")
        else:
            print_error(f"{name}")
    
    print(f"\n{Colors.BOLD}Résultat: {passed}/{total} tests réussis{Colors.RESET}")
    
    if passed == total:
        print(f"\n{Colors.GREEN}{Colors.BOLD}✓ TOUS LES TESTS SONT PASSÉS !{Colors.RESET}\n")
        return 0
    else:
        print(f"\n{Colors.RED}{Colors.BOLD}✗ CERTAINS TESTS ONT ÉCHOUÉ{Colors.RESET}\n")
        return 1

if __name__ == '__main__':
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print_error("\nTests interrompus par l'utilisateur")
        sys.exit(1)
    except Exception as e:
        print_error(f"Erreur critique: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
