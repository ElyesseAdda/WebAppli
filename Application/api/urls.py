from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import dashboard_data, SocieteViewSet, ChantierViewSet, DevisViewSet, PartieViewSet, SousPartieViewSet, LigneDetailViewSet, preview_devis, ClientViewSet, generate_pdf_from_preview, StockViewSet, AgentViewSet, PresenceViewSet, StockMovementViewSet, historique_stock

router = DefaultRouter()
router.register(r'chantier', ChantierViewSet, basename='chantier')
router.register(r'societe', SocieteViewSet, basename='societe')
router.register(r'devisa', DevisViewSet, basename='devis')
router.register(r'parties', PartieViewSet, basename='parties')
router.register(r'sous-parties', SousPartieViewSet, basename='sous-parties')
router.register(r'ligne-details', LigneDetailViewSet, basename='ligne-details')
router.register(r'client', ClientViewSet, basename='client')
router.register(r'stock', StockViewSet, basename='stock')  # Ce registre gère également les actions personnalisées
router.register(r'agent', AgentViewSet, basename='agent')
router.register(r'presence', PresenceViewSet, basename='presence')

urlpatterns = [
    path('', include(router.urls)),  # Toutes les routes générées par DefaultRouter, y compris add_stock et remove_stock
    path('dashboard/', dashboard_data, name='dashboard_data'),
    path('generate-pdf-from-preview/', generate_pdf_from_preview, name='generate_pdf_from_preview'),
    path('preview-devis/', preview_devis, name='preview_devis'),
    path('historique_stock/', historique_stock, name='historique_stock'),

    
]
