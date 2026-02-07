"""
Context processors pour injecter automatiquement la configuration entreprise
dans tous les templates Django.
"""

from api.models import EntrepriseConfig


def entreprise_config(request):
    """
    Injecte la configuration de l'entreprise dans le contexte de tous les templates.
    Accessible via {{ entreprise.nom }}, {{ entreprise.email }}, etc.
    """
    try:
        config = EntrepriseConfig.get_config()
    except Exception:
        # En cas d'erreur (ex: table pas encore créée), retourne un dict vide
        config = None
    return {'entreprise': config}
