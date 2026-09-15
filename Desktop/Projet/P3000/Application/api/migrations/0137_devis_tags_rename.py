from django.db import migrations, models


TAG_REMAP = {
    'En attente': 'En attente BDC',
    'En Attente': 'En attente BDC',
    'en attente': 'En attente BDC',
    'En attente de travaux': 'Travaux non réalisés',
    'Travaux non réaliser': 'Travaux non réalisés',
    'BDC recus': 'BDC reçus',
}

STATUS_CHOICES = [
    ('En attente BDC', 'En attente BDC'),
    ('Envoyé', 'Envoyé'),
    ('Validé', 'Validé'),
    ('Refusé', 'Refusé'),
    ('Travaux non réalisés', 'Travaux non réalisés'),
    ('Travaux en cours', 'Travaux en cours'),
    ('Travaux réalisés', 'Travaux réalisés'),
    ('BDC reçus', 'BDC reçus'),
    ('Faire Avenant', 'Faire Avenant'),
    ('Faire TS', 'Faire TS'),
    ('En attente', 'En attente'),
    ('En attente de travaux', 'En attente de travaux'),
    ('En Cours', 'En Cours'),
    ('Terminé', 'Terminé'),
    ('Facturé', 'Facturé'),
]


def remap_devis_tags(apps, schema_editor):
    Devis = apps.get_model('api', 'Devis')
    for devis in Devis.objects.all().iterator():
        changed = False

        old_status = devis.status or ''
        new_status = TAG_REMAP.get(old_status, old_status)
        if new_status != old_status:
            devis.status = new_status
            changed = True

        tags = list(devis.tags or [])
        if not tags and old_status:
            tags = [old_status]

        remapped = []
        seen = set()
        for tag in tags:
            value = TAG_REMAP.get(str(tag).strip(), str(tag).strip())
            if value and value not in seen:
                seen.add(value)
                remapped.append(value)

        if remapped != list(devis.tags or []):
            devis.tags = remapped
            changed = True

        if changed:
            devis.save(update_fields=['status', 'tags'])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0136_devis_multi_tags'),
    ]

    operations = [
        migrations.AlterField(
            model_name='devis',
            name='status',
            field=models.CharField(
                choices=STATUS_CHOICES,
                default='En attente BDC',
                max_length=255,
            ),
        ),
        migrations.RunPython(remap_devis_tags, noop_reverse),
    ]
