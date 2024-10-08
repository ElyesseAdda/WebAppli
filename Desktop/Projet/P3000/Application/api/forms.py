from django import forms
from .models import Devis, DevisItem

class DevisForm(forms.ModelForm):
    class Meta:
        model = Devis
        fields = ['numero', 'chantier']

class DevisItemForm(forms.ModelForm):
    class Meta:
        model = DevisItem
        fields = ['sous_partie', 'quantite']