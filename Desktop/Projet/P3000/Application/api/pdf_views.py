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
from .utils import get_user_initials


def _get_modified_by(request):
    """Retourne les initiales de l'utilisateur ou 'Application' si non authentifié."""
    if hasattr(request, 'user') and request.user and request.user.is_authenticated:
        return get_user_initials(request.user)
    return "Application"


@api_view(['GET'])
@permission_classes([AllowAny])
def planning_hebdo_pdf_drive(request):
    """
    Vue pour générer le PDF du planning hebdomadaire et le stocker dans AWS S3
    """
    try:
        week = int(request.GET.get('week'))
        year = int(request.GET.get('year'))
        force_replace = request.GET.get('force_replace', 'false').lower() == 'true'
        
        # Récupérer la liste des agents sélectionnés
        agent_ids_param = request.GET.get('agent_ids')
        
        if agent_ids_param:
            # Parser la liste des IDs (format: "1,2,3" ou "1")
            try:
                agent_ids = [int(id.strip()) for id in agent_ids_param.split(',') if id.strip().isdigit()]
                agent_ids_str = ','.join(map(str, agent_ids))
                preview_url = request.build_absolute_uri(f"/api/preview-planning-hebdo/?week={week}&year={year}&agent_ids={agent_ids_str}")
            except (ValueError, TypeError) as e:
                # En cas d'erreur, utiliser tous les agents
                preview_url = request.build_absolute_uri(f"/api/preview-planning-hebdo/?week={week}&year={year}")
        else:
            # Si aucun agent spécifié, utiliser tous les agents (comportement par défaut)
            preview_url = request.build_absolute_uri(f"/api/preview-planning-hebdo/?week={week}&year={year}")
        
        # Récupérer la société (à adapter selon votre logique)
        # Pour l'instant, utiliser une société par défaut
        societe_name = "Société par défaut"  # À adapter selon votre logique
        
        # Récupérer le nom de fichier personnalisé si fourni (pour éviter les conflits)
        custom_filename = request.GET.get('custom_filename', '')
        
        # Générer le PDF et le stocker dans AWS S3
        pdf_kwargs = {
            'week': week,
            'year': year
        }
        if custom_filename:
            pdf_kwargs['custom_filename'] = custom_filename
        
        success, message, s3_file_path, conflict_detected = pdf_manager.generate_andStore_pdf(
            document_type='planning_hebdo',
            preview_url=preview_url,
            societe_name=societe_name,
            force_replace=force_replace,
            modified_by=_get_modified_by(request),
            **pdf_kwargs
        )
        
        if success:
            # Succès : retourner les informations du fichier stocké
            response_data = {
                'success': True,
                'message': f'PDF planning hebdomadaire semaine {week}/{year} généré et stocké avec succès dans le Drive',
                'file_path': s3_file_path,
                'file_name': s3_file_path.split('/')[-1],
                'drive_url': f"/drive-v2?path={s3_file_path}&focus=file",
                'redirect_to': f"/drive-v2?path={s3_file_path}&focus=file",
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
        force_replace = request.GET.get('force_replace', 'false').lower() == 'true'
        
        # URL de prévisualisation
        preview_url = request.build_absolute_uri(f"/api/preview-monthly-agents-report/?month={month}&year={year}")
        
        # Récupérer la société (à adapter selon votre logique)
        # Pour l'instant, utiliser une société par défaut
        societe_name = "Société par défaut"  # À adapter selon votre logique
        
        # Récupérer le nom de fichier personnalisé si fourni (pour éviter les conflits)
        custom_filename = request.GET.get('custom_filename', '')
        
        # Générer le PDF et le stocker dans AWS S3
        pdf_kwargs = {
            'month': month,
            'year': year
        }
        if custom_filename:
            pdf_kwargs['custom_filename'] = custom_filename
        
        success, message, s3_file_path, conflict_detected = pdf_manager.generate_andStore_pdf(
            document_type='rapport_agents',
            preview_url=preview_url,
            societe_name=societe_name,
            force_replace=force_replace,
            modified_by=_get_modified_by(request),
            **pdf_kwargs
        )
        
        # ✅ Gérer les conflits : retourner les informations même si success=False
        if conflict_detected and not success:
            # Conflit détecté : retourner les informations du conflit
            return JsonResponse({
                'success': False,
                'error': message,
                'conflict_detected': True,
                'conflict_message': f'Un fichier avec le même nom existe déjà dans le Drive et a été modifié. Souhaitez-vous le remplacer ?',
                'conflict_type': 'file_exists',
                'file_path': s3_file_path,
                'file_name': s3_file_path.split('/')[-1] if s3_file_path else None,
                'document_type': 'rapport_agents',
                'societe_name': societe_name,
                'month': month,
                'year': year,
                'drive_url': f"/drive-v2?path={s3_file_path}&focus=file" if s3_file_path else None
            }, status=409)  # Code 409 Conflict
        
        if success:
            # Debug: Log du chemin S3
            print(f"🔍 DEBUG: s3_file_path = {s3_file_path}")
            
            # Succès : retourner les informations du fichier stocké
            response_data = {
                'success': True,
                'message': f'PDF rapport mensuel agents {month}/{year} généré et stocké avec succès dans le Drive',
                'file_path': s3_file_path,
                'file_name': s3_file_path.split('/')[-1],
                'drive_url': f"/drive-v2?path={s3_file_path}&focus=file",
                'redirect_to': f"/drive-v2?path={s3_file_path}&focus=file",
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
        societe_name = request.GET.get('societe_name', 'Société par défaut')
        devis_id = request.GET.get('devis_id')
        custom_path = request.GET.get('custom_path', '')  # Chemin personnalisé du drive
        force_replace = request.GET.get('force_replace', 'false').lower() == 'true'
        custom_filename = request.GET.get('custom_filename', '')  # Nom de fichier personnalisé
        
        if not devis_id:
            return JsonResponse({
                'success': False,
                'error': 'devis_id est requis pour générer le PDF'
            }, status=400)
        
        # Récupérer le numéro du devis depuis la base de données
        from .models import Devis
        try:
            devis = Devis.objects.get(id=devis_id)
            devis_numero = devis.numero
        except Devis.DoesNotExist:
            return JsonResponse({
                'success': False,
                'error': f'Devis avec ID {devis_id} introuvable'
            }, status=404)
        
        # URL de prévisualisation pour les devis de travaux
        preview_url = request.build_absolute_uri(f"/api/preview-saved-devis/{devis_id}/")
        
        # Préparer les paramètres pour la génération du PDF
        pdf_kwargs = {
            'chantier_id': chantier_id,
            'chantier_name': chantier_name,
            'devis_numero': devis_numero
        }
        
        # Ajouter le chemin personnalisé si fourni
        if custom_path:
            pdf_kwargs['custom_path'] = custom_path
        
        # Ajouter custom_filename si fourni
        if custom_filename:
            pdf_kwargs['custom_filename'] = custom_filename
        
        # Générer le PDF et le stocker dans AWS S3
        success, message, s3_file_path, conflict_detected = pdf_manager.generate_andStore_pdf(
            document_type='devis_travaux',
            preview_url=preview_url,
            societe_name=societe_name,
            force_replace=force_replace,
            modified_by=_get_modified_by(request),
            **pdf_kwargs
        )
        
        # ✅ Gérer les conflits : retourner les informations même si success=False
        if conflict_detected and not success:
            # Conflit détecté : retourner les informations du conflit
            return JsonResponse({
                'success': False,
                'error': message,
                'conflict_detected': True,
                'conflict_message': f'Un fichier avec le même nom existe déjà dans le Drive et a été modifié. Souhaitez-vous le remplacer ?',
                'conflict_type': 'file_exists',
                'file_path': s3_file_path,
                'file_name': s3_file_path.split('/')[-1] if s3_file_path else None,
                'document_type': 'devis_travaux',
                'societe_name': societe_name,
                'chantier_id': chantier_id,
                'chantier_name': chantier_name,
                'devis_id': devis_id,
                'numero': devis_numero
            }, status=409)  # Code 409 Conflict
        
        if success:
            # Succès : retourner les informations du fichier stocké
            response_data = {
                'success': True,
                'message': f'PDF devis travaux {chantier_name} généré et stocké avec succès dans le Drive',
                'file_path': s3_file_path,
                'file_name': s3_file_path.split('/')[-1],
                'drive_url': f"/drive-v2?path={s3_file_path}&focus=file",
                'redirect_to': f"/drive-v2?path={s3_file_path}&focus=file",
                'document_type': 'devis_travaux',
                'societe_name': societe_name,
                'chantier_id': chantier_id,
                'chantier_name': chantier_name,
                'devis_id': devis_id,
                'numero': devis_numero,
                'download_url': f"/api/download-pdf-from-s3?path={s3_file_path}",
                'conflict_detected': conflict_detected
            }
            
            if conflict_detected:
                response_data['conflict_message'] = f'Un fichier avec le même nom existait déjà dans le Drive. L\'ancien fichier a été déplacé dans le dossier Historique et sera automatiquement supprimé après 30 jours.'
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
def generate_devis_marche_pdf_drive(request):
    """
    Vue pour générer le PDF du devis de marché et le stocker dans AWS S3
    """
    try:
        devis_id = request.GET.get('devis_id')
        appel_offres_id = request.GET.get('appel_offres_id')
        appel_offres_name = request.GET.get('appel_offres_name', 'Appel d\'offres')
        societe_name = request.GET.get('societe_name', 'Société par défaut')
        force_replace = request.GET.get('force_replace', 'false').lower() == 'true'
        
        # Validation des paramètres requis
        if not devis_id:
            return JsonResponse({
                'success': False,
                'error': 'Paramètre manquant: devis_id'
            }, status=400)
        
        # Récupérer le numéro du devis depuis la DB
        from .models import Devis
        try:
            devis = Devis.objects.get(id=devis_id)
            print(f"🔍 DEBUG pdf_views - devis trouvé: id={devis.id}, numero='{devis.numero}'")
            devis_name = devis.numero  # Utiliser le numéro du devis (ex: "DEV-008-25 - TestDrive-2")
            if not devis_name or devis_name.strip() == "":
                print(f"⚠️ DEBUG pdf_views - devis.numero est vide, utilisation du fallback")
                devis_name = appel_offres_name  # Fallback si numero est vide
        except Devis.DoesNotExist:
            print(f"❌ DEBUG pdf_views - Devis avec id={devis_id} n'existe pas")
            devis_name = appel_offres_name  # Fallback sur le nom de l'appel d'offres
        
        print(f"🔍 DEBUG pdf_views - devis_name final: '{devis_name}'")
        
        # URL de prévisualisation - utiliser l'ID du devis
        preview_url = request.build_absolute_uri(f"/api/preview-saved-devis/{devis_id}/")
        
        # Préparer les paramètres pour la génération du PDF
        pdf_kwargs = {
            'appel_offres_id': appel_offres_id,
            'appel_offres_name': appel_offres_name,
            'devis_name': devis_name  # Passer le nom du devis depuis la DB
        }
        
        # Ajouter le chemin personnalisé si fourni
        custom_path = request.GET.get('custom_path', '')
        if custom_path:
            pdf_kwargs['custom_path'] = custom_path
        
        # Ajouter le nom de fichier personnalisé si fourni (pour éviter les conflits)
        custom_filename = request.GET.get('custom_filename', '')
        if custom_filename:
            pdf_kwargs['custom_filename'] = custom_filename
        
        # Générer le PDF et le stocker dans AWS S3
        success, message, s3_file_path, conflict_detected = pdf_manager.generate_andStore_pdf(
            document_type='devis_marche',
            preview_url=preview_url,
            societe_name=societe_name,
            force_replace=force_replace,
            modified_by=_get_modified_by(request),
            **pdf_kwargs
        )
        
        # ✅ Gérer les conflits : retourner les informations même si success=False
        if conflict_detected and not success:
            # Conflit détecté : retourner les informations du conflit
            return JsonResponse({
                'success': False,
                'error': message,
                'conflict_detected': True,
                'conflict_message': f'Un fichier avec le même nom existe déjà dans le Drive et a été modifié. Souhaitez-vous le remplacer ?',
                'conflict_type': 'file_exists',
                'file_path': s3_file_path,
                'file_name': s3_file_path.split('/')[-1] if s3_file_path else None,
                'document_type': 'devis_marche',
                'societe_name': societe_name,
                'appel_offres_id': appel_offres_id,
                'appel_offres_name': appel_offres_name,
                'devis_id': devis_id,
                'numero': devis_name
            }, status=409)  # Code 409 Conflict
        
        if success:
            # Succès : retourner les informations du fichier stocké
            import time
            timestamp = int(time.time())
            
            # Construire le message selon le contexte
            if force_replace and conflict_detected:
                message = f'PDF devis marché {appel_offres_name} généré et remplacé avec succès dans le Drive. L\'ancien fichier a été déplacé dans le dossier Historique et sera automatiquement supprimé après 30 jours.'
            else:
                message = f'PDF devis marché {appel_offres_name} généré et stocké avec succès dans le Drive'
            
            response_data = {
                'success': True,
                'message': message,
                'file_path': s3_file_path,
                'file_name': s3_file_path.split('/')[-1],
                'drive_url': f"/drive-v2?path={s3_file_path}&focus=file&_t={timestamp}",
                'redirect_to': f"/drive-v2?path={s3_file_path}&focus=file&_t={timestamp}",
                'document_type': 'devis_marche',
                'societe_name': societe_name,
                'appel_offres_id': appel_offres_id,
                'appel_offres_name': appel_offres_name,
                'devis_id': devis_id,
                'numero': devis_name,
                'download_url': f"/api/download-pdf-from-s3?path={s3_file_path}",
                'conflict_detected': conflict_detected,
                'file_replaced': force_replace and conflict_detected
            }
            
            if conflict_detected:
                response_data['conflict_message'] = f'Un fichier avec le même nom existait déjà dans le Drive. L\'ancien fichier a été déplacé dans le dossier Historique et sera automatiquement supprimé après 30 jours.'
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
            
            # Récupérer le numéro du devis depuis la DB
            devis_id = data.get('devis_id')
            if devis_id:
                try:
                    from .models import Devis
                    devis = Devis.objects.get(id=devis_id)
                    print(f"🔍 DEBUG replace_file_after_confirmation - devis trouvé: id={devis.id}, numero='{devis.numero}'")
                    devis_name = devis.numero
                    if not devis_name or devis_name.strip() == "":
                        print(f"⚠️ DEBUG replace_file_after_confirmation - devis.numero est vide, utilisation du fallback")
                        devis_name = kwargs['appel_offres_name']
                except Devis.DoesNotExist:
                    print(f"❌ DEBUG replace_file_after_confirmation - Devis avec id={devis_id} n'existe pas")
                    devis_name = kwargs['appel_offres_name']
            else:
                devis_name = kwargs['appel_offres_name']
            
            print(f"🔍 DEBUG replace_file_after_confirmation - devis_name final: '{devis_name}'")
            kwargs['devis_name'] = devis_name
        
        # Utiliser la méthode de remplacement avec confirmation
        success, message, s3_file_path = pdf_manager.replace_file_with_confirmation(
            document_type=document_type,
            preview_url=preview_url,
            societe_name=societe_name,
            modified_by=_get_modified_by(request),
            **kwargs
        )
        
        if success:
            return JsonResponse({
                'success': True,
                'message': f'Fichier remplacé avec succès dans le Drive',
                'file_path': s3_file_path,
                'file_name': s3_file_path.split('/')[-1],
                'drive_url': f"/drive-v2?path={s3_file_path}&focus=file",
                'redirect_to': f"/drive-v2?path={s3_file_path}&focus=file",
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


@api_view(['GET', 'HEAD'])
@permission_classes([AllowAny])
def download_pdf_from_s3(request):
    """
    Vue pour télécharger un PDF depuis AWS S3 ou vérifier son existence (HEAD)
    """
    try:
        s3_path = request.GET.get('path')
        if not s3_path:
            return JsonResponse({'error': 'Chemin S3 manquant'}, status=400)
        
        # Pour les requêtes HEAD, juste vérifier l'existence
        if request.method == 'HEAD':
            from .utils import get_s3_client, get_s3_bucket_name
            try:
                s3_client = get_s3_client()
                bucket_name = get_s3_bucket_name()
                
                # Vérifier si le fichier existe
                s3_client.head_object(Bucket=bucket_name, Key=s3_path)
                return HttpResponse(status=200)  # Fichier existe
            except s3_client.exceptions.NoSuchKey:
                return HttpResponse(status=404)  # Fichier n'existe pas
            except Exception as e:
                print(f"ERREUR HEAD: {str(e)}")
                return HttpResponse(status=500)  # Erreur serveur
        
        # Pour les requêtes GET, télécharger le PDF
        success, message, pdf_content = pdf_manager.download_pdf_from_s3(s3_path)
        
        if success:
            # Retourner le PDF pour téléchargement
            response = HttpResponse(pdf_content, content_type='application/pdf')
            filename = s3_path.split('/')[-1]
            response['Content-Disposition'] = encode_filename_for_content_disposition(filename)
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
                target_pattern = f"RapportComptable_{month_name}_{year_short}.pdf"
                
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
            response['Content-Disposition'] = encode_filename_for_content_disposition(file_name)
            return response
        else:
            return JsonResponse({'error': 'Fichier non trouvé'}, status=404)
            
    except Exception as e:
        return JsonResponse({'error': f'Erreur: {str(e)}'}, status=500)


@api_view(['POST'])
@permission_classes([AllowAny])
def generate_devis_marche_auto(request):
    """
    Vue pour générer automatiquement le PDF du devis de marché lors de la création d'un appel d'offre
    """
    try:
        # Récupérer les paramètres depuis le body de la requête
        data = request.data
        appel_offres_id = data.get('appel_offres_id')
        appel_offres_name = data.get('appel_offres_name', 'Appel d\'offres')
        societe_name = data.get('societe_name', 'Société par défaut')
        
        # Validation des paramètres requis
        if not appel_offres_id:
            error_msg = "appel_offres_id est requis pour la génération automatique du PDF"
            print(f"❌ ERREUR VALIDATION: {error_msg}")
            return JsonResponse({'error': error_msg}, status=400)
        
        print(f"🚀 DÉBUT génération automatique PDF devis marché pour appel d'offres {appel_offres_id}")
        
        # URL de prévisualisation - utiliser l'endpoint existant
        preview_url = request.build_absolute_uri(f"/api/preview-saved-devis/{appel_offres_id}/")
        print(f"📄 URL de prévisualisation: {preview_url}")
        
        # Générer le PDF et le stocker dans AWS S3
        success, message, s3_file_path, conflict_detected = pdf_manager.generate_andStore_pdf(
            document_type='devis_marche',
            preview_url=preview_url,
            societe_name=societe_name,
            modified_by=_get_modified_by(request),
            appel_offres_id=appel_offres_id,
            appel_offres_name=appel_offres_name
        )
        
        if success:
            print(f"✅ PDF généré avec succès: {s3_file_path}")
            # Succès : retourner les informations du fichier stocké
            return JsonResponse({
                'success': True,
                'message': f'PDF devis marché {appel_offres_name} généré automatiquement et stocké dans le Drive',
                'file_path': s3_file_path,
                'file_name': s3_file_path.split('/')[-1],
                'drive_url': f"/drive-v2?path={s3_file_path}&focus=file",
                'redirect_to': f"/drive-v2?path={s3_file_path}&focus=file",
                'document_type': 'devis_marche',
                'societe_name': societe_name,
                'appel_offres_id': appel_offres_id,
                'appel_offres_name': appel_offres_name,
                'download_url': f"/api/download-pdf-from-s3?path={s3_file_path}",
                'conflict_detected': conflict_detected,
                'auto_generated': True
            })
        else:
            # Échec : retourner l'erreur avec détails pour le debug
            error_msg = f"Échec de la génération automatique du PDF: {message}"
            print(f"❌ ERREUR GÉNÉRATION: {error_msg}")
            return JsonResponse({
                'success': False,
                'error': error_msg,
                'details': {
                    'appel_offres_id': appel_offres_id,
                    'appel_offres_name': appel_offres_name,
                    'societe_name': societe_name,
                    'preview_url': preview_url
                }
            }, status=500)
            
    except Exception as e:
        # Gestion d'erreur avec détails complets pour le debug
        error_msg = f'Erreur inattendue lors de la génération automatique du PDF: {str(e)}'
        print(f"❌ ERREUR INATTENDUE: {error_msg}")
        import traceback
        traceback.print_exc()
        
        return JsonResponse({
            'error': error_msg,
            'details': {
                'appel_offres_id': request.data.get('appel_offres_id') if hasattr(request, 'data') else None,
                'appel_offres_name': request.data.get('appel_offres_name') if hasattr(request, 'data') else None,
                'societe_name': request.data.get('societe_name') if hasattr(request, 'data') else None,
                'traceback': traceback.format_exc()
            }
        }, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def generate_contrat_sous_traitance_pdf_drive(request):
    """
    Vue pour générer le PDF du contrat de sous-traitance et le stocker dans AWS S3
    """
    try:
        contrat_id = request.GET.get('contrat_id')
        chantier_id = request.GET.get('chantier_id')
        chantier_name = request.GET.get('chantier_name', 'Chantier')
        societe_name = request.GET.get('societe_name', 'Société par défaut')
        sous_traitant_name = request.GET.get('sous_traitant_name', 'Sous-traitant')
        
        if not contrat_id:
            return JsonResponse({
                'success': False,
                'error': 'contrat_id est requis pour générer le PDF'
            }, status=400)
        
        # URL de prévisualisation pour les contrats de sous-traitance
        preview_url = request.build_absolute_uri(f"/api/preview-contrat/{contrat_id}/")
        
        # Générer le PDF et le stocker dans AWS S3
        # Le nom sera généré automatiquement au format: Contrat_NomSousTraitant_NomChantier.pdf
        success, message, s3_file_path, conflict_detected = pdf_manager.generate_andStore_pdf(
            document_type='contrat_sous_traitance',
            preview_url=preview_url,
            societe_name=societe_name,
            force_replace=request.GET.get('force_replace', 'false').lower() == 'true',
            modified_by=_get_modified_by(request),
            chantier_id=chantier_id,
            chantier_name=chantier_name,
            sous_traitant_name=sous_traitant_name
        )
        
        if success:
            # Succès : retourner les informations du fichier stocké
            return JsonResponse({
                'success': True,
                'message': f'PDF contrat {sous_traitant_name} généré et stocké avec succès dans le Drive',
                'file_path': s3_file_path,
                'file_name': s3_file_path.split('/')[-1],
                'drive_url': f"/drive-v2?path={s3_file_path}&focus=file",
                'redirect_to': f"/drive-v2?path={s3_file_path}&focus=file",
                'document_type': 'contrat_sous_traitance',
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
def generate_avenant_sous_traitance_pdf_drive(request):
    """
    Vue pour générer le PDF de l'avenant de sous-traitance et le stocker dans AWS S3
    """
    try:
        avenant_id = request.GET.get('avenant_id')
        contrat_id = request.GET.get('contrat_id')
        chantier_id = request.GET.get('chantier_id')
        chantier_name = request.GET.get('chantier_name', 'Chantier')
        societe_name = request.GET.get('societe_name', 'Société par défaut')
        sous_traitant_name = request.GET.get('sous_traitant_name', 'Sous-traitant')
        numero_avenant = request.GET.get('numero_avenant', '1')
        
        if not avenant_id:
            return JsonResponse({
                'success': False,
                'error': 'avenant_id est requis pour générer le PDF'
            }, status=400)
        
        # URL de prévisualisation pour les avenants de sous-traitance
        preview_url = request.build_absolute_uri(f"/api/preview-avenant/{avenant_id}/")
        
        # Générer le PDF et le stocker dans AWS S3
        # Le nom sera généré automatiquement au format: Avenant_Numero_NomSousTraitant_NomChantier.pdf
        success, message, s3_file_path, conflict_detected = pdf_manager.generate_andStore_pdf(
            document_type='avenant_sous_traitance',
            preview_url=preview_url,
            societe_name=societe_name,
            force_replace=request.GET.get('force_replace', 'false').lower() == 'true',
            modified_by=_get_modified_by(request),
            chantier_id=chantier_id,
            chantier_name=chantier_name,
            sous_traitant_name=sous_traitant_name,
            avenant_numero=numero_avenant
        )
        
        if success:
            # Succès : retourner les informations du fichier stocké
            return JsonResponse({
                'success': True,
                'message': f'PDF avenant {numero_avenant} {sous_traitant_name} généré et stocké avec succès dans le Drive',
                'file_path': s3_file_path,
                'file_name': s3_file_path.split('/')[-1],
                'drive_url': f"/drive-v2?path={s3_file_path}&focus=file",
                'redirect_to': f"/drive-v2?path={s3_file_path}&focus=file",
                'document_type': 'avenant_sous_traitance',
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
def generate_certificat_paiement_pdf_drive(request):
    """
    Vue pour générer le PDF du certificat de paiement sous-traitant et le stocker dans AWS S3
    """
    try:
        contrat_id = request.GET.get('contrat_id')
        chantier_id = request.GET.get('chantier_id')
        chantier_name = request.GET.get('chantier_name', 'Chantier')
        societe_name = request.GET.get('societe_name', 'Société par défaut')
        sous_traitant_name = request.GET.get('sous_traitant_name', 'Sous-traitant')
        numero_certificat = request.GET.get('numero_certificat', '1')
        facture_id = request.GET.get('facture_id', '')
        mois = request.GET.get('mois', '')
        annee = request.GET.get('annee', '')
        force_replace = request.GET.get('force_replace', 'false').lower() == 'true'
        custom_filename = request.GET.get('custom_filename', '')

        if not contrat_id:
            return JsonResponse({
                'success': False,
                'error': 'contrat_id est requis pour générer le certificat de paiement'
            }, status=400)

        # Construire l'URL de prévisualisation
        preview_url = request.build_absolute_uri(
            f"/api/preview-certificat-paiement/{contrat_id}/"
        )
        # Ajouter les paramètres GET pour la preview
        preview_params = []
        if facture_id:
            preview_params.append(f"facture_id={facture_id}")
        if numero_certificat:
            preview_params.append(f"numero_certificat={numero_certificat}")
        if preview_params:
            preview_url += '?' + '&'.join(preview_params)

        # Si mois/annee non fournis, essayer de les récupérer depuis la facture
        if facture_id and (not mois or not annee):
            try:
                from .models import FactureSousTraitant
                facture_obj = FactureSousTraitant.objects.get(id=facture_id)
                if not mois:
                    mois = str(facture_obj.mois)
                if not annee:
                    annee = str(facture_obj.annee)
            except Exception:
                pass

        # Préparer les kwargs pour le PDF manager
        pdf_kwargs = {
            'chantier_id': chantier_id,
            'chantier_name': chantier_name,
            'sous_traitant_name': sous_traitant_name,
            'numero_certificat': numero_certificat,
            'mois': mois or '01',
            'annee': annee or '2026',
        }
        if custom_filename:
            pdf_kwargs['custom_filename'] = custom_filename

        # Générer le PDF et le stocker dans AWS S3
        success, message, s3_file_path, conflict_detected = pdf_manager.generate_andStore_pdf(
            document_type='certificat_paiement',
            preview_url=preview_url,
            societe_name=societe_name,
            force_replace=force_replace,
            modified_by=_get_modified_by(request),
            **pdf_kwargs
        )

        if conflict_detected and not success:
            return JsonResponse({
                'success': False,
                'error': message,
                'conflict_detected': True,
                'file_name': s3_file_path.split('/')[-1] if s3_file_path else '',
                'file_path': s3_file_path,
                'drive_url': f"/drive-v2?path={s3_file_path}&focus=file" if s3_file_path else '',
                'contrat_id': contrat_id,
                'chantier_id': chantier_id,
                'chantier_name': chantier_name,
                'societe_name': societe_name,
                'sous_traitant_name': sous_traitant_name,
                'numero_certificat': numero_certificat,
                'mois': mois,
                'annee': annee,
            }, status=409)

        if success:
            return JsonResponse({
                'success': True,
                'message': f'Certificat de paiement n°{numero_certificat} - {sous_traitant_name} généré et stocké avec succès dans le Drive',
                'file_path': s3_file_path,
                'file_name': s3_file_path.split('/')[-1],
                'drive_url': f"/drive-v2?path={s3_file_path}&focus=file",
                'redirect_to': f"/drive-v2?path={s3_file_path}&focus=file",
                'document_type': 'certificat_paiement',
                'societe_name': societe_name,
                'chantier_id': chantier_id,
                'chantier_name': chantier_name,
                'sous_traitant_name': sous_traitant_name,
                'numero_certificat': numero_certificat,
                'download_url': f"/api/download-pdf-from-s3?path={s3_file_path}",
                'conflict_detected': conflict_detected,
            })
        else:
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
def generate_situation_pdf_drive(request):
    """
    Vue pour générer le PDF d'une situation et le stocker dans AWS S3
    """
    try:
        # Récupérer les paramètres depuis la requête
        situation_id = request.GET.get('situation_id')
        chantier_id = request.GET.get('chantier_id')
        chantier_name = request.GET.get('chantier_name', 'Chantier')
        societe_name = request.GET.get('societe_name', 'Société par défaut')
        numero_situation = request.GET.get('numero_situation', 'SIT-001')
        force_replace = request.GET.get('force_replace', 'false').lower() == 'true'
        custom_filename = request.GET.get('custom_filename', '')  # Nom de fichier personnalisé
        
        if not situation_id:
            return JsonResponse({'error': 'situation_id est requis'}, status=400)
        
        # URL de prévisualisation
        preview_url = request.build_absolute_uri(f"/api/preview-situation/{situation_id}/")
        
        # Préparer les kwargs pour generate_andStore_pdf
        pdf_kwargs = {
            'situation_id': situation_id,
            'chantier_id': chantier_id,
            'chantier_name': chantier_name,
            'numero_situation': numero_situation
        }
        
        # Ajouter custom_filename si fourni
        if custom_filename:
            pdf_kwargs['custom_filename'] = custom_filename
        
        # Générer le PDF et le stocker dans AWS S3
        success, message, s3_file_path, conflict_detected = pdf_manager.generate_andStore_pdf(
            document_type='situation',
            preview_url=preview_url,
            societe_name=societe_name,
            force_replace=force_replace,
            modified_by=_get_modified_by(request),
            **pdf_kwargs
        )
        
        # ✅ Gérer les conflits : retourner les informations même si success=False
        if conflict_detected and not success:
            # Conflit détecté : retourner les informations du conflit
            return JsonResponse({
                'success': False,
                'error': message,
                'conflict_detected': True,
                'conflict_message': f'Un fichier avec le même nom existe déjà dans le Drive et a été modifié. Souhaitez-vous le remplacer ?',
                'conflict_type': 'file_exists',
                'file_path': s3_file_path,
                'file_name': s3_file_path.split('/')[-1] if s3_file_path else None,
                'document_type': 'situation',
                'societe_name': societe_name,
                'chantier_id': chantier_id,
                'chantier_name': chantier_name,
                'situation_id': situation_id,
                'numero_situation': numero_situation
            }, status=409)  # Code 409 Conflict
        
        if success:
            # Succès : retourner les informations du fichier stocké
            response_data = {
                'success': True,
                'message': f'PDF situation {numero_situation} généré et stocké avec succès dans le Drive',
                'file_path': s3_file_path,
                'file_name': s3_file_path.split('/')[-1],
                'drive_url': f"/drive-v2?path={s3_file_path}&focus=file",
                'redirect_to': f"/drive-v2?path={s3_file_path}&focus=file",
                'document_type': 'situation',
                'societe_name': societe_name,
                'chantier_id': chantier_id,
                'chantier_name': chantier_name,
                'situation_id': situation_id,
                'numero_situation': numero_situation,
                'download_url': f"/api/download-pdf-from-s3?path={s3_file_path}",
                'conflict_detected': conflict_detected
            }
            
            if conflict_detected:
                response_data['conflict_message'] = f'Un fichier avec le même nom existait déjà dans le Drive. L\'ancien fichier a été déplacé dans le dossier Historique et sera automatiquement supprimé après 30 jours.'
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
def generate_bon_commande_pdf_drive(request):
    """
    Vue pour générer le PDF d'un bon de commande et le stocker dans AWS S3
    """
    try:
        # Récupérer les paramètres depuis la requête
        bon_commande_id = request.GET.get('bon_commande_id')
        chantier_id = request.GET.get('chantier_id')
        chantier_name = request.GET.get('chantier_name', 'Chantier')
        societe_name = request.GET.get('societe_name', 'Société par défaut')
        numero_bon_commande = request.GET.get('numero_bon_commande', 'BC-001')
        fournisseur_name = request.GET.get('fournisseur_name', 'Fournisseur')
        force_replace = request.GET.get('force_replace', 'false').lower() == 'true'
        custom_filename = request.GET.get('custom_filename', '')  # Nom de fichier personnalisé
        
        if not bon_commande_id:
            return JsonResponse({'error': 'bon_commande_id est requis'}, status=400)
        
        # URL de prévisualisation
        preview_url = request.build_absolute_uri(f"/api/preview-saved-bon-commande/{bon_commande_id}/")
        
        # Préparer les kwargs pour generate_andStore_pdf
        pdf_kwargs = {
            'bon_commande_id': bon_commande_id,
            'chantier_id': chantier_id,
            'chantier_name': chantier_name,
            'numero_bon_commande': numero_bon_commande,
            'fournisseur_name': fournisseur_name
        }
        
        # Ajouter custom_filename si fourni
        if custom_filename:
            pdf_kwargs['custom_filename'] = custom_filename
        
        # Générer le PDF et le stocker dans AWS S3
        success, message, s3_file_path, conflict_detected = pdf_manager.generate_andStore_pdf(
            document_type='bon_commande',
            preview_url=preview_url,
            societe_name=societe_name,
            force_replace=force_replace,
            modified_by=_get_modified_by(request),
            **pdf_kwargs
        )
        
        # ✅ Gérer les conflits : retourner les informations même si success=False
        if conflict_detected and not success:
            # Conflit détecté : retourner les informations du conflit
            return JsonResponse({
                'success': False,
                'error': message,
                'conflict_detected': True,
                'conflict_message': f'Un fichier avec le même nom existe déjà dans le Drive et a été modifié. Souhaitez-vous le remplacer ?',
                'conflict_type': 'file_exists',
                'file_path': s3_file_path,
                'file_name': s3_file_path.split('/')[-1] if s3_file_path else None,
                'document_type': 'bon_commande',
                'societe_name': societe_name,
                'chantier_id': chantier_id,
                'chantier_name': chantier_name,
                'bon_commande_id': bon_commande_id,
                'numero_bon_commande': numero_bon_commande,
                'fournisseur_name': fournisseur_name
            }, status=409)  # Code 409 Conflict
        
        if success:
            # Succès : retourner les informations du fichier stocké
            response_data = {
                'success': True,
                'message': f'PDF bon de commande {numero_bon_commande} généré et stocké avec succès dans le Drive',
                'file_path': s3_file_path,
                'file_name': s3_file_path.split('/')[-1],
                'drive_url': f"/drive-v2?path={s3_file_path}&focus=file",
                'redirect_to': f"/drive-v2?path={s3_file_path}&focus=file",
                'document_type': 'bon_commande',
                'societe_name': societe_name,
                'chantier_id': chantier_id,
                'chantier_name': chantier_name,
                'bon_commande_id': bon_commande_id,
                'numero_bon_commande': numero_bon_commande,
                'fournisseur_name': fournisseur_name,
                'download_url': f"/api/download-pdf-from-s3?path={s3_file_path}",
                'conflict_detected': conflict_detected
            }
            
            if conflict_detected:
                response_data['conflict_message'] = f'Un fichier avec le même nom existait déjà dans le Drive. L\'ancien fichier a été déplacé dans le dossier Historique et sera automatiquement supprimé après 30 jours.'
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
def generate_facture_pdf_drive(request):
    """
    Vue pour générer le PDF d'une facture et le stocker dans AWS S3
    """
    try:
        # Récupérer les paramètres depuis la requête
        facture_id = request.GET.get('facture_id') or request.GET.get('factureId')
        chantier_id = request.GET.get('chantier_id') or request.GET.get('chantierId')
        chantier_name = request.GET.get('chantier_name') or request.GET.get('chantierName', 'Chantier')
        societe_name = request.GET.get('societe_name') or request.GET.get('societeName', 'Société par défaut')
        numero = request.GET.get('numero', 'Facture n°01.2025')
        force_replace = request.GET.get('force_replace', 'false').lower() == 'true'
        
        if not facture_id:
            return JsonResponse({'error': 'facture_id est requis'}, status=400)
        
        # URL de prévisualisation
        preview_url = request.build_absolute_uri(f"/api/preview-facture/{facture_id}/")
        
        # Générer le PDF et le stocker dans AWS S3
        success, message, s3_file_path, conflict_detected = pdf_manager.generate_andStore_pdf(
            document_type='facture',
            preview_url=preview_url,
            societe_name=societe_name,
            force_replace=force_replace,
            modified_by=_get_modified_by(request),
            facture_id=facture_id,
            chantier_id=chantier_id,
            chantier_name=chantier_name,
            numero=numero
        )
        
        if success:
            response_data = {
                'success': True,
                'message': f'PDF facture {numero} généré et stocké avec succès dans le Drive',
                'file_path': s3_file_path,
                'file_name': s3_file_path.split('/')[-1],
                'drive_url': f"/drive-v2?path={s3_file_path}&focus=file",
                'redirect_to': f"/drive-v2?path={s3_file_path}&focus=file",
                'document_type': 'facture',
                'societe_name': societe_name,
                'facture_id': facture_id,
                'chantier_id': chantier_id,
                'chantier_name': chantier_name,
                'numero': numero,
                'download_url': f"/api/download-pdf-from-s3?path={s3_file_path}",
                'conflict_detected': conflict_detected
            }
            
            if conflict_detected:
                response_data['conflict_message'] = f'Un fichier avec le même nom existait déjà. L\'ancien fichier a été déplacé dans le dossier Historique et sera automatiquement supprimé après 30 jours.'
                response_data['conflict_type'] = 'file_replaced'
            
            return JsonResponse(response_data)
        else:
            return JsonResponse({'success': False, 'error': message}, status=500)
            
    except Exception as e:
        error_msg = f'Erreur inattendue: {str(e)}'
        print(f"ERREUR: {error_msg}")
        return JsonResponse({'error': error_msg}, status=500)