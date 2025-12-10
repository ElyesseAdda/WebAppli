"""
Vues spécialisées pour la modification et régénération de bons de commande
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.http import JsonResponse
from .models import BonCommande, Chantier
from .pdf_manager import PDFManager
from .utils import create_s3_folder_recursive
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([AllowAny])
def regenerate_bon_commande_pdf(request, bon_commande_id):
    """
    Régénère le PDF d'un bon de commande existant et le remplace dans le Drive
    Déplace l'ancien PDF vers Historique si le numéro a changé
    """
    try:
        logger.info(f"🔄 Début de la régénération du PDF pour le bon de commande {bon_commande_id}")
        
        # Récupérer l'ancien numéro de bon de commande depuis le body de la requête
        old_numero_bon_commande = None
        if request.data and isinstance(request.data, dict):
            old_numero_bon_commande = request.data.get('old_numero_bon_commande')
        
        # Récupérer le bon de commande existant
        try:
            bon_commande = BonCommande.objects.get(id=bon_commande_id)
            logger.info(f"✅ Bon de commande trouvé: {bon_commande.numero}")
            logger.info(f"📝 Ancien numéro reçu: {old_numero_bon_commande}, Nouveau numéro: {bon_commande.numero}")
        except BonCommande.DoesNotExist:
            logger.error(f"❌ Bon de commande {bon_commande_id} non trouvé")
            return Response({'error': 'Bon de commande non trouvé'}, status=status.HTTP_404_NOT_FOUND)
        
        # Récupérer les données du chantier
        societe_name = "Société par défaut"
        try:
            if hasattr(bon_commande.chantier, 'id'):
                chantier = bon_commande.chantier
                chantier_name = chantier.chantier_name
                chantier_id = chantier.id
            else:
                chantier = Chantier.objects.get(id=bon_commande.chantier)
                chantier_name = chantier.chantier_name
                chantier_id = chantier.id
            logger.info(f"✅ Chantier trouvé: {chantier_name} (ID: {chantier_id})")
            
            if hasattr(chantier, 'societe') and chantier.societe:
                societe_name = chantier.societe.nom_societe
                logger.info(f"📊 Société du chantier: {societe_name}")
            else:
                logger.warning("⚠️ Aucune société trouvée pour le chantier, utilisation de la société par défaut")
                
        except Chantier.DoesNotExist:
            logger.error(f"❌ Chantier {bon_commande.chantier} non trouvé pour le bon de commande")
            return Response({'error': 'Chantier non trouvé pour ce bon de commande'}, status=status.HTTP_404_NOT_FOUND)
        
        # Récupérer le nom du fournisseur
        fournisseur_name = bon_commande.fournisseur if bon_commande.fournisseur else 'Fournisseur'
        logger.info(f"📦 Fournisseur: {fournisseur_name}")
        
        pdf_manager = PDFManager()
        
        # Déplacer l'ancien PDF vers Historique si le numéro a changé
        if old_numero_bon_commande and old_numero_bon_commande != bon_commande.numero:
            logger.info(f"📝 Le nom du bon de commande a changé: '{old_numero_bon_commande}' → '{bon_commande.numero}'")
            logger.info("🔍 Recherche de l'ancien PDF...")
            
            old_filename = pdf_manager.generate_pdf_filename('bon_commande', numero_bon_commande=old_numero_bon_commande)
            old_s3_folder_path = pdf_manager.get_s3_folder_path('bon_commande', societe_name, 
                                                                  chantier_id=chantier_id,
                                                                  chantier_name=chantier_name,
                                                                  fournisseur_name=fournisseur_name)
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
        preview_url = request.build_absolute_uri(f"/api/preview-saved-bon-commande/{bon_commande.id}/")
        logger.info(f"🔗 URL de prévisualisation: {preview_url}")
        
        # Générer le PDF avec le PDF Manager
        logger.info("🚀 Début de la génération du nouveau PDF...")
        success, message, s3_file_path, conflict_detected = pdf_manager.generate_andStore_pdf(
            document_type='bon_commande',
            preview_url=preview_url,
            societe_name=societe_name,
            force_replace=True,
            bon_commande_id=bon_commande.id,
            chantier_id=chantier_id,
            chantier_name=chantier_name,
            numero_bon_commande=bon_commande.numero,
            fournisseur_name=fournisseur_name
        )
        
        if success:
            response_data = {
                'success': True,
                'message': f'PDF du bon de commande {bon_commande.numero} régénéré et remplacé avec succès dans le Drive',
                'file_path': s3_file_path,
                'file_name': s3_file_path.split('/')[-1],
                'drive_url': f"/drive?path={s3_file_path}&sidebar=closed&focus=file",
                'redirect_to': f"/drive?path={s3_file_path}&sidebar=closed&focus=file",
                'document_type': 'bon_commande',
                'societe_name': societe_name,
                'bon_commande_id': bon_commande.id,
                'numero_bon_commande': bon_commande.numero,
                'download_url': f"/api/download-pdf-from-s3?path={s3_file_path}",
                'conflict_detected': conflict_detected
            }
            if conflict_detected:
                response_data['conflict_message'] = f'Un fichier avec le même nom existait déjà. L\'ancien fichier a été déplacé dans le dossier Historique et sera automatiquement supprimé après 30 jours.'
                response_data['conflict_type'] = 'file_replaced'
            
            logger.info(f"✅ PDF régénéré avec succès pour le bon de commande {bon_commande.id}: {s3_file_path}")
            return JsonResponse(response_data)
        else:
            logger.error(f"❌ Erreur lors de la génération du PDF pour le bon de commande {bon_commande.id}: {message}")
            return JsonResponse({'success': False, 'error': message}, status=500)
            
    except Exception as e:
        error_msg = f'Erreur inattendue lors de la régénération du PDF: {str(e)}'
        logger.error(f"❌ {error_msg}")
        logger.error(f"❌ Traceback: {str(e)}", exc_info=True)
        return JsonResponse({'error': error_msg}, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_bon_commande_modification_info(request, bon_commande_id):
    """
    Récupère les informations nécessaires pour la modification d'un bon de commande
    """
    try:
        bon_commande = BonCommande.objects.get(id=bon_commande_id)
        
        societe_name = bon_commande.chantier.societe.nom_societe if bon_commande.chantier and bon_commande.chantier.societe else "Société par défaut"
        
        response_data = {
            'bon_commande_id': bon_commande.id,
            'numero': bon_commande.numero,
            'chantier_id': bon_commande.chantier.id if bon_commande.chantier else None,
            'chantier_name': bon_commande.chantier.chantier_name if bon_commande.chantier else None,
            'societe_name': societe_name,
            'fournisseur': bon_commande.fournisseur,
            'montant_total': float(bon_commande.montant_total) if bon_commande.montant_total else 0,
            'date_creation': bon_commande.date_creation.isoformat() if bon_commande.date_creation else None,
            'statut': bon_commande.statut,
        }
        return JsonResponse(response_data)
    except BonCommande.DoesNotExist:
        return Response({'error': 'Bon de commande non trouvé'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f'Erreur lors de la récupération des informations du bon de commande: {str(e)}')
        return JsonResponse({'error': str(e)}, status=500)

