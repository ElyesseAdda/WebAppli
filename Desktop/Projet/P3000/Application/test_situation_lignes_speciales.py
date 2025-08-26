#!/usr/bin/env python3
"""
Script de test pour vérifier la création de situation avec lignes spéciales
"""

import json
import requests

# Configuration
BASE_URL = "http://localhost:8000"
DEVIS_ID = 4  # ID du devis de test

def test_creation_situation():
    """Test de création d'une situation avec lignes spéciales"""
    
    # Données de test basées sur votre exemple
    situation_data = {
        "chantier": 4,
        "devis": 4,
        "mois": 8,
        "annee": 2025,
        "montant_ht_mois": 7658.32,
        "cumul_precedent": 0,
        "montant_total_cumul_ht": 7658.32,
        "montant_total_devis": 208485,
        "pourcentage_avancement": 3.67,
        "montant_apres_retenues": 7093.52,
        "tva": 1418.70,
        "retenue_garantie": 401.65,
        "taux_prorata": 2.50,
        "montant_prorata": 200.83,
        "retenue_cie": 0,
        "montant_total_ttc": 8512.02,
        "lignes": [
            {
                "ligne_devis": 4,
                "description": "2 passes de lisse sur support béton",
                "quantite": "1855.00",
                "prix_unitaire": "2.40",
                "total_ht": "4452.00",
                "pourcentage_actuel": "20.00",
                "montant": "890.40"
            }
        ],
        "lignes_supplementaires": [],
        "lignes_speciales": [
            {
                "description": "Remise commerciale",
                "value": 9367.11,
                "valueType": "fixed",
                "type": "reduction",
                "pourcentage_precedent": 0,
                "pourcentage_actuel": 25.5
            }
        ],
        "lignes_avenant": []
    }
    
    print("🔍 Données de test:")
    print(json.dumps(situation_data, indent=2))
    
    try:
        # Envoi de la requête
        response = requests.post(
            f"{BASE_URL}/api/situations/",
            json=situation_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"\n📊 Réponse du serveur:")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 201:
            result = response.json()
            print("✅ Situation créée avec succès!")
            print(f"ID de la situation: {result.get('id')}")
            
            # Vérifier les lignes spéciales
            if 'lignes_speciales' in result:
                print(f"📝 Lignes spéciales créées: {len(result['lignes_speciales'])}")
                for ligne in result['lignes_speciales']:
                    print(f"  - {ligne['description']}: {ligne['montant']}€")
            else:
                print("❌ Aucune ligne spéciale dans la réponse")
                
        else:
            print("❌ Erreur lors de la création:")
            print(response.text)
            
    except Exception as e:
        print(f"❌ Erreur de connexion: {e}")

def test_get_devis():
    """Test de récupération du devis pour vérifier les lignes spéciales"""
    
    try:
        response = requests.get(f"{BASE_URL}/api/devis/{DEVIS_ID}/")
        
        if response.status_code == 200:
            devis = response.json()
            print(f"\n📋 Devis {DEVIS_ID}:")
            print(f"Numéro: {devis.get('numero')}")
            print(f"Prix HT: {devis.get('price_ht')}")
            
            lignes_speciales = devis.get('lignes_speciales', {})
            print(f"Lignes spéciales: {json.dumps(lignes_speciales, indent=2)}")
            
        else:
            print(f"❌ Erreur lors de la récupération du devis: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Erreur de connexion: {e}")

if __name__ == "__main__":
    print("🧪 Test des lignes spéciales dans les situations")
    print("=" * 50)
    
    # Test 1: Récupération du devis
    test_get_devis()
    
    # Test 2: Création de situation
    test_creation_situation()
