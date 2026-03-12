from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views_rapport import (
    TitreRapportViewSet,
    ResidenceViewSet,
    RapportInterventionViewSet,
    preview_rapport_intervention,
)

router = DefaultRouter()
router.register(r'rapports-intervention', RapportInterventionViewSet, basename='rapports-intervention')
router.register(r'titres-rapport', TitreRapportViewSet, basename='titres-rapport')
router.register(r'residences', ResidenceViewSet, basename='residences')

urlpatterns = [
    path('', include(router.urls)),
    path('preview-rapport-intervention/<int:rapport_id>/', preview_rapport_intervention, name='preview-rapport-intervention'),
]
