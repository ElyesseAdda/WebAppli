from rest_framework import serializers
from .models_rapport import TitreRapport, Residence, RapportIntervention, PrestationRapport, PhotoRapport
from .models import Societe, Chantier


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

    class Meta:
        model = RapportIntervention
        fields = [
            'id', 'titre', 'date', 'technicien', 'objet_recherche', 'resultat',
            'client_societe', 'chantier', 'residence', 'logement',
            'locataire_nom', 'locataire_prenom', 'locataire_telephone', 'locataire_email',
            'signature_s3_key', 'type_rapport', 'statut', 'pdf_s3_key',
            'created_by', 'created_at', 'updated_at',
            'prestations', 'residence_data', 'residence_nom', 'residence_adresse',
            'client_societe_nom', 'client_societe_logo_url', 'chantier_nom',
            'signature_url', 'pdf_url',
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


class RapportInterventionListSerializer(serializers.ModelSerializer):
    """Version legere pour les listes."""
    client_societe_nom = serializers.SerializerMethodField()
    chantier_nom = serializers.SerializerMethodField()
    titre_nom = serializers.SerializerMethodField()
    residence_nom = serializers.SerializerMethodField()
    residence_adresse = serializers.SerializerMethodField()
    nb_prestations = serializers.SerializerMethodField()

    class Meta:
        model = RapportIntervention
        fields = [
            'id', 'date', 'titre', 'titre_nom', 'technicien',
            'client_societe', 'client_societe_nom', 'chantier', 'chantier_nom',
            'residence', 'residence_nom', 'residence_adresse', 'logement',
            'type_rapport', 'statut',
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
        return obj.prestations.count()


class RapportInterventionCreateSerializer(serializers.ModelSerializer):
    """Serializer pour la creation avec prestations nested."""
    prestations = PrestationRapportWriteSerializer(many=True, required=False)
    residence_nom = serializers.CharField(write_only=True, required=False, allow_blank=True)
    residence_adresse = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = RapportIntervention
        fields = [
            'id', 'titre', 'date', 'technicien', 'objet_recherche', 'resultat',
            'client_societe', 'chantier', 'residence', 'logement',
            'residence_nom', 'residence_adresse',
            'locataire_nom', 'locataire_prenom', 'locataire_telephone', 'locataire_email',
            'type_rapport', 'statut', 'prestations',
        ]

    def _resolve_residence(self, validated_data):
        """Get or create a Residence from nom/adresse if no FK provided."""
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
        validated_data = self._resolve_residence(validated_data)
        rapport = RapportIntervention.objects.create(**validated_data)
        for i, prestation_data in enumerate(prestations_data):
            prestation_data['ordre'] = prestation_data.get('ordre', i)
            PrestationRapport.objects.create(rapport=rapport, **prestation_data)
        return rapport

    def update(self, instance, validated_data):
        prestations_data = validated_data.pop('prestations', None)
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
