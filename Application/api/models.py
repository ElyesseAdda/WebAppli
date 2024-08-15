from django.db import models

# Create your models here.
class Agent(models.Model):
    name = models.CharField(max_length=25,)
    surname = models.CharField(max_length=25,)
    adress = models.CharField(max_length=100,)
    phone_Number = models.IntegerField()
    taux_Horaire = models.FloatField()
    conge = models.FloatField()

class Client(models.Model):
    name = models.CharField(max_length=25,)
    surname = models.CharField(max_length=25,)
    client_mail = models.EmailField()
    phone_Number = models.IntegerField()
    
class Devis(models.Model):
    price_ht = models.FloatField()
    date_creation = models.DateField(auto_now_add=True)
    date_modification = models.DateField(auto_now=True)
    state = models.CharField(max_length=15),

class Facture(models.Model):
    price_ht = models.FloatField()
    date_creation = models.DateField(auto_now_add=True)
    date_modification = models.DateField(auto_now=True)
    state_facture = models.CharField(max_length=15),
    num_bon_commande = models.CharField(max_length=100),
    num_facture = models.CharField(max_length=100,)

class Situation(models.Model):
    price_ht = models.FloatField()
    date_creation = models.DateField(auto_now_add=True)
    date_modification = models.DateField(auto_now=True)

class Quitus(models.Model):
    state_quitus = models.CharField(max_length=15),
    description_quitus = models.CharField(max_length=250,)

class Fournisseur(models.Model):
    name = models.CharField(max_length=25,)
    adress = models.CharField(max_length=200,)
    Fournisseur_mail = models.EmailField()
    phone_Number = models.IntegerField()
    description_fournisseur = models.CharField(max_length=250,)

class Materiel_produit(models.Model):
    name_produit = models.CharField(max_length=25,)
    description_produit = models.CharField(max_length=250,)
    price_ht = models.FloatField()
    name_fournisseur = models.CharField(max_length=25,)

class Chantier(models.Model):
    chantier_name = models.CharField(max_length=25,unique=True)
    client_name = models.CharField(max_length=25,)
    date_debut = models.DateField(auto_now_add=True)
    date_fin = models.DateField(auto_now_add=False, null=True)
    chiffre_affaire = models.FloatField(null=True)
    nombre_devis = models.IntegerField(null=True)
    nombre_facture = models.IntegerField(null=True)
    state_chantier = models.CharField(max_length=15,)
    adresse = models.CharField(max_length=100,)
    cout_materiel = models.FloatField(null=True)
    cout_main_oeuvre = models.FloatField(null=True)
    cout_sous_traitance = models.FloatField(null=True)
    description = models.TextField(null=True)

    def __str__(self):
        return f"Chantier {self.id} - {self.client_nom}"