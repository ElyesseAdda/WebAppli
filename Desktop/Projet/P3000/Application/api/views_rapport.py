import json
import os
import subprocess
import tempfile
import uuid
import base64
import traceback
from django.db.models import Count
from django.http import JsonResponse, HttpResponse
from rest_framework import viewsets, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from .models_rapport import TitreRapport, Residence, RapportIntervention, PrestationRapport, PhotoRapport
from .serializers_rapport import (
    TitreRapportSerializer,
    ResidenceSerializer,
    RapportInterventionSerializer,
    RapportInterventionListSerializer,
    RapportInterventionCreateSerializer,
    PrestationRapportSerializer,
    PrestationRapportWriteSerializer,
    PhotoRapportSerializer,
)


def _societe_pour_rapport(rapport):
    """Société client / bailleur : celle du rapport si renseignée, sinon celle du chantier."""
    if rapport.client_societe_id:
        return rapport.client_societe
    if rapport.chantier_id and rapport.chantier.societe_id:
        return rapport.chantier.societe
    return None


def _format_societe_adresse(societe):
    """Adresse postale depuis le modèle Societe : rue_societe, codepostal_societe, ville_societe."""
    if not societe:
        return ""
    rue = (getattr(societe, "rue_societe", None) or "").strip()
    cp = getattr(societe, "codepostal_societe", None)
    cp_str = str(cp).strip() if cp not in (None, "") else ""
    ville = (getattr(societe, "ville_societe", None) or "").strip()
    lines = []
    if rue:
        lines.append(rue)
    ligne2 = " ".join(p for p in (cp_str, ville) if p).strip()
    if ligne2:
        lines.append(ligne2)
    return "\n".join(lines)


class RapportInterventionPagination(PageNumberPagination):
    """Liste paginée : moins de données par requête, chargement plus rapide."""

    page_size = 30
    page_size_query_param = "page_size"
    max_page_size = 200


class TitreRapportViewSet(viewsets.ModelViewSet):
    queryset = TitreRapport.objects.all()
    serializer_class = TitreRapportSerializer
    permission_classes = [IsAuthenticated]


class ResidenceViewSet(viewsets.ModelViewSet):
    serializer_class = ResidenceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Residence.objects.select_related('client_societe', 'chantier')
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(nom__icontains=search)
        client_societe = self.request.query_params.get('client_societe')
        if client_societe:
            qs = qs.filter(client_societe_id=client_societe)
        chantier = self.request.query_params.get('chantier')
        if chantier:
            qs = qs.filter(chantier_id=chantier)
        return qs


class RapportInterventionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    pagination_class = RapportInterventionPagination

    def get_queryset(self):
        qs = RapportIntervention.objects.select_related(
            'titre', 'client_societe', 'chantier', 'residence', 'created_by'
        )
        action = getattr(self, 'action', None)
        # Liste : pas de prefetch photos (tres lourd) ; comptage en une requête
        if action == 'list':
            qs = qs.annotate(prestations_count=Count('prestations', distinct=True))
        else:
            qs = qs.prefetch_related('prestations__photos')

        chantier_id = self.request.query_params.get('chantier')
        if chantier_id:
            qs = qs.filter(chantier_id=chantier_id)

        technicien = self.request.query_params.get('technicien')
        if technicien:
            qs = qs.filter(technicien__icontains=technicien)

        client_societe_id = self.request.query_params.get('client_societe')
        if client_societe_id:
            qs = qs.filter(client_societe_id=client_societe_id)

        residence_id = self.request.query_params.get('residence')
        if residence_id:
            qs = qs.filter(residence_id=residence_id)

        logement = self.request.query_params.get('logement')
        if logement:
            qs = qs.filter(logement__icontains=logement)

        type_rapport = self.request.query_params.get('type_rapport')
        if type_rapport:
            qs = qs.filter(type_rapport=type_rapport)

        date_creation = self.request.query_params.get('date_creation')
        if date_creation:
            qs = qs.filter(created_at__date=date_creation)

        sans_chantier = self.request.query_params.get('sans_chantier', '').lower()
        if sans_chantier in ('1', 'true', 'yes'):
            qs = qs.filter(chantier__isnull=True)

        exclude_term = self.request.query_params.get('exclude_statut_termine', '').lower()
        if exclude_term in ('1', 'true', 'yes'):
            qs = qs.exclude(statut='termine')

        if action == 'list':
            ordering = (self.request.query_params.get('ordering') or '-date').strip()
            if ordering == 'date':
                qs = qs.order_by('date', 'id')
            elif ordering == '-date':
                qs = qs.order_by('-date', '-id')
            else:
                qs = qs.order_by('-date', '-id')

        return qs

    def get_serializer_class(self):
        if self.action == 'list':
            return RapportInterventionListSerializer
        if self.action in ['create', 'update', 'partial_update']:
            return RapportInterventionCreateSerializer
        return RapportInterventionSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def lier_chantier(self, request, pk=None):
        rapport = self.get_object()
        chantier_id = request.data.get('chantier_id')
        if not chantier_id:
            return Response({'error': 'chantier_id requis'}, status=status.HTTP_400_BAD_REQUEST)

        from .models import Chantier
        try:
            chantier = Chantier.objects.get(id=chantier_id)
        except Chantier.DoesNotExist:
            return Response({'error': 'Chantier introuvable'}, status=status.HTTP_404_NOT_FOUND)

        rapport.chantier = chantier
        rapport.save()
        serializer = RapportInterventionSerializer(rapport)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def upload_signature(self, request, pk=None):
        rapport = self.get_object()
        signature_data = request.data.get('signature')
        if not signature_data:
            return Response({'error': 'signature requise (base64)'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from .utils import get_s3_client, get_s3_bucket_name, is_s3_available, generate_presigned_url_for_display
            if not is_s3_available():
                return Response({'error': 'S3 non disponible'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

            if ',' in signature_data:
                signature_data = signature_data.split(',')[1]

            image_bytes = base64.b64decode(signature_data)
            s3_key = f"rapports_intervention/signatures/signature_{rapport.id}_{uuid.uuid4().hex[:8]}.png"

            s3_client = get_s3_client()
            bucket_name = get_s3_bucket_name()
            s3_client.put_object(
                Bucket=bucket_name,
                Key=s3_key,
                Body=image_bytes,
                ContentType='image/png'
            )

            rapport.signature_s3_key = s3_key
            rapport.save()

            return Response({
                'success': True,
                's3_key': s3_key,
                'signature_url': generate_presigned_url_for_display(s3_key),
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def upload_photo(self, request):
        prestation_id = request.data.get('prestation_id')
        type_photo = request.data.get('type_photo', 'avant')
        date_photo = request.data.get('date_photo')
        file = request.FILES.get('photo')

        if not prestation_id or not file:
            return Response(
                {'error': 'prestation_id et photo requis'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            prestation = PrestationRapport.objects.get(id=prestation_id)
        except PrestationRapport.DoesNotExist:
            return Response({'error': 'Prestation introuvable'}, status=status.HTTP_404_NOT_FOUND)

        try:
            from .utils import get_s3_client, get_s3_bucket_name, is_s3_available, generate_presigned_url_for_display
            if not is_s3_available():
                return Response({'error': 'S3 non disponible'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

            ext = file.name.split('.')[-1] if '.' in file.name else 'jpg'
            s3_key = f"rapports_intervention/photos/rapport_{prestation.rapport_id}/prestation_{prestation_id}/{type_photo}_{uuid.uuid4().hex[:8]}.{ext}"

            s3_client = get_s3_client()
            bucket_name = get_s3_bucket_name()
            s3_client.put_object(
                Bucket=bucket_name,
                Key=s3_key,
                Body=file.read(),
                ContentType=file.content_type or 'image/jpeg'
            )

            nb_photos = PhotoRapport.objects.filter(prestation=prestation, type_photo=type_photo).count()
            create_kwargs = dict(
                prestation=prestation,
                s3_key=s3_key,
                filename=file.name,
                type_photo=type_photo,
                ordre=nb_photos,
            )
            if date_photo:
                create_kwargs['date_photo'] = date_photo
            photo = PhotoRapport.objects.create(**create_kwargs)

            return Response({
                'success': True,
                'photo': PhotoRapportSerializer(photo).data,
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['patch'], url_path='update_photo/(?P<photo_id>[0-9]+)')
    def update_photo(self, request, photo_id=None):
        try:
            photo = PhotoRapport.objects.get(id=photo_id)
        except PhotoRapport.DoesNotExist:
            return Response({'error': 'Photo introuvable'}, status=status.HTTP_404_NOT_FOUND)

        date_photo = request.data.get('date_photo')
        if date_photo:
            photo.date_photo = date_photo

        type_photo = request.data.get('type_photo')
        if type_photo:
            photo.type_photo = type_photo

        photo.save()
        return Response({'success': True, 'photo': PhotoRapportSerializer(photo).data})

    @action(detail=False, methods=['delete'], url_path='delete_photo/(?P<photo_id>[0-9]+)')
    def delete_photo(self, request, photo_id=None):
        try:
            photo = PhotoRapport.objects.get(id=photo_id)
        except PhotoRapport.DoesNotExist:
            return Response({'error': 'Photo introuvable'}, status=status.HTTP_404_NOT_FOUND)

        try:
            from .utils import get_s3_client, get_s3_bucket_name, is_s3_available
            if is_s3_available() and photo.s3_key:
                s3_client = get_s3_client()
                bucket_name = get_s3_bucket_name()
                s3_client.delete_object(Bucket=bucket_name, Key=photo.s3_key)
        except Exception:
            pass

        photo.delete()
        return Response({'success': True}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def upload_photo_platine(self, request):
        """Upload de la photo platine pour un rapport Vigik+."""
        rapport_id = request.data.get('rapport_id')
        file = request.FILES.get('photo')
        if not rapport_id or not file:
            return Response(
                {'error': 'rapport_id et photo requis'},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            rapport = RapportIntervention.objects.get(id=rapport_id)
        except RapportIntervention.DoesNotExist:
            return Response({'error': 'Rapport introuvable'}, status=status.HTTP_404_NOT_FOUND)
        try:
            from .utils import get_s3_client, get_s3_bucket_name, is_s3_available, generate_presigned_url_for_display
            if not is_s3_available():
                return Response({'error': 'S3 non disponible'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            ext = file.name.split('.')[-1] if '.' in file.name else 'jpg'
            s3_key = f"rapports_intervention/vigik_platine/rapport_{rapport_id}_{uuid.uuid4().hex[:8]}.{ext}"
            s3_client = get_s3_client()
            bucket_name = get_s3_bucket_name()
            if rapport.photo_platine_s3_key and is_s3_available():
                try:
                    s3_client.delete_object(Bucket=bucket_name, Key=rapport.photo_platine_s3_key)
                except Exception:
                    pass
            s3_client.put_object(
                Bucket=bucket_name,
                Key=s3_key,
                Body=file.read(),
                ContentType=file.content_type or 'image/jpeg'
            )
            rapport.photo_platine_s3_key = s3_key
            rapport.save()
            return Response({
                'success': True,
                's3_key': s3_key,
                'photo_platine_url': generate_presigned_url_for_display(s3_key),
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def upload_photo_platine_portail(self, request):
        """Upload de la photo platine portail pour un rapport Vigik+ (2e question)."""
        rapport_id = request.data.get('rapport_id')
        file = request.FILES.get('photo')
        if not rapport_id or not file:
            return Response(
                {'error': 'rapport_id et photo requis'},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            rapport = RapportIntervention.objects.get(id=rapport_id)
        except RapportIntervention.DoesNotExist:
            return Response({'error': 'Rapport introuvable'}, status=status.HTTP_404_NOT_FOUND)
        try:
            from .utils import get_s3_client, get_s3_bucket_name, is_s3_available, generate_presigned_url_for_display
            if not is_s3_available():
                return Response({'error': 'S3 non disponible'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            ext = file.name.split('.')[-1] if '.' in file.name else 'jpg'
            s3_key = f"rapports_intervention/vigik_platine_portail/rapport_{rapport_id}_{uuid.uuid4().hex[:8]}.{ext}"
            s3_client = get_s3_client()
            bucket_name = get_s3_bucket_name()
            if getattr(rapport, 'photo_platine_portail_s3_key', None) and is_s3_available():
                try:
                    s3_client.delete_object(Bucket=bucket_name, Key=rapport.photo_platine_portail_s3_key)
                except Exception:
                    pass
            s3_client.put_object(
                Bucket=bucket_name,
                Key=s3_key,
                Body=file.read(),
                ContentType=file.content_type or 'image/jpeg'
            )
            rapport.photo_platine_portail_s3_key = s3_key
            rapport.save()
            return Response({
                'success': True,
                's3_key': s3_key,
                'photo_platine_portail_url': generate_presigned_url_for_display(s3_key),
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def valider(self, request, pk=None):
        rapport = self.get_object()
        rapport.statut = 'termine'
        rapport.save()

        pdf_result = _generate_rapport_pdf(rapport, request)
        if pdf_result.get('success'):
            rapport.pdf_s3_key = pdf_result.get('s3_file_path', '')
            rapport.save()

        serializer = RapportInterventionSerializer(rapport)
        return Response({
            'rapport': serializer.data,
            'pdf': pdf_result,
        })

    @action(detail=True, methods=['post'])
    def generer_pdf(self, request, pk=None):
        rapport = self.get_object()
        pdf_result = _generate_rapport_pdf(rapport, request)
        if pdf_result.get('success'):
            rapport.pdf_s3_key = pdf_result.get('s3_file_path', '')
            rapport.save()
        return Response(pdf_result)


def _generate_rapport_pdf(rapport, request):
    """Genere le PDF du rapport via Puppeteer et le stocke dans S3.
    - Si le rapport est lie a un chantier : Chemin du chantier / dossier RAPPORT
    - Sinon : Racine du drive / dossier RAPPORT D'INTERVENTIONS
    - A la regeneration : remplace le document existant (force_replace)
    """
    try:
        from .pdf_manager import PDFManager
        from .utils import create_s3_folder_recursive
        from .utils import get_s3_client, get_s3_bucket_name, is_s3_available

        pdf_manager = PDFManager()
        preview_url = request.build_absolute_uri(
            f"/api/preview-rapport-intervention/{rapport.id}/"
        )

        societe_name = rapport.client_societe.nom_societe if rapport.client_societe else "Sans_Societe"
        safe = lambda s: "".join(c for c in (s or "") if c.isalnum() or c in " -_(),.'").strip() or "N-A"

        if rapport.type_rapport == 'vigik_plus':
            # Vigik+ : adresse propre au rapport (adresse_vigik), pas celle de la résidence
            residence_nom = (rapport.residence.nom if rapport.residence and rapport.residence.nom else "Sans residence").strip()
            adresse = (getattr(rapport, 'adresse_vigik', None) or "").strip()
            if not adresse and rapport.residence and rapport.residence.adresse:
                adresse = rapport.residence.adresse.strip()
            numero_batiment = (getattr(rapport, 'numero_batiment', None) or "").strip()
            custom_path = f"RAPPORT D'INTERVENTION/VIGIK+/{safe(residence_nom)}"
            custom_filename = f"Vigik+ {safe(adresse)} {safe(numero_batiment)}.pdf"
        else:
            # Chemin : chantier lie -> Chantiers/{path}/RAPPORT ; sinon -> RAPPORT D'INTERVENTIONS (racine)
            custom_path = ""
            if rapport.chantier:
                base_path = rapport.chantier.get_drive_path()
                if base_path:
                    custom_path = f"Chantiers/{base_path.strip('/')}/RAPPORT"

            if not custom_path:
                custom_path = "RAPPORT D'INTERVENTIONS"

            residence_nom = (rapport.residence.nom if rapport.residence and rapport.residence.nom else "Sans residence").strip()
            logement = (rapport.logement or "").strip() or "Sans logement"
            residence_nom = safe(residence_nom)
            logement = safe(logement)
            custom_filename = f"Rapport ({residence_nom}) {logement}.pdf"

        create_s3_folder_recursive(custom_path)
        filename = custom_filename

        pdf_kwargs = {
            'custom_path': custom_path,
            'custom_filename': filename,
        }
        if rapport.type_rapport == 'vigik_plus':
            pdf_kwargs['custom_path_is_full'] = True  # pas de sous-dossier RAPPORT_INTERVENTION
        success, message, s3_path, conflict = pdf_manager.generate_andStore_pdf(
            document_type='rapport_intervention',
            preview_url=preview_url,
            societe_name=societe_name,
            force_replace=True,
            **pdf_kwargs,
        )

        if success:
            # Supprimer l'ancien fichier si le chemin a change (ex: chantier ajoute/modifie)
            old_key = getattr(rapport, 'pdf_s3_key', None) or ""
            if old_key and old_key != s3_path and is_s3_available():
                try:
                    s3_client = get_s3_client()
                    bucket = get_s3_bucket_name()
                    s3_client.delete_object(Bucket=bucket, Key=old_key)
                except Exception:
                    pass

            return {
                'success': True,
                'message': 'PDF genere avec succes',
                's3_file_path': s3_path,
                'drive_url': f"/drive-v2?path={s3_path}&focus=file",
            }
        else:
            return {'success': False, 'error': message}
    except Exception as e:
        return {'success': False, 'error': str(e)}


@api_view(['GET'])
@permission_classes([AllowAny])
def preview_rapport_intervention(request, rapport_id):
    """Vue de previsualisation HTML pour la generation PDF via Puppeteer."""
    try:
        rapport = RapportIntervention.objects.select_related(
            'titre', 'client_societe', 'chantier', 'chantier__societe', 'residence'
        ).prefetch_related('prestations__photos').get(id=rapport_id)
    except RapportIntervention.DoesNotExist:
        return JsonResponse({'error': 'Rapport introuvable'}, status=404)

    from .utils import generate_presigned_url_for_display

    logo_url = ""
    logo_s3_key = None
    if rapport.client_societe and rapport.client_societe.logo_s3_key:
        logo_s3_key = rapport.client_societe.logo_s3_key
    elif rapport.chantier and rapport.chantier.societe and rapport.chantier.societe.logo_s3_key:
        logo_s3_key = rapport.chantier.societe.logo_s3_key
    if logo_s3_key:
        try:
            logo_url = generate_presigned_url_for_display(logo_s3_key)
        except Exception:
            pass

    signature_url = ""
    if rapport.signature_s3_key:
        try:
            signature_url = generate_presigned_url_for_display(rapport.signature_s3_key)
        except Exception:
            pass

    prestations_data = []
    for prestation in rapport.prestations.all():
        photos_by_type = {'avant': [], 'en_cours': [], 'apres': []}
        for photo in prestation.photos.all():
            try:
                url = generate_presigned_url_for_display(photo.s3_key)
                photos_by_type[photo.type_photo].append({
                    'url': url,
                    'filename': photo.filename,
                    'date_photo': photo.date_photo,
                })
            except Exception:
                pass
        prestations_data.append({
            'prestation': prestation,
            'photos_by_type': photos_by_type,
        })

    societe = _societe_pour_rapport(rapport)
    societe_nom = societe.nom_societe if societe else ""
    societe_adresse = _format_societe_adresse(societe)

    photo_platine_url = ""
    photo_platine_portail_url = ""
    if rapport.type_rapport == 'vigik_plus':
        if rapport.photo_platine_s3_key:
            try:
                photo_platine_url = generate_presigned_url_for_display(rapport.photo_platine_s3_key)
            except Exception:
                pass
        if getattr(rapport, 'photo_platine_portail_s3_key', None):
            try:
                photo_platine_portail_url = generate_presigned_url_for_display(rapport.photo_platine_portail_s3_key)
            except Exception:
                pass

    from django.shortcuts import render
    if rapport.type_rapport == 'vigik_plus':
        return render(request, 'rapport_vigik_plus.html', {
            'rapport': rapport,
            'logo_url': logo_url,
            'societe_nom': societe_nom,
            'societe_adresse': societe_adresse,
            'signature_url': signature_url,
            'photo_platine_url': photo_platine_url,
            'photo_platine_portail_url': photo_platine_portail_url,
        })
    return render(request, 'rapport_intervention.html', {
        'rapport': rapport,
        'logo_url': logo_url,
        'societe_nom': societe_nom,
        'societe_adresse': societe_adresse,
        'signature_url': signature_url,
        'prestations_data': prestations_data,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_rapport_intervention_pdf(request):
    """Génère le PDF du rapport d'intervention et le renvoie en téléchargement (navigateur)."""
    temp_pdf_path = None
    try:
        data = json.loads(request.body)
        rapport_id = data.get('rapport_id')
        if not rapport_id:
            return JsonResponse({'error': 'ID du rapport manquant'}, status=400)

        preview_url = request.build_absolute_uri(f"/api/preview-rapport-intervention/{rapport_id}/")
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        node_script_path = os.path.join(base_dir, 'frontend', 'src', 'components', 'generate_pdf.js')

        if not os.path.exists(node_script_path):
            return JsonResponse({'error': f'Script Node.js introuvable: {node_script_path}'}, status=500)

        node_paths = ['node', '/usr/bin/node', '/usr/local/bin/node', '/opt/nodejs/bin/node']
        node_path = 'node'
        for np in node_paths:
            try:
                subprocess.run([np, '--version'], check=True, capture_output=True, text=True)
                node_path = np
                break
            except (subprocess.CalledProcessError, FileNotFoundError):
                continue

        temp_pdf = tempfile.NamedTemporaryFile(suffix='.pdf', delete=False)
        temp_pdf_path = temp_pdf.name
        temp_pdf.close()

        command = [node_path, node_script_path, preview_url, temp_pdf_path]
        subprocess.run(command, check=True, capture_output=True, text=True, timeout=60)

        if not os.path.exists(temp_pdf_path):
            return JsonResponse({'error': 'Le fichier PDF n\'a pas été généré.'}, status=500)

        # Même format que le Drive : Rapport (résidence) logement.pdf
        rapport = RapportIntervention.objects.select_related('residence').get(pk=rapport_id)
        residence_nom = (rapport.residence.nom if rapport.residence and rapport.residence.nom else "Sans residence").strip()
        logement = (rapport.logement or "").strip() or "Sans logement"
        safe = lambda s: "".join(c for c in s if c.isalnum() or c in " -_(),.'").strip() or "N-A"
        residence_nom = safe(residence_nom)
        logement = safe(logement)
        filename = f"Rapport ({residence_nom}) {logement}.pdf"

        with open(temp_pdf_path, 'rb') as pdf_file:
            response = HttpResponse(pdf_file.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Données JSON invalides'}, status=400)
    except subprocess.CalledProcessError as e:
        return JsonResponse({'error': f'Erreur génération PDF: {e.stderr or str(e)}'}, status=500)
    except subprocess.TimeoutExpired:
        return JsonResponse({'error': 'Timeout lors de la génération du PDF (60 s)'}, status=500)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
    finally:
        if temp_pdf_path and os.path.exists(temp_pdf_path):
            try:
                os.unlink(temp_pdf_path)
            except OSError:
                pass


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def generate_rapport_intervention_pdf_drive(request):
    """Régénère le PDF du rapport d'intervention et le stocke dans le Drive (S3)."""
    rapport_id = request.query_params.get('rapport_id')
    if not rapport_id:
        return JsonResponse({'error': 'rapport_id requis'}, status=400)
    try:
        rapport = RapportIntervention.objects.select_related('chantier', 'residence', 'client_societe').get(pk=rapport_id)
    except RapportIntervention.DoesNotExist:
        return JsonResponse({'error': 'Rapport introuvable'}, status=404)
    pdf_result = _generate_rapport_pdf(rapport, request)
    if pdf_result.get('success'):
        rapport.pdf_s3_key = pdf_result.get('s3_file_path', '')
        rapport.save()
    status_code = 200 if pdf_result.get('success') else 400
    return JsonResponse(pdf_result, status=status_code)
