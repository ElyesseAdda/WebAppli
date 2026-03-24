# Generated manually — plusieurs dates d'intervention par rapport

from django.db import migrations, models


def copy_date_to_dates_intervention(apps, schema_editor):
    RapportIntervention = apps.get_model("api", "RapportIntervention")
    for r in RapportIntervention.objects.all().iterator():
        if r.dates_intervention:
            continue
        if r.date:
            r.dates_intervention = [r.date.isoformat()]
        else:
            r.dates_intervention = []
        r.save(update_fields=["dates_intervention"])


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0104_make_rapport_titre_optional"),
    ]

    operations = [
        migrations.AddField(
            model_name="rapportintervention",
            name="dates_intervention",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text="Liste ordonnée de dates ISO (YYYY-MM-DD) : 1er passage, 2e, etc.",
                verbose_name="Dates d'intervention (passages)",
            ),
        ),
        migrations.RunPython(copy_date_to_dates_intervention, migrations.RunPython.noop),
    ]
