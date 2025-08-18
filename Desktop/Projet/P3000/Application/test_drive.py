#!/usr/bin/env python
"""
Script de test pour les fonctions du drive
"""
import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Application.settings')
django.setup()

from api.utils import (
    is_s3_available, 
    list_s3_folders, 
    create_s3_folder, 
    delete_s3_folder,
    LOCAL_STORAGE_PATH
)

def test_drive_functions():
    """Test des fonctions du drive"""
    print("🧪 Test des fonctions du drive")
    print("=" * 50)
    
    # Test 1: Vérifier si S3 est disponible
    print(f"1. S3 disponible: {is_s3_available()}")
    
    # Test 2: Lister les dossiers
    print(f"2. Test list_s3_folders:")
    try:
        folders = list_s3_folders('')
        print(f"   - Dossiers trouvés: {len(folders)}")
        for folder in folders:
            print(f"   - {folder['name']} ({folder['path']})")
    except Exception as e:
        print(f"   - Erreur: {e}")
    
    # Test 3: Créer un dossier de test
    print(f"3. Test create_s3_folder:")
    try:
        success = create_s3_folder('test_folder')
        print(f"   - Création réussie: {success}")
    except Exception as e:
        print(f"   - Erreur: {e}")
    
    # Test 4: Lister à nouveau
    print(f"4. Test list_s3_folders après création:")
    try:
        folders = list_s3_folders('')
        print(f"   - Dossiers trouvés: {len(folders)}")
        for folder in folders:
            print(f"   - {folder['name']} ({folder['path']})")
    except Exception as e:
        print(f"   - Erreur: {e}")
    
    # Test 5: Supprimer le dossier de test
    print(f"5. Test delete_s3_folder:")
    try:
        success = delete_s3_folder('test_folder')
        print(f"   - Suppression réussie: {success}")
    except Exception as e:
        print(f"   - Erreur: {e}")
    
    print("=" * 50)
    print("✅ Test terminé")

if __name__ == "__main__":
    test_drive_functions()
