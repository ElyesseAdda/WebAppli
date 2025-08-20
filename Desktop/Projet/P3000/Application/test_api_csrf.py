#!/usr/bin/env python3
"""
Script pour tester que toutes les URLs API sont exemptées de CSRF
"""
import os
import django
import re

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Application.settings')
django.setup()

from api.csrf_decorators import CSRF_EXEMPT_PATTERNS, is_csrf_exempt_url

def test_api_urls():
    """Teste que toutes les URLs API sont exemptées de CSRF"""
    print("🧪 TEST DES EXEMPTIONS CSRF POUR LES APIs")
    print("=" * 60)
    
    # URLs API à tester
    test_urls = [
        '/api/create-devis/',
        '/api/auth/login/',
        '/api/auth/logout/',
        '/api/chantier/',
        '/api/societe/',
        '/api/devisa/',
        '/api/stock/',
        '/api/agent/',
        '/api/facture/',
        '/api/bons-commande/',
        '/api/situations/',
        '/api/dashboard/',
        '/api/generate-pdf-from-preview/',
        '/api/preview-devis/',
        '/api/list-devis/',
        '/api/create-facture/',
        '/api/drive/',
        '/api/fournisseurs/',
        '/api/banques/',
        '/api/sous-traitants/',
    ]
    
    print("📋 URLs testées:")
    for url in test_urls:
        is_exempt = is_csrf_exempt_url(url)
        status = "✅ EXEMPTÉ" if is_exempt else "❌ NON EXEMPTÉ"
        print(f"  {url:<40} {status}")
    
    print("\n📊 Statistiques:")
    exempt_count = sum(1 for url in test_urls if is_csrf_exempt_url(url))
    total_count = len(test_urls)
    print(f"  URLs exemptées: {exempt_count}/{total_count}")
    print(f"  Taux de réussite: {(exempt_count/total_count)*100:.1f}%")
    
    if exempt_count == total_count:
        print("\n🎉 TOUTES LES URLs API SONT EXEMPTÉES DE CSRF!")
    else:
        print("\n⚠️  CERTAINES URLs NE SONT PAS EXEMPTÉES!")

def show_patterns():
    """Affiche tous les patterns d'exemption"""
    print("\n🔍 PATTERNS D'EXEMPTION CSRF:")
    print("=" * 60)
    for i, pattern in enumerate(CSRF_EXEMPT_PATTERNS, 1):
        print(f"{i:2d}. {pattern}")

if __name__ == "__main__":
    test_api_urls()
    show_patterns()
