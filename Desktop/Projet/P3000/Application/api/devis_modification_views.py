"""
Vues spécialisées pour la modification et régénération de devis
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.http import JsonResponse
from .models import Devis, Chantier, Societe, AppelOffres
from .pdf_manager import PDFManager
from .utils import custom_slugify, get_user_initials
import logging

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([AllowAny])
def regenerate_devis_pdf(request, devis_id):
    """
    Régénère le PDF d'un devis existant et le remplace dans le Drive
    Déplace l'ancien PDF vers Historique si le nom a changé
    """
    try:
        logger.info(f"🔄 Début de la régénération du PDF pour le devis {devis_id}")
        
        # Récupérer l'ancien numéro du devis depuis le body de la requête
        old_devis_numero = None
        if request.data and isinstance(request.data, dict):
            old_devis_numero = request.data.get('old_devis_numero')
        
        # Récupérer le devis existant
        try:
            devis = Devis.objects.get(id=devis_id)
            logger.info(f"✅ Devis trouvé: {devis.numero}, devis_chantier: {devis.devis_chantier}")
            logger.info(f"📝 Ancien numéro reçu: {old_devis_numero}, Nouveau numéro: {devis.numero}")
        except Devis.DoesNotExist:
            logger.error(f"❌ Devis {devis_id} non trouvé")
            return Response({
                'error': 'Devis non trouvé'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Récupérer les données associées
        # Pour les devis, la société est généralement associée au chantier
        societe_name = "Société par défaut"
        logger.info(f"📊 Société initiale: {societe_name}")
        
        # Déterminer le type de devis et préparer les données
        if devis.devis_chantier:
            logger.info("📋 Type: Devis de chantier")
            # Devis de chantier - récupérer les données du chantier
            try:
                # Vérifier si devis.chantier est déjà un objet ou un ID
                if hasattr(devis.chantier, 'id'):
                    # C'est déjà un objet Chantier
                    chantier = devis.chantier
                    chantier_name = chantier.chantier_name
                    chantier_id = chantier.id
                else:
                    # C'est un ID, faire la requête
                    chantier = Chantier.objects.get(id=devis.chantier)
                    chantier_name = chantier.chantier_name
                    chantier_id = chantier.id
                logger.info(f"✅ Chantier trouvé: {chantier_name} (ID: {chantier_id})")
                
                # Récupérer la société du chantier
                if hasattr(chantier, 'societe') and chantier.societe:
                    societe_name = chantier.societe.nom_societe
                    logger.info(f"📊 Société du chantier: {societe_name}")
                else:
                    logger.warning("⚠️ Aucune société trouvée pour le chantier, utilisation de la société par défaut")
                    
            except Chantier.DoesNotExist:
                logger.error(f"❌ Chantier {devis.chantier} non trouvé pour le devis de chantier")
                return Response({
                    'error': 'Chantier non trouvé pour ce devis de chantier'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Données pour devis de chantier
            # Pour les devis de chantier, utiliser la structure Chantiers/
            document_data = {
                'devis_id': devis.id,
                'chantier_id': chantier_id,
                'chantier_name': chantier_name,
                'societe_name': societe_name,
                'numero': devis.numero
            }
            
            # Déplacer l'ancien PDF vers Historique si le nom a changé
            pdf_manager = PDFManager()
            if old_devis_numero and old_devis_numero != devis.numero:
                logger.info(f"📝 Le nom du devis a changé: '{old_devis_numero}' → '{devis.numero}'")
                logger.info("🔍 Recherche de l'ancien PDF...")
                
                # Calculer le chemin de l'ancien PDF
                old_filename = pdf_manager.generate_pdf_filename('devis_marche', numero=old_devis_numero)
                old_s3_folder_path = pdf_manager.get_s3_folder_path('devis_marche', societe_name, 
                                                                     chantier_id=chantier_id,
                                                                     chantier_name=chantier_name)
                old_s3_file_path = f"{old_s3_folder_path}/{old_filename}"
                
                logger.info(f"🔍 Chemin de l'ancien PDF: {old_s3_file_path}")
                
                # Vérifier si l'ancien PDF existe et le déplacer vers Historique
                if pdf_manager.check_file_conflict(old_s3_file_path):
                    logger.info(f"✅ Ancien PDF trouvé, déplacement vers Historique...")
                    try:
                        historique_path = "Historique"
                        from .utils import create_s3_folder_recursive
                        create_s3_folder_recursive(historique_path)
                        
                        from datetime import datetime
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
            preview_url = request.build_absolute_uri(f"/api/preview-saved-devis/{devis.id}/")
            logger.info(f"🔗 URL de prévisualisation: {preview_url}")
            
            # Générer le PDF avec le PDF Manager
            logger.info("🚀 Début de la génération du nouveau PDF...")
            _modified_by = get_user_initials(request.user) if hasattr(request, 'user') and request.user and request.user.is_authenticated else "Application"
            success, message, s3_file_path, conflict_detected = pdf_manager.generate_andStore_pdf(
                document_type='devis_marche',
                preview_url=preview_url,
                societe_name=societe_name,
                force_replace=True,
                modified_by=_modified_by,
                devis_id=devis.id,
                chantier_id=chantier_id,
                chantier_name=chantier_name,
                numero=devis.numero
            )
            logger.info(f"📄 Résultat génération PDF: success={success}, message={message}")
            
        else:
            logger.info("📋 Type: Devis normal")
            # Devis normal - récupérer les données du chantier
            try:
                # Vérifier si devis.chantier est déjà un objet ou un ID
                if hasattr(devis.chantier, 'id'):
                    # C'est déjà un objet Chantier
                    chantier = devis.chantier
                    chantier_name = chantier.chantier_name
                    chantier_id = chantier.id
                else:
                    # C'est un ID, faire la requête
                    chantier = Chantier.objects.get(id=devis.chantier)
                    chantier_name = chantier.chantier_name
                    chantier_id = chantier.id
                logger.info(f"✅ Chantier trouvé: {chantier_name} (ID: {chantier_id})")
                
                # Récupérer la société du chantier
                if hasattr(chantier, 'societe') and chantier.societe:
                    societe_name = chantier.societe.nom_societe
                    logger.info(f"📊 Société du chantier: {societe_name}")
                else:
                    logger.warning("⚠️ Aucune société trouvée pour le chantier, utilisation de la société par défaut")
                    
            except Chantier.DoesNotExist:
                logger.error(f"❌ Chantier {devis.chantier} non trouvé pour le devis normal")
                return Response({
                    'error': 'Chantier non trouvé pour ce devis'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Données pour devis normal
            document_data = {
                'devis_id': devis.id,
                'chantier_id': chantier_id,
                'chantier_name': chantier_name,
                'societe_name': societe_name,
                'numero': devis.numero
            }
            
            # Déplacer l'ancien PDF vers Historique si le nom a changé
            pdf_manager = PDFManager()
            if old_devis_numero and old_devis_numero != devis.numero:
                logger.info(f"📝 Le nom du devis a changé: '{old_devis_numero}' → '{devis.numero}'")
                logger.info("🔍 Recherche de l'ancien PDF...")
                
                # Calculer le chemin de l'ancien PDF
                old_filename = pdf_manager.generate_pdf_filename('devis_travaux', devis_numero=old_devis_numero)
                old_s3_folder_path = pdf_manager.get_s3_folder_path('devis_travaux', societe_name, 
                                                                     chantier_id=chantier_id,
                                                                     chantier_name=chantier_name)
                old_s3_file_path = f"{old_s3_folder_path}/{old_filename}"
                
                logger.info(f"🔍 Chemin de l'ancien PDF: {old_s3_file_path}")
                
                # Vérifier si l'ancien PDF existe et le déplacer vers Historique
                if pdf_manager.check_file_conflict(old_s3_file_path):
                    logger.info(f"✅ Ancien PDF trouvé, déplacement vers Historique...")
                    try:
                        historique_path = "Historique"
                        from .utils import create_s3_folder_recursive
                        create_s3_folder_recursive(historique_path)
                        
                        from datetime import datetime
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
            preview_url = request.build_absolute_uri(f"/api/preview-saved-devis/{devis.id}/")
            logger.info(f"🔗 URL de prévisualisation: {preview_url}")
            
            # Générer le PDF avec le PDF Manager
            logger.info("🚀 Début de la génération du nouveau PDF...")
            _modified_by = get_user_initials(request.user) if hasattr(request, 'user') and request.user and request.user.is_authenticated else "Application"
            success, message, s3_file_path, conflict_detected = pdf_manager.generate_andStore_pdf(
                document_type='devis_travaux',
                preview_url=preview_url,
                societe_name=societe_name,
                force_replace=True,
                modified_by=_modified_by,
                devis_id=devis.id,
                chantier_id=chantier_id,
                chantier_name=chantier_name,
                devis_numero=devis.numero
            )
            logger.info(f"📄 Résultat génération PDF: success={success}, message={message}")
        
        if success:
            response_data = {
                'success': True,
                'message': f'PDF du devis {devis.numero} régénéré et remplacé avec succès dans le Drive',
                'file_path': s3_file_path,
                'file_name': s3_file_path.split('/')[-1],
                'drive_url': f"/drive-v2?path={s3_file_path}&focus=file",
                'redirect_to': f"/drive-v2?path={s3_file_path}&focus=file",
                'document_type': 'devis_chantier' if devis.devis_chantier else 'devis_normal',
                'societe_name': societe_name,
                'devis_id': devis.id,
                'numero': devis.numero,
                'download_url': f"/api/download-pdf-from-s3?path={s3_file_path}",
                'conflict_detected': conflict_detected
            }
            
            if conflict_detected:
                response_data['conflict_message'] = f'Un fichier avec le même nom existait déjà. L\'ancien fichier a été déplacé dans le dossier Historique et sera automatiquement supprimé après 30 jours.'
                response_data['conflict_type'] = 'file_replaced'
            
            logger.info(f"✅ PDF régénéré avec succès pour le devis {devis.id}: {s3_file_path}")
            return JsonResponse(response_data)
        else:
            logger.error(f"❌ Erreur lors de la génération du PDF pour le devis {devis.id}: {message}")
            return JsonResponse({'success': False, 'error': message}, status=500)
            
    except Exception as e:
        error_msg = f'Erreur inattendue lors de la régénération du PDF: {str(e)}'
        logger.error(f"❌ {error_msg}")
        logger.error(f"❌ Traceback: {str(e)}", exc_info=True)
        return JsonResponse({'error': error_msg}, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_devis_modification_info(request, devis_id):
    """
    Récupère les informations nécessaires pour la modification d'un devis
    """
    try:
        # Récupérer le devis existant
        try:
            devis = Devis.objects.get(id=devis_id)
        except Devis.DoesNotExist:
            return Response({
                'error': 'Devis non trouvé'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Récupérer les données associées
        societe = devis.societe if hasattr(devis, 'societe') else None
        societe_name = societe.name if societe else "Société par défaut"
        
        response_data = {
            'devis_id': devis.id,
            'numero': devis.numero,
            'devis_chantier': devis.devis_chantier,
            'societe_name': societe_name,
            'price_ht': float(devis.price_ht) if devis.price_ht else 0,
            'price_ttc': float(devis.price_ttc) if devis.price_ttc else 0,
            'tva_rate': float(devis.tva_rate) if devis.tva_rate else 20,
            'description': devis.description or '',
            'nature_travaux': devis.nature_travaux or '',
            'date_creation': devis.date_creation.isoformat() if devis.date_creation else None
        }
        
        # Ajouter les données spécifiques selon le type
        if devis.devis_chantier:
            # Devis de chantier - récupérer les données du chantier
            try:
                # Vérifier si devis.chantier est déjà un objet ou un ID
                if hasattr(devis.chantier, 'id'):
                    # C'est déjà un objet Chantier
                    chantier = devis.chantier
                else:
                    # C'est un ID, faire la requête
                    chantier = Chantier.objects.get(id=devis.chantier)
                response_data.update({
                    'chantier_id': chantier.id,
                    'chantier_name': chantier.chantier_name
                })
            except Chantier.DoesNotExist:
                response_data['chantier_id'] = None
                response_data['chantier_name'] = 'Chantier non trouvé'
        else:
            # Devis normal - récupérer les données du chantier
            try:
                # Vérifier si devis.chantier est déjà un objet ou un ID
                if hasattr(devis.chantier, 'id'):
                    # C'est déjà un objet Chantier
                    chantier = devis.chantier
                else:
                    # C'est un ID, faire la requête
                    chantier = Chantier.objects.get(id=devis.chantier)
                response_data.update({
                    'chantier_id': chantier.id,
                    'chantier_name': chantier.chantier_name
                })
            except Chantier.DoesNotExist:
                response_data['chantier_id'] = None
                response_data['chantier_name'] = 'Chantier non trouvé'
        
        return JsonResponse(response_data)
        
    except Exception as e:
        error_msg = f'Erreur lors de la récupération des informations du devis: {str(e)}'
        logger.error(error_msg)
        return JsonResponse({'error': error_msg}, status=500)
