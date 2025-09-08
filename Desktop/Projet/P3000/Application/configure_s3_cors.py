#!/usr/bin/env python3
"""
Script pour configurer CORS sur le bucket S3
"""
import boto3
import json
import os
import sys

# Ajouter le répertoire parent au path Python
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def configure_s3_cors():
    """Configure CORS sur le bucket S3"""
    
    # Configuration CORS
    cors_configuration = [
        {
            "AllowedHeaders": ["*"],
            "AllowedMethods": ["GET", "POST", "PUT", "DELETE", "HEAD"],
            "AllowedOrigins": [
                "http://127.0.0.1:8000",
                "http://localhost:8000", 
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "https://myp3000app.com",
                "https://www.myp3000app.com"
            ],
            "ExposeHeaders": ["ETag", "x-amz-meta-custom-header"],
            "MaxAgeSeconds": 3000
        }
    ]
    
    try:
        # Charger les variables d'environnement depuis le fichier .env
        from pathlib import Path
        env_file = Path(__file__).parent / '.env'
        if env_file.exists():
            with open(env_file, 'r') as f:
                for line in f:
                    if '=' in line and not line.startswith('#'):
                        key, value = line.strip().split('=', 1)
                        os.environ[key] = value.strip('"').strip("'")
        
        # Créer le client S3 avec les bonnes variables d'environnement
        s3_client = boto3.client(
            's3',
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
            region_name=os.getenv('AWS_S3_REGION_NAME', 'eu-north-1')
        )
        
        bucket_name = os.getenv('AWS_STORAGE_BUCKET_NAME', 'agency-drive-prod')
        
        # Appliquer la configuration CORS
        s3_client.put_bucket_cors(
            Bucket=bucket_name,
            CORSConfiguration={'CORSRules': cors_configuration}
        )
        
        print(f"✅ Configuration CORS appliquée avec succès sur le bucket {bucket_name}")
        
        # Vérifier la configuration
        response = s3_client.get_bucket_cors(Bucket=bucket_name)
        print("📋 Configuration CORS actuelle :")
        print(json.dumps(response['CORSRules'], indent=2))
        
    except Exception as e:
        print(f"❌ Erreur lors de la configuration CORS : {e}")

if __name__ == "__main__":
    # Charger les variables d'environnement Django
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Application.settings')
    
    try:
        import django
        django.setup()
        configure_s3_cors()
    except ImportError as e:
        print(f"❌ Erreur d'import Django : {e}")
        print("💡 Essayez de lancer le script depuis le répertoire racine du projet Django")
        print("   Ou utilisez la configuration manuelle via AWS Console")
        
        # Configuration alternative sans Django
        print("\n🔄 Tentative de configuration sans Django...")
        configure_s3_cors()
