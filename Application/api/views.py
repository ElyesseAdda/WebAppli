from django.shortcuts import render
from rest_framework import viewsets
from .serializers import ChantierSerializer
from .models import Chantier

# Create your views here.
class ChantierViewSet(viewsets.ModelViewSet):
    queryset = Chantier.objects.all()
    serializer_class = ChantierSerializer