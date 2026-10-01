from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0146_document_numero_compteur"),
    ]

    operations = [
        migrations.AddField(
            model_name="distributeurreapproligne",
            name="stock_product",
            field=models.ForeignKey(
                blank=True,
                help_text="Produit stock au moment du mouvement — la marge reste liée à ce produit si la case change",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="reappro_lignes",
                to="api.stockproduct",
            ),
        ),
        migrations.AddField(
            model_name="stockloss",
            name="nature",
            field=models.CharField(
                choices=[
                    ("perte", "Perte"),
                    ("don", "Don"),
                    ("usage", "Usage interne"),
                    ("correction", "Correction"),
                    ("autre", "Autre sortie"),
                ],
                default="perte",
                help_text="Seule la nature perte est additionnée au coût des pertes du mois",
                max_length=20,
            ),
        ),
    ]
