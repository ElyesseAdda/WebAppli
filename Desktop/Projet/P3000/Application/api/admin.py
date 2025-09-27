from django.contrib import admin
from .models import Devis, FournisseurMagasin, Emetteur

# Register your models here.

@admin.register(FournisseurMagasin)
class FournisseurMagasinAdmin(admin.ModelAdmin):
    list_display = ('fournisseur', 'magasin', 'derniere_utilisation')
    list_filter = ('fournisseur',)
    search_fields = ('fournisseur', 'magasin')
    ordering = ('-derniere_utilisation',)


@admin.register(Emetteur)
class EmetteurAdmin(admin.ModelAdmin):
    list_display = ('name', 'surname', 'email', 'phone_Number', 'is_active', 'date_creation')
    list_filter = ('is_active', 'date_creation')
    search_fields = ('name', 'surname', 'email', 'phone_Number')
    list_editable = ('phone_Number', 'is_active')
    ordering = ('surname', 'name')
    
    fieldsets = (
        ('Informations personnelles', {
            'fields': ('name', 'surname', 'email', 'phone_Number')
        }),
        ('Statut', {
            'fields': ('is_active',),
            'classes': ('collapse',)
        }),
        ('Métadonnées', {
            'fields': ('date_creation',),
            'classes': ('collapse',),
            'description': 'Date de création automatique'
        }),
    )
    
    readonly_fields = ('date_creation',)
    
    def get_queryset(self, request):
        """Optimise les requêtes pour l'admin"""
        return super().get_queryset(request).select_related()


