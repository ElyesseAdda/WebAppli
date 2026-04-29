from django.contrib import admin, messages
from django.utils.html import format_html
from .models import (
    Devis,
    FournisseurMagasin,
    Emetteur,
    Fournisseur,
    Magasin,
    Agence,
)

# Register your models here.

@admin.register(FournisseurMagasin)
class FournisseurMagasinAdmin(admin.ModelAdmin):
    list_display = ('fournisseur', 'magasin', 'derniere_utilisation')
    list_filter = ('fournisseur',)
    search_fields = ('fournisseur', 'magasin')
    ordering = ('-derniere_utilisation',)


class MagasinInline(admin.TabularInline):
    model = Magasin
    extra = 1
    fields = ('nom', 'email')


@admin.register(Fournisseur)
class FournisseurAdmin(admin.ModelAdmin):
    list_display = ('name', 'Fournisseur_mail', 'phone_Number', 'get_magasins_count')
    list_filter = ('name',)
    search_fields = ('name', 'Fournisseur_mail', 'phone_Number')
    inlines = [MagasinInline]
    
    def get_magasins_count(self, obj):
        return obj.magasins.count()
    get_magasins_count.short_description = 'Nombre de magasins'


@admin.register(Magasin)
class MagasinAdmin(admin.ModelAdmin):
    list_display = ('nom', 'fournisseur', 'email')
    list_filter = ('fournisseur',)
    search_fields = ('nom', 'email', 'fournisseur__name')


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


@admin.register(Agence)
class AgenceAdmin(admin.ModelAdmin):
    list_display = ("nom", "chantier", "created_at", "delete_safety_label")
    search_fields = ("nom", "chantier__chantier_name")
    ordering = ("id",)
    actions = ("delete_selected_agences_safe",)

    @admin.display(description="Suppression")
    def delete_safety_label(self, obj):
        reasons = self._get_delete_blockers(obj)
        if reasons:
            return format_html(
                '<span style="color:#b45309;font-weight:600;">Protégé</span>'
            )
        return format_html(
            '<span style="color:#166534;font-weight:600;">Supprimable</span>'
        )

    def _get_delete_blockers(self, obj):
        blockers = []

        if obj.nom.strip().lower() == "agence":
            blockers.append("Agence par défaut protégée")

        if obj.agency_expenses.exists():
            blockers.append("dépenses agence liées")
        if obj.agency_expenses_month.exists():
            blockers.append("dépenses mensuelles liées")
        if obj.expense_aggregates.exists():
            blockers.append("agrégats liés")
        if obj.primes_agence.exists():
            blockers.append("primes agents liées")

        return blockers

    def delete_model(self, request, obj):
        blockers = self._get_delete_blockers(obj)
        if blockers:
            self.message_user(
                request,
                (
                    f"Suppression refusée pour « {obj.nom} » : "
                    + ", ".join(blockers)
                    + "."
                ),
                level=messages.ERROR,
            )
            return
        super().delete_model(request, obj)
        self.message_user(
            request,
            f"Agence « {obj.nom} » supprimée avec succès.",
            level=messages.SUCCESS,
        )

    @admin.action(description="Supprimer les agences sélectionnées (sécurisé)")
    def delete_selected_agences_safe(self, request, queryset):
        deleted_count = 0
        blocked = []

        for agence in queryset:
            blockers = self._get_delete_blockers(agence)
            if blockers:
                blocked.append((agence.nom, blockers))
                continue

            agence.delete()
            deleted_count += 1

        if deleted_count:
            self.message_user(
                request,
                f"{deleted_count} agence(s) supprimée(s) avec succès.",
                level=messages.SUCCESS,
            )

        for agence_name, blockers in blocked:
            self.message_user(
                request,
                (
                    f"Suppression refusée pour « {agence_name} » : "
                    + ", ".join(blockers)
                    + "."
                ),
                level=messages.WARNING,
            )

    def get_actions(self, request):
        actions = super().get_actions(request)
        # Désactive l'action native non sécurisée.
        if "delete_selected" in actions:
            del actions["delete_selected"]
        return actions


