#!/usr/bin/env python3
"""
Script de test pour vérifier les corrections apportées aux bons de commande
"""

import requests
import json

def test_bon_commande_number_generation():
    """Test de génération de numéro de bon de commande"""
    try:
        response = requests.get("http://127.0.0.1:8000/api/generate-bon-commande-number/")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Génération de numéro OK: {data.get('numero', 'N/A')}")
            return data.get('numero')
        else:
            print(f"❌ Erreur génération numéro: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Erreur connexion: {e}")
        return None

def test_duplicate_number_error():
    """Test de gestion d'erreur pour numéro dupliqué"""
    try:
        # Tenter de créer un bon de commande avec un numéro existant
        test_data = {
            "numero": "BC-0026",  # Numéro qui existe déjà
            "fournisseur": "TEST",
            "chantier": 1,
            "montant_total": 100.00,
            "statut": "en_attente",
            "lignes": []
        }
        
        response = requests.post(
            "http://127.0.0.1:8000/api/bons-commande/",
            headers={"Content-Type": "application/json"},
            data=json.dumps(test_data)
        )
        
        if response.status_code == 400:
            error_data = response.json()
            print(f"✅ Erreur 400 détectée: {error_data.get('error', 'N/A')}")
            
            # Vérifier si le message contient des informations sur la duplication
            error_msg = error_data.get('error', '')
            if 'dupliquée' in error_msg or 'existe déjà' in error_msg:
                print("✅ Message d'erreur contient information sur la duplication")
                return True
            else:
                print("⚠️  Message d'erreur ne contient pas d'info sur la duplication")
                return False
        else:
            print(f"❌ Statut inattendu: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Erreur test duplication: {e}")
        return False

def main():
    """Fonction principale de test"""
    print("🧪 Test des corrections des bons de commande")
    print("=" * 50)
    
    # Test 1: Génération de numéro
    print("\n1. Test génération de numéro:")
    numero = test_bon_commande_number_generation()
    
    # Test 2: Gestion erreur duplication
    print("\n2. Test gestion erreur duplication:")
    duplicate_test = test_duplicate_number_error()
    
    # Résumé
    print("\n" + "=" * 50)
    print("📊 RÉSUMÉ DES TESTS:")
    print(f"Génération numéro: {'✅ OK' if numero else '❌ KO'}")
    print(f"Gestion duplication: {'✅ OK' if duplicate_test else '❌ KO'}")
    
    if numero and duplicate_test:
        print("\n🎉 Tous les tests sont passés avec succès!")
    else:
        print("\n⚠️  Certains tests ont échoué. Vérifiez les corrections.")

if __name__ == "__main__":
    main()
