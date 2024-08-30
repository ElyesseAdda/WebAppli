from django.urls import path, re_path
from .views import index


urlpatterns = [
    path('', index), 
    re_path(r'^(?!api/|admin/|devis/).*$', index),  # Capture toutes les autres URLs sauf celles qui commencent par "api" ou "admin"
]