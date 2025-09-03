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
        success, message, s3_file_path, conflict_detected = pdf_manager.generate_andStore_pdf(
            document_type='planning_hebdo',
            preview_url=preview_url,
            societe_name=societe_name,
            week=week,
            year=year
        )
        
        if success:
            # Succès : retourner les informations du fichier stocké
            response_data = {
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
                'download_url': f"/api/download-pdf-from-s3?path={s3_file_path}",  # Option de téléchargement
                'conflict_detected': conflict_detected
            }
            
            # Si un conflit a été détecté, ajouter des informations supplémentaires
            if conflict_detected:
                response_data['conflict_message'] = f'Un fichier avec le même nom existait déjà. L\'ancien fichier a été déplacé dans le dossier Historique et sera automatiquement supprimé après 30 jours.'
                response_data['conflict_type'] = 'file_replaced'
            
            return JsonResponse(response_data)
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
        success, message, s3_file_path, conflict_detected = pdf_manager.generate_andStore_pdf(
            document_type='rapport_agents',
            preview_url=preview_url,
            societe_name=societe_name,
            month=month,
            year=year
        )
        
        if success:
            # Succès : retourner les informations du fichier stocké
            response_data = {
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
                'download_url': f"/api/download-pdf-from-s3?path={s3_file_path}",  # Option de téléchargement
                'conflict_detected': conflict_detected
            }
            
            # Si un conflit a été détecté, ajouter des informations supplémentaires
            if conflict_detected:
                response_data['conflict_message'] = f'Un fichier avec le même nom existait déjà. L\'ancien fichier a été déplacé dans le dossier Historique et sera automatiquement supprimé après 30 jours.'
                response_data['conflict_type'] = 'file_replaced'
            
            return JsonResponse(response_data)
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


@api_view(['POST'])
@permission_classes([AllowAny])
def replace_file_after_confirmation(request):
    """
    Vue pour remplacer un fichier après confirmation de l'utilisateur
    """
    try:
        data = request.data
        
        document_type = data.get('document_type')
        preview_url = data.get('preview_url')
        societe_name = data.get('societe_name')
        
        # Validation des paramètres requis
        if not preview_url:
            error_msg = "preview_url est requis pour la génération du PDF"
            return JsonResponse({'error': error_msg}, status=400)
        
        # Paramètres spécifiques selon le type de document
        kwargs = {}
        if document_type == 'planning_hebdo':
            kwargs['week'] = data.get('week')
            kwargs['year'] = data.get('year')
        elif document_type == 'rapport_agents':
            kwargs['month'] = data.get('month')
            kwargs['year'] = data.get('year')
        elif document_type == 'devis_travaux':
            kwargs['chantier_id'] = data.get('chantier_id')
            kwargs['chantier_name'] = data.get('chantier_name')
        elif document_type == 'devis_marche':
            kwargs['appel_offres_id'] = data.get('appel_offres_id')
            kwargs['appel_offres_name'] = data.get('appel_offres_name')
        
        # Utiliser la méthode de remplacement avec confirmation
        success, message, s3_file_path = pdf_manager.replace_file_with_confirmation(
            document_type=document_type,
            preview_url=preview_url,
            societe_name=societe_name,
            **kwargs
        )
        
        if success:
            return JsonResponse({
                'success': True,
                'message': f'Fichier remplacé avec succès dans le Drive',
                'file_path': s3_file_path,
                'file_name': s3_file_path.split('/')[-1],
                'drive_url': f"/drive?path={s3_file_path}&sidebar=closed&focus=file&view=grid",
                'redirect_to': f"/drive?path={s3_file_path}&sidebar=closed&focus=file&view=grid",
                'document_type': document_type,
                'societe_name': societe_name,
                'download_url': f"/api/download-pdf-from-s3?path={s3_file_path}",
                'replacement_successful': True
            })
        else:
            return JsonResponse({
                'success': False,
                'error': message
            }, status=500)
            
    except Exception as e:
        error_msg = f'Erreur inattendue: {str(e)}'
        print(f"❌ ERREUR: {error_msg}")
        import traceback
        traceback.print_exc()
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


@api_view(['GET'])
@permission_classes([AllowAny])
def get_existing_file_name(request):
    """
    Vue pour récupérer le nom du fichier existant dans un dossier S3
    """
    try:
        folder_path = request.GET.get('folder_path')
        week = request.GET.get('week')  # Semaine demandée
        month = request.GET.get('month')  # Mois demandé
        document_type = request.GET.get('document_type')  # Type de document
        
        if not folder_path:
            return JsonResponse({'error': 'Chemin du dossier requis'}, status=400)
        
        # Utiliser le pdf_manager pour lister les fichiers dans le dossier
        from .pdf_manager import pdf_manager
        files = pdf_manager.list_files_in_s3_folder(folder_path)
        
        if files:
            # Chercher le fichier correspondant aux paramètres
            target_file = None
            
            if document_type == 'planning_hebdo' and week:
                # Pour le planning hebdo, chercher le fichier de la semaine demandée
                year = request.GET.get('year', '2025')
                year_short = str(year)[-2:] if len(str(year)) >= 2 else str(year)
                target_pattern = f"PH S{week} {year_short}.pdf"
                
                for file in files:
                    if file == target_pattern:
                        target_file = file
                        break
                
            elif document_type == 'rapport_agents' and month:
                # Pour le rapport agents, chercher le fichier du mois demandé
                month_names = {
                    1: 'Janvier', 2: 'Février', 3: 'Mars', 4: 'Avril',
                    5: 'Mai', 6: 'Juin', 7: 'Juillet', 8: 'Août',
                    9: 'Septembre', 10: 'Octobre', 11: 'Novembre', 12: 'Décembre'
                }
                month_name = month_names.get(int(month), f'Mois_{month}')
                year = request.GET.get('year', '2025')
                year_short = str(year)[-2:] if len(str(year)) >= 2 else str(year)
                target_pattern = f"RapportComptable {month_name} {year_short}.pdf"
                
                for file in files:
                    if file == target_pattern:
                        target_file = file
                        break
            
            # Si on n'a pas trouvé de fichier spécifique, retourner le premier
            if not target_file:
                target_file = files[0]
            
            return JsonResponse({
                'success': True,
                'existing_file_name': target_file,
                'folder_path': folder_path,
                'target_week': week,
                'target_month': month,
                'document_type': document_type
            })
        else:
            return JsonResponse({
                'success': False,
                'message': 'Aucun fichier trouvé dans ce dossier'
            })
            
    except Exception as e:
        error_msg = f'Erreur lors de la récupération du nom de fichier: {str(e)}'
        print(f"ERREUR: {error_msg}")
        return JsonResponse({'error': error_msg}, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def download_file_from_drive(request):
    """
    Télécharger n'importe quel fichier depuis le Drive AWS S3
    """
    try:
        file_path = request.GET.get('file_path')
        if not file_path:
            return JsonResponse({'error': 'Chemin du fichier requis'}, status=400)
        
        # Utiliser le pdf_manager pour récupérer le fichier
        success, file_content, content_type, file_name = pdf_manager.get_file_from_s3(file_path)
        
        if success:
            response = HttpResponse(file_content, content_type=content_type)
            response['Content-Disposition'] = f'attachment; filename="{file_name}"'
            return response
        else:
            return JsonResponse({'error': 'Fichier non trouvé'}, status=404)
            
    except Exception as e:
        return JsonResponse({'error': f'Erreur: {str(e)}'}, status=500)
