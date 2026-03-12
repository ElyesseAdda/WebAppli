import datetime
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class TitreRapport(models.Model):
    nom = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['nom']
        verbose_name = "Titre de rapport"
        verbose_name_plural = "Titres de rapport"

    def __str__(self):
        return self.nom


class Residence(models.Model):
    nom = models.CharField(max_length=255, verbose_name="Nom de la résidence")
    adresse = models.CharField(max_length=500, blank=True, default='', verbose_name="Adresse")
    client_societe = models.ForeignKey(
        'Societe', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='residences', verbose_name="Client / Bailleur"
    )
    chantier = models.ForeignKey(
        'Chantier', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='residences'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['nom']
        verbose_name = "Résidence"
        verbose_name_plural = "Résidences"

    def __str__(self):
        return self.nom


class RapportIntervention(models.Model):
    TYPE_CHOICES = [
        ('intervention', "Rapport d'intervention"),
        ('vigik_plus', 'Vigik+'),
    ]
    STATUT_CHOICES = [
        ('brouillon', 'Brouillon'),
        ('en_cours', 'En cours'),
        ('valide', 'Validé'),
    ]

    titre = models.ForeignKey(TitreRapport, on_delete=models.PROTECT, related_name='rapports')
    date = models.DateField(default=timezone.now)
    technicien = models.CharField(max_length=255, verbose_name="Technicien")
    objet_recherche = models.TextField(verbose_name="Objet de la recherche")
    resultat = models.TextField(blank=True, default='', verbose_name="Résultat")

    client_societe = models.ForeignKey(
        'Societe', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='rapports_intervention', verbose_name="Client / Bailleur"
    )
    chantier = models.ForeignKey(
        'Chantier', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='rapports_intervention'
    )

    residence = models.ForeignKey(
        Residence, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='rapports', verbose_name="Résidence"
    )
    logement = models.CharField(max_length=255, blank=True, default='', verbose_name="Logement")

    locataire_nom = models.CharField(max_length=100, blank=True, default='')
    locataire_prenom = models.CharField(max_length=100, blank=True, default='')
    locataire_telephone = models.CharField(max_length=20, blank=True, default='')
    locataire_email = models.EmailField(blank=True, default='')

    signature_s3_key = models.CharField(max_length=500, blank=True, default='')

    type_rapport = models.CharField(max_length=20, choices=TYPE_CHOICES, default='intervention')
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='brouillon')
    pdf_s3_key = models.CharField(max_length=500, blank=True, default='')

    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='rapports_crees')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-created_at']
        verbose_name = "Rapport d'intervention"
        verbose_name_plural = "Rapports d'intervention"

    def __str__(self):
        return f"Rapport {self.titre} - {self.date}"


class PrestationRapport(models.Model):
    rapport = models.ForeignKey(
        RapportIntervention, on_delete=models.CASCADE, related_name='prestations'
    )
    localisation = models.CharField(max_length=500, verbose_name="Localisation")
    probleme = models.TextField(verbose_name="Problème constaté")
    solution = models.TextField(verbose_name="Solution")
    commentaire = models.TextField(blank=True, default='')
    prestation_possible = models.BooleanField(default=True, verbose_name="Prestation possible")
    prestation_realisee = models.TextField(blank=True, default='', verbose_name="Prestations réalisées")
    ordre = models.IntegerField(default=0)

    class Meta:
        ordering = ['ordre']
        verbose_name = "Prestation de rapport"
        verbose_name_plural = "Prestations de rapport"

    def __str__(self):
        return f"Prestation {self.ordre} - {self.localisation}"


class PhotoRapport(models.Model):
    TYPE_PHOTO_CHOICES = [
        ('avant', 'Avant travaux'),
        ('en_cours', 'En cours de travaux'),
        ('apres', 'Après travaux'),
    ]

    prestation = models.ForeignKey(
        PrestationRapport, on_delete=models.CASCADE, related_name='photos'
    )
    s3_key = models.CharField(max_length=500)
    filename = models.CharField(max_length=255)
    type_photo = models.CharField(max_length=20, choices=TYPE_PHOTO_CHOICES, default='avant')
    date_photo = models.DateField(default=datetime.date.today, verbose_name="Date de la photo")
    ordre = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['type_photo', 'ordre']
        verbose_name = "Photo de rapport"
        verbose_name_plural = "Photos de rapport"

    def __str__(self):
        return f"{self.get_type_photo_display()} - {self.filename}"
