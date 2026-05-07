"""
Vues spécialisées pour la modification et régénération de situations
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.http import JsonResponse
from .models import Situation, Chantier
from .pdf_manager import PDFManager
from .utils import create_s3_folder_recursive, get_user_initials
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([AllowAny])
def regenerate_situation_pdf(request, situation_id):
    """
    Régénère le PDF d'une situation existante et le remplace dans le Drive
    Déplace l'ancien PDF vers Historique si le numéro a changé
    """
    try:
        logger.info(f"🔄 Début de la régénération du PDF pour la situation {situation_id}")
        
        # Récupérer l'ancien numéro de situation depuis le body de la requête
        old_numero_situation = None
        if request.data and isinstance(request.data, dict):
            old_numero_situation = request.data.get('old_numero_situation')
        
        # Récupérer la situation existante
        try:
            situation = Situation.objects.get(id=situation_id)
            logger.info(f"✅ Situation trouvée: {situation.numero_situation}")
            logger.info(f"📝 Ancien numéro reçu: {old_numero_situation}, Nouveau numéro: {situation.numero_situation}")
        except Situation.DoesNotExist:
            logger.error(f"❌ Situation {situation_id} non trouvée")
            return Response({'error': 'Situation non trouvée'}, status=status.HTTP_404_NOT_FOUND)
        
        # Récupérer les données du chantier
        societe_name = "Société par défaut"
        try:
            if hasattr(situation.chantier, 'id'):
                chantier = situation.chantier
                chantier_name = chantier.chantier_name
                chantier_id = chantier.id
            else:
                chantier = Chantier.objects.get(id=situation.chantier)
                chantier_name = chantier.chantier_name
                chantier_id = chantier.id
            logger.info(f"✅ Chantier trouvé: {chantier_name} (ID: {chantier_id})")
            
            if hasattr(chantier, 'societe') and chantier.societe:
                societe_name = chantier.societe.nom_societe
                logger.info(f"📊 Société du chantier: {societe_name}")
            else:
                logger.warning("⚠️ Aucune société trouvée pour le chantier, utilisation de la société par défaut")
                
        except Chantier.DoesNotExist:
            logger.error(f"❌ Chantier {situation.chantier} non trouvé pour la situation")
            return Response({'error': 'Chantier non trouvé pour cette situation'}, status=status.HTTP_404_NOT_FOUND)
        
        pdf_manager = PDFManager()
        
        # Déplacer l'ancien PDF vers Historique si le numéro a changé
        if old_numero_situation and old_numero_situation != situation.numero_situation:
            logger.info(f"📝 Le nom de la situation a changé: '{old_numero_situation}' → '{situation.numero_situation}'")
            logger.info("🔍 Recherche de l'ancien PDF...")
            
            old_filename = pdf_manager.generate_pdf_filename('situation', numero_situation=old_numero_situation)
            old_s3_folder_path = pdf_manager.get_s3_folder_path('situation', societe_name, 
                                                                  chantier_id=chantier_id,
                                                                  chantier_name=chantier_name)
            old_s3_file_path = f"{old_s3_folder_path}/{old_filename}"
            
            logger.info(f"🔍 Chemin de l'ancien PDF: {old_s3_file_path}")
            
            if pdf_manager.check_file_conflict(old_s3_file_path):
                logger.info(f"✅ Ancien PDF trouvé, déplacement vers Historique...")
                try:
                    historique_path = "Historique"
                    create_s3_folder_recursive(historique_path)
                    old_timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    old_historique_filename = f"Ancien_{old_filename.replace('.pdf', '')}_{old_timestamp}.pdf"
                    old_historique_path = f"{historique_path}/{old_historique_filename}"
                    
                    logger.info(f"📦 Déplacement: {old_s3_file_path} → {old_historique_path}")
                    pdf_manager.move_file_in_s3(old_s3_file_path, old_historique_path)
                    logger.info(f"✅ Ancien PDF déplacé vers Historique: {old_historique_path}")
                except Exception as e:
                    logger.warning(f"⚠️ Erreur lors du déplacement de l'ancien PDF: {str(e)}")
            else:
                logger.info(f"ℹ️ Ancien PDF non trouvé à {old_s3_file_path}, peut-être déjà déplacé ou inexistant")
        
        # URL de prévisualisation
        preview_url = request.build_absolute_uri(f"/api/preview-situation/{situation.id}/")
        logger.info(f"🔗 URL de prévisualisation: {preview_url}")
        
        # Générer le PDF avec le PDF Manager
        logger.info("🚀 Début de la génération du nouveau PDF...")
        _modified_by = get_user_initials(request.user) if hasattr(request, 'user') and request.user and request.user.is_authenticated else "Application"
        success, message, s3_file_path, conflict_detected = pdf_manager.generate_andStore_pdf(
            document_type='situation',
            preview_url=preview_url,
            societe_name=societe_name,
            force_replace=True,
            modified_by=_modified_by,
            situation_id=situation.id,
            chantier_id=chantier_id,
            chantier_name=chantier_name,
            numero_situation=situation.numero_situation
        )
        
        if success:
            response_data = {
                'success': True,
                'message': f'PDF de la situation {situation.numero_situation} régénéré et remplacé avec succès dans le Drive',
                'file_path': s3_file_path,
                'file_name': s3_file_path.split('/')[-1],
                'drive_url': f"/drive-v2?path={s3_file_path}&focus=file",
                'redirect_to': f"/drive-v2?path={s3_file_path}&focus=file",
                'document_type': 'situation',
                'societe_name': societe_name,
                'situation_id': situation.id,
                'numero_situation': situation.numero_situation,
                'download_url': f"/api/download-pdf-from-s3?path={s3_file_path}",
                'conflict_detected': conflict_detected
            }
            if conflict_detected:
                response_data['conflict_message'] = f'Un fichier avec le même nom existait déjà. L\'ancien fichier a été déplacé dans le dossier Historique et sera automatiquement supprimé après 30 jours.'
                response_data['conflict_type'] = 'file_replaced'
            
            logger.info(f"✅ PDF régénéré avec succès pour la situation {situation.id}: {s3_file_path}")
            return JsonResponse(response_data)
        else:
            logger.error(f"❌ Erreur lors de la génération du PDF pour la situation {situation.id}: {message}")
            return JsonResponse({'success': False, 'error': message}, status=500)
            
    except Exception as e:
        error_msg = f'Erreur inattendue lors de la régénération du PDF: {str(e)}'
        logger.error(f"❌ {error_msg}")
        logger.error(f"❌ Traceback: {str(e)}", exc_info=True)
        return JsonResponse({'error': error_msg}, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_situation_modification_info(request, situation_id):
    """
    Récupère les informations nécessaires pour la modification d'une situation
    """
    try:
        situation = Situation.objects.get(id=situation_id)
        
        societe_name = situation.chantier.societe.nom_societe if situation.chantier and situation.chantier.societe else "Société par défaut"
        
        response_data = {
            'situation_id': situation.id,
            'numero_situation': situation.numero_situation,
            'chantier_id': situation.chantier.id if situation.chantier else None,
            'chantier_name': situation.chantier.chantier_name if situation.chantier else None,
            'societe_name': societe_name,
            'mois': situation.mois,
            'annee': situation.annee,
            'montant_ht_mois': float(situation.montant_ht_mois) if situation.montant_ht_mois else 0,
            'montant_total_cumul_ht': float(situation.montant_total_cumul_ht) if situation.montant_total_cumul_ht else 0,
            'date_creation': situation.date_creation.isoformat() if situation.date_creation else None,
        }
        return JsonResponse(response_data)
    except Situation.DoesNotExist:
        return Response({'error': 'Situation non trouvée'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f'Erreur lors de la récupération des informations de la situation: {str(e)}')
        return JsonResponse({'error': str(e)}, status=500)

