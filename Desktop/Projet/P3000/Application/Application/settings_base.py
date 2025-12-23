"""
Configuration de base Django pour P3000 Application
Ce fichier contient les paramètres communs à tous les environnements
"""

from pathlib import Path
import os

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Charger les variables d'environnement depuis le fichier .env
def load_env_file():
    """Charge les variables d'environnement depuis le fichier .env"""
    env_file = BASE_DIR / '.env'
    if env_file.exists():
        with open(env_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key.strip()] = value.strip().strip('"').strip("'")

# Charger le fichier .env
load_env_file()

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-change-this-in-production')

# Configuration conditionnelle pour développement vs production
DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'

# Configuration ALLOWED_HOSTS
# Par défaut, inclure l'IP du serveur de production et les domaines
default_hosts = 'myp3000app.com,www.myp3000app.com,72.60.90.127,localhost,127.0.0.1,host.docker.internal'
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', default_hosts).split(',')

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.humanize',
    'api.apps.ApiConfig',
    'rest_framework',
    'frontend.apps.FrontendConfig',
    'corsheaders',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'api.simple_csrf_middleware.SimpleCSRFMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'api.onlyoffice_middleware.OnlyOfficeFrameOptionsMiddleware',  # Autoriser OnlyOffice dans iframe
]

# Configuration CORS
CORS_ALLOWED_ORIGINS = os.getenv('CORS_ALLOWED_ORIGINS', 'http://localhost:3000').split(',') if os.getenv('CORS_ALLOWED_ORIGINS') else ["http://localhost:3000"]
CORS_ALLOW_CREDENTIALS = True

# Configuration CSRF
CSRF_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SECURE = os.getenv('CSRF_COOKIE_SECURE', 'False').lower() == 'true'
CSRF_COOKIE_HTTPONLY = os.getenv('CSRF_COOKIE_HTTPONLY', 'False').lower() == 'true'
CSRF_TRUSTED_ORIGINS = os.getenv('CSRF_TRUSTED_ORIGINS', 'http://localhost:3000').split(',') if os.getenv('CSRF_TRUSTED_ORIGINS') else ["http://localhost:3000"]
CSRF_USE_SESSIONS = False

# Configuration des sessions
SESSION_COOKIE_AGE = 3600
SESSION_EXPIRE_AT_BROWSER_CLOSE = True
SESSION_SAVE_EVERY_REQUEST = True
SESSION_COOKIE_HTTPONLY = os.getenv('SESSION_COOKIE_HTTPONLY', 'True').lower() == 'true'
SESSION_COOKIE_SECURE = os.getenv('SESSION_COOKIE_SECURE', 'False').lower() == 'true'
SESSION_COOKIE_SAMESITE = 'Lax'

# Désactiver CSRF pour toutes les URLs API
CSRF_EXEMPT_URLS = [r'^/api/.*$']
CSRF_EXEMPT_PATTERNS = [r'^/api/.*$']

ROOT_URLCONF = 'Application.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'Application.wsgi.application'

# Configuration de la base de données
def get_database_config():
    """Retourne la configuration de base de données selon l'environnement"""
    database_url = os.getenv('DATABASE_URL')
    if database_url:
        # Utiliser DATABASE_URL si disponible
        import dj_database_url
        return dj_database_url.parse(database_url)
    else:
        # Configuration par défaut
        return {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.getenv('DB_NAME', 'p3000db'),
            'USER': os.getenv('DB_USER', 'p3000user'),
            'PASSWORD': os.getenv('DB_PASSWORD', 'Boumediene30'),
            'HOST': os.getenv('DB_HOST', 'localhost'),
            'PORT': os.getenv('DB_PORT', '5432'),
        }

DATABASES = {
    'default': get_database_config()
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'fr-fr'
TIME_ZONE = 'Europe/Paris'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# Configuration des répertoires statiques
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'frontend', 'static', 'frontend'),
    os.path.join(BASE_DIR, 'frontend', 'src', 'img'),
]

# Configuration Django REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
}

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Configuration OnlyOffice Document Server
ONLYOFFICE_SERVER_URL = os.getenv('ONLYOFFICE_SERVER_URL', 'http://localhost:8080')
ONLYOFFICE_JWT_SECRET = os.getenv('ONLYOFFICE_JWT_SECRET', 'votre-secret-jwt-super-long-et-complexe')
ONLYOFFICE_JWT_ENABLED = os.getenv('ONLYOFFICE_JWT_ENABLED', 'true').lower() == 'true'
ONLYOFFICE_JWT_HEADER = os.getenv('ONLYOFFICE_JWT_HEADER', 'Authorization')

# Configuration X-Frame-Options pour autoriser OnlyOffice dans un iframe
# Le middleware OnlyOfficeFrameOptionsMiddleware gère spécifiquement les pages OnlyOffice
# Pour les autres pages, on garde DENY par défaut pour la sécurité
X_FRAME_OPTIONS = 'DENY'

# Version de l'application
VERSION = '1.0.0'
