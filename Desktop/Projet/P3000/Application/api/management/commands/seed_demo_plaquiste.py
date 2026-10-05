"""
Recharge la base locale avec un jeu de démonstration plaquiste :
clients, chantiers, devis, situations d'avancement, factures et un avenant.

Ne touche pas aux utilisateurs, aux agents, aux agences ni aux chantiers système.
Ne supprime pas les dossiers du drive.
"""

from datetime import date, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models.signals import post_delete
from django.utils import timezone

from api.models import (
    AppelOffres,
    Avenant,
    BonCommande,
    Chantier,
    Client,
    ContactSociete,
    Devis,
    DevisLigne,
    Facture,
    FactureLigne,
    FactureTS,
    LigneDetail,
    Partie,
    Situation,
    SituationLigne,
    SituationLigneAvenant,
    SituationLigneSupplementaire,
    Societe,
    SousPartie,
)
from api.signals import cleanup_appel_offres_folders, cleanup_chantier_folders


def money(value):
    return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def aware(year, month, day, hour=9, minute=0):
    return timezone.make_aware(datetime(year, month, day, hour, minute))


# Coûts hors marge. Le prix de vente est recalculé à l'enregistrement
# (taux fixe 20 % + marge 20 %).
CATALOGUE = [
    {
        "titre": "Cloisons",
        "type": "PLATRERIE",
        "sous_parties": [
            {
                "description": "Cloisons de distribution",
                "lignes": [
                    {
                        "description": "Cloison BA13 simple, ossature 72/48",
                        "unite": "ml",
                        "mo": "20.00",
                        "mat": "13.33",
                    },
                    {
                        "description": "Cloison BA13 double peau, ossature 98/48",
                        "unite": "ml",
                        "mo": "30.00",
                        "mat": "20.00",
                    },
                    {
                        "description": "Cloison BA13 hydrofuge, pièces humides",
                        "unite": "ml",
                        "mo": "32.00",
                        "mat": "22.17",
                    },
                ],
            }
        ],
    },
    {
        "titre": "Doublages et plafonds",
        "type": "PLATRERIE",
        "sous_parties": [
            {
                "description": "Doublages",
                "lignes": [
                    {
                        "description": "Doublage collé plaque 10+80",
                        "unite": "m2",
                        "mo": "12.00",
                        "mat": "10.22",
                    },
                    {
                        "description": "Doublage sur ossature avec laine 120 mm",
                        "unite": "m2",
                        "mo": "18.00",
                        "mat": "13.94",
                    },
                ],
            },
            {
                "description": "Plafonds",
                "lignes": [
                    {
                        "description": "Plafond BA13 sur ossature",
                        "unite": "m2",
                        "mo": "18.00",
                        "mat": "11.17",
                    },
                    {
                        "description": "Plafond BA13 hydrofuge",
                        "unite": "m2",
                        "mo": "22.00",
                        "mat": "14.11",
                    },
                    {
                        "description": "Isolation laine de verre 200 mm en combles",
                        "unite": "m2",
                        "mo": "8.00",
                        "mat": "8.67",
                    },
                ],
            },
        ],
    },
    {
        "titre": "Finitions",
        "type": "PLATRERIE",
        "sous_parties": [
            {
                "description": "Joints et enduits",
                "lignes": [
                    {
                        "description": "Bandes à joint et enduit, deux faces",
                        "unite": "ml",
                        "mo": "5.00",
                        "mat": "1.60",
                    },
                    {
                        "description": "Ratissage des murs",
                        "unite": "m2",
                        "mo": "7.00",
                        "mat": "2.72",
                    },
                ],
            },
            {
                "description": "Habillages",
                "lignes": [
                    {
                        "description": "Habillage de gaine en BA13",
                        "unite": "ml",
                        "mo": "16.00",
                        "mat": "10.39",
                    },
                    {
                        "description": "Trappe de visite 600x600",
                        "unite": "u",
                        "mo": "35.00",
                        "mat": "30.97",
                    },
                ],
            },
        ],
    },
]


CUSTOMERS = [
    {
        "key": "tilleuls",
        "societe": "SCI Les Tilleuls",
        "ville": "Créteil",
        "rue": "14 avenue des Tilleuls",
        "cp": "94000",
        "civilite": "M.",
        "prenom": "Marc",
        "nom": "Duval",
        "poste": "Conducteur de travaux",
        "email": "m.duval@sci-les-tilleuls.fr",
        "telephone": "145890214",
        "phone_int": 145890214,
    },
    {
        "key": "moreau",
        "societe": "Nicolas Moreau",
        "ville": "Saint-Maur-des-Fossés",
        "rue": "8 rue des Lilas",
        "cp": "94100",
        "civilite": "M.",
        "prenom": "Nicolas",
        "nom": "Moreau",
        "poste": "Particulier",
        "email": "nicolas.moreau@email.fr",
        "telephone": "0678451203",
        "phone_int": 678451203,
    },
    {
        "key": "martin",
        "societe": "Boulangerie Martin",
        "ville": "Vincennes",
        "rue": "27 rue du Commerce",
        "cp": "94300",
        "civilite": "Mme",
        "prenom": "Claire",
        "nom": "Martin",
        "poste": "Gérante",
        "email": "claire.martin@boulangerie-martin.fr",
        "telephone": "143280776",
        "phone_int": 143280776,
    },
    {
        "key": "dupont",
        "societe": "Famille Dupont",
        "ville": "Maisons-Alfort",
        "rue": "3 impasse des Roses",
        "cp": "94700",
        "civilite": "Mme",
        "prenom": "Julie",
        "nom": "Dupont",
        "poste": "Particulier",
        "email": "julie.dupont@email.fr",
        "telephone": "0655128841",
        "phone_int": 655128841,
    },
    {
        "key": "leroy",
        "societe": "Cabinet dentaire Leroy",
        "ville": "Charenton-le-Pont",
        "rue": "19 avenue de la République",
        "cp": "94220",
        "civilite": "M.",
        "prenom": "Henri",
        "nom": "Leroy",
        "poste": "Chirurgien-dentiste",
        "email": "contact@cabinet-leroy.fr",
        "telephone": "143680915",
        "phone_int": 143680915,
    },
    {
        "key": "vincennes",
        "societe": "Mairie de Vincennes",
        "ville": "Vincennes",
        "rue": "5 rue Jean Moulin",
        "cp": "94300",
        "civilite": "Mme",
        "prenom": "Nadia",
        "nom": "Bernard",
        "poste": "Responsable des bâtiments",
        "email": "n.bernard@mairie-vincennes.fr",
        "telephone": "143980010",
        "phone_int": 143980010,
    },
]


JOBS = [
    {
        "key": "tilleuls",
        "customer": "tilleuls",
        "name": "Résidence Les Tilleuls — lot plâtrerie",
        "state": "En Cours",
        "start": date(2026, 3, 16),
        "end": None,
        "ville": "Créteil",
        "rue": "14 avenue des Tilleuls",
        "cp": "94000",
        "description": "36 logements. Cloisons, doublages, plafonds et isolation.",
    },
    {
        "key": "moreau",
        "customer": "moreau",
        "name": "Maison Moreau — plâtrerie intérieure",
        "state": "Terminé",
        "start": date(2026, 4, 2),
        "end": date(2026, 5, 28),
        "ville": "Saint-Maur-des-Fossés",
        "rue": "8 rue des Lilas",
        "cp": "94100",
        "description": "Rénovation d'une maison individuelle. Cloisons, doublage collé et plafonds.",
    },
    {
        "key": "martin",
        "customer": "martin",
        "name": "Boulangerie Martin — laboratoire et réserve",
        "state": "En Cours",
        "start": date(2026, 7, 6),
        "end": None,
        "ville": "Vincennes",
        "rue": "27 rue du Commerce",
        "cp": "94300",
        "description": "Cloisons hydrofuges et plafond du laboratoire.",
    },
    {
        "key": "dupont",
        "customer": "dupont",
        "name": "Appartement Dupont — rénovation",
        "state": "En attente",
        "start": date(2026, 9, 8),
        "end": None,
        "ville": "Maisons-Alfort",
        "rue": "3 impasse des Roses",
        "cp": "94700",
        "description": "Devis envoyé, en attente de validation du client.",
    },
    {
        "key": "leroy",
        "customer": "leroy",
        "name": "Cabinet dentaire Leroy — salles de soins",
        "state": "En attente",
        "start": date(2026, 8, 20),
        "end": None,
        "ville": "Charenton-le-Pont",
        "rue": "19 avenue de la République",
        "cp": "94220",
        "description": "Devis refusé. Conservé pour l'historique.",
    },
]


# Quantités par désignation de ligne catalogue.
QUOTES = [
    {
        "key": "tilleuls",
        "job": "tilleuls",
        "numero": "D2026-014",
        "status": "Travaux en cours",
        "when": aware(2026, 3, 12),
        "nature": "Plâtrerie sèche — cloisons, doublages, plafonds",
        "description": "Marché de plâtrerie de la résidence Les Tilleuls.",
        "appel": False,
        "lines": {
            "Cloison BA13 simple, ossature 72/48": "380",
            "Cloison BA13 double peau, ossature 98/48": "160",
            "Cloison BA13 hydrofuge, pièces humides": "90",
            "Doublage sur ossature avec laine 120 mm": "720",
            "Plafond BA13 sur ossature": "640",
            "Isolation laine de verre 200 mm en combles": "640",
            "Bandes à joint et enduit, deux faces": "1800",
            "Habillage de gaine en BA13": "45",
        },
    },
    {
        "key": "tilleuls-ts",
        "job": "tilleuls",
        "numero": "D2026-041",
        "status": "Facturé",
        "when": aware(2026, 8, 4),
        "nature": "Travaux supplémentaires — habillage de gaines",
        "description": "Avenant n°01. Gaines non prévues au marché.",
        "appel": False,
        "lines": {
            "Habillage de gaine en BA13": "35",
            "Trappe de visite 600x600": "4",
        },
    },
    {
        "key": "moreau",
        "job": "moreau",
        "numero": "D2026-018",
        "status": "Facturé",
        "when": aware(2026, 3, 28),
        "nature": "Plâtrerie maison individuelle",
        "description": "Chantier terminé et facturé.",
        "appel": False,
        "lines": {
            "Cloison BA13 simple, ossature 72/48": "42",
            "Cloison BA13 hydrofuge, pièces humides": "18",
            "Doublage collé plaque 10+80": "85",
            "Plafond BA13 sur ossature": "70",
            "Bandes à joint et enduit, deux faces": "160",
            "Ratissage des murs": "120",
        },
    },
    {
        "key": "martin",
        "job": "martin",
        "numero": "D2026-027",
        "status": "Facturé",
        "when": aware(2026, 6, 18),
        "nature": "Plâtrerie laboratoire de boulangerie",
        "description": "Facture envoyée, paiement en attente.",
        "appel": False,
        "lines": {
            "Cloison BA13 hydrofuge, pièces humides": "22",
            "Doublage sur ossature avec laine 120 mm": "35",
            "Plafond BA13 hydrofuge": "48",
            "Bandes à joint et enduit, deux faces": "80",
        },
    },
    {
        "key": "dupont",
        "job": "dupont",
        "numero": "D2026-033",
        "status": "Envoyé",
        "when": aware(2026, 9, 10),
        "nature": "Rénovation appartement",
        "description": "Devis envoyé le 10 septembre, sans retour pour l'instant.",
        "appel": False,
        "lines": {
            "Cloison BA13 simple, ossature 72/48": "28",
            "Doublage collé plaque 10+80": "40",
            "Plafond BA13 sur ossature": "32",
            "Bandes à joint et enduit, deux faces": "90",
        },
    },
    {
        "key": "leroy",
        "job": "leroy",
        "numero": "D2026-029",
        "status": "Refusé",
        "when": aware(2026, 8, 12),
        "nature": "Salles de soins — cloisons hydrofuges",
        "description": "Devis refusé par le client.",
        "appel": False,
        "lines": {
            "Cloison BA13 double peau, ossature 98/48": "15",
            "Cloison BA13 hydrofuge, pièces humides": "24",
            "Plafond BA13 hydrofuge": "36",
            "Bandes à joint et enduit, deux faces": "70",
        },
    },
    {
        "key": "ecole",
        "job": None,
        "customer": "vincennes",
        "appel_name": "École Jean Moulin — lot plâtrerie",
        "numero": "AO2026-006",
        "status": "En attente",
        "when": aware(2026, 9, 15),
        "nature": "Appel d'offres plâtrerie groupe scolaire",
        "description": "Offre en attente de la commission d'appel d'offres.",
        "appel": True,
        "lines": {
            "Cloison BA13 simple, ossature 72/48": "520",
            "Cloison BA13 double peau, ossature 98/48": "210",
            "Doublage sur ossature avec laine 120 mm": "980",
            "Plafond BA13 sur ossature": "860",
            "Isolation laine de verre 200 mm en combles": "860",
            "Bandes à joint et enduit, deux faces": "2400",
        },
    },
]


# Avancement cumulé (%) par mois sur le devis marché des Tilleuls.
TILLEULS_PROGRESS = [
    {
        "numero": 1,
        "label": "Situation n°01",
        "mois": 6,
        "annee": 2026,
        "statut": "facturee",
        "when": aware(2026, 7, 2),
        "date_envoi": date(2026, 7, 2),
        "date_paiement": date(2026, 7, 28),
        "delai": 30,
        "percents": {
            "Cloison BA13 simple, ossature 72/48": 40,
            "Cloison BA13 double peau, ossature 98/48": 20,
            "Cloison BA13 hydrofuge, pièces humides": 0,
            "Doublage sur ossature avec laine 120 mm": 35,
            "Plafond BA13 sur ossature": 10,
            "Isolation laine de verre 200 mm en combles": 50,
            "Bandes à joint et enduit, deux faces": 15,
            "Habillage de gaine en BA13": 0,
        },
    },
    {
        "numero": 2,
        "label": "Situation n°02",
        "mois": 7,
        "annee": 2026,
        "statut": "facturee",
        "when": aware(2026, 8, 3),
        "date_envoi": date(2026, 8, 3),
        "date_paiement": date(2026, 8, 26),
        "delai": 30,
        "percents": {
            "Cloison BA13 simple, ossature 72/48": 70,
            "Cloison BA13 double peau, ossature 98/48": 45,
            "Cloison BA13 hydrofuge, pièces humides": 30,
            "Doublage sur ossature avec laine 120 mm": 55,
            "Plafond BA13 sur ossature": 30,
            "Isolation laine de verre 200 mm en combles": 80,
            "Bandes à joint et enduit, deux faces": 35,
            "Habillage de gaine en BA13": 10,
        },
    },
    {
        "numero": 3,
        "label": "Situation n°03",
        "mois": 8,
        "annee": 2026,
        "statut": "validee",
        "when": aware(2026, 8, 4),
        "date_envoi": date(2026, 8, 5),
        "date_paiement": None,
        "delai": 30,
        "percents": {
            "Cloison BA13 simple, ossature 72/48": 90,
            "Cloison BA13 double peau, ossature 98/48": 70,
            "Cloison BA13 hydrofuge, pièces humides": 60,
            "Doublage sur ossature avec laine 120 mm": 75,
            "Plafond BA13 sur ossature": 55,
            "Isolation laine de verre 200 mm en combles": 100,
            "Bandes à joint et enduit, deux faces": 60,
            "Habillage de gaine en BA13": 40,
        },
        "ts_precedent": 0,
        "ts_actuel": 40,
    },
    {
        "numero": 4,
        "label": "Situation n°04",
        "mois": 9,
        "annee": 2026,
        "statut": "brouillon",
        "when": aware(2026, 9, 25),
        "date_envoi": None,
        "date_paiement": None,
        "delai": 30,
        "percents": {
            "Cloison BA13 simple, ossature 72/48": 100,
            "Cloison BA13 double peau, ossature 98/48": 85,
            "Cloison BA13 hydrofuge, pièces humides": 80,
            "Doublage sur ossature avec laine 120 mm": 90,
            "Plafond BA13 sur ossature": 70,
            "Isolation laine de verre 200 mm en combles": 100,
            "Bandes à joint et enduit, deux faces": 75,
            "Habillage de gaine en BA13": 60,
        },
        "ts_precedent": 40,
        "ts_actuel": 70,
        "supplement": ("Protection et nettoyage de fin de niveau", "450.00", "ajout"),
    },
]


class Command(BaseCommand):
    help = "Recharge la base locale avec un jeu plaquiste (devis, situations, factures)."

    def handle(self, *args, **options):
        db_name = settings.DATABASES["default"]["NAME"]
        if db_name != "p3000db_local":
            raise CommandError(
                f"Commande refusée : la base active est « {db_name} », pas p3000db_local."
            )

        post_delete.disconnect(cleanup_chantier_folders, sender=Chantier)
        post_delete.disconnect(cleanup_appel_offres_folders, sender=AppelOffres)
        try:
            with transaction.atomic():
                removed = self._clear_commercial_data()
                summary = self._seed()
        finally:
            post_delete.connect(cleanup_chantier_folders, sender=Chantier)
            post_delete.connect(cleanup_appel_offres_folders, sender=AppelOffres)

        self.stdout.write(self.style.SUCCESS("Base de démonstration plaquiste chargée."))
        self.stdout.write(f"Supprimé : {removed}")
        for line in summary:
            self.stdout.write(f"  - {line}")

    def _clear_commercial_data(self):
        protected_societes = set(
            Chantier.objects.filter(is_system_chantier=True).values_list("societe_id", flat=True)
        )
        chantiers = Chantier.objects.filter(is_system_chantier=False).count()
        Chantier.objects.filter(is_system_chantier=False).delete()
        appels = AppelOffres.objects.count()
        AppelOffres.objects.all().delete()
        devis = Devis.objects.count()
        Devis.objects.all().delete()
        parties = Partie.objects.count()
        Partie.objects.all().delete()

        societes = Societe.objects.exclude(id__in=protected_societes)
        societe_count = societes.count()
        societes.delete()

        used_clients = set(Societe.objects.values_list("client_name_id", flat=True))
        clients = Client.objects.exclude(id__in=used_clients)
        client_count = clients.count()
        clients.delete()

        return (
            f"{chantiers} chantiers, {appels} appels d'offres, {devis} devis restants, "
            f"{parties} parties catalogue, {societe_count} sociétés, {client_count} clients"
        )

    def _seed(self):
        catalogue = self._build_catalogue()
        customers = {}
        for row in CUSTOMERS:
            customers[row["key"]] = self._create_customer(row)

        jobs = {}
        for row in JOBS:
            jobs[row["key"]] = self._create_job(row, customers[row["customer"]])

        quotes = {}
        for row in QUOTES:
            customer = customers[row["customer"]] if row.get("customer") else customers[
                next(job["customer"] for job in JOBS if job["key"] == row["job"])
            ]
            job = jobs.get(row["job"]) if row["job"] else None
            quotes[row["key"]] = self._create_quote(row, catalogue, customer, job)

        self._sync_job_amounts(jobs, quotes)
        self._create_invoices(jobs, quotes)
        self._create_situations(jobs["tilleuls"], quotes["tilleuls"], quotes["tilleuls-ts"])
        self._create_orders(jobs)

        return [
            "6 clients / sociétés",
            "5 chantiers de plâtrerie",
            "1 appel d'offres (école Jean Moulin)",
            "7 devis, dont 1 travaux supplémentaires",
            "4 situations sur la résidence Les Tilleuls (juin à septembre)",
            "2 factures (maison Moreau payée, boulangerie en attente)",
            "1 avenant et 2 bons de commande matériaux",
        ]

    def _build_catalogue(self):
        created = {}
        partie_numero = 0
        for partie_def in CATALOGUE:
            partie_numero += 1
            partie = Partie.objects.create(
                titre=partie_def["titre"],
                type=partie_def["type"],
                index_global=0,
                numero=0,
            )
            sous_numero = 0
            for sous_def in partie_def["sous_parties"]:
                sous_numero += 1
                sous = SousPartie.objects.create(
                    partie=partie,
                    description=sous_def["description"],
                    index_global=0,
                )
                lignes = []
                ligne_numero = 0
                for ligne_def in sous_def["lignes"]:
                    ligne_numero += 1
                    ligne = LigneDetail(
                        sous_partie=sous,
                        partie=partie,
                        description=ligne_def["description"],
                        unite=ligne_def["unite"],
                        cout_main_oeuvre=money(ligne_def["mo"]),
                        cout_materiel=money(ligne_def["mat"]),
                        taux_fixe=Decimal("20"),
                        marge=Decimal("20"),
                        prix=Decimal("0"),
                        index_global=0,
                    )
                    ligne.save()
                    ligne.refresh_from_db()
                    index = Decimal(f"{partie_numero}.{sous_numero}{ligne_numero:02d}")
                    lignes.append(
                        {
                            "id": ligne.id,
                            "description": ligne.description,
                            "unite": ligne.unite,
                            "prix": ligne.prix,
                            "mo": ligne.cout_main_oeuvre,
                            "mat": ligne.cout_materiel,
                            "index": index,
                            "sous_id": sous.id,
                            "sous_description": sous.description,
                            "sous_index": Decimal(f"{partie_numero}.{sous_numero}"),
                            "sous_numero": f"{partie_numero}.{sous_numero}",
                            "partie_id": partie.id,
                            "partie_titre": partie.titre,
                            "partie_type": partie.type,
                            "partie_index": partie_numero,
                            "partie_numero": partie_numero,
                        }
                    )
                created.setdefault(partie.id, [])
            for ligne in lignes:
                created[ligne["description"]] = ligne
        # Le dictionnaire final est indexé par désignation.
        by_description = {}
        for partie_def in CATALOGUE:
            for sous_def in partie_def["sous_parties"]:
                for ligne_def in sous_def["lignes"]:
                    pass
        # Reconstruit proprement : la boucle ci-dessus a déjà rempli `created`
        # avec les descriptions au dernier tour seulement. On recommence via la liste.
        return self._index_catalogue_lines()

    def _index_catalogue_lines(self):
        """Relit le catalogue créé pour l'indexer par désignation."""
        indexed = {}
        partie_numero = 0
        for partie in Partie.objects.filter(devis__isnull=True).order_by("id"):
            partie_numero += 1
            sous_numero = 0
            for sous in partie.sous_parties.order_by("id"):
                sous_numero += 1
                ligne_numero = 0
                for ligne in sous.lignes_details.order_by("id"):
                    ligne_numero += 1
                    indexed[ligne.description] = {
                        "id": ligne.id,
                        "description": ligne.description,
                        "prix": ligne.prix,
                        "mo": ligne.cout_main_oeuvre,
                        "mat": ligne.cout_materiel,
                        "index": Decimal(f"{partie_numero}.{sous_numero}{ligne_numero:02d}"),
                        "sous_id": sous.id,
                        "sous_description": sous.description,
                        "sous_index": float(f"{partie_numero}.{sous_numero}"),
                        "sous_numero": f"{partie_numero}.{sous_numero}",
                        "partie_id": partie.id,
                        "partie_titre": partie.titre,
                        "partie_type": partie.type,
                        "partie_index": partie_numero,
                        "partie_numero": partie_numero,
                    }
        return indexed

    def _create_customer(self, row):
        client = Client.objects.create(
            civilite=row["civilite"],
            name=row["prenom"],
            surname=row["nom"],
            client_mail=row["email"],
            phone_Number=row["phone_int"],
            poste=row["poste"],
        )
        societe = Societe.objects.create(
            nom_societe=row["societe"],
            ville_societe=row["ville"],
            rue_societe=row["rue"],
            codepostal_societe=row["cp"],
            client_name=client,
        )
        contact = ContactSociete.objects.create(
            societe=societe,
            civilite=row["civilite"],
            nom=row["nom"],
            prenom=row["prenom"],
            poste=row["poste"],
            email=row["email"],
            telephone=row["telephone"],
        )
        return {"client": client, "societe": societe, "contact": contact, "row": row}

    def _create_job(self, row, customer):
        chantier = Chantier.objects.create(
            chantier_name=row["name"],
            societe=customer["societe"],
            state_chantier=row["state"],
            ville=row["ville"],
            rue=row["rue"],
            code_postal=row["cp"],
            description=row["description"],
            montant_ht=0,
            montant_ttc=0,
            maitre_ouvrage_nom_societe=customer["societe"].nom_societe,
            maitre_ouvrage_contact=f"{customer['row']['prenom']} {customer['row']['nom']}",
            maitre_ouvrage_telephone=customer["row"]["telephone"],
            maitre_ouvrage_email=customer["row"]["email"],
        )
        Chantier.objects.filter(pk=chantier.pk).update(
            date_debut=row["start"],
            date_fin=row["end"],
        )
        chantier.refresh_from_db()
        return chantier

    def _create_quote(self, row, catalogue, customer, job):
        selected = {}
        order = []
        total_ht = Decimal("0")
        total_mo = Decimal("0")
        total_mat = Decimal("0")
        pending_lines = []

        for description, qty_raw in row["lines"].items():
            ligne = catalogue[description]
            qty = money(qty_raw)
            total = money(qty * ligne["prix"])
            total_ht += total
            total_mo += money(qty * ligne["mo"])
            total_mat += money(qty * ligne["mat"])
            partie_id = ligne["partie_id"]
            if partie_id not in selected:
                selected[partie_id] = {
                    "id": partie_id,
                    "titre": ligne["partie_titre"],
                    "type": ligne["partie_type"],
                    "numero": ligne["partie_numero"],
                    "index_global": ligne["partie_index"],
                    "sousParties": {},
                }
                order.append(partie_id)
            sous_id = ligne["sous_id"]
            sous_map = selected[partie_id]["sousParties"]
            if sous_id not in sous_map:
                sous_map[sous_id] = {
                    "id": sous_id,
                    "description": ligne["sous_description"],
                    "numero": ligne["sous_numero"],
                    "index_global": ligne["sous_index"],
                    "lignesDetails": [],
                }
            sous_map[sous_id]["lignesDetails"].append(ligne["id"])
            pending_lines.append((ligne, qty))

        parties_metadata = {"selectedParties": []}
        for partie_id in order:
            partie = selected[partie_id]
            partie["sousParties"] = list(partie["sousParties"].values())
            parties_metadata["selectedParties"].append(partie)

        price_ht = float(total_ht)
        price_ttc = float(money(total_ht * Decimal("1.20")))
        appel = None
        if row["appel"]:
            address = customer["row"]
            appel = AppelOffres.objects.create(
                chantier_name=row["appel_name"],
                societe=customer["societe"],
                montant_ht=price_ht,
                montant_ttc=price_ttc,
                ville=address["ville"],
                rue=address["rue"],
                code_postal=address["cp"],
                cout_estime_main_oeuvre=total_mo,
                cout_estime_materiel=total_mat,
                description=row["description"],
                statut="en_attente",
                state_chantier="En attente",
            )

        devis = Devis.objects.create(
            numero=row["numero"],
            date_creation=row["when"],
            price_ht=price_ht,
            price_ttc=price_ttc,
            tva_rate=20,
            nature_travaux=row["nature"],
            description=row["description"],
            status=row["status"],
            tags=[row["status"]],
            chantier=job,
            appel_offres=appel,
            devis_chantier=row["appel"],
            contact_societe=customer["contact"],
            parties_metadata=parties_metadata,
            lignes_speciales={"global": [], "parties": {}, "sousParties": {}},
            lignes_display={"global": [], "parties": {}, "sousParties": {}},
            cout_estime_main_oeuvre=total_mo,
            cout_estime_materiel=total_mat,
            version_systeme_lignes=1,
        )
        devis.client.add(customer["client"])

        devis_lignes = {}
        for ligne, qty in pending_lines:
            devis_ligne = DevisLigne.objects.create(
                devis=devis,
                ligne_detail_id=ligne["id"],
                quantite=qty,
                prix_unitaire=ligne["prix"],
                index_global=ligne["index"],
            )
            devis_lignes[ligne["description"]] = devis_ligne

        return {
            "devis": devis,
            "appel": appel,
            "lignes": devis_lignes,
            "total_ht": total_ht,
            "total_mo": total_mo,
            "total_mat": total_mat,
            "price_ttc": money(total_ht * Decimal("1.20")),
        }

    def _sync_job_amounts(self, jobs, quotes):
        for key, job in jobs.items():
            quote = quotes.get(key)
            if not quote:
                continue
            Chantier.objects.filter(pk=job.pk).update(
                montant_ht=float(quote["total_ht"]),
                montant_ttc=float(quote["price_ttc"]),
                cout_estime_main_oeuvre=quote["total_mo"],
                cout_estime_materiel=quote["total_mat"],
            )

    def _create_invoices(self, jobs, quotes):
        self._create_invoice(
            numero="F2026-052",
            quote=quotes["moreau"],
            job=jobs["moreau"],
            state="Payée",
            designation="Plâtrerie — maison Moreau",
            when=aware(2026, 6, 2),
            date_envoi=date(2026, 6, 2),
            date_paiement=date(2026, 6, 20),
        )
        self._create_invoice(
            numero="F2026-061",
            quote=quotes["martin"],
            job=jobs["martin"],
            state="Attente paiement",
            designation="Plâtrerie — boulangerie Martin",
            when=aware(2026, 8, 20),
            date_envoi=date(2026, 8, 20),
            date_paiement=None,
        )

        avenant = Avenant.objects.create(
            chantier=jobs["tilleuls"],
            numero="01",
            montant_total=0,
        )
        ts_devis = quotes["tilleuls-ts"]["devis"]
        facture_ts = FactureTS.objects.create(
            devis=ts_devis,
            chantier=jobs["tilleuls"],
            avenant=avenant,
            numero_ts=1,
            designation="Habillage de gaines supplémentaires",
            montant_ht=quotes["tilleuls-ts"]["total_ht"],
            montant_ttc=quotes["tilleuls-ts"]["price_ttc"],
            tva_rate=Decimal("20"),
        )
        FactureTS.objects.filter(pk=facture_ts.pk).update(date_creation=aware(2026, 8, 4))
        quotes["tilleuls-ts"]["facture_ts"] = facture_ts
        quotes["tilleuls-ts"]["avenant"] = avenant

    def _create_invoice(self, numero, quote, job, state, designation, when, date_envoi, date_paiement):
        devis = quote["devis"]
        facture = Facture(
            numero=numero,
            devis=devis,
            chantier=job,
            state_facture=state,
            type_facture="classique",
            designation=designation,
            price_ht=float(quote["total_ht"]),
            price_ttc=float(quote["price_ttc"]),
            mode_paiement="virement",
            date_envoi=date_envoi,
            date_paiement=date_paiement,
            date_echeance=date_envoi + timedelta(days=30),
            delai_paiement=30,
        )
        facture.save()
        Facture.objects.filter(pk=facture.pk).update(
            date_creation=when,
            state_facture=state,
            price_ht=float(quote["total_ht"]),
            price_ttc=float(quote["price_ttc"]),
        )
        for devis_ligne in quote["lignes"].values():
            FactureLigne.objects.create(
                facture=facture,
                ligne_detail=devis_ligne.ligne_detail,
                quantite=devis_ligne.quantite,
                prix_unitaire=devis_ligne.prix_unitaire,
            )

    def _create_situations(self, chantier, quote, ts_quote):
        previous = {}
        total_marche = quote["total_ht"]
        for row in TILLEULS_PROGRESS:
            mois_ht = Decimal("0")
            cumul = Decimal("0")
            precedent = Decimal("0")
            lignes_payload = []
            for description, devis_ligne in quote["lignes"].items():
                actuel = Decimal(str(row["percents"].get(description, 0)))
                avant = Decimal(str(previous.get(description, 0)))
                total_ligne = money(devis_ligne.quantite * devis_ligne.prix_unitaire)
                montant = money(total_ligne * (actuel - avant) / Decimal("100"))
                mois_ht += montant
                cumul += money(total_ligne * actuel / Decimal("100"))
                precedent += money(total_ligne * avant / Decimal("100"))
                lignes_payload.append(
                    {
                        "ligne": devis_ligne,
                        "description": description,
                        "quantite": devis_ligne.quantite,
                        "prix": devis_ligne.prix_unitaire,
                        "total": total_ligne,
                        "avant": avant,
                        "actuel": actuel,
                        "montant": montant,
                    }
                )
                previous[description] = actuel

            ts_montant = Decimal("0")
            if "ts_actuel" in row:
                ts_ht = ts_quote["total_ht"]
                ts_montant = money(
                    ts_ht
                    * (Decimal(str(row["ts_actuel"])) - Decimal(str(row["ts_precedent"])))
                    / Decimal("100")
                )
                mois_ht += ts_montant
                cumul += money(ts_ht * Decimal(str(row["ts_actuel"])) / Decimal("100"))
                precedent += money(ts_ht * Decimal(str(row["ts_precedent"])) / Decimal("100"))

            retenue = money(mois_ht * Decimal("0.05"))
            prorata = money(mois_ht * Decimal("0.01"))
            apres = mois_ht - retenue - prorata
            if row.get("supplement"):
                label, amount, kind = row["supplement"]
                extra = money(amount)
                apres = apres + extra if kind == "ajout" else apres - extra
            else:
                label = amount = kind = None
            tva = money(apres * Decimal("0.20"))
            base = total_marche + (ts_quote["total_ht"] if "ts_actuel" in row else Decimal("0"))
            avancement = money(cumul / base * Decimal("100")) if base else Decimal("0")

            situation = Situation.objects.create(
                chantier=chantier,
                devis=quote["devis"],
                numero=row["numero"],
                numero_situation=row["label"],
                mois=row["mois"],
                annee=row["annee"],
                date_creation=row["when"],
                date_validation=row["when"] if row["statut"] != "brouillon" else None,
                statut=row["statut"],
                date_envoi=row["date_envoi"],
                delai_paiement=row["delai"],
                date_paiement_reel=row["date_paiement"],
                montant_reel_ht=apres if row["date_paiement"] else None,
                contact_societe=quote["devis"].contact_societe,
                montant_precedent=precedent,
                montant_ht_mois=mois_ht,
                montant_total=cumul,
                pourcentage_avancement=avancement,
                montant_total_travaux=base,
                montant_total_devis=total_marche,
                montant_total_cumul_ht=cumul,
                cumul_precedent=precedent,
                montant_apres_retenues=apres,
                tva=tva,
                tva_rate=Decimal("20"),
                retenue_garantie=retenue,
                taux_retenue_garantie=Decimal("5"),
                taux_prorata=Decimal("1"),
                montant_prorata=prorata,
                total_avancement=avancement,
            )
            for payload in lignes_payload:
                SituationLigne.objects.create(
                    situation=situation,
                    ligne_devis=payload["ligne"],
                    description=payload["description"],
                    quantite=payload["quantite"],
                    prix_unitaire=payload["prix"],
                    total_ht=payload["total"],
                    pourcentage_precedent=payload["avant"],
                    pourcentage_actuel=payload["actuel"],
                    montant=payload["montant"],
                )
            if "ts_actuel" in row:
                SituationLigneAvenant.objects.create(
                    situation=situation,
                    avenant=ts_quote["avenant"],
                    facture_ts=ts_quote["facture_ts"],
                    montant_ht=ts_quote["total_ht"],
                    pourcentage_precedent=Decimal(str(row["ts_precedent"])),
                    pourcentage_actuel=Decimal(str(row["ts_actuel"])),
                    montant=ts_montant,
                )
            if label:
                SituationLigneSupplementaire.objects.create(
                    situation=situation,
                    description=label,
                    montant=money(amount),
                    type=kind,
                )

    def _create_orders(self, jobs):
        commande = BonCommande.objects.create(
            numero="BC2026-118",
            fournisseur="Point.P Créteil",
            chantier=jobs["tilleuls"],
            montant_total=Decimal("4280.50"),
            statut="livre_chantier",
            statut_paiement="paye",
            date_livraison=date(2026, 3, 20),
            date_commande=date(2026, 3, 14),
        )
        BonCommande.objects.filter(pk=commande.pk).update(date_creation=aware(2026, 3, 14))

        commande = BonCommande.objects.create(
            numero="BC2026-142",
            fournisseur="Point.P Vincennes",
            chantier=jobs["martin"],
            montant_total=Decimal("960.00"),
            statut="en_attente",
            statut_paiement="non_paye",
            date_livraison=date(2026, 9, 30),
            date_commande=date(2026, 9, 22),
        )
        BonCommande.objects.filter(pk=commande.pk).update(date_creation=aware(2026, 9, 22))
