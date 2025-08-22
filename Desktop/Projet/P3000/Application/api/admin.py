from django.contrib import admin
from .models import Devis, FournisseurMagasin, Emetteur

# Register your models here.

@admin.register(FournisseurMagasin)
class FournisseurMagasinAdmin(admin.ModelAdmin):
    list_display = ('fournisseur', 'magasin', 'derniere_utilisation')
    list_filter = ('fournisseur',)
    search_fields = ('fournisseur', 'magasin')
    ordering = ('-derniere_utilisation',)


