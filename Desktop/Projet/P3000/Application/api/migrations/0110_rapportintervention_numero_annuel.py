from django.db import migrations, models
from collections import defaultdict


def backfill_numeros_rapport(apps, schema_editor):
    RapportIntervention = apps.get_model("api", "RapportIntervention")
    Compteur = apps.get_model("api", "RapportInterventionNumeroCompteur")
    by_year = defaultdict(list)
    for r in RapportIntervention.objects.all().order_by("created_at", "id"):
        by_year[r.date.year].append(r.pk)
    for year, pks in by_year.items():
        for i, pk in enumerate(pks, start=1):
            RapportIntervention.objects.filter(pk=pk).update(
                numero_rapport=i,
                annee_numero_rapport=year,
            )
        Compteur.objects.create(annee=year, dernier_numero=len(pks))


def reverse_backfill(apps, schema_editor):
    RapportIntervention = apps.get_model("api", "RapportIntervention")
    Compteur = apps.get_model("api", "RapportInterventionNumeroCompteur")
    RapportIntervention.objects.all().update(numero_rapport=None, annee_numero_rapport=None)
    Compteur.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0109_rapportintervention_devis_fait_devis_lie"),
    ]

    operations = [
        migrations.CreateModel(
            name="RapportInterventionNumeroCompteur",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("annee", models.PositiveIntegerField(unique=True)),
                ("dernier_numero", models.PositiveIntegerField(default=0)),
            ],
            options={
                "verbose_name": "Compteur numéro rapport (par année)",
                "verbose_name_plural": "Compteurs numéros rapport (par année)",
            },
        ),
        migrations.AddField(
            model_name="rapportintervention",
            name="numero_rapport",
            field=models.PositiveIntegerField(
                blank=True,
                null=True,
                verbose_name="Numéro de rapport (séquentiel annuel)",
            ),
        ),
        migrations.AddField(
            model_name="rapportintervention",
            name="annee_numero_rapport",
            field=models.PositiveIntegerField(
                blank=True,
                null=True,
                verbose_name="Année du numéro de rapport",
            ),
        ),
        migrations.RunPython(backfill_numeros_rapport, reverse_backfill),
    ]
