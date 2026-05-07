# Generated manually for répartition du montant chargé (multi-agences / chantier)

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0114_pointagemensuel_agence"),
    ]

    operations = [
        migrations.AddField(
            model_name="pointagemensuel",
            name="repartition_montant_charge",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text='Liste de {"agence_id": int|null, "montant": str|float} ; null = main d\'œuvre chantier.',
            ),
        ),
    ]
