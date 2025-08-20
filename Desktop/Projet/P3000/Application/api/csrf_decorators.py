"""
Décorateurs CSRF pour les APIs REST
Basé sur la documentation officielle Django
"""
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from functools import wraps
from django.http import HttpResponseForbidden
from django.middleware.csrf import get_token
import re

def csrf_exempt_for_api(view_func):
    """
    Décorateur pour exempter les vues API de CSRF
    """
    @wraps(view_func)
    def wrapped_view(request, *args, **kwargs):
        # Vérifier si c'est une requête API
        if request.path.startswith('/api/'):
            # Exempter de CSRF pour les APIs
            request._dont_enforce_csrf_checks = True
        return view_func(request, *args, **kwargs)
    return wrapped_view

def csrf_exempt_viewset(viewset_class):
    """
    Décorateur pour exempter un ViewSet de CSRF
    """
    return method_decorator(csrf_exempt, name='dispatch')(viewset_class)

def ensure_csrf_cookie_for_api(view_func):
    """
    Décorateur pour s'assurer que le token CSRF est disponible pour les APIs
    """
    @wraps(view_func)
    def wrapped_view(request, *args, **kwargs):
        # Toujours générer le token CSRF
        get_token(request)
        return view_func(request, *args, **kwargs)
    return wrapped_view

# Liste des patterns d'URLs à exempter de CSRF
CSRF_EXEMPT_PATTERNS = [
    r'^/api/create-devis/$',  # Spécifiquement pour la création de devis
    r'^/api/csrf-token/$',  # Endpoint pour récupérer le token CSRF
    # Ne pas exempter les URLs d'authentification !
    # r'^/api/auth/.*$',  # Commenté pour garder l'authentification
]

def is_csrf_exempt_url(path):
    """
    Vérifie si une URL doit être exemptée de CSRF
    """
    for pattern in CSRF_EXEMPT_PATTERNS:
        if re.match(pattern, path):
            return True
    return False
