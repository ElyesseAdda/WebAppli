#!/usr/bin/env python
"""
Script de test pour vérifier le bon fonctionnement des calculs de sous-traitance.
Ce script simule l'ajout, la modification et la suppression de contrats de sous-traitance.
"""

import os
import sys
import django
from decimal import Decimal

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Application.settings')
django.setup()

from api.models import Chantier, SousTraitant, ContratSousTraitance, AvenantSousTraitance

def test_sous_traitance_calculs():
    """Test complet des calculs de sous-traitance"""
    
    print("=== Test des calculs de sous-traitance ===\n")
    
    # Créer un chantier de test
    try:
        chantier = Chantier.objects.create(
            chantier_name="Test Sous-traitance",
            ville="Test Ville",
            rue="Test Rue",
            cout_estime_main_oeuvre=Decimal('50000.00'),
            cout_estime_materiel=Decimal('20000.00')
        )
        print(f"✅ Chantier créé: {chantier.chantier_name}")
        print(f"   Coût estimé main d'œuvre initial: {chantier.cout_estime_main_oeuvre}")
        print(f"   Coût sous-traitance initial: {chantier.cout_sous_traitance}")
    except Exception as e:
        print(f"❌ Erreur création chantier: {e}")
        return
    
    # Créer un sous-traitant de test
    try:
        sous_traitant = SousTraitant.objects.create(
            entreprise="Entreprise Test",
            capital=Decimal('100000.00'),
            adresse="123 Test Street",
            code_postal="75000",
            ville="Paris",
            numero_rcs="123456789",
            representant="Jean Test"
        )
        print(f"✅ Sous-traitant créé: {sous_traitant.entreprise}")
    except Exception as e:
        print(f"❌ Erreur création sous-traitant: {e}")
        return
    
    # Test 1: Ajout d'un contrat de sous-traitance
    print("\n--- Test 1: Ajout d'un contrat ---")
    try:
        contrat = ContratSousTraitance.objects.create(
            chantier=chantier,
            sous_traitant=sous_traitant,
            description_prestation="Peinture intérieure",
            date_debut="2024-01-01",
            adresse_prestation="123 Test Street",
            nom_operation="Peinture",
            montant_operation=Decimal('15000.00'),
            nom_maitre_ouvrage="Client Test",
            nom_maitre_oeuvre="Architecte Test"
        )
        
        # Recharger le chantier pour voir les changements
        chantier.refresh_from_db()
        
        print(f"✅ Contrat créé: {contrat.nom_operation}")
        print(f"   Montant contrat: {contrat.montant_operation}")
        print(f"   Nouveau coût sous-traitance: {chantier.cout_sous_traitance}")
        print(f"   Nouveau coût estimé main d'œuvre: {chantier.cout_estime_main_oeuvre}")
        
        # Vérifications
        assert chantier.cout_sous_traitance == 15000.0, "Coût sous-traitance incorrect"
        assert chantier.cout_estime_main_oeuvre == Decimal('35000.00'), "Coût estimé main d'œuvre incorrect"
        print("✅ Vérifications OK")
        
    except Exception as e:
        print(f"❌ Erreur création contrat: {e}")
        return
    
    # Test 2: Ajout d'un avenant
    print("\n--- Test 2: Ajout d'un avenant ---")
    try:
        avenant = AvenantSousTraitance.objects.create(
            contrat=contrat,
            numero=1,
            description="Travaux supplémentaires",
            montant=Decimal('5000.00'),
            type_travaux="LOT PEINTURE"
        )
        
        # Recharger le chantier
        chantier.refresh_from_db()
        
        print(f"✅ Avenant créé: n°{avenant.numero}")
        print(f"   Montant avenant: {avenant.montant}")
        print(f"   Nouveau coût sous-traitance: {chantier.cout_sous_traitance}")
        print(f"   Nouveau coût estimé main d'œuvre: {chantier.cout_estime_main_oeuvre}")
        
        # Vérifications
        assert chantier.cout_sous_traitance == 20000.0, "Coût sous-traitance incorrect après avenant"
        assert chantier.cout_estime_main_oeuvre == Decimal('30000.00'), "Coût estimé main d'œuvre incorrect après avenant"
        print("✅ Vérifications OK")
        
    except Exception as e:
        print(f"❌ Erreur création avenant: {e}")
        return
    
    # Test 3: Modification du contrat
    print("\n--- Test 3: Modification du contrat ---")
    try:
        ancien_montant = contrat.montant_operation
        contrat.montant_operation = Decimal('18000.00')
        contrat.save()
        
        # Recharger le chantier
        chantier.refresh_from_db()
        
        print(f"✅ Contrat modifié")
        print(f"   Ancien montant: {ancien_montant}")
        print(f"   Nouveau montant: {contrat.montant_operation}")
        print(f"   Nouveau coût sous-traitance: {chantier.cout_sous_traitance}")
        print(f"   Nouveau coût estimé main d'œuvre: {chantier.cout_estime_main_oeuvre}")
        
        # Vérifications
        assert chantier.cout_sous_traitance == 23000.0, "Coût sous-traitance incorrect après modification"
        assert chantier.cout_estime_main_oeuvre == Decimal('27000.00'), "Coût estimé main d'œuvre incorrect après modification"
        print("✅ Vérifications OK")
        
    except Exception as e:
        print(f"❌ Erreur modification contrat: {e}")
        return
    
    # Test 4: Suppression de l'avenant
    print("\n--- Test 4: Suppression de l'avenant ---")
    try:
        avenant.delete()
        
        # Recharger le chantier
        chantier.refresh_from_db()
        
        print(f"✅ Avenant supprimé")
        print(f"   Nouveau coût sous-traitance: {chantier.cout_sous_traitance}")
        print(f"   Nouveau coût estimé main d'œuvre: {chantier.cout_estime_main_oeuvre}")
        
        # Vérifications
        assert chantier.cout_sous_traitance == 18000.0, "Coût sous-traitance incorrect après suppression avenant"
        assert chantier.cout_estime_main_oeuvre == Decimal('32000.00'), "Coût estimé main d'œuvre incorrect après suppression avenant"
        print("✅ Vérifications OK")
        
    except Exception as e:
        print(f"❌ Erreur suppression avenant: {e}")
        return
    
    # Test 5: Suppression du contrat
    print("\n--- Test 5: Suppression du contrat ---")
    try:
        contrat.delete()
        
        # Recharger le chantier
        chantier.refresh_from_db()
        
        print(f"✅ Contrat supprimé")
        print(f"   Nouveau coût sous-traitance: {chantier.cout_sous_traitance}")
        print(f"   Nouveau coût estimé main d'œuvre: {chantier.cout_estime_main_oeuvre}")
        
        # Vérifications
        assert chantier.cout_sous_traitance == 0.0, "Coût sous-traitance incorrect après suppression contrat"
        assert chantier.cout_estime_main_oeuvre == Decimal('50000.00'), "Coût estimé main d'œuvre incorrect après suppression contrat"
        print("✅ Vérifications OK")
        
    except Exception as e:
        print(f"❌ Erreur suppression contrat: {e}")
        return
    
    # Test 6: Méthode de recalcul
    print("\n--- Test 6: Méthode de recalcul ---")
    try:
        # Recréer un contrat pour tester
        contrat = ContratSousTraitance.objects.create(
            chantier=chantier,
            sous_traitant=sous_traitant,
            description_prestation="Test recalcul",
            date_debut="2024-01-01",
            adresse_prestation="123 Test Street",
            nom_operation="Test",
            montant_operation=Decimal('10000.00'),
            nom_maitre_ouvrage="Client Test",
            nom_maitre_oeuvre="Architecte Test"
        )
        
        # Forcer des valeurs incorrectes pour tester le recalcul
        chantier.cout_sous_traitance = 99999.0
        chantier.cout_estime_main_oeuvre = Decimal('99999.00')
        chantier.save()
        
        print(f"   Valeurs incorrectes forcées:")
        print(f"   Coût sous-traitance: {chantier.cout_sous_traitance}")
        print(f"   Coût estimé main d'œuvre: {chantier.cout_estime_main_oeuvre}")
        
        # Appliquer le recalcul
        resultat = chantier.recalculer_couts_sous_traitance()
        
        print(f"✅ Recalcul appliqué")
        print(f"   Résultat: {resultat}")
        print(f"   Nouveau coût sous-traitance: {chantier.cout_sous_traitance}")
        print(f"   Nouveau coût estimé main d'œuvre: {chantier.cout_estime_main_oeuvre}")
        
        # Vérifications
        assert chantier.cout_sous_traitance == 10000.0, "Coût sous-traitance incorrect après recalcul"
        assert chantier.cout_estime_main_oeuvre == Decimal('40000.00'), "Coût estimé main d'œuvre incorrect après recalcul"
        print("✅ Vérifications OK")
        
    except Exception as e:
        print(f"❌ Erreur test recalcul: {e}")
        return
    
    # Nettoyage
    print("\n--- Nettoyage ---")
    try:
        chantier.delete()
        sous_traitant.delete()
        print("✅ Données de test supprimées")
    except Exception as e:
        print(f"❌ Erreur nettoyage: {e}")
    
    print("\n=== Test terminé avec succès! ===")

if __name__ == "__main__":
    test_sous_traitance_calculs()