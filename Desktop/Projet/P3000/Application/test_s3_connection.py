#!/usr/bin/env python3
"""
Script pour tester la connexion S3 avec Django configuré
"""
import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Application.settings')
django.setup()

def test_s3_connection():
    """Teste la connexion S3"""
    print("🔍 Test de la connexion S3")
    print("=" * 50)
    
    try:
        from api.utils import get_s3_client, get_s3_bucket_name, is_s3_available
        
        # Vérifier les variables d'environnement
        print("📋 Variables d'environnement AWS:")
        print(f"   AWS_ACCESS_KEY_ID: {'✅ Définie' if os.getenv('AWS_ACCESS_KEY_ID') else '❌ Manquante'}")
        print(f"   AWS_SECRET_ACCESS_KEY: {'✅ Définie' if os.getenv('AWS_SECRET_ACCESS_KEY') else '❌ Manquante'}")
        print(f"   AWS_STORAGE_BUCKET_NAME: {'✅ Définie' if os.getenv('AWS_STORAGE_BUCKET_NAME') else '❌ Manquante'}")
        print(f"   AWS_S3_REGION_NAME: {os.getenv('AWS_S3_REGION_NAME', 'eu-north-1 (défaut)')}")
        
        # Tester la disponibilité S3
        print("\n🧪 Test de disponibilité S3:")
        s3_available = is_s3_available()
        print(f"   S3 disponible: {'✅ Oui' if s3_available else '❌ Non'}")
        
        if s3_available:
            # Tester le client S3
            print("\n🔧 Test du client S3:")
            s3_client = get_s3_client()
            bucket_name = get_s3_bucket_name()
            
            if s3_client and bucket_name:
                print(f"   Client S3: ✅ Créé")
                print(f"   Bucket: {bucket_name}")
                
                # Tester l'accès au bucket
                try:
                    response = s3_client.head_bucket(Bucket=bucket_name)
                    print(f"   Accès bucket: ✅ OK")
                    print(f"   Région: {response.get('ResponseMetadata', {}).get('HTTPHeaders', {}).get('x-amz-bucket-region', 'Non spécifiée')}")
                except Exception as e:
                    print(f"   Accès bucket: ❌ Erreur - {str(e)}")
            else:
                print(f"   Client S3: ❌ Non créé")
        else:
            print("\n💡 S3 non disponible - Vérifiez vos variables d'environnement")
            
    except Exception as e:
        print(f"❌ Erreur lors du test: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_s3_connection()
