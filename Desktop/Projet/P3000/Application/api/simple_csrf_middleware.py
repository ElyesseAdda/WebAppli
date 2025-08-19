"""
Middleware CSRF simple basé sur la documentation Django officielle
"""
from django.utils.deprecation import MiddlewareMixin
from django.middleware.csrf import get_token
from .csrf_decorators import is_csrf_exempt_url

class SimpleCSRFMiddleware(MiddlewareMixin):
    """
    Middleware CSRF simple qui exempte les APIs selon la documentation Django
    """
    
    def process_request(self, request):
        """
        Traite la requête et exempte les APIs de CSRF
        """
        # Vérifier si l'URL doit être exemptée
        if is_csrf_exempt_url(request.path):
            # Marquer la requête comme exemptée de CSRF
            request._dont_enforce_csrf_checks = True
        
        # Toujours générer le token CSRF pour qu'il soit disponible
        get_token(request)
        
        return None

    def process_response(self, request, response):
        """
        Traite la réponse pour s'assurer que les tokens CSRF sont disponibles
        """
        # Si c'est une requête API, s'assurer que le token CSRF est disponible
        if request.path.startswith('/api/'):
            get_token(request)
        
        return response
