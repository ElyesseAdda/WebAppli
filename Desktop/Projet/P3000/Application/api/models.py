from django.db import models
from django.core.validators import RegexValidator
from django.utils import timezone
from datetime import datetime, timedelta
from django.contrib.auth.models import User  # Si vous utilisez le modèle utilisateur intégré
from decimal import Decimal
from django.core.exceptions import ValidationError

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
    chantier_name = models.CharField(max_length=255,unique=True)
    societe = models.ForeignKey(Societe, on_delete=models.CASCADE, related_name='chantiers', null=True)
    date_debut = models.DateField(auto_now_add=True)
    date_fin = models.DateField(auto_now_add=False, null=True)
    montant_ttc = models.FloatField(null=True)
    montant_ht = models.FloatField(null=True)
    state_chantier = models.CharField(max_length=20, choices=STATE_CHOICES, default='En Cours')
    ville = models.CharField(max_length=100,)
    rue = models.CharField(max_length=100,)
    code_postal =models.CharField(max_length=10,validators=[RegexValidator(regex=r'^\d{5}$',message='Le code postal doit être exactement 5 chiffres.',code='invalid_codepostal')],blank=True,null=True)
    cout_materiel = models.FloatField(null=True)
    cout_main_oeuvre = models.FloatField(null=True)
    cout_sous_traitance = models.FloatField(null=True)
    description = models.TextField(null=True)
    

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
    
    

class Agent(models.Model):
    name = models.CharField(max_length=25)
    surname = models.CharField(max_length=25)
    address = models.CharField(max_length=100)
    phone_Number = models.IntegerField()
    taux_Horaire = models.FloatField()
    conge = models.FloatField()
    
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

class Event(models.Model):
    agent = models.ForeignKey('Agent', on_delete=models.CASCADE)
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=20)
    hours_modified = models.IntegerField(default=0)
    chantier = models.ForeignKey('Chantier', on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"{self.agent} - {self.status} du {self.start_date} au {self.end_date}"

class Stock(models.Model):
    code_produit = models.CharField(max_length=50, unique=True, default='')
    designation = models.CharField(max_length=50)
    fournisseur = models.CharField(max_length=100, blank=True, null=True)
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
    name = models.CharField(max_length=25,)
    Fournisseur_mail = models.EmailField()
    phone_Number = models.IntegerField()
    description_fournisseur = models.CharField(max_length=250,)
    magasin = models.CharField(max_length=250,)


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
    chantier = models.ForeignKey(Chantier, on_delete=models.CASCADE, related_name='devis', null=True)
    client = models.ManyToManyField(Client, related_name='devis', blank=True)
    lignes_speciales = models.JSONField(default=dict, blank=True)
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

class LigneDetail(models.Model):
    sous_partie = models.ForeignKey('SousPartie', related_name='lignes_details', on_delete=models.CASCADE)
    partie = models.ForeignKey('Partie', related_name='lignes_details', on_delete=models.CASCADE, null=True, blank=True)
    description = models.CharField(max_length=255)
    unite = models.CharField(max_length=10)
    prix = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    def __str__(self):
        return f'{self.description} ({self.unite}) - {self.prix} €'
    
class Facture(models.Model):
    FACTURE_STATUS = [
        ('En cours', 'En cours'),
        ('Attente paiement', 'Attente paiement'),
        ('Payée', 'Payée')
    ]



    numero = models.CharField(max_length=50, unique=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    devis = models.ForeignKey(Devis, on_delete=models.CASCADE, related_name='factures')
    chantier = models.ForeignKey('Chantier', on_delete=models.CASCADE, related_name='factures')
    state_facture = models.CharField(max_length=20, choices=FACTURE_STATUS, default='En attente')
    date_echeance = models.DateField(null=True, blank=True)
    date_paiement = models.DateField(null=True, blank=True)  # Nouveau champ
    mode_paiement = models.CharField(max_length=50, default='virement')
    price_ht = models.FloatField()
    price_ttc = models.FloatField()
    
    def __str__(self):
        return f"Facture {self.numero}"

    def save(self, *args, **kwargs):
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

    

class Situation(models.Model):
    chantier = models.ForeignKey(Chantier, on_delete=models.CASCADE, related_name='situations', null=True)
    client = models.ManyToManyField(Client, related_name='situations', blank=True)  # Modification ici
    price_ht = models.FloatField()
    date_creation = models.DateField(auto_now_add=True)
    date_modification = models.DateField(auto_now=True)

    def __str__(self):
        return f"Situation {self.id}"


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
    year = models.IntegerField(default=timezone.now().year)  # Ajout du champ année
    day = models.CharField(max_length=10)  # "Lundi", "Mardi", etc.
    hour = models.CharField(max_length=5)  # "06:00", "07:00", etc.
    chantier = models.ForeignKey(Chantier, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        unique_together = ('agent', 'week', 'year', 'day', 'hour')  # Assurer l'unicité

    def __str__(self):
        return f"{self.agent.name} - Semaine {self.week}, {self.year} - {self.day} {self.hour}"

class LaborCost(models.Model):
    agent = models.ForeignKey('Agent', on_delete=models.CASCADE, related_name='labor_costs')
    chantier = models.ForeignKey('Chantier', on_delete=models.CASCADE, related_name='labor_costs')
    week = models.IntegerField()
    year = models.IntegerField()
    hours = models.DecimalField(max_digits=10, decimal_places=2)
    cost = models.DecimalField(max_digits=10, decimal_places=2)
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
    
    numero = models.CharField(max_length=50, unique=True)
    fournisseur = models.CharField(max_length=100)
    chantier = models.ForeignKey(Chantier, on_delete=models.CASCADE)
    agent = models.ForeignKey(Agent, on_delete=models.CASCADE)
    montant_total = models.DecimalField(max_digits=10, decimal_places=2)
    date_creation = models.DateTimeField(auto_now_add=True)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='en_attente')

    def __str__(self):
        return self.numero

class LigneBonCommande(models.Model):
    bon_commande = models.ForeignKey(BonCommande, related_name='lignes', on_delete=models.CASCADE)
    produit = models.ForeignKey(Stock, on_delete=models.CASCADE)
    designation = models.CharField(max_length=255)
    quantite = models.IntegerField()
    prix_unitaire = models.DecimalField(max_digits=10, decimal_places=2)
    total = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.designation} - {self.quantite} x {self.prix_unitaire}€"

    def save(self, *args, **kwargs):
        # Calculer automatiquement le total
        self.total = self.quantite * self.prix_unitaire
        super().save(*args, **kwargs)



