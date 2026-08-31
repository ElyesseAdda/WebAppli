"""URLs pour la fonctionnalité « Diagrammes de Gantt »."""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views_gantt import (
    GanttDesignationViewSet,
    GanttDiagrammeViewSet,
    generate_gantt_pdf_drive,
    preview_gantt,
)

router = DefaultRouter()
router.register(
    r'gantt/diagrammes', GanttDiagrammeViewSet, basename='gantt-diagrammes'
)
router.register(
    r'gantt/designations', GanttDesignationViewSet, basename='gantt-designations'
)

urlpatterns = [
    path('', include(router.urls)),
    path(
        'preview-gantt/<int:diagramme_id>/',
        preview_gantt,
        name='preview-gantt',
    ),
    path(
        'generate-gantt-pdf-drive/',
        generate_gantt_pdf_drive,
        name='generate-gantt-pdf-drive',
    ),
]
