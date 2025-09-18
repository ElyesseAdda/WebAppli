import json
import os
from django import template
from django.templatetags.static import static
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

register = template.Library()

def load_react_manifest():
    """
    Charge le manifest React au démarrage de l'application.
    Retourne un dictionnaire vide si le fichier n'existe pas.
    """
    try:
        manifest_path = os.path.join(settings.BASE_DIR, 'frontend', 'static', 'frontend', 'asset-manifest.json')
        if os.path.exists(manifest_path):
            with open(manifest_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return data.get('files', {})
        else:
            # Fallback : chercher les fichiers directement dans le dossier
            return get_fallback_manifest()
    except (json.JSONDecodeError, IOError) as e:
        print(f"Erreur lors du chargement du manifest React: {e}")
        return get_fallback_manifest()

def get_fallback_manifest():
    """
    Fallback : scanne le dossier frontend/static/frontend/ pour trouver les fichiers
    """
    manifest = {}
    frontend_dir = os.path.join(settings.BASE_DIR, 'frontend', 'static', 'frontend')
    
    if os.path.exists(frontend_dir):
        for filename in os.listdir(frontend_dir):
            if filename.endswith(('.js', '.css')):
                # Extraire le nom de base (sans hash)
                if filename.startswith('main.'):
                    if filename.endswith('.js'):
                        manifest['main.js'] = filename
                    elif filename.endswith('.css'):
                        manifest['main.css'] = filename
                elif filename.startswith('runtime-main.'):
                    manifest['runtime-main.js'] = filename
                elif filename.startswith('vendors'):
                    manifest['vendors~main.js'] = filename
    
    return manifest

# Charger le manifest au démarrage
REACT_MANIFEST = load_react_manifest()

@register.simple_tag
def react_static(name):
    """
    Renvoie le chemin complet vers le fichier React haché.
    
    Usage dans les templates :
    {% react_static 'main.js' %}
    {% react_static 'main.css' %}
    {% react_static 'runtime-main.js' %}
    {% react_static 'vendors~main.js' %}
    """
    filename = REACT_MANIFEST.get(name)
    if filename:
        return static(f'frontend/{filename}')
    
    # Si le fichier n'est pas trouvé, retourner une chaîne vide
    # pour éviter les erreurs 404
    return ''

@register.simple_tag
def react_static_exists(name):
    """
    Vérifie si un fichier React existe dans le manifest.
    
    Usage :
    {% react_static_exists 'vendors~main.js' as has_vendors %}
    {% if has_vendors %}
        <script src="{% react_static 'vendors~main.js' %}"></script>
    {% endif %}
    """
    return name in REACT_MANIFEST

@register.simple_tag
def react_manifest_info():
    """
    Retourne des informations de debug sur le manifest.
    Utile pour le développement.
    """
    return {
        'files_count': len(REACT_MANIFEST),
        'files': list(REACT_MANIFEST.keys()),
        'manifest_loaded': bool(REACT_MANIFEST)
    }
