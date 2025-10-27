# Generated manually for overtime system
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0037_increase_description_max_length'),
    ]

    operations = [
        migrations.AddField(
            model_name='schedule',
            name='overtime_hours',
            field=models.DecimalField(blank=True, decimal_places=2, default=0, help_text='Heures supplémentaires (+25%)', max_digits=4, null=True),
        ),
        migrations.AddField(
            model_name='laborcost',
            name='hours_overtime',
            field=models.DecimalField(decimal_places=2, default=0, help_text='Heures supplémentaires (+25%)', max_digits=10),
        ),
        migrations.AddField(
            model_name='laborcost',
            name='cost_overtime',
            field=models.DecimalField(decimal_places=2, default=0, help_text='Coût des heures supplémentaires', max_digits=10),
        ),
    ]
