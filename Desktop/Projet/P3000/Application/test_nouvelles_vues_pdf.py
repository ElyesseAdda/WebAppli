#!/usr/bin/env python
"""
Script de test pour les nouvelles vues PDF avec stockage automatique dans AWS S3
"""

import os
import sys
import django
import requests
from datetime import datetime

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Application.settings')
django.setup()

def test_nouvelles_vues_pdf():
    """
    Test des nouvelles vues PDF
    """
    print("🚀 TEST DES NOUVELLES VUES PDF AVEC STOCKAGE AWS S3")
    print("=" * 70)
    
    base_url = "http://localhost:8000/api"
    
    # Test 1: Planning hebdomadaire
    print("\n🧪 TEST 1: Planning hebdomadaire avec stockage AWS S3")
    print("-" * 50)
    
    try:
        url = f"{base_url}/planning-hebdo-pdf-drive/?week=35&year=2025"
        print(f"🌐 URL: {url}")
        
        response = requests.get(url)
        print(f"📊 Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ SUCCÈS: {data.get('message', 'N/A')}")
            print(f"📁 Fichier S3: {data.get('file_path', 'N/A')}")
            print(f"🔗 URL Drive: {data.get('drive_url', 'N/A')}")
            print(f"📥 URL Téléchargement: {data.get('download_url', 'N/A')}")
        else:
            print(f"❌ ÉCHEC: {response.text}")
            
    except Exception as e:
        print(f"❌ ERREUR: {str(e)}")
    
    # Test 2: Rapport mensuel des agents
    print("\n🧪 TEST 2: Rapport mensuel des agents avec stockage AWS S3")
    print("-" * 50)
    
    try:
        url = f"{base_url}/generate-monthly-agents-pdf-drive/?month=8&year=2025"
        print(f"🌐 URL: {url}")
        
        response = requests.get(url)
        print(f"📊 Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ SUCCÈS: {data.get('message', 'N/A')}")
            print(f"📁 Fichier S3: {data.get('file_path', 'N/A')}")
            print(f"🔗 URL Drive: {data.get('drive_url', 'N/A')}")
            print(f"📥 URL Téléchargement: {data.get('download_url', 'N/A')}")
        else:
            print(f"❌ ÉCHEC: {response.text}")
            
    except Exception as e:
        print(f"❌ ERREUR: {str(e)}")
    
    # Test 3: Devis travaux
    print("\n🧪 TEST 3: Devis travaux avec stockage AWS S3")
    print("-" * 50)
    
    try:
        url = f"{base_url}/generate-devis-travaux-pdf-drive/?chantier_id=001&chantier_name=Chantier Test"
        print(f"🌐 URL: {url}")
        
        response = requests.get(url)
        print(f"📊 Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ SUCCÈS: {data.get('message', 'N/A')}")
            print(f"📁 Fichier S3: {data.get('file_path', 'N/A')}")
            print(f"🔗 URL Drive: {data.get('drive_url', 'N/A')}")
            print(f"📥 URL Téléchargement: {data.get('download_url', 'N/A')}")
        else:
            print(f"❌ ÉCHEC: {response.text}")
            
    except Exception as e:
        print(f"❌ ERREUR: {str(e)}")
    
    print("\n" + "=" * 70)
    print("🏁 FIN DES TESTS")
    print("\n💡 NOTES:")
    print("- Assurez-vous que votre serveur Django est démarré (python manage.py runserver)")
    print("- Les PDFs sont maintenant stockés automatiquement dans AWS S3")
    print("- Utilisez les URLs Drive pour accéder aux fichiers dans votre interface")
    print("- Utilisez les URLs de téléchargement si vous voulez télécharger le PDF")

if __name__ == "__main__":
    test_nouvelles_vues_pdf()
