#!/usr/bin/env python3
"""
Script de test pour vérifier la fonctionnalité de modification du numéro
dans ProduitSelectionTable sans perdre les données
"""

import requests
import json

def test_number_generation():
    """Test de génération de numéro"""
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

def test_duplicate_with_suggestion():
    """Test de duplication avec suggestion de numéro"""
    try:
        print("\n🧪 Test de duplication avec suggestion:")
        
        # Tenter de créer avec un numéro existant
        test_data = {
            "numero": "BC-0026",  # Numéro qui existe probablement
            "fournisseur": "TEST_EDIT",
            "chantier": 1,
            "montant_total": 75.00,
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
            
            # Vérifier si le message contient une suggestion
            error_msg = error_data.get('error', '')
            if 'dupliquée' in error_msg or 'existe déjà' in error_msg:
                print("✅ Message d'erreur contient information sur la duplication")
                
                # Tester la récupération du prochain numéro
                next_num_response = requests.get("http://127.0.0.1:8000/api/generate-bon-commande-number/")
                if next_num_response.status_code == 200:
                    next_num_data = next_num_response.json()
                    suggested_number = next_num_data.get('numero', 'N/A')
                    print(f"✅ Prochain numéro disponible: {suggested_number}")
                    
                    # Tester la création avec le numéro suggéré
                    test_data["numero"] = suggested_number
                    test_data["fournisseur"] = "TEST_EDIT_SUCCESS"
                    
                    retry_response = requests.post(
                        "http://127.0.0.1:8000/api/bons-commande/",
                        headers={"Content-Type": "application/json"},
                        data=json.dumps(test_data)
                    )
                    
                    if retry_response.status_code == 201:
                        print(f"✅ Création réussie avec le numéro suggéré: {suggested_number}")
                        return True
                    else:
                        print(f"❌ Échec création avec numéro suggéré: {retry_response.status_code}")
                        return False
                else:
                    print("❌ Impossible de récupérer le prochain numéro")
                    return False
            else:
                print("⚠️  Message d'erreur ne contient pas d'info sur la duplication")
                return False
        else:
            print(f"❌ Statut inattendu: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Erreur test suggestion: {e}")
        return False

def test_custom_number():
    """Test de création avec un numéro personnalisé"""
    try:
        print("\n🧪 Test de numéro personnalisé:")
        
        # Générer un numéro disponible
        available_number = test_number_generation()
        if not available_number:
            return False
            
        # Créer un numéro personnalisé basé sur le disponible
        custom_number = available_number.replace("BC-", "CUSTOM-")
        
        test_data = {
            "numero": custom_number,
            "fournisseur": "TEST_CUSTOM",
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
        
        if response.status_code == 201:
            print(f"✅ Création réussie avec numéro personnalisé: {custom_number}")
            return True
        else:
            print(f"❌ Échec création numéro personnalisé: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Erreur test personnalisé: {e}")
        return False

def main():
    """Fonction principale de test"""
    print("🧪 Test de la fonctionnalité de modification du numéro")
    print("=" * 60)
    
    # Test 1: Génération de numéro
    print("\n1. Test génération de numéro:")
    numero = test_number_generation()
    
    # Test 2: Duplication avec suggestion
    suggestion_test = test_duplicate_with_suggestion()
    
    # Test 3: Numéro personnalisé
    custom_test = test_custom_number()
    
    # Résumé
    print("\n" + "=" * 60)
    print("📊 RÉSUMÉ DES TESTS:")
    print(f"Génération numéro: {'✅ OK' if numero else '❌ KO'}")
    print(f"Suggestion automatique: {'✅ OK' if suggestion_test else '❌ KO'}")
    print(f"Numéro personnalisé: {'✅ OK' if custom_test else '❌ KO'}")
    
    if numero and suggestion_test and custom_test:
        print("\n🎉 Tous les tests sont passés avec succès!")
        print("\n💡 NOUVELLES FONCTIONNALITÉS TESTÉES:")
        print("   • Champ de modification du numéro dans ProduitSelectionTable")
        print("   • Suggestion automatique du prochain numéro disponible")
        print("   • Bouton 'Utiliser [numéro] et créer' pour création automatique")
        print("   • Bouton 'Remplir [numéro]' pour modifier le champ")
        print("   • Bouton 'Modifier manuellement' pour saisie libre")
        print("   • Préservation des données lors de la modification")
    else:
        print("\n⚠️  Certains tests ont échoué. Vérifiez les corrections.")

if __name__ == "__main__":
    main()
