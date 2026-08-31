"""Modèles liés à la fonctionnalité « Diagrammes de Gantt ».

Les modèles sont réexportés depuis ``api/models.py`` afin de rester accessibles
via ``from api.models import GanttDiagramme`` partout dans le projet.
"""

import re
import unicodedata

from django.contrib.auth.models import User
from django.db import models


def normaliser_libelle(libelle):
    """Clé de rapprochement des désignations : minuscules, sans accent, espaces réduits.

    Permet de ne pas accumuler « Gros oeuvre », « gros œuvre » et « Gros  Oeuvre »
    comme trois suggestions distinctes.
    """
    if not libelle:
        return ''
    texte = unicodedata.normalize('NFKD', str(libelle))
    texte = ''.join(c for c in texte if not unicodedata.combining(c))
    texte = texte.replace('œ', 'oe').replace('Œ', 'oe').replace('æ', 'ae')
    texte = re.sub(r'\s+', ' ', texte).strip().lower()
    return texte


class GanttDiagramme(models.Model):
    STATUT_CHOICES = [
        ('brouillon', 'Brouillon'),
        ('termine', 'Terminé'),
    ]
    ECHELLE_CHOICES = [
        ('jour', 'Jour'),
        ('semaine', 'Semaine'),
        ('mois', 'Mois'),
    ]

    nom = models.CharField(max_length=255, verbose_name="Nom du diagramme")
    description = models.TextField(blank=True, default='')
    chantier = models.ForeignKey(
        'api.Chantier',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='diagrammes_gantt',
        verbose_name="Chantier lié (optionnel)",
    )
    statut = models.CharField(
        max_length=20, choices=STATUT_CHOICES, default='brouillon'
    )
    echelle = models.CharField(
        max_length=10, choices=ECHELLE_CHOICES, default='semaine'
    )
    afficher_logo_client = models.BooleanField(
        default=False,
        verbose_name='Afficher le logo client dans le PDF',
    )
    logo_client_s3_key = models.CharField(
        max_length=500,
        blank=True,
        null=True,
        verbose_name='Clé S3 du logo client',
    )

    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='gantt_diagrammes_crees',
    )
    modified_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='gantt_diagrammes_modifies',
    )
    validated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='gantt_diagrammes_valides',
    )

    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)
    date_validation = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-date_modification']
        verbose_name = "Diagramme de Gantt"
        verbose_name_plural = "Diagrammes de Gantt"

    def __str__(self):
        return self.nom

    @property
    def date_debut(self):
        """Date de début la plus précoce parmi les lignes."""
        dates = [e.date_debut for e in self.elements.all() if e.date_debut]
        return min(dates) if dates else None

    @property
    def date_fin(self):
        """Date de fin la plus tardive parmi les lignes."""
        dates = [e.date_fin for e in self.elements.all() if e.date_fin]
        return max(dates) if dates else None


class GanttElement(models.Model):
    """Titre (section) ou ligne datée d'un diagramme.

    Un seul modèle pour les deux afin d'éviter deux tables et deux CRUD : un
    titre est un élément sans dates dont les lignes filles pointent via ``parent``.
    """

    TYPE_CHOICES = [
        ('titre', 'Titre'),
        ('ligne', 'Ligne'),
    ]

    diagramme = models.ForeignKey(
        GanttDiagramme, on_delete=models.CASCADE, related_name='elements'
    )
    type_element = models.CharField(
        max_length=10, choices=TYPE_CHOICES, default='ligne'
    )
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='enfants',
    )
    libelle = models.CharField(max_length=255, verbose_name="Désignation")
    date_debut = models.DateField(null=True, blank=True)
    date_fin = models.DateField(null=True, blank=True)
    couleur = models.CharField(max_length=7, default='#1976d2')
    ordre = models.IntegerField(default=0)
    commentaire = models.TextField(blank=True, default='')
    STYLE_BARRE_CHOICES = [
        ('plein', 'Plein'),
        ('leger', 'Léger'),
        ('degrade', 'Dégradé'),
        ('hachure', 'Hachuré'),
        ('hachure_croise', 'Hachure croisée'),
        ('rayures_v', 'Rayures verticales'),
        ('rayures_h', 'Rayures horizontales'),
        ('damier', 'Damier'),
        ('contour', 'Contour'),
        ('contour_epais', 'Contour épais'),
        ('double', 'Double contour'),
        ('pointille', 'Pointillé'),
        ('tirets', 'Tirets'),
        ('arrondi', 'Arrondi'),
        ('ombre', 'Ombre'),
        ('bord_gauche', 'Bord gauche'),
        ('bord_haut', 'Bord haut'),
        ('croix', 'Croisillons'),
    ]
    style_barre = models.CharField(
        max_length=20,
        choices=STYLE_BARRE_CHOICES,
        default='plein',
        verbose_name='Style de barre',
    )
    afficher_duree = models.BooleanField(
        null=True,
        blank=True,
        default=None,
        verbose_name="Afficher la durée sur la barre",
        help_text="Null = automatique selon la largeur, True/False = forcer l'affichage.",
    )

    class Meta:
        ordering = ['ordre', 'id']
        verbose_name = "Élément de diagramme"
        verbose_name_plural = "Éléments de diagramme"

    def __str__(self):
        return f"{self.get_type_element_display()} : {self.libelle}"


class GanttHistorique(models.Model):
    """Journal lisible des modifications, alimenté après validation du diagramme."""

    ACTION_CHOICES = [
        ('validation', 'Validation'),
        ('reouverture', 'Réouverture'),
        ('modif_diagramme', 'Modification du diagramme'),
        ('ajout_element', 'Ajout'),
        ('modif_element', 'Modification'),
        ('suppression_element', 'Suppression'),
    ]

    diagramme = models.ForeignKey(
        GanttDiagramme, on_delete=models.CASCADE, related_name='historique'
    )
    utilisateur = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True
    )
    date = models.DateTimeField(auto_now_add=True)
    action = models.CharField(max_length=30, choices=ACTION_CHOICES)
    description = models.TextField(
        help_text="Phrase lisible affichée telle quelle à l'utilisateur"
    )
    details = models.JSONField(null=True, blank=True)

    class Meta:
        ordering = ['-date', '-id']
        verbose_name = "Historique de diagramme"
        verbose_name_plural = "Historiques de diagramme"

    def __str__(self):
        return f"{self.date:%d/%m/%Y %H:%M} — {self.description}"


class GanttDesignation(models.Model):
    """Catalogue de désignations réutilisables pour accélérer la saisie.

    Volontairement sans clé étrangère depuis ``GanttElement`` : ce n'est qu'une
    source de suggestions. Supprimer une entrée n'affecte aucun diagramme.
    """

    TYPE_CHOICES = GanttElement.TYPE_CHOICES

    libelle = models.CharField(max_length=255)
    libelle_normalise = models.CharField(max_length=255, db_index=True)
    type_element = models.CharField(
        max_length=10, choices=TYPE_CHOICES, default='ligne'
    )
    couleur_defaut = models.CharField(max_length=7, blank=True, default='')
    nb_utilisations = models.IntegerField(default=1)
    derniere_utilisation = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True
    )

    class Meta:
        ordering = ['-nb_utilisations', '-derniere_utilisation']
        unique_together = [('libelle_normalise', 'type_element')]
        verbose_name = "Désignation Gantt"
        verbose_name_plural = "Désignations Gantt"

    def __str__(self):
        return self.libelle

    def save(self, *args, **kwargs):
        self.libelle_normalise = normaliser_libelle(self.libelle)
        super().save(*args, **kwargs)
