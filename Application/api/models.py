from django.db import models
from django.core.validators import RegexValidator

STATE_CHOICES = [
        ('Terminé', 'Terminé'),
        ('En Cours', 'En Cours'),
        ('Facturé', 'Facturé'),
    ]
TYPE_CHOICES = [
        ('Travaux', 'Travaux'),
    ]

# Create your models here.
class Societe(models.Model):
    nom_societe = models.CharField(max_length=25,)
    adresse_societe = models.CharField(max_length=100,)
    codepostal_societe = models.CharField(max_length=10,validators=[RegexValidator(regex=r'^\d{5}$',message='Le code postal doit être exactement 5 chiffres.',code='invalid_codepostal')],blank=True,null=True)
   #Change client_name to nom_contact
    client_name = models.CharField(max_length=25,)
    def __str__(self):
        return self.nom_societe
    

class Chantier(models.Model):
    chantier_name = models.CharField(max_length=25,unique=True)
    societe = models.ForeignKey(Societe, on_delete=models.CASCADE, related_name='chantiers', null=True)
    date_debut = models.DateField(auto_now_add=True)
    date_fin = models.DateField(auto_now_add=False, null=True)
    chiffre_affaire = models.FloatField(null=True)
    state_chantier = models.CharField(max_length=20, choices=STATE_CHOICES, default='En Cours')
    adresse = models.CharField(max_length=100,)
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
    
    

class Agent(models.Model):
    name = models.CharField(max_length=25,)
    surname = models.CharField(max_length=25,)
    adress = models.CharField(max_length=100,)
    phone_Number = models.IntegerField()
    taux_Horaire = models.FloatField()
    conge = models.FloatField()


# class Client(models.Model):
#     name = models.CharField(max_length=25)
#     surname = models.CharField(max_length=25)
#     client_mail = models.EmailField()
#     phone_Number = models.IntegerField()
#     chantiers = models.ManyToManyField(Chantier, related_name='client', blank=True)

#     def __str__(self):
#         return f"{self.name} {self.surname}"


    
class Fournisseur(models.Model):
    name = models.CharField(max_length=25,)
    adresse = models.CharField(max_length=200,)
    Fournisseur_mail = models.EmailField()
    phone_Number = models.IntegerField()
    description_fournisseur = models.CharField(max_length=250,)


class Materiel_produit(models.Model):
    name_produit = models.CharField(max_length=25,)
    description_produit = models.CharField(max_length=250,)
    price_ht = models.FloatField()
    name_fournisseur = models.CharField(max_length=25,)

    
class Facture(models.Model):
    chantier = models.ForeignKey(Chantier, on_delete=models.CASCADE, related_name='factures', null=True)  # Modification ici
    price_ht = models.FloatField()
    date_creation = models.DateField(auto_now_add=True)
    date_modification = models.DateField(auto_now=True)
    state_facture = models.CharField(max_length=20, choices=STATE_CHOICES, default='En Cours')
    num_bon_commande = models.CharField(max_length=100, null=True)
    num_facture = models.CharField(max_length=100)
    amount_facturé = models.DecimalField(max_digits=10, decimal_places=2, null=True)

    def __str__(self):
        return f"Facture {self.id}"


class Devis(models.Model):
    numero = models.CharField(max_length=100, unique=False, default='DEV-0001')
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='Travaux')
    chantier = models.ForeignKey(Chantier, on_delete=models.CASCADE, related_name='devis', null=True)
    price_ht = models.FloatField()
    date_creation = models.DateField(auto_now_add=True)
    date_modification = models.DateField(auto_now=True)
    state = models.CharField(max_length=20, choices=STATE_CHOICES, default='En Cours')
    amount_facturé = models.DecimalField(max_digits=10, decimal_places=2, null=True)

    def __str__(self):
        return f"Devis {self.id}"
    
    def get_nom_contact(self):
        # On accède à l'objet Chantier via self.chantier
        chantier = self.chantier
        if chantier and chantier.societe:
            # On retourne le nom du contact de la société
            return chantier.societe.client_name
        return None  # Si aucune société n'est associée



class Situation(models.Model):
    chantier = models.ForeignKey(Chantier, on_delete=models.CASCADE, related_name='situations', null=True)
    price_ht = models.FloatField()
    date_creation = models.DateField(auto_now_add=True)
    date_modification = models.DateField(auto_now=True)

    def __str__(self):
        return f"Situation {self.id}"


class Quitus(models.Model):
    chantier = models.ForeignKey(Chantier, on_delete=models.CASCADE, related_name='quitus', null=True)
    state_quitus = models.CharField(max_length=20, choices=STATE_CHOICES, default='En Cours')
    description_quitus = models.CharField(max_length=250)

    def __str__(self):
        return f"Quitus {self.id}"

class Partie(models.Model):
    nom = models.CharField(max_length=255)
    description = models.TextField()


class SousPartie(models.Model):
    partie = models.ForeignKey(Partie, on_delete=models.CASCADE)
    nom = models.CharField(max_length=255)
    description = models.TextField()
    prix_unitaire = models.DecimalField(max_digits=10, decimal_places=2)


class DevisItem(models.Model):
    devis = models.ForeignKey(Devis, on_delete=models.CASCADE, related_name='items')
    sous_partie = models.ForeignKey(SousPartie, on_delete=models.CASCADE)
    quantite = models.DecimalField(max_digits=10, decimal_places=2)
    total_ht = models.DecimalField(max_digits=10, decimal_places=2, editable=False)

    def save(self, *args, **kwargs):
        self.total_ht = self.quantite * self.sous_partie.prix_unitaire
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.sous_partie.nom} - {self.quantite} x {self.sous_partie.prix_unitaire}"
    
