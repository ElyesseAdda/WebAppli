from rest_framework import serializers  
from .models import Chantier, Societe, Devis, Partie, SousPartie,  LigneDetail, Client

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