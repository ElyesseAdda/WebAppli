#!/usr/bin/env python3
"""
Script de vérification pour myp3000app.com
Usage: python verifier_myp3000app.py
"""

import socket
import requests
import time

def verifier_myp3000app():
    domaine = "myp3000app.com"
    ip_attendue = "72.60.90.127"
    
    print(f"🔍 Vérification DNS pour {domaine}")
    print("=" * 50)
    
    # Test de résolution DNS
    try:
        ip_resolue = socket.gethostbyname(domaine)
        print(f"✅ DNS résolu: {domaine} → {ip_resolue}")
        
        if ip_resolue == ip_attendue:
            print(f"✅ IP correcte: {ip_resolue}")
        else:
            print(f"⚠️  IP différente: attendue {ip_attendue}, obtenue {ip_resolue}")
            
    except socket.gaierror:
        print(f"❌ Impossible de résoudre {domaine}")
        return False
    
    # Test www
    try:
        ip_www = socket.gethostbyname(f"www.{domaine}")
        print(f"✅ www.{domaine} → {ip_www}")
    except socket.gaierror:
        print(f"❌ Impossible de résoudre www.{domaine}")
    
    # Test HTTP
    print(f"\n🌐 Test de connectivité HTTP:")
    try:
        response = requests.get(f"http://{domaine}", timeout=10)
        print(f"✅ HTTP {domaine}: Status {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"⚠️  HTTP {domaine}: {e}")
    
    try:
        response = requests.get(f"http://www.{domaine}", timeout=10)
        print(f"✅ HTTP www.{domaine}: Status {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"⚠️  HTTP www.{domaine}: {e}")
    
    # Test de connectivité directe
    print(f"\n🔌 Test de connectivité directe:")
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        result = sock.connect_ex((ip_attendue, 80))
        sock.close()
        
        if result == 0:
            print(f"✅ Port 80 ouvert sur {ip_attendue}")
        else:
            print(f"⚠️  Port 80 fermé sur {ip_attendue}")
    except Exception as e:
        print(f"❌ Erreur de connexion: {e}")
    
    print(f"\n📋 Résumé:")
    print(f"   Domaine: {domaine}")
    print(f"   IP VPS: {ip_attendue}")
    print(f"   IP résolue: {ip_resolue}")
    print(f"   Statut: {'✅ Prêt' if ip_resolue == ip_attendue else '⚠️  À vérifier'}")

if __name__ == "__main__":
    verifier_myp3000app()
