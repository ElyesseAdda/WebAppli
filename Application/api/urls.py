from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import dashboard_data, create_devis, SocieteViewSet, ChantierViewSet, DevisViewSet
from .views import render_pdf_view

router = DefaultRouter()
router.register(r'chantier', ChantierViewSet, basename='chantier')
router.register(r'societe', SocieteViewSet, basename='societe')
router.register(r'devis', DevisViewSet, basename='devis')


urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', dashboard_data, name='dashboard_data'),
    path('create-devis/', create_devis, name='create_devis'),
    path('devis/<int:devis_id>/pdf/', render_pdf_view, name='devis_pdf'),
    
]
