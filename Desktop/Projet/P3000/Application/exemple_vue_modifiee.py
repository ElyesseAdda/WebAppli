"""
EXEMPLE de vue modifiée pour utiliser le nouveau système de gestion des PDFs
Ce fichier montre comment modifier vos vues existantes
"""

from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from api.pdf_manager import pdf_manager
from api.models import Societe, Chantier, AppelOffres

# EXEMPLE 1: Vue modifiée pour le planning hebdomadaire
def planning_hebdo_pdf_drive(request):
    """
    Version modifiée de planning_hebdo_pdf qui stocke le PDF dans AWS S3
    au lieu de le télécharger dans le navigateur
    """
    try:
        week = int(request.GET.get('week'))
        year = int(request.GET.get('year'))
        
        # Récupérer la société (vous devrez adapter selon votre logique)
        # Par exemple, depuis l'utilisateur connecté ou un paramètre
        societe_name = "Société par défaut"  # À adapter selon votre logique
        
        # Récupérer le chantier associé (si applicable)
        chantier_name = request.GET.get('chantier_name')  # Paramètre optionnel
        
        # Construire l'URL de prévisualisation
        preview_url = request.build_absolute_uri(f"/api/preview-planning-hebdo/?week={week}&year={year}")
        
        # Paramètres pour la génération du PDF
        params = {
            'week': week,
            'year': year
        }
        
        if chantier_name:
            params['chantier_name'] = chantier_name
        
        # Générer le PDF et le stocker dans AWS S3
        success, message, s3_file_path = pdf_manager.generateAndStore_pdf(
            document_type='planning_hebdo',
            preview_url=preview_url,
            societe_name=societe_name,
            **params
        )
        
        if success:
            # Succès : retourner les informations du fichier stocké
            return JsonResponse({
                'success': True,
                'message': 'PDF généré et stocké avec succès dans le Drive',
                'file_path': s3_file_path,
                'file_name': s3_file_path.split('/')[-1],
                'drive_url': f"/drive?path={s3_file_path}",  # URL vers votre interface Drive
                'redirect_to': f"/drive?path={s3_file_path}"  # Pour redirection automatique
            })
        else:
            # Échec : retourner l'erreur
            return JsonResponse({
                'success': False,
                'error': message
            }, status=500)
            
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Erreur inattendue: {str(e)}'
        }, status=500)

# EXEMPLE 2: Vue modifiée pour le rapport mensuel des agents
def generate_monthly_agents_pdf_drive(request):
    """
    Version modifiée de generate_monthly_agents_pdf qui stocke le PDF dans AWS S3
    """
    try:
        month = int(request.GET.get('month'))
        year = int(request.GET.get('year'))
        
        # Récupérer la société
        societe_name = "Société par défaut"  # À adapter selon votre logique
        
        # Récupérer le chantier associé (si applicable)
        chantier_name = request.GET.get('chantier_name')  # Paramètre optionnel
        
        # Construire l'URL de prévisualisation
        preview_url = request.build_absolute_uri(f"/api/preview-monthly-agents/?month={month}&year={year}")
        
        # Paramètres pour la génération du PDF
        params = {
            'month': month,
            'year': year
        }
        
        if chantier_name:
            params['chantier_name'] = chantier_name
        
        # Générer le PDF et le stocker dans AWS S3
        success, message, s3_file_path = pdf_manager.generateAndStore_pdf(
            document_type='rapport_agents',
            preview_url=preview_url,
            societe_name=societe_name,
            **params
        )
        
        if success:
            # Succès : retourner les informations du fichier stocké
            return JsonResponse({
                'success': True,
                'message': 'Rapport des agents généré et stocké avec succès dans le Drive',
                'file_path': s3_file_path,
                'file_name': s3_file_path.split('/')[-1],
                'drive_url': f"/drive?path={s3_file_path}",
                'redirect_to': f"/drive?path={s3_file_path}"
            })
        else:
            # Échec : retourner l'erreur
            return JsonResponse({
                'success': False,
                'error': message
            }, status=500)
            
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Erreur inattendue: {str(e)}'
        }, status=500)

# EXEMPLE 3: Vue pour générer un devis de travaux
def generate_devis_travaux_pdf_drive(request):
    """
    Nouvelle vue pour générer un devis de travaux et le stocker dans AWS S3
    """
    try:
        chantier_id = request.GET.get('chantier_id')
        if not chantier_id:
            return JsonResponse({
                'success': False,
                'error': 'ID du chantier requis'
            }, status=400)
        
        # Récupérer le chantier
        chantier = get_object_or_404(Chantier, id=chantier_id)
        societe_name = chantier.societe.nom_societe if chantier.societe else "Société par défaut"
        
        # Construire l'URL de prévisualisation
        preview_url = request.build_absolute_uri(f"/api/preview-devis-travaux/?chantier_id={chantier_id}")
        
        # Paramètres pour la génération du PDF
        params = {
            'chantier_name': chantier.chantier_name,
            'chantier_id': chantier.id
        }
        
        # Générer le PDF et le stocker dans AWS S3
        success, message, s3_file_path = pdf_manager.generateAndStore_pdf(
            document_type='devis_travaux',
            preview_url=preview_url,
            societe_name=societe_name,
            **params
        )
        
        if success:
            # Succès : retourner les informations du fichier stocké
            return JsonResponse({
                'success': True,
                'message': 'Devis de travaux généré et stocké avec succès dans le Drive',
                'file_path': s3_file_path,
                'file_name': s3_file_path.split('/')[-1],
                'drive_url': f"/drive?path={s3_file_path}",
                'redirect_to': f"/drive?path={s3_file_path}",
                'chantier_name': chantier.chantier_name,
                'societe_name': societe_name
            })
        else:
            # Échec : retourner l'erreur
            return JsonResponse({
                'success': False,
                'error': message
            }, status=500)
            
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Erreur inattendue: {str(e)}'
        }, status=500)

# EXEMPLE 4: Vue pour générer un devis de marché
def generate_devis_marche_pdf_drive(request):
    """
    Nouvelle vue pour générer un devis de marché et le stocker dans AWS S3
    """
    try:
        appel_offres_id = request.GET.get('appel_offres_id')
        if not appel_offres_id:
            return JsonResponse({
                'success': False,
                'error': 'ID de l\'appel d\'offres requis'
            }, status=400)
        
        # Récupérer l'appel d'offres
        appel_offres = get_object_or_404(AppelOffres, id=appel_offres_id)
        societe_name = appel_offres.societe.nom_societe if appel_offres.societe else "Société par défaut"
        
        # Construire l'URL de prévisualisation
        preview_url = request.build_absolute_uri(f"/api/preview-devis-marche/?appel_offres_id={appel_offres_id}")
        
        # Paramètres pour la génération du PDF
        params = {
            'appel_offres_name': appel_offres.chantier_name,
            'appel_offres_id': appel_offres.id
        }
        
        # Générer le PDF et le stocker dans AWS S3
        success, message, s3_file_path = pdf_manager.generateAndStore_pdf(
            document_type='devis_marche',
            preview_url=preview_url,
            societe_name=societe_name,
            **params
        )
        
        if success:
            # Succès : retourner les informations du fichier stocké
            return JsonResponse({
                'success': True,
                'message': 'Devis de marché généré et stocké avec succès dans le Drive',
                'file_path': s3_file_path,
                'file_name': s3_file_path.split('/')[-1],
                'drive_url': f"/drive?path={s3_file_path}",
                'redirect_to': f"/drive?path={s3_file_path}",
                'appel_offres_name': appel_offres.chantier_name,
                'societe_name': societe_name
            })
        else:
            # Échec : retourner l'erreur
            return JsonResponse({
                'success': False,
                'error': message
            }, status=500)
            
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Erreur inattendue: {str(e)}'
        }, status=500)

"""
NOTES IMPORTANTES pour l'implémentation :

1. ADAPTATION REQUISE :
   - Remplacer "Société par défaut" par votre logique de récupération de société
   - Adapter les URLs de prévisualisation selon votre structure
   - Modifier les URLs de redirection vers votre interface Drive

2. FRONTEND :
   - Modifier vos boutons pour appeler ces nouvelles vues
   - Gérer la réponse JSON pour afficher les notifications
   - Implémenter la redirection automatique vers le Drive

3. NOTIFICATIONS :
   - Afficher un toast/notification de succès
   - Rediriger automatiquement vers le Drive
   - Permettre à l'utilisateur de voir le fichier stocké

4. GESTION DES ERREURS :
   - Afficher les erreurs de manière conviviale
   - Permettre de réessayer en cas d'échec
   - Logger les erreurs pour le debugging

5. SÉCURITÉ :
   - Vérifier les permissions utilisateur
   - Valider les paramètres d'entrée
   - Limiter l'accès aux ressources appropriées
"""
