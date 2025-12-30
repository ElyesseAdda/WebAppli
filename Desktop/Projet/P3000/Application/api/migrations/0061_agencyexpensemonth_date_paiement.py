# Generated manually to add date_paiement field to existing AgencyExpenseMonth table

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0060_agencyexpensemonth'),
    ]

    operations = [
        migrations.AddField(
            model_name='agencyexpensemonth',
            name='date_paiement',
            field=models.DateField(blank=True, null=True),
        ),
    ]

