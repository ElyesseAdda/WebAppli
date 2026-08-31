"""Serializers pour la fonctionnalité « Diagrammes de Gantt »."""

from rest_framework import serializers

from .models_gantt import (
    GanttDesignation,
    GanttDiagramme,
    GanttElement,
    GanttHistorique,
)


class GanttElementSerializer(serializers.ModelSerializer):
    # ``id`` et ``parent`` sont des entiers libres et non des clés primaires
    # strictes : le client envoie des identifiants temporaires négatifs pour
    # les éléments qu'il vient de créer et qui ne sont pas encore en base.
    id = serializers.IntegerField(required=False, allow_null=True)
    parent = serializers.IntegerField(
        source='parent_id', required=False, allow_null=True
    )
    # Une ligne tout juste ajoutée dans un brouillon n'a pas encore de
    # désignation : la refuser ferait échouer l'enregistrement automatique.
    libelle = serializers.CharField(
        max_length=255, required=False, allow_blank=True, default=''
    )

    class Meta:
        model = GanttElement
        fields = [
            'id',
            'type_element',
            'parent',
            'libelle',
            'date_debut',
            'date_fin',
            'couleur',
            'ordre',
            'commentaire',
            'afficher_duree',
            'style_barre',
        ]


class GanttHistoriqueSerializer(serializers.ModelSerializer):
    utilisateur_nom = serializers.SerializerMethodField()

    class Meta:
        model = GanttHistorique
        fields = [
            'id',
            'date',
            'action',
            'description',
            'details',
            'utilisateur',
            'utilisateur_nom',
        ]

    def get_utilisateur_nom(self, obj):
        if not obj.utilisateur:
            return "Utilisateur inconnu"
        nom_complet = obj.utilisateur.get_full_name()
        return nom_complet or obj.utilisateur.username


class GanttDiagrammeSerializer(serializers.ModelSerializer):
    """Diagramme complet avec ses éléments imbriqués.

    L'écriture des éléments se fait par upsert sur l'``id`` (et non par
    delete + recreate) afin que l'historique puisse suivre chaque ligne
    individuellement d'une version à l'autre.
    """

    elements = GanttElementSerializer(many=True, required=False)
    chantier_nom = serializers.CharField(
        source='chantier.chantier_name', read_only=True, default=None
    )
    logo_client_url = serializers.SerializerMethodField()
    created_by_nom = serializers.SerializerMethodField()
    modified_by_nom = serializers.SerializerMethodField()
    date_debut = serializers.DateField(read_only=True)
    date_fin = serializers.DateField(read_only=True)

    class Meta:
        model = GanttDiagramme
        fields = [
            'id',
            'nom',
            'description',
            'chantier',
            'chantier_nom',
            'statut',
            'echelle',
            'afficher_logo_client',
            'logo_client_s3_key',
            'logo_client_url',
            'elements',
            'date_debut',
            'date_fin',
            'date_creation',
            'date_modification',
            'date_validation',
            'created_by',
            'created_by_nom',
            'modified_by',
            'modified_by_nom',
            'validated_by',
        ]
        read_only_fields = [
            'date_creation',
            'date_modification',
            'date_validation',
            'created_by',
            'modified_by',
            'validated_by',
            'statut',
            'logo_client_s3_key',
            'logo_client_url',
        ]

    def get_logo_client_url(self, obj):
        if not obj.logo_client_s3_key:
            return ''
        try:
            from .utils import generate_presigned_url_for_display

            return generate_presigned_url_for_display(
                obj.logo_client_s3_key, expires_in=3600
            )
        except Exception:
            return ''

    def _nom_utilisateur(self, user):
        if not user:
            return None
        return user.get_full_name() or user.username

    def get_created_by_nom(self, obj):
        return self._nom_utilisateur(obj.created_by)

    def get_modified_by_nom(self, obj):
        return self._nom_utilisateur(obj.modified_by)

    def create(self, validated_data):
        elements_data = validated_data.pop('elements', [])
        diagramme = GanttDiagramme.objects.create(**validated_data)
        self._sync_elements(diagramme, elements_data)
        return diagramme

    def update(self, instance, validated_data):
        elements_data = validated_data.pop('elements', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if elements_data is not None:
            self._sync_elements(instance, elements_data)
        return instance

    def _sync_elements(self, diagramme, elements_data):
        """Upsert des éléments : création, mise à jour, suppression sélective.

        Les identifiants négatifs ou absents correspondent aux éléments créés
        côté client et non encore persistés.
        """
        existants = {e.id: e for e in diagramme.elements.all()}
        ids_conserves = set()
        # Fait le lien entre l'identifiant envoyé par le client (réel ou
        # temporaire) et l'objet réellement persisté.
        correspondance = {}

        def enregistrer(data):
            data = dict(data)
            id_client = data.pop('id', None)
            # `parent` est exposé en entier mais alimente `parent_id` côté modèle
            id_parent_client = data.pop('parent_id', None)

            data['parent'] = correspondance.get(id_parent_client)

            element = existants.get(id_client)
            if element is not None:
                for attr, value in data.items():
                    setattr(element, attr, value)
                element.save()
            else:
                element = GanttElement.objects.create(diagramme=diagramme, **data)

            if id_client is not None:
                correspondance[id_client] = element
            ids_conserves.add(element.id)

        # Les titres sont traités en premier pour que leurs enfants puissent
        # résoudre leur parent, y compris quand le titre vient d'être créé.
        titres = [d for d in elements_data if d.get('type_element') == 'titre']
        lignes = [d for d in elements_data if d.get('type_element') != 'titre']
        for data in titres:
            enregistrer(data)
        for data in lignes:
            enregistrer(data)

        diagramme.elements.exclude(id__in=ids_conserves).delete()


class GanttDiagrammeApercuSerializer(serializers.ModelSerializer):
    """Version allégée pour la vue globale : une ligne par diagramme."""

    chantier_nom = serializers.CharField(
        source='chantier.chantier_name', read_only=True, default=None
    )
    date_debut = serializers.SerializerMethodField()
    date_fin = serializers.SerializerMethodField()
    nb_lignes = serializers.SerializerMethodField()
    modified_by_nom = serializers.SerializerMethodField()

    class Meta:
        model = GanttDiagramme
        fields = [
            'id',
            'nom',
            'description',
            'chantier',
            'chantier_nom',
            'statut',
            'echelle',
            'afficher_logo_client',
            'date_debut',
            'date_fin',
            'nb_lignes',
            'date_modification',
            'modified_by_nom',
        ]

    def _dates(self, obj):
        return [
            (e.date_debut, e.date_fin)
            for e in obj.elements.all()
            if e.date_debut and e.date_fin
        ]

    def get_date_debut(self, obj):
        dates = self._dates(obj)
        return min(d[0] for d in dates) if dates else None

    def get_date_fin(self, obj):
        dates = self._dates(obj)
        return max(d[1] for d in dates) if dates else None

    def get_nb_lignes(self, obj):
        return sum(1 for e in obj.elements.all() if e.type_element == 'ligne')

    def get_modified_by_nom(self, obj):
        if not obj.modified_by:
            return None
        return obj.modified_by.get_full_name() or obj.modified_by.username


class GanttDesignationSerializer(serializers.ModelSerializer):
    class Meta:
        model = GanttDesignation
        fields = [
            'id',
            'libelle',
            'type_element',
            'couleur_defaut',
            'nb_utilisations',
            'derniere_utilisation',
        ]
        read_only_fields = ['nb_utilisations', 'derniere_utilisation']
