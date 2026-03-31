from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0108_rapportintervention_devis_a_faire"),
    ]

    operations = [
        migrations.AddField(
            model_name="rapportintervention",
            name="devis_fait",
            field=models.BooleanField(default=False, verbose_name="Devis fait"),
        ),
        migrations.AddField(
            model_name="rapportintervention",
            name="devis_lie",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="rapports_intervention_lies",
                to="api.devis",
                verbose_name="Devis lié",
            ),
        ),
    ]
