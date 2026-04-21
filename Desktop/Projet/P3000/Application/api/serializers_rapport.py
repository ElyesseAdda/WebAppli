from rest_framework import serializers
from .models_rapport import (
    TitreRapport,
    Residence,
    RapportIntervention,
    PrestationRapport,
    PhotoRapport,
    RapportInterventionBrouillon,
)
from .rapport_brouillon import compute_champs_manquants
from .rapport_brouillon_media import enrich_draft_media_with_presigned_urls
from .models import Societe, Chantier, Devis


def _is_vigik_plus(attrs):
    return attrs.get('type_rapport') == 'vigik_plus'


def _safe_delete_s3_key(key):
    if not key:
        return
    try:
        from .utils import get_s3_client, get_s3_bucket_name, is_s3_available
        if not is_s3_available():
            return
        get_s3_client().delete_object(Bucket=get_s3_bucket_name(), Key=key)
    except Exception:
        pass


def _normalize_vigik_portail_answers(validated_data, instance=None):
    """
    Vigik+ : sans portail, pas de réponse « platine au portail », mais des photos
    facultatives peuvent rester associées au rapport.
    Les photos « portail » (facultatives) ne sont plus liées au booléen
    « présence de platine au portail » : elles restent si l’utilisateur les a ajoutées.
    """
    type_r = validated_data.get('type_rapport')
    if type_r is None and instance is not None:
        type_r = instance.type_rapport
    if type_r != 'vigik_plus':
        return validated_data
    pp = validated_data.get('presence_portail')
    if pp is None and instance is not None:
        pp = instance.presence_portail

    if pp is False:
        validated_data['presence_platine_portail'] = None
    return validated_data


def _normalize_dates_intervention_attrs(attrs, instance=None):
    """Synchronise dates_intervention (liste ordonnée) et date (dernière date = tri / affichage court)."""
    from datetime import datetime
    from django.utils import timezone

    has_di = 'dates_intervention' in attrs
    has_single = 'date' in attrs

    if has_di:
        dates_intervention = attrs['dates_intervention']
        if dates_intervention is None:
            dates_intervention = []
        if not isinstance(dates_intervention, list):
            raise serializers.ValidationError(
                {'dates_intervention': 'Une liste de dates est attendue.'}
            )
        cleaned = []
        for d in dates_intervention:
            s = str(d).strip()[:10]
            if not s:
                continue
            try:
                datetime.strptime(s, '%Y-%m-%d')
            except ValueError:
                raise serializers.ValidationError(
                    {'dates_intervention': f'Date invalide : {d}'}
                )
            cleaned.append(s)
        if not cleaned:
            raise serializers.ValidationError(
                {'dates_intervention': "Au moins une date d'intervention est requise."}
            )
        attrs['dates_intervention'] = cleaned
        attrs['date'] = max(datetime.strptime(x, '%Y-%m-%d').date() for x in cleaned)
        return attrs

    if has_single and attrs.get('date') is not None:
        d = attrs['date']
        if hasattr(d, 'isoformat'):
            ds = d.isoformat()[:10]
            date_val = d
        else:
            ds = str(d)[:10]
            try:
                date_val = datetime.strptime(ds, '%Y-%m-%d').date()
            except ValueError:
                raise serializers.ValidationError({'date': 'Date invalide.'})
            attrs['date'] = date_val
        attrs['dates_intervention'] = [ds]
        return attrs

    if instance is None:
        today = timezone.now().date()
        attrs['dates_intervention'] = [today.isoformat()]
        attrs['date'] = today
    return attrs


class TitreRapportSerializer(serializers.ModelSerializer):
    class Meta:
        model = TitreRapport
        fields = ['id', 'nom', 'created_at']
        read_only_fields = ['created_at']


class ResidenceSerializer(serializers.ModelSerializer):
    client_societe_nom = serializers.SerializerMethodField()
    chantier_nom = serializers.SerializerMethodField()
    dernier_rapport = serializers.SerializerMethodField()

    class Meta:
        model = Residence
        fields = ['id', 'nom', 'adresse', 'client_societe', 'chantier',
                  'client_societe_nom', 'chantier_nom', 'dernier_rapport',
                  'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']

    def get_client_societe_nom(self, obj):
        if obj.client_societe:
            return obj.client_societe.nom_societe
        return None

    def get_chantier_nom(self, obj):
        if obj.chantier:
            return obj.chantier.chantier_name
        return None

    def get_dernier_rapport(self, obj):
        dernier = obj.rapports.order_by('-created_at').select_related(
            'client_societe', 'chantier'
        ).first()
        if not dernier:
            return None
        return {
            'client_societe': dernier.client_societe_id,
            'client_societe_nom': dernier.client_societe.nom_societe if dernier.client_societe else None,
            'chantier': dernier.chantier_id,
            'chantier_nom': dernier.chantier.chantier_name if dernier.chantier else None,
            'technicien': dernier.technicien,
        }


class PhotoRapportSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = PhotoRapport
        fields = ['id', 'prestation', 's3_key', 'filename', 'type_photo', 'date_photo', 'ordre', 'created_at', 'image_url']
        read_only_fields = ['created_at', 'image_url']

    def get_image_url(self, obj):
        if obj.s3_key:
            try:
                from .utils import generate_presigned_url_for_display
                return generate_presigned_url_for_display(obj.s3_key, expires_in=3600)
            except Exception:
                return None
        return None


class PrestationRapportSerializer(serializers.ModelSerializer):
    photos = PhotoRapportSerializer(many=True, read_only=True)

    class Meta:
        model = PrestationRapport
        fields = [
            'id', 'rapport', 'localisation', 'probleme', 'solution',
            'commentaire', 'prestation_possible', 'prestation_realisee',
            'ordre', 'photos'
        ]
        read_only_fields = ['rapport']


class PrestationRapportWriteSerializer(serializers.ModelSerializer):
    """Serializer pour la creation/mise a jour de prestations (sans nested photos)."""
    id = serializers.IntegerField(required=False, allow_null=True)

    class Meta:
        model = PrestationRapport
        fields = [
            'id', 'localisation', 'probleme', 'solution',
            'commentaire', 'prestation_possible', 'prestation_realisee', 'ordre'
        ]


class RapportInterventionSerializer(serializers.ModelSerializer):
    prestations = PrestationRapportSerializer(many=True, read_only=True)
    residence_data = ResidenceSerializer(source='residence', read_only=True)
    client_societe_nom = serializers.SerializerMethodField()
    client_societe_logo_url = serializers.SerializerMethodField()
    chantier_nom = serializers.SerializerMethodField()
    residence_nom = serializers.SerializerMethodField()
    residence_adresse = serializers.SerializerMethodField()
    signature_url = serializers.SerializerMethodField()
    pdf_url = serializers.SerializerMethodField()
    pdf_drive_url = serializers.SerializerMethodField()
    vigik_platine_photos = serializers.SerializerMethodField()
    vigik_platine_portail_photos = serializers.SerializerMethodField()
    devis_lie_numero = serializers.SerializerMethodField()
    devis_lie_preview_url = serializers.SerializerMethodField()

    class Meta:
        model = RapportIntervention
        fields = [
            'id', 'titre', 'date', 'dates_intervention', 'technicien', 'objet_recherche', 'resultat',
            'temps_trajet', 'temps_taches',
            'client_societe', 'chantier', 'residence', 'logement',
            'locataire_nom', 'locataire_prenom', 'locataire_telephone', 'locataire_email',
            'signature_s3_key', 'type_rapport', 'statut', 'devis_a_faire', 'devis_fait', 'devis_lie', 'pdf_s3_key',
            'adresse_vigik', 'numero_batiment', 'type_installation',
            'presence_platine', 'photos_platine_s3_keys',
            'presence_portail', 'presence_platine_portail', 'photos_platine_portail_s3_keys',
            'created_by', 'created_at', 'updated_at',
            'prestations', 'residence_data', 'residence_nom', 'residence_adresse',
            'client_societe_nom', 'client_societe_logo_url', 'chantier_nom',
            'signature_url', 'pdf_url', 'pdf_drive_url', 'vigik_platine_photos', 'vigik_platine_portail_photos',
            'devis_lie_numero', 'devis_lie_preview_url',
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at', 'signature_s3_key', 'pdf_s3_key']

    def get_client_societe_nom(self, obj):
        if obj.client_societe:
            return obj.client_societe.nom_societe
        return None

    def get_client_societe_logo_url(self, obj):
        if obj.client_societe and obj.client_societe.logo_s3_key:
            try:
                from .utils import generate_presigned_url_for_display
                return generate_presigned_url_for_display(obj.client_societe.logo_s3_key, expires_in=3600)
            except Exception:
                return None
        return None

    def get_chantier_nom(self, obj):
        if obj.chantier:
            return obj.chantier.chantier_name
        return None

    def get_residence_nom(self, obj):
        if obj.residence:
            return obj.residence.nom
        return None

    def get_residence_adresse(self, obj):
        if obj.residence:
            return obj.residence.adresse
        return None

    def get_signature_url(self, obj):
        if obj.signature_s3_key:
            try:
                from .utils import generate_presigned_url_for_display
                return generate_presigned_url_for_display(obj.signature_s3_key, expires_in=3600)
            except Exception:
                return None
        return None

    def get_pdf_url(self, obj):
        if obj.pdf_s3_key:
            try:
                from .utils import generate_presigned_url
                return generate_presigned_url('get_object', obj.pdf_s3_key, expires_in=3600)
            except Exception:
                return None
        return None

    def get_pdf_drive_url(self, obj):
        if obj.pdf_s3_key:
            return f"/drive-v2?path={obj.pdf_s3_key}&focus=file"
        return None

    def _vigik_photo_rows(self, keys):
        rows = []
        if not isinstance(keys, list):
            return rows
        from .utils import generate_presigned_url_for_display

        for k in keys:
            if not k or not isinstance(k, str):
                continue
            try:
                url = generate_presigned_url_for_display(k, expires_in=3600)
            except Exception:
                url = None
            rows.append({'s3_key': k, 'url': url})
        return rows

    def get_vigik_platine_photos(self, obj):
        return self._vigik_photo_rows(getattr(obj, 'photos_platine_s3_keys', None) or [])

    def get_vigik_platine_portail_photos(self, obj):
        return self._vigik_photo_rows(getattr(obj, 'photos_platine_portail_s3_keys', None) or [])

    def get_devis_lie_numero(self, obj):
        return obj.devis_lie.numero if obj.devis_lie else None

    def get_devis_lie_preview_url(self, obj):
        if not obj.devis_lie_id:
            return None
        return f"/api/preview-saved-devis-v2/{obj.devis_lie_id}/"


class RapportInterventionListSerializer(serializers.ModelSerializer):
    """Version legere pour les listes."""
    client_societe_nom = serializers.SerializerMethodField()
    chantier_nom = serializers.SerializerMethodField()
    titre_nom = serializers.SerializerMethodField()
    residence_nom = serializers.SerializerMethodField()
    residence_adresse = serializers.SerializerMethodField()
    nb_prestations = serializers.SerializerMethodField()
    devis_lie_numero = serializers.SerializerMethodField()
    devis_lie_preview_url = serializers.SerializerMethodField()

    class Meta:
        model = RapportIntervention
        fields = [
            'id', 'date', 'dates_intervention', 'titre', 'titre_nom', 'technicien',
            'temps_trajet', 'temps_taches',
            'client_societe', 'client_societe_nom', 'chantier', 'chantier_nom',
            'residence', 'residence_nom', 'residence_adresse', 'adresse_vigik', 'logement',
            'type_rapport', 'statut', 'devis_a_faire', 'devis_fait', 'devis_lie', 'devis_lie_numero', 'devis_lie_preview_url',
            'numero_batiment', 'type_installation',
            'presence_platine', 'presence_portail', 'presence_platine_portail',
            'created_at', 'updated_at', 'nb_prestations',
        ]

    def get_client_societe_nom(self, obj):
        if obj.client_societe:
            return obj.client_societe.nom_societe
        return None

    def get_chantier_nom(self, obj):
        if obj.chantier:
            return obj.chantier.chantier_name
        return None

    def get_titre_nom(self, obj):
        if obj.titre:
            return obj.titre.nom
        return None

    def get_residence_nom(self, obj):
        if obj.residence:
            return obj.residence.nom
        return None

    def get_residence_adresse(self, obj):
        if obj.residence:
            return obj.residence.adresse
        return None

    def get_nb_prestations(self, obj):
        c = getattr(obj, 'prestations_count', None)
        if c is not None:
            return c
        return obj.prestations.count()

    def get_devis_lie_numero(self, obj):
        return obj.devis_lie.numero if obj.devis_lie else None

    def get_devis_lie_preview_url(self, obj):
        if not obj.devis_lie_id:
            return None
        return f"/api/preview-saved-devis-v2/{obj.devis_lie_id}/"


class RapportInterventionCreateSerializer(serializers.ModelSerializer):
    """Serializer pour la creation avec prestations nested."""
    titre = serializers.PrimaryKeyRelatedField(
        queryset=TitreRapport.objects.all(),
        required=False,
        allow_null=True,
    )
    objet_recherche = serializers.CharField(required=False, allow_blank=True)
    technicien = serializers.CharField(required=False, allow_blank=True)
    client_societe = serializers.PrimaryKeyRelatedField(
        queryset=Societe.objects.all(),
        required=False,
        allow_null=True,
    )
    chantier = serializers.PrimaryKeyRelatedField(
        queryset=Chantier.objects.all(),
        required=False,
        allow_null=True,
    )
    prestations = PrestationRapportWriteSerializer(many=True, required=False)
    residence_nom = serializers.CharField(write_only=True, required=False, allow_blank=True)
    residence_adresse = serializers.CharField(write_only=True, required=False, allow_blank=True)
    adresse_vigik = serializers.CharField(required=False, allow_blank=True)
    devis_lie = serializers.PrimaryKeyRelatedField(
        queryset=Devis.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = RapportIntervention
        fields = [
            'id', 'titre', 'date', 'dates_intervention', 'technicien', 'objet_recherche', 'resultat',
            'temps_trajet', 'temps_taches',
            'client_societe', 'chantier', 'residence', 'logement',
            'residence_nom', 'residence_adresse', 'adresse_vigik',
            'locataire_nom', 'locataire_prenom', 'locataire_telephone', 'locataire_email',
            'type_rapport', 'statut', 'devis_a_faire', 'devis_fait', 'devis_lie', 'prestations',
            'numero_batiment', 'type_installation',
            'presence_platine', 'presence_portail', 'presence_platine_portail',
        ]

    def _resolve_vigik_defaults(self, validated_data):
        """Pour Vigik+, champs absents du formulaire : appliquer des valeurs par défaut."""
        if validated_data.get('type_rapport') != 'vigik_plus':
            return validated_data
        # Titre
        titre = validated_data.get('titre')
        if titre is None or titre == '':
            titre_obj, _ = TitreRapport.objects.get_or_create(
                nom='Rapport Vigik+',
                defaults={}
            )
            validated_data['titre'] = titre_obj
        # Objet de la recherche
        if not (validated_data.get('objet_recherche') or '').strip():
            validated_data['objet_recherche'] = 'Rapport système Vigik+'
        # Technicien (affiché dans le formulaire mais au cas où vide)
        if not (validated_data.get('technicien') or '').strip():
            validated_data['technicien'] = '—'
        # Client / Bailleur et Chantier (non affichés)
        if validated_data.get('client_societe') is None or validated_data.get('client_societe') == '':
            validated_data['client_societe'] = None
        if validated_data.get('chantier') is None or validated_data.get('chantier') == '':
            validated_data['chantier'] = None
        # Résultat (non affiché)
        if validated_data.get('resultat') is None:
            validated_data['resultat'] = ''
        # Logement & Locataire (section masquée)
        if validated_data.get('logement') is None:
            validated_data['logement'] = ''
        if validated_data.get('locataire_nom') is None:
            validated_data['locataire_nom'] = ''
        if validated_data.get('locataire_prenom') is None:
            validated_data['locataire_prenom'] = ''
        if validated_data.get('locataire_telephone') is None:
            validated_data['locataire_telephone'] = ''
        if validated_data.get('locataire_email') is None:
            validated_data['locataire_email'] = ''
        # Adresse propre au rapport Vigik+ (ne modifie pas la résidence)
        if validated_data.get('adresse_vigik') is None:
            validated_data['adresse_vigik'] = ''
        return validated_data

    def validate(self, attrs):
        """Normalise dates d'intervention ; Vigik+ : adresse obligatoire ; sinon technicien et objet_recherche.
        Statut brouillon : champs assouplis pour sauvegarde auto sans tout remplir."""
        attrs.pop('photos_platine_s3_keys', None)
        attrs.pop('photos_platine_portail_s3_keys', None)
        attrs = _normalize_dates_intervention_attrs(attrs, instance=getattr(self, 'instance', None))
        instance = getattr(self, 'instance', None)

        merged = dict(attrs)
        if instance:
            for key in (
                'statut', 'type_rapport', 'technicien', 'objet_recherche', 'adresse_vigik',
                'devis_a_faire', 'devis_fait', 'devis_lie', 'chantier',
                'presence_portail', 'presence_platine', 'presence_platine_portail',
            ):
                if key not in merged:
                    merged[key] = getattr(instance, key)

        # Vigik+ : pas de platine sur site => devis à faire (même suivi que les rapports d'intervention)
        if _is_vigik_plus(merged):
            plat = merged.get('presence_platine')
            if plat is False:
                attrs['devis_a_faire'] = True
                merged['devis_a_faire'] = True
            elif plat is True:
                attrs['devis_a_faire'] = False
                merged['devis_a_faire'] = False

        devis_a_faire = merged.get('devis_a_faire', False)
        devis_fait = merged.get('devis_fait', False)
        devis_lie = merged.get('devis_lie')
        chantier = merged.get('chantier')

        if not devis_a_faire:
            attrs['devis_fait'] = False
            attrs['devis_lie'] = None
        else:
            if devis_fait and not devis_lie:
                raise serializers.ValidationError({'devis_lie': "Un devis lié est requis quand le devis est marqué fait."})
            if devis_lie and chantier and devis_lie.chantier_id and devis_lie.chantier_id != chantier.id:
                raise serializers.ValidationError({'devis_lie': "Le devis lié doit appartenir au même chantier que le rapport."})

        statut_resolu = merged.get('statut')
        type_resolu = merged.get('type_rapport')

        if statut_resolu == 'brouillon':
            attrs = dict(attrs)
            if type_resolu == 'vigik_plus':
                pass
            else:
                if not (merged.get('technicien') or '').strip():
                    attrs['technicien'] = '—'
                if not (merged.get('objet_recherche') or '').strip():
                    attrs['objet_recherche'] = '—'
            return attrs

        if _is_vigik_plus(merged):
            if not (merged.get('adresse_vigik') or '').strip():
                raise serializers.ValidationError({'adresse_vigik': "L'adresse du rapport est obligatoire pour un rapport Vigik+."})
            if merged.get('presence_portail') is None:
                raise serializers.ValidationError({
                    'presence_portail': "Indiquez si un portail est présent sur le site.",
                })
            if merged.get('presence_portail') is True and merged.get('presence_platine_portail') is None:
                raise serializers.ValidationError({
                    'presence_platine_portail': "Indiquez si une platine Vigik+ est présente au portail.",
                })
            return attrs
        if 'technicien' in attrs and not (attrs.get('technicien') or '').strip():
            raise serializers.ValidationError({'technicien': 'Ce champ est obligatoire.'})
        if 'objet_recherche' in attrs and not (attrs.get('objet_recherche') or '').strip():
            raise serializers.ValidationError({'objet_recherche': 'Ce champ est obligatoire.'})
        return attrs

    def _resolve_residence(self, validated_data):
        """Get or create a Residence from nom/adresse if no FK provided. L'adresse Vigik+ reste sur le rapport (adresse_vigik), pas sur la résidence."""
        residence_nom = validated_data.pop('residence_nom', '').strip()
        residence_adresse = validated_data.pop('residence_adresse', '').strip()
        residence = validated_data.get('residence')

        if not residence and residence_nom:
            defaults = {'adresse': residence_adresse}
            client_societe = validated_data.get('client_societe')
            chantier = validated_data.get('chantier')
            if client_societe:
                defaults['client_societe'] = client_societe
            if chantier:
                defaults['chantier'] = chantier
            residence, _ = Residence.objects.get_or_create(
                nom=residence_nom, defaults=defaults
            )
            validated_data['residence'] = residence
        return validated_data

    def create(self, validated_data):
        prestations_data = validated_data.pop('prestations', [])
        validated_data = self._resolve_vigik_defaults(validated_data)
        validated_data = _normalize_vigik_portail_answers(validated_data, instance=None)
        validated_data = self._resolve_residence(validated_data)
        rapport = RapportIntervention.objects.create(**validated_data)
        for i, prestation_data in enumerate(prestations_data):
            prestation_data['ordre'] = prestation_data.get('ordre', i)
            PrestationRapport.objects.create(rapport=rapport, **prestation_data)
        return rapport

    def update(self, instance, validated_data):
        prestations_data = validated_data.pop('prestations', None)
        validated_data = self._resolve_vigik_defaults(validated_data)
        validated_data = _normalize_vigik_portail_answers(validated_data, instance=instance)
        new_pp = validated_data.get('photos_platine_portail_s3_keys')
        if new_pp is not None:
            old_pp = list(instance.photos_platine_portail_s3_keys or [])
            new_set = set(new_pp)
            for k in old_pp:
                if k and k not in new_set:
                    _safe_delete_s3_key(k)
        validated_data = self._resolve_residence(validated_data)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if prestations_data is not None:
            existing_ids = set(instance.prestations.values_list('id', flat=True))
            incoming_ids = set()

            for i, prestation_data in enumerate(prestations_data):
                prestation_id = prestation_data.pop('id', None) if isinstance(prestation_data, dict) else None
                prestation_data['ordre'] = prestation_data.get('ordre', i)

                if prestation_id and prestation_id in existing_ids:
                    PrestationRapport.objects.filter(id=prestation_id).update(**prestation_data)
                    incoming_ids.add(prestation_id)
                else:
                    new_prestation = PrestationRapport.objects.create(rapport=instance, **prestation_data)
                    incoming_ids.add(new_prestation.id)

            ids_to_delete = existing_ids - incoming_ids
            if ids_to_delete:
                PrestationRapport.objects.filter(id__in=ids_to_delete).delete()

        return instance


class RapportInterventionBrouillonListSerializer(serializers.ModelSerializer):
    """Ligne liste : champs alignés sur RapportInterventionListSerializer (depuis payload JSON)."""

    statut = serializers.SerializerMethodField()
    is_brouillon_serveur = serializers.SerializerMethodField()
    date = serializers.SerializerMethodField()
    dates_intervention = serializers.SerializerMethodField()
    titre = serializers.SerializerMethodField()
    titre_nom = serializers.SerializerMethodField()
    technicien = serializers.SerializerMethodField()
    client_societe = serializers.SerializerMethodField()
    client_societe_nom = serializers.SerializerMethodField()
    chantier = serializers.SerializerMethodField()
    chantier_nom = serializers.SerializerMethodField()
    residence = serializers.SerializerMethodField()
    residence_nom = serializers.SerializerMethodField()
    residence_adresse = serializers.SerializerMethodField()
    adresse_vigik = serializers.SerializerMethodField()
    logement = serializers.SerializerMethodField()
    type_rapport = serializers.SerializerMethodField()
    devis_a_faire = serializers.SerializerMethodField()
    devis_fait = serializers.SerializerMethodField()
    devis_lie = serializers.SerializerMethodField()
    devis_lie_numero = serializers.SerializerMethodField()
    devis_lie_preview_url = serializers.SerializerMethodField()
    nb_prestations = serializers.SerializerMethodField()

    class Meta:
        model = RapportInterventionBrouillon
        fields = [
            'id', 'date', 'dates_intervention', 'titre', 'titre_nom', 'technicien',
            'client_societe', 'client_societe_nom', 'chantier', 'chantier_nom',
            'residence', 'residence_nom', 'residence_adresse', 'adresse_vigik', 'logement',
            'type_rapport', 'statut', 'is_brouillon_serveur', 'devis_a_faire', 'devis_fait',
            'devis_lie', 'devis_lie_numero', 'devis_lie_preview_url',
            'created_at', 'updated_at', 'nb_prestations',
        ]

    def _p(self, obj):
        p = obj.payload
        return p if isinstance(p, dict) else {}

    def get_statut(self, obj):
        return 'brouillon_serveur'

    def get_is_brouillon_serveur(self, obj):
        return True

    def get_dates_intervention(self, obj):
        p = self._p(obj)
        di = p.get('dates_intervention')
        if isinstance(di, list) and di:
            return [str(x)[:10] for x in di if x]
        d = p.get('date')
        if d:
            return [str(d)[:10]]
        return []

    def get_date(self, obj):
        di = self.get_dates_intervention(obj)
        if not di:
            return None
        return max(di)

    def get_titre(self, obj):
        return self._p(obj).get('titre')

    def get_titre_nom(self, obj):
        tid = self._p(obj).get('titre')
        if not tid:
            return None
        t = TitreRapport.objects.filter(pk=tid).first()
        return t.nom if t else None

    def get_technicien(self, obj):
        return self._p(obj).get('technicien') or ''

    def get_client_societe(self, obj):
        return self._p(obj).get('client_societe')

    def get_client_societe_nom(self, obj):
        cid = self._p(obj).get('client_societe')
        if not cid:
            return None
        s = Societe.objects.filter(pk=cid).first()
        return s.nom_societe if s else None

    def get_chantier(self, obj):
        return self._p(obj).get('chantier')

    def get_chantier_nom(self, obj):
        cid = self._p(obj).get('chantier')
        if not cid:
            return None
        c = Chantier.objects.filter(pk=cid).first()
        return c.chantier_name if c else None

    def get_residence(self, obj):
        return self._p(obj).get('residence')

    def get_residence_nom(self, obj):
        p = self._p(obj)
        nom = p.get('residence_nom')
        if nom:
            return nom
        rid = p.get('residence')
        if not rid:
            return None
        res = Residence.objects.filter(pk=rid).first()
        return res.nom if res else None

    def get_residence_adresse(self, obj):
        p = self._p(obj)
        addr = p.get('residence_adresse')
        if addr:
            return addr
        rid = p.get('residence')
        if not rid:
            return None
        res = Residence.objects.filter(pk=rid).first()
        return res.adresse if res else None

    def get_adresse_vigik(self, obj):
        return self._p(obj).get('adresse_vigik') or ''

    def get_logement(self, obj):
        return self._p(obj).get('logement') or ''

    def get_type_rapport(self, obj):
        return self._p(obj).get('type_rapport') or 'intervention'

    def get_devis_a_faire(self, obj):
        return bool(self._p(obj).get('devis_a_faire'))

    def get_devis_fait(self, obj):
        return bool(self._p(obj).get('devis_fait'))

    def get_devis_lie(self, obj):
        return self._p(obj).get('devis_lie')

    def get_devis_lie_numero(self, obj):
        did = self._p(obj).get('devis_lie')
        if not did:
            return None
        d = Devis.objects.filter(pk=did).first()
        return d.numero if d else None

    def get_devis_lie_preview_url(self, obj):
        did = self._p(obj).get('devis_lie')
        if not did:
            return None
        return f'/api/preview-saved-devis-v2/{did}/'

    def get_nb_prestations(self, obj):
        pres = self._p(obj).get('prestations')
        if isinstance(pres, list):
            return len(pres)
        return 0


class RapportInterventionBrouillonSerializer(serializers.ModelSerializer):
    """Brouillon serveur : payload JSON aligné sur le corps du POST/PUT rapport (sans contraintes obligatoires)."""

    class Meta:
        model = RapportInterventionBrouillon
        fields = ["id", "payload", "champs_manquants", "created_at", "updated_at"]
        read_only_fields = ["champs_manquants", "created_at", "updated_at"]

    def validate_payload(self, value):
        if value is None:
            return {}
        if not isinstance(value, dict):
            raise serializers.ValidationError("Le payload doit être un objet JSON.")
        return value

    def create(self, validated_data):
        validated_data["champs_manquants"] = compute_champs_manquants(validated_data.get("payload") or {})
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if "payload" in validated_data:
            validated_data["champs_manquants"] = compute_champs_manquants(validated_data.get("payload") or {})
        return super().update(instance, validated_data)

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        p = ret.get("payload")
        if isinstance(p, dict) and p.get("_draft_media"):
            p = dict(p)
            p["_draft_media"] = enrich_draft_media_with_presigned_urls(p["_draft_media"])
            ret["payload"] = p
        return ret
