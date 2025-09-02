#!/usr/bin/env python
"""
Test simple pour vérifier l'import du pdf_manager
"""

import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Application.settings')
django.setup()

print("🔍 TEST D'IMPORT DU PDF_MANAGER")
print("=" * 40)

try:
    from api.pdf_manager import pdf_manager
    print("✅ Import réussi du pdf_manager")
    
    # Vérifier les méthodes disponibles
    methods = [method for method in dir(pdf_manager) if not method.startswith('_')]
    print(f"📋 Méthodes disponibles: {methods}")
    
    # Vérifier si la méthode existe
    if hasattr(pdf_manager, 'generateandStore_pdf'):
        print("✅ Méthode 'generateandStore_pdf' trouvée")
    else:
        print("❌ Méthode 'generateandStore_pdf' NON trouvée")
        
    # Vérifier le type d'objet
    print(f"🔧 Type d'objet: {type(pdf_manager)}")
    print(f"🔧 Classe: {pdf_manager.__class__.__name__}")
    
except Exception as e:
    print(f"❌ Erreur lors de l'import: {str(e)}")
    import traceback
    traceback.print_exc()

print("=" * 40)
print("🏁 FIN DU TEST")