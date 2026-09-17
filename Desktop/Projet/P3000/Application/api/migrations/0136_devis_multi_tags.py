from django.db import migrations, models


def fill_devis_tags(apps, schema_editor):
    Devis = apps.get_model('api', 'Devis')
    for devis in Devis.objects.all().iterator():
        current = list(devis.tags or [])
        if current:
            continue
        if devis.status:
            tags = [part.strip() for part in str(devis.status).split('/') if part.strip()]
            devis.tags = tags or [devis.status]
            devis.save(update_fields=['tags'])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0135_devis_tags_and_notifications'),
    ]

    operations = [
        migrations.AddField(
            model_name='devis',
            name='tags',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AlterField(
            model_name='devis',
            name='status',
            field=models.CharField(
                choices=[
                    ('En attente', 'En attente'),
                    ('Envoyé', 'Envoyé'),
                    ('Validé', 'Validé'),
                    ('Refusé', 'Refusé'),
                    ('En attente de travaux', 'En attente de travaux'),
                    ('Travaux en cours', 'Travaux en cours'),
                    ('Travaux réalisés', 'Travaux réalisés'),
                    ('En Cours', 'En Cours'),
                    ('Terminé', 'Terminé'),
                    ('Facturé', 'Facturé'),
                ],
                default='En attente',
                max_length=255,
            ),
        ),
        migrations.AlterField(
            model_name='usernotification',
            name='old_value',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AlterField(
            model_name='usernotification',
            name='new_value',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.RunPython(fill_devis_tags, noop_reverse),
    ]
