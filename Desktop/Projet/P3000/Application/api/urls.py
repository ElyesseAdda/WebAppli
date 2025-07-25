from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    dashboard_data, SocieteViewSet, ChantierViewSet, DevisViewSet, PartieViewSet, 
    SousPartieViewSet, LigneDetailViewSet, preview_devis, ClientViewSet, 
    generate_pdf_from_preview, StockViewSet, AgentViewSet, PresenceViewSet, 
    historique_stock, get_latest_code_produit, EventViewSet, delete_events_by_agent_and_period, 
    get_agents_with_work_days, update_days_present, recalculate_monthly_hours, assign_chantier, get_schedule,copy_schedule, 
    delete_schedule, save_labor_costs, get_labor_costs, create_chantier_from_devis, create_devis, get_next_devis_number, 
    list_devis,get_chantier_relations, preview_saved_devis, update_devis_status, create_facture, FactureViewSet, preview_facture, 
    create_facture_from_devis,check_facture_numero, get_chantier_details, check_chantier_name, check_client, check_societe,
    calculate_special_lines, get_devis_special_lines, get_devis_factures, update_facture_status, get_fournisseurs,
    bon_commande_view, BonCommandeViewSet, get_products_by_fournisseur, preview_bon_commande, generate_bon_commande_number,
    preview_bon_commande, get_fournisseurs, get_products_by_fournisseur,
    create_bon_commande, preview_saved_bon_commande,
    get_bon_commande_detail,
    update_bon_commande,
    fournisseur_magasins,
    list_fournisseur_magasins,
    delete_bon_commande,
    add_prime,
    delete_prime,
    get_agent_primes,
    update_taux_fixe,
    get_taux_fixe,
    get_chantier_avenants,
    get_next_ts_number,
    create_facture_ts,
    create_facture_cie,
    SituationViewSet,
    SituationLigneViewSet,
    SituationLigneSupplementaireViewSet,
    get_devis_structure,
    get_situations_chantier,
    get_situation_detail,
    FactureTSViewSet,
    delete_devis,
    get_chantier_lignes_default,
    update_chantier_lignes_default,
    get_factures_cie,
    create_situation,
    delete_situation,
    update_situation,
    get_next_numero,
    SituationLigneAvenantViewSet,
    get_situations,
    get_last_situation,
    get_chantier_situations,
    get_situations_list,
    preview_situation,
    generate_situation_pdf,
    AgencyExpenseViewSet,
    DashboardViewSet,
    get_chantier_bons_commande,
    get_chantier_stats,
    SousTraitantViewSet,
    ContratSousTraitanceViewSet,
    AvenantSousTraitanceViewSet,
    preview_contrat,
    preview_avenant,
    get_taux_facturation_data,
    labor_costs_monthly_summary,
    planning_hebdo_pdf,
    preview_planning_hebdo,
    recalculate_labor_costs,
    PaiementSousTraitantViewSet,
    RecapFinancierChantierAPIView,
    PaiementFournisseurMaterielAPIView,
    fournisseurs,
    FournisseurViewSet,
    recalculate_labor_costs_month,
    schedule_monthly_summary,
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
router.register(r'facture', FactureViewSet, basename='facture')
router.register(r'bons-commande', BonCommandeViewSet)
router.register(r'situations', SituationViewSet)
router.register(r'situation-lignes', SituationLigneViewSet, basename='situation-lignes')
router.register(r'situation-lignes-supplementaires', SituationLigneSupplementaireViewSet)
router.register(r'factures-ts', FactureTSViewSet)
router.register(r'situation-lignes-avenants', SituationLigneAvenantViewSet)
router.register(r'agency-expenses', AgencyExpenseViewSet)
router.register(r'sous-traitants', SousTraitantViewSet)
router.register(r'contrats-sous-traitance', ContratSousTraitanceViewSet)
router.register(r'avenants-sous-traitance', AvenantSousTraitanceViewSet)
router.register(r'paiements-sous-traitant', PaiementSousTraitantViewSet, basename='paiements-sous-traitant')
router.register(r'fournisseurs', FournisseurViewSet)

urlpatterns = [
    path('stock/latest_code/', get_latest_code_produit, name='latest_code_produit'),  # Ajout du chemin personnalisé avant l'inclusion du routeur
    path('', include(router.urls)),  # Routes générées par le routeur (y compris add_stock et remove_stock)
    path('dashboard/', DashboardViewSet.as_view({'get': 'list'})),
    path('dashboard/resume/', DashboardViewSet.as_view({'get': 'resume'})),
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
    path('list-devis/', list_devis, name='list-devis'),
    path('get-next-devis-number/', get_next_devis_number, name='get-next-devis-number'),
    path('chantier/<int:chantier_id>/relations/', get_chantier_relations, name='chantier-relations'),
    path('preview-saved-devis/<int:devis_id>/', preview_saved_devis, name='preview-saved-devis'),
    path('list-devis/<int:devis_id>/update_status/', update_devis_status, name='update_devis_status'),
    path('create-facture/', create_facture, name='create-facture'),
    path('preview-facture/<int:facture_id>/', preview_facture, name='preview-facture'),
    path('facture/create-from-devis/', create_facture_from_devis, name='create_facture_from_devis'),
    path('check-facture-numero/<str:numero_facture>/', check_facture_numero, name='check_facture_numero'),
    path('chantier/<int:chantier_id>/details/', get_chantier_details, name='chantier-details'),
    path('check-chantier-name/', check_chantier_name, name='check-chantier-name'),
    path('check-client/', check_client, name='check-client'),
    path('check-societe/', check_societe, name='check-societe'),
    path('calculate-special-lines/<int:devis_id>/', calculate_special_lines, name='calculate-special-lines'),
    path('devis/<int:devis_id>/special-lines/', get_devis_special_lines, name='get_devis_special_lines'),
    path('list-devis/<int:devis_id>/factures/', get_devis_factures, name='get-devis-factures'),
    path('facture/<int:facture_id>/update_status/', update_facture_status, name='update-facture-status'),
    path('stockf/fournisseurs/', get_fournisseurs, name='get-fournisseurs'),
    path('bon-commande/', bon_commande_view, name='bon-commande'),
    path('products-by-fournisseur/', get_products_by_fournisseur, name='products-by-fournisseur'),
    path('preview-bon-commande/<int:bon_commande_id>/', preview_bon_commande, name='preview-bon-commande'),
    path('generate-bon-commande-number/', generate_bon_commande_number, name='generate-bon-commande-number'),
    path('preview-bon-commande/', preview_bon_commande, name='preview-bon-commande'),
    path('get_fournisseurs/', get_fournisseurs, name='get_fournisseurs'),
    path('products-by-fournisseur/', get_products_by_fournisseur, name='products-by-fournisseur'),
    path('bons-commande/', create_bon_commande, name='create-bon-commande'),
    path('preview-saved-bon-commande/<int:id>/', preview_saved_bon_commande, name='preview_saved_bon_commande'),
    path('detail-bon-commande/<int:id>/', get_bon_commande_detail, name='get-bon-commande-detail'),
    path('update-bon-commande/<int:id>/', update_bon_commande, name='update-bon-commande'),
    path('fournisseur-magasins/', fournisseur_magasins, name='fournisseur-magasins'),
    path('list-fournisseur-magasins/', list_fournisseur_magasins, name='list_fournisseur_magasins'),
    path('delete-bons-commande/<int:id>/', delete_bon_commande, name='delete-bon-commande'),
    path('agents/<int:agent_id>/primes/', add_prime, name='add_prime'),
    path('agents/<int:agent_id>/primes/<int:prime_id>/', delete_prime, name='delete_prime'),
    path('agents/<int:agent_id>/primes/', get_agent_primes, name='get_agent_primes'),
    path('parametres/taux-fixe/', get_taux_fixe, name='get_taux_fixe'),
    path('update-taux-fixe/', update_taux_fixe, name='update_taux_fixe'),
    path('avenant_chantier/<int:chantier_id>/avenants/', get_chantier_avenants, name='chantier-avenants'),
    path('next_ts_number_chantier/<int:chantier_id>/next-ts-number/', get_next_ts_number, name='next-ts-number'),
    path('create-facture-ts/', create_facture_ts, name='create-facture-ts'),
    path('create-facture-cie/', create_facture_cie, name='create-facture-cie'),
    path('devis-structure/<int:devis_id>/structure/', get_devis_structure, name='devis-structure'),
    path('chantier/<int:chantier_id>/situations/', get_situations_chantier, name='list-situations'),
    path('situations/<int:situation_id>/details/', get_situation_detail, name='situation-detail'),
    path('situations/<int:pk>/update/', update_situation, name='update-situation'),
    path('situations/<int:situation_id>/delete/', delete_situation, name='delete-situation'),
    path('devis/<int:devis_id>/', delete_devis, name='delete_devis'),
    path('chantier/<int:chantier_id>/lignes-default/', get_chantier_lignes_default, name='get-chantier-lignes-default'),
    path('chantier/<int:chantier_id>/lignes-default/update/', update_chantier_lignes_default, name='update-chantier-lignes-default'),
    path('chantier/<int:chantier_id>/factures-cie/', get_factures_cie, name='get-factures-cie'),
    path('situations/', get_situations_list, name='situations-list'),
    path('situations/create/', create_situation, name='create-situation'),
    path('next-numero/', get_next_numero, name='next-numero'),
    path('next-numero/chantier/<int:chantier_id>/', get_next_numero, name='next-situation-numero'),
    path('chantier/<int:chantier_id>/situations/by-month/', get_situations, name='get-situations-by-month'),
    path('chantier/<int:chantier_id>/last-situation/', get_last_situation, name='get-last-situation'),
    path('chantier/<int:chantier_id>/situations/', get_chantier_situations, name='chantier-situations'),
    path('preview-situation/<int:situation_id>/', preview_situation, name='preview-situation'),
    path('generate-situation-pdf/', generate_situation_pdf, name='generate_situation_pdf'),
    path('chantier/<int:chantier_id>/bons-commande/', get_chantier_bons_commande, name='chantier-bons-commande'),
    path('chantier-stats/', get_chantier_stats, name='chantier-stats'),
    path('contrats-sous-traitance/<int:contrat_id>/avenants/', AvenantSousTraitanceViewSet.as_view({
        'get': 'list',
        'post': 'create'
    }), name='contrat-avenants'),
    
    path('preview-contrat/<int:contrat_id>/', preview_contrat, name='preview_contrat'),
    path('preview-avenant/<int:avenant_id>/', preview_avenant, name='preview_avenant'),
    path('chantier/<int:chantier_id>/taux-facturation/', get_taux_facturation_data, name='taux-facturation-data'),
    path('labor_costs/monthly_summary/', labor_costs_monthly_summary, name='labor_costs_monthly_summary'),
    path('planning_hebdo_pdf/', planning_hebdo_pdf, name='planning_hebdo_pdf'),
    path('preview-planning-hebdo/', preview_planning_hebdo, name='preview_planning_hebdo'),
    path('recalculate_labor_costs/', recalculate_labor_costs, name='recalculate_labor_costs'),
    path('chantier/<int:chantier_id>/recap-financier/', RecapFinancierChantierAPIView.as_view(), name='chantier-recap-financier'),
    path('chantier/<int:chantier_id>/paiements-materiel/', PaiementFournisseurMaterielAPIView.as_view(), name='paiements-materiel'),
    path('fournisseurs/', fournisseurs, name='fournisseurs'),
]

urlpatterns += [
    path('recalculate_labor_costs_month/', recalculate_labor_costs_month, name='recalculate_labor_costs_month'),
    path('schedule/monthly_summary/', schedule_monthly_summary, name='schedule_monthly_summary'),
]
