from django.db import models
from django.core.validators import RegexValidator, MinValueValidator, MaxValueValidator
from django.utils import timezone
from datetime import datetime, timedelta
from django.contrib.auth.models import User  # Si vous utilisez le modèle utilisateur intégré
from decimal import Decimal, ROUND_HALF_UP,InvalidOperation
from django.core.exceptions import ValidationError
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db.models.functions import TruncMonth
from datetime import date
from django.db.models import Sum


STATE_CHOICES = [
        ('Terminé', 'Terminé'),
        ('En Cours', 'En Cours'),
        ('Facturé', 'Facturé'),
    ]
TYPE_CHOICES = [
        ('Travaux', 'Travaux'),
    ]

# Create your models here.

class Client(models.Model):
    name = models.CharField(max_length=25)
    surname = models.CharField(max_length=25)
    client_mail = models.EmailField()
    phone_Number = models.IntegerField()
    

    def __str__(self):
        return f"{self.name} {self.surname}"
    
class Societe(models.Model):
    nom_societe = models.CharField(max_length=25,)
    ville_societe = models.CharField(max_length=100,)
    rue_societe = models.CharField(max_length=100,)
    rue_societe = models.CharField(max_length=100,)
    codepostal_societe = models.CharField(max_length=10,validators=[RegexValidator(regex=r'^\d{5}$',message='Le code postal doit être exactement 5 chiffres.',code='invalid_codepostal')],blank=True,null=True)
   #Change client_name to nom_contact
    client_name = models.ForeignKey(Client, on_delete=models.CASCADE)  # Association avec Client
    
    def __str__(self):
        return self.nom_societe
    

class Chantier(models.Model):
    chantier_name = models.CharField(max_length=255, unique=True)
    societe = models.ForeignKey(Societe, on_delete=models.CASCADE, related_name='chantiers', null=True)
    date_debut = models.DateField(auto_now_add=True)
    date_fin = models.DateField(auto_now_add=False, null=True)
    montant_ttc = models.FloatField(null=True)
    montant_ht = models.FloatField(null=True)
    state_chantier = models.CharField(max_length=20, choices=STATE_CHOICES, default='En Cours')
    ville = models.CharField(max_length=100)
    rue = models.CharField(max_length=100)
    code_postal = models.CharField(
        max_length=10,
        validators=[RegexValidator(
            regex=r'^\d{5}$',
            message='Le code postal doit être exactement 5 chiffres.',
            code='invalid_codepostal'
        )],
        blank=True,
        null=True
    )
    
    # Champs existants pour les coûts réels
    cout_materiel = models.FloatField(null=True)
    cout_main_oeuvre = models.FloatField(null=True)
    cout_sous_traitance = models.FloatField(null=True)
    
    # Nouveaux champs pour les coûts estimés
    cout_estime_main_oeuvre = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0,
        verbose_name="Coût estimé main d'œuvre"
    )
    cout_estime_materiel = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0,
        verbose_name="Coût estimé matériel"
    )
    marge_estimee = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0,
        verbose_name="Marge estimée"
    )
    
    description = models.TextField(null=True)
    taux_fixe = models.FloatField(null=True, blank=True)

    #Partie validation des informations
    @property
    def nombre_devis(self):
        return self.devis.count()
    
    @property
    def nombre_facture(self):
        return self.facture.count()
    
    def __str__(self):
        return f"Chantier {self.id} - {self.chantier_name}"

    @property
    def cout_main_oeuvre_total(self):
        # Somme du coût de toutes les présences sur ce chantier
        return sum(presence.cout_main_oeuvre for presence in self.presences.all())
    
    @property
    def cout_main_oeuvre_par_mois(self):
        qs = (
            LaborCost.objects
            .filter(chantier=self)
            .annotate(mois=TruncMonth('created_at'))
            .values('mois')
            .annotate(
                heures_normal=Sum('hours_normal'),
                heures_samedi=Sum('hours_samedi'),
                heures_dimanche=Sum('hours_dimanche'),
                heures_ferie=Sum('hours_ferie'),
                montant_normal=Sum('cost_normal'),
                montant_samedi=Sum('cost_samedi'),
                montant_dimanche=Sum('cost_dimanche'),
                montant_ferie=Sum('cost_ferie'),
            )
            .order_by('mois')
        )
        return [
            {
                'mois': x['mois'].strftime('%Y-%m'),
                'heures_normal': float(x['heures_normal'] or 0),
                'heures_samedi': float(x['heures_samedi'] or 0),
                'heures_dimanche': float(x['heures_dimanche'] or 0),
                'heures_ferie': float(x['heures_ferie'] or 0),
                'montant_normal': float(x['montant_normal'] or 0),
                'montant_samedi': float(x['montant_samedi'] or 0),
                'montant_dimanche': float(x['montant_dimanche'] or 0),
                'montant_ferie': float(x['montant_ferie'] or 0),
            }
            for x in qs
        ]

    def save(self, *args, **kwargs):
        # Si c'est une création et que le taux fixe n'est pas déjà renseigné
        if not self.pk and self.taux_fixe is None:
            try:
                taux_fixe_obj = TauxFixe.objects.first()
                if taux_fixe_obj:
                    self.taux_fixe = taux_fixe_obj.valeur
            except:
                self.taux_fixe = 20  # Valeur par défaut
        super().save(*args, **kwargs)


class AppelOffres(models.Model):
    STATUT_CHOICES = [
        ('en_attente', 'En attente validation'),
        ('refuse', 'Refusé'),
        ('valide', 'Validé'),
    ]
    
    # Champs identiques au modèle Chantier
    chantier_name = models.CharField(max_length=255, unique=True)
    societe = models.ForeignKey(Societe, on_delete=models.CASCADE, related_name='appels_offres', null=True)
    date_debut = models.DateField(auto_now_add=True)
    date_fin = models.DateField(auto_now_add=False, null=True)
    montant_ttc = models.FloatField(null=True)
    montant_ht = models.FloatField(null=True)
    state_chantier = models.CharField(max_length=20, choices=STATE_CHOICES, default='En Cours')
    ville = models.CharField(max_length=100)
    rue = models.CharField(max_length=100)
    code_postal = models.CharField(
        max_length=10,
        validators=[RegexValidator(
            regex=r'^\d{5}$',
            message='Le code postal doit être exactement 5 chiffres.',
            code='invalid_codepostal'
        )],
        blank=True,
        null=True
    )
    
    # Champs pour les coûts réels
    cout_materiel = models.FloatField(null=True)
    cout_main_oeuvre = models.FloatField(null=True)
    cout_sous_traitance = models.FloatField(null=True)
    
    # Champs pour les coûts estimés
    cout_estime_main_oeuvre = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0,
        verbose_name="Coût estimé main d'œuvre"
    )
    cout_estime_materiel = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0,
        verbose_name="Coût estimé matériel"
    )
    marge_estimee = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0,
        verbose_name="Marge estimée"
    )
    
    description = models.TextField(null=True)
    taux_fixe = models.FloatField(null=True, blank=True)
    
    # Champs spécifiques aux appels d'offres
    statut = models.CharField(
        max_length=20, 
        choices=STATUT_CHOICES, 
        default='en_attente',
        verbose_name="Statut de l'appel d'offres"
    )
    
    date_validation = models.DateField(null=True, blank=True)
    raison_refus = models.TextField(blank=True, null=True)
    
    def __str__(self):
        return f"Appel d'offres {self.id} - {self.chantier_name}"
    
    def transformer_en_chantier(self):
        """Transforme l'appel d'offres en chantier"""
        if self.statut != 'valide':
            raise ValueError("Seuls les appels d'offres validés peuvent être transformés en chantier")
        
        # Créer le chantier avec tous les champs de l'appel d'offres
        chantier = Chantier.objects.create(
            chantier_name=self.chantier_name,
            societe=self.societe,
            date_debut=self.date_debut,
            date_fin=self.date_fin,
            montant_ttc=self.montant_ttc,
            montant_ht=self.montant_ht,
            state_chantier='En Cours',
            ville=self.ville,
            rue=self.rue,
            code_postal=self.code_postal,
            cout_materiel=self.cout_materiel,
            cout_main_oeuvre=self.cout_main_oeuvre,
            cout_sous_traitance=self.cout_sous_traitance,
            cout_estime_main_oeuvre=self.cout_estime_main_oeuvre,
            cout_estime_materiel=self.cout_estime_materiel,
            marge_estimee=self.marge_estimee,
            description=self.description,
            taux_fixe=self.taux_fixe,
        )
        
        # Mettre à jour le statut de l'appel d'offres
        self.statut = 'valide'
        self.date_validation = timezone.now().date()
        self.save()
        
        return chantier

class Agent(models.Model):
    name = models.CharField(max_length=25)
    surname = models.CharField(max_length=25)
    address = models.CharField(max_length=100, blank=True, null=True)
    phone_Number = models.IntegerField()
    taux_Horaire = models.FloatField(null=True, blank=True)
    conge = models.FloatField(null=True, blank=True)
    
    # Modification du champ primes pour stocker par mois
    # Format: { "2024-01": { "description": montant }, "2024-02": { "description": montant } }
    primes = models.JSONField(default=dict, blank=True, null=True)
    
    # Nouveaux champs pour les heures de travail
    heure_debut = models.TimeField(null=True, blank=True)  # Heure de début de travail
    heure_fin = models.TimeField(null=True, blank=True)  # Heure de fin de travail
    heure_pause_debut = models.TimeField(null=True, blank=True)  # Heure de début de pause
    heure_pause_fin = models.TimeField(null=True, blank=True)  # Heure de fin de pause
    jours_travail = models.CharField(max_length=255, null=True, blank=True)  # Jours de travail sous forme de liste ou chaîne

    def __str__(self):
        return f'{self.name} {self.surname}'

    
    @property
    def heures_travail_journalieres(self):
        """ Calcule les heures de travail journalières en tenant compte des pauses """
        if self.heure_debut and self.heure_fin:
            debut = datetime.combine(datetime.today(), self.heure_debut)
            fin = datetime.combine(datetime.today(), self.heure_fin)
            heures_travail = (fin - debut).total_seconds() / 3600  # Convertir en heures

            if self.heure_pause_debut and self.heure_pause_fin:
                pause_debut = datetime.combine(datetime.today(), self.heure_pause_debut)
                pause_fin = datetime.combine(datetime.today(), self.heure_pause_fin)
                pause = (pause_fin - pause_debut).total_seconds() / 3600  # Convertir en heures
                heures_travail -= pause

            return max(0, heures_travail)  # S'assurer que le résultat n'est pas négatif
        return 0


class MonthlyPresence(models.Model):
    agent = models.ForeignKey(Agent, on_delete=models.CASCADE)
    month = models.DateField()  # Utilisez le premier jour du mois pour représenter le mois
    days_present = models.IntegerField(default=0)


class MonthlyHours(models.Model):
    agent = models.ForeignKey(Agent, on_delete=models.CASCADE, related_name='monthly_hours')
    month = models.DateField(default=timezone.now)
    hours = models.DecimalField(max_digits=6, decimal_places=2)
    
    class Meta:
        unique_together = ('agent', 'month')

class Presence(models.Model):
    agent = models.ForeignKey(Agent, on_delete=models.CASCADE, related_name='presences')
    chantier = models.ForeignKey(Chantier, on_delete=models.CASCADE, related_name='presences', null=True, blank=True)
    date = models.DateField()
    heures_travail = models.FloatField()  # Heures travaillées ce jour-là

    def __str__(self):
        return f'{self.agent.name} {self.agent.surname} - {self.chantier.nom} ({self.date})'

    @property
    def cout_main_oeuvre(self):
        # Calculer le coût pour cette journée de travail
        return self.heures_travail * self.agent.taux_Horaire

    @property
    def taux_horaire_ajusté(self):
        # Augmentation de 25% pour le samedi et 50% pour le dimanche
        if self.date.weekday() == 5:  # Samedi
            return self.agent.taux_Horaire * 1.25
        elif self.date.weekday() == 6:  # Dimanche
            return self.agent.taux_Horaire * 1.50
        return self.agent.taux_Horaire

    @property
    def cout_main_oeuvre(self):
        # Calcul du coût basé sur le taux horaire ajusté
        return self.heures_travail * self.taux_horaire_ajusté

# Ajout des choix pour les types et sous-types d'événements
EVENT_TYPE_CHOICES = [
    ('presence', 'Présence'),
    ('absence', 'Absence'),
    ('conge', 'Congé'),
    ('modification_horaire', 'Horaire Modifié'),
]

EVENT_SUBTYPE_CHOICES = [
    # Absences
    ('justifiee', 'Justifiée'),
    ('injustifiee', 'Injustifiée'),
    ('maladie', 'Maladie'),
    ('rtt', 'RTT'),
    # Congés
    ('paye', 'Payé'),
    ('sans_solde', 'Sans solde'),
    ('parental', 'Parental'),
    ('maternite', 'Maternité'),
    ('paternite', 'Paternité'),
    # Autres
    (None, 'Aucun'),
]

class Event(models.Model):
    agent = models.ForeignKey('Agent', on_delete=models.CASCADE)
    start_date = models.DateField()
    end_date = models.DateField()
    event_type = models.CharField(max_length=30, choices=EVENT_TYPE_CHOICES,default='absence')
    subtype = models.CharField(max_length=30, choices=EVENT_SUBTYPE_CHOICES, blank=True, null=True)
    hours_modified = models.IntegerField(default=0)
    chantier = models.ForeignKey('Chantier', on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        label = dict(EVENT_TYPE_CHOICES).get(self.event_type, self.event_type)
        sublabel = dict(EVENT_SUBTYPE_CHOICES).get(self.subtype, self.subtype)
        return f"{self.agent} - {label} ({sublabel}) du {self.start_date} au {self.end_date}"

class Stock(models.Model):
    code_produit = models.CharField(max_length=50, unique=True, default='')
    designation = models.CharField(max_length=50)
    fournisseur = models.ForeignKey(
        'Fournisseur',
        on_delete=models.CASCADE,
        related_name='produits'
    )
    prix_unitaire = models.FloatField(default=0)
    unite = models.CharField(max_length=50)
    


    def __str__(self):
        return self.nom_materiel 


class StockHistory(models.Model):
    stock = models.ForeignKey(Stock, on_delete=models.CASCADE)  # Lien avec Stock
    quantite = models.IntegerField()
    type_operation = models.CharField(max_length=10, choices=[('ajout', 'Ajout'), ('retrait', 'Retrait')])
    date_operation = models.DateTimeField(auto_now_add=True)
    agent = models.ForeignKey('Agent', on_delete=models.SET_NULL, null=True, blank=True)
    chantier = models.ForeignKey('Chantier', on_delete=models.SET_NULL, null=True, blank=True)
    montant = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.type_operation} - {self.stock.nom_materiel} - {self.quantite}"

    @property
    def montant_total(self):
        # Calculer le montant total basé sur le prix unitaire du produit et la quantité
        return self.quantite * self.stock.prix_unitaire

class StockMovement(models.Model):
    stock = models.ForeignKey(Stock, on_delete=models.CASCADE, related_name='mouvements')
    mouvement_type = models.CharField(max_length=10, choices=[('entree', 'Entrée'), ('sortie', 'Sortie')])
    quantite = models.PositiveIntegerField()
    date_mouvement = models.DateTimeField(auto_now_add=True)
    chantier = models.ForeignKey(Chantier, on_delete=models.SET_NULL, null=True, blank=True)
    agent = models.ForeignKey(Agent, on_delete=models.SET_NULL, null=True, blank=True)
    commentaire = models.TextField(null=True, blank=True)  # Pour ajouter des détails supplémentaires

    @property
    def montant_total(self):
        return self.quantite * self.stock.prix_unitaire

    def __str__(self):
        return f"{self.mouvement_type} de {self.quantite} pour {self.stock.nom_materiel} le {self.date_mouvement}"

        
class Fournisseur(models.Model):
    name = models.CharField(max_length=25)
    Fournisseur_mail = models.EmailField(blank=True, null=True)
    phone_Number = models.CharField(max_length=15, blank=True, null=True)
    description_fournisseur = models.CharField(max_length=250, blank=True, null=True)
    magasin = models.CharField(max_length=250, blank=True, null=True)


class Materiel_produit(models.Model):
    name_produit = models.CharField(max_length=25,)
    description_produit = models.CharField(max_length=250,)
    price_ht = models.FloatField()
    name_fournisseur = models.CharField(max_length=25,)


class Devis(models.Model):
    numero = models.CharField(max_length=50, unique=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    price_ht = models.FloatField()
    price_ttc = models.FloatField()
    tva_rate = models.FloatField()
    nature_travaux = models.CharField(max_length=255, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATE_CHOICES, default='En Cours')
    chantier = models.ForeignKey(Chantier, on_delete=models.CASCADE, related_name='devis', null=True, blank=True)
    appel_offres = models.ForeignKey(AppelOffres, on_delete=models.CASCADE, related_name='devis', null=True, blank=True)
    client = models.ManyToManyField(Client, related_name='devis', blank=True)
    lignes_speciales = models.JSONField(default=dict, blank=True)
    lignes_display = models.JSONField(default=dict, blank=True)  # Lignes spéciales de type 'display' uniquement
    devis_chantier = models.BooleanField(default=False)  # Nouveau champ

    def save_special_lines(self, special_lines_data):
        self.lignes_speciales = {
            'global': special_lines_data.get('global', []),
            'parties': special_lines_data.get('parties', {}),
            'sousParties': special_lines_data.get('sousParties', {})
        }
        self.save()

    def __str__(self):
        return f"Devis {self.numero} - {self.chantier.chantier_name}"

class TauxFixe(models.Model):
    valeur = models.DecimalField(max_digits=5, decimal_places=2, default=19)
    date_modification = models.DateTimeField(auto_now=True)
    annee = models.PositiveIntegerField(unique=True)

    def save(self, *args, **kwargs):
        # Sauvegarder le nouveau taux
        super().save(*args, **kwargs)
        # Mettre à jour tous les prix des lignes détails
        LigneDetail.objects.all().update(taux_fixe=self.valeur)
        # Recalculer les prix pour toutes les lignes
        for ligne in LigneDetail.objects.all():
            ligne.calculer_prix()
            ligne.save(update_fields=['prix'])
    class Meta:
        get_latest_by = 'date_modification'
    def __str__(self):
        return f"{self.annee}: {self.valeur}%"

class LigneDetail(models.Model):
    sous_partie = models.ForeignKey('SousPartie', related_name='lignes_details', on_delete=models.CASCADE)
    partie = models.ForeignKey('Partie', related_name='lignes_details', on_delete=models.CASCADE, null=True, blank=True)
    description = models.CharField(max_length=255)
    unite = models.CharField(max_length=10)
    # Nouveaux champs pour la décomposition du prix
    cout_main_oeuvre = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    cout_materiel = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    taux_fixe = models.DecimalField(max_digits=5, decimal_places=2, default=0)  # en pourcentage
    marge = models.DecimalField(max_digits=5, decimal_places=2, default=0)  # en pourcentage
    prix = models.DecimalField(max_digits=10, decimal_places=2)

    def calculer_prix(self):
        base = self.cout_main_oeuvre + self.cout_materiel
        montant_taux_fixe = base * (self.taux_fixe / Decimal('100'))
        sous_total = base + montant_taux_fixe
        montant_marge = sous_total * (self.marge / Decimal('100'))
        self.prix = sous_total + montant_marge

    def save(self, *args, **kwargs):
        if not self.taux_fixe:
            # Utiliser le dernier taux fixe enregistré
            dernier_taux = TauxFixe.objects.latest()
            self.taux_fixe = dernier_taux.valeur
        self.calculer_prix()
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.description} ({self.unite}) - {self.prix} €'
    
class Facture(models.Model):
    FACTURE_STATUS = [
        ('En cours', 'En cours'),
        ('En attente', 'En attente'),
        ('Attente paiement', 'Attente paiement'),
        ('Payée', 'Payée')
    ]

    FACTURE_TYPE = [
        ('classique', 'Classique'),
        ('ts', 'Travaux Supplémentaires'),
        ('cie', 'CIE')  # Ajout du type CIE
    ]

    numero = models.CharField(max_length=50, unique=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    devis = models.ForeignKey(Devis, on_delete=models.CASCADE, related_name='factures')
    chantier = models.ForeignKey('Chantier', on_delete=models.CASCADE, related_name='factures')
    state_facture = models.CharField(max_length=20, choices=FACTURE_STATUS, default='En attente')
    type_facture = models.CharField(max_length=20, choices=FACTURE_TYPE, default='classique')
    designation = models.CharField(max_length=255, blank=True)
    date_echeance = models.DateField(null=True, blank=True)
    date_paiement = models.DateField(null=True, blank=True)
    mode_paiement = models.CharField(max_length=50, default='virement')
    price_ht = models.FloatField()
    price_ttc = models.FloatField()
    avenant = models.ForeignKey('Avenant', on_delete=models.SET_NULL, null=True, blank=True)
    
    # Champs spécifiques pour les factures CIE
    mois_situation = models.IntegerField(null=True, blank=True)  # 1-12 pour le mois
    annee_situation = models.IntegerField(null=True, blank=True)  # année de la situation

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=models.Q(
                    type_facture='cie',
                    mois_situation__isnull=False,
                    annee_situation__isnull=False
                ) | ~models.Q(type_facture='cie'),
                name='cie_requires_situation_date'
            )
        ]

    def save(self, *args, **kwargs):
        if self.type_facture == 'cie' and (not self.mois_situation or not self.annee_situation):
            raise ValidationError("Les factures CIE doivent avoir un mois et une année de situation")
        if self.devis and not self.id:  # Seulement lors de la création
            self.price_ht = self.devis.price_ht
            self.price_ttc = self.devis.price_ttc
            self.chantier = self.devis.chantier
        super().save(*args, **kwargs)

    @property
    def tva_rate(self):
        return self.devis.tva_rate

    @property
    def lignes(self):
        return self.devis.lignes

    @property
    def lignes_speciales(self):
        return self.devis.lignes_speciales

class DevisLigne(models.Model):
    devis = models.ForeignKey(Devis, on_delete=models.CASCADE, related_name='lignes')
    ligne_detail = models.ForeignKey(LigneDetail, on_delete=models.CASCADE)
    quantite = models.DecimalField(max_digits=10, decimal_places=2)
    prix_unitaire = models.DecimalField(max_digits=10, decimal_places=2)
    
    @property
    def total_ht(self):
        return self.quantite * self.prix_unitaire

    def __str__(self):
        return f"{self.ligne_detail.description} - {self.quantite} x {self.prix_unitaire}€"

    

class Banque(models.Model):
    nom_banque = models.CharField(max_length=100, unique=True, verbose_name="Nom de la banque")
    
    class Meta:
        verbose_name = "Banque"
        verbose_name_plural = "Banques"
        ordering = ['nom_banque']
    
    def __str__(self):
        return self.nom_banque

class Situation(models.Model):
    STATUT_CHOICES = [
        ('brouillon', 'Brouillon'),
        ('validee', 'Validée'),
        ('facturee', 'Facturée')
    ]

    chantier = models.ForeignKey('Chantier', on_delete=models.CASCADE)
    devis = models.ForeignKey('Devis', on_delete=models.CASCADE)
    numero = models.IntegerField(default=1,null=True,blank=True)
    numero_situation = models.CharField(max_length=50)
    numero_cp = models.CharField(max_length=50, blank=True, null=True, verbose_name="Numéro CP")
    banque = models.ForeignKey('Banque', on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Banque de paiement")
    mois = models.IntegerField()
    annee = models.IntegerField()
    date_creation = models.DateTimeField(auto_now_add=True)
    date_validation = models.DateTimeField(null=True, blank=True)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='brouillon')
    date_envoi = models.DateField(null=True, blank=True)
    delai_paiement = models.IntegerField(default=45,null=True,blank=True)
    montant_reel_ht = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    date_paiement_reel = models.DateField(null=True, blank=True)
    
    # Montants calculés
    montant_precedent = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    montant_ht_mois = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    montant_total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    pourcentage_avancement = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    montant_total_travaux = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    montant_total_devis = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    montant_total_cumul_ht = models.DecimalField(max_digits=10, decimal_places=2, default=0)


    
    # Renommer ces champs pour correspondre au frontend
    cumul_precedent = models.DecimalField(max_digits=10, decimal_places=2, default=0)  # au lieu de cumul_mois_precedent
    montant_apres_retenues = models.DecimalField(max_digits=10, decimal_places=2, default=0)  # au lieu de montant_total_mois_apres_retenue
    
    # Nouveaux champs
    montant_total_cumul_ht = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tva = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Déductions standard
    retenue_garantie = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    taux_prorata = models.DecimalField(max_digits=5, decimal_places=2, default=2.50)
    montant_prorata = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    retenue_cie = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # Traçabilité
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='situations_created'
    )
    validated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='situations_validated'
    )

    # Ajout des nouveaux champs
    montant_total_devis = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    montant_total_travaux = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_avancement = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    class Meta:
        ordering = ['-annee', '-mois']
        unique_together = ['chantier', 'mois', 'annee']

    def __str__(self):
        return f"Situation {self.numero_situation} - {self.chantier.chantier_name} ({self.mois}/{self.annee})"

class SituationLigne(models.Model):
    situation = models.ForeignKey('Situation', 
                                related_name='lignes',
                                on_delete=models.CASCADE)
    ligne_devis = models.ForeignKey('DevisLigne', on_delete=models.CASCADE, null=True, blank=True)
    description = models.CharField(max_length=255)
    quantite = models.DecimalField(max_digits=10, decimal_places=2)
    prix_unitaire = models.DecimalField(max_digits=10, decimal_places=2)
    total_ht = models.DecimalField(max_digits=10, decimal_places=2)
    pourcentage_precedent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    pourcentage_actuel = models.DecimalField(max_digits=5, decimal_places=2)
    montant = models.DecimalField(max_digits=10, decimal_places=2)

    def clean(self):
        if not self.ligne_devis:
            raise ValidationError("Une ligne doit être associée à une ligne de devis")

class SituationLigneAvenant(models.Model):
    situation = models.ForeignKey('Situation',
                                related_name='lignes_avenant',
                                on_delete=models.CASCADE)
    avenant = models.ForeignKey('Avenant', on_delete=models.CASCADE)
    facture_ts = models.ForeignKey('FactureTS', on_delete=models.CASCADE)
    montant_ht = models.DecimalField(max_digits=10, decimal_places=2)
    pourcentage_precedent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    pourcentage_actuel = models.DecimalField(max_digits=5, decimal_places=2)
    montant = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        ordering = ['id']

class SituationLigneSupplementaire(models.Model):
    situation = models.ForeignKey('Situation',
                                related_name='lignes_supplementaires',
                                on_delete=models.CASCADE)
    description = models.CharField(max_length=255)
    montant = models.DecimalField(max_digits=10, decimal_places=2)
    type = models.CharField(max_length=20, choices=[('deduction', 'Déduction'), ('ajout', 'Ajout')], default='deduction')
    
    class Meta:
        ordering = ['id']

class Quitus(models.Model):
    chantier = models.ForeignKey(Chantier, on_delete=models.CASCADE, related_name='quitus', null=True)
    client = models.ManyToManyField(Client, related_name='quitus', blank=True)  # Modification ici
    state_quitus = models.CharField(max_length=20, choices=STATE_CHOICES, default='En Cours')
    description_quitus = models.CharField(max_length=250)

    def __str__(self):
        return f"Quitus {self.id}"

class Partie(models.Model):
    titre = models.CharField(max_length=500, null=False, blank=False)

    def __str__(self):
        # Assurez-vous que "titre" n'est pas None avant de l'afficher
        return self.titre if self.titre else "Partie sans titre"


class SousPartie(models.Model):
    partie = models.ForeignKey(Partie, related_name='sous_parties', on_delete=models.CASCADE)
    description = models.CharField(max_length=255, null=False, blank=False)

    def __str__(self):
        return f'{self.description} - {self.partie.titre}'

    def nombre_lignes_details(self):
        return self.lignes_details.count()
    
class Schedule(models.Model):
    agent = models.ForeignKey(Agent, on_delete=models.CASCADE)
    week = models.IntegerField()
    year = models.IntegerField(default=timezone.now().year)
    day = models.CharField(max_length=10)  # "Lundi", "Mardi", etc.
    hour = models.CharField(max_length=10)  # "06:00", "07:00", etc.
    chantier = models.ForeignKey(Chantier, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        unique_together = ('agent', 'week', 'year', 'day', 'hour')

    def __str__(self):
        return f"{self.agent.name} - Semaine {self.week}, {self.year} - {self.day} {self.hour}"

# Adapter recalculate_labor_costs_for_period pour ne plus utiliser 'hours' et 'cost' mais la nouvelle structure

def recalculate_labor_costs_for_period(week=None, year=None, agent_id=None, chantier_id=None):
    schedules = Schedule.objects.all()
    if week:
        schedules = schedules.filter(week=week)
    if year:
        schedules = schedules.filter(year=year)
    if agent_id:
        schedules = schedules.filter(agent_id=agent_id)
    if chantier_id:
        schedules = schedules.filter(chantier_id=chantier_id)

    data = {}
    for s in schedules:
        key = (s.agent_id, s.chantier_id, s.week, s.year)
        data.setdefault(key, 0)
        data[key] += 1

    from .models import Agent, Chantier, LaborCost  # Import local pour éviter la boucle
    for (agent_id, chantier_id, week, year), hours in data.items():
        agent = Agent.objects.get(id=agent_id)
        chantier = Chantier.objects.get(id=chantier_id)
        # Ici, on suppose que toutes les heures sont normales (à adapter si planning détaillé)
        LaborCost.objects.update_or_create(
            agent=agent, chantier=chantier, week=week, year=year,
            defaults={
                'hours_normal': hours,
                'hours_samedi': 0,
                'hours_dimanche': 0,
                'hours_ferie': 0,
                'cost_normal': hours * (agent.taux_Horaire or 0),
                'cost_samedi': 0,
                'cost_dimanche': 0,
                'cost_ferie': 0,
                'details_majoration': [],
            }
        )

@receiver([post_save, post_delete], sender=Schedule)
def recalc_labor_cost_on_schedule_change(sender, instance, **kwargs):
    week = instance.week
    year = instance.year
    agent_id = instance.agent_id
    chantier_id = instance.chantier_id
    recalculate_labor_costs_for_period(week, year, agent_id, chantier_id)

class LaborCost(models.Model):
    agent = models.ForeignKey('Agent', on_delete=models.CASCADE, related_name='labor_costs')
    chantier = models.ForeignKey('Chantier', on_delete=models.CASCADE, related_name='labor_costs')
    week = models.IntegerField()
    year = models.IntegerField()
    # Heures par type
    hours_normal = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Heures normales (hors samedi/dimanche/férié)")
    hours_samedi = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Heures effectuées le samedi")
    hours_dimanche = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Heures effectuées le dimanche")
    hours_ferie = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Heures effectuées les jours fériés")
    # Coûts par type
    cost_normal = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Coût des heures normales")
    cost_samedi = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Coût des heures samedi (majoration)")
    cost_dimanche = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Coût des heures dimanche (majoration)")
    cost_ferie = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Coût des heures férié (majoration)")
    # Détail des jours majorés (liste de dicts : date, type, hours, taux)
    details_majoration = models.JSONField(default=list, blank=True, help_text="Détail des jours avec majoration (samedi, dimanche, férié)")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('agent', 'chantier', 'week', 'year')
        indexes = [
            models.Index(fields=['agent', 'week', 'year']),
            models.Index(fields=['chantier', 'week', 'year']),
        ]

    def __str__(self):
        return f"{self.agent.name} - {self.chantier.chantier_name} - S{self.week}/{self.year}"



class FactureLigne(models.Model):
    facture = models.ForeignKey(Facture, on_delete=models.CASCADE, related_name='lignes_details')
    ligne_detail = models.ForeignKey(LigneDetail, on_delete=models.CASCADE)
    quantite = models.DecimalField(max_digits=10, decimal_places=2)
    prix_unitaire = models.DecimalField(max_digits=10, decimal_places=2)
    total_ht = models.DecimalField(max_digits=10, decimal_places=2)

    def save(self, *args, **kwargs):
        self.total_ht = self.quantite * self.prix_unitaire
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.ligne_detail.description} - {self.quantite} x {self.prix_unitaire}€"




class FacturePartie(models.Model):
    facture = models.ForeignKey('Facture', on_delete=models.CASCADE, related_name='parties')
    titre = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    ordre = models.IntegerField(default=0)

class FactureSousPartie(models.Model):
    partie = models.ForeignKey(FacturePartie, on_delete=models.CASCADE, related_name='sous_parties')
    description = models.TextField()
    ordre = models.IntegerField(default=0)

class FactureLigneDetail(models.Model):
    sous_partie = models.ForeignKey(FactureSousPartie, on_delete=models.CASCADE, related_name='lignes_details')
    description = models.TextField()
    unite = models.CharField(max_length=50)
    quantite = models.DecimalField(max_digits=10, decimal_places=2)
    prix_unitaire = models.DecimalField(max_digits=10, decimal_places=2)

class BonCommande(models.Model):
    STATUT_CHOICES = [
        ('en_attente', 'En attente Livraison'),
        ('livre_chantier', 'Livré Chantier'),
        ('retrait_magasin', 'Retrait Magasin'),
    ]
    
    STATUT_PAIEMENT_CHOICES = [
        ('non_paye', 'Non Payé'),
        ('paye', 'Payé'),
        ('paye_partiel', 'Payé Partiellement'),
    ]
    
    numero = models.CharField(max_length=50, unique=True)
    fournisseur = models.CharField(max_length=100)
    chantier = models.ForeignKey(Chantier, on_delete=models.CASCADE)
    agent = models.ForeignKey(Agent, on_delete=models.CASCADE)
    montant_total = models.DecimalField(max_digits=10, decimal_places=2)
    date_creation = models.DateTimeField(auto_now_add=True)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='en_attente')
    date_livraison = models.DateField(null=True, blank=True)
    magasin_retrait = models.CharField(max_length=200, null=True, blank=True)
    date_commande = models.DateField(default='2025-01-01')  # Ajout du champ de date avec une valeur par défaut

    # Nouveaux champs pour le paiement
    statut_paiement = models.CharField(
        max_length=20, 
        choices=STATUT_PAIEMENT_CHOICES, 
        default='non_paye'
    )
    montant_paye = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0
    )
    date_paiement = models.DateField(null=True, blank=True)
    mode_paiement = models.CharField(max_length=50, null=True, blank=True)

    def __str__(self):
        return self.numero

    @property
    def reste_a_payer(self):
        return self.montant_total - self.montant_paye

class LigneBonCommande(models.Model):
    bon_commande = models.ForeignKey(BonCommande, related_name='lignes', on_delete=models.CASCADE)
    produit = models.ForeignKey(Stock, on_delete=models.CASCADE)
    # Ces champs sont personnalisables et peuvent être modifiés à la création du bon de commande
    designation = models.CharField(max_length=255)  # Peut être modifiée par l'utilisateur
    quantite = models.IntegerField()  # Peut être modifiée par l'utilisateur
    prix_unitaire = models.DecimalField(max_digits=10, decimal_places=2)  # Peut être modifié par l'utilisateur
    total = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.designation} - {self.quantite} x {self.prix_unitaire}€"

    def save(self, *args, **kwargs):
        # Calculer automatiquement le total
        self.total = self.quantite * self.prix_unitaire
        super().save(*args, **kwargs)

class FournisseurMagasin(models.Model):
    fournisseur = models.CharField(max_length=100)
    magasin = models.CharField(max_length=200)
    derniere_utilisation = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('fournisseur', 'magasin')
        ordering = ['-derniere_utilisation']

    def __str__(self):
        return f"{self.fournisseur} - {self.magasin}"

class Parametres(models.Model):
    code = models.CharField(max_length=50, unique=True)
    valeur = models.DecimalField(max_digits=5, decimal_places=2)
    description = models.CharField(max_length=255, blank=True)
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Paramètre"
        verbose_name_plural = "Paramètres"

    def __str__(self):
        return f"{self.code}: {self.valeur}"

class Avenant(models.Model):
    chantier = models.ForeignKey('Chantier', on_delete=models.CASCADE, related_name='avenants')
    numero = models.IntegerField()  # Numéro séquentiel de l'avenant pour ce chantier
    date_creation = models.DateTimeField(auto_now_add=True)
    montant_total = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    class Meta:
        unique_together = ('chantier', 'numero')  # Garantit l'unicité du numéro d'avenant par chantier
        ordering = ['numero']

    def __str__(self):
        return f"Avenant n°{self.numero} - {self.chantier}"

class FactureTS(models.Model):
    devis = models.OneToOneField('Devis', on_delete=models.CASCADE, related_name='facture_ts')
    chantier = models.ForeignKey('Chantier', on_delete=models.CASCADE, related_name='factures_ts')
    avenant = models.ForeignKey(Avenant, on_delete=models.CASCADE, related_name='factures_ts')
    numero_ts = models.IntegerField()  # Numéro séquentiel du TS pour ce chantier
    designation = models.CharField(max_length=255, blank=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    montant_ht = models.DecimalField(max_digits=10, decimal_places=2)
    montant_ttc = models.DecimalField(max_digits=10, decimal_places=2)
    tva_rate = models.DecimalField(max_digits=5, decimal_places=2)

    class Meta:
        unique_together = ('chantier', 'numero_ts')  # Garantit l'unicité du numéro TS par chantier
        ordering = ['numero_ts']

    def __str__(self):
        return f"{self.devis.numero} - TS n°{self.numero_ts:03d}"

    def save(self, *args, **kwargs):
        # Mettre à jour le montant total de l'avenant
        super().save(*args, **kwargs)
        self.avenant.montant_total = self.avenant.factures_ts.aggregate(
            total=models.Sum('montant_ht')
        )['total'] or 0
        self.avenant.save()

    @property
    def numero_complet(self):
        """Retourne le numéro complet formaté : DEV-001-25 - TS n°001 - Désignation"""
        base = f"{self.devis.numero}"
        if self.designation:
            return f"{base} - {self.designation}"
        return base

class ChantierLigneSupplementaire(models.Model):
    chantier = models.ForeignKey('Chantier', on_delete=models.CASCADE, related_name='lignes_supplementaires_default')
    description = models.CharField(max_length=255)
    montant = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    class Meta:
        ordering = ['id']

class SituationFactureCIE(models.Model):
    situation = models.ForeignKey('Situation', on_delete=models.CASCADE)
    facture = models.ForeignKey('Facture', on_delete=models.CASCADE)
    montant_ht = models.DecimalField(max_digits=10, decimal_places=2)

class AgencyExpense(models.Model):
    EXPENSE_TYPES = [
        ('fixed', 'Mensuel fixe'),
        ('punctual', 'Ponctuel')
    ]
    
    description = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    type = models.CharField(max_length=10, choices=EXPENSE_TYPES)
    date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    category = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"{self.description} - {self.amount}€ ({self.get_type_display()})"

class AgencyExpenseOverride(models.Model):
    expense = models.ForeignKey(AgencyExpense, on_delete=models.CASCADE, related_name='overrides')
    month = models.IntegerField()
    year = models.IntegerField()
    description = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        unique_together = ('expense', 'month', 'year')


class AgencyExpenseAggregate(models.Model):
    year = models.IntegerField()
    month = models.IntegerField()  # 1-12
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    totals_by_category = models.JSONField(default=list, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('year', 'month')
        ordering = ['year', 'month']
        indexes = [
            models.Index(fields=['year', 'month'])
        ]

    def __str__(self):
        return f"{self.year}-{self.month:02d}: {self.total_amount} €"


def compute_agency_expense_aggregate_for_month(year: int, month: int):
    """Compute and persist AgencyExpenseAggregate for a given year/month."""
    from calendar import monthrange
    first_day = date(year, month, 1)
    last_day = date(year, month, monthrange(year, month)[1])

    # Fixed expenses active in the month
    fixed_qs = AgencyExpense.objects.filter(
        type='fixed',
        date__lte=last_day
    ).filter(models.Q(end_date__isnull=True) | models.Q(end_date__gte=first_day))

    # Punctual expenses in the month
    punctual_qs = AgencyExpense.objects.filter(
        type='punctual',
        date__year=year,
        date__month=month
    )

    expenses = list(fixed_qs) + list(punctual_qs)

    totals_by_category = {}
    total_amount = Decimal('0.00')

    for exp in expenses:
        override = AgencyExpenseOverride.objects.filter(expense=exp, month=month, year=year).first()
        amount = Decimal(str(override.amount)) if override else Decimal(str(exp.amount))
        cat = exp.category or 'Autres'
        totals_by_category.setdefault(cat, Decimal('0.00'))
        totals_by_category[cat] += amount
        total_amount += amount

    totals_list = [
        {
            'category': cat,
            'total': float(val)
        } for cat, val in totals_by_category.items()
    ]

    obj, _ = AgencyExpenseAggregate.objects.update_or_create(
        year=year,
        month=month,
        defaults={
            'total_amount': total_amount,
            'totals_by_category': totals_list,
        }
    )
    return obj


def _iter_months(start_date: date, end_date: date):
    y, m = start_date.year, start_date.month
    while (y < end_date.year) or (y == end_date.year and m <= end_date.month):
        yield y, m
        m += 1
        if m > 12:
            m = 1
            y += 1


@receiver([post_save, post_delete], sender=AgencyExpense)
def recalc_aggregates_on_expense_change(sender, instance: AgencyExpense, **kwargs):
    """Recompute impacted months when a base expense changes."""
    try:
        if instance.type == 'fixed':
            start = instance.date
            # Cap the recompute horizon to 24 months ahead if no end_date to avoid infinite span
            horizon_end = instance.end_date or (start.replace(year=start.year + 2))
            from calendar import monthrange
            # Ensure horizon_end is not before start
            if horizon_end < start:
                horizon_end = start
            # Iterate months and recompute
            for y, m in _iter_months(start, horizon_end):
                compute_agency_expense_aggregate_for_month(y, m)
        else:
            # punctual: only its month
            compute_agency_expense_aggregate_for_month(instance.date.year, instance.date.month)
    except Exception:
        # Avoid breaking save path on aggregate errors
        pass


@receiver([post_save, post_delete], sender=AgencyExpenseOverride)
def recalc_aggregates_on_override_change(sender, instance: AgencyExpenseOverride, **kwargs):
    try:
        compute_agency_expense_aggregate_for_month(instance.year, instance.month)
    except Exception:
        pass

class SousTraitant(models.Model):
    entreprise = models.CharField(max_length=255)
    capital = models.DecimalField(max_digits=15, decimal_places=2)
    adresse = models.CharField(max_length=255)
    code_postal = models.CharField(max_length=10)
    ville = models.CharField(max_length=100)
    forme_juridique = models.CharField(max_length=100, default="SARL")
    numero_rcs = models.CharField(max_length=100, unique=True)
    representant = models.CharField(max_length=255)
    email = models.EmailField(max_length=254, blank=True, null=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.entreprise} - {self.numero_rcs}"

class ContratSousTraitance(models.Model):
    TYPE_CHOICES = [
        ('BTP', 'BTP'),
        ('NETTOYAGE', 'Nettoyage'),
    ]

    chantier = models.ForeignKey('Chantier', on_delete=models.CASCADE, related_name='contrats_sous_traitance')
    sous_traitant = models.ForeignKey(SousTraitant, on_delete=models.CASCADE, related_name='contrats')
    type_contrat = models.CharField(max_length=20, choices=TYPE_CHOICES, default='NETTOYAGE')
    description_prestation = models.TextField()
    date_debut = models.DateField()
    duree = models.CharField(max_length=100, default="Jusqu'à livraison du chantier")
    adresse_prestation = models.CharField(max_length=255)
    nom_operation = models.CharField(max_length=255)
    montant_operation = models.DecimalField(max_digits=10, decimal_places=2)
    nom_maitre_ouvrage = models.CharField(max_length=255, verbose_name="Nom du maître d'ouvrage")
    nom_maitre_oeuvre = models.CharField(max_length=255, verbose_name="Nom du maître d'œuvre")
    date_creation = models.DateField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('chantier', 'sous_traitant')
        ordering = ['-date_creation']

    def __str__(self):
        return f"Contrat {self.sous_traitant.entreprise} - {self.chantier.chantier_name}"

    def save(self, *args, **kwargs):
        from decimal import Decimal
        # Si c'est une modification, on soustrait l'ancien montant
        if self.pk:
            old_instance = ContratSousTraitance.objects.get(pk=self.pk)
            old_montant = Decimal(str(old_instance.montant_operation))
            cout_sous_traitance_decimal = Decimal(str(self.chantier.cout_sous_traitance or 0))
            cout_estime_main_oeuvre_decimal = Decimal(str(self.chantier.cout_estime_main_oeuvre or 0))
            
            self.chantier.cout_sous_traitance = float(cout_sous_traitance_decimal - old_montant)
            # Restaurer l'ancien montant dans le coût estimé main d'œuvre
            self.chantier.cout_estime_main_oeuvre = cout_estime_main_oeuvre_decimal + old_montant

        # Ajouter le nouveau montant
        montant_decimal = Decimal(str(self.montant_operation))
        cout_sous_traitance_decimal = Decimal(str(self.chantier.cout_sous_traitance or 0))
        cout_estime_main_oeuvre_decimal = Decimal(str(self.chantier.cout_estime_main_oeuvre or 0))
        
        self.chantier.cout_sous_traitance = float(cout_sous_traitance_decimal + montant_decimal)
        # Déduire le montant du coût estimé main d'œuvre
        self.chantier.cout_estime_main_oeuvre = cout_estime_main_oeuvre_decimal - montant_decimal
        self.chantier.save()

        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        from decimal import Decimal
        # Supprimer explicitement tous les avenants associés pour déclencher leurs méthodes delete()
        for avenant in self.avenants.all():
            avenant.delete()
        
        # Soustraire le montant lors de la suppression
        montant_decimal = Decimal(str(self.montant_operation))
        cout_sous_traitance_decimal = Decimal(str(self.chantier.cout_sous_traitance or 0))
        cout_estime_main_oeuvre_decimal = Decimal(str(self.chantier.cout_estime_main_oeuvre or 0))
        
        self.chantier.cout_sous_traitance = float(cout_sous_traitance_decimal - montant_decimal)
        # Restaurer le montant dans le coût estimé main d'œuvre
        self.chantier.cout_estime_main_oeuvre = cout_estime_main_oeuvre_decimal + montant_decimal
        self.chantier.save()

        super().delete(*args, **kwargs)

class AvenantSousTraitance(models.Model):
    contrat = models.ForeignKey(ContratSousTraitance, on_delete=models.CASCADE, related_name='avenants')
    numero = models.IntegerField()  # Numéro séquentiel de l'avenant pour ce contrat
    description = models.TextField()
    montant = models.DecimalField(max_digits=10, decimal_places=2)
    type_travaux = models.CharField(max_length=100, default='LOT PEINTURE')
    date_creation = models.DateField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date_creation']
        unique_together = ('contrat', 'numero')  # Garantit l'unicité du numéro d'avenant par contrat

    def __str__(self):
        return f"Avenant n°{self.numero} - {self.contrat.sous_traitant.entreprise} - {self.contrat.chantier.chantier_name}"

    def save(self, *args, **kwargs):
        from decimal import Decimal
        # Si c'est une modification, on soustrait l'ancien montant
        if self.pk:
            old_instance = AvenantSousTraitance.objects.get(pk=self.pk)
            old_montant = Decimal(str(old_instance.montant))
            cout_sous_traitance_decimal = Decimal(str(self.contrat.chantier.cout_sous_traitance or 0))
            cout_estime_main_oeuvre_decimal = Decimal(str(self.contrat.chantier.cout_estime_main_oeuvre or 0))
            
            self.contrat.chantier.cout_sous_traitance = float(cout_sous_traitance_decimal - old_montant)
            # Restaurer l'ancien montant dans le coût estimé main d'œuvre
            self.contrat.chantier.cout_estime_main_oeuvre = cout_estime_main_oeuvre_decimal + old_montant

        # Ajouter le nouveau montant
        montant_decimal = Decimal(str(self.montant))
        cout_sous_traitance_decimal = Decimal(str(self.contrat.chantier.cout_sous_traitance or 0))
        cout_estime_main_oeuvre_decimal = Decimal(str(self.contrat.chantier.cout_estime_main_oeuvre or 0))
        
        self.contrat.chantier.cout_sous_traitance = float(cout_sous_traitance_decimal + montant_decimal)
        # Déduire le montant du coût estimé main d'œuvre
        self.contrat.chantier.cout_estime_main_oeuvre = cout_estime_main_oeuvre_decimal - montant_decimal
        self.contrat.chantier.save()

        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        from decimal import Decimal
        # Soustraire le montant lors de la suppression
        montant_decimal = Decimal(str(self.montant))
        cout_sous_traitance_decimal = Decimal(str(self.contrat.chantier.cout_sous_traitance or 0))
        cout_estime_main_oeuvre_decimal = Decimal(str(self.contrat.chantier.cout_estime_main_oeuvre or 0))
        
        self.contrat.chantier.cout_sous_traitance = float(cout_sous_traitance_decimal - montant_decimal)
        # Restaurer le montant dans le coût estimé main d'œuvre
        self.contrat.chantier.cout_estime_main_oeuvre = cout_estime_main_oeuvre_decimal + montant_decimal
        self.contrat.chantier.save()

        super().delete(*args, **kwargs)

class SituationDateEnvoi(models.Model):
    situation = models.OneToOneField('Situation', on_delete=models.CASCADE)
    date_envoi = models.DateField(null=True, blank=True)

# Adapter le signal update_chantier_cout_main_oeuvre
@receiver([post_save, post_delete], sender=LaborCost)
def update_chantier_cout_main_oeuvre(sender, instance, **kwargs):
    chantier = instance.chantier
    total = LaborCost.objects.filter(chantier=chantier).aggregate(
        total=Sum('cost_normal') + Sum('cost_samedi') + Sum('cost_dimanche') + Sum('cost_ferie')
    )['total'] or 0
    chantier.cout_main_oeuvre = total
    chantier.save(update_fields=['cout_main_oeuvre'])

def update_chantier_cout_main_oeuvre(chantier):
    from .models import LaborCost  # Import local pour éviter les problèmes de circularité
    total = LaborCost.objects.filter(chantier=chantier).aggregate(
        total=Sum('cost_normal') + Sum('cost_samedi') + Sum('cost_dimanche') + Sum('cost_ferie')
    )['total'] or 0
    chantier.cout_main_oeuvre = total
    chantier.save(update_fields=['cout_main_oeuvre'])

class PaiementSousTraitant(models.Model):
    sous_traitant = models.ForeignKey('SousTraitant', on_delete=models.CASCADE, related_name='paiements')
    chantier = models.ForeignKey('Chantier', on_delete=models.CASCADE, related_name='paiements_sous_traitant')
    contrat = models.ForeignKey('ContratSousTraitance', on_delete=models.CASCADE, related_name='paiements', null=True, blank=True)
    avenant = models.ForeignKey('AvenantSousTraitance', on_delete=models.CASCADE, related_name='paiements', null=True, blank=True)
    mois = models.IntegerField()  # 1-12
    annee = models.IntegerField()
    montant_facture_ht = models.DecimalField(max_digits=12, decimal_places=2)  # Montant facturé par le sous-traitant ce mois
    date_envoi_facture = models.DateField(null=True, blank=True)
    delai_paiement = models.IntegerField(default=45)  # 45 ou 60 jours
    montant_paye_ht = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    date_paiement_reel = models.DateField(null=True, blank=True)

    class Meta:
        verbose_name = "Paiement Sous-Traitant"
        verbose_name_plural = "Paiements Sous-Traitants"
        ordering = ['chantier', 'sous_traitant', 'annee', 'mois']
        unique_together = ('chantier', 'sous_traitant', 'mois', 'annee', 'avenant')

    def __str__(self):
        avenant_info = f" - Avenant {self.avenant.numero}" if self.avenant else ""
        return f"{self.sous_traitant} - {self.chantier} - {self.mois}/{self.annee}{avenant_info}"

class PaiementFournisseurMateriel(models.Model):
    chantier = models.ForeignKey('Chantier', on_delete=models.CASCADE, related_name='paiements_materiel')
    fournisseur = models.CharField(max_length=255)
    mois = models.IntegerField()
    annee = models.IntegerField()
    montant = models.DecimalField(max_digits=12, decimal_places=2)
    date_saisie = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('chantier', 'fournisseur', 'mois', 'annee')
        verbose_name = 'Paiement Fournisseur Matériel'
        verbose_name_plural = 'Paiements Fournisseurs Matériel'

    def __str__(self):
        return f"{self.chantier} - {self.fournisseur} - {self.mois}/{self.annee}: {self.montant} €"

@receiver([post_save, post_delete], sender=PaiementFournisseurMateriel)
def update_chantier_cout_materiel(sender, instance, **kwargs):
    chantier = instance.chantier
    total = PaiementFournisseurMateriel.objects.filter(chantier=chantier).aggregate(
        total=Sum('montant')
    )["total"] or 0
    chantier.cout_materiel = float(total)
    chantier.save(update_fields=["cout_materiel"])


class Document(models.Model):
    """
    Modèle pour gérer les documents du drive
    """
    CATEGORY_CHOICES = [
        ('devis', 'Devis'),
        ('factures', 'Factures'),
        ('photos', 'Photos'),
        ('documents', 'Documents'),
        ('contrats', 'Contrats'),
        ('autres', 'Autres'),
    ]
    
    # Relations
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='documents')
    societe = models.ForeignKey(Societe, on_delete=models.CASCADE, related_name='documents', null=True, blank=True)
    chantier = models.ForeignKey(Chantier, on_delete=models.CASCADE, related_name='documents', null=True, blank=True)
    
    # Métadonnées du fichier
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='documents')
    s3_key = models.CharField(max_length=500, unique=True)  # Clé S3 complète
    filename = models.CharField(max_length=255)  # Nom original du fichier
    content_type = models.CharField(max_length=100)  # Type MIME
    size = models.BigIntegerField()  # Taille en octets
    
    # Métadonnées système
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_documents')
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)  # Pour la corbeille
    
    class Meta:
        verbose_name = "Document"
        verbose_name_plural = "Documents"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['societe', 'chantier', 'category']),
            models.Index(fields=['owner']),
            models.Index(fields=['created_at']),
            models.Index(fields=['is_deleted']),
        ]
    
    def __str__(self):
        return f"{self.filename} ({self.get_category_display()})"
    
    @property
    def size_mb(self):
        """Retourne la taille en MB"""
        return round(self.size / (1024 * 1024), 2)
    
    @property
    def extension(self):
        """Retourne l'extension du fichier"""
        return self.filename.split('.')[-1].lower() if '.' in self.filename else ''
    
    def get_download_url(self):
        """Retourne l'URL de téléchargement (sera implémentée avec les URLs présignées)"""
        return f"/api/drive/download/{self.id}/"

