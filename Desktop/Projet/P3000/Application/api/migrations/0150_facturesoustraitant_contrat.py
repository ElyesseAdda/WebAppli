from django.db import migrations, models
import django.db.models.deletion


def lier_factures_au_contrat(apps, schema_editor):
    FactureSousTraitant = apps.get_model('api', 'FactureSousTraitant')
    ContratSousTraitance = apps.get_model('api', 'ContratSousTraitance')

    factures = FactureSousTraitant.objects.filter(contrat__isnull=True)
    for facture in factures:
        contrat = (
            ContratSousTraitance.objects.filter(
                chantier_id=facture.chantier_id,
                sous_traitant_id=facture.sous_traitant_id,
            )
            .order_by('id')
            .first()
        )
        if contrat:
            facture.contrat_id = contrat.id
            facture.save(update_fields=['contrat'])


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0149_remove_contrat_unique_constraint'),
    ]

    operations = [
        migrations.AddField(
            model_name='facturesoustraitant',
            name='contrat',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='factures',
                to='api.contratsoustraitance',
            ),
        ),
        migrations.RunPython(lier_factures_au_contrat, migrations.RunPython.noop),
        migrations.AlterUniqueTogether(
            name='facturesoustraitant',
            unique_together={('annee', 'chantier', 'contrat', 'mois', 'numero_facture', 'sous_traitant')},
        ),
    ]
