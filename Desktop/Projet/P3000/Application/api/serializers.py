from rest_framework import serializers  
from django.db.models import Q
from .models import (
    Chantier, Societe, Devis, Partie, SousPartie, LigneDetail, Client, 
    Agent, Stock, Presence, StockMovement, StockHistory, Event, MonthlyHours, 
    Schedule, LaborCost, DevisLigne, Facture, FactureLigne, BonCommande, LigneBonCommande,
    Avenant, FactureTS, Situation, SituationLigne, SituationLigneSupplementaire,
    ChantierLigneSupplementaire, SituationLigneAvenant
)
from decimal import Decimal

class DevisLigneSerializer(serializers.ModelSerializer):
    ligne_detail = serializers.PrimaryKeyRelatedField(queryset=LigneDetail.objects.all())
    total_ht = serializers.SerializerMethodField()

    class Meta:
        model = DevisLigne
        fields = ['ligne_detail', 'quantite', 'prix_unitaire', 'total_ht']

    def get_total_ht(self, obj):
        return obj.quantite * obj.prix_unitaire



class DevisSerializer(serializers.ModelSerializer):
    lignes = DevisLigneSerializer(many=True, required=False)
    lignes_speciales = serializers.JSONField(required=False)
    client = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    chantier = serializers.PrimaryKeyRelatedField(queryset=Chantier.objects.all())

    class Meta:
        model = Devis
        fields = [
            'id', 'numero', 'date_creation', 'price_ht', 'price_ttc',
            'tva_rate', 'nature_travaux', 'description', 'status',
            'chantier', 'client', 'lignes', 'lignes_speciales', 'devis_chantier'
        ]
        read_only_fields = ['date_creation', 'client']

    def get_lignes_speciales(self, obj):
        lignes = obj.lignes_speciales.all()
        result = {
            'global': [],
            'parties': {},
            'sousParties': {}
        }

        for ligne in lignes:
            ligne_data = {
                'id': ligne.id,
                'description': ligne.description,
                'value': float(ligne.value),
                'valueType': ligne.value_type,
                'type': ligne.type,
                'isHighlighted': ligne.is_highlighted
            }

            if ligne.niveau == 'global':
                result['global'].append(ligne_data)
            elif ligne.niveau == 'partie':
                partie_id = str(ligne.partie.id)
                if partie_id not in result['parties']:
                    result['parties'][partie_id] = []
                result['parties'][partie_id].append(ligne_data)
            elif ligne.niveau == 'sous_partie':
                sous_partie_id = str(ligne.sous_partie.id)
                if sous_partie_id not in result['sousParties']:
                    result['sousParties'][sous_partie_id] = []
                result['sousParties'][sous_partie_id].append(ligne_data)

        return result
    
    def update(self, instance, validated_data):
        if 'lignes' in validated_data:
            DevisLigne.objects.filter(devis=instance).delete()
            
            lignes_data = validated_data.pop('lignes')
            for ligne_data in lignes_data:
                DevisLigne.objects.create(
                    devis=instance,
                    ligne_detail=ligne_data['ligne_detail'],
                    quantite=Decimal(str(ligne_data['quantite'])),
                    prix_unitaire=Decimal(str(ligne_data['prix_unitaire']))
                )

        # Mettre à jour les lignes spéciales
        if 'lignes_speciales' in validated_data:
            instance.lignes_speciales = validated_data.pop('lignes_speciales')

        # Mettre à jour les autres champs
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance

class ChantierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Chantier
        fields = [
            'id', 'chantier_name', 'societe', 'date_debut', 'date_fin',
            'montant_ttc', 'montant_ht', 'state_chantier', 'ville', 'rue',
            'code_postal', 'cout_materiel', 'cout_main_oeuvre', 
            'cout_sous_traitance', 'description',
            # Nouveaux champs
            'cout_estime_main_oeuvre', 'cout_estime_materiel', 'marge_estimee'
        ]



class SocieteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Societe
        fields = '__all__'

class LigneDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = LigneDetail
        fields = [
            'id', 
            'description', 
            'unite', 
            'cout_main_oeuvre',
            'cout_materiel',
            'taux_fixe',
            'marge',
            'prix',
            'sous_partie'
        ]

    def validate(self, data):
        """
        Vérifie si une ligne de détail similaire existe déjà dans la même sous-partie
        """
        description = data.get('description', '').strip().lower()
        sous_partie = data.get('sous_partie')
        
        if description and sous_partie:
            # Vérifie si une ligne avec la même description existe dans la sous-partie
            existing_ligne = LigneDetail.objects.filter(
                Q(description__iexact=description) &
                Q(sous_partie=sous_partie)
            ).first()
            
            if existing_ligne:
                raise serializers.ValidationError({
                    'description': f'Cette ligne existe déjà dans la sous-partie "{sous_partie.description}". '
                                 f'Détails de la ligne existante : '
                                 f'Description: {existing_ligne.description}, '
                                 f'Unité: {existing_ligne.unite}, '
                                 f'Prix: {existing_ligne.prix}€'
                })
        
        return data

class SousPartieSerializer(serializers.ModelSerializer):
    lignes_details = LigneDetailSerializer(many=True, read_only=True)

    class Meta:
        model = SousPartie
        fields = '__all__'

    def validate(self, data):
        """
        Vérifie si une sous-partie similaire existe déjà dans la même partie
        """
        description = data.get('description', '').strip().lower()
        partie = data.get('partie')
        
        if description and partie:
            # Vérifie si une sous-partie avec la même description existe dans la partie
            existing_sous_partie = SousPartie.objects.filter(
                Q(description__iexact=description) &
                Q(partie=partie)
            ).first()
            
            if existing_sous_partie:
                nb_lignes = existing_sous_partie.lignes_details.count()
                raise serializers.ValidationError({
                    'description': f'Cette sous-partie existe déjà dans la partie "{partie.titre}". '
                                 f'Détails de la sous-partie existante : '
                                 f'Description: {existing_sous_partie.description}, '
                                 f'Nombre de lignes: {nb_lignes}'
                })
        
        return data

class PartieSerializer(serializers.ModelSerializer):
    sous_parties = SousPartieSerializer(many=True, read_only=True)

    class Meta:
        model = Partie
        fields = '__all__'

    def validate(self, data):
        """
        Vérifie si une partie avec le même titre existe déjà
        """
        titre = data.get('titre', '').strip().lower()
        
        if titre:
            # Vérifie si une partie avec le même titre existe
            existing_partie = Partie.objects.filter(
                titre__iexact=titre
            ).first()
            
            if existing_partie:
                nb_sous_parties = existing_partie.sous_parties.count()
                total_lignes = sum(sp.lignes_details.count() for sp in existing_partie.sous_parties.all())
                raise serializers.ValidationError({
                    'titre': f'Cette partie existe déjà. '
                            f'Détails de la partie existante : '
                            f'Titre: {existing_partie.titre}, '
                            f'Nombre de sous-parties: {nb_sous_parties}, '
                            f'Nombre total de lignes: {total_lignes}'
                })
        
        return data

class ClientSerializer(serializers.ModelSerializer):
    
    class Meta:
        model = Client
        fields = '__all__'

class MonthlyHoursSerializer(serializers.ModelSerializer):
    class Meta:
        model = MonthlyHours
        fields = ['month', 'hours']

class AgentPrimeSerializer(serializers.Serializer):
    description = serializers.CharField(max_length=100)
    montant = serializers.DecimalField(max_digits=10, decimal_places=2)

class AgentSerializer(serializers.ModelSerializer):
    heures_travail_journalieres = serializers.ReadOnlyField()
    monthly_hours = MonthlyHoursSerializer(many=True, read_only=True)
    primes = serializers.JSONField(required=False)

    class Meta:
        model = Agent
        fields = '__all__'


class PresenceSerializer(serializers.ModelSerializer):
    agent_name = serializers.CharField(source='agent.name', read_only=True)
    chantier_name = serializers.CharField(source='chantier.nom', read_only=True)
    cout_main_oeuvre = serializers.FloatField(read_only=True)

    class Meta:
        model = Presence
        fields = ['agent', 'chantier', 'date', 'heures_travail', 'agent_name', 'chantier_name', 'cout_main_oeuvre']

class EventSerializer(serializers.ModelSerializer):
    chantier_name = serializers.CharField(source='chantier.chantier_name', read_only=True)

    class Meta:
        model = Event
        fields = ['id', 'agent', 'start_date', 'end_date', 'status', 'hours_modified', 'chantier', 'chantier_name']

class StockSerializer(serializers.ModelSerializer):
  
    class Meta:
        model = Stock
        fields = '__all__'

    
class StockHistorySerializer(serializers.ModelSerializer):
    stock = StockSerializer()  # Sérialiseur imbriqué pour afficher les détails du stock
    chantier = ChantierSerializer()  # Sérialiseur imbriqué pour renvoyer le chantier
    agent = AgentSerializer()  # Si vous avez un sérialiseur pour l'agent, vous pouvez l'imbriquer aussi

    class Meta:
        model = StockHistory
        fields = ['id', 'stock', 'quantite', 'type_operation', 'date_operation', 'montant', 'chantier', 'agent']
        
class StockMovementSerializer(serializers.ModelSerializer):
    class Meta:
        model = StockMovement
        fields = '__all__'

class ScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Schedule
        fields = ['id', 'agent', 'week', 'year', 'day', 'hour', 'chantier_id']

class LaborCostSerializer(serializers.ModelSerializer):
    # Champs calculés/dérivés
    agent_name = serializers.CharField(source='agent.name', read_only=True)
    chantier_name = serializers.CharField(source='chantier.chantier_name', read_only=True)
    taux_horaire = serializers.FloatField(source='agent.taux_Horaire', read_only=True)

    class Meta:
        model = LaborCost
        fields = [
            'id', 'agent', 'agent_name', 'chantier', 'chantier_name',
            'week', 'year', 'hours', 'cost', 'taux_horaire',
            'created_at', 'updated_at'
        ]



class FactureLigneSerializer(serializers.ModelSerializer):
    ligne_detail = serializers.PrimaryKeyRelatedField(read_only=True)
    
    class Meta:
        model = FactureLigne
        fields = ['ligne_detail', 'quantite', 'prix_unitaire', 'total_ht']

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation['ligne_detail'] = instance.ligne_detail.id
        representation['total_ht'] = float(representation['total_ht'])
        return representation

class FactureSerializer(serializers.ModelSerializer):
    devis_numero = serializers.CharField(source='devis.numero', read_only=True)
    chantier_name = serializers.CharField(source='chantier.chantier_name', read_only=True)

    class Meta:
        model = Facture
        fields = [
            'id', 'numero', 'date_creation', 'state_facture',
            'date_echeance', 'date_paiement', 'mode_paiement', 'devis',
            'price_ht', 'price_ttc', 'chantier', 'chantier_name',
            'devis_numero', 'type_facture', 'designation'
        ]
        read_only_fields = ['date_creation', 'price_ht', 'price_ttc', 'chantier', 'chantier_name']

    def validate_numero(self, value):
        if not value.startswith('FACT-'):
            raise serializers.ValidationError("Le numéro de facture doit commencer par 'FACT-'")
        
        if Facture.objects.filter(numero=value).exists():
            raise serializers.ValidationError("Ce numéro de facture existe déjà")
            
        return value

    def validate(self, data):
        if data.get('state_facture') == 'Payée' and not data.get('date_paiement'):
            raise serializers.ValidationError({
                "date_paiement": "La date de paiement est requise lorsque la facture est marquée comme payée"
            })
        return data

class ChantierDetailSerializer(serializers.ModelSerializer):
    societe_details = serializers.SerializerMethodField()
    statistiques = serializers.SerializerMethodField()
    adresse = serializers.SerializerMethodField()
    couts = serializers.SerializerMethodField()
    dates = serializers.SerializerMethodField()
    
    class Meta:
        model = Chantier
        fields = [
            
            'chantier_name',
            'state_chantier',
            'description',
            'societe_details',
            'statistiques',
            'adresse',
            'couts',
            'dates'
        ]

    def get_societe_details(self, obj):
        if not obj.societe:
            return None
        
        return {
            'id': obj.societe.id,
            'nom_societe': obj.societe.nom_societe,
            'client': {
                'nom': f"{obj.societe.client_name.name} {obj.societe.client_name.surname}" if obj.societe.client_name else None,
                'email': obj.societe.client_name.client_mail if obj.societe.client_name else None,
                'telephone': obj.societe.client_name.phone_Number if obj.societe.client_name else None
            } if obj.societe.client_name else None
        }

    def get_statistiques(self, obj):
        return {
            'nombre_devis': obj.nombre_devis,
            'nombre_factures': obj.nombre_facture,
            'cout_main_oeuvre_total': obj.cout_main_oeuvre_total,
            'montant_total_ttc': obj.montant_ttc or 0,
            'montant_total_ht': obj.montant_ht or 0,
            'marge_brute': (obj.montant_ht or 0) - (
                (obj.cout_materiel or 0) + 
                (obj.cout_main_oeuvre or 0) + 
                (obj.cout_sous_traitance or 0)
            )
        }

    def get_adresse(self, obj):
        return {
            'rue': obj.rue,
            'ville': obj.ville,
            'code_postal': obj.code_postal
        }

    def get_couts(self, obj):
        return {
            'materiel': obj.cout_materiel,
            'main_oeuvre': obj.cout_main_oeuvre,
            'sous_traitance': obj.cout_sous_traitance
        }

    def get_dates(self, obj):
        return {
            'debut': obj.date_debut,
            'fin': obj.date_fin
        }

class LigneBonCommandeSerializer(serializers.ModelSerializer):
    class Meta:
        model = LigneBonCommande
        fields = '__all__'

class BonCommandeSerializer(serializers.ModelSerializer):
    chantier_name = serializers.CharField(source='chantier.chantier_name', read_only=True)
    reste_a_payer = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = BonCommande
        fields = '__all__'

class FactureTSSerializer(serializers.ModelSerializer):
    devis_numero = serializers.CharField(source='numero_complet', read_only=True)
    
    class Meta:
        model = FactureTS
        fields = [
            'id',
            'numero_ts',
            'designation',
            'date_creation',
            'montant_ht',
            'montant_ttc',
            'tva_rate',
            'devis',
            'chantier',
            'avenant',
            
            'devis_numero'
        ]

class AvenantSerializer(serializers.ModelSerializer):
    factures_ts = FactureTSSerializer(many=True, read_only=True)
    nombre_ts = serializers.SerializerMethodField()
    
    class Meta:
        model = Avenant
        fields = [
            'id', 
            'numero', 
            'montant_total',
            'nombre_ts',
            'factures_ts'
        ]

    def get_nombre_ts(self, obj):
        return obj.factures_ts.count()

class FactureTSCreateSerializer(serializers.Serializer):
    devis_id = serializers.IntegerField()
    chantier_id = serializers.IntegerField()
    numero_ts = serializers.CharField(required=False, allow_blank=True)
    create_new_avenant = serializers.BooleanField()
    avenant_id = serializers.IntegerField(required=False, allow_null=True)

    def validate(self, data):
        if not data['create_new_avenant'] and not data.get('avenant_id'):
            raise serializers.ValidationError(
                "Un avenant existant doit être sélectionné si create_new_avenant est False"
            )

        try:
            devis = Devis.objects.get(id=data['devis_id'])
            
            # Vérifier si une facture existe déjà pour ce devis
            if Facture.objects.filter(devis=devis).exists():
                raise serializers.ValidationError(
                    f"Une facture existe déjà pour le devis {devis.numero}"
                )

            # Vérifier si le numéro de facture existe déjà
            potential_numero = f"{devis.numero} / {data.get('numero_ts', '')}"
            if Facture.objects.filter(numero=potential_numero).exists():
                raise serializers.ValidationError(
                    f"Une facture avec le numéro {potential_numero} existe déjà"
                )

        except Devis.DoesNotExist:
            raise serializers.ValidationError("Le devis spécifié n'existe pas")

        try:
            Chantier.objects.get(id=data['chantier_id'])
        except Chantier.DoesNotExist:
            raise serializers.ValidationError("Le chantier spécifié n'existe pas")

        return data

class FactureCIECreateSerializer(serializers.Serializer):
    devis_id = serializers.IntegerField()
    chantier_id = serializers.IntegerField()
    numero_ts = serializers.CharField(required=False, allow_blank=True)
    mois_situation = serializers.IntegerField(min_value=1, max_value=12)
    annee_situation = serializers.IntegerField(min_value=2000, max_value=2100)

    def validate(self, data):
        try:
            devis = Devis.objects.get(id=data['devis_id'])
            
            # Vérifier si une facture existe déjà pour ce devis
            if Facture.objects.filter(devis=devis).exists():
                raise serializers.ValidationError(
                    f"Une facture existe déjà pour le devis {devis.numero}"
                )

            # Vérifier si le numéro de facture existe déjà
            potential_numero = f"{devis.numero} / {data.get('numero_ts', '')}"
            if Facture.objects.filter(numero=potential_numero).exists():
                raise serializers.ValidationError(
                    f"Une facture avec le numéro {potential_numero} existe déjà"
                )

            if devis.devis_chantier:
                raise serializers.ValidationError(
                    "Les devis de chantier ne peuvent pas être transformés en facture CIE"
                )
        except Devis.DoesNotExist:
            raise serializers.ValidationError("Le devis spécifié n'existe pas")

        try:
            Chantier.objects.get(id=data['chantier_id'])
        except Chantier.DoesNotExist:
            raise serializers.ValidationError("Le chantier spécifié n'existe pas")

        return data

class SituationLigneSerializer(serializers.ModelSerializer):
    class Meta:
        model = SituationLigne
        fields = [
            'id',
            'situation',
            'ligne_devis',
            'description',
            'quantite',
            'prix_unitaire',
            'total_ht',
            'pourcentage_precedent',
            'pourcentage_actuel',
            'montant'
        ]

class SituationLigneAvenantSerializer(serializers.ModelSerializer):
    facture_ts_numero = serializers.CharField(source='facture_ts.numero_ts', read_only=True)
    avenant_numero = serializers.IntegerField(source='avenant.numero', read_only=True)

    class Meta:
        model = SituationLigneAvenant
        fields = [
            'id',
            'situation',
            'avenant',
            'avenant_numero',
            'facture_ts',
            'facture_ts_numero',
            'montant_ht',
            'pourcentage_precedent',
            'pourcentage_actuel',
            'montant'
        ]

class SituationLigneSupplementaireSerializer(serializers.ModelSerializer):
    class Meta:
        model = SituationLigneSupplementaire
        fields = ['id', 'situation', 'description', 'montant', 'type']

class SituationSerializer(serializers.ModelSerializer):
    situation_lignes = SituationLigneSerializer(many=True, read_only=True)
    situation_lignes_supplementaires = SituationLigneSupplementaireSerializer(many=True, read_only=True)
    situation_lignes_avenants = SituationLigneAvenantSerializer(many=True, read_only=True)

    class Meta:
        model = Situation
        fields = [
            'id',
            'situation_lignes',
            'situation_lignes_supplementaires',
            'situation_lignes_avenants',
            'numero',
            'mois',
            'annee',
            'date_creation',
            'date_validation',
            'statut',
            'montant_precedent',
            'montant_ht_mois',
            'montant_total',
            'pourcentage_avancement',
            'montant_total_cumul_ht',
            'cumul_mois_precedent',
            'montant_total_mois_apres_retenue',
            'tva',
            'retenue_garantie',
            'taux_prorata',
            'montant_prorata',
            'retenue_cie',
            'chantier',
            'devis',
            'created_by',
            'validated_by'
        ]

class SituationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Situation
        fields = [
            'chantier',
            'mois',
            'annee',
            'commentaire'
        ]

    def validate(self, data):
        # Vérifier si une situation existe déjà pour ce mois/année/chantier
        if Situation.objects.filter(
            chantier=data['chantier'],
            mois=data['mois'],
            annee=data['annee']
        ).exists():
            raise serializers.ValidationError(
                f"Une situation existe déjà pour {data['mois']}/{data['annee']}"
            )
        return data

class SituationLigneUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SituationLigne
        fields = ['pourcentage']

    def validate_pourcentage(self, value):
        if not isinstance(value, (int, float)):
            raise serializers.ValidationError("Le pourcentage doit être un nombre")
        
        if value < 0 or value > 100:
            raise serializers.ValidationError("Le pourcentage doit être compris entre 0 et 100")
            
        return value

    def update(self, instance, validated_data):
        # Vérifier si le pourcentage est inférieur au pourcentage de la situation précédente
        derniere_situation = (
            Situation.objects
            .filter(
                chantier=instance.situation.chantier,
                numero__lt=instance.situation.numero
            )
            .order_by('-numero')
            .first()
        )
        
        if derniere_situation:
            derniere_ligne = SituationLigne.objects.filter(
                situation=derniere_situation,
                ligne_devis=instance.ligne_devis,
                facture_ts=instance.facture_ts
            ).first()
            
            if derniere_ligne and validated_data['pourcentage'] < derniere_ligne.pourcentage:
                raise serializers.ValidationError(
                    "Le nouveau pourcentage ne peut pas être inférieur à celui de la situation précédente"
                )

        instance.pourcentage = validated_data['pourcentage']
        instance.save()
        return instance

class FactureTSListSerializer(serializers.ModelSerializer):
    devis_numero = serializers.CharField(source='numero_complet', read_only=True)
    avenant_numero = serializers.IntegerField(source='avenant.numero', read_only=True)
    
    class Meta:
        model = FactureTS
        fields = [
            'id',
            'devis_numero',
            'numero_ts',
            'designation',
            'montant_ht',
            'montant_ttc',
            'date_creation',
            'avenant_numero',
            
        ]

class ChantierLigneSupplementaireSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChantierLigneSupplementaire
        fields = ['id', 'description', 'montant']