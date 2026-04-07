# Generated manually for Vigik+ portail en deux étapes

from django.db import migrations, models


def forwards_presence_portail_vigik(apps, schema_editor):
    RapportIntervention = apps.get_model('api', 'RapportIntervention')
    qs = RapportIntervention.objects.filter(type_rapport='vigik_plus', presence_portail__isnull=True)
    for r in qs.iterator():
        if r.presence_platine_portail is not None or (getattr(r, 'photo_platine_portail_s3_key', None) or '').strip():
            r.presence_portail = True
            r.save(update_fields=['presence_portail'])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0112_rapportinterventionbrouillon'),
    ]

    operations = [
        migrations.AddField(
            model_name='rapportintervention',
            name='presence_portail',
            field=models.BooleanField(
                blank=True,
                null=True,
                verbose_name="Présence d'un portail (Vigik+)",
            ),
        ),
        migrations.RunPython(forwards_presence_portail_vigik, noop_reverse),
    ]
