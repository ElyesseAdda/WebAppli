#!/usr/bin/env python3
"""
Test simple pour vérifier la création des lignes spéciales
"""

import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Application.settings')
django.setup()

from api.models import Situation, SituationLigneSpeciale
from decimal import Decimal

def test_creation_ligne_speciale():
    """Test de création d'une ligne spéciale"""
    
    print("🧪 Test de création de ligne spéciale")
    print("=" * 50)
    
    # Récupérer la dernière situation créée
    try:
        situation = Situation.objects.latest('id')
        print(f"✅ Situation trouvée: ID {situation.id}")
        
        # Vérifier les lignes spéciales existantes
        lignes_speciales = SituationLigneSpeciale.objects.filter(situation=situation)
        print(f"📝 Lignes spéciales existantes: {lignes_speciales.count()}")
        
        for ls in lignes_speciales:
            print(f"  - ID: {ls.id}")
            print(f"    Description: {ls.description}")
            print(f"    Value: {ls.value}")
            print(f"    Pourcentage actuel: {ls.pourcentage_actuel}")
            print(f"    Montant: {ls.montant}")
            print(f"    Type: {ls.type}")
            print()
        
        # Test de création d'une nouvelle ligne spéciale
        print("🔧 Test de création d'une nouvelle ligne spéciale...")
        
        nouvelle_ligne = SituationLigneSpeciale.objects.create(
            situation=situation,
            description="Test Remise commerciale",
            montant_ht=Decimal('9367.11'),
            value=Decimal('9367.11'),
            value_type='fixed',
            type='reduction',
            niveau='global',
            pourcentage_precedent=Decimal('0'),
            pourcentage_actuel=Decimal('25.5'),
            montant=Decimal('2388.61')
        )
        
        print(f"✅ Ligne spéciale créée avec succès!")
        print(f"   ID: {nouvelle_ligne.id}")
        print(f"   Description: {nouvelle_ligne.description}")
        print(f"   Montant: {nouvelle_ligne.montant}")
        
        # Vérifier le total après création
        total_lignes = SituationLigneSpeciale.objects.filter(situation=situation).count()
        print(f"📊 Total lignes spéciales: {total_lignes}")
        
    except Situation.DoesNotExist:
        print("❌ Aucune situation trouvée")
    except Exception as e:
        print(f"❌ Erreur: {str(e)}")

if __name__ == "__main__":
    test_creation_ligne_speciale()
