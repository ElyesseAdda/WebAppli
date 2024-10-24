from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import dashboard_data, SocieteViewSet, ChantierViewSet, DevisViewSet, PartieViewSet, SousPartieViewSet, LigneDetailViewSet, generate_pdf_view, preview_devis, ClientViewSet


router = DefaultRouter()
router.register(r'chantier', ChantierViewSet, basename='chantier')
router.register(r'societe', SocieteViewSet, basename='societe')
router.register(r'devisa', DevisViewSet, basename='devis')
router.register(r'parties', PartieViewSet, basename='parties')
router.register(r'sous-parties', SousPartieViewSet, basename='sous-parties')
router.register(r'ligne-details', LigneDetailViewSet, basename='ligne-details')
router.register(r'client', ClientViewSet, basename='client')



urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', dashboard_data, name='dashboard_data'),
    path('generate-pdf/', generate_pdf_view, name='generate_pdf'),
    path('preview-devis/', preview_devis, name='preview_devis'),  # Route pour la prévisualisation du devis

    
]
