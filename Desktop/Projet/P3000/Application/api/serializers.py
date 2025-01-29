from rest_framework import serializers  
from django.db.models import Q
from .models import (
    Chantier, Societe, Devis, Partie, SousPartie, LigneDetail, Client, 
    Agent, Stock, Presence, StockMovement, StockHistory, Event, MonthlyHours, 
    Schedule, LaborCost, DevisLigne, Facture, FactureLigne,
)

class DevisLigneSerializer(serializers.ModelSerializer):
    total_ht = serializers.SerializerMethodField()

    class Meta:
        model = DevisLigne
        fields = ['ligne_detail', 'quantite', 'prix_unitaire', 'total_ht']

    def get_total_ht(self, obj):
        return obj.quantite * obj.prix_unitaire



class DevisSerializer(serializers.ModelSerializer):
    lignes = DevisLigneSerializer(many=True, read_only=True)
    lignes_speciales = serializers.JSONField(required=False)

    class Meta:
        model = Devis
        fields = [
            'id', 'numero', 'date_creation', 'price_ht', 'price_ttc',
            'tva_rate', 'nature_travaux', 'description', 'status',
            'chantier', 'client', 'lignes', 'lignes_speciales'
        ]

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
        fields = ['id', 'description', 'unite', 'prix', 'sous_partie']

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
    lignes = FactureLigneSerializer(many=True, read_only=True)
    lignes_speciales = serializers.JSONField(required=False)

    class Meta:
        model = Facture
        fields = [
            'id', 'numero', 'date_creation', 'price_ht', 'price_ttc',
            'tva_rate', 'devis', 'state_facture', 'lignes', 'lignes_speciales'
        ]

    def create(self, validated_data):
        devis = validated_data.get('devis')
        if devis and devis.lignes_speciales:
            validated_data['lignes_speciales'] = devis.lignes_speciales
        return super().create(validated_data)

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
