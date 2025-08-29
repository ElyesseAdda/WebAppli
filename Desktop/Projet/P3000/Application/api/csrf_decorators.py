"""
Décorateurs CSRF pour les APIs REST
Basé sur la documentation officielle Django
"""
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from functools import wraps
from django.http import HttpResponseForbidden
from django.middleware.csrf import get_token
import re

def csrf_exempt_for_api(view_func):
    """
    Décorateur pour exempter les vues API de CSRF
    """
    @wraps(view_func)
    def wrapped_view(request, *args, **kwargs):
        # Vérifier si c'est une requête API
        if request.path.startswith('/api/'):
            # Exempter de CSRF pour les APIs
            request._dont_enforce_csrf_checks = True
        return view_func(request, *args, **kwargs)
    return wrapped_view

def csrf_exempt_viewset(viewset_class):
    """
    Décorateur pour exempter un ViewSet de CSRF
    """
    return method_decorator(csrf_exempt, name='dispatch')(viewset_class)

def ensure_csrf_cookie_for_api(view_func):
    """
    Décorateur pour s'assurer que le token CSRF est disponible pour les APIs
    """
    @wraps(view_func)
    def wrapped_view(request, *args, **kwargs):
        # Toujours générer le token CSRF
        get_token(request)
        return view_func(request, *args, **kwargs)
    return wrapped_view

# Liste des patterns d'URLs à exempter de CSRF
CSRF_EXEMPT_PATTERNS = [
    # URLs générales API
    r'^/api/.*$',  # Toutes les URLs commençant par /api/
    
    # URLs spécifiques pour s'assurer qu'elles sont couvertes
    r'^/api/create-devis/$',  # Spécifiquement pour la création de devis
    r'^/api/csrf-token/$',  # Endpoint pour récupérer le token CSRF
    r'^/api/auth/.*$',  # URLs d'authentification
    r'^/api/chantier/.*$',  # URLs des chantiers
    r'^/api/societe/.*$',  # URLs des sociétés
    r'^/api/devisa/.*$',  # URLs des devis
    r'^/api/parties/.*$',  # URLs des parties
    r'^/api/sous-parties/.*$',  # URLs des sous-parties
    r'^/api/ligne-details/.*$',  # URLs des lignes de détails
    r'^/api/client/.*$',  # URLs des clients
    r'^/api/stock/.*$',  # URLs du stock
    r'^/api/agent/.*$',  # URLs des agents
    r'^/api/presence/.*$',  # URLs de présence
    r'^/api/events/.*$',  # URLs des événements
    r'^/api/facture/.*$',  # URLs des factures
    r'^/api/bons-commande/.*$',  # URLs des bons de commande
    r'^/api/situations/.*$',  # URLs des situations
    r'^/api/situation-lignes/.*$',  # URLs des lignes de situation
    r'^/api/situation-lignes-supplementaires/.*$',  # URLs des lignes supplémentaires
    r'^/api/factures-ts/.*$',  # URLs des factures TS
    r'^/api/situation-lignes-avenants/.*$',  # URLs des avenants
    r'^/api/agency-expenses/.*$',  # URLs des dépenses d'agence
    r'^/api/sous-traitants/.*$',  # URLs des sous-traitants
    r'^/api/contrats-sous-traitance/.*$',  # URLs des contrats
    r'^/api/avenants-sous-traitance/.*$',  # URLs des avenants
    r'^/api/banques/.*$',  # URLs des banques
    r'^/api/paiements-sous-traitant/.*$',  # URLs des paiements
    r'^/api/fournisseurs/.*$',  # URLs des fournisseurs
    r'^/api/appels-offres/.*$',  # URLs des appels d'offres
    r'^/api/drive/.*$',  # URLs du drive
    r'^/api/drive-complete/.*$',  # URLs du drive complet
    r'^/api/dashboard/.*$',  # URLs du dashboard
    
    # URLs spécifiques pour les fonctionnalités
    r'^/api/generate-pdf-from-preview/$',
    r'^/api/preview-devis/$',
    r'^/api/historique_stock/$',
    r'^/api/delete_events_by_agent_and_period/$',
    r'^/api/agents-with-work-days/$',
    r'^/api/update_days_present/$',
    r'^/api/recalculate_monthly_hours/$',
    r'^/api/assign_chantier/$',
    r'^/api/get_schedule/$',
    r'^/api/copy_schedule/$',
    r'^/api/delete_schedule/$',
    r'^/api/save_labor_costs/$',
    r'^/api/get_labor_costs/$',
    r'^/api/create_chantier_from_devis/$',
    r'^/api/list-devis/$',
    r'^/api/get-next-devis-number/$',
    r'^/api/preview-saved-devis/.*$',
    r'^/api/list-devis/.*/update_status/$',
    r'^/api/create-facture/$',
    r'^/api/preview-facture/.*$',
    r'^/api/facture/create-from-devis/$',
    r'^/api/check-facture-numero/.*$',
    r'^/api/chantier/.*/details/$',
    r'^/api/check-chantier-name/$',
    r'^/api/check-client/$',
    r'^/api/check-societe/$',
    r'^/api/calculate-special-lines/.*$',
    r'^/api/devis/.*/special-lines/$',
    r'^/api/list-devis/.*/factures/$',
    r'^/api/facture/.*/update_status/$',
    r'^/api/stockf/fournisseurs/$',
    r'^/api/bon-commande/$',
    r'^/api/products-by-fournisseur/$',
    r'^/api/preview-bon-commande/.*$',
    r'^/api/generate-bon-commande-number/$',
    r'^/api/bons-commande/$',
    r'^/api/preview-saved-bon-commande/.*$',
    r'^/api/detail-bon-commande/.*$',
    r'^/api/update-bon-commande/.*$',
    r'^/api/fournisseur-magasins/$',
    r'^/api/list-fournisseur-magasins/$',
    r'^/api/delete-bons-commande/.*$',
    r'^/api/agents/.*/primes/$',
    r'^/api/parametres/taux-fixe/$',
    r'^/api/update-taux-fixe/$',
    r'^/api/avenant_chantier/.*/avenants/$',
    r'^/api/next_ts_number_chantier/.*/next-ts-number/$',
    r'^/api/create-facture-ts/$',
    r'^/api/create-facture-cie/$',
    r'^/api/devis-structure/.*/structure/$',
    r'^/api/chantier/.*/situations/$',
    r'^/api/situations/.*/details/$',
    r'^/api/situations/.*/update/$',
    r'^/api/situations/.*/delete/$',
    r'^/api/devis/.*/$',
    r'^/api/chantier/.*/lignes-default/$',
    r'^/api/chantier/.*/lignes-default/update/$',
    r'^/api/chantier/.*/factures-cie/$',
    r'^/api/situations/$',
    r'^/api/situations/create/$',
    r'^/api/next-numero/$',
    r'^/api/next-numero/chantier/.*/$',
    r'^/api/chantier/.*/situations/by-month/$',
    r'^/api/chantier/.*/last-situation/$',
    r'^/api/preview-situation/.*$',
    r'^/api/generate-situation-pdf/$',
    r'^/api/chantier/.*/bons-commande/$',
    r'^/api/chantier-stats/$',
    r'^/api/contrats-sous-traitance/.*/avenants/$',
    r'^/api/preview-contrat/.*$',
    r'^/api/preview-avenant/.*$',
    r'^/api/chantier/.*/taux-facturation/$',
    r'^/api/labor_costs/monthly_summary/$',
    r'^/api/planning_hebdo_pdf/$',
    r'^/api/preview-planning-hebdo/$',
    r'^/api/recalculate_labor_costs/$',
    r'^/api/chantier/.*/recap-financier/$',
    r'^/api/chantier/.*/paiements-materiel/$',
    r'^/api/fournisseurs/$',
    r'^/api/recalculate_labor_costs_month/$',
    r'^/api/schedule/monthly_summary/$',
    r'^/api/labor_costs/monthly_summary/$',
    r'^/api/preview-monthly-agents-report/$',
    r'^/api/generate-monthly-agents-pdf/$',
]

def is_csrf_exempt_url(path):
    """
    Vérifie si une URL doit être exemptée de CSRF
    """
    for pattern in CSRF_EXEMPT_PATTERNS:
        if re.match(pattern, path):
            return True
    return False
