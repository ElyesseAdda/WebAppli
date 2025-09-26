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
from .utils import custom_slugify
import logging

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([AllowAny])
def regenerate_devis_pdf(request, devis_id):
    """
    Régénère le PDF d'un devis existant et le remplace dans le Drive
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
        
        # Déterminer le type de devis et préparer les données
        if devis.devis_chantier:
            # Devis de chantier - récupérer les données du chantier
            try:
                chantier = Chantier.objects.get(id=devis.chantier)
                chantier_name = chantier.chantier_name
                chantier_id = chantier.id
            except Chantier.DoesNotExist:
                return Response({
                    'error': 'Chantier non trouvé pour ce devis de chantier'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Données pour devis de chantier
            document_data = {
                'devis_id': devis.id,
                'chantier_id': chantier_id,
                'chantier_name': chantier_name,
                'societe_name': societe_name,
                'numero': devis.numero
            }
            
            # URL de prévisualisation
            preview_url = request.build_absolute_uri(f"/api/preview-saved-devis/{devis.id}/")
            
            # Générer le PDF avec le PDF Manager
            pdf_manager = PDFManager()
            success, message, s3_file_path, conflict_detected = pdf_manager.generate_andStore_pdf(
                document_type='devis_marche',
                preview_url=preview_url,
                societe_name=societe_name,
                force_replace=True,  # Toujours remplacer pour les modifications
                devis_id=devis.id,
                chantier_id=chantier_id,
                chantier_name=chantier_name,
                numero=devis.numero
            )
            
        else:
            # Devis normal - récupérer les données du chantier
            try:
                chantier = Chantier.objects.get(id=devis.chantier)
                chantier_name = chantier.chantier_name
                chantier_id = chantier.id
            except Chantier.DoesNotExist:
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
            
            # URL de prévisualisation
            preview_url = request.build_absolute_uri(f"/api/preview-saved-devis/{devis.id}/")
            
            # Générer le PDF avec le PDF Manager
            pdf_manager = PDFManager()
            success, message, s3_file_path, conflict_detected = pdf_manager.generate_andStore_pdf(
                document_type='devis_travaux',
                preview_url=preview_url,
                societe_name=societe_name,
                force_replace=True,  # Toujours remplacer pour les modifications
                devis_id=devis.id,
                chantier_id=chantier_id,
                chantier_name=chantier_name,
                numero=devis.numero
            )
        
        if success:
            response_data = {
                'success': True,
                'message': f'PDF du devis {devis.numero} régénéré et remplacé avec succès dans le Drive',
                'file_path': s3_file_path,
                'file_name': s3_file_path.split('/')[-1],
                'drive_url': f"/drive?path={s3_file_path}&sidebar=closed&focus=file",
                'redirect_to': f"/drive?path={s3_file_path}&sidebar=closed&focus=file",
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
            
            logger.info(f"PDF régénéré avec succès pour le devis {devis.id}: {s3_file_path}")
            return JsonResponse(response_data)
        else:
            logger.error(f"Erreur lors de la génération du PDF pour le devis {devis.id}: {message}")
            return JsonResponse({'success': False, 'error': message}, status=500)
            
    except Exception as e:
        error_msg = f'Erreur inattendue lors de la régénération du PDF: {str(e)}'
        logger.error(error_msg)
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
