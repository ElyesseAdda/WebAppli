"""
Vues pour la gestion des PDFs avec stockage automatique dans AWS S3
"""

from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.views import View
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

from .pdf_manager import pdf_manager


@api_view(['GET'])
@permission_classes([AllowAny])
def planning_hebdo_pdf_drive(request):
    """
    Vue pour générer le PDF du planning hebdomadaire et le stocker dans AWS S3
    """
    try:
        week = int(request.GET.get('week'))
        year = int(request.GET.get('year'))
        
        # URL de prévisualisation
        preview_url = request.build_absolute_uri(f"/api/preview-planning-hebdo/?week={week}&year={year}")
        
        # Récupérer la société (à adapter selon votre logique)
        # Pour l'instant, utiliser une société par défaut
        societe_name = "Société par défaut"  # À adapter selon votre logique
        
        # Générer le PDF et le stocker dans AWS S3
        success, message, s3_file_path = pdf_manager.generate_andStore_pdf(
            document_type='planning_hebdo',
            preview_url=preview_url,
            societe_name=societe_name,
            week=week,
            year=year
        )
        
        if success:
            # Succès : retourner les informations du fichier stocké
            return JsonResponse({
                'success': True,
                'message': f'PDF planning hebdomadaire semaine {week}/{year} généré et stocké avec succès dans le Drive',
                'file_path': s3_file_path,
                'file_name': s3_file_path.split('/')[-1],
                'drive_url': f"/drive?path={s3_file_path}&sidebar=closed&focus=file&view=grid",
                'redirect_to': f"/drive?path={s3_file_path}&sidebar=closed&focus=file&view=grid",
                'document_type': 'planning_hebdo',
                'societe_name': societe_name,
                'week': week,
                'year': year,
                'download_url': f"/api/download-pdf-from-s3?path={s3_file_path}"  # Option de téléchargement
            })
        else:
            # Échec : retourner l'erreur
            return JsonResponse({
                'success': False,
                'error': message
            }, status=500)
            
    except Exception as e:
        error_msg = f'Erreur inattendue: {str(e)}'
        print(f"ERREUR: {error_msg}")
        return JsonResponse({'error': error_msg}, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def generate_monthly_agents_pdf_drive(request):
    """
    Vue pour générer le PDF du rapport mensuel des agents et le stocker dans AWS S3
    """
    try:
        month = int(request.GET.get('month'))
        year = int(request.GET.get('year'))
        
        # URL de prévisualisation
        preview_url = request.build_absolute_uri(f"/api/preview-monthly-agents-report/?month={month}&year={year}")
        
        # Récupérer la société (à adapter selon votre logique)
        # Pour l'instant, utiliser une société par défaut
        societe_name = "Société par défaut"  # À adapter selon votre logique
        
        # Générer le PDF et le stocker dans AWS S3
        success, message, s3_file_path = pdf_manager.generate_andStore_pdf(
            document_type='rapport_agents',
            preview_url=preview_url,
            societe_name=societe_name,
            month=month,
            year=year
        )
        
        if success:
            # Succès : retourner les informations du fichier stocké
            return JsonResponse({
                'success': True,
                'message': f'PDF rapport mensuel agents {month}/{year} généré et stocké avec succès dans le Drive',
                'file_path': s3_file_path,
                'file_name': s3_file_path.split('/')[-1],
                'drive_url': f"/drive?path={s3_file_path}&sidebar=closed&focus=file&view=grid",
                'redirect_to': f"/drive?path={s3_file_path}&sidebar=closed&focus=file&view=grid",
                'document_type': 'rapport_agents',
                'societe_name': societe_name,
                'month': month,
                'year': year,
                'download_url': f"/api/download-pdf-from-s3?path={s3_file_path}"  # Option de téléchargement
            })
        else:
            # Échec : retourner l'erreur
            return JsonResponse({
                'success': False,
                'error': message
            }, status=500)
            
    except Exception as e:
        error_msg = f'Erreur inattendue: {str(e)}'
        print(f"ERREUR: {error_msg}")
        return JsonResponse({'error': error_msg}, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def generate_devis_travaux_pdf_drive(request):
    """
    Vue pour générer le PDF du devis de travaux et le stocker dans AWS S3
    """
    try:
        chantier_id = request.GET.get('chantier_id')
        chantier_name = request.GET.get('chantier_name', 'Chantier')
        
        # URL de prévisualisation (à adapter selon votre logique)
        preview_url = request.build_absolute_uri(f"/api/preview-devis-travaux/?chantier_id={chantier_id}")
        
        # Récupérer la société (à adapter selon votre logique)
        societe_name = "Société par défaut"  # À adapter selon votre logique
        
        # Générer le PDF et le stocker dans AWS S3
        success, message, s3_file_path = pdf_manager.generate_andStore_pdf(
            document_type='devis_travaux',
            preview_url=preview_url,
            societe_name=societe_name,
            chantier_id=chantier_id,
            chantier_name=chantier_name
        )
        
        if success:
            # Succès : retourner les informations du fichier stocké
            return JsonResponse({
                'success': True,
                'message': f'PDF devis travaux {chantier_name} généré et stocké avec succès dans le Drive',
                'file_path': s3_file_path,
                'file_name': s3_file_path.split('/')[-1],
                'drive_url': f"/drive?path={s3_file_path}&sidebar=closed&focus=file&view=grid",
                'redirect_to': f"/drive?path={s3_file_path}&sidebar=closed&focus=file&view=grid",
                'document_type': 'devis_travaux',
                'societe_name': societe_name,
                'chantier_id': chantier_id,
                'chantier_name': chantier_name,
                'download_url': f"/api/download-pdf-from-s3?path={s3_file_path}"
            })
        else:
            # Échec : retourner l'erreur
            return JsonResponse({
                'success': False,
                'error': message
            }, status=500)
            
    except Exception as e:
        error_msg = f'Erreur inattendue: {str(e)}'
        print(f"ERREUR: {error_msg}")
        return JsonResponse({'error': error_msg}, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def generate_devis_marche_pdf_drive(request):
    """
    Vue pour générer le PDF du devis de marché et le stocker dans AWS S3
    """
    try:
        appel_offres_id = request.GET.get('appel_offres_id')
        appel_offres_name = request.GET.get('appel_offres_name', 'Appel d\'offres')
        
        # URL de prévisualisation (à adapter selon votre logique)
        preview_url = request.build_absolute_uri(f"/api/preview-devis-marche/?appel_offres_id={appel_offres_id}")
        
        # Récupérer la société (à adapter selon votre logique)
        societe_name = "Société par défaut"  # À adapter selon votre logique
        
        # Générer le PDF et le stocker dans AWS S3
        success, message, s3_file_path = pdf_manager.generate_andStore_pdf(
            document_type='devis_marche',
            preview_url=preview_url,
            societe_name=societe_name,
            appel_offres_id=appel_offres_id,
            appel_offres_name=appel_offres_name
        )
        
        if success:
            # Succès : retourner les informations du fichier stocké
            return JsonResponse({
                'success': True,
                'message': f'PDF devis marché {appel_offres_name} généré et stocké avec succès dans le Drive',
                'file_path': s3_file_path,
                'file_name': s3_file_path.split('/')[-1],
                'drive_url': f"/drive?path={s3_file_path}&sidebar=closed&focus=file&view=grid",
                'redirect_to': f"/drive?path={s3_file_path}&sidebar=closed&focus=file&view=grid",
                'document_type': 'devis_marche',
                'societe_name': societe_name,
                'appel_offres_id': appel_offres_id,
                'appel_offres_name': appel_offres_name,
                'download_url': f"/api/download-pdf-from-s3?path={s3_file_path}"
            })
        else:
            # Échec : retourner l'erreur
            return JsonResponse({
                'success': False,
                'error': message
            }, status=500)
            
    except Exception as e:
        error_msg = f'Erreur inattendue: {str(e)}'
        print(f"ERREUR: {error_msg}")
        return JsonResponse({'error': error_msg}, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def download_pdf_from_s3(request):
    """
    Vue pour télécharger un PDF depuis AWS S3
    """
    try:
        s3_path = request.GET.get('path')
        if not s3_path:
            return JsonResponse({'error': 'Chemin S3 manquant'}, status=400)
        
        # Télécharger le PDF depuis S3
        success, message, pdf_content = pdf_manager.download_pdf_from_s3(s3_path)
        
        if success:
            # Retourner le PDF pour téléchargement
            response = HttpResponse(pdf_content, content_type='application/pdf')
            filename = s3_path.split('/')[-1]
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
        else:
            return JsonResponse({'error': message}, status=500)
            
    except Exception as e:
        error_msg = f'Erreur lors du téléchargement: {str(e)}'
        print(f"ERREUR: {error_msg}")
        return JsonResponse({'error': error_msg}, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def list_pdfs_in_drive(request):
    """
    Vue pour lister les PDFs disponibles dans le Drive AWS S3
    """
    try:
        # Récupérer la société (à adapter selon votre logique)
        societe_name = request.GET.get('societe', 'Société par défaut')
        
        # Lister les PDFs dans S3 (à implémenter selon vos besoins)
        # Pour l'instant, retourner un message
        return JsonResponse({
            'success': True,
            'message': f'Liste des PDFs pour {societe_name}',
            'societe': societe_name,
            'note': 'Fonctionnalité de listing à implémenter selon vos besoins'
        })
        
    except Exception as e:
        error_msg = f'Erreur lors de la récupération de la liste: {str(e)}'
        print(f"ERREUR: {error_msg}")
        return JsonResponse({'error': error_msg}, status=500)
