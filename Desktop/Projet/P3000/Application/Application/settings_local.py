"""
Configuration Django pour l'environnement LOCAL/DEVELOPPEMENT
"""

from .settings_base import *

# Configuration spécifique au développement local
DEBUG = True

# Configuration de sécurité relâchée pour le développement
SECURE_SSL_REDIRECT = False
SECURE_HSTS_SECONDS = 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = False
SECURE_HSTS_PRELOAD = False
SECURE_BROWSER_XSS_FILTER = False
SECURE_CONTENT_TYPE_NOSNIFF = False

# Cookies non sécurisés pour le développement
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False

# Configuration des logs pour le développement (simplifiée)
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'DEBUG',
    },
}

# Email backend pour le développement (console)
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Configuration de cache pour le développement
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'unique-snowflake',
    }
}

# Configuration pour les fichiers statiques en développement
# Utiliser StaticFilesStorage (sans hachage) pour le développement
STATICFILES_STORAGE = 'django.contrib.staticfiles.storage.StaticFilesStorage'

# Configuration pour les médias en développement
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Configuration CORS pour le développement React
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',  # React dev server
    'http://127.0.0.1:3000',
]

# Configuration pour le développement React
CORS_ALLOW_CREDENTIALS = True
CORS_EXPOSE_HEADERS = ['X-CSRFToken']

# Configuration pour le débogage des templates
TEMPLATES[0]['OPTIONS']['debug'] = True

# Configuration pour les tests
TEST_RUNNER = 'django.test.runner.DiscoverRunner'

# Configuration pour les migrations automatiques
MIGRATION_MODULES = {
    'api': 'api.migrations',
    'frontend': 'frontend.migrations',
}

# Configuration forcée de la base de données locale
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'p3000db_local',
        'USER': 'p3000user',
        'PASSWORD': 'Boumediene30',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}
