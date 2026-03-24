from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0103_vigik_adresse_rapport'),
    ]

    operations = [
        migrations.AlterField(
            model_name='rapportintervention',
            name='titre',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.SET_NULL,
                related_name='rapports',
                to='api.titrerapport',
            ),
        ),
    ]

