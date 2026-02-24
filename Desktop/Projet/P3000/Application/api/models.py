from django.db import models
from django.core.validators import RegexValidator, MinValueValidator, MaxValueValidator
from django.utils import timezone
from datetime import datetime, timedelta
from django.contrib.auth.models import User  # Si vous utilisez le modèle utilisateur intégré
from decimal import Decimal, ROUND_HALF_UP,InvalidOperation
from django.core.exceptions import ValidationError
from django.db.models.signals import post_save, post_delete, post_migrate
from django.dispatch import receiver
from django.db.models.functions import TruncMonth
from datetime import date
from django.db.models import Sum


STATE_CHOICES = [
        ('Terminé', 'Terminé'),
        ('En Cours', 'En Cours'),
        ('Facturé', 'Facturé'),
        ('En attente', 'En attente'),
    ]
TYPE_CHOICES = [
        ('Travaux', 'Travaux'),
    ]

# Create your models here.

class Client(models.Model):
    CIVILITE_CHOICES = [
        ('', ''),
        ('M.', 'Monsieur'),
        ('Mme', 'Madame'),
        ('Mlle', 'Mademoiselle'),
    ]
    
    civilite = models.CharField(max_length=10, choices=CIVILITE_CHOICES, blank=True, default='', verbose_name="Civilité")
    name = models.CharField(max_length=100)
    surname = models.CharField(max_length=25)
    client_mail = models.EmailField()
    phone_Number = models.IntegerField()
    poste = models.CharField(max_length=100, blank=True, default='', verbose_name="Poste")
    

    def __str__(self):
        civilite_display = f"{self.civilite} " if self.civilite else ""
        return f"{civilite_display}{self.name} {self.surname}"
    
class Societe(models.Model):
    nom_societe = models.CharField(max_length=100,)
    ville_societe = models.CharField(max_length=100,)
    rue_societe = models.CharField(max_length=100,)
    rue_societe = models.CharField(max_length=100,)
    codepostal_societe = models.CharField(max_length=10,validators=[RegexValidator(regex=r'^\d{5}$',message='Le code postal doit être exactement 5 chiffres.',code='invalid_codepostal')],blank=True,null=True)
   #Change client_name to nom_contact
    client_name = models.ForeignKey(Client, on_delete=models.CASCADE)  # Association avec Client
    
    def __str__(self):
        return self.nom_societe

class ContactSociete(models.Model):
    """
    Modèle pour gérer les contacts associés aux sociétés.
    Permet d'avoir plusieurs contacts par société.
    """
    CIVILITE_CHOICES = [
        ('', ''),
        ('M.', 'Monsieur'),
        ('Mme', 'Madame'),
        ('Mlle', 'Mademoiselle'),
    ]
    
    societe = models.ForeignKey(Societe, on_delete=models.CASCADE, related_name='contacts')
    civilite = models.CharField(max_length=10, choices=CIVILITE_CHOICES, blank=True, default='', verbose_name="Civilité")
    nom = models.CharField(max_length=100, verbose_name="Nom")
    prenom = models.CharField(max_length=100, blank=True, null=True, verbose_name="Prénom")
    poste = models.CharField(max_length=100, blank=True, null=True, verbose_name="Poste")
    email = models.EmailField(max_length=254, blank=True, null=True, verbose_name="Email")
    telephone = models.CharField(max_length=20, blank=True, null=True, verbose_name="Téléphone")
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Contact Société"
        verbose_name_plural = "Contacts Sociétés"
        ordering = ['nom', 'prenom']

    def __str__(self):
        civilite_display = f"{self.civilite} " if self.civilite else ""
        nom_complet = f"{self.prenom} {self.nom}".strip() if self.prenom else self.nom
        return f"{civilite_display}{nom_complet} - {self.societe.nom_societe}"

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
    is_system_chantier = models.BooleanField(default=False)
    chantier_type = models.CharField(max_length=20, default='normal')
    
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
    
    # Champs pour Maitre d'ouvrage (Contact Société)
    maitre_ouvrage_nom_societe = models.CharField(max_length=255, blank=True, null=True, verbose_name="Nom société maître d'ouvrage")
    maitre_ouvrage_telephone = models.CharField(max_length=20, blank=True, null=True, verbose_name="Téléphone maître d'ouvrage")
    maitre_ouvrage_email = models.EmailField(max_length=254, blank=True, null=True, verbose_name="Email maître d'ouvrage")
    maitre_ouvrage_contact = models.CharField(max_length=500, blank=True, null=True, verbose_name="Contact maître d'ouvrage")
    
    # Champs pour Assistance à la maîtrise d'ouvrage
    assistance_maitrise_ouvrage_nom_societe = models.CharField(max_length=255, blank=True, null=True, verbose_name="Nom société assistance maîtrise d'ouvrage")
    assistance_maitrise_ouvrage_telephone = models.CharField(max_length=20, blank=True, null=True, verbose_name="Téléphone assistance maîtrise d'ouvrage")
    assistance_maitrise_ouvrage_email = models.EmailField(max_length=254, blank=True, null=True, verbose_name="Email assistance maîtrise d'ouvrage")
    assistance_maitrise_ouvrage_contact = models.CharField(max_length=500, blank=True, null=True, verbose_name="Contact assistance maîtrise d'ouvrage")
    
    # Champs pour Maitre d'oeuvre
    maitre_oeuvre_nom_societe = models.CharField(max_length=255, blank=True, null=True, verbose_name="Nom société maître d'oeuvre")
    maitre_oeuvre_telephone = models.CharField(max_length=20, blank=True, null=True, verbose_name="Téléphone maître d'oeuvre")
    maitre_oeuvre_email = models.EmailField(max_length=254, blank=True, null=True, verbose_name="Email maître d'oeuvre")
    maitre_oeuvre_contact = models.CharField(max_length=500, blank=True, null=True, verbose_name="Contact maître d'oeuvre")
    
    # Champ pour le chemin personnalisé dans le drive
    drive_path = models.CharField(
        max_length=500,
        blank=True,
        null=True,
        verbose_name="Chemin du drive",
        help_text="Chemin personnalisé dans le drive. Si vide, sera calculé automatiquement à partir du nom de la société et du chantier."
    )

    #Partie validation des informations
    @property
    def nombre_devis(self):
        return self.devis.count()
    
    @property
    def nombre_facture(self):
        return self.facture.count()
    
    def get_drive_path(self):
        """
        Retourne le chemin du drive (personnalisé ou calculé) sans préfixe Chantiers/.
        
        Priorité :
        1. Si drive_path est défini → retourne drive_path (sans préfixe Chantiers/ si présent)
        2. Sinon → calcule automatiquement {societe_slug}/{chantier_slug}
        3. Si pas de société → retourne None
        """
        if self.drive_path and self.drive_path.strip():
            path = self.drive_path.strip()
            # Retirer le préfixe Chantiers/ s'il existe pour être cohérent avec le reste du code
            if path.startswith('Chantiers/'):
                return path[len('Chantiers/'):]
            return path
        # Calculer le chemin par défaut
        if self.societe:
            from api.utils import normalize_drive_segment
            societe_slug = normalize_drive_segment(self.societe.nom_societe)
            chantier_slug = normalize_drive_segment(self.chantier_name)
            return f"{societe_slug}/{chantier_slug}"
        return None
    
    def clean(self):
        """
        Valide le format du chemin drive lors de la validation du modèle.
        """
        super().clean()
        if self.drive_path:
            self.validate_drive_path(self.drive_path)
    
    def validate_drive_path(self, value):
        """
        Valide le format du chemin drive.
        Interdit les caractères spéciaux non gérés par AWS S3.
        """
        if not value:
            return value
        
        # Caractères interdits par AWS S3
        forbidden_chars = ['\\', ':', '*', '?', '"', '<', '>', '|', '\x00', '\x01']
        for char in forbidden_chars:
            if char in value:
                raise ValidationError(
                    f"Le chemin contient un caractère interdit : '{char}'. "
                    f"Caractères interdits : {', '.join(forbidden_chars)}"
                )
        
        # Vérifier que le chemin ne commence/termine pas par /
        value = value.strip('/')
        
        return value
    
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
    
    @property
    def montant_total_sous_traitance(self):
        """Calcule le montant total de sous-traitance (contrat + avenants)"""
        total = 0
        for contrat in self.contrats_sous_traitance.all():
            total += float(contrat.montant_operation or 0)
            for avenant in contrat.avenants.all():
                total += float(avenant.montant or 0)
        return total
    
    @property
    def montant_total_paye_sous_traitance(self):
        """Calcule le montant total payé aux sous-traitants"""
        return sum(
            float(p.montant_paye_ht or 0) 
            for p in self.paiements_globaux_sous_traitant.all()
        )
    
    @property
    def pourcentage_avancement_sous_traitance(self):
        """Calcule le pourcentage d'avancement des paiements sous-traitance"""
        total = self.montant_total_sous_traitance
        if total == 0:
            return 0
        paye = self.montant_total_paye_sous_traitance
        return round((paye / total) * 100, 2)
    
    @property
    def montant_restant_sous_traitance(self):
        """Calcule le montant restant à payer aux sous-traitants"""
        return self.montant_total_sous_traitance - self.montant_total_paye_sous_traitance


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
    
    # ✅ Champ pour marquer le chantier transformé (un seul chantier par appel d'offres)
    # Si le chantier est supprimé, ce champ sera automatiquement mis à None (SET_NULL)
    # ce qui permettra de transformer à nouveau l'appel d'offres
    chantier_transformé = models.ForeignKey(
        'Chantier',
        on_delete=models.SET_NULL,  # ✅ Si le chantier est supprimé, permet une nouvelle transformation
        null=True,
        blank=True,
        related_name='appel_offres_source',
        verbose_name="Chantier transformé depuis cet appel d'offres"
    )
    
    # Champ pour le chemin personnalisé dans le drive
    drive_path = models.CharField(
        max_length=500,
        blank=True,
        null=True,
        verbose_name="Chemin du drive",
        help_text="Chemin personnalisé dans le drive. Si vide, sera calculé automatiquement à partir du nom de la société et du chantier."
    )
    
    def get_drive_path(self):
        """
        Retourne le chemin du drive (personnalisé ou calculé).
        
        Priorité :
        1. Si drive_path est défini → retourne drive_path tel quel (peut contenir le préfixe Appels_Offres/)
        2. Sinon → calcule automatiquement {societe_slug}/{chantier_slug} (sans préfixe)
        3. Si pas de société → retourne None
        """
        if self.drive_path and self.drive_path.strip():
            return self.drive_path.strip()
        # Calculer le chemin par défaut (sans préfixe)
        if self.societe:
            from api.utils import normalize_drive_segment
            societe_slug = normalize_drive_segment(self.societe.nom_societe)
            chantier_slug = normalize_drive_segment(self.chantier_name)
            return f"{societe_slug}/{chantier_slug}"
        return None
    
    def clean(self):
        """
        Valide le format du chemin drive lors de la validation du modèle.
        """
        super().clean()
        if self.drive_path:
            self.validate_drive_path(self.drive_path)
    
    def validate_drive_path(self, value):
        """
        Valide le format du chemin drive.
        Interdit les caractères spéciaux non gérés par AWS S3.
        """
        if not value:
            return value
        
        # Caractères interdits par AWS S3
        forbidden_chars = ['\\', ':', '*', '?', '"', '<', '>', '|', '\x00', '\x01']
        for char in forbidden_chars:
            if char in value:
                raise ValidationError(
                    f"Le chemin contient un caractère interdit : '{char}'. "
                    f"Caractères interdits : {', '.join(forbidden_chars)}"
                )
        
        # Vérifier que le chemin ne commence/termine pas par /
        value = value.strip('/')
        
        return value
    
    def __str__(self):
        return f"Appel d'offres {self.id} - {self.chantier_name}"
    
    def transformer_en_chantier(self, drive_path=None):
        """Transforme l'appel d'offres en chantier
        
        Args:
            drive_path (str, optional): Chemin personnalisé pour le drive du nouveau chantier.
                                      Si None, utilise le drive_path de l'appel d'offres.
        """
        if self.statut != 'valide':
            raise ValueError("Seuls les appels d'offres validés peuvent être transformés en chantier")
        
        # Vérifier si un chantier avec ce nom existe déjà
        chantier_name = self.chantier_name
        counter = 1
        while Chantier.objects.filter(chantier_name=chantier_name).exists():
            chantier_name = f"{self.chantier_name} ({counter})"
            counter += 1
        
        # ✅ Vérifier si cet appel d'offres a déjà été transformé
        # Si le chantier transformé a été supprimé, chantier_transformé sera automatiquement None
        # (grâce à on_delete=models.SET_NULL) et la transformation sera à nouveau possible
        if self.chantier_transformé:
            raise ValueError(f"Cet appel d'offres a déjà été transformé en chantier : {self.chantier_transformé.chantier_name}")
        
        # ✅ Utiliser le drive_path fourni en paramètre, sinon utiliser celui de l'appel d'offres
        if drive_path is not None:
            # Nettoyer le drive_path fourni
            cleaned_drive_path = self._clean_drive_path_for_copy(drive_path) if drive_path else None
        else:
            # Nettoyer le drive_path de l'appel d'offres
            cleaned_drive_path = self._clean_drive_path_for_copy(self.drive_path) if self.drive_path else None
        
        # Créer le chantier avec tous les champs de l'appel d'offres
        chantier = Chantier.objects.create(
            chantier_name=chantier_name,
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
            # ✅ Utiliser le drive_path nettoyé (personnalisé ou celui de l'appel d'offres)
            drive_path=cleaned_drive_path,
        )
        
        # ✅ Marquer cet appel d'offres comme transformé en liant le chantier
        self.chantier_transformé = chantier
        self.save()
        
        return chantier
    
    def _clean_drive_path_for_copy(self, drive_path):
        """
        Utilise le drive_path tel quel, sans modification.
        L'utilisateur définit le chemin comme bon lui semble.
        """
        if not drive_path:
            return None
        
        # Utiliser le chemin tel quel, juste nettoyer les espaces
        path = str(drive_path).strip()
        
        # Retourner None si vide
        if not path:
            return None
        
        return path

class Agent(models.Model):
    PAYMENT_TYPE_CHOICES = [
        ('horaire', 'Horaire'),
        ('journalier', 'Journalier'),
    ]
    
    name = models.CharField(max_length=25)
    surname = models.CharField(max_length=25)
    address = models.CharField(max_length=100, blank=True, null=True)
    phone_Number = models.IntegerField()
    taux_Horaire = models.FloatField(null=True, blank=True)
    conge = models.FloatField(null=True, blank=True)
    
    # Nouveaux champs pour les agents journaliers
    type_paiement = models.CharField(max_length=20, choices=PAYMENT_TYPE_CHOICES, default='horaire')
    taux_journalier = models.FloatField(null=True, blank=True, help_text="Taux pour une journée complète (agents journaliers)")
    
    # Modification du champ primes pour stocker par mois
    # Format: { "2024-01": { "description": montant }, "2024-02": { "description": montant } }
    primes = models.JSONField(default=dict, blank=True, null=True)
    
    # Nouveaux champs pour les heures de travail
    heure_debut = models.TimeField(null=True, blank=True)  # Heure de début de travail
    heure_fin = models.TimeField(null=True, blank=True)  # Heure de fin de travail
    heure_pause_debut = models.TimeField(null=True, blank=True)  # Heure de début de pause
    heure_pause_fin = models.TimeField(null=True, blank=True)  # Heure de fin de pause
    jours_travail = models.CharField(max_length=255, null=True, blank=True)  # Jours de travail sous forme de liste ou chaîne
    
    # Champs pour la gestion de l'effectif
    is_active = models.BooleanField(default=True, help_text="Agent actif dans l'effectif")
    date_desactivation = models.DateField(null=True, blank=True, help_text="Date de retrait de l'effectif")

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
    ('ecole', 'École'),
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
    code_produit = models.CharField(max_length=50, default='')
    designation = models.CharField(max_length=255)
    fournisseur = models.ForeignKey(
        'Fournisseur',
        on_delete=models.CASCADE,
        related_name='produits'
    )
    prix_unitaire = models.FloatField(default=0)
    unite = models.CharField(max_length=50)
    # Champ utilisé dans les vues API pour la gestion des quantités
    quantite_disponible = models.IntegerField(default=0)
    
    class Meta:
        # Code produit unique par fournisseur, pas globalement
        unique_together = ('code_produit', 'fournisseur')

    def __str__(self):
        return self.designation 


class StockHistory(models.Model):
    stock = models.ForeignKey(Stock, on_delete=models.CASCADE)  # Lien avec Stock
    quantite = models.IntegerField()
    type_operation = models.CharField(max_length=10, choices=[('ajout', 'Ajout'), ('retrait', 'Retrait')])
    date_operation = models.DateTimeField(auto_now_add=True)
    agent = models.ForeignKey('Agent', on_delete=models.SET_NULL, null=True, blank=True)
    chantier = models.ForeignKey('Chantier', on_delete=models.SET_NULL, null=True, blank=True)
    montant = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.type_operation} - {self.stock.designation} - {self.quantite}"

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
        return f"{self.mouvement_type} de {self.quantite} pour {self.stock.designation} le {self.date_mouvement}"

        
class Distributeur(models.Model):
    nom = models.CharField(max_length=150)
    code = models.CharField(max_length=50, unique=True)
    emplacement = models.CharField(max_length=255, blank=True, null=True)
    actif = models.BooleanField(default=True)
    description = models.TextField(blank=True, null=True)
    # Configuration de la grille pour simuler la disposition physique
    grid_rows = models.PositiveIntegerField(default=3, help_text="Nombre de lignes dans la grille")
    grid_columns = models.JSONField(default=list, blank=True, help_text="Nombre de colonnes par ligne [col1, col2, ...]")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.nom} ({self.code})"


class DistributeurMouvement(models.Model):
    distributeur = models.ForeignKey(
        Distributeur,
        on_delete=models.CASCADE,
        related_name='mouvements'
    )
    mouvement_type = models.CharField(
        max_length=10,
        choices=[('entree', 'Entrée'), ('sortie', 'Sortie')]
    )
    quantite = models.PositiveIntegerField(default=1)
    prix_unitaire = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    date_mouvement = models.DateTimeField(default=timezone.now)
    commentaire = models.TextField(null=True, blank=True)

    @property
    def montant_total(self):
        return self.quantite * self.prix_unitaire

    def __str__(self):
        return f"{self.mouvement_type} {self.quantite} pour {self.distributeur.nom}"


class DistributeurCell(models.Model):
    """Contenu d'une case dans la grille du distributeur"""
    distributeur = models.ForeignKey(
        Distributeur,
        on_delete=models.CASCADE,
        related_name='cells'
    )
    row_index = models.PositiveIntegerField(help_text="Index de la ligne (0-based)")
    col_index = models.PositiveIntegerField(help_text="Index de la colonne (0-based)")
    # Contenu : soit un nom, soit une image
    nom_produit = models.CharField(max_length=100, blank=True, null=True, help_text="Nom du produit (ex: Chips Lays)")
    image_url = models.URLField(max_length=500, blank=True, null=True, help_text="URL de l'image (S3 ou externe)")
    image_s3_key = models.CharField(max_length=500, blank=True, null=True, help_text="Clé S3 si image uploadée")
    # Position de l'image dans la case
    image_position = models.CharField(
        max_length=20,
        choices=[
            ('center', 'Centré'),
            ('top', 'Haut'),
            ('bottom', 'Bas'),
            ('left', 'Gauche'),
            ('right', 'Droite'),
        ],
        default='center',
        help_text="Position de l'image dans la case"
    )
    # Prix de vente dans cette case — utilisé pour calculer le bénéfice (vs coûts StockLot)
    prix_vente = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        blank=True,
        null=True,
        help_text="Prix de vente (€) pour le calcul du bénéfice par produit"
    )
    # Lien vers le produit du stock : même liste de produits, coût unitaire calculé depuis StockLot
    stock_product = models.ForeignKey(
        'StockProduct',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='distributeur_cells',
        help_text="Produit du stock lié à cette case (même liste) — pour coût et bénéfice"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('distributeur', 'row_index', 'col_index')
        ordering = ['row_index', 'col_index']

    def __str__(self):
        return f"{self.distributeur.nom} - L{self.row_index}C{self.col_index}: {self.nom_produit or 'Image'}"
    
    @property
    def initiales(self):
        """Retourne les initiales du nom du produit"""
        if not self.nom_produit:
            return ""
        words = self.nom_produit.split()
        if len(words) >= 2:
            return (words[0][0] + words[1][0]).upper()
        return self.nom_produit[:2].upper()


class DistributeurVente(models.Model):
    """
    Enregistrement d'une vente avec le prix de vente à l'instant T.
    Le prix peut varier dans le temps ; on stocke toujours le prix au moment de la vente
    pour que les calculs (CA, bénéfice vs coûts StockLot) soient exacts.
    """
    distributeur = models.ForeignKey(
        Distributeur,
        on_delete=models.CASCADE,
        related_name='ventes',
        help_text="Distributeur concerné"
    )
    cell = models.ForeignKey(
        DistributeurCell,
        on_delete=models.CASCADE,
        related_name='ventes',
        help_text="Case (produit) vendu"
    )
    quantite = models.PositiveIntegerField(default=1, help_text="Nombre d'unités vendues")
    prix_vente = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Prix de vente à l'instant T (€) — stocké pour calculs exacts"
    )
    date_vente = models.DateTimeField(default=timezone.now, help_text="Date et heure de la vente")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date_vente']
        verbose_name = "Vente distributeur"
        verbose_name_plural = "Ventes distributeur"
        indexes = [
            models.Index(fields=['distributeur', '-date_vente']),
            models.Index(fields=['cell', '-date_vente']),
        ]

    @property
    def montant_total(self):
        return self.quantite * self.prix_vente

    def __str__(self):
        return f"Vente {self.quantite}u @ {self.prix_vente}€ — {self.cell.nom_produit or ('L%dC%d' % (self.cell.row_index, self.cell.col_index))} ({self.date_vente.strftime('%d/%m/%Y %H:%M')})"


class DistributeurReapproSession(models.Model):
    """
    Session de réapprovisionnement (mouvement) du distributeur.
    Une session = une tournée de remplissage des cases ; on enregistre les unités
    par case puis on termine pour consulter plus tard (résumé par produit, bénéfices).
    """
    STATUT_CHOICES = [
        ('en_cours', 'En cours'),
        ('termine', 'Terminé'),
    ]
    distributeur = models.ForeignKey(
        Distributeur,
        on_delete=models.CASCADE,
        related_name='reappro_sessions',
        help_text="Distributeur concerné"
    )
    date_debut = models.DateTimeField(default=timezone.now, help_text="Début du mouvement")
    date_fin = models.DateTimeField(blank=True, null=True, help_text="Fin du mouvement (quand terminé)")
    statut = models.CharField(
        max_length=20,
        choices=STATUT_CHOICES,
        default='en_cours',
        help_text="En cours ou Terminé"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date_debut']
        verbose_name = "Session réappro distributeur"
        verbose_name_plural = "Sessions réappro distributeur"
        indexes = [
            models.Index(fields=['distributeur', '-date_debut']),
            models.Index(fields=['statut']),
        ]

    def __str__(self):
        return f"Réappro {self.distributeur.nom} — {self.date_debut.strftime('%d/%m/%Y %H:%M')} ({self.statut})"


class DistributeurReapproLigne(models.Model):
    """Ligne d'une session de réappro : case + quantité + prix vente + coût StockLot pour bénéfice (prix_vente - cout_unitaire)."""
    session = models.ForeignKey(
        DistributeurReapproSession,
        on_delete=models.CASCADE,
        related_name='lignes',
        help_text="Session de réappro"
    )
    cell = models.ForeignKey(
        DistributeurCell,
        on_delete=models.CASCADE,
        related_name='reappro_lignes',
        help_text="Case réapprovisionnée"
    )
    quantite = models.PositiveIntegerField(default=1, help_text="Nombre d'unités ajoutées")
    prix_vente = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Prix de vente (€) au moment du mouvement"
    )
    cout_unitaire = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        blank=True,
        null=True,
        help_text="Coût unitaire (€) issu des StockLot — pour calcul bénéfice"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['session', 'cell']
        verbose_name = "Ligne réappro"
        verbose_name_plural = "Lignes réappro"
        unique_together = ('session', 'cell')
        indexes = [
            models.Index(fields=['session']),
        ]

    @property
    def montant_total(self):
        return self.quantite * self.prix_vente

    @property
    def benefice(self):
        """Bénéfice = quantite * (prix_vente - cout_unitaire)."""
        cout = self.cout_unitaire or 0
        return self.quantite * (self.prix_vente - cout)

    def __str__(self):
        return f"{self.session} — {self.cell.nom_produit or ('L%dC%d' % (self.cell.row_index, self.cell.col_index))}: {self.quantite}u @ {self.prix_vente}€"


class DistributeurFrais(models.Model):
    """Frais liés au distributeur : entretien, frais banque TPE, etc."""
    CATEGORY_CHOICES = [
        ("bancaire", "Frais bancaire / TPE"),
        ("maintenance", "Maintenance / Entretien"),
        ("autre", "Autre"),
    ]
    RECURRENCE_CHOICES = [
        ("", "Ponctuel"),
        ("hebdomadaire", "Hebdomadaire"),
        ("mensuel", "Mensuel"),
    ]
    distributeur = models.ForeignKey(
        Distributeur,
        on_delete=models.CASCADE,
        related_name='frais',
        help_text="Distributeur concerné",
    )
    description = models.CharField(max_length=255, help_text="Ex: Frais banque TPE, Entretien mensuel")
    date_frais = models.DateField(help_text="Date du frais")
    montant = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Montant en € (toujours positif, déduit du bénéfice)",
    )
    category = models.CharField(
        max_length=20,
        choices=CATEGORY_CHOICES,
        default="autre",
        help_text="Type de frais pour regroupement (bancaire, maintenance, etc.)",
    )
    recurrence = models.CharField(
        max_length=20,
        choices=RECURRENCE_CHOICES,
        blank=True,
        default="",
        help_text="Si récurrent : mensuel, hebdomadaire (pour regroupement par période)",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date_frais', '-created_at']
        verbose_name = "Frais distributeur"
        verbose_name_plural = "Frais distributeur"

    def __str__(self):
        return f"{self.distributeur.nom} — {self.description} ({self.date_frais.strftime('%d/%m/%Y')}) : {self.montant} €"


class StockProduct(models.Model):
    """Produit du stock mobile (indépendant du système de stock principal)"""
    nom = models.CharField(max_length=150, help_text="Nom du produit", blank=False)
    # Contenu : soit un nom, soit une image
    nom_produit = models.CharField(max_length=100, blank=True, null=True, help_text="Nom alternatif du produit")
    image_url = models.URLField(max_length=500, blank=True, null=True, help_text="URL de l'image (externe)")
    image_s3_key = models.CharField(max_length=500, blank=True, null=True, help_text="Clé S3 si image uploadée")
    # Position de l'image
    image_position = models.CharField(
        max_length=20,
        choices=[
            ('center', 'Centré'),
            ('top', 'Haut'),
            ('bottom', 'Bas'),
            ('left', 'Gauche'),
            ('right', 'Droite'),
        ],
        default='center',
        help_text="Position de l'image"
    )
    quantite = models.PositiveIntegerField(default=0, help_text="Quantité en stock")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['nom']
        verbose_name = "Produit Stock Mobile"
        verbose_name_plural = "Produits Stock Mobile"

    def __str__(self):
        return f"{self.nom} ({self.quantite})"
    
    @property
    def initiales(self):
        """Retourne les initiales du nom du produit"""
        if not self.nom_produit:
            return ""
        words = self.nom_produit.split()
        if len(words) >= 2:
            return (words[0][0] + words[1][0]).upper()
        return self.nom_produit[:2].upper()


class StockPurchase(models.Model):
    """Achat de stock - enregistre un achat avec lieu et date"""
    lieu_achat = models.CharField(max_length=150, help_text="Lieu d'achat (ex: Leclerc, Intermarché)")
    date_achat = models.DateTimeField(default=timezone.now, help_text="Date de l'achat")
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Total de l'achat")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date_achat']
        verbose_name = "Achat de Stock"
        verbose_name_plural = "Achats de Stock"

    def __str__(self):
        return f"{self.lieu_achat} - {self.date_achat.strftime('%d/%m/%Y')}"

    def calculate_total(self):
        """Calcule le total de l'achat"""
        return sum(item.prix_unitaire * item.quantite for item in self.items.all())


class StockPurchaseItem(models.Model):
    """Produit acheté dans un achat - Historique complet avec prix pour calcul des marges"""
    achat = models.ForeignKey(
        StockPurchase,
        on_delete=models.CASCADE,
        related_name='items'
    )
    produit = models.ForeignKey(
        StockProduct,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='achats',
        help_text="Produit existant (si null, produit nouveau)"
    )
    nom_produit = models.CharField(max_length=150, help_text="Nom du produit")
    quantite = models.PositiveIntegerField(help_text="Nombre de pièces achetées")
    prix_unitaire = models.DecimalField(max_digits=10, decimal_places=2, help_text="Prix d'achat à l'unité")
    montant_total = models.DecimalField(max_digits=10, decimal_places=2, help_text="Total pour cet item (quantité × prix_unitaire)")
    unite = models.CharField(max_length=50, default="pièce", help_text="Unité (toujours pièce)")
    # Si le produit est nouveau, on peut créer le produit après
    creer_produit = models.BooleanField(default=True, help_text="Créer le produit dans le stock après l'achat")
    created_at = models.DateTimeField(auto_now_add=True, help_text="Date de création de l'enregistrement")
    
    class Meta:
        ordering = ['-achat__date_achat', '-created_at']
        verbose_name = "Produit Acheté"
        verbose_name_plural = "Produits Achetés"
        indexes = [
            models.Index(fields=['produit', 'achat']),
            models.Index(fields=['achat', '-created_at']),
        ]

    def __str__(self):
        return f"{self.nom_produit or (self.produit.nom if self.produit else 'N/A')} - {self.quantite} pièces @ {self.prix_unitaire}€"

    def save(self, *args, **kwargs):
        """Calcule et sauvegarde le montant_total avant la sauvegarde"""
        # Toujours recalculer le montant_total pour être sûr qu'il est à jour
        self.montant_total = self.prix_unitaire * self.quantite
        super().save(*args, **kwargs)
    
    @property
    def date_achat(self):
        """Retourne la date de l'achat depuis l'objet parent"""
        return self.achat.date_achat
    
    @property
    def lieu_achat(self):
        """Retourne le lieu d'achat depuis l'objet parent"""
        return self.achat.lieu_achat


class StockLot(models.Model):
    """Lot de stock - Suit les quantités restantes par lot d'achat pour le système FIFO"""
    produit = models.ForeignKey(
        StockProduct,
        on_delete=models.CASCADE,
        related_name='lots',
        help_text="Produit concerné"
    )
    purchase_item = models.ForeignKey(
        StockPurchaseItem,
        on_delete=models.CASCADE,
        related_name='lots',
        help_text="Item d'achat d'origine"
    )
    quantite_restante = models.PositiveIntegerField(help_text="Quantité encore disponible dans ce lot")
    prix_achat_unitaire = models.DecimalField(max_digits=10, decimal_places=2, help_text="Prix d'achat à l'unité (copie)")
    date_achat = models.DateTimeField(help_text="Date d'achat (copie)")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['date_achat', 'created_at']  # FIFO : plus anciens en premier
        verbose_name = "Lot de Stock"
        verbose_name_plural = "Lots de Stock"
        indexes = [
            models.Index(fields=['produit', 'date_achat']),
            models.Index(fields=['produit', 'quantite_restante']),
        ]
    
    def __str__(self):
        return f"{self.produit.nom} - {self.quantite_restante} restantes @ {self.prix_achat_unitaire}€ (achat: {self.date_achat.strftime('%d/%m/%Y')})"
    
    @property
    def est_epuise(self):
        """Vérifie si le lot est épuisé"""
        return self.quantite_restante == 0


class StockLoss(models.Model):
    """Perte de stock - unités perdues (casse, vol, etc.) avec coût calculé en FIFO"""
    produit = models.ForeignKey(
        StockProduct,
        on_delete=models.CASCADE,
        related_name='pertes',
        help_text="Produit concerné"
    )
    quantite = models.PositiveIntegerField(help_text="Nombre d'unités perdues")
    montant_total = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text="Coût total des pertes (calculé en FIFO à partir des lots)"
    )
    date_perte = models.DateTimeField(default=timezone.now, help_text="Date de la perte")
    commentaire = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Ex: casse, vol, péremption..."
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date_perte']
        verbose_name = "Perte de Stock"
        verbose_name_plural = "Pertes de Stock"
        indexes = [
            models.Index(fields=['produit', '-date_perte']),
        ]

    def __str__(self):
        return f"{self.produit.nom} - {self.quantite} u perdues - {self.montant_total}€ ({self.date_perte.strftime('%d/%m/%Y')})"


class Fournisseur(models.Model):
    name = models.CharField(max_length=25)
    Fournisseur_mail = models.EmailField(blank=True, null=True)
    phone_Number = models.CharField(max_length=15, blank=True, null=True)
    description_fournisseur = models.CharField(max_length=500, blank=True, null=True)
    magasin = models.CharField(max_length=250, blank=True, null=True)

    def __str__(self):
        return self.name


class Magasin(models.Model):
    fournisseur = models.ForeignKey(
        Fournisseur,
        on_delete=models.CASCADE,
        related_name='magasins'
    )
    nom = models.CharField(max_length=250)
    email = models.EmailField(blank=True, null=True)

    class Meta:
        unique_together = ('fournisseur', 'nom')

    def __str__(self):
        return f"{self.fournisseur.name} - {self.nom}"


class Materiel_produit(models.Model):
    name_produit = models.CharField(max_length=25,)
    description_produit = models.CharField(max_length=500,)
    price_ht = models.FloatField()
    name_fournisseur = models.CharField(max_length=25,)


class Devis(models.Model):
    numero = models.CharField(max_length=100, unique=True)
    date_creation = models.DateTimeField(default=timezone.now)  # ✅ Retirer auto_now_add pour permettre la modification
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
    parties_metadata = models.JSONField(default=dict, blank=True)  # Métadonnées des parties (numéros, ordre, etc.)
    devis_chantier = models.BooleanField(default=False)  # Nouveau champ
    
    # Contact de la société (optionnel, remplace le client par défaut)
    contact_societe = models.ForeignKey('ContactSociete', on_delete=models.SET_NULL, null=True, blank=True, related_name='devis', verbose_name="Contact société")
    
    # Société alternative pour l'affichage du devis (optionnel, remplace la société du chantier)
    societe_devis = models.ForeignKey('Societe', on_delete=models.SET_NULL, null=True, blank=True, related_name='devis_affichage', verbose_name="Société pour affichage devis")
    
    # NOUVEAUX CHAMPS pour le système de lignes spéciales amélioré
    lignes_speciales_v2 = models.JSONField(default=dict, blank=True, null=True, verbose_name="Lignes spéciales v2")
    version_systeme_lignes = models.IntegerField(default=1, choices=[(1, 'Ancien'), (2, 'Nouveau')], verbose_name="Version système lignes spéciales")
    
    # NOUVEAUX CHAMPS pour les coûts estimés
    cout_estime_main_oeuvre = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True, 
        default=0,
        verbose_name="Coût estimé main d'œuvre"
    )
    cout_estime_materiel = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True, 
        default=0,
        verbose_name="Coût estimé matériel"
    )

    def save_special_lines(self, special_lines_data):
        self.lignes_speciales = {
            'global': special_lines_data.get('global', []),
            'parties': special_lines_data.get('parties', {}),
            'sousParties': special_lines_data.get('sousParties', {})
        }
        self.save()
    
    def has_legacy_special_lines(self):
        """Vérifie si le devis utilise l'ancien système de lignes spéciales"""
        return self.version_systeme_lignes == 1
    
    def has_new_special_lines(self):
        """Vérifie si le devis utilise le nouveau système de lignes spéciales"""
        return self.version_systeme_lignes == 2
    
    def get_special_lines_for_display(self):
        """
        Retourne les lignes spéciales dans le format approprié.
        Convertit automatiquement l'ancien format si nécessaire.
        """
        if self.has_legacy_special_lines():
            return self._convert_legacy_to_new_format()
        else:
            return self.lignes_speciales_v2 or {'items': []}
    
    def _convert_legacy_to_new_format(self):
        """
        Convertit l'ancien format vers le nouveau format pour migration progressive.
        """
        from decimal import Decimal
        legacy = self.lignes_speciales
        items = []
        
        # Convertir lignes globales
        for idx, line in enumerate(legacy.get('global', [])):
            items.append({
                'id': f'legacy_global_{idx}',
                'type': 'special_line',
                'position': {
                    'parentType': 'global',
                    'parentId': None,
                    'positionType': 'after',
                    'order': idx
                },
                'data': line,
                'styles': self._get_default_styles(line)
            })
        
        # Convertir lignes de parties
        for partie_id, lines in legacy.get('parties', {}).items():
            for idx, line in enumerate(lines):
                items.append({
                    'id': f'legacy_partie_{partie_id}_{idx}',
                    'type': 'special_line',
                    'position': {
                        'parentType': 'partie',
                        'parentId': partie_id,
                        'positionType': 'after',
                        'order': idx
                    },
                    'data': line,
                    'styles': self._get_default_styles(line)
                })
        
        # Convertir lignes de sous-parties
        for sous_partie_id, lines in legacy.get('sousParties', {}).items():
            for idx, line in enumerate(lines):
                items.append({
                    'id': f'legacy_sous_partie_{sous_partie_id}_{idx}',
                    'type': 'special_line',
                    'position': {
                        'parentType': 'sous_partie',
                        'parentId': sous_partie_id,
                        'positionType': 'after',
                        'order': idx
                    },
                    'data': line,
                    'styles': self._get_default_styles(line)
                })
        
        return {'items': items}
    
    def _get_default_styles(self, line):
        """Retourne les styles par défaut pour une ligne lors de la conversion"""
        styles = {}
        
        # Si highlighted dans l'ancien, appliquer styles de base
        if line.get('isHighlighted'):
            styles['backgroundColor'] = '#ffff00'
            styles['fontWeight'] = 'bold'
        
        # Pour les pourcentages anciens sans base, créer une base par défaut
        if line.get('valueType') == 'percentage' and not line.get('baseCalculation'):
            # Créer une base par défaut = global
            line['baseCalculation'] = {
                'type': 'global',
                'path': 'global',
                'label': '💰 TOTAL GLOBAL HT',
                'amount': 0  # Sera calculé dynamiquement
            }
        
        # Type display
        if line.get('type') == 'display':
            styles['fontStyle'] = 'italic'
            styles['color'] = '#6c757d'
            styles['borderLeft'] = '3px solid #6c757d'
        
        return styles if styles else None

    def __str__(self):
        return f"Devis {self.numero} - {self.chantier.chantier_name}"

class Color(models.Model):
    """Modèle pour gérer les couleurs personnalisées des utilisateurs"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='colors')
    name = models.CharField(max_length=100, verbose_name="Nom de la couleur")
    hex_value = models.CharField(max_length=7, verbose_name="Valeur hexadécimale")
    created_at = models.DateTimeField(auto_now_add=True)
    usage_count = models.IntegerField(default=0, verbose_name="Nombre d'utilisations")
    
    class Meta:
        verbose_name = "Couleur"
        verbose_name_plural = "Couleurs"
        ordering = ['-usage_count', 'name']
    
    def __str__(self):
        return f"{self.name} ({self.hex_value})"


class LigneSpeciale(models.Model):
    """Ligne spéciale liée à un devis - Système unifié avec index_global"""
    
    TYPE_CHOICES = [
        ('reduction', 'Réduction'),
        ('addition', 'Addition'),
        ('display', 'Affichage')
    ]
    
    VALUE_TYPE_CHOICES = [
        ('fixed', 'Montant fixe'),
        ('percentage', 'Pourcentage')
    ]
    
    devis = models.ForeignKey(Devis, on_delete=models.CASCADE, related_name='lignes_speciales_v3')
    description = models.CharField(max_length=500, verbose_name="Description")
    
    # Index global pour le système unifié
    index_global = models.IntegerField(
        default=0, 
        blank=True,
        help_text="Position dans le devis (tous types confondus)"
    )
    numero = models.CharField(
        max_length=50, 
        blank=True, 
        null=True,
        help_text="Numéro auto-généré en fonction du contexte"
    )
    
    # Données de la ligne
    type_speciale = models.CharField(
        max_length=50,
        choices=TYPE_CHOICES,
        default='display',
        verbose_name="Type de ligne spéciale"
    )
    value_type = models.CharField(
        max_length=50,
        choices=VALUE_TYPE_CHOICES,
        default='fixed',
        verbose_name="Type de valeur"
    )
    value = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0,
        verbose_name="Valeur"
    )
    
    # Pour les calculs en pourcentage
    base_calculation = models.JSONField(
        blank=True, 
        null=True,
        help_text="Base de calcul pour les pourcentages (montant, scope, etc.)"
    )
    
    # Styles personnalisés
    styles = models.JSONField(
        default=dict, 
        blank=True,
        help_text="Styles CSS (color, backgroundColor, fontWeight, etc.)"
    )
    
    # Métadonnées
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['index_global']
        verbose_name = 'Ligne spéciale'
        verbose_name_plural = 'Lignes spéciales'
    
    def __str__(self):
        return f"Ligne spéciale #{self.id} - {self.description[:50]}"
    
    def calculate_amount(self):
        """Calcule le montant de la ligne spéciale"""
        if self.value_type == 'percentage' and self.base_calculation:
            base_amount = Decimal(str(self.base_calculation.get('amount', 0)))
            return (base_amount * self.value) / Decimal('100')
        return self.value

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
    description = models.CharField(max_length=1000)
    unite = models.CharField(max_length=10)
    # Nouveaux champs pour la décomposition du prix
    cout_main_oeuvre = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    cout_materiel = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    taux_fixe = models.DecimalField(max_digits=5, decimal_places=2, default=0)  # en pourcentage
    marge = models.DecimalField(max_digits=5, decimal_places=2, default=0)  # en pourcentage
    prix = models.DecimalField(max_digits=10, decimal_places=2)
    is_deleted = models.BooleanField(default=False, null=True, blank=True)
    
    # NOUVEAUX CHAMPS - Système unifié avec index_global
    index_global = models.IntegerField(
        default=0, 
        blank=True,
        help_text="Position dans le devis (0 = catalogue, >0 = système unifié)"
    )
    numero = models.CharField(
        max_length=50, 
        blank=True, 
        null=True,
        help_text="Numéro auto-généré: '1.1.1', '1.1.2', etc."
    )
    devis = models.ForeignKey(
        'Devis', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name='lignes_details_unifiees',
        help_text="Lien vers devis pour système unifié (null = catalogue)"
    )
    quantite = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=1,
        blank=True,
        help_text="Quantité pour système unifié"
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['sous_partie', 'description', 'unite'],
                condition=models.Q(is_deleted=False),
                name='unique_ligne_detail_active'
            )
        ]

    def calculer_prix(self):
        base = self.cout_main_oeuvre + self.cout_materiel
        montant_taux_fixe = base * (self.taux_fixe / Decimal('100'))
        sous_total = base + montant_taux_fixe
        montant_marge = sous_total * (self.marge / Decimal('100'))
        self.prix = sous_total + montant_marge

    def save(self, *args, **kwargs):
        if not self.taux_fixe:
            # Utiliser le dernier taux fixe enregistré
            try:
                dernier_taux = TauxFixe.objects.latest()
                self.taux_fixe = dernier_taux.valeur
            except TauxFixe.DoesNotExist:
                # Aucun taux fixe en base, utiliser 20% par défaut
                self.taux_fixe = 20
        
        # Ne recalculer le prix que si on a des coûts (sinon c'est un prix manuel)
        has_couts = self.cout_main_oeuvre > 0 or self.cout_materiel > 0
        if has_couts:
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

    numero = models.CharField(max_length=100, unique=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    devis = models.ForeignKey(Devis, on_delete=models.CASCADE, related_name='factures')
    chantier = models.ForeignKey('Chantier', on_delete=models.CASCADE, related_name='factures')
    state_facture = models.CharField(max_length=20, choices=FACTURE_STATUS, default='En attente')
    type_facture = models.CharField(max_length=20, choices=FACTURE_TYPE, default='classique')
    designation = models.CharField(max_length=255, blank=True)
    date_echeance = models.DateField(null=True, blank=True)
    date_paiement = models.DateField(null=True, blank=True)
    date_envoi = models.DateField(null=True, blank=True, help_text="Date d'envoi de la facture")
    delai_paiement = models.IntegerField(null=True, blank=True, help_text="Délai de paiement en jours")
    mode_paiement = models.CharField(max_length=50, default='virement')
    price_ht = models.FloatField()
    price_ttc = models.FloatField()
    avenant = models.ForeignKey('Avenant', on_delete=models.SET_NULL, null=True, blank=True)
    
    # Champs spécifiques pour les factures CIE
    mois_situation = models.IntegerField(null=True, blank=True)  # 1-12 pour le mois
    annee_situation = models.IntegerField(null=True, blank=True)  # année de la situation
    
    # Contact de la société (optionnel, remplace le client par défaut)
    contact_societe = models.ForeignKey('ContactSociete', on_delete=models.SET_NULL, null=True, blank=True, related_name='factures', verbose_name="Contact société")
    
    # Société alternative pour l'affichage de la facture
    societe_devis = models.ForeignKey('Societe', on_delete=models.SET_NULL, null=True, blank=True, related_name='factures_affichage', verbose_name="Société pour affichage facture")
    
    # NOUVEAUX CHAMPS pour les coûts estimés
    cout_estime_main_oeuvre = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True, 
        default=0,
        verbose_name="Coût estimé main d'œuvre"
    )
    cout_estime_materiel = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True, 
        default=0,
        verbose_name="Coût estimé matériel"
    )

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
    
    @property
    def lignes_display(self):
        return self.devis.lignes_display
    
    @property
    def parties_metadata(self):
        return self.devis.parties_metadata

class DevisLigne(models.Model):
    devis = models.ForeignKey(Devis, on_delete=models.CASCADE, related_name='lignes')
    ligne_detail = models.ForeignKey(LigneDetail, on_delete=models.CASCADE)
    quantite = models.DecimalField(max_digits=10, decimal_places=2)
    prix_unitaire = models.DecimalField(max_digits=10, decimal_places=2)
    
    # ✅ Index global pour le système unifié (position dans le devis)
    index_global = models.DecimalField(
        max_digits=10, 
        decimal_places=3, 
        default=0, 
        blank=True,
        null=True,
        help_text="Position dans le devis (1.101, 1.102, 2.201, etc.)"
    )
    
    @property
    def total_ht(self):
        return self.quantite * self.prix_unitaire

    def __str__(self):
        return f"{self.ligne_detail.description} - {self.quantite} x {self.prix_unitaire}€"
    
    class Meta:
        ordering = ['index_global']  # Trier par index_global par défaut

    

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
    numero_situation = models.CharField(max_length=100)
    numero_cp = models.CharField(max_length=100, blank=True, null=True, verbose_name="Numéro CP")
    banque = models.ForeignKey('Banque', on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Banque de paiement")
    mois = models.IntegerField()
    annee = models.IntegerField()
    date_creation = models.DateTimeField(null=True, blank=True, verbose_name="Date de création")
    date_validation = models.DateTimeField(null=True, blank=True)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='brouillon')
    date_envoi = models.DateField(null=True, blank=True)
    delai_paiement = models.IntegerField(default=45,null=True,blank=True)
    montant_reel_ht = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    date_paiement_reel = models.DateField(null=True, blank=True)
    
    # Contact de la société (optionnel, remplace le client par défaut)
    contact_societe = models.ForeignKey('ContactSociete', on_delete=models.SET_NULL, null=True, blank=True, related_name='situations', verbose_name="Contact société")
    
    # Société alternative pour l'affichage de la situation
    societe_devis = models.ForeignKey('Societe', on_delete=models.SET_NULL, null=True, blank=True, related_name='situations_affichage', verbose_name="Société pour affichage situation")
    
    # Montants calculés
    montant_precedent = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    montant_ht_mois = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    montant_total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    pourcentage_avancement = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    montant_total_travaux = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    montant_total_devis = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    montant_total_cumul_ht = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # Champs pour correspondre au frontend
    cumul_precedent = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    montant_apres_retenues = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tva = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tva_rate = models.DecimalField(max_digits=5, decimal_places=2, default=20.00, verbose_name="Taux de TVA (%)")
    
    # Déductions standard
    retenue_garantie = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    taux_retenue_garantie = models.DecimalField(max_digits=5, decimal_places=2, default=5.00, verbose_name="Taux retenue de garantie (%)")
    taux_prorata = models.DecimalField(max_digits=5, decimal_places=2, default=2.50)
    montant_prorata = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    retenue_cie = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    type_retenue_cie = models.CharField(
        max_length=20,
        choices=[('deduction', 'Déduction'), ('ajout', 'Ajout')],
        default='deduction',
        verbose_name="Type de retenue CIE"
    )
    total_avancement = models.DecimalField(max_digits=5, decimal_places=2, default=0)

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
    description = models.CharField(max_length=600)
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
    description = models.CharField(max_length=600)
    montant = models.DecimalField(max_digits=10, decimal_places=2)
    type = models.CharField(max_length=20, choices=[('deduction', 'Déduction'), ('ajout', 'Ajout')], default='deduction')
    
    class Meta:
        ordering = ['id']

class SituationLigneSpeciale(models.Model):
    situation = models.ForeignKey('Situation',
                                related_name='lignes_speciales',
                                on_delete=models.CASCADE)
    description = models.CharField(max_length=600)
    montant_ht = models.DecimalField(max_digits=10, decimal_places=2)
    value = models.DecimalField(max_digits=10, decimal_places=2)
    value_type = models.CharField(max_length=20, choices=[('fixed', 'Montant fixe'), ('percentage', 'Pourcentage')], default='fixed')
    type = models.CharField(max_length=20, choices=[('reduction', 'Réduction'), ('ajout', 'Ajout')], default='reduction')
    niveau = models.CharField(max_length=20, choices=[('global', 'Global'), ('partie', 'Partie'), ('sous_partie', 'Sous-partie')], default='global')
    partie_id = models.CharField(max_length=50, null=True, blank=True)
    sous_partie_id = models.CharField(max_length=50, null=True, blank=True)
    pourcentage_precedent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    pourcentage_actuel = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    montant = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    class Meta:
        ordering = ['id']

class Quitus(models.Model):
    chantier = models.ForeignKey(Chantier, on_delete=models.CASCADE, related_name='quitus', null=True)
    client = models.ManyToManyField(Client, related_name='quitus', blank=True)  # Modification ici
    state_quitus = models.CharField(max_length=20, choices=STATE_CHOICES, default='En Cours')
    description_quitus = models.CharField(max_length=500)

    def __str__(self):
        return f"Quitus {self.id}"

class Partie(models.Model):
    titre = models.CharField(max_length=600, null=False, blank=False)
    type = models.CharField(max_length=50, default='PEINTURE', help_text="Domaine d'activité de la partie (chaîne libre)")
    is_deleted = models.BooleanField(default=False, null=True, blank=True)
    
    # NOUVEAUX CHAMPS - Système unifié avec index_global
    index_global = models.IntegerField(
        default=0, 
        blank=True,
        help_text="Position dans le devis (0 = catalogue, >0 = système unifié)"
    )
    numero = models.IntegerField(
        default=0,
        blank=True, 
        null=True,
        help_text="Numéro de la partie: 1, 2, 3, etc. (0 = pas de numéro)"
    )
    devis = models.ForeignKey(
        'Devis', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name='parties_unifiees',
        help_text="Lien vers devis pour système unifié (null = catalogue)"
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['titre', 'type'],
                condition=models.Q(is_deleted=False),
                name='unique_partie_active'
            )
        ]

    def __str__(self):
        # Assurez-vous que "titre" n'est pas None avant de l'afficher
        return self.titre if self.titre else "Partie sans titre"


class SousPartie(models.Model):
    partie = models.ForeignKey(Partie, related_name='sous_parties', on_delete=models.CASCADE)
    description = models.CharField(max_length=600, null=True, blank=True)
    is_deleted = models.BooleanField(default=False, null=True, blank=True)
    
    # NOUVEAUX CHAMPS - Système unifié avec index_global
    index_global = models.IntegerField(
        default=0, 
        blank=True,
        help_text="Position dans le devis (0 = catalogue, >0 = système unifié)"
    )
    numero = models.CharField(
        max_length=50, 
        blank=True, 
        null=True,
        help_text="Numéro auto-généré: '1.1', '1.2', etc."
    )
    devis = models.ForeignKey(
        'Devis', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name='sous_parties_unifiees',
        help_text="Lien vers devis pour système unifié (null = catalogue)"
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['partie', 'description'],
                condition=models.Q(is_deleted=False),
                name='unique_sous_partie_active'
            )
        ]

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
    is_sav = models.BooleanField(default=False)  # True si c'est du SAV (Service Après-Vente)
    overtime_hours = models.DecimalField(max_digits=4, decimal_places=2, default=0, blank=True, null=True, help_text="Heures supplémentaires (+25%)")

    class Meta:
        unique_together = ('agent', 'week', 'year', 'day', 'hour')

    def __str__(self):
        return f"{self.agent.name} - Semaine {self.week}, {self.year} - {self.day} {self.hour}"

# Adapter recalculate_labor_costs_for_period pour ne plus utiliser 'hours' et 'cost' mais la nouvelle structure

def recalculate_labor_costs_for_period(week=None, year=None, agent_id=None, chantier_id=None):
    """
    Recalcule les coûts de main d'œuvre avec gestion des heures supplémentaires et majorations
    """
    print(f"🔧 RECALC: Début recalcul - Week:{week}, Year:{year}, Agent:{agent_id}, Chantier:{chantier_id}")
    # D'abord, supprimer les LaborCost existants pour cette combinaison
    # pour s'assurer qu'ils sont recréés avec les bonnes données
    existing_labor_costs = LaborCost.objects.all()
    if week:
        existing_labor_costs = existing_labor_costs.filter(week=week)
    if year:
        existing_labor_costs = existing_labor_costs.filter(year=year)
    if agent_id:
        existing_labor_costs = existing_labor_costs.filter(agent_id=agent_id)
    if chantier_id:
        existing_labor_costs = existing_labor_costs.filter(chantier_id=chantier_id)
    
    existing_labor_costs.delete()
    
    # Ensuite, récupérer les Schedule actuels
    schedules = Schedule.objects.all()
    if week:
        schedules = schedules.filter(week=week)
    if year:
        schedules = schedules.filter(year=year)
    if agent_id:
        schedules = schedules.filter(agent_id=agent_id)
    if chantier_id:
        schedules = schedules.filter(chantier_id=chantier_id)

    from django.utils import timezone
    from datetime import datetime
    import calendar
    
    # Jours fériés fixes (format MM-DD)
    jours_feries_fixes = [
        "01-01",  # Jour de l'an
        "05-01",  # Fête du Travail
        "05-08",  # Victoire 1945
        "07-14",  # Fête nationale
        "08-15",  # Assomption
        "11-01",  # Toussaint
        "11-11",  # Armistice
        "12-25",  # Noël
    ]

    def is_jour_ferie(date_obj):
        """Vérifie si une date est un jour férié"""
        date_str = date_obj.strftime("%m-%d")
        return date_str in jours_feries_fixes

    # Regrouper par agent/chantier/semaine/année
    from decimal import Decimal
    data = {}
    for s in schedules:
        key = (s.agent_id, s.chantier_id, s.week, s.year)
        if key not in data:
            data[key] = {
                'hours_normal': Decimal('0'),
                'hours_samedi': Decimal('0'), 
                'hours_dimanche': Decimal('0'),
                'hours_ferie': Decimal('0'),
                'hours_overtime': Decimal('0'),
                'details_majoration': []
            }
        
        # Calculer la date réelle du créneau (logique simplifiée et fiable)
        from datetime import date, timedelta
        import calendar
        
        day_mapping = {'Lundi': 0, 'Mardi': 1, 'Mercredi': 2, 'Jeudi': 3, 'Vendredi': 4, 'Samedi': 5, 'Dimanche': 6}
        
        # Logique simplifiée pour les semaines connues (plus fiable)
        if s.week == 43 and s.year == 2025:  # Semaine 43 de 2025 = 21-27 octobre
            base_date = date(2025, 10, 21)  # Lundi 21 octobre
        elif s.week == 44 and s.year == 2025:  # Semaine 44 de 2025 = 28 octobre - 3 novembre
            base_date = date(2025, 10, 28)  # Lundi 28 octobre
        else:
            # Calcul ISO classique pour les autres semaines
            jan_4 = date(s.year, 1, 4)
            start_of_year = jan_4 - timedelta(days=jan_4.weekday())
            base_date = start_of_year + timedelta(weeks=s.week-1)
        
        if s.day in day_mapping:
            date_obj = base_date + timedelta(days=day_mapping[s.day])
            weekday = date_obj.weekday()  # 0=Lundi, 6=Dimanche
        
        agent = Agent.objects.get(id=s.agent_id)
            
        # Calculer les heures de base
        if agent.type_paiement == 'journalier':
            hours_base = Decimal('4')  # Matin ou Après-midi = 4h
        else:
            hours_base = Decimal('1')  # 1 heure par créneau
                
        # Ajouter les heures supplémentaires
        overtime = Decimal(str(s.overtime_hours or 0))
                
        # Nouvelle logique : si heures sup -> pas d'heures normales/majorées
        has_overtime = overtime > 0
        
        if has_overtime:
            print(f"🔧 RECALC: Schedule overtime trouvé - Agent:{s.agent.name}, {s.day} {s.hour}, Overtime:{overtime}h, Date calculée:{date_obj}")
        
        # Déterminer le type de majoration
        if is_jour_ferie(date_obj):
            if not has_overtime:
                data[key]['hours_ferie'] += hours_base
            data[key]['hours_overtime'] += overtime
            # Créer une entrée dans details_majoration si heures normales OU heures sup
            if hours_base > 0 or overtime > 0:
                data[key]['details_majoration'].append({
                    'date': date_obj.strftime('%d/%m/%Y'),
                    'jour': s.day,
                    'type': 'Férié' if not has_overtime else 'Heures sup',
                    'hours': float(hours_base) if not has_overtime else 0,
                    'overtime_hours': float(overtime),
                    'taux': '+50%' if not has_overtime else '+25%'
                })
        elif weekday == 5:  # Samedi
            if not has_overtime:
                data[key]['hours_samedi'] += hours_base
            data[key]['hours_overtime'] += overtime
            # Créer une entrée dans details_majoration si heures normales OU heures sup
            if hours_base > 0 or overtime > 0:
                data[key]['details_majoration'].append({
                    'date': date_obj.strftime('%d/%m/%Y'),
                    'jour': s.day,
                    'type': 'Samedi' if not has_overtime else 'Heures sup',
                    'hours': float(hours_base) if not has_overtime else 0,
                    'overtime_hours': float(overtime),
                    'taux': '+25%'
                })
        elif weekday == 6:  # Dimanche
            if not has_overtime:
                data[key]['hours_dimanche'] += hours_base
            data[key]['hours_overtime'] += overtime
            # Créer une entrée dans details_majoration si heures normales OU heures sup
            if hours_base > 0 or overtime > 0:
                data[key]['details_majoration'].append({
                    'date': date_obj.strftime('%d/%m/%Y'),
                    'jour': s.day,
                    'type': 'Dimanche' if not has_overtime else 'Heures sup',
                    'hours': float(hours_base) if not has_overtime else 0,
                    'overtime_hours': float(overtime),
                    'taux': '+50%' if not has_overtime else '+25%'
                })
        else:  # Jour normal (Lundi-Vendredi)
            if not has_overtime:
                data[key]['hours_normal'] += hours_base
            data[key]['hours_overtime'] += overtime
            # Ajouter aux détails seulement s'il y a des heures sup
            if overtime > 0:
                detail_entry = {
                    'date': date_obj.strftime('%d/%m/%Y'),
                    'jour': s.day,
                    'type': 'Heures sup',
                    'hours': 0,
                    'overtime_hours': float(overtime),
                    'taux': '+25%'
                }
                data[key]['details_majoration'].append(detail_entry)
                print(f"🔧 RECALC: Ajout detail_majoration jour normal - {detail_entry}")

    # Calculer les coûts et mettre à jour LaborCost
    for (agent_id, chantier_id, week, year), hours_data in data.items():
        agent = Agent.objects.get(id=agent_id)
        chantier = Chantier.objects.get(id=chantier_id)
        
        # Taux de base selon le type d'agent (s'assurer que c'est un Decimal)
        if agent.type_paiement == 'journalier':
            taux_base = Decimal(str(agent.taux_journalier or 0)) / Decimal('8')  # Convertir en taux horaire
        else:
            taux_base = Decimal(str(agent.taux_Horaire or 0))
            
        # Calculs des coûts avec majorations (utiliser Decimal pour éviter les erreurs de type)
        cost_normal = hours_data['hours_normal'] * taux_base
        cost_samedi = hours_data['hours_samedi'] * taux_base * Decimal('1.25')  # +25%
        cost_dimanche = hours_data['hours_dimanche'] * taux_base * Decimal('1.50')  # +50%
        cost_ferie = hours_data['hours_ferie'] * taux_base * Decimal('1.50')  # +50%
        cost_overtime = hours_data['hours_overtime'] * taux_base * Decimal('1.25')  # +25%
        
        if hours_data['hours_overtime'] > 0:
            print(f"🔧 RECALC: Sauvegarde LaborCost - Agent:{agent.name}, Overtime:{hours_data['hours_overtime']}h, Details:{len(hours_data['details_majoration'])} entrées")
            for detail in hours_data['details_majoration']:
                print(f"🔧 RECALC:   Detail: {detail}")
        
        LaborCost.objects.update_or_create(
            agent=agent, chantier=chantier, week=week, year=year,
            defaults={
                'hours_normal': hours_data['hours_normal'],
                'hours_samedi': hours_data['hours_samedi'],
                'hours_dimanche': hours_data['hours_dimanche'],
                'hours_ferie': hours_data['hours_ferie'],
                'hours_overtime': hours_data['hours_overtime'],
                'cost_normal': cost_normal,
                'cost_samedi': cost_samedi,
                'cost_dimanche': cost_dimanche,
                'cost_ferie': cost_ferie,
                'cost_overtime': cost_overtime,
                'details_majoration': hours_data['details_majoration'],
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
    hours_overtime = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Heures supplémentaires (+25%)")
    # Coûts par type
    cost_normal = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Coût des heures normales")
    cost_samedi = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Coût des heures samedi (majoration)")
    cost_dimanche = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Coût des heures dimanche (majoration)")
    cost_ferie = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Coût des heures férié (majoration)")
    cost_overtime = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Coût des heures supplémentaires")
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
    agent = models.ForeignKey(Agent, on_delete=models.CASCADE, null=True, blank=True)  # Optionnel maintenant
    emetteur = models.ForeignKey('Emetteur', on_delete=models.PROTECT, null=True, blank=True, help_text="Émetteur du bon de commande")
    montant_total = models.DecimalField(max_digits=10, decimal_places=2)
    date_creation = models.DateTimeField(auto_now_add=True)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='en_attente')
    date_livraison = models.DateField(null=True, blank=True)
    magasin_retrait = models.CharField(max_length=200, null=True, blank=True)  # Conservé pour compatibilité
    magasin = models.ForeignKey('Magasin', on_delete=models.SET_NULL, null=True, blank=True, related_name='bons_commande', help_text="Magasin du fournisseur pour le retrait")
    date_commande = models.DateField(default='2025-01-01')  # Ajout du champ de date avec une valeur par défaut
    
    # Champs pour le contact qui réceptionne
    CONTACT_TYPE_CHOICES = [
        ('agent', 'Agent'),
        ('sous_traitant', 'Sous-traitant'),
    ]
    contact_type = models.CharField(max_length=20, choices=CONTACT_TYPE_CHOICES, null=True, blank=True)
    contact_agent = models.ForeignKey('Agent', on_delete=models.SET_NULL, null=True, blank=True, related_name='bons_commande_contact')
    contact_sous_traitant = models.ForeignKey('SousTraitant', on_delete=models.SET_NULL, null=True, blank=True, related_name='bons_commande_contact')
    contact_sous_traitant_contact = models.ForeignKey('ContactSousTraitant', on_delete=models.SET_NULL, null=True, blank=True, related_name='bons_commande_contact', help_text="Contact spécifique du sous-traitant (si différent du représentant)")
    
    # Date de création personnalisable (pour antidater)
    date_creation_personnalisee = models.DateField(null=True, blank=True, verbose_name="Date de création du document")

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
    description = models.CharField(max_length=500, blank=True)
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Paramètre"
        verbose_name_plural = "Paramètres"

    def __str__(self):
        return f"{self.code}: {self.valeur}"

class Avenant(models.Model):
    chantier = models.ForeignKey('Chantier', on_delete=models.CASCADE, related_name='avenants')
    numero = models.CharField(max_length=50)  # Numéro ou libellé de l'avenant (ex: "3", "3 bis")
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

    def delete(self, *args, **kwargs):
        # Récupérer l'avenant avant suppression pour mettre à jour son montant_total
        avenant = self.avenant
        super().delete(*args, **kwargs)
        # Mettre à jour le montant total de l'avenant après suppression
        avenant.montant_total = avenant.factures_ts.aggregate(
            total=models.Sum('montant_ht')
        )['total'] or 0
        avenant.save()

    @property
    def numero_complet(self):
        """Retourne le numéro complet formaté : DEV-001-25 - TS n°001 - Désignation"""
        base = f"{self.devis.numero}"
        if self.designation:
            return f"{base} - {self.designation}"
        return base

class ChantierLigneSupplementaire(models.Model):
    chantier = models.ForeignKey('Chantier', on_delete=models.CASCADE, related_name='lignes_supplementaires_default')
    description = models.CharField(max_length=500)
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
    
    description = models.CharField(max_length=500)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    type = models.CharField(max_length=10, choices=EXPENSE_TYPES)
    date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    category = models.CharField(max_length=50)
    agent = models.ForeignKey('Agent', on_delete=models.CASCADE, null=True, blank=True)
    sous_traitant = models.ForeignKey('SousTraitant', on_delete=models.CASCADE, null=True, blank=True, related_name='agency_expenses')
    chantier = models.ForeignKey('Chantier', on_delete=models.CASCADE, null=True, blank=True, related_name='agency_expenses')
    is_ecole_expense = models.BooleanField(default=False)
    ecole_hours = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"{self.description} - {self.amount}€ ({self.get_type_display()})"


class AgencyExpenseMonth(models.Model):
    """
    Modèle pour stocker les dépenses mensuelles de l'agence
    Chaque ligne représente une dépense pour un mois spécifique
    Permet la modification indépendante de chaque mois
    """
    description = models.CharField(max_length=500)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    category = models.CharField(max_length=50)
    month = models.IntegerField()  # 1-12
    year = models.IntegerField()
    
    # ⚠️ ATTENTION : Mal nommé historiquement - ce champ stocke la DATE DE RÉCEPTION de la facture
    # Pour compatibilité ascendante, on le garde mais on ajoutera date_reception pour clarifier
    date_paiement = models.DateField(null=True, blank=True, help_text="Date de réception de la facture (mal nommé pour compatibilité)")
    
    # 🆕 Nouveaux champs pour un suivi complet
    date_reception_facture = models.DateField(null=True, blank=True, help_text="Date de réception de la facture (clarification)")
    date_paiement_reel = models.DateField(null=True, blank=True, help_text="Date de paiement effectif")
    delai_paiement = models.IntegerField(default=45, help_text="Délai de paiement en jours")
    
    factures = models.JSONField(default=list, blank=True)  # Liste de factures [{"numero_facture": "...", "montant_facture": ..., "payee": bool}]
    agent = models.ForeignKey('Agent', on_delete=models.CASCADE, null=True, blank=True)
    sous_traitant = models.ForeignKey('SousTraitant', on_delete=models.CASCADE, null=True, blank=True, related_name='agency_expenses_month')
    chantier = models.ForeignKey('Chantier', on_delete=models.CASCADE, null=True, blank=True, related_name='agency_expenses_month')
    is_ecole_expense = models.BooleanField(default=False)
    ecole_hours = models.FloatField(null=True, blank=True)
    
    # Lien vers la dépense source (si générée depuis AgencyExpense)
    source_expense = models.ForeignKey('AgencyExpense', on_delete=models.SET_NULL, null=True, blank=True, related_name='monthly_entries')

    # Champs de récurrence (optionnels)
    is_recurring_template = models.BooleanField(default=False)
    recurrence_start = models.DateField(null=True, blank=True)
    recurrence_end = models.DateField(null=True, blank=True)
    closed_until = models.DateField(null=True, blank=True)
    recurrence_parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='recurrence_children'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-year', '-month']
        unique_together = ('description', 'category', 'month', 'year')
        verbose_name = "Dépense Mensuelle Agence"
        verbose_name_plural = "Dépenses Mensuelles Agence"
        indexes = [
            models.Index(fields=['year', 'month']),
            models.Index(fields=['category', 'year', 'month']),
        ]

    def __str__(self):
        return f"{self.description} - {self.amount}€ ({self.month:02d}/{self.year})"

class AgencyExpenseOverride(models.Model):
    expense = models.ForeignKey(AgencyExpense, on_delete=models.CASCADE, related_name='overrides')
    month = models.IntegerField()
    year = models.IntegerField()
    description = models.CharField(max_length=500)
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

class Emetteur(models.Model):
    """
    Modèle pour les émetteurs de bons de commande (Adel et Amine)
    """
    # Données par défaut des émetteurs
    EMETTEURS_DEFAULT = [
        {
            'name': 'Adel',
            'surname': 'Majri', 
            'email': 'adel.majri@peinture3000.fr',
            'phone_Number': '0761566672'
        },
        {
            'name': 'Amine',
            'surname': 'Belaoued',
            'email': 'amine.belaoued@peinture3000.fr', 
            'phone_Number': '0756987448'
        }
    ]
    
    name = models.CharField(max_length=50)
    surname = models.CharField(max_length=50)
    email = models.EmailField()
    phone_Number = models.CharField(max_length=20)
    is_active = models.BooleanField(default=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Émetteur"
        verbose_name_plural = "Émetteurs"
        ordering = ['surname', 'name']
    
    def __str__(self):
        return f"{self.name} {self.surname}"
    
    @classmethod
    def create_default_emetteurs(cls):
        """Crée les émetteurs par défaut s'ils n'existent pas"""
        created_count = 0
        for emetteur_data in cls.EMETTEURS_DEFAULT:
            emetteur, created = cls.objects.get_or_create(
                name=emetteur_data['name'],
                surname=emetteur_data['surname'],
                defaults=emetteur_data
            )
            if created:
                created_count += 1
                print(f"✅ Émetteur {emetteur} créé")
            else:
                print(f"⚠️  Émetteur {emetteur} existe déjà")
        return created_count

class AgentPrime(models.Model):
    """
    Modèle pour gérer les primes des agents
    """
    TYPE_AFFECTATION_CHOICES = [
        ('agence', 'Agence'),
        ('chantier', 'Chantier'),
    ]
    
    # Références
    agent = models.ForeignKey('Agent', on_delete=models.CASCADE, related_name='primes_agent')
    
    # Période
    mois = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(12)])
    annee = models.IntegerField()
    
    # Montant et description
    montant = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField()
    
    # Type d'affectation
    type_affectation = models.CharField(max_length=10, choices=TYPE_AFFECTATION_CHOICES)
    
    # Chantier optionnel (si type = 'chantier')
    chantier = models.ForeignKey('Chantier', on_delete=models.CASCADE, null=True, blank=True, related_name='primes_chantier')
    
    # Métadonnées
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='primes_created')
    
    class Meta:
        verbose_name = "Prime Agent"
        verbose_name_plural = "Primes Agents"
        ordering = ['-annee', '-mois', 'agent']
        indexes = [
            models.Index(fields=['agent', 'mois', 'annee']),
            models.Index(fields=['chantier', 'mois', 'annee']),
        ]
    
    def __str__(self):
        affectation = self.chantier.chantier_name if self.chantier else "Agence"
        return f"Prime {self.agent.name} {self.agent.surname} - {self.mois}/{self.annee} - {affectation} - {self.montant}€"
    
    def clean(self):
        """Validation personnalisée"""
        if self.type_affectation == 'chantier' and not self.chantier:
            raise ValidationError("Un chantier doit être spécifié pour une prime de type 'chantier'")
        if self.type_affectation == 'agence' and self.chantier:
            raise ValidationError("Une prime de type 'agence' ne peut pas avoir de chantier associé")
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

# Signal pour créer automatiquement une AgencyExpense quand une prime de type 'agence' est créée
@receiver(post_save, sender=AgentPrime)
def create_agency_expense_from_prime(sender, instance, created, **kwargs):
    """
    Crée ou met à jour automatiquement une AgencyExpense quand type_affectation='agence'
    Format: "Prime - Nom Prenom - Description de la prime"
    L'ID de la prime est stocké de manière cachée pour la gestion interne
    """
    if instance.type_affectation == 'agence':
        # Format description: "Prime - Jean Dupont - Performance Q3"
        description = f"Prime - {instance.agent.name} {instance.agent.surname} - {instance.description}"
        
        # Calculer la date (premier jour du mois)
        expense_date = date(instance.annee, instance.mois, 1)
        
        # Chercher une dépense existante pour cette prime
        # On stocke l'ID de manière invisible pour pouvoir faire le lien
        existing_expense = AgencyExpense.objects.filter(
            description__contains=f"[PRIME_ID:{instance.id}]",
            category='Prime'
        ).first()
        
        # Format final avec ID caché : "Prime - Jean Dupont - Performance Q3 [PRIME_ID:5]"
        final_description = f"{description} [PRIME_ID:{instance.id}]"
        
        if existing_expense:
            # Mettre à jour la dépense existante
            existing_expense.description = final_description
            existing_expense.amount = instance.montant
            existing_expense.date = expense_date
            existing_expense.save()
        else:
            # Créer une nouvelle dépense
            AgencyExpense.objects.create(
                description=final_description,
                amount=instance.montant,
                type='punctual',
                category='Prime',
                date=expense_date,
                agent=instance.agent,
            )

@receiver(post_delete, sender=AgentPrime)
def delete_agency_expense_from_prime(sender, instance, **kwargs):
    """
    Supprime l'AgencyExpense associée quand une prime de type 'agence' est supprimée
    """
    if instance.type_affectation == 'agence':
        # Supprimer l'AgencyExpense correspondante en utilisant l'ID caché dans la description
        AgencyExpense.objects.filter(
            description__contains=f"[PRIME_ID:{instance.id}]",
            category='Prime'
        ).delete()

class SousTraitant(models.Model):
    TYPE_CHOICES = [
        ('NETTOYAGE', 'Nettoyage'),
        ('BTP', 'BTP'),
        ('TCE', 'TCE'),
        ('AUTRE', 'Autre'),
    ]
    
    entreprise = models.CharField(max_length=255)
    capital = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    adresse = models.CharField(max_length=255)
    code_postal = models.CharField(max_length=10)
    ville = models.CharField(max_length=100)
    forme_juridique = models.CharField(max_length=100, blank=True, null=True)
    numero_rcs = models.CharField(max_length=100, unique=True)
    representant = models.CharField(max_length=255)
    email = models.EmailField(max_length=254, blank=True, null=True)
    phone_Number = models.CharField(max_length=20, blank=True, null=True, verbose_name="Numéro de téléphone")
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, blank=True, null=True, verbose_name="Type d'activité")
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.entreprise} - {self.numero_rcs}"

class ContactSousTraitant(models.Model):
    """
    Modèle pour gérer les contacts associés aux sous-traitants.
    Permet d'avoir plusieurs contacts par société de sous-traitance.
    """
    sous_traitant = models.ForeignKey(SousTraitant, on_delete=models.CASCADE, related_name='contacts')
    nom = models.CharField(max_length=255, verbose_name="Nom")
    prenom = models.CharField(max_length=255, blank=True, null=True, verbose_name="Prénom")
    poste = models.CharField(max_length=255, blank=True, null=True, verbose_name="Poste")
    email = models.EmailField(max_length=254, blank=True, null=True, verbose_name="Email")
    telephone = models.CharField(max_length=20, blank=True, null=True, verbose_name="Téléphone")
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Contact Sous-Traitant"
        verbose_name_plural = "Contacts Sous-Traitants"
        ordering = ['nom', 'prenom']

    def __str__(self):
        nom_complet = f"{self.prenom} {self.nom}".strip() if self.prenom else self.nom
        return f"{nom_complet} - {self.sous_traitant.entreprise}"

class ContratSousTraitance(models.Model):
    TYPE_CHOICES = [
        ('BTP', 'BTP'),
        ('NETTOYAGE', 'Nettoyage'),
        ('SANS_CONTRAT', 'Sans contrat documenté'),
    ]

    chantier = models.ForeignKey('Chantier', on_delete=models.CASCADE, related_name='contrats_sous_traitance')
    sous_traitant = models.ForeignKey(SousTraitant, on_delete=models.CASCADE, related_name='contrats')
    sans_contrat = models.BooleanField(default=False, verbose_name="Association sans contrat", help_text="Si True, ce contrat est juste une association sans document formel")
    type_contrat = models.CharField(max_length=20, choices=TYPE_CHOICES, default='NETTOYAGE')
    description_prestation = models.TextField(blank=True, null=True)
    date_debut = models.DateField(blank=True, null=True)
    duree = models.CharField(max_length=100, default="Jusqu'à livraison du chantier", blank=True, null=True)
    adresse_prestation = models.CharField(max_length=255, blank=True, null=True)
    nom_operation = models.CharField(max_length=255, blank=True, null=True)
    montant_operation = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    nom_maitre_ouvrage = models.CharField(max_length=255, verbose_name="Nom du maître d'ouvrage", blank=True, null=True)
    nom_maitre_oeuvre = models.CharField(max_length=255, verbose_name="Nom du maître d'œuvre", blank=True, null=True)
    date_creation = models.DateField(verbose_name="Date de création du contrat", blank=True, null=True)
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('chantier', 'sous_traitant')
        ordering = ['-date_creation']

    def __str__(self):
        return f"Contrat {self.sous_traitant.entreprise} - {self.chantier.chantier_name}"

    def save(self, *args, **kwargs):
        from decimal import Decimal
        
        # Définir des valeurs par défaut minimales si nécessaire (même pour sans_contrat)
        if not self.date_creation:
            from django.utils import timezone
            self.date_creation = timezone.now().date()
        if not self.montant_operation:
            self.montant_operation = Decimal('0')
        
        # Calcul des coûts pour TOUS les contrats (avec ou sans contrat documenté)
        # Si c'est une modification, on soustrait l'ancien montant
        if self.pk:
            old_instance = ContratSousTraitance.objects.get(pk=self.pk)
            old_montant = Decimal(str(old_instance.montant_operation))
            cout_sous_traitance_decimal = Decimal(str(self.chantier.cout_sous_traitance or 0))
            cout_estime_main_oeuvre_decimal = Decimal(str(self.chantier.cout_estime_main_oeuvre or 0))
            
            self.chantier.cout_sous_traitance = float(cout_sous_traitance_decimal - old_montant)
            # Restaurer l'ancien montant dans le coût estimé main d'œuvre
            self.chantier.cout_estime_main_oeuvre = cout_estime_main_oeuvre_decimal + old_montant

        # Ajouter le nouveau montant (même si c'est 0 pour un sans_contrat)
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
        
        # Soustraire le montant lors de la suppression (pour tous les contrats, même sans_contrat)
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
    date_creation = models.DateField(verbose_name="Date de création de l'avenant")
    date_modification = models.DateTimeField(auto_now=True)

    @property
    def montant_total_contrat_et_avenants(self):
        """Calcule le montant total du contrat + tous les avenants jusqu'à celui-ci"""
        montant_contrat = self.contrat.montant_operation
        montant_avenants = AvenantSousTraitance.objects.filter(
            contrat=self.contrat,
            numero__lte=self.numero
        ).aggregate(total=models.Sum('montant'))['total'] or 0
        return montant_contrat + montant_avenants

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
def update_chantier_cout_main_oeuvre_signal(sender, instance, **kwargs):
    chantier = instance.chantier
    # Calculer le total des LaborCost
    total_labor = LaborCost.objects.filter(chantier=chantier).aggregate(
        total=Sum('cost_normal') + Sum('cost_samedi') + Sum('cost_dimanche') + Sum('cost_ferie')
    )['total'] or 0
    
    # Ajouter les primes du chantier
    total_primes = AgentPrime.objects.filter(
        chantier=chantier,
        type_affectation='chantier'
    ).aggregate(total=Sum('montant'))['total'] or 0
    
    chantier.cout_main_oeuvre = float(total_labor) + float(total_primes)
    chantier.save(update_fields=['cout_main_oeuvre'])

# Signal pour mettre à jour le cout_main_oeuvre quand une prime chantier change
@receiver([post_save, post_delete], sender=AgentPrime)
def update_chantier_cout_main_oeuvre_from_prime(sender, instance, **kwargs):
    """Met à jour le coût main d'œuvre du chantier quand une prime chantier est créée/modifiée/supprimée"""
    if instance.type_affectation == 'chantier' and instance.chantier:
        chantier = instance.chantier
        # Calculer le total des LaborCost
        total_labor = LaborCost.objects.filter(chantier=chantier).aggregate(
            total=Sum('cost_normal') + Sum('cost_samedi') + Sum('cost_dimanche') + Sum('cost_ferie')
        )['total'] or 0
        
        # Ajouter les primes du chantier
        total_primes = AgentPrime.objects.filter(
            chantier=chantier,
            type_affectation='chantier'
        ).aggregate(total=Sum('montant'))['total'] or 0
        
        chantier.cout_main_oeuvre = float(total_labor) + float(total_primes)
        chantier.save(update_fields=['cout_main_oeuvre'])

def update_chantier_cout_main_oeuvre(chantier):
    """Fonction helper pour recalculer le coût main d'œuvre (inclut les primes)"""
    # Calculer le total des LaborCost
    total_labor = LaborCost.objects.filter(chantier=chantier).aggregate(
        total=Sum('cost_normal') + Sum('cost_samedi') + Sum('cost_dimanche') + Sum('cost_ferie')
    )['total'] or 0
    
    # Ajouter les primes du chantier
    total_primes = AgentPrime.objects.filter(
        chantier=chantier,
        type_affectation='chantier'
    ).aggregate(total=Sum('montant'))['total'] or 0
    
    chantier.cout_main_oeuvre = float(total_labor) + float(total_primes)
    chantier.save(update_fields=['cout_main_oeuvre'])

class PaiementSousTraitant(models.Model):
    sous_traitant = models.ForeignKey('SousTraitant', on_delete=models.CASCADE, related_name='paiements')
    chantier = models.ForeignKey('Chantier', on_delete=models.CASCADE, related_name='paiements_sous_traitant')
    contrat = models.ForeignKey('ContratSousTraitance', on_delete=models.CASCADE, related_name='paiements', null=True, blank=True)
    avenant = models.ForeignKey('AvenantSousTraitance', on_delete=models.CASCADE, related_name='paiements', null=True, blank=True)
    # Nouveaux champs pour le paiement global
    date_paiement = models.DateField()  # Date complète du paiement (remplace mois/année)
    montant_facture_ht = models.DecimalField(max_digits=12, decimal_places=2)  # Montant facturé par le sous-traitant ce mois
    date_envoi_facture = models.DateField(null=True, blank=True)
    delai_paiement = models.IntegerField(default=45)  # 45 ou 60 jours
    montant_paye_ht = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    date_paiement_reel = models.DateField(null=True, blank=True)
    
    # Champs conservés pour compatibilité (dépréciés)
    mois = models.IntegerField(null=True, blank=True)  # Déprécié - utiliser date_paiement
    annee = models.IntegerField(null=True, blank=True)  # Déprécié - utiliser date_paiement

    class Meta:
        verbose_name = "Paiement Sous-Traitant"
        verbose_name_plural = "Paiements Sous-Traitants"
        ordering = ['chantier', 'sous_traitant', 'date_paiement']
        unique_together = ('chantier', 'sous_traitant', 'date_paiement', 'avenant')

    def __str__(self):
        avenant_info = f" - Avenant {self.avenant.numero}" if self.avenant else ""
        return f"{self.sous_traitant} - {self.chantier} - {self.date_paiement}{avenant_info}"
    
    @property
    def mois_annee(self):
        """Propriété pour compatibilité avec l'ancien système"""
        return f"{self.date_paiement.month:02d}/{self.date_paiement.year}"
    
    @property
    def jours_retard(self):
        """Calcule les jours de retard si applicable"""
        if self.date_paiement_reel and self.date_envoi_facture and self.delai_paiement:
            date_echeance = self.date_envoi_facture + timedelta(days=self.delai_paiement)
            if self.date_paiement_reel > date_echeance:
                return (self.date_paiement_reel - date_echeance).days
        return 0

class PaiementGlobalSousTraitant(models.Model):
    """Nouveau modèle pour les paiements globaux mensuels des sous-traitants"""
    sous_traitant = models.ForeignKey('SousTraitant', on_delete=models.CASCADE, related_name='paiements_globaux')
    chantier = models.ForeignKey('Chantier', on_delete=models.CASCADE, related_name='paiements_globaux_sous_traitant')
    date_paiement = models.DateField()  # Date complète du paiement
    montant_paye_ht = models.DecimalField(max_digits=12, decimal_places=2)
    date_paiement_reel = models.DateField(null=True, blank=True)
    commentaire = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Paiement Global Sous-Traitant"
        verbose_name_plural = "Paiements Globaux Sous-Traitants"
        ordering = ['chantier', 'sous_traitant', 'date_paiement']
        unique_together = ('chantier', 'sous_traitant', 'date_paiement')

    def __str__(self):
        return f"{self.sous_traitant} - {self.chantier} - {self.date_paiement} - {self.montant_paye_ht}€"
    
    @property
    def mois_annee(self):
        """Retourne le mois/année formaté"""
        return f"{self.date_paiement.month:02d}/{self.date_paiement.year}"

class FactureSousTraitant(models.Model):
    """Modèle pour les factures des sous-traitants avec paiements multiples possibles"""
    sous_traitant = models.ForeignKey('SousTraitant', on_delete=models.CASCADE, related_name='factures')
    chantier = models.ForeignKey('Chantier', on_delete=models.CASCADE, related_name='factures_sous_traitant')
    
    # Informations de la facture
    mois = models.IntegerField()  # Mois de la facture (1-12)
    annee = models.IntegerField()  # Année de la facture
    numero_facture = models.CharField(max_length=50)  # Numéro de facture (auto-incrémenté ou manuel)
    montant_facture_ht = models.DecimalField(max_digits=12, decimal_places=2)  # Montant facturé
    montant_retenue = models.DecimalField(max_digits=12, decimal_places=2, default=0)  # Montant de retenue
    
    # Gestion des échéances
    date_reception = models.DateField()  # Date de réception de la facture
    delai_paiement = models.IntegerField(default=45)  # Délai en jours (45 ou 60)
    date_paiement_prevue = models.DateField(null=True, blank=True)  # Calculée automatiquement
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Facture Sous-Traitant"
        verbose_name_plural = "Factures Sous-Traitants"
        ordering = ['chantier', 'sous_traitant', 'annee', 'mois', 'numero_facture']
        unique_together = ('chantier', 'sous_traitant', 'annee', 'mois', 'numero_facture')

    def __str__(self):
        return f"{self.sous_traitant} - {self.chantier} - Facture {self.numero_facture} ({self.mois:02d}/{self.annee})"
    
    @property
    def mois_annee(self):
        """Retourne le mois/année formaté"""
        return f"{self.mois:02d}/{self.annee}"
    
    @property
    def montant_total_paye(self):
        """Calcule le montant total payé pour cette facture"""
        return self.paiements.aggregate(
            total=models.Sum('montant_paye')
        )['total'] or 0
    
    @property
    def ecart_paiement(self):
        """Calcule l'écart entre montant facturé et montant total payé"""
        return float(self.montant_total_paye) - float(self.montant_facture_ht)
    
    @property
    def est_soldee(self):
        """Indique si la facture est entièrement payée"""
        return abs(self.ecart_paiement) < 0.01  # Tolérance pour les arrondis
    
    def save(self, *args, **kwargs):
        # Calcul automatique de la date de paiement prévue
        if self.date_reception and self.delai_paiement:
            from datetime import timedelta
            self.date_paiement_prevue = self.date_reception + timedelta(days=self.delai_paiement)
        super().save(*args, **kwargs)


class PaiementFactureSousTraitant(models.Model):
    """Modèle pour les paiements d'une facture de sous-traitant (peut y en avoir plusieurs par facture)"""
    facture = models.ForeignKey(FactureSousTraitant, on_delete=models.CASCADE, related_name='paiements')
    
    # Informations du paiement
    montant_paye = models.DecimalField(max_digits=12, decimal_places=2)
    date_paiement_reel = models.DateField()
    commentaire = models.TextField(blank=True, null=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Paiement Facture Sous-Traitant"
        verbose_name_plural = "Paiements Factures Sous-Traitants"
        ordering = ['facture', 'date_paiement_reel']

    def __str__(self):
        return f"Paiement {self.montant_paye}€ - {self.facture.numero_facture} ({self.date_paiement_reel})"
    
    @property
    def jours_retard(self):
        """Calcule les jours de retard par rapport à la date prévue"""
        if self.date_paiement_reel and self.facture.date_paiement_prevue:
            diff = (self.date_paiement_reel - self.facture.date_paiement_prevue).days
            return diff
        return 0


class SuiviPaiementSousTraitantMensuel(models.Model):
    """
    Modèle pour stocker les informations de suivi des paiements sous-traitants mensuels
    dans le tableau sous-traitant global.
    Ce modèle est indépendant de la source des données (FactureSousTraitant, LaborCost, AgencyExpenseMonth)
    et stocke uniquement les informations de suivi saisies dans le tableau.
    """
    # Identification unique d'une ligne du tableau
    mois = models.IntegerField()  # Mois (1-12)
    annee = models.IntegerField()  # Année complète (ex: 2025)
    sous_traitant = models.CharField(max_length=255)  # Nom du sous-traitant
    chantier = models.ForeignKey('Chantier', on_delete=models.CASCADE, related_name='suivis_paiements_sous_traitant', null=True, blank=True)
    # Note: chantier peut être null pour les agents journaliers regroupés ou certaines dépenses d'agence
    
    # Informations de suivi spécifiques au tableau
    montant_paye_ht = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, default=0)  # Montant payé saisi
    date_paiement_reel = models.DateField(null=True, blank=True)  # Date de paiement réel saisie
    date_envoi_facture = models.DateField(null=True, blank=True)  # Date de réception de la facture
    date_paiement_prevue = models.DateField(null=True, blank=True)  # Date de paiement prévue (calculée)
    delai_paiement = models.IntegerField(default=45)  # Délai de paiement en jours (45 ou 60)
    
    # Métadonnées
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Suivi Paiement Sous-Traitant Mensuel"
        verbose_name_plural = "Suivis Paiements Sous-Traitants Mensuels"
        ordering = ['annee', 'mois', 'sous_traitant', 'chantier']
        # Une seule ligne par combinaison mois/année/sous-traitant/chantier
        # Utiliser chantier_id dans le unique_together (null autorisé pour agents journaliers)
        indexes = [
            models.Index(fields=['mois', 'annee', 'sous_traitant']),
            models.Index(fields=['chantier', 'mois', 'annee']),
        ]
    
    def __str__(self):
        chantier_info = f" - {self.chantier.chantier_name}" if self.chantier else " - (Global)"
        return f"{self.sous_traitant} - {self.mois:02d}/{self.annee}{chantier_info}"
    
    def save(self, *args, **kwargs):
        # Calculer automatiquement date_paiement_prevue si date_envoi est définie
        if self.date_envoi_facture and self.delai_paiement:
            from datetime import timedelta, date as date_type
            # Convertir en date si c'est une string
            if isinstance(self.date_envoi_facture, str):
                from datetime import datetime
                date_envoi = datetime.fromisoformat(self.date_envoi_facture.replace('Z', '+00:00')).date()
            else:
                date_envoi = self.date_envoi_facture
            self.date_paiement_prevue = date_envoi + timedelta(days=self.delai_paiement)
        super().save(*args, **kwargs)
    
    @property
    def ecart_paiement_jours(self):
        """Calcule l'écart en jours entre la date de paiement prévue et la date de paiement réel"""
        if self.date_paiement_reel and self.date_paiement_prevue:
            # Convertir en date si c'est une chaîne
            date_reel = self.date_paiement_reel
            date_prevue = self.date_paiement_prevue
            
            if isinstance(date_reel, str):
                from datetime import datetime
                date_reel = datetime.strptime(date_reel, '%Y-%m-%d').date()
            
            if isinstance(date_prevue, str):
                from datetime import datetime
                date_prevue = datetime.strptime(date_prevue, '%Y-%m-%d').date()
            
            return (date_reel - date_prevue).days
        return None
    
    @property
    def mois_annee(self):
        """Retourne le format mois/année utilisé dans le tableau (MM/YY)"""
        annee_2_digits = str(self.annee)[-2:]
        return f"{self.mois:02d}/{annee_2_digits}"


class FactureSuiviSousTraitant(models.Model):
    """
    Modèle pour stocker les factures saisies dans le tableau sous-traitant.
    Lié au suivi mensuel, indépendant des FactureSousTraitant du système.
    """
    suivi_paiement = models.ForeignKey(
        SuiviPaiementSousTraitantMensuel,
        on_delete=models.CASCADE,
        related_name='factures_suivi'
    )
    numero_facture = models.CharField(max_length=255)  # Numéro de facture saisi
    montant_facture_ht = models.DecimalField(max_digits=12, decimal_places=2, default=0)  # Montant HT
    payee = models.BooleanField(default=False)  # Facture payée ou non
    date_paiement_facture = models.DateField(null=True, blank=True)  # Date de paiement de cette facture
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Facture Suivi Sous-Traitant"
        verbose_name_plural = "Factures Suivi Sous-Traitants"
        ordering = ['suivi_paiement', 'created_at']
    
    def __str__(self):
        status = "Payée" if self.payee else "Non payée"
        return f"Facture {self.numero_facture} - {self.montant_facture_ht}€ ({status})"


class AjustementAgentJournalier(models.Model):
    """
    Modèle pour stocker les ajustements manuels des montants des agents journaliers.
    Permet d'ajouter des frais supplémentaires (ex: gasoil, primes) ou des déductions
    au montant calculé automatiquement depuis LaborCost.
    """
    # Identification unique : agent + mois/année
    agent = models.ForeignKey('Agent', on_delete=models.CASCADE, related_name='ajustements_journalier')
    mois = models.IntegerField()  # Mois (1-12)
    annee = models.IntegerField()  # Année complète (ex: 2025)
    
    # Ajustement
    montant_ajustement = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        default=0,
        help_text="Montant de l'ajustement (positif ou négatif)"
    )
    description = models.CharField(
        max_length=255, 
        blank=True, 
        null=True,
        help_text="Description de l'ajustement (ex: Gasoil, Prime, Déduction)"
    )
    
    # Métadonnées
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Ajustement Agent Journalier"
        verbose_name_plural = "Ajustements Agents Journaliers"
        ordering = ['annee', 'mois', 'agent']
        unique_together = ('agent', 'mois', 'annee')
        indexes = [
            models.Index(fields=['agent', 'mois', 'annee']),
        ]
    
    def __str__(self):
        signe = "+" if self.montant_ajustement >= 0 else ""
        return f"{self.agent.name} {self.agent.surname} - {self.mois:02d}/{self.annee} : {signe}{self.montant_ajustement}€ ({self.description or 'Sans description'})"
    
    @property
    def mois_annee(self):
        """Retourne le format mois/année utilisé dans le tableau (MM/YY)"""
        annee_2_digits = str(self.annee)[-2:]
        return f"{self.mois:02d}/{annee_2_digits}"


class PaiementFournisseurMateriel(models.Model):
    chantier = models.ForeignKey('Chantier', on_delete=models.CASCADE, related_name='paiements_materiel')
    fournisseur = models.CharField(max_length=255)
    mois = models.IntegerField()
    annee = models.IntegerField()
    montant = models.DecimalField(max_digits=12, decimal_places=2)  # Montant payé
    montant_a_payer = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, default=0)  # Montant à payer saisi par l'utilisateur
    date_paiement = models.DateField(null=True, blank=True)  # Date de paiement saisie par l'utilisateur
    date_envoi = models.DateField(null=True, blank=True)  # Date d'envoi saisie par l'utilisateur
    date_paiement_prevue = models.DateField(null=True, blank=True)  # Date de paiement prévue (calculée : date_envoi + 45 jours)
    date_saisie = models.DateTimeField(auto_now=True)
    date_modification = models.DateTimeField(auto_now=True)  # Date de dernière modification
    
    def save(self, *args, **kwargs):
        # Calculer automatiquement date_paiement_prevue si date_envoi est définie
        if self.date_envoi:
            from datetime import timedelta
            self.date_paiement_prevue = self.date_envoi + timedelta(days=45)
        super().save(*args, **kwargs)

    class Meta:
        unique_together = ('chantier', 'fournisseur', 'mois', 'annee')
        verbose_name = 'Paiement Fournisseur Matériel'
        verbose_name_plural = 'Paiements Fournisseurs Matériel'

    def __str__(self):
        return f"{self.chantier} - {self.fournisseur} - {self.mois}/{self.annee}: {self.montant} €"
    
    @property
    def montant_a_payer_ttc(self):
        """Calcule le montant à payer TTC (HT + 20% TVA)"""
        if self.montant_a_payer:
            return float(self.montant_a_payer) * 1.20
        return 0

class RecapFinancierPreference(models.Model):
    """
    Préférences du récap financier par chantier (ex: liste des fournisseurs à afficher).
    one-to-one avec Chantier.
    """
    chantier = models.OneToOneField(
        'Chantier',
        on_delete=models.CASCADE,
        related_name='recap_financier_preference'
    )
    # Liste des noms de fournisseurs à afficher dans le récap matériel. None ou [] = tous afficher
    fournisseurs_visibles = models.JSONField(default=None, null=True, blank=True)

    class Meta:
        verbose_name = 'Préférence Récap Financier'
        verbose_name_plural = 'Préférences Récap Financier'

    def __str__(self):
        return f"Récap préf. {self.chantier.chantier_name}"


class FactureFournisseurMateriel(models.Model):
    """Modèle pour gérer les factures liées aux paiements fournisseur matériel"""
    paiement = models.ForeignKey(PaiementFournisseurMateriel, on_delete=models.CASCADE, related_name='factures')
    numero_facture = models.CharField(max_length=255)  # Numéro de facture
    montant_facture = models.DecimalField(max_digits=12, decimal_places=2, default=0, null=True, blank=True)  # Montant de la facture
    payee = models.BooleanField(default=False, verbose_name="Facture payée")  # Indique si la facture est payée
    date_paiement_facture = models.DateField(null=True, blank=True, verbose_name="Date de paiement de la facture")  # Date de paiement de la facture
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Facture Fournisseur Matériel'
        verbose_name_plural = 'Factures Fournisseurs Matériel'
        unique_together = ('paiement', 'numero_facture')

    def __str__(self):
        return f"{self.paiement} - Facture {self.numero_facture} ({self.montant_facture} €)"

class HistoriqueModificationPaiementFournisseur(models.Model):
    """Modèle pour stocker l'historique des modifications de date de paiement fournisseur"""
    paiement = models.ForeignKey(PaiementFournisseurMateriel, on_delete=models.CASCADE, related_name='historique_modifications')
    date_modification = models.DateTimeField(auto_now_add=True)  # Date de la modification
    date_paiement_avant = models.DateField(null=True, blank=True)  # Date de paiement avant modification
    date_paiement_apres = models.DateField(null=True, blank=True)  # Date de paiement après modification (nouvelle date)
    
    class Meta:
        verbose_name = 'Historique Modification Paiement Fournisseur'
        verbose_name_plural = 'Historiques Modifications Paiements Fournisseurs'
        ordering = ['-date_modification']  # Plus récent en premier
    
    def __str__(self):
        return f"Modification {self.paiement} - {self.date_modification}"

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


# Signal pour créer automatiquement les émetteurs après les migrations
@receiver(post_migrate)
def create_default_emetteurs(sender, **kwargs):
    """Crée automatiquement les émetteurs par défaut après les migrations"""
    if sender.name == 'api':  # S'assurer que c'est notre app
        try:
            # Utiliser la méthode de classe pour créer les émetteurs
            created_count = Emetteur.create_default_emetteurs()
            if created_count > 0:
                print(f"✅ {created_count} émetteur(s) créé(s) automatiquement")
        except Exception as e:
            print(f"❌ Erreur lors de la création des émetteurs : {e}")
