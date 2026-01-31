"""
Middleware pour autoriser OnlyOffice et les previews de documents à s'afficher dans un iframe
"""

from django.utils.deprecation import MiddlewareMixin


class OnlyOfficeFrameOptionsMiddleware(MiddlewareMixin):
    """
    Middleware qui désactive X-Frame-Options pour les pages OnlyOffice
    et les previews de documents pour permettre l'affichage dans un iframe
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
        
        # Pages de preview de documents (pour affichage en iframe)
        preview_paths = [
            '/api/preview-distributeur-monthly-report/',
            '/api/preview-monthly-agents-report/',
            '/api/preview-devis/',
            '/api/preview-saved-devis/',
            '/api/preview-facture/',
            '/api/preview-situation/',
            '/api/preview-bon-commande/',
            '/api/preview-contrat/',
            '/api/preview-avenant/',
            '/api/preview-planning-hebdo/',
        ]
        
        # Vérifier si le chemin correspond à une page OnlyOffice
        is_onlyoffice = any(request.path.startswith(path) for path in onlyoffice_paths)
        
        # Vérifier si le chemin correspond à une preview de document
        is_preview = any(request.path.startswith(path) for path in preview_paths)
        
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
        
        # Si c'est une preview de document, autoriser l'affichage depuis le même domaine
        elif is_preview:
            # Remplacer X-Frame-Options: DENY par SAMEORIGIN
            response['X-Frame-Options'] = 'SAMEORIGIN'
        
        return response

