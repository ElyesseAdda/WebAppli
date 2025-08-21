#!/usr/bin/env python
"""
Script pour vérifier la structure actuelle de la base de données
"""
import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Application.settings')
django.setup()

from django.db import connection

def check_table_structure():
    """Vérifie la structure de la table paiementsoustraitant"""
    with connection.cursor() as cursor:
        # Vérifier les colonnes existantes
        cursor.execute("PRAGMA table_info(api_paiementsoustraitant)")
        columns = cursor.fetchall()
        
        print("=== Structure actuelle de la table api_paiementsoustraitant ===")
        for col in columns:
            print(f"Colonne: {col[1]} | Type: {col[2]} | NotNull: {col[3]} | Default: {col[4]}")
        
        # Vérifier les données existantes
        cursor.execute("SELECT COUNT(*) FROM api_paiementsoustraitant")
        count = cursor.fetchone()[0]
        print(f"\nNombre d'enregistrements: {count}")
        
        if count > 0:
            cursor.execute("SELECT * FROM api_paiementsoustraitant LIMIT 3")
            sample_data = cursor.fetchall()
            print("\n=== Exemple de données ===")
            for row in sample_data:
                print(row)

if __name__ == "__main__":
    check_table_structure()
