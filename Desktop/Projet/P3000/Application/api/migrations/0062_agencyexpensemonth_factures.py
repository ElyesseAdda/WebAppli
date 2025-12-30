# Generated manually to add factures field to AgencyExpenseMonth

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0061_agencyexpensemonth_date_paiement'),
    ]

    operations = [
        migrations.AddField(
            model_name='agencyexpensemonth',
            name='factures',
            field=models.JSONField(blank=True, default=list),
        ),
    ]

