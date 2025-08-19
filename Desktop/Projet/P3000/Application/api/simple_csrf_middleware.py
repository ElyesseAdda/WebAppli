from django.utils.deprecation import MiddlewareMixin
import re

class SimpleCSRFMiddleware(MiddlewareMixin):
    """
    Middleware simple pour désactiver CSRF pour les APIs
    """
    def process_request(self, request):
        # Désactiver CSRF pour toutes les URLs commençant par /api/
        if request.path.startswith('/api/'):
            request._dont_enforce_csrf_checks = True
        return None
