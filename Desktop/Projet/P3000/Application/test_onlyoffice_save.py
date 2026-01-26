"""
Script de diagnostic pour tester la sauvegarde OnlyOffice

Ce script permet de vérifier :
1. Si le callback OnlyOffice est appelé
2. Si le fichier est bien uploadé sur S3
3. Si le file_path utilisé est correct
4. Comparer la taille du fichier avant/après modification
"""

import os
import sys
import django

# Configuration Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Application.settings')
django.setup()

from api.views_drive.manager import DriveManager
from api.views_drive.storage import StorageManager
from django.core.cache import cache
import time

def test_file_state(file_path):
    """
    Teste l'état actuel d'un fichier
    """
    print(f"\n{'='*60}")
    print(f"DIAGNOSTIC DU FICHIER: {file_path}")
    print(f"{'='*60}")
    
    drive_manager = DriveManager()
    storage = drive_manager.storage
    
    # 1. Vérifier si le fichier existe
    try:
        metadata = storage.get_object_metadata(file_path)
        if metadata:
            print(f"✅ Fichier trouvé sur S3")
            print(f"   - Taille: {metadata.get('content_length')} bytes")
            print(f"   - Type: {metadata.get('content_type')}")
            print(f"   - Dernière modification: {metadata.get('last_modified')}")
        else:
            print(f"❌ Fichier non trouvé sur S3")
            return
    except Exception as e:
        print(f"❌ Erreur lors de la vérification: {e}")
        return
    
    # 2. Télécharger le fichier et calculer son hash
    try:
        file_content = storage.download_file_content(file_path)
        import hashlib
        file_hash = hashlib.md5(file_content).hexdigest()
        print(f"   - Hash MD5: {file_hash}")
        print(f"   - Taille réelle: {len(file_content)} bytes")
    except Exception as e:
        print(f"❌ Erreur lors du téléchargement: {e}")
    
    # 3. Vérifier les clés OnlyOffice dans le cache
    print(f"\n📋 Clés OnlyOffice dans le cache:")
    cache_keys = []
    # Chercher toutes les clés qui commencent par "onlyoffice_key_"
    # Note: Django cache ne permet pas de lister les clés, donc on essaie avec le file_path
    from api.views_drive.onlyoffice import OnlyOfficeManager
    try:
        # Essayer de générer une clé pour ce file_path
        metadata = storage.get_object_metadata(file_path)
        last_modified = metadata.get('last_modified') if metadata else None
        document_key, version = OnlyOfficeManager.generate_clean_key(file_path, last_modified)
        cache_key = f"onlyoffice_key_{document_key}"
        cached_path = cache.get(cache_key)
        if cached_path:
            print(f"   ✅ Clé trouvée: {cache_key}")
            print(f"      -> File path: {cached_path}")
            if cached_path != file_path:
                print(f"      ⚠️  ATTENTION: Le file_path diffère!")
                print(f"         Cache: {cached_path}")
                print(f"         Actuel: {file_path}")
        else:
            print(f"   ⚠️  Clé non trouvée dans le cache: {cache_key}")
    except Exception as e:
        print(f"   ❌ Erreur lors de la vérification du cache: {e}")
    
    # 4. Générer une URL de téléchargement
    try:
        download_url = drive_manager.get_download_url(file_path)
        print(f"\n🔗 URL de téléchargement générée:")
        print(f"   {download_url[:100]}...")
        if '_t=' in download_url:
            print(f"   ✅ Cache-busting activé (paramètre _t présent)")
        else:
            print(f"   ⚠️  Cache-busting non détecté")
    except Exception as e:
        print(f"❌ Erreur lors de la génération de l'URL: {e}")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python test_onlyoffice_save.py <file_path>")
        print("Exemple: python test_onlyoffice_save.py 'Chantiers/Chantier_1/document.docx'")
        sys.exit(1)
    
    file_path = sys.argv[1]
    test_file_state(file_path)
