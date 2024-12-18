from django import forms
from .models import Devis, LigneDetail

class DevisForm(forms.ModelForm):
    class Meta:
        model = Devis
        fields = [
            'numero',
            'chantier',
            'type',
            'price_ht',
            'state',
            'description'
        ]
        
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Rendre certains champs optionnels
        self.fields['description'].required = False
        # Le numéro sera généré automatiquement
        self.fields['numero'].required = False
        # Le type aura une valeur par défaut
        self.fields['type'].required = False
        # L'état aura une valeur par défaut
        self.fields['state'].required = False

