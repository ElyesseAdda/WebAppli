#!/usr/bin/env python3
"""
Test de code review - Vérification visuelle des changements dans numero_documents.py
"""
import re

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

def print_test(name):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*70}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{name}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*70}{Colors.RESET}")

def print_success(msg):
    print(f"{Colors.GREEN}✓ {msg}{Colors.RESET}")

def print_error(msg):
    print(f"{Colors.RED}✗ {msg}{Colors.RESET}")

def print_info(msg):
    print(f"{Colors.YELLOW}  {msg}{Colors.RESET}")

def test_claim_devis_numero():
    """Vérifier les changements dans claim_devis_numero"""
    print_test("Test 1: Vérification de claim_devis_numero()")
    
    with open('api/numero_documents.py', 'r') as f:
        content = f.read()
    
    # Chercher la fonction claim_devis_numero
    pattern = r'def claim_devis_numero\(.*?\):(.*?)(?=\ndef\s|\nclass\s|\Z)'
    match = re.search(pattern, content, re.DOTALL)
    
    if not match:
        print_error("Fonction claim_devis_numero non trouvée")
        return False
    
    func_body = match.group(1)
    
    # Vérifier que la condition stricte a été retirée
    strict_check = "sequence_demandee == attendue"
    if strict_check in func_body:
        print_error(f"La condition stricte est toujours présente: {strict_check}")
        return False
    else:
        print_success("La condition stricte 'sequence_demandee == attendue' a été retirée")
    
    # Vérifier que la nouvelle condition assouplie est présente
    new_check = "sequence_demandee is not None"
    if new_check in func_body:
        print_success(f"La nouvelle condition est présente: {new_check}")
    else:
        print_error(f"La nouvelle condition est absente: {new_check}")
        return False
    
    # Vérifier la condition pour les TS
    ts_strict = "ts_demande == ts_attendu"
    if ts_strict in func_body:
        print_error(f"La condition stricte TS est toujours présente: {ts_strict}")
        return False
    else:
        print_success("La condition stricte pour les TS a été assouplie")
    
    # Vérifier la nouvelle condition TS
    ts_new = "ts_demande is not None"
    if ts_new in func_body:
        print_success(f"La nouvelle condition TS est présente: {ts_new}")
    else:
        print_error(f"La nouvelle condition TS est absente: {ts_new}")
        return False
    
    print_info("Code trouvé:")
    # Extraire la partie avec honorer
    honorer_pattern = r'honorer = \((.*?)\)'
    honorer_match = re.search(honorer_pattern, func_body, re.DOTALL)
    if honorer_match:
        print_info(f"\nhonorer = ({honorer_match.group(1).strip()})\n")
    
    return True

def test_reserver_sequence():
    """Vérifier les changements dans _reserver_sequence"""
    print_test("Test 2: Vérification de _reserver_sequence()")
    
    with open('api/numero_documents.py', 'r') as f:
        content = f.read()
    
    # Chercher la fonction _reserver_sequence
    pattern = r'def _reserver_sequence\(.*?\):(.*?)(?=\ndef\s|\nclass\s|\Z)'
    match = re.search(pattern, content, re.DOTALL)
    
    if not match:
        print_error("Fonction _reserver_sequence non trouvée")
        return False
    
    func_body = match.group(1)
    
    # Vérifier que la condition stricte a été retirée
    strict_check = "sequence_demandee == attendue"
    if strict_check in func_body:
        print_error(f"La condition stricte est toujours présente: {strict_check}")
        return False
    else:
        print_success("La condition stricte 'sequence_demandee == attendue' a été retirée")
    
    # Vérifier que le compteur est mis à jour avec max
    max_update = "max(sequence_demandee, compteur.dernier_numero)"
    if max_update in func_body:
        print_success(f"Le compteur est mis à jour avec max(): {max_update}")
    else:
        print_error(f"La mise à jour du compteur avec max() est absente")
        return False
    
    # Extraire le code de la condition
    print_info("\nCode de la condition if:")
    if_pattern = r'if \((.*?)\):\s*#.*?\n\s*compteur\.dernier_numero'
    if_match = re.search(if_pattern, func_body, re.DOTALL)
    if if_match:
        print_info(f"if ({if_match.group(1).strip()}):")
        print_info("    compteur.dernier_numero = max(sequence_demandee, compteur.dernier_numero)")
    
    return True

def test_claim_facture_numero():
    """Vérifier les changements dans claim_facture_numero"""
    print_test("Test 3: Vérification de claim_facture_numero()")
    
    with open('api/numero_documents.py', 'r') as f:
        content = f.read()
    
    # Chercher la fonction claim_facture_numero
    pattern = r'def claim_facture_numero\(.*?\):(.*?)(?=\ndef\s|\nclass\s|\Z)'
    match = re.search(pattern, content, re.DOTALL)
    
    if not match:
        print_error("Fonction claim_facture_numero non trouvée")
        return False
    
    func_body = match.group(1)
    
    # Vérifier que la condition stricte a été retirée
    strict_check = "sequence_demandee == attendue"
    if strict_check in func_body:
        print_error(f"La condition stricte est toujours présente: {strict_check}")
        return False
    else:
        print_success("La condition stricte 'sequence_demandee == attendue' a été retirée")
    
    # Vérifier que la nouvelle condition est présente
    new_check = "sequence_demandee is not None"
    if new_check in func_body:
        print_success(f"La nouvelle condition est présente: {new_check}")
    else:
        print_error(f"La nouvelle condition est absente: {new_check}")
        return False
    
    return True

def test_claim_situation_numero():
    """Vérifier les changements dans claim_situation_numero"""
    print_test("Test 4: Vérification de claim_situation_numero()")
    
    with open('api/numero_documents.py', 'r') as f:
        content = f.read()
    
    # Chercher la fonction claim_situation_numero
    pattern = r'def claim_situation_numero\(.*?\):(.*?)(?=\ndef\s|\nclass\s|\Z)'
    match = re.search(pattern, content, re.DOTALL)
    
    if not match:
        print_error("Fonction claim_situation_numero non trouvée")
        return False
    
    func_body = match.group(1)
    
    # Vérifier que les conditions strictes ont été assouplies
    strict_check1 = "int(parsed.group(1)) == facture_attendue"
    if strict_check1 in func_body:
        print_error(f"La condition stricte est toujours présente: {strict_check1}")
        return False
    else:
        print_success("La condition stricte sur la séquence facture a été assouplie")
    
    # Vérifier la nouvelle condition
    new_check = "int(parsed.group(1)) not in facture_utilises"
    if new_check in func_body:
        print_success(f"La nouvelle condition est présente: {new_check}")
    else:
        print_error(f"La nouvelle condition est absente: {new_check}")
        return False
    
    return True

def test_comments():
    """Vérifier la présence des commentaires explicatifs"""
    print_test("Test 5: Vérification des commentaires explicatifs")
    
    with open('api/numero_documents.py', 'r') as f:
        content = f.read()
    
    # Chercher les commentaires avec ✅
    comment_pattern = r'#\s*✅.*?assouplir|#\s*✅.*?accepter'
    matches = re.findall(comment_pattern, content, re.IGNORECASE)
    
    if matches:
        print_success(f"Trouvé {len(matches)} commentaire(s) explicatif(s)")
        for comment in matches[:3]:  # Afficher les 3 premiers
            print_info(comment)
    else:
        print_error("Aucun commentaire explicatif trouvé")
        return False
    
    return True

def main():
    """Exécuter tous les tests de code review"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*70}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}CODE REVIEW - Vérification des changements{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*70}{Colors.RESET}")
    
    results = []
    
    # Tests de code review
    results.append(("claim_devis_numero", test_claim_devis_numero()))
    results.append(("_reserver_sequence", test_reserver_sequence()))
    results.append(("claim_facture_numero", test_claim_facture_numero()))
    results.append(("claim_situation_numero", test_claim_situation_numero()))
    results.append(("Commentaires", test_comments()))
    
    # Afficher le résumé
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*70}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}RÉSUMÉ DE LA CODE REVIEW{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*70}{Colors.RESET}\n")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        if result:
            print_success(f"{name}")
        else:
            print_error(f"{name}")
    
    print(f"\n{Colors.BOLD}Résultat: {passed}/{total} vérifications réussies{Colors.RESET}")
    
    if passed == total:
        print(f"\n{Colors.GREEN}{Colors.BOLD}✓ TOUS LES CHANGEMENTS SONT CORRECTS !{Colors.RESET}")
        print(f"\n{Colors.YELLOW}Les modifications suivantes ont été appliquées:{Colors.RESET}")
        print(f"{Colors.YELLOW}  1. claim_devis_numero: Condition assouplie pour accepter les numéros libres{Colors.RESET}")
        print(f"{Colors.YELLOW}  2. _reserver_sequence: Accepte les séquences non-attendues si libres{Colors.RESET}")
        print(f"{Colors.YELLOW}  3. claim_facture_numero: Même logique assouplie pour les factures{Colors.RESET}")
        print(f"{Colors.YELLOW}  4. claim_situation_numero: Logique assouplie pour les situations{Colors.RESET}\n")
        return 0
    else:
        print(f"\n{Colors.RED}{Colors.BOLD}✗ CERTAINES VÉRIFICATIONS ONT ÉCHOUÉ{Colors.RESET}\n")
        return 1

if __name__ == '__main__':
    try:
        import sys
        sys.exit(main())
    except KeyboardInterrupt:
        print_error("\nVérification interrompue par l'utilisateur")
        sys.exit(1)
    except Exception as e:
        print_error(f"Erreur critique: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
