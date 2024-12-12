from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    dashboard_data, SocieteViewSet, ChantierViewSet, DevisViewSet, PartieViewSet, 
    SousPartieViewSet, LigneDetailViewSet, preview_devis, ClientViewSet, 
    generate_pdf_from_preview, StockViewSet, AgentViewSet, PresenceViewSet, 
    historique_stock, get_latest_code_produit, EventViewSet, delete_events_by_agent_and_period, get_agents_with_work_days, update_days_present, recalculate_monthly_hours, assign_chantier, get_schedule,copy_schedule, delete_schedule, save_labor_costs, get_labor_costs, create_chantier_from_devis, create_devis# Import de la vue
)

router = DefaultRouter()
router.register(r'chantier', ChantierViewSet, basename='chantier')
router.register(r'societe', SocieteViewSet, basename='societe')
router.register(r'devisa', DevisViewSet, basename='devis')
router.register(r'parties', PartieViewSet, basename='parties')
router.register(r'sous-parties', SousPartieViewSet, basename='sous-parties')
router.register(r'ligne-details', LigneDetailViewSet, basename='ligne-details')
router.register(r'client', ClientViewSet, basename='client')
router.register(r'stock', StockViewSet, basename='stock')  # Gère les routes stock via ViewSet
router.register(r'agent', AgentViewSet, basename='agent')
router.register(r'presence', PresenceViewSet, basename='presence')
router.register(r'events', EventViewSet, basename='event')


urlpatterns = [
    path('stock/latest_code/', get_latest_code_produit, name='latest_code_produit'),  # Ajout du chemin personnalisé avant l'inclusion du routeur
    path('', include(router.urls)),  # Routes générées par le routeur (y compris add_stock et remove_stock)
    path('dashboard/', dashboard_data, name='dashboard_data'),
    path('generate-pdf-from-preview/', generate_pdf_from_preview, name='generate_pdf_from_preview'),
    path('preview-devis/', preview_devis, name='preview_devis'),
    path('historique_stock/', historique_stock, name='historique_stock'),
    path('delete_events_by_agent_and_period/', delete_events_by_agent_and_period, name='delete-events-by-agent-and-period'),
    path('agents-with-work-days/', get_agents_with_work_days, name='agents-with-work-days'),
    path('update_days_present/', update_days_present, name='update_days_present'),
    path('recalculate_monthly_hours/', recalculate_monthly_hours, name='recalculate_monthly_hours'),
    path('assign_chantier/', assign_chantier, name='assign_chantier'),
    path('get_schedule/', get_schedule, name='get_schedule'),
    path('copy_schedule/', copy_schedule, name='copy_schedule'),
    path('delete_schedule/', delete_schedule, name='delete_schedule'),
    path('save_labor_costs/', save_labor_costs, name='save_labor_costs'),
    path('get_labor_costs/', get_labor_costs, name='get_labor_costs'),
    path('create_chantier_from_devis/', create_chantier_from_devis, name='create_chantier_from_devis'),
    path('create-devis/', create_devis, name='create-devis'),
    # ... autres routes
]
