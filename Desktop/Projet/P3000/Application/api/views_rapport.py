"""Vues DRF pour la fonctionnalité « Rapport d'intervention / Vigik+ »."""

import base64
import json
import os
import subprocess
import tempfile
import traceback
import uuid

from django.db import transaction
from django.db.models import Count
from django.http import HttpResponse, JsonResponse
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models_rapport import (
    PhotoRapport,
    PrestationRapport,
    RapportIntervention,
    RapportInterventionBrouillon,
    Residence,
    TitreRapport,
    assign_numero_rapport_si_absent,
)
from .rapport_brouillon_media import (
    collect_s3_keys_from_draft_media,
    delete_s3_keys,
    transfer_brouillon_media_to_rapport,
)
from .serializers_rapport import (
    PhotoRapportSerializer,
    RapportInterventionBrouillonListSerializer,
    RapportInterventionBrouillonSerializer,
    RapportInterventionCreateSerializer,
    RapportInterventionListSerializer,
    RapportInterventionSerializer,
    ResidenceSerializer,
    TitreRapportSerializer,
)


def _societe_pour_rapport(rapport):
    """Société client / bailleur : celle du rapport si renseignée, sinon celle du chantier."""
    if rapport.client_societe_id:
        return rapport.client_societe
    if rapport.chantier_id and rapport.chantier.societe_id:
        return rapport.chantier.societe
    return None


def _intervention_date_rows_for_template(rapport):
    """Lignes Date / Passage 2 / Passage 3 pour les templates PDF (jj/mm/aaaa)."""
    from datetime import datetime

    rows = []
    raw = getattr(rapport, 'dates_intervention', None) or []
    if isinstance(raw, list) and raw:
        for i, ds in enumerate(raw):
            if not ds:
                continue
            s = str(ds).strip()[:10]
            try:
                dt = datetime.strptime(s, '%Y-%m-%d').date()
                formatted = dt.strftime('%d/%m/%Y')
            except ValueError:
                formatted = s
            if i == 0:
                label = 'Date'
            else:
                label = f'Passage {i + 1}'
            rows.append({'label': label, 'value': formatted})
    if not rows and getattr(rapport, 'date', None):
        rows.append({
            'label': 'Date',
            'value': rapport.date.strftime('%d/%m/%Y'),
        })
    return rows


def _format_societe_adresse(societe):
    """Adresse postale depuis ``Societe`` : rue, code postal, ville."""
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


def _format_heures_hhmm(value):
    """Convertit un nombre d'heures (float) en format ``h:mm``."""
    try:
        total_minutes = int(round(float(value or 0) * 60))
    except (TypeError, ValueError):
        total_minutes = 0
    if total_minutes < 0:
        total_minutes = 0
    heures = total_minutes // 60
    minutes = total_minutes % 60
    return f"{heures}:{minutes:02d}"


def _build_temps_intervention_for_template(rapport):
    """Prépare les temps (trajet, tâches, prestation) formatés pour le template PDF."""
    try:
        temps_trajet = float(getattr(rapport, 'temps_trajet', 0) or 0)
    except (TypeError, ValueError):
        temps_trajet = 0.0
    try:
        temps_taches = float(getattr(rapport, 'temps_taches', 0) or 0)
    except (TypeError, ValueError):
        temps_taches = 0.0

    temps_trajet = max(0.0, temps_trajet)
    temps_taches = max(0.0, temps_taches)
    total = temps_trajet + temps_taches

    return {
        'has_temps_intervention': total > 0,
        'temps_trajet_hhmm': _format_heures_hhmm(temps_trajet),
        'temps_taches_hhmm': _format_heures_hhmm(temps_taches),
        'temps_prestation_hhmm': _format_heures_hhmm(total),
    }


class RapportInterventionPagination(PageNumberPagination):
    """Pagination de la liste : moins de données par requête, chargement plus rapide."""

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
            'titre', 'client_societe', 'chantier', 'residence', 'created_by',
        )
        action_ = getattr(self, 'action', None)
        if action_ == 'list':
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

        devis_a_faire = self.request.query_params.get('devis_a_faire')
        if devis_a_faire is not None and str(devis_a_faire).strip() != '':
            val = str(devis_a_faire).strip().lower()
            qs = qs.filter(devis_a_faire=val in ('1', 'true', 'yes'))

        devis_fait = self.request.query_params.get('devis_fait')
        if devis_fait is not None and str(devis_fait).strip() != '':
            val = str(devis_fait).strip().lower()
            qs = qs.filter(devis_fait=val in ('1', 'true', 'yes'))

        date_creation = self.request.query_params.get('date_creation')
        if date_creation:
            qs = qs.filter(created_at__date=date_creation)

        sans_chantier = self.request.query_params.get('sans_chantier', '').lower()
        if sans_chantier in ('1', 'true', 'yes'):
            qs = qs.filter(chantier__isnull=True)

        exclude_term = self.request.query_params.get('exclude_statut_termine', '').lower()
        if exclude_term in ('1', 'true', 'yes'):
            qs = qs.exclude(statut='termine')

        only_term = self.request.query_params.get('only_statut_termine', '').lower()
        if only_term in ('1', 'true', 'yes'):
            qs = qs.filter(statut='termine')

        if action_ == 'list':
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
        assign_numero_rapport_si_absent(serializer.instance)

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
            return Response(
                {'error': 'signature requise (base64)'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            from .utils import (
                generate_presigned_url_for_display,
                get_s3_bucket_name,
                get_s3_client,
                is_s3_available,
            )

            if not is_s3_available():
                return Response(
                    {'error': 'S3 non disponible'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )

            if ',' in signature_data:
                signature_data = signature_data.split(',')[1]

            image_bytes = base64.b64decode(signature_data)
            s3_key = (
                f"rapports_intervention/signatures/"
                f"signature_{rapport.id}_{uuid.uuid4().hex[:8]}.png"
            )

            s3_client = get_s3_client()
            bucket_name = get_s3_bucket_name()
            s3_client.put_object(
                Bucket=bucket_name,
                Key=s3_key,
                Body=image_bytes,
                ContentType='image/png',
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
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            prestation = PrestationRapport.objects.get(id=prestation_id)
        except PrestationRapport.DoesNotExist:
            return Response({'error': 'Prestation introuvable'}, status=status.HTTP_404_NOT_FOUND)

        try:
            from .utils import (
                get_s3_bucket_name,
                get_s3_client,
                is_s3_available,
            )

            if not is_s3_available():
                return Response(
                    {'error': 'S3 non disponible'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )

            ext = file.name.split('.')[-1] if '.' in file.name else 'jpg'
            s3_key = (
                f"rapports_intervention/photos/"
                f"rapport_{prestation.rapport_id}/prestation_{prestation_id}/"
                f"{type_photo}_{uuid.uuid4().hex[:8]}.{ext}"
            )

            s3_client = get_s3_client()
            bucket_name = get_s3_bucket_name()
            s3_client.put_object(
                Bucket=bucket_name,
                Key=s3_key,
                Body=file.read(),
                ContentType=file.content_type or 'image/jpeg',
            )

            nb_photos = PhotoRapport.objects.filter(
                prestation=prestation, type_photo=type_photo
            ).count()
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

            return Response(
                {'success': True, 'photo': PhotoRapportSerializer(photo).data},
                status=status.HTTP_201_CREATED,
            )
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
            from .utils import get_s3_bucket_name, get_s3_client, is_s3_available

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
        """Ajoute une photo platine (Vigik+) — plusieurs fichiers possibles."""
        rapport_id = request.data.get('rapport_id')
        file = request.FILES.get('photo')
        if not rapport_id or not file:
            return Response(
                {'error': 'rapport_id et photo requis'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            from .utils import (
                generate_presigned_url_for_display,
                get_s3_bucket_name,
                get_s3_client,
                is_s3_available,
            )

            if not is_s3_available():
                return Response(
                    {'error': 'S3 non disponible'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
            ext = file.name.split('.')[-1] if '.' in file.name else 'jpg'
            s3_key = (
                f"rapports_intervention/vigik_platine/"
                f"rapport_{rapport_id}_{uuid.uuid4().hex[:8]}.{ext}"
            )
            s3_client = get_s3_client()
            bucket_name = get_s3_bucket_name()
            s3_client.put_object(
                Bucket=bucket_name,
                Key=s3_key,
                Body=file.read(),
                ContentType=file.content_type or 'image/jpeg',
            )
            with transaction.atomic():
                try:
                    rapport = RapportIntervention.objects.select_for_update().get(id=rapport_id)
                except RapportIntervention.DoesNotExist:
                    return Response({'error': 'Rapport introuvable'}, status=status.HTTP_404_NOT_FOUND)
                keys = list(rapport.photos_platine_s3_keys or [])
                keys.append(s3_key)
                rapport.photos_platine_s3_keys = keys
                rapport.save(update_fields=['photos_platine_s3_keys', 'updated_at'])
            url = generate_presigned_url_for_display(s3_key)
            return Response(
                {
                    'success': True,
                    's3_key': s3_key,
                    'url': url,
                    'presigned_url': url,
                    'photo_platine_url': url,
                    'item': {'s3_key': s3_key, 'url': url, 'question': 'platine'},
                    'photos_platine_s3_keys': keys,
                    'media_version': str(getattr(rapport, 'updated_at', '') or ''),
                },
                status=status.HTTP_201_CREATED,
            )
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def upload_photo_platine_portail(self, request):
        """Ajoute une photo platine portail (Vigik+) — plusieurs fichiers possibles."""
        rapport_id = request.data.get('rapport_id')
        file = request.FILES.get('photo')
        if not rapport_id or not file:
            return Response(
                {'error': 'rapport_id et photo requis'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            from .utils import (
                generate_presigned_url_for_display,
                get_s3_bucket_name,
                get_s3_client,
                is_s3_available,
            )

            if not is_s3_available():
                return Response(
                    {'error': 'S3 non disponible'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
            ext = file.name.split('.')[-1] if '.' in file.name else 'jpg'
            s3_key = (
                f"rapports_intervention/vigik_platine_portail/"
                f"rapport_{rapport_id}_{uuid.uuid4().hex[:8]}.{ext}"
            )
            s3_client = get_s3_client()
            bucket_name = get_s3_bucket_name()
            s3_client.put_object(
                Bucket=bucket_name,
                Key=s3_key,
                Body=file.read(),
                ContentType=file.content_type or 'image/jpeg',
            )
            with transaction.atomic():
                try:
                    rapport = RapportIntervention.objects.select_for_update().get(id=rapport_id)
                except RapportIntervention.DoesNotExist:
                    return Response({'error': 'Rapport introuvable'}, status=status.HTTP_404_NOT_FOUND)
                keys = list(rapport.photos_platine_portail_s3_keys or [])
                keys.append(s3_key)
                rapport.photos_platine_portail_s3_keys = keys
                rapport.save(update_fields=['photos_platine_portail_s3_keys', 'updated_at'])
            url = generate_presigned_url_for_display(s3_key)
            return Response(
                {
                    'success': True,
                    's3_key': s3_key,
                    'url': url,
                    'presigned_url': url,
                    'photo_platine_portail_url': url,
                    'item': {'s3_key': s3_key, 'url': url, 'question': 'portail'},
                    'photos_platine_portail_s3_keys': keys,
                    'media_version': str(getattr(rapport, 'updated_at', '') or ''),
                },
                status=status.HTTP_201_CREATED,
            )
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def delete_photo_vigik(self, request):
        """Retire une photo Vigik+ (platine ou portail) du rapport et supprime l'objet S3."""
        rapport_id = request.data.get('rapport_id')
        s3_key = (request.data.get('s3_key') or '').strip()
        question = (request.data.get('question') or '').strip().lower()
        if not rapport_id or not s3_key or question not in ('platine', 'portail'):
            return Response(
                {'error': 'rapport_id, s3_key et question (platine|portail) requis'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            rapport = RapportIntervention.objects.get(id=rapport_id)
        except RapportIntervention.DoesNotExist:
            return Response({'error': 'Rapport introuvable'}, status=status.HTTP_404_NOT_FOUND)
        try:
            from .utils import get_s3_bucket_name, get_s3_client, is_s3_available

            attr = (
                'photos_platine_s3_keys'
                if question == 'platine'
                else 'photos_platine_portail_s3_keys'
            )
            with transaction.atomic():
                rapport = RapportIntervention.objects.select_for_update().get(id=rapport.id)
                keys = list(getattr(rapport, attr) or [])
                if s3_key not in keys:
                    return Response({'error': 'Clé absente du rapport'}, status=status.HTTP_404_NOT_FOUND)
                keys = [k for k in keys if k != s3_key]
                setattr(rapport, attr, keys)
                rapport.save(update_fields=[attr, 'updated_at'])
            if is_s3_available():
                try:
                    get_s3_client().delete_object(Bucket=get_s3_bucket_name(), Key=s3_key)
                except Exception:
                    pass
            return Response({
                'success': True,
                attr: keys,
                'question': question,
                's3_key': s3_key,
                'media_version': str(getattr(rapport, 'updated_at', '') or ''),
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def valider(self, request, pk=None):
        rapport = self.get_object()
        rapport.statut = 'en_cours'
        rapport.save()

        pdf_result = _generate_rapport_pdf(rapport, request)
        if pdf_result.get('success'):
            rapport.pdf_s3_key = pdf_result.get('s3_file_path', '')
            rapport.save()

        serializer = RapportInterventionSerializer(rapport)
        return Response({'rapport': serializer.data, 'pdf': pdf_result})

    @action(detail=True, methods=['post'])
    def generer_pdf(self, request, pk=None):
        rapport = self.get_object()
        pdf_result = _generate_rapport_pdf(rapport, request)
        if pdf_result.get('success'):
            rapport.pdf_s3_key = pdf_result.get('s3_file_path', '')
            rapport.save()
        return Response(pdf_result)


def _generate_rapport_pdf(rapport, request):
    """Génère le PDF du rapport via Puppeteer et le stocke dans S3.

    - Si le rapport est lié à un chantier : ``Chantiers/<drive>/RAPPORT``.
    - Sinon : ``RAPPORT D'INTERVENTIONS`` (racine du drive).
    - Vigik+ : ``RAPPORT D'INTERVENTION/VIGIK+/<residence>``.
    - À la régénération : remplace le document existant (``force_replace=True``).
    """
    try:
        from .pdf_manager import PDFManager
        from .utils import (
            create_s3_folder_recursive,
            get_s3_bucket_name,
            get_s3_client,
            is_s3_available,
        )

        pdf_manager = PDFManager()
        preview_url = request.build_absolute_uri(
            f"/api/preview-rapport-intervention/{rapport.id}/"
        )

        societe_name = (
            rapport.client_societe.nom_societe if rapport.client_societe else "Sans_Societe"
        )

        def safe(s):
            return (
                "".join(c for c in (s or "") if c.isalnum() or c in " -_(),.'")
                .strip()
                or "N-A"
            )

        if rapport.type_rapport == 'vigik_plus':
            residence_nom = (
                rapport.residence.nom
                if rapport.residence and rapport.residence.nom
                else "Sans residence"
            ).strip()
            adresse = (getattr(rapport, 'adresse_vigik', None) or "").strip()
            if not adresse and rapport.residence and rapport.residence.adresse:
                adresse = rapport.residence.adresse.strip()
            numero_batiment = (getattr(rapport, 'numero_batiment', None) or "").strip()
            custom_path = f"RAPPORT D'INTERVENTION/VIGIK+/{safe(residence_nom)}"
            custom_filename = (
                f"Vigik+ {safe(adresse)} {safe(numero_batiment)}.pdf"
            )
        else:
            custom_path = ""
            if rapport.chantier:
                base_path = rapport.chantier.get_drive_path()
                if base_path:
                    custom_path = f"Chantiers/{base_path.strip('/')}/RAPPORT"

            if not custom_path:
                custom_path = "RAPPORT D'INTERVENTIONS"

            residence_nom = (
                rapport.residence.nom
                if rapport.residence and rapport.residence.nom
                else "Sans residence"
            ).strip()
            logement = (rapport.logement or "").strip() or "Sans logement"
            residence_nom = safe(residence_nom)
            logement = safe(logement)
            custom_filename = f"Rapport ({residence_nom}) {logement}.pdf"

        create_s3_folder_recursive(custom_path)

        pdf_kwargs = {
            'custom_path': custom_path,
            'custom_filename': custom_filename,
            'custom_path_is_full': True,
        }
        success, message, s3_path, _conflict = pdf_manager.generate_andStore_pdf(
            document_type='rapport_intervention',
            preview_url=preview_url,
            societe_name=societe_name,
            force_replace=True,
            **pdf_kwargs,
        )

        if success:
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
                'message': 'PDF généré avec succès',
                's3_file_path': s3_path,
                'drive_url': f"/drive-v2?path={s3_path}&focus=file",
            }
        return {'success': False, 'error': message}
    except Exception as e:
        return {'success': False, 'error': str(e)}


@api_view(['GET'])
@permission_classes([AllowAny])
def preview_rapport_intervention(request, rapport_id):
    """Vue de prévisualisation HTML pour la génération PDF via Puppeteer."""
    try:
        rapport = RapportIntervention.objects.select_related(
            'titre', 'client_societe', 'chantier', 'chantier__societe', 'residence',
        ).prefetch_related('prestations__photos').get(id=rapport_id)
    except RapportIntervention.DoesNotExist:
        return JsonResponse({'error': 'Rapport introuvable'}, status=404)

    assign_numero_rapport_si_absent(rapport)
    rapport.refresh_from_db(fields=['numero_rapport', 'annee_numero_rapport'])

    from .utils import generate_presigned_url_for_display

    logo_url = ""
    logo_s3_key = None
    if rapport.client_societe and rapport.client_societe.logo_s3_key:
        logo_s3_key = rapport.client_societe.logo_s3_key
    elif (
        rapport.chantier
        and rapport.chantier.societe
        and rapport.chantier.societe.logo_s3_key
    ):
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
    intervention_date_rows = _intervention_date_rows_for_template(rapport)
    temps_ctx = _build_temps_intervention_for_template(rapport)

    photo_platine_urls = []
    photo_platine_portail_urls = []
    if rapport.type_rapport == 'vigik_plus':
        for k in rapport.photos_platine_s3_keys or []:
            if not k:
                continue
            try:
                photo_platine_urls.append(generate_presigned_url_for_display(k))
            except Exception:
                pass
        for k in rapport.photos_platine_portail_s3_keys or []:
            if not k:
                continue
            try:
                photo_platine_portail_urls.append(generate_presigned_url_for_display(k))
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
            'photo_platine_urls': photo_platine_urls,
            'photo_platine_portail_urls': photo_platine_portail_urls,
            'intervention_date_rows': intervention_date_rows,
        })
    return render(request, 'rapport_intervention.html', {
        'rapport': rapport,
        'logo_url': logo_url,
        'societe_nom': societe_nom,
        'societe_adresse': societe_adresse,
        'signature_url': signature_url,
        'prestations_data': prestations_data,
        'intervention_date_rows': intervention_date_rows,
        **temps_ctx,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_rapport_intervention_pdf(request):
    """Génère le PDF du rapport d'intervention et le renvoie en téléchargement."""
    temp_pdf_path = None
    try:
        data = json.loads(request.body)
        rapport_id = data.get('rapport_id')
        if not rapport_id:
            return JsonResponse({'error': 'ID du rapport manquant'}, status=400)

        preview_url = request.build_absolute_uri(
            f"/api/preview-rapport-intervention/{rapport_id}/"
        )
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        node_script_path = os.path.join(
            base_dir, 'frontend', 'src', 'components', 'generate_pdf.js'
        )

        if not os.path.exists(node_script_path):
            return JsonResponse(
                {'error': f'Script Node.js introuvable: {node_script_path}'}, status=500
            )

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
            return JsonResponse(
                {'error': "Le fichier PDF n'a pas été généré."}, status=500
            )

        rapport = RapportIntervention.objects.select_related('residence').get(pk=rapport_id)
        residence_nom = (
            rapport.residence.nom
            if rapport.residence and rapport.residence.nom
            else "Sans residence"
        ).strip()
        logement = (rapport.logement or "").strip() or "Sans logement"

        def safe(s):
            return (
                "".join(c for c in s if c.isalnum() or c in " -_(),.'")
                .strip()
                or "N-A"
            )

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
        return JsonResponse(
            {'error': f'Erreur génération PDF: {e.stderr or str(e)}'}, status=500
        )
    except subprocess.TimeoutExpired:
        return JsonResponse(
            {'error': 'Timeout lors de la génération du PDF (60 s)'}, status=500
        )
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
        rapport = RapportIntervention.objects.select_related(
            'chantier', 'residence', 'client_societe',
        ).get(pk=rapport_id)
    except RapportIntervention.DoesNotExist:
        return JsonResponse({'error': 'Rapport introuvable'}, status=404)
    pdf_result = _generate_rapport_pdf(rapport, request)
    if pdf_result.get('success'):
        rapport.pdf_s3_key = pdf_result.get('s3_file_path', '')
        rapport.save()
    status_code = 200 if pdf_result.get('success') else 400
    return JsonResponse(pdf_result, status=status_code)


class RapportInterventionBrouillonViewSet(viewsets.ModelViewSet):
    """Brouillons serveur (JSON) — CRUD limité au propriétaire.

    ``promouvoir`` : crée un ``RapportIntervention`` valide puis supprime le
    brouillon (transaction atomique).
    """

    serializer_class = RapportInterventionBrouillonSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_serializer_class(self):
        if self.action == 'list':
            return RapportInterventionBrouillonListSerializer
        return RapportInterventionBrouillonSerializer

    def get_queryset(self):
        return RapportInterventionBrouillon.objects.filter(created_by=self.request.user)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_destroy(self, instance):
        dm = (instance.payload or {}).get("_draft_media")
        if dm:
            delete_s3_keys(collect_s3_keys_from_draft_media(dm))
        instance.delete()

    @action(detail=True, methods=["post"])
    def upload_photo(self, request, pk=None):
        """Upload photo prestation (brouillon) vers ``rapports_intervention/brouillons/{id}/…``."""
        brouillon = self.get_object()
        try:
            prestation_index = int(request.data.get("prestation_index", 0))
        except (TypeError, ValueError):
            return Response(
                {"error": "prestation_index invalide"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        type_photo = request.data.get("type_photo", "avant")
        date_photo = request.data.get("date_photo")
        file = request.FILES.get("photo")
        if not file:
            return Response({"error": "photo requise"}, status=status.HTTP_400_BAD_REQUEST)
        brouillon_id = brouillon.pk
        ext = file.name.split(".")[-1] if "." in file.name else "jpg"
        s3_key = (
            f"rapports_intervention/brouillons/{brouillon_id}/p{prestation_index}/"
            f"{type_photo}_{uuid.uuid4().hex[:8]}.{ext}"
        )
        try:
            from .utils import (
                generate_presigned_url_for_display,
                get_s3_bucket_name,
                get_s3_client,
                is_s3_available,
            )

            if not is_s3_available():
                return Response(
                    {"error": "S3 non disponible"},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
            s3_client = get_s3_client()
            bucket_name = get_s3_bucket_name()
            s3_client.put_object(
                Bucket=bucket_name,
                Key=s3_key,
                Body=file.read(),
                ContentType=file.content_type or "image/jpeg",
            )
            presigned_url = None
            try:
                presigned_url = generate_presigned_url_for_display(s3_key)
            except Exception:
                pass
            return Response(
                {
                    "success": True,
                    "s3_key": s3_key,
                    "type_photo": type_photo,
                    "prestation_index": prestation_index,
                    "filename": file.name,
                    "date_photo": date_photo,
                    "presigned_url": presigned_url,
                },
                status=status.HTTP_201_CREATED,
            )
        except Exception as e:
            traceback.print_exc()
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=["post"])
    def upload_signature(self, request, pk=None):
        brouillon = self.get_object()
        signature_data = request.data.get("signature")
        if not signature_data:
            return Response(
                {"error": "signature requise (base64)"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            from .utils import (
                generate_presigned_url_for_display,
                get_s3_bucket_name,
                get_s3_client,
                is_s3_available,
            )

            if not is_s3_available():
                return Response(
                    {"error": "S3 non disponible"},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
            if "," in signature_data:
                signature_data = signature_data.split(",", 1)[1]
            image_bytes = base64.b64decode(signature_data)
            s3_key = (
                f"rapports_intervention/brouillons/{brouillon.pk}/"
                f"signature_{uuid.uuid4().hex[:8]}.png"
            )
            s3_client = get_s3_client()
            bucket_name = get_s3_bucket_name()
            p = brouillon.payload or {}
            dm = p.get("_draft_media") or {}
            old = dm.get("signature_s3_key")
            if old and is_s3_available():
                try:
                    s3_client.delete_object(Bucket=bucket_name, Key=old)
                except Exception:
                    pass
            s3_client.put_object(
                Bucket=bucket_name,
                Key=s3_key,
                Body=image_bytes,
                ContentType="image/png",
            )
            presigned_url = None
            try:
                presigned_url = generate_presigned_url_for_display(s3_key)
            except Exception:
                pass
            return Response(
                {
                    "success": True,
                    "s3_key": s3_key,
                    "url": presigned_url,
                    "presigned_url": presigned_url,
                    "item": {"s3_key": s3_key, "url": presigned_url, "question": "platine"},
                    "media_version": str(getattr(brouillon, "updated_at", "") or ""),
                }
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=["post"])
    def upload_photo_platine(self, request, pk=None):
        brouillon = self.get_object()
        file = request.FILES.get("photo")
        if not file:
            return Response({"error": "photo requise"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            from .utils import (
                generate_presigned_url_for_display,
                get_s3_bucket_name,
                get_s3_client,
                is_s3_available,
            )

            if not is_s3_available():
                return Response(
                    {"error": "S3 non disponible"},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
            ext = file.name.split(".")[-1] if "." in file.name else "jpg"
            s3_key = (
                f"rapports_intervention/brouillons/{brouillon.pk}/"
                f"platine_{uuid.uuid4().hex[:8]}.{ext}"
            )
            s3_client = get_s3_client()
            bucket_name = get_s3_bucket_name()
            s3_client.put_object(
                Bucket=bucket_name,
                Key=s3_key,
                Body=file.read(),
                ContentType=file.content_type or "image/jpeg",
            )
            presigned_url = None
            try:
                presigned_url = generate_presigned_url_for_display(s3_key)
            except Exception:
                pass
            return Response(
                {
                    "success": True,
                    "s3_key": s3_key,
                    "url": presigned_url,
                    "presigned_url": presigned_url,
                    "item": {"s3_key": s3_key, "url": presigned_url, "question": "portail"},
                    "media_version": str(getattr(brouillon, "updated_at", "") or ""),
                }
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=["post"])
    def upload_photo_platine_portail(self, request, pk=None):
        brouillon = self.get_object()
        file = request.FILES.get("photo")
        if not file:
            return Response({"error": "photo requise"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            from .utils import (
                generate_presigned_url_for_display,
                get_s3_bucket_name,
                get_s3_client,
                is_s3_available,
            )

            if not is_s3_available():
                return Response(
                    {"error": "S3 non disponible"},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
            ext = file.name.split(".")[-1] if "." in file.name else "jpg"
            s3_key = (
                f"rapports_intervention/brouillons/{brouillon.pk}/"
                f"platine_portail_{uuid.uuid4().hex[:8]}.{ext}"
            )
            s3_client = get_s3_client()
            bucket_name = get_s3_bucket_name()
            s3_client.put_object(
                Bucket=bucket_name,
                Key=s3_key,
                Body=file.read(),
                ContentType=file.content_type or "image/jpeg",
            )
            presigned_url = None
            try:
                presigned_url = generate_presigned_url_for_display(s3_key)
            except Exception:
                pass
            return Response(
                {"success": True, "s3_key": s3_key, "presigned_url": presigned_url}
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=["post"])
    def delete_photo_vigik(self, request, pk=None):
        """Retire une clé S3 du manifeste ``_draft_media`` et supprime l'objet (brouillon Vigik+)."""
        brouillon = self.get_object()
        s3_key = (request.data.get("s3_key") or "").strip()
        question = (request.data.get("question") or "").strip().lower()
        if not s3_key or question not in ("platine", "portail"):
            return Response(
                {"error": "s3_key et question (platine|portail) requis"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            from .utils import get_s3_bucket_name, get_s3_client, is_s3_available

            with transaction.atomic():
                brouillon = RapportInterventionBrouillon.objects.select_for_update().get(pk=brouillon.pk)
                p = dict(brouillon.payload or {})
                dm = dict(p.get("_draft_media") or {})
                attr = (
                    "photos_platine_s3_keys"
                    if question == "platine"
                    else "photos_platine_portail_s3_keys"
                )
                keys = list(dm.get(attr) or [])
                if question == "platine" and not keys and dm.get("photo_platine_s3_key"):
                    keys = [dm["photo_platine_s3_key"]]
                if (
                    question == "portail"
                    and not keys
                    and dm.get("photo_platine_portail_s3_key")
                ):
                    keys = [dm["photo_platine_portail_s3_key"]]
                if s3_key not in keys:
                    return Response(
                        {"error": "Clé absente du brouillon"},
                        status=status.HTTP_404_NOT_FOUND,
                    )
                keys = [k for k in keys if k != s3_key]
                dm[attr] = keys
                dm.pop("photo_platine_s3_key", None)
                dm.pop("photo_platine_presigned_url", None)
                dm.pop("photo_platine_portail_s3_key", None)
                dm.pop("photo_platine_portail_presigned_url", None)
                dm.pop("photo_platine_presigned_urls", None)
                dm.pop("photo_platine_portail_presigned_urls", None)
                p["_draft_media"] = dm
                brouillon.payload = p
                brouillon.save(update_fields=["payload", "updated_at"])
            if is_s3_available():
                try:
                    get_s3_client().delete_object(Bucket=get_s3_bucket_name(), Key=s3_key)
                except Exception:
                    pass
            return Response(
                {
                    "success": True,
                    attr: keys,
                    "question": question,
                    "s3_key": s3_key,
                    "media_version": str(getattr(brouillon, "updated_at", "") or ""),
                },
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=["post"])
    def promouvoir(self, request, pk=None):
        brouillon = self.get_object()
        merge = request.data if isinstance(request.data, dict) else {}
        merged = {**(brouillon.payload or {}), **merge}
        draft_media = merged.pop("_draft_media", None)
        data = merged
        if "statut" not in data:
            data["statut"] = "en_cours"
        brouillon_id = brouillon.pk
        with transaction.atomic():
            ser = RapportInterventionCreateSerializer(
                data=data, context={"request": request}
            )
            ser.is_valid(raise_exception=True)
            rapport = ser.save(created_by=request.user)
            assign_numero_rapport_si_absent(rapport)
            transfer_brouillon_media_to_rapport(brouillon_id, rapport, draft_media)
            brouillon.delete()
        rapport.refresh_from_db()
        out = RapportInterventionSerializer(rapport, context={"request": request})
        return Response(out.data, status=status.HTTP_201_CREATED)
