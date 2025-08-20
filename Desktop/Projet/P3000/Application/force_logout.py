#!/usr/bin/env python3
"""
Script pour forcer la déconnexion de tous les utilisateurs
"""
import os
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Application.settings')
django.setup()

from django.contrib.sessions.models import Session
from django.utils import timezone
from datetime import timedelta

def force_logout_all_users():
    """Force la déconnexion de tous les utilisateurs"""
    print("🔐 Forçage de la déconnexion de tous les utilisateurs...")
    
    # Supprimer toutes les sessions
    sessions_count = Session.objects.all().count()
    Session.objects.all().delete()
    
    print(f"✅ {sessions_count} sessions supprimées")
    print("✅ Tous les utilisateurs sont maintenant déconnectés")
    
    # Vérifier qu'il n'y a plus de sessions
    remaining_sessions = Session.objects.all().count()
    print(f"📊 Sessions restantes: {remaining_sessions}")

def expire_old_sessions():
    """Expire les sessions anciennes"""
    print("⏰ Expiration des sessions anciennes...")
    
    # Supprimer les sessions expirées
    now = timezone.now()
    expired_sessions = Session.objects.filter(expire_date__lt=now)
    expired_count = expired_sessions.count()
    expired_sessions.delete()
    
    print(f"✅ {expired_count} sessions expirées supprimées")

if __name__ == "__main__":
    print("=" * 50)
    print("🔄 GESTION DES SESSIONS DJANGO")
    print("=" * 50)
    
    # Expirer les sessions anciennes
    expire_old_sessions()
    
    # Forcer la déconnexion
    force_logout_all_users()
    
    print("=" * 50)
    print("✅ Opération terminée!")
    print("=" * 50)
