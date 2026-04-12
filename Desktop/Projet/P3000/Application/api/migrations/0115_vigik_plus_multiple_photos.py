# Generated manually — Vigik+ : plusieurs photos par question (listes S3)

from django.db import migrations, models


def forwards_copy_vigik_photo_keys(apps, schema_editor):
    RapportIntervention = apps.get_model("api", "RapportIntervention")
    for r in RapportIntervention.objects.all().iterator():
        plat = []
        port = []
        old_p = getattr(r, "photo_platine_s3_key", None) or ""
        old_pp = getattr(r, "photo_platine_portail_s3_key", None) or ""
        if str(old_p).strip():
            plat.append(str(old_p).strip())
        if str(old_pp).strip():
            port.append(str(old_pp).strip())
        RapportIntervention.objects.filter(pk=r.pk).update(
            photos_platine_s3_keys=plat,
            photos_platine_portail_s3_keys=port,
        )


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0114_societe_ville_rue_blank"),
    ]

    operations = [
        migrations.AddField(
            model_name="rapportintervention",
            name="photos_platine_s3_keys",
            field=models.JSONField(blank=True, default=list, verbose_name="Photos platine (Vigik+)"),
        ),
        migrations.AddField(
            model_name="rapportintervention",
            name="photos_platine_portail_s3_keys",
            field=models.JSONField(blank=True, default=list, verbose_name="Photos platine portail (Vigik+)"),
        ),
        migrations.RunPython(forwards_copy_vigik_photo_keys, noop_reverse),
        migrations.RemoveField(
            model_name="rapportintervention",
            name="photo_platine_s3_key",
        ),
        migrations.RemoveField(
            model_name="rapportintervention",
            name="photo_platine_portail_s3_key",
        ),
    ]
