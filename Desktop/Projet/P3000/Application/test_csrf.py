#!/usr/bin/env python3
"""
Script de test pour vérifier la configuration CSRF
"""
import requests
import json

def test_csrf_configuration():
    """Test de la configuration CSRF"""
    base_url = "http://localhost:8000"
    
    print("=== Test de la configuration CSRF ===")
    
    # Test 1: Récupération du token CSRF
    print("\n1. Test de récupération du token CSRF...")
    try:
        response = requests.get(f"{base_url}/api/csrf-token/")
        print(f"Status: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        print(f"Cookies: {dict(response.cookies)}")
        
        if response.status_code == 200:
            print("✅ Token CSRF récupéré avec succès")
        else:
            print("❌ Échec de récupération du token CSRF")
            
    except Exception as e:
        print(f"❌ Erreur lors de la récupération du token CSRF: {e}")
    
    # Test 2: Test de création de devis avec token CSRF
    print("\n2. Test de création de devis avec token CSRF...")
    try:
        # D'abord récupérer le token CSRF
        csrf_response = requests.get(f"{base_url}/api/csrf-token/")
        csrf_token = csrf_response.cookies.get('csrftoken')
        
        if csrf_token:
            headers = {
                'X-CSRFToken': csrf_token,
                'Content-Type': 'application/json',
            }
            
            # Données de test pour un devis
            test_data = {
                "numero": "TEST-001",
                "price_ht": 1000.00,
                "price_ttc": 1200.00,
                "tva_rate": 20.0,
                "nature_travaux": "Test",
                "description": "Devis de test",
                "devis_chantier": False,
                "lignes": [],
                "lignes_speciales": {"global": [], "parties": {}, "sousParties": {}}
            }
            
            response = requests.post(
                f"{base_url}/api/create-devis/",
                headers=headers,
                cookies=csrf_response.cookies,
                json=test_data
            )
            
            print(f"Status: {response.status_code}")
            print(f"Response: {response.text}")
            
            if response.status_code == 201 or response.status_code == 200:
                print("✅ Création de devis réussie avec token CSRF")
            else:
                print("❌ Échec de création de devis")
        else:
            print("❌ Aucun token CSRF trouvé")
            
    except Exception as e:
        print(f"❌ Erreur lors du test de création de devis: {e}")
    
    # Test 3: Test sans token CSRF (devrait échouer)
    print("\n3. Test de création de devis sans token CSRF...")
    try:
        headers = {
            'Content-Type': 'application/json',
        }
        
        test_data = {
            "numero": "TEST-002",
            "price_ht": 1000.00,
            "price_ttc": 1200.00,
            "tva_rate": 20.0,
            "nature_travaux": "Test",
            "description": "Devis de test sans CSRF",
            "devis_chantier": False,
            "lignes": [],
            "lignes_speciales": {"global": [], "parties": {}, "sousParties": {}}
        }
        
        response = requests.post(
            f"{base_url}/api/create-devis/",
            headers=headers,
            json=test_data
        )
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 403:
            print("✅ Protection CSRF fonctionne correctement")
        else:
            print("⚠️  Protection CSRF ne fonctionne pas comme attendu")
            
    except Exception as e:
        print(f"❌ Erreur lors du test sans token CSRF: {e}")

if __name__ == "__main__":
    test_csrf_configuration()
