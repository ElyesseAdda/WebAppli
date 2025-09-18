from django.urls import path, re_path
from .views import FrontendAppView, index, static_files_status


urlpatterns = [
    # Vue principale avec @never_cache
    path('', FrontendAppView.as_view(), name='frontend'),
    
    # Vue de debug pour les fichiers statiques (développement uniquement)
    path('debug/static-files/', static_files_status, name='static_files_status'),
    
    # Fallback pour toutes les autres URLs (SPA routing)
    re_path(r'^(?!api/|admin/|debug/).*$', FrontendAppView.as_view()),
]