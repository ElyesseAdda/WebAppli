#!/usr/bin/env python
"""
Script de rollback en cas de problème avec la migration
"""
import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Application.settings')
django.setup()

from django.db import connection

def rollback_migration():
    """Rollback de la migration si nécessaire"""
    with connection.cursor() as cursor:
        # Supprimer la table PaiementGlobalSousTraitant si elle existe
        cursor.execute("""
            DROP TABLE IF EXISTS api_paiementglobalsoustraitant;
        """)
        
        # Supprimer l'enregistrement de migration
        cursor.execute("""
            DELETE FROM django_migrations 
            WHERE app = 'api' AND name = '0010_add_paiement_global_system';
        """)
        
        print("Rollback effectué avec succès")

if __name__ == "__main__":
    print("ATTENTION: Ce script va supprimer les nouvelles fonctionnalités.")
    response = input("Êtes-vous sûr de vouloir continuer ? (oui/non): ")
    
    if response.lower() == 'oui':
        rollback_migration()
    else:
        print("Rollback annulé")
