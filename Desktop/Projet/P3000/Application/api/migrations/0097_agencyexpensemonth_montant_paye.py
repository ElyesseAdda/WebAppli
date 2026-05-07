# Generated manually for Tableau Fournisseur (dépenses agence catégorie Fournisseur)

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0096_make_client_email_phone_optional"),
    ]

    operations = [
        migrations.AddField(
            model_name="agencyexpensemonth",
            name="montant_paye",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                default=0,
                help_text="Montant payé (suivi tableau fournisseur / agence)",
                max_digits=10,
                null=True,
            ),
        ),
    ]
