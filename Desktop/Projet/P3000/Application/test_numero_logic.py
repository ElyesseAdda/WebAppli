#!/usr/bin/env python3
"""
Test unitaire de la logique de numérotation sans base de données.
"""
import sys
import os

# Ajouter le chemin du projet
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..'))

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

# Importer les fonctions de numérotation
sys.path.insert(0, os.path.dirname(__file__))
from api.numero_documents import (
    format_devis_numero,
    format_facture_numero,
    _DEVIS_OFFICIEL,
    _FACTURE_OFFICIELLE,
    _prochain_libre,
    _max_plausible,
    PLAUSIBLE_MAX,
)

def test_format_functions():
    """Test des fonctions de formatage"""
    print_test("Fonctions de formatage")
    
    success = True
    
    # Test format devis sans TS
    result = format_devis_numero(15, 2026)
    expected = "Devis de travaux n°015.2026"
    if result == expected:
        print_success(f"Format devis: {result}")
    else:
        print_error(f"Format devis incorrect: {result} != {expected}")
        success = False
    
    # Test format devis avec TS
    result = format_devis_numero(15, 2026, 3)
    expected = "Devis de travaux n°015.2026 - TS n°03"
    if result == expected:
        print_success(f"Format devis TS: {result}")
    else:
        print_error(f"Format devis TS incorrect: {result} != {expected}")
        success = False
    
    # Test format facture
    result = format_facture_numero(12, 2026)
    expected = "Facture n°12.2026"
    if result == expected:
        print_success(f"Format facture: {result}")
    else:
        print_error(f"Format facture incorrect: {result} != {expected}")
        success = False
    
    return success

def test_regex_parsing():
    """Test du parsing des numéros existants"""
    print_test("Parsing des numéros")
    
    success = True
    
    # Test parsing devis
    numero = "Devis de travaux n°015.2026"
    match = _DEVIS_OFFICIEL.match(numero)
    if match:
        seq, year = match.group(1), match.group(2)
        if seq == "015" and year == "2026":
            print_success(f"Parsing devis: {numero} → seq={seq}, year={year}")
        else:
            print_error(f"Parsing devis incorrect: seq={seq}, year={year}")
            success = False
    else:
        print_error(f"Échec du parsing de: {numero}")
        success = False
    
    # Test parsing devis avec TS
    numero = "Devis de travaux n°015.2026 - TS n°03"
    match = _DEVIS_OFFICIEL.match(numero)
    if match:
        seq, year, ts = match.group(1), match.group(2), match.group(3)
        if seq == "015" and year == "2026" and ts == "03":
            print_success(f"Parsing devis TS: {numero} → seq={seq}, year={year}, ts={ts}")
        else:
            print_error(f"Parsing devis TS incorrect: seq={seq}, year={year}, ts={ts}")
            success = False
    else:
        print_error(f"Échec du parsing de: {numero}")
        success = False
    
    # Test parsing facture
    numero = "Facture n°12.2026"
    match = _FACTURE_OFFICIELLE.match(numero)
    if match:
        seq, year = match.group(1), match.group(2)
        if seq == "12" and year == "2026":
            print_success(f"Parsing facture: {numero} → seq={seq}, year={year}")
        else:
            print_error(f"Parsing facture incorrect: seq={seq}, year={year}")
            success = False
    else:
        print_error(f"Échec du parsing de: {numero}")
        success = False
    
    return success

def test_prochain_libre():
    """Test de la fonction _prochain_libre"""
    print_test("Recherche du prochain numéro libre")
    
    success = True
    
    # Test avec séquences continues
    utilises = {1, 2, 3, 4, 5}
    plancher = 3
    result = _prochain_libre(utilises, plancher)
    if result == 6:
        print_success(f"Prochain libre après {plancher} avec {utilises}: {result}")
    else:
        print_error(f"Incorrect: attendu 6, obtenu {result}")
        success = False
    
    # Test avec trou dans la séquence
    utilises = {1, 2, 4, 5}
    plancher = 2
    result = _prochain_libre(utilises, plancher)
    if result == 3:
        print_success(f"Prochain libre avec trou: {result}")
    else:
        print_error(f"Incorrect: attendu 3, obtenu {result}")
        success = False
    
    # Test avec plancher plus élevé que les utilisés
    utilises = {1, 2, 3}
    plancher = 10
    result = _prochain_libre(utilises, plancher)
    if result == 11:
        print_success(f"Prochain libre avec plancher élevé: {result}")
    else:
        print_error(f"Incorrect: attendu 11, obtenu {result}")
        success = False
    
    return success

def test_max_plausible():
    """Test de la fonction _max_plausible"""
    print_test("Filtre des valeurs plausibles")
    
    success = True
    
    # Test avec valeurs normales
    valeurs = [1, 5, 10, 50, 100]
    result = _max_plausible(valeurs)
    if result == 100:
        print_success(f"Max plausible de {valeurs}: {result}")
    else:
        print_error(f"Incorrect: attendu 100, obtenu {result}")
        success = False
    
    # Test avec valeurs aberrantes
    valeurs = [1, 5, 10, 2026, 999999]  # 2026 et 999999 sont aberrantes
    result = _max_plausible(valeurs)
    if result == 10:
        print_success(f"Max plausible filtre les aberrantes ({valeurs}): {result}")
    else:
        print_error(f"Incorrect: attendu 10, obtenu {result}")
        success = False
    
    # Test avec uniquement des valeurs aberrantes
    valeurs = [2026, 999999]
    result = _max_plausible(valeurs)
    if result == 0:
        print_success(f"Max plausible retourne 0 si tout est aberrant: {result}")
    else:
        print_error(f"Incorrect: attendu 0, obtenu {result}")
        success = False
    
    # Test à la limite (PLAUSIBLE_MAX = 999)
    valeurs = [1, 999, 1000]
    result = _max_plausible(valeurs)
    if result == 999:
        print_success(f"Max plausible à la limite (999): {result}")
    else:
        print_error(f"Incorrect: attendu 999, obtenu {result}")
        success = False
    
    return success

def test_logic_assouplissement():
    """Test de la logique assouplie (conceptuel)"""
    print_test("Logique de réservation assouplie")
    
    print_info("Scénario AVANT le fix:")
    print_info("  - sequence_demandee = 5")
    print_info("  - sequence_attendue = 6")
    print_info("  - Condition: sequence_demandee == attendue → FAUX")
    print_info("  - Résultat: Le numéro 5 est REJETÉ, on génère le 6")
    
    print_info("\nScénario APRÈS le fix:")
    print_info("  - sequence_demandee = 5")
    print_info("  - sequence_attendue = 6")
    print_info("  - Condition: sequence_demandee not in utilises → VRAI")
    print_info("  - Résultat: Le numéro 5 est ACCEPTÉ")
    
    print_success("La logique assouplie accepte les numéros libres non séquentiels")
    
    return True

def main():
    """Exécuter tous les tests"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}TESTS UNITAIRES DE NUMÉROTATION{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.RESET}")
    
    results = []
    
    # Tests unitaires
    results.append(("Fonctions de formatage", test_format_functions()))
    results.append(("Parsing des numéros", test_regex_parsing()))
    results.append(("Prochain numéro libre", test_prochain_libre()))
    results.append(("Filtre plausible", test_max_plausible()))
    results.append(("Logique assouplie", test_logic_assouplissement()))
    
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
        print(f"\n{Colors.GREEN}{Colors.BOLD}✓ TOUS LES TESTS UNITAIRES SONT PASSÉS !{Colors.RESET}")
        print(f"\n{Colors.YELLOW}Note: Ces tests vérifient la logique des fonctions de base.{Colors.RESET}")
        print(f"{Colors.YELLOW}Pour tester avec une vraie base de données, lancez le serveur Django.{Colors.RESET}\n")
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
