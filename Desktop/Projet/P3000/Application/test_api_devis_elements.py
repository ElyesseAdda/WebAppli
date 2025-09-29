#!/usr/bin/env python3
"""
Script de test pour vérifier que l'API fonctionne correctement
avec les nouveaux paramètres devis_id et include_deleted
"""

import requests
import json

# Configuration
BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api"

def test_api_endpoints():
    """Test des endpoints API avec et sans les nouveaux paramètres"""
    
    print("🧪 Test des endpoints API...")
    
    # Test 1: Parties sans paramètres (comportement normal)
    print("\n1. Test des parties (comportement normal)")
    try:
        response = requests.get(f"{API_BASE}/parties/")
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Nombre de parties: {len(data)}")
        else:
            print(f"   Erreur: {response.text}")
    except Exception as e:
        print(f"   Erreur de connexion: {e}")
    
    # Test 2: Parties avec paramètres (mode modification)
    print("\n2. Test des parties (mode modification)")
    try:
        response = requests.get(f"{API_BASE}/parties/?devis_id=1&include_deleted=true")
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Nombre de parties: {len(data)}")
        else:
            print(f"   Erreur: {response.text}")
    except Exception as e:
        print(f"   Erreur de connexion: {e}")
    
    # Test 3: Sous-parties sans paramètres
    print("\n3. Test des sous-parties (comportement normal)")
    try:
        response = requests.get(f"{API_BASE}/sous-parties/")
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Nombre de sous-parties: {len(data)}")
        else:
            print(f"   Erreur: {response.text}")
    except Exception as e:
        print(f"   Erreur de connexion: {e}")
    
    # Test 4: Sous-parties avec paramètres
    print("\n4. Test des sous-parties (mode modification)")
    try:
        response = requests.get(f"{API_BASE}/sous-parties/?devis_id=1&include_deleted=true")
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Nombre de sous-parties: {len(data)}")
        else:
            print(f"   Erreur: {response.text}")
    except Exception as e:
        print(f"   Erreur de connexion: {e}")
    
    # Test 5: Lignes de détail sans paramètres
    print("\n5. Test des lignes de détail (comportement normal)")
    try:
        response = requests.get(f"{API_BASE}/ligne-details/")
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Nombre de lignes: {len(data)}")
        else:
            print(f"   Erreur: {response.text}")
    except Exception as e:
        print(f"   Erreur de connexion: {e}")
    
    # Test 6: Lignes de détail avec paramètres
    print("\n6. Test des lignes de détail (mode modification)")
    try:
        response = requests.get(f"{API_BASE}/ligne-details/?devis_id=1&include_deleted=true")
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Nombre de lignes: {len(data)}")
        else:
            print(f"   Erreur: {response.text}")
    except Exception as e:
        print(f"   Erreur de connexion: {e}")

def test_devis_existence():
    """Test si des devis existent dans la base"""
    print("\n🔍 Vérification des devis existants...")
    
    try:
        response = requests.get(f"{API_BASE}/devisa/")
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Nombre de devis: {len(data)}")
            if data:
                print(f"   Premier devis ID: {data[0].get('id', 'N/A')}")
        else:
            print(f"   Erreur: {response.text}")
    except Exception as e:
        print(f"   Erreur de connexion: {e}")

if __name__ == "__main__":
    print("🚀 Démarrage des tests API...")
    test_devis_existence()
    test_api_endpoints()
    print("\n✅ Tests terminés!")
