"""
Script ponctuel : recréer une session de réapprovisionnement terminée
pour le distributeur 2 avec les produits manquants.
Ne touche PAS au stock (pas de déduction StockLot / StockProduct).
Les produits sans cellule dans la grille sont liés à des cellules cachées
(row_index >= 99) invisibles dans l'interface.
"""
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction

from api.models import (
    Distributeur,
    DistributeurCell,
    DistributeurReapproSession,
    DistributeurReapproLigne,
)

DISTRIBUTEUR_ID = 2
HIDDEN_ROW_START = 99

PRODUITS = [
    {"nom": "Coca cola chery",                                    "quantite": 5,  "prix_vente": Decimal("1.50"), "cout_unitaire": Decimal("0.60")},
    {"nom": "Coca Cola",                                          "quantite": 10, "prix_vente": Decimal("1.50"), "cout_unitaire": Decimal("0.68")},
    {"nom": "Coca cola Zéro",                                     "quantite": 6,  "prix_vente": Decimal("1.50"), "cout_unitaire": Decimal("0.60")},
    {"nom": "Eau cristalline fraise",                              "quantite": 9,  "prix_vente": Decimal("1.50"), "cout_unitaire": Decimal("0.66")},
    {"nom": "Eau cristalline pêche",                               "quantite": 4,  "prix_vente": Decimal("1.50"), "cout_unitaire": Decimal("0.66")},
    {"nom": "Eau plate cristalline",                               "quantite": 7,  "prix_vente": Decimal("1.00"), "cout_unitaire": Decimal("0.20")},
    {"nom": "Fanta Citron",                                        "quantite": 2,  "prix_vente": Decimal("1.50"), "cout_unitaire": Decimal("0.60")},
    {"nom": "Gauffre de Liège - Perle de sucre",                   "quantite": 15, "prix_vente": Decimal("1.00"), "cout_unitaire": Decimal("0.30")},
    {"nom": "Kinder bueno",                                        "quantite": 13, "prix_vente": Decimal("1.50"), "cout_unitaire": Decimal("0.67")},
    {"nom": "La madelaine milk chocolate",                         "quantite": 5,  "prix_vente": Decimal("1.50"), "cout_unitaire": Decimal("0.57")},
    {"nom": "Mars",                                                "quantite": 10, "prix_vente": Decimal("1.50"), "cout_unitaire": Decimal("0.44")},
    {"nom": "Minute maid multivitamine",                           "quantite": 1,  "prix_vente": Decimal("1.50"), "cout_unitaire": Decimal("0.30")},
    {"nom": "Nutella biscuits fergulf",                             "quantite": 7,  "prix_vente": Decimal("1.50"), "cout_unitaire": Decimal("0.61")},
    {"nom": "Oasis Pomme Cassis Framboise",                        "quantite": 4,  "prix_vente": Decimal("1.50"), "cout_unitaire": Decimal("0.60")},
    {"nom": "RedBull 250 ml",                                      "quantite": 4,  "prix_vente": Decimal("2.50"), "cout_unitaire": Decimal("1.10")},
    {"nom": "Schweppes Agrumes Orange pamplemousse Citronvert",    "quantite": 2,  "prix_vente": Decimal("1.50"), "cout_unitaire": Decimal("0.57")},
    {"nom": "Snickers",                                            "quantite": 10, "prix_vente": Decimal("1.50"), "cout_unitaire": Decimal("0.44")},
    {"nom": "Sprite 33 cl",                                        "quantite": 3,  "prix_vente": Decimal("1.50"), "cout_unitaire": Decimal("0.60")},
    {"nom": "Twix",                                                "quantite": 10, "prix_vente": Decimal("1.50"), "cout_unitaire": Decimal("0.60")},
]


class Command(BaseCommand):
    help = "Recréer une session réappro terminée (distributeur 2) sans toucher au stock"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Afficher ce qui serait créé sans rien écrire en base",
        )

    def _find_cell(self, cells, nom_produit):
        nom_lower = nom_produit.strip().lower()
        for c in cells:
            cell_nom = (c.nom_produit or "").strip().lower()
            if cell_nom == nom_lower:
                return c
        for c in cells:
            cell_nom = (c.nom_produit or "").strip().lower()
            if cell_nom and nom_lower and (nom_lower in cell_nom or cell_nom in nom_lower):
                return c
        return None

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        distributeur = Distributeur.objects.filter(pk=DISTRIBUTEUR_ID).first()
        if not distributeur:
            self.stderr.write(self.style.ERROR(f"Distributeur #{DISTRIBUTEUR_ID} introuvable"))
            return

        self.stdout.write(f"Distributeur : {distributeur.nom} (id={distributeur.pk})")
        self.stdout.write(f"Grille visible : {distributeur.grid_rows} lignes, colonnes={distributeur.grid_columns}")

        cells = list(DistributeurCell.objects.filter(distributeur=distributeur))
        self.stdout.write(f"Cellules existantes : {len(cells)}")

        lignes_a_creer = []
        hidden_cells_needed = []
        hidden_col_counter = 0

        for p in PRODUITS:
            cell = self._find_cell(cells, p["nom"])
            if cell:
                self.stdout.write(
                    f"  MATCH  {p['nom']:<50} -> Cell L{cell.row_index}C{cell.col_index} "
                    f"(id={cell.pk})"
                )
                lignes_a_creer.append({"produit": p, "cell": cell, "hidden": False})
            else:
                row = HIDDEN_ROW_START
                col = hidden_col_counter
                hidden_col_counter += 1
                self.stdout.write(
                    self.style.WARNING(
                        f"  CACHE  {p['nom']:<50} -> Cellule cachée L{row}C{col} (hors grille)"
                    )
                )
                lignes_a_creer.append({
                    "produit": p,
                    "hidden_pos": (row, col),
                    "hidden": True,
                })
                hidden_cells_needed.append((p, row, col))

        total_unites = sum(l["produit"]["quantite"] for l in lignes_a_creer)
        total_ca = sum(l["produit"]["quantite"] * l["produit"]["prix_vente"] for l in lignes_a_creer)
        total_cout = sum(l["produit"]["quantite"] * l["produit"]["cout_unitaire"] for l in lignes_a_creer)
        total_benefice = total_ca - total_cout

        self.stdout.write(f"\n{'='*60}")
        self.stdout.write(f"  Produits matchés     : {sum(1 for l in lignes_a_creer if not l['hidden'])}")
        self.stdout.write(f"  Cellules cachées     : {len(hidden_cells_needed)}")
        self.stdout.write(f"  Unités totales       : {total_unites}")
        self.stdout.write(f"  CA total             : {total_ca:.2f} €")
        self.stdout.write(f"  Coût total           : {total_cout:.2f} €")
        self.stdout.write(f"  Bénéfice             : {total_benefice:.2f} €")
        self.stdout.write(f"{'='*60}")

        if dry_run:
            self.stdout.write(self.style.WARNING("\n--dry-run : rien n'a été écrit en base."))
            return

        with transaction.atomic():
            created_cells = {}
            for p, row, col in hidden_cells_needed:
                cell = DistributeurCell.objects.create(
                    distributeur=distributeur,
                    row_index=row,
                    col_index=col,
                    nom_produit=p["nom"],
                    prix_vente=p["prix_vente"],
                )
                created_cells[(row, col)] = cell

            session = DistributeurReapproSession.objects.create(
                distributeur=distributeur,
                date_debut=timezone.now(),
                date_fin=timezone.now(),
                statut="termine",
            )
            self.stdout.write(f"\nSession créée : id={session.pk}")

            for l in lignes_a_creer:
                p = l["produit"]
                if l["hidden"]:
                    cell = created_cells[l["hidden_pos"]]
                else:
                    cell = l["cell"]

                ligne = DistributeurReapproLigne.objects.create(
                    session=session,
                    cell=cell,
                    quantite=p["quantite"],
                    prix_vente=p["prix_vente"],
                    cout_unitaire=p["cout_unitaire"],
                )
                tag = "CACHE" if l["hidden"] else "MATCH"
                self.stdout.write(
                    f"  [{tag}] Ligne id={ligne.pk} : {p['nom']} "
                    f"x{p['quantite']} @ {p['prix_vente']}€ (coût {p['cout_unitaire']}€)"
                )

        self.stdout.write(self.style.SUCCESS(
            f"\nTerminé ! Session #{session.pk} créée avec {len(lignes_a_creer)} lignes."
        ))
        if hidden_cells_needed:
            self.stdout.write(
                f"  {len(hidden_cells_needed)} cellule(s) cachée(s) créée(s) à row >= {HIDDEN_ROW_START} "
                f"(invisibles dans la grille)."
            )
