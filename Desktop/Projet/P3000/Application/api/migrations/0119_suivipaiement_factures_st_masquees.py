from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0118_distributeur_reappro_annulation_trace'),
    ]

    operations = [
        migrations.AddField(
            model_name='suivipaiementsoustraitantmensuel',
            name='factures_st_masquees',
            field=models.JSONField(blank=True, default=list),
        ),
    ]
