#!/usr/bin/env python3
"""
Script de test pour vérifier la relation entre une partie et un devis
"""

import os
import sys
import django

# Configuration Django
sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Application.settings')
django.setup()

from api.models import Devis, DevisLigne, Partie

def test_partie_devis_relation():
    """Tester la relation entre la partie ID 10 et le devis ID 12"""
    
    print("🔍 Test de la relation Partie-Devis")
    print("=" * 50)
    
    # Test 1: Vérifier que le devis existe
    print("\n1. Vérification du devis ID 12:")
    try:
        devis = Devis.objects.get(id=12)
        print(f"✅ Devis trouvé: {devis}")
    except Devis.DoesNotExist:
        print("❌ Devis ID 12 n'existe pas")
        return
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return
    
    # Test 2: Vérifier que la partie existe
    print("\n2. Vérification de la partie ID 10:")
    try:
        partie = Partie.objects.get(id=10)
        print(f"✅ Partie trouvée: {partie.titre}")
        print(f"   - is_deleted: {partie.is_deleted}")
        print(f"   - type: {partie.type}")
    except Partie.DoesNotExist:
        print("❌ Partie ID 10 n'existe pas")
        return
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return
    
    # Test 3: Vérifier les lignes du devis
    print("\n3. Vérification des lignes du devis:")
    try:
        devis_lignes = DevisLigne.objects.filter(devis=devis)
        print(f"✅ {devis_lignes.count()} lignes trouvées dans le devis")
        
        partie_ids = set()
        for ligne in devis_lignes:
            if ligne.ligne_detail and ligne.ligne_detail.partie:
                partie_ids.add(ligne.ligne_detail.partie.id)
                print(f"   - Ligne {ligne.id}: Partie {ligne.ligne_detail.partie.id} ({ligne.ligne_detail.partie.titre})")
        
        print(f"\n   Parties dans le devis: {partie_ids}")
        
        if 10 in partie_ids:
            print("✅ La partie ID 10 est bien dans le devis ID 12")
        else:
            print("❌ La partie ID 10 n'est PAS dans le devis ID 12")
            print("   C'est pourquoi l'API retourne 404")
            
    except Exception as e:
        print(f"❌ Erreur lors de la vérification des lignes: {e}")
    
    # Test 4: Vérifier toutes les parties du devis
    print("\n4. Toutes les parties du devis ID 12:")
    try:
        for partie_id in partie_ids:
            try:
                partie = Partie.objects.get(id=partie_id)
                deleted_status = " (SUPPRIMÉ)" if partie.is_deleted else ""
                print(f"   - Partie {partie_id}: {partie.titre}{deleted_status}")
            except Partie.DoesNotExist:
                print(f"   - Partie {partie_id}: N'existe plus")
    except Exception as e:
        print(f"❌ Erreur: {e}")

def test_api_endpoint():
    """Tester l'endpoint API directement"""
    
    print("\n🌐 Test de l'endpoint API")
    print("=" * 50)
    
    import requests
    
    try:
        # Test de l'endpoint avec les paramètres
        url = "http://localhost:8000/api/parties/10/"
        params = {
            "devis_id": 12,
            "include_deleted": "true"
        }
        
        print(f"URL: {url}")
        print(f"Params: {params}")
        
        response = requests.get(url, params=params)
        
        if response.status_code == 200:
            print("✅ Endpoint GET fonctionne")
            data = response.json()
            print(f"   Données: {data}")
        else:
            print(f"❌ Erreur GET {response.status_code}: {response.text}")
            
    except Exception as e:
        print(f"❌ Erreur de connexion: {e}")

if __name__ == "__main__":
    print("🧪 Test de la relation Partie-Devis")
    print("=" * 50)
    
    # Test de la base de données
    test_partie_devis_relation()
    
    # Test de l'API
    test_api_endpoint()
    
    print("\n📝 Conclusion:")
    print("Si la partie ID 10 n'est pas dans le devis ID 12,")
    print("c'est normal que l'API retourne 404.")
    print("Il faut vérifier que la partie est bien associée au devis.")
