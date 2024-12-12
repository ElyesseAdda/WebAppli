from django import forms
from .models import Devis, DevisItem, LigneDetail

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

class DevisItemForm(forms.ModelForm):
    class Meta:
        model = DevisItem
        fields = [
            'devis',
            'ligne_detail',
            'quantite',
            'prix_unitaire'
        ]

    def clean(self):
        cleaned_data = super().clean()
        quantite = cleaned_data.get('quantite')
        
        if quantite is not None and quantite <= 0:
            raise forms.ValidationError("La quantité doit être supérieure à 0")
        
        return cleaned_data