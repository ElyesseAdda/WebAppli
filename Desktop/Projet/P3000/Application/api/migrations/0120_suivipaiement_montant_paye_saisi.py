from django.db import migrations, models


def mark_existing_saisis(apps, schema_editor):
    Suivi = apps.get_model('api', 'SuiviPaiementSousTraitantMensuel')
    FactureSuivi = apps.get_model('api', 'FactureSuiviSousTraitant')

    suivi_ids_with_factures = set(
        FactureSuivi.objects.values_list('suivi_paiement_id', flat=True).distinct()
    )

    for suivi in Suivi.objects.all().iterator():
        if suivi.montant_paye_ht is None:
            continue
        montant = float(suivi.montant_paye_ht)
        if (
            montant != 0
            or suivi.date_paiement_reel is not None
            or suivi.id in suivi_ids_with_factures
        ):
            suivi.montant_paye_saisi = True
            suivi.save(update_fields=['montant_paye_saisi'])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0119_suivipaiement_factures_st_masquees'),
    ]

    operations = [
        migrations.AddField(
            model_name='suivipaiementsoustraitantmensuel',
            name='montant_paye_saisi',
            field=models.BooleanField(default=False),
        ),
        migrations.AlterField(
            model_name='suivipaiementsoustraitantmensuel',
            name='montant_paye_ht',
            field=models.DecimalField(
                blank=True, decimal_places=2, default=None, max_digits=12, null=True
            ),
        ),
        migrations.RunPython(mark_existing_saisis, noop_reverse),
    ]
