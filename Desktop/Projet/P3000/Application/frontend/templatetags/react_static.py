import json
import os
from django import template
from django.templatetags.static import static
from django.conf import settings

register = template.Library()

# Cache global pour le manifest afin de ne pas le relire à chaque rendu
_ASSET_MANIFEST_CACHE = None

def _load_manifest():
    """
    Charge le manifest React avec cache global pour optimiser les performances.
    Le manifest n'est lu qu'une seule fois par instance Python.
    """
    global _ASSET_MANIFEST_CACHE
    if _ASSET_MANIFEST_CACHE is not None:
        return _ASSET_MANIFEST_CACHE

    # En développement, chercher d'abord dans frontend/static/frontend/
    if settings.DEBUG:
        manifest_path = os.path.join(
            settings.BASE_DIR, 'frontend', 'static', 'frontend', 'asset-manifest.json'
        )
    else:
        # En production, utiliser le manifest dans staticfiles
        manifest_path = os.path.join(
            settings.STATIC_ROOT, 'frontend', 'asset-manifest.json'
        )

    if os.path.exists(manifest_path):
        try:
            with open(manifest_path, 'r', encoding='utf-8') as f:
                _ASSET_MANIFEST_CACHE = json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            print(f"Erreur lors du chargement du manifest React: {e}")
            _ASSET_MANIFEST_CACHE = {}
    else:
        # Fallback : scanner le dossier pour trouver les fichiers hachés
        _ASSET_MANIFEST_CACHE = _scan_frontend_files()

    return _ASSET_MANIFEST_CACHE

def _scan_frontend_files():
    """
    Fallback : scanne le dossier frontend/static/frontend/ pour trouver les fichiers hachés
    et créer un manifest virtuel.
    """
    manifest = {'files': {}}
    
    # En développement, chercher dans frontend/static/frontend/
    if settings.DEBUG:
        frontend_dir = os.path.join(settings.BASE_DIR, 'frontend', 'static', 'frontend')
    else:
        # En production, chercher dans staticfiles/frontend/
        frontend_dir = os.path.join(settings.STATIC_ROOT, 'frontend')
    
    if os.path.exists(frontend_dir):
        for filename in os.listdir(frontend_dir):
            if filename.endswith(('.js', '.css')):
                # Mapper les fichiers hachés vers leurs noms génériques
                if filename.startswith('main.') and filename.endswith('.js'):
                    manifest['files']['main.js'] = filename
                elif filename.startswith('main.') and filename.endswith('.css'):
                    manifest['files']['main.css'] = filename
                elif filename.startswith('runtime-main.'):
                    manifest['files']['runtime-main.js'] = filename
                elif filename.startswith('vendors') and filename.endswith('.js'):
                    manifest['files']['vendors~main.js'] = filename
    
    return manifest

@register.simple_tag
def react_static(file_path):
    """
    Retourne le chemin static correct d'un fichier React build avec hash.
    
    Usage dans les templates :
        {% react_static 'main.js' %}
        {% react_static 'main.css' %}
        {% react_static 'runtime-main.js' %}
        {% react_static 'vendors~main.js' %}
    """
    manifest = _load_manifest()
    key = file_path.lstrip('/')  # supprime les slashes initiaux
    hashed_file = manifest.get('files', {}).get(key)

    if hashed_file:
        # Le manifest contient le chemin avec /static/frontend/, on l'utilise directement
        return hashed_file
    else:
        # Fallback : chemin original si non trouvé dans le manifest
        return static(f'frontend/{file_path}')

@register.simple_tag
def react_static_exists(file_path):
    """
    Vérifie si un fichier React existe dans le manifest.
    
    Usage :
        {% react_static_exists 'vendors~main.js' as has_vendors %}
        {% if has_vendors %}
            <script src="{% react_static 'vendors~main.js' %}"></script>
        {% endif %}
    """
    manifest = _load_manifest()
    key = file_path.lstrip('/')
    return key in manifest.get('files', {})

@register.simple_tag
def react_manifest_debug():
    """
    Retourne des informations de debug sur le manifest.
    Utile pour le développement et le debugging.
    """
    manifest = _load_manifest()
    
    # Utiliser le même chemin que _load_manifest()
    if settings.DEBUG:
        manifest_path = os.path.join(
            settings.BASE_DIR, 'frontend', 'static', 'frontend', 'asset-manifest.json'
        )
    else:
        manifest_path = os.path.join(
            settings.STATIC_ROOT, 'frontend', 'asset-manifest.json'
        )
    
    files = manifest.get('files', {})
    return {
        'manifest_path': manifest_path,
        'manifest_exists': os.path.exists(manifest_path),
        'files_count': len(files),
        'files': list(files.keys()),
        'sample_mapping': dict(list(files.items())[:3])  # Premiers 3 éléments
    }
