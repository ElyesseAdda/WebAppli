from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ChantierViewSet

router = DefaultRouter()
router.register(r'chantiers', ChantierViewSet)

urlpatterns = [
    path('chantier', include(router.urls)),
]
