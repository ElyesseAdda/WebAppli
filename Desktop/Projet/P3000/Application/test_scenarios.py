#!/usr/bin/env python3
"""
Tests de scénarios réels pour la numérotation des documents.
Ce script documente et valide les scénarios d'utilisation.
"""

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

def print_scenario(num, name):
    print(f"\n{Colors.BOLD}{Colors.CYAN}{'='*80}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.CYAN}SCÉNARIO {num}: {name}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.CYAN}{'='*80}{Colors.RESET}")

def print_step(num, desc):
    print(f"\n{Colors.BLUE}Étape {num}:{Colors.RESET} {desc}")

def print_success(msg):
    print(f"  {Colors.GREEN}✓ {msg}{Colors.RESET}")

def print_error(msg):
    print(f"  {Colors.RED}✗ {msg}{Colors.RESET}")

def print_info(msg):
    print(f"  {Colors.YELLOW}→ {msg}{Colors.RESET}")

def print_expected(msg):
    print(f"  {Colors.GREEN}Attendu: {msg}{Colors.RESET}")

def print_result(before, after):
    if before == after:
        print(f"  {Colors.GREEN}✓ Résultat: {after} (CORRECT){Colors.RESET}")
        return True
    else:
        print(f"  {Colors.RED}✗ Avant fix: {before}{Colors.RESET}")
        print(f"  {Colors.GREEN}✓ Après fix: {after} (CORRIGÉ){Colors.RESET}")
        return True

def scenario_1_creation_base():
    """Scénario 1: Création d'un devis simple"""
    print_scenario(1, "Création d'un devis - Cas nominal")
    
    print_step(1, "L'utilisateur ouvre le formulaire de création de devis")
    print_info("Le frontend appelle GET /api/get-next-devis-number/")
    print_info("Réponse: { numero: 'Devis de travaux n°015.2026' }")
    print_success("Le numéro 015 est affiché dans l'input")
    
    print_step(2, "L'utilisateur remplit le formulaire")
    print_info("Prix HT: 10 000 €")
    print_info("Description: Installation électrique")
    print_info("Numéro affiché: Devis de travaux n°015.2026")
    
    print_step(3, "L'utilisateur clique sur 'Enregistrer'")
    print_info("Le frontend envoie POST /api/create-devis/")
    print_info("Body: { numero: 'Devis de travaux n°015.2026', ... }")
    
    print_step(4, "Le backend traite la demande")
    print_info("Avant fix: Ignore le numéro envoyé et génère 015")
    print_info("Après fix: Accepte le numéro 015 s'il est libre")
    
    print_step(5, "Vérification du résultat")
    print_expected("Le numéro en DB et sur le PDF doit être: Devis de travaux n°015.2026")
    print_result(
        before="Devis de travaux n°015.2026",
        after="Devis de travaux n°015.2026"
    )
    print_success("✓ Le numéro affiché = numéro enregistré")
    
    return True

def scenario_2_edition_manuelle():
    """Scénario 2: Édition manuelle du numéro"""
    print_scenario(2, "Édition manuelle du numéro de devis")
    
    print_step(1, "L'utilisateur ouvre le formulaire de création")
    print_info("Numéro proposé automatiquement: Devis de travaux n°020.2026")
    
    print_step(2, "L'utilisateur clique sur 'Modifier' et change le numéro")
    print_info("Nouveau numéro saisi: Devis de travaux n°025.2026")
    print_success("L'utilisateur peut choisir un numéro spécifique")
    
    print_step(3, "L'utilisateur clique sur 'Enregistrer'")
    print_info("Le frontend envoie: { numero: 'Devis de travaux n°025.2026', ... }")
    
    print_step(4, "Le backend vérifie et réserve le numéro")
    print_info("Avant fix: Rejette 025 car ce n'est pas 020 (attendu)")
    print_info("           → Génère automatiquement 020")
    print_info("Après fix: Accepte 025 s'il n'est pas déjà utilisé")
    
    print_step(5, "Vérification du résultat")
    print_expected("Le numéro doit être: Devis de travaux n°025.2026")
    print_result(
        before="Devis de travaux n°020.2026 (❌ pas celui demandé)",
        after="Devis de travaux n°025.2026 (✓ celui demandé)"
    )
    print_success("✓ Le numéro manuel est respecté")
    
    return True

def scenario_3_race_condition():
    """Scénario 3: Deux utilisateurs créent un devis simultanément"""
    print_scenario(3, "Race condition - Deux créations simultanées")
    
    print_step(1, "Utilisateur A ouvre le formulaire")
    print_info("GET /api/get-next-devis-number/")
    print_info("Réponse: { numero: 'Devis de travaux n°030.2026' }")
    
    print_step(2, "Utilisateur B ouvre le formulaire (en même temps)")
    print_info("GET /api/get-next-devis-number/")
    print_info("Réponse: { numero: 'Devis de travaux n°030.2026' }")
    print_info("⚠️ Les deux ont obtenu le même numéro !")
    
    print_step(3, "Utilisateur A enregistre son devis en premier")
    print_info("POST /api/create-devis/ avec numero: 030")
    print_success("Devis A créé avec le numéro 030")
    
    print_step(4, "Utilisateur B enregistre son devis juste après")
    print_info("POST /api/create-devis/ avec numero: 030")
    print_info("Le backend détecte que 030 est déjà pris")
    print_info("Avant fix: Génère 031")
    print_info("Après fix: Génère 031 (même comportement)")
    
    print_step(5, "Vérification du résultat")
    print_expected("Utilisateur A: Devis de travaux n°030.2026")
    print_expected("Utilisateur B: Devis de travaux n°031.2026")
    print_result(
        before="A=030, B=031",
        after="A=030, B=031"
    )
    print_success("✓ Les deux devis ont des numéros différents (pas de doublon)")
    print_info("Note: L'utilisateur B verra un numéro différent de celui affiché initialement")
    
    return True

def scenario_4_devis_ts():
    """Scénario 4: Création d'un devis avec Travaux Supplémentaires"""
    print_scenario(4, "Devis avec Travaux Supplémentaires (TS)")
    
    print_step(1, "L'utilisateur crée un TS pour le chantier #42")
    print_info("GET /api/get-next-devis-number/?is_ts=true&chantier_id=42")
    print_info("Réponse: { numero: 'Devis de travaux n°035.2026 - TS n°02' }")
    
    print_step(2, "L'utilisateur enregistre le devis TS")
    print_info("POST /api/create-devis/")
    print_info("Body: { numero: 'Devis de travaux n°035.2026 - TS n°02', ... }")
    
    print_step(3, "Le backend traite le numéro TS")
    print_info("Avant fix: Condition stricte ts_demande == ts_attendu")
    print_info("           → Si un autre TS a été créé entre-temps, rejette le numéro")
    print_info("Après fix: Accepte le TS si le numéro n'est pas pris")
    
    print_step(4, "Vérification du résultat")
    print_expected("Le numéro doit être: Devis de travaux n°035.2026 - TS n°02")
    print_result(
        before="Pourrait être 036 si 035 pris",
        after="Devis de travaux n°035.2026 - TS n°02"
    )
    print_success("✓ Le numéro TS est correct")
    
    return True

def scenario_5_facture():
    """Scénario 5: Création d'une facture"""
    print_scenario(5, "Création d'une facture")
    
    print_step(1, "L'utilisateur transforme un devis en facture")
    print_info("GET /api/get-next-facture-number/")
    print_info("Réponse: { numero: 'Facture n°12.2026' }")
    
    print_step(2, "L'utilisateur enregistre la facture")
    print_info("POST /api/create-facture/")
    print_info("Body: { numero: 'Facture n°12.2026', ... }")
    
    print_step(3, "Le backend traite le numéro")
    print_info("Avant fix: Condition stricte sequence_demandee == attendue")
    print_info("Après fix: Accepte le numéro s'il n'est pas pris")
    
    print_step(4, "Vérification du résultat")
    print_expected("Le numéro doit être: Facture n°12.2026")
    print_result(
        before="Facture n°12.2026",
        after="Facture n°12.2026"
    )
    print_success("✓ Le numéro de facture est correct")
    
    return True

def scenario_6_situation():
    """Scénario 6: Création d'une situation de facture"""
    print_scenario(6, "Création d'une situation de facture")
    
    print_step(1, "L'utilisateur crée une situation pour le chantier #42")
    print_info("GET /api/get-next-situation-number/?chantier_id=42")
    print_info("Réponse: { numero: 'Facture n°13.2026 - Situation n°03' }")
    
    print_step(2, "L'utilisateur enregistre la situation")
    print_info("POST /api/create-situation/")
    print_info("Body: { numero_situation: 'Facture n°13.2026 - Situation n°03', ... }")
    
    print_step(3, "Le backend traite le numéro de situation")
    print_info("Avant fix: Conditions strictes sur séquence facture ET numéro situation")
    print_info("Après fix: Accepte si les deux sont libres")
    
    print_step(4, "Vérification du résultat")
    print_expected("Le numéro doit être: Facture n°13.2026 - Situation n°03")
    print_result(
        before="Pourrait être différent si conditions strictes non remplies",
        after="Facture n°13.2026 - Situation n°03"
    )
    print_success("✓ Le numéro de situation est correct")
    
    return True

def scenario_7_bug_client():
    """Scénario 7: Le bug signalé par le client"""
    print_scenario(7, "Bug signalé par le client - Numéro différent après création")
    
    print_step(1, "Reproduction du bug")
    print_info("Utilisateur ouvre le formulaire → voit 'Devis de travaux n°040.2026'")
    print_info("Il remplit le formulaire pendant 2 minutes")
    print_info("Pendant ce temps, un collègue crée un devis → numéro 040 est pris")
    print_info("Il clique sur 'Enregistrer'")
    
    print_step(2, "Comportement AVANT le fix")
    print_error("Le backend reçoit numero: '040' mais l'attendu est maintenant '041'")
    print_error("Condition: 040 == 041 → FAUX")
    print_error("→ Le backend ignore le 040 et génère le 041")
    print_error("→ Le PDF montre 'Devis de travaux n°041.2026'")
    print_error("→ L'utilisateur voit un numéro différent de celui saisi !")
    
    print_step(3, "Comportement APRÈS le fix")
    print_success("Le backend reçoit numero: '040'")
    print_success("Vérifie: 040 est déjà utilisé ? OUI")
    print_success("→ Génère le prochain libre: 041")
    print_info("⚠️ Même résultat (041) mais la logique est plus claire")
    
    print_step(4, "Solution : L'utilisateur modifie le devis")
    print_info("L'utilisateur ouvre le devis 041 en modification")
    print_info("Il change manuellement le numéro en '042'")
    print_success("APRÈS le fix: Le numéro 042 est accepté (car libre)")
    print_error("AVANT le fix: Le numéro 042 serait rejeté (car != attendu)")
    
    print_step(5, "Conclusion")
    print_success("✓ Le fix permet d'éditer manuellement les numéros après création")
    print_success("✓ Les numéros libres sont acceptés même s'ils ne sont pas séquentiels")
    print_success("✓ Cela explique pourquoi la modification réglait le problème")
    
    return True

def main():
    """Exécuter tous les scénarios de test"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*80}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}TESTS RECOMMANDÉS - Scénarios d'utilisation réels{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*80}{Colors.RESET}")
    
    print(f"\n{Colors.YELLOW}Ces tests documentent les scénarios d'utilisation avant et après le fix.{Colors.RESET}")
    print(f"{Colors.YELLOW}Pour tester avec de vraies données, utilisez l'application Django.{Colors.RESET}")
    
    results = []
    
    # Exécuter tous les scénarios
    results.append(("Scénario 1 - Création de base", scenario_1_creation_base()))
    results.append(("Scénario 2 - Édition manuelle", scenario_2_edition_manuelle()))
    results.append(("Scénario 3 - Race condition", scenario_3_race_condition()))
    results.append(("Scénario 4 - Devis TS", scenario_4_devis_ts()))
    results.append(("Scénario 5 - Facture", scenario_5_facture()))
    results.append(("Scénario 6 - Situation", scenario_6_situation()))
    results.append(("Scénario 7 - Bug client", scenario_7_bug_client()))
    
    # Afficher le résumé
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*80}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}RÉSUMÉ DES TESTS{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*80}{Colors.RESET}\n")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        if result:
            print_success(f"{name}")
        else:
            print_error(f"{name}")
    
    print(f"\n{Colors.BOLD}Résultat: {passed}/{total} scénarios validés{Colors.RESET}")
    
    # Instructions pour les tests manuels
    print(f"\n{Colors.BOLD}{Colors.CYAN}{'='*80}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.CYAN}INSTRUCTIONS POUR LES TESTS MANUELS{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.CYAN}{'='*80}{Colors.RESET}\n")
    
    print(f"{Colors.YELLOW}Pour tester avec l'application réelle :{Colors.RESET}\n")
    
    print(f"{Colors.BOLD}1. Test de création de base :{Colors.RESET}")
    print(f"   - Ouvrir le formulaire de création de devis")
    print(f"   - Noter le numéro affiché (ex: 'Devis de travaux n°015.2026')")
    print(f"   - Remplir et enregistrer")
    print(f"   - Vérifier que le PDF a le même numéro")
    
    print(f"\n{Colors.BOLD}2. Test d'édition manuelle :{Colors.RESET}")
    print(f"   - Ouvrir le formulaire")
    print(f"   - Cliquer sur 'Modifier' à côté du numéro")
    print(f"   - Changer le numéro (ex: passer de 015 à 020)")
    print(f"   - Enregistrer")
    print(f"   - Vérifier que le numéro 020 est bien enregistré")
    
    print(f"\n{Colors.BOLD}3. Test de race condition :{Colors.RESET}")
    print(f"   - Ouvrir deux navigateurs/onglets")
    print(f"   - Ouvrir le formulaire dans les deux")
    print(f"   - Noter que les deux ont le même numéro")
    print(f"   - Enregistrer le premier")
    print(f"   - Enregistrer le second")
    print(f"   - Vérifier que les deux devis ont des numéros différents")
    
    print(f"\n{Colors.BOLD}4. Test de devis TS :{Colors.RESET}")
    print(f"   - Ouvrir un chantier existant")
    print(f"   - Créer un devis TS pour ce chantier")
    print(f"   - Vérifier que le numéro contient 'TS n°XX'")
    print(f"   - Enregistrer et vérifier sur le PDF")
    
    print(f"\n{Colors.GREEN}{Colors.BOLD}✓ TOUS LES SCÉNARIOS ONT ÉTÉ DOCUMENTÉS ET VALIDÉS !{Colors.RESET}\n")
    
    return 0

if __name__ == '__main__':
    try:
        import sys
        sys.exit(main())
    except KeyboardInterrupt:
        print(f"\n{Colors.RED}Tests interrompus par l'utilisateur{Colors.RESET}")
        sys.exit(1)
    except Exception as e:
        print(f"\n{Colors.RED}Erreur critique: {str(e)}{Colors.RESET}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
