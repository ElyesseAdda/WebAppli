from rest_framework import serializers  
from .models import Chantier, Societe, Devis, Partie, SousPartie,  LigneDetail, Client, Agent, Stock, Presence

class ChantierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Chantier
        fields = '__all__'      

class SocieteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Societe
        fields = '__all__'

class DevisSerializer(serializers.ModelSerializer):
    class Meta:
        model = Devis
        fields = '__all__'


    class Meta:
        model = Partie
        fields = '__all__'

class LigneDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = LigneDetail
        fields = '__all__'

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

class AgentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Agent
        fields = '__all__'

class StockSerializer(serializers.ModelSerializer):
    prix_total_stock = serializers.FloatField(read_only=True)
    prix_total_commande = serializers.FloatField(read_only=True)
    prix_stock_sortie = serializers.FloatField(read_only=True)

    class Meta:
        model = Stock
        fields = ['id', 'code_produit', 'nom_materiel', 'fournisseur', 'prix_unitaire', 'quantite_disponible', 
                  'quantite_entree', 'quantite_sortie', 'chantier', 'agent', 'date_sortie', 
                  'prix_total_stock', 'prix_total_commande', 'prix_stock_sortie']
class StockCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Stock
        fields = ['nom_materiel', 'quantite_disponible', 'quantite_entree', 'quantite_sortie', 'chantier', 'agent']  # Associe l'agent à la création

class PresenceSerializer(serializers.ModelSerializer):
    agent_name = serializers.CharField(source='agent.name', read_only=True)
    chantier_name = serializers.CharField(source='chantier.nom', read_only=True)
    cout_main_oeuvre = serializers.FloatField(read_only=True)

    class Meta:
        model = Presence
        fields = ['agent', 'chantier', 'date', 'heures_travail', 'agent_name', 'chantier_name', 'cout_main_oeuvre']


class StockSerializer(serializers.ModelSerializer):
    class Meta:
        model = Stock
        fields = '__all__'  # Ou listez les champs que vous souhaitez inclure