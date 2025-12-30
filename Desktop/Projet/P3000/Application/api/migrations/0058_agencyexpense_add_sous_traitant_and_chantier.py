# Generated manually for AgencyExpense sous-traitant integration

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0057_tableausoustraitantentry_facturetableausoustraitant'),
    ]

    operations = [
        migrations.AddField(
            model_name='agencyexpense',
            name='sous_traitant',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='agency_expenses',
                to='api.soustraitant'
            ),
        ),
        migrations.AddField(
            model_name='agencyexpense',
            name='chantier',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='agency_expenses',
                to='api.chantier'
            ),
        ),
    ]

