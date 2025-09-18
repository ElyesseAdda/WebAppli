from django.urls import path, re_path
from django.shortcuts import render
from .views import FrontendAppView, index, static_files_status

def debug_assets(request):
    """Vue de debug pour les assets React"""
    return render(request, 'frontend/debug_assets.html')

def debug_react_static(request):
    """Vue de debug pour le template tag react_static"""
    return render(request, 'frontend/debug_react_static.html')

urlpatterns = [
    # Vue principale avec @never_cache
    path('', FrontendAppView.as_view(), name='frontend'),
    
    # Vue de debug pour les fichiers statiques (développement uniquement)
    path('debug/static-files/', static_files_status, name='static_files_status'),
    
    # Vue de debug pour les assets React
    path('debug/assets/', debug_assets, name='debug_assets'),
    
    # Vue de debug pour le template tag react_static
    path('debug/react-static/', debug_react_static, name='debug_react_static'),
    
    # Fallback pour toutes les autres URLs (SPA routing)
    re_path(r'^(?!api/|admin/|debug/).*$', FrontendAppView.as_view()),
]