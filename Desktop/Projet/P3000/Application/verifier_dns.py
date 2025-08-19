#!/usr/bin/env python3
"""
Script pour vérifier la propagation DNS
Usage: python verifier_dns.py votre-domaine.com
"""

import sys
import socket
import dns.resolver
import time

def verifier_dns(domaine):
    print(f"🔍 Vérification DNS pour {domaine}")
    print("=" * 50)
    
    try:
        # Résolution A record
        print("📋 Enregistrement A:")
        reponses = dns.resolver.resolve(domaine, 'A')
        for reponse in reponses:
            print(f"   {domaine} → {reponse}")
        
        # Résolution CNAME pour www
        print("\n📋 Enregistrement CNAME (www):")
        try:
            reponses = dns.resolver.resolve(f"www.{domaine}", 'CNAME')
            for reponse in reponses:
                print(f"   www.{domaine} → {reponse}")
        except:
            print(f"   www.{domaine} → Pas de CNAME trouvé")
        
        # Test de connectivité
        print(f"\n🌐 Test de connectivité:")
        try:
            ip = socket.gethostbyname(domaine)
            print(f"   {domaine} résout vers {ip}")
            
            # Test HTTP
            import requests
            try:
                response = requests.get(f"http://{domaine}", timeout=5)
                print(f"   HTTP Status: {response.status_code}")
            except:
                print(f"   HTTP: Pas de réponse (normal si le serveur n'est pas encore configuré)")
                
        except socket.gaierror:
            print(f"   ❌ Impossible de résoudre {domaine}")
            
    except Exception as e:
        print(f"❌ Erreur: {e}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python verifier_dns.py votre-domaine.com")
        sys.exit(1)
    
    domaine = sys.argv[1]
    verifier_dns(domaine)
