"""Réattribue les numéros annuels des rapports d'intervention selon l'ordre des id.

Pour chaque année calendaire (champ ``date`` du rapport), les rapports sont triés
par id croissant et reçoivent les numéros 1, 2, 3, … Les compteurs par année sont
alignés.

Usage:
    python manage.py assign_rapport_intervention_numeros --dry-run
    python manage.py assign_rapport_intervention_numeros
"""

from collections import defaultdict

from django.core.management.base import BaseCommand
from django.db import transaction

from api.models_rapport import RapportIntervention, RapportInterventionNumeroCompteur


class Command(BaseCommand):
    help = (
        "Réattribue numero_rapport / annee_numero_rapport pour tous les rapports "
        "existants, par année de date, triés par id croissant."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Affiche le plan sans modifier la base.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        by_year = defaultdict(list)
        for r in RapportIntervention.objects.all().order_by("id").iterator(chunk_size=500):
            by_year[r.date.year].append(r)

        if not by_year:
            self.stdout.write(self.style.WARNING("Aucun rapport d'intervention."))
            return

        plan_lines = []
        to_update = []
        for year in sorted(by_year.keys()):
            rows = by_year[year]
            for i, rapport in enumerate(rows, start=1):
                plan_lines.append(
                    f"  id={rapport.pk} -> n°{i} - {year} (date rapport: {rapport.date})"
                )
                to_update.append(
                    RapportIntervention(
                        pk=rapport.pk,
                        numero_rapport=i,
                        annee_numero_rapport=year,
                    )
                )

        self.stdout.write(
            self.style.NOTICE(
                f"{'[dry-run] ' if dry_run else ''}"
                f"{len(to_update)} rapport(s), {len(by_year)} année(s) distincte(s)."
            )
        )
        for y in sorted(by_year.keys()):
            self.stdout.write(f"  Année {y}: {len(by_year[y])} rapport(s)")

        if dry_run:
            for line in plan_lines[:50]:
                self.stdout.write(line)
            if len(plan_lines) > 50:
                self.stdout.write(f"  ... et {len(plan_lines) - 50} ligne(s) de plus.")
            self.stdout.write(self.style.WARNING("Aucune écriture (dry-run)."))
            return

        with transaction.atomic():
            RapportIntervention.objects.bulk_update(
                to_update,
                ["numero_rapport", "annee_numero_rapport"],
                batch_size=500,
            )
            for year in sorted(by_year.keys()):
                n = len(by_year[year])
                RapportInterventionNumeroCompteur.objects.update_or_create(
                    annee=year,
                    defaults={"dernier_numero": n},
                )

        self.stdout.write(self.style.SUCCESS("Numéros et compteurs mis à jour."))
