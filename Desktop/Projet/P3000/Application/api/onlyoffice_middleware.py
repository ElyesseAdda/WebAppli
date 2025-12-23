"""
Middleware pour autoriser OnlyOffice à afficher l'application dans un iframe
"""

from django.utils.deprecation import MiddlewareMixin


class OnlyOfficeFrameOptionsMiddleware(MiddlewareMixin):
    """
    Middleware qui désactive X-Frame-Options pour les pages OnlyOffice
    pour permettre à OnlyOffice d'afficher l'application dans un iframe
    """
    
    def process_response(self, request, response):
        # Vérifier si c'est une requête pour OnlyOffice
        # Les pages OnlyOffice sont généralement accessibles via /drive-v2/editor
        # ou via les endpoints API OnlyOffice
        onlyoffice_paths = [
            '/drive-v2/editor',
            '/api/drive-v2/onlyoffice-config/',
            '/api/drive-v2/onlyoffice-callback/',
            '/api/drive-v2/proxy-file/',
        ]
        
        # Vérifier si le chemin correspond à une page OnlyOffice
        is_onlyoffice = any(request.path.startswith(path) for path in onlyoffice_paths)
        
        # Si c'est une page OnlyOffice, retirer X-Frame-Options
        if is_onlyoffice:
            # Retirer X-Frame-Options pour permettre l'affichage dans un iframe
            if 'X-Frame-Options' in response:
                del response['X-Frame-Options']
            
            # Ajouter Content-Security-Policy pour autoriser OnlyOffice
            # Extraire le domaine OnlyOffice depuis les settings
            from django.conf import settings
            if hasattr(settings, 'ONLYOFFICE_SERVER_URL'):
                from urllib.parse import urlparse
                onlyoffice_url = settings.ONLYOFFICE_SERVER_URL
                onlyoffice_parsed = urlparse(onlyoffice_url)
                onlyoffice_domain = f"{onlyoffice_parsed.scheme}://{onlyoffice_parsed.netloc}"
                
                # Autoriser OnlyOffice et le même domaine
                csp_value = f"frame-ancestors {onlyoffice_domain} 'self'"
                response['Content-Security-Policy'] = csp_value
        
        return response

