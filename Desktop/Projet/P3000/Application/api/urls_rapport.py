from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views_rapport import (
    TitreRapportViewSet,
    ResidenceViewSet,
    RapportInterventionViewSet,
    RapportInterventionBrouillonViewSet,
    preview_rapport_intervention,
    generate_rapport_intervention_pdf,
    generate_rapport_intervention_pdf_drive,
)

router = DefaultRouter()
router.register(r'rapports-intervention', RapportInterventionViewSet, basename='rapports-intervention')
router.register(
    r'rapports-intervention-brouillons',
    RapportInterventionBrouillonViewSet,
    basename='rapports-intervention-brouillons',
)
router.register(r'titres-rapport', TitreRapportViewSet, basename='titres-rapport')
router.register(r'residences', ResidenceViewSet, basename='residences')

urlpatterns = [
    path('', include(router.urls)),
    path('preview-rapport-intervention/<int:rapport_id>/', preview_rapport_intervention, name='preview-rapport-intervention'),
    path('generate-rapport-intervention-pdf/', generate_rapport_intervention_pdf, name='generate-rapport-intervention-pdf'),
    path('generate-rapport-intervention-pdf-drive/', generate_rapport_intervention_pdf_drive, name='generate-rapport-intervention-pdf-drive'),
]
