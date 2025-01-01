from rest_framework import serializers  
from .models import (
    Chantier, Societe, Devis, Partie, SousPartie, LigneDetail, Client, 
    Agent, Stock, Presence, StockMovement, StockHistory, Event, MonthlyHours, 
    Schedule, LaborCost, DevisLigne, Facture, FactureLigne, FactureSpecialLine
)

class DevisLigneSerializer(serializers.ModelSerializer):
    class Meta:
        model = DevisLigne
        fields = ['ligne_detail', 'quantite', 'prix_unitaire', 'total_ht']

class DevisSerializer(serializers.ModelSerializer):
    lignes = DevisLigneSerializer(many=True, read_only=True)
    
    class Meta:
        model = Devis
        fields = ['id', 'numero', 'chantier', 'client', 'date_creation', 
                 'price_ht', 'price_ttc', 'description', 'status', 'lignes']

class ChantierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Chantier
        fields = '__all__'      

class SocieteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Societe
        fields = '__all__'

class LigneDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = LigneDetail
        fields = ['id', 'description', 'unite', 'prix']

class SousPartieSerializer(serializers.ModelSerializer):
    lignes_details = LigneDetailSerializer(many=True, read_only=True)

    class Meta:
        model = SousPartie
        fields = '__all__'

class PartieSerializer(serializers.ModelSerializer):
    sous_parties = SousPartieSerializer(many=True, read_only=True)

    class Meta:
        model = Partie
        fields = '__all__'

class ClientSerializer(serializers.ModelSerializer):
    
    class Meta:
        model = Client
        fields = '__all__'

class MonthlyHoursSerializer(serializers.ModelSerializer):
    class Meta:
        model = MonthlyHours
        fields = ['month', 'hours']


class AgentSerializer(serializers.ModelSerializer):
    heures_travail_journalieres = serializers.ReadOnlyField()
    monthly_hours = MonthlyHoursSerializer(many=True, read_only=True)

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
    prix_total = serializers.SerializerMethodField()  # Champ personnalisé pour calculer le prix total

    class Meta:
        model = Stock
        fields = [
            'id','code_produit', 'nom_materiel', 'fournisseur', 'designation',
            'quantite_disponible', 'quantite_minimum', 'prix_unitaire', 'prix_total'
        ]

    def get_prix_total(self, obj):
        # Calculer le prix total basé sur la quantité disponible et le prix unitaire
        return obj.quantite_disponible * obj.prix_unitaire if obj.quantite_disponible and obj.prix_unitaire else 0


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
    lignes = FactureLigneSerializer(source='lignes_details', many=True, read_only=True)

    class Meta:
        model = Facture
        fields = [
            'id', 'numero_facture', 'date_echeance', 'mode_paiement',
            'adresse_facturation', 'devis_origine', 'lignes', 'price_ht', 
            'price_ttc', 'tva_rate', 'chantier'
        ]
        read_only_fields = ['price_ht', 'price_ttc', 'tva_rate', 'chantier']

    def validate(self, data):
        if 'devis_origine' not in data:
            raise serializers.ValidationError({"devis_origine": "Ce champ est obligatoire"})
        return data

    def create(self, validated_data):
        devis = validated_data['devis_origine']
        
        facture = Facture.objects.create(
            numero_facture=validated_data['numero_facture'],
            date_echeance=validated_data.get('date_echeance'),
            mode_paiement=validated_data['mode_paiement'],
            adresse_facturation=validated_data['adresse_facturation'],
            devis_origine=devis,
            price_ht=devis.price_ht,
            price_ttc=devis.price_ttc,
            tva_rate=devis.tva_rate,
            chantier=devis.chantier
        )

        # Copier les lignes du devis
        devis_lignes = DevisLigne.objects.filter(devis=devis)
        for devis_ligne in devis_lignes:
            FactureLigne.objects.create(
                facture=facture,
                ligne_detail=devis_ligne.ligne_detail,
                quantite=devis_ligne.quantite,
                prix_unitaire=devis_ligne.prix_unitaire,
                total_ht=devis_ligne.total_ht
            )

        # Copier les lignes spéciales
        self._copy_special_lines(devis, facture)
        
        return facture

    def _copy_special_lines(self, devis, facture):
        # Copier les lignes spéciales globales
        for ligne in devis.lignes_speciales.filter(niveau='global'):
            FactureSpecialLine.objects.create(
                facture=facture,
                description=ligne.description,
                value=ligne.value,
                value_type=ligne.value_type,
                type=ligne.type,
                is_highlighted=ligne.is_highlighted,
                niveau='global'
            )

        # Copier les lignes spéciales des parties
        for ligne in devis.lignes_speciales.filter(niveau='partie'):
            FactureSpecialLine.objects.create(
                facture=facture,
                description=ligne.description,
                value=ligne.value,
                value_type=ligne.value_type,
                type=ligne.type,
                is_highlighted=ligne.is_highlighted,
                niveau='partie',
                partie_id=ligne.partie_id
            )

        # Copier les lignes spéciales des sous-parties
        for ligne in devis.lignes_speciales.filter(niveau='sous_partie'):
            FactureSpecialLine.objects.create(
                facture=facture,
                description=ligne.description,
                value=ligne.value,
                value_type=ligne.value_type,
                type=ligne.type,
                is_highlighted=ligne.is_highlighted,
                niveau='sous_partie',
                sous_partie_id=ligne.sous_partie_id
            )

class ChantierDetailSerializer(serializers.ModelSerializer):
    societe_details = serializers.SerializerMethodField()
    statistiques = serializers.SerializerMethodField()
    adresse = serializers.SerializerMethodField()
    couts = serializers.SerializerMethodField()
    dates = serializers.SerializerMethodField()
    
    class Meta:
        model = Chantier
        fields = [
            'id', 
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
