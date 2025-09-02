#!/usr/bin/env python
"""
Script de test pour tester le système PDF dans l'application
"""

import os
import sys
import django
from datetime import datetime

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Application.settings')
django.setup()

from api.pdf_manager import pdf_manager

def test_pdf_generation_in_app():
    """
    Test de la génération de PDFs dans l'application
    """
    print("🚀 TEST DE GÉNÉRATION DE PDFs DANS L'APPLICATION")
    print("=" * 60)
    
    # Test 1: Génération d'un planning hebdomadaire
    print("\n🧪 TEST 1: Génération planning hebdomadaire")
    print("-" * 40)
    
    try:
        # Simuler les paramètres d'une requête
        document_type = 'planning_hebdo'
        preview_url = "http://localhost:8000/api/preview-planning-hebdo/?week=35&year=2025"
        societe_name = "Société Test Application"
        params = {'week': 35, 'year': 2025}
        
        print(f"📄 Type de document: {document_type}")
        print(f"🌐 URL de prévisualisation: {preview_url}")
        print(f"🏢 Société: {societe_name}")
        print(f"📋 Paramètres: {params}")
        
        # Générer le PDF et le stocker dans AWS S3
        print("\n🎯 Génération du PDF...")
        success, message, s3_file_path = pdf_manager.generate_andStore_pdf(
            document_type=document_type,
            preview_url=preview_url,
            societe_name=societe_name,
            **params
        )
        
        if success:
            print(f"✅ SUCCÈS: {message}")
            print(f"📁 Fichier S3: {s3_file_path}")
            print(f"🔗 URL Drive: /drive?path={s3_file_path}")
        else:
            print(f"❌ ÉCHEC: {message}")
            
    except Exception as e:
        print(f"❌ ERREUR: {str(e)}")
    
    # Test 2: Génération d'un rapport mensuel des agents
    print("\n🧪 TEST 2: Génération rapport mensuel des agents")
    print("-" * 40)
    
    try:
        document_type = 'rapport_agents'
        preview_url = "http://localhost:8000/api/preview-monthly-agents/?month=8&year=2025"
        societe_name = "Société Test Application"
        params = {'month': 8, 'year': 2025}
        
        print(f"📄 Type de document: {document_type}")
        print(f"🌐 URL de prévisualisation: {preview_url}")
        print(f"🏢 Société: {societe_name}")
        print(f"📋 Paramètres: {params}")
        
        # Générer le PDF et le stocker dans AWS S3
        print("\n🎯 Génération du PDF...")
        success, message, s3_file_path = pdf_manager.generate_andStore_pdf(
            document_type=document_type,
            preview_url=preview_url,
            societe_name=societe_name,
            **params
        )
        
        if success:
            print(f"✅ SUCCÈS: {message}")
            print(f"📁 Fichier S3: {s3_file_path}")
            print(f"🔗 URL Drive: /drive?path={s3_file_path}")
        else:
            print(f"❌ ÉCHEC: {message}")
            
    except Exception as e:
        print(f"❌ ERREUR: {str(e)}")
    
    print("\n" + "=" * 60)
    print("🏁 FIN DES TESTS")

if __name__ == "__main__":
    test_pdf_generation_in_app()
