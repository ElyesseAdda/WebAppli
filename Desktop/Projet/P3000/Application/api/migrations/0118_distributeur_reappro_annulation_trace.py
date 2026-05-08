from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0117_ligne_detail_marge_unlimited"),
    ]

    operations = [
        migrations.AddField(
            model_name="distributeurreapproligne",
            name="consommation_lots",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text="Trace des lots consommés lors de la validation: [{lot_id, quantite}]",
            ),
        ),
        migrations.AlterField(
            model_name="distributeurreapprosession",
            name="statut",
            field=models.CharField(
                choices=[
                    ("en_cours", "En cours"),
                    ("termine", "Terminé"),
                    ("annule", "Annulé"),
                ],
                default="en_cours",
                help_text="En cours ou Terminé",
                max_length=20,
            ),
        ),
    ]
