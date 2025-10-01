from django.shortcuts import render
from django.views.generic import TemplateView
from django.views.decorators.cache import never_cache
from django.utils.decorators import method_decorator
from django.conf import settings
from django.http import HttpResponse
import os


@method_decorator(never_cache, name='dispatch')
class FrontendAppView(TemplateView):
    """
    Vue pour servir l'application React avec gestion du cache.
    @never_cache empêche le cache d'index.html pour garantir
    que les utilisateurs voient toujours la dernière version.
    """
    template_name = "frontend/index.html"
    
    def get_template_names(self):
        """
        Choisit le template selon l'environnement.
        """
        if settings.DEBUG:
            return ["frontend/index.html"]
        else:
            return ["frontend/index_production.html"]
    
    def get_context_data(self, **kwargs):
        """
        Ajoute des données de contexte pour le template.
        En mode développement, trouve automatiquement les fichiers avec hash.
        """
        context = super().get_context_data(**kwargs)
        
        # En mode développement, trouver les fichiers avec hash directement dans frontend/static
        if settings.DEBUG:
            # Chercher d'abord dans frontend/static/frontend/ (source directe)
            static_frontend_dir = os.path.join(settings.BASE_DIR, 'frontend', 'static', 'frontend')
            if not os.path.exists(static_frontend_dir):
                # Fallback vers staticfiles/frontend/ si nécessaire
                static_frontend_dir = os.path.join(settings.STATIC_ROOT, 'frontend')
            
            if os.path.exists(static_frontend_dir):
                # Trouver le fichier CSS principal (le plus récent)
                css_files = [f for f in os.listdir(static_frontend_dir) if f.startswith('main.') and f.endswith('.css')]
                js_files = [f for f in os.listdir(static_frontend_dir) if f.startswith('main.') and f.endswith('.js')]
                vendors_files = [f for f in os.listdir(static_frontend_dir) if f.startswith('vendors.') and f.endswith('.js')]
                
                # Trier par date de modification (le plus récent en premier)
                if css_files:
                    css_files.sort(key=lambda x: os.path.getmtime(os.path.join(static_frontend_dir, x)), reverse=True)
                if js_files:
                    js_files.sort(key=lambda x: os.path.getmtime(os.path.join(static_frontend_dir, x)), reverse=True)
                if vendors_files:
                    vendors_files.sort(key=lambda x: os.path.getmtime(os.path.join(static_frontend_dir, x)), reverse=True)
                
                context.update({
                    'main_css_file': css_files[0] if css_files else 'main.css',
                    'main_js_file': js_files[0] if js_files else 'main.js',
                    'vendors_js_file': vendors_files[0] if vendors_files else None,  # None si pas de vendors
                    'has_vendors': bool(vendors_files),  # Indicateur de présence
                })
        
        context.update({
            'debug': settings.DEBUG,
            'version': getattr(settings, 'VERSION', '1.0.0'),
        })
        return context


# Vue de fallback pour la compatibilité
@never_cache
def index(request, *args, **kwargs):
    """
    Vue de fallback pour maintenir la compatibilité.
    Utilise la nouvelle classe FrontendAppView.
    """
    view = FrontendAppView()
    return view.dispatch(request, *args, **kwargs)


# Vue pour vérifier l'état des fichiers statiques
@never_cache
def static_files_status(request):
    """
    Vue de debug pour vérifier l'état des fichiers statiques.
    Accessible uniquement en mode DEBUG.
    """
    if not settings.DEBUG:
        return HttpResponse("Non disponible en production", status=404)
    
    static_root = settings.STATIC_ROOT
    manifest_path = os.path.join(static_root, 'staticfiles.json')
    
    status = {
        'static_root': static_root,
        'static_root_exists': os.path.exists(static_root),
        'manifest_exists': os.path.exists(manifest_path),
        'staticfiles_storage': settings.STATICFILES_STORAGE,
    }
    
    if os.path.exists(manifest_path):
        try:
            import json
            with open(manifest_path, 'r') as f:
                manifest = json.load(f)
            status['manifest_files_count'] = len(manifest)
            status['sample_files'] = list(manifest.keys())[:5]
        except Exception as e:
            status['manifest_error'] = str(e)
    
    return HttpResponse(f"<pre>{status}</pre>", content_type="text/html")


