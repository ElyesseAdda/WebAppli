from django.utils.deprecation import MiddlewareMixin
from django.middleware.csrf import get_token
from django.conf import settings
import re

class CSRFMiddleware(MiddlewareMixin):
    """
    Middleware personnalisé pour gérer CSRF avec les API
    """
    def process_request(self, request):
        # URLs à exclure de la vérification CSRF (toutes les API)
        csrf_exempt_urls = getattr(settings, 'CSRF_EXEMPT_URLS', [
            r'^/api/.*$',  # Toutes les URLs commençant par /api/
        ])
        
        # Vérifier si l'URL actuelle doit être exemptée de CSRF
        path = request.path_info.lstrip('/')
        for pattern in csrf_exempt_urls:
            if re.match(pattern, path):
                # Marquer la requête comme exemptée de CSRF
                request._dont_enforce_csrf_checks = True
                break
        
        # Toujours générer le token CSRF pour qu'il soit disponible dans les cookies
        # même si on ne l'utilise pas pour la vérification
        get_token(request)
        return None

    def process_response(self, request, response):
        """
        S'assurer que le token CSRF est disponible dans la réponse
        """
        # Si c'est une requête API et qu'on a généré un token CSRF
        if hasattr(request, 'csrf_cookie_set') and not request.csrf_cookie_set:
            get_token(request)
            request.csrf_cookie_set = True
        
        return response
