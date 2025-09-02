"""
URLs pour les vues PDF avec stockage automatique dans AWS S3
"""

from django.urls import path
from . import pdf_views

urlpatterns = [
    # Vues PDF avec stockage automatique dans AWS S3
    path('planning-hebdo-pdf-drive/', pdf_views.planning_hebdo_pdf_drive, name='planning_hebdo_pdf_drive'),
    path('generate-monthly-agents-pdf-drive/', pdf_views.generate_monthly_agents_pdf_drive, name='generate_monthly_agents_pdf_drive'),
    path('generate-devis-travaux-pdf-drive/', pdf_views.generate_devis_travaux_pdf_drive, name='generate_devis_travaux_pdf_drive'),
    path('generate-devis-marche-pdf-drive/', pdf_views.generate_devis_marche_pdf_drive, name='generate_devis_marche_pdf_drive'),
    
    # Vues utilitaires
    path('download-pdf-from-s3/', pdf_views.download_pdf_from_s3, name='download_pdf_from_s3'),
    path('list-pdfs-in-drive/', pdf_views.list_pdfs_in_drive, name='list_pdfs_in_drive'),
]
