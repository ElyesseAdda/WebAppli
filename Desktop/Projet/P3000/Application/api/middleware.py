from django.utils.deprecation import MiddlewareMixin
from django.middleware.csrf import get_token

class CSRFMiddleware(MiddlewareMixin):
    """
    Middleware personnalisé pour gérer CSRF avec les API
    """
    def process_request(self, request):
        # Forcer la génération du token CSRF pour toutes les requêtes
        get_token(request)
        return None
