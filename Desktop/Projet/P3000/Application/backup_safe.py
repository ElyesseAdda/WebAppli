#!/usr/bin/env python
"""
Script de sauvegarde sécurisé avant migration
"""
import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Application.settings')
django.setup()

from django.core.management import call_command

def create_safe_backup():
    """Crée une sauvegarde en excluant le nouveau modèle"""
    try:
        # Sauvegarde de toutes les données sauf PaiementGlobalSousTraitant
        call_command('dumpdata', 
                    exclude=['api.PaiementGlobalSousTraitant'],
                    output='backup_safe_before_migration.json',
                    indent=2)
        print("✅ Sauvegarde sécurisée créée : backup_safe_before_migration.json")
        
        # Vérifier la structure de la base
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("PRAGMA table_info(api_paiementsoustraitant)")
            columns = cursor.fetchall()
            
            print("\n=== Structure actuelle de la table api_paiementsoustraitant ===")
            for col in columns:
                print(f"Colonne: {col[1]} | Type: {col[2]} | NotNull: {col[3]}")
            
            cursor.execute("SELECT COUNT(*) FROM api_paiementsoustraitant")
            count = cursor.fetchone()[0]
            print(f"\nNombre d'enregistrements: {count}")
            
    except Exception as e:
        print(f"❌ Erreur lors de la sauvegarde : {e}")

if __name__ == "__main__":
    create_safe_backup()
