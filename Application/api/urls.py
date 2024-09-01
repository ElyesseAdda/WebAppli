from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import dashboard_data, create_devis, SocieteViewSet, ChantierViewSet, DevisViewSet, download_devis_pdf, PartieViewSet, SousPartieViewSet, LigneDetailViewSet


router = DefaultRouter()
router.register(r'chantier', ChantierViewSet, basename='chantier')
router.register(r'societe', SocieteViewSet, basename='societe')
router.register(r'devisa', DevisViewSet, basename='devis')
router.register(r'parties', PartieViewSet, basename='parties')
router.register(r'sous-parties', SousPartieViewSet, basename='sous-parties')
router.register(r'ligne-details', LigneDetailViewSet, basename='ligne-details')


urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', dashboard_data, name='dashboard_data'),
    path('create-devis/', create_devis, name='create_devis'),
    path('devis/<int:chantier_id>/download/', download_devis_pdf, name='download_devis_pdf'),
    
]
