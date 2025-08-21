#!/usr/bin/env python
import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Application.settings')
django.setup()

from api.models import Partie, SousPartie, LigneDetail

def test_lignes_directes():
    print("=== Test de la fonctionnalité Lignes directes ===\n")
    
    # Test 1: Créer une partie avec des lignes directes
    print("1. Création d'une partie avec lignes directes:")
    try:
        partie = Partie.objects.create(
            titre="Test Lignes Directes",
            type="PEINTURE"
        )
        print(f"   ✅ Partie créée: {partie.titre}")
        
        # Créer une sous-partie "Lignes directes"
        sous_partie = SousPartie.objects.create(
            description="Lignes directes",
            partie=partie
        )
        print(f"   ✅ Sous-partie 'Lignes directes' créée")
        
        # Créer des lignes de détail
        ligne1 = LigneDetail.objects.create(
            description="Peinture murs",
            unite="m²",
            cout_main_oeuvre=10.0,
            cout_materiel=5.0,
            taux_fixe=20.0,
            marge=20.0,
            sous_partie=sous_partie
        )
        ligne2 = LigneDetail.objects.create(
            description="Enduit",
            unite="m²",
            cout_main_oeuvre=8.0,
            cout_materiel=3.0,
            taux_fixe=20.0,
            marge=20.0,
            sous_partie=sous_partie
        )
        print(f"   ✅ Lignes créées: {ligne1.description}, {ligne2.description}")
        
    except Exception as e:
        print(f"   ❌ Erreur: {e}")
    
    print("\n2. Vérification de la structure:")
    try:
        partie = Partie.objects.get(titre="Test Lignes Directes")
        sous_parties = partie.sous_parties.all()
        
        for sp in sous_parties:
            print(f"   Sous-partie: {sp.description}")
            lignes = sp.lignes_details.all()
            for ligne in lignes:
                print(f"     - {ligne.description} ({ligne.unite})")
        
        # Vérifier si la partie a des lignes directes
        has_lignes_directes = partie.sous_parties.filter(description="Lignes directes").exists()
        print(f"   ✅ Partie a des lignes directes: {has_lignes_directes}")
        
    except Exception as e:
        print(f"   ❌ Erreur: {e}")
    
    print("\n3. Test de validation (tentative de créer une deuxième 'Lignes directes'):")
    try:
        # Essayer de créer une deuxième sous-partie "Lignes directes"
        SousPartie.objects.create(
            description="Lignes directes",
            partie=partie
        )
        print("   ❌ Erreur: Une deuxième 'Lignes directes' a été créée (ne devrait pas arriver)")
    except Exception as e:
        print(f"   ✅ Validation fonctionne: {e}")
    
    print("\n4. Nettoyage:")
    try:
        partie.delete()
        print("   ✅ Données de test supprimées")
    except Exception as e:
        print(f"   ❌ Erreur lors du nettoyage: {e}")

if __name__ == "__main__":
    test_lignes_directes()
