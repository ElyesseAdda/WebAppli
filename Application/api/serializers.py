from rest_framework import serializers  
from .models import Chantier

class ChantierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Chantier
        fields = '__all__'      