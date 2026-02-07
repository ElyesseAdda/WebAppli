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
    """Configure CORS sur le bucket S3.
    
    Les origines sont construites dynamiquement :
    - Origines locales de dev (localhost, 127.0.0.1)
    - Domaine public du client (depuis CLIENT_PUBLIC_DOMAIN ou ALLOWED_HOSTS dans .env)
    - IP/URL du serveur OnlyOffice (depuis ONLYOFFICE_SERVER_URL dans .env)
    """
    
    # Origines de base (dev local)
    allowed_origins = [
        "http://127.0.0.1:8000",
        "http://localhost:8000", 
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8080",  # OnlyOffice local
        "http://127.0.0.1:8080",  # OnlyOffice local
    ]
    
    # Ajouter le domaine public du client depuis l'environnement
    client_domain = os.getenv('CLIENT_PUBLIC_DOMAIN', '')
    if client_domain:
        allowed_origins.append(f"https://{client_domain}")
        if not client_domain.startswith('www.'):
            allowed_origins.append(f"https://www.{client_domain}")
    
    # Fallback : lire ALLOWED_HOSTS pour trouver le domaine public
    allowed_hosts = os.getenv('ALLOWED_HOSTS', '')
    if allowed_hosts:
        for host in allowed_hosts.split(','):
            host = host.strip()
            if host and host not in ('localhost', '127.0.0.1', 'host.docker.internal', '*'):
                https_origin = f"https://{host}"
                if https_origin not in allowed_origins:
                    allowed_origins.append(https_origin)
    
    # Ajouter l'origine du serveur OnlyOffice de production
    onlyoffice_url = os.getenv('ONLYOFFICE_SERVER_URL', '')
    if onlyoffice_url and 'localhost' not in onlyoffice_url and '127.0.0.1' not in onlyoffice_url:
        # Extraire l'origine (scheme + host + port)
        from urllib.parse import urlparse
        parsed = urlparse(onlyoffice_url)
        origin = f"{parsed.scheme}://{parsed.netloc}"
        if origin not in allowed_origins:
            allowed_origins.append(origin)
    
    # Configuration CORS
    cors_configuration = [
        {
            "AllowedHeaders": ["*"],
            "AllowedMethods": ["GET", "POST", "PUT", "DELETE", "HEAD"],
            "AllowedOrigins": allowed_origins,
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
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', os.getenv('DJANGO_SETTINGS_MODULE', 'Application.settings'))
    
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
