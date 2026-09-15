from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0134_alter_ganttelement_style_barre'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterField(
            model_name='devis',
            name='status',
            field=models.CharField(
                choices=[
                    ('En attente', 'En attente'),
                    ('Envoyé', 'Envoyé'),
                    ('Validé', 'Validé'),
                    ('Refusé', 'Refusé'),
                    ('Travaux en cours', 'Travaux en cours'),
                    ('Travaux réalisés', 'Travaux réalisés'),
                    ('En Cours', 'En Cours'),
                    ('Terminé', 'Terminé'),
                    ('Facturé', 'Facturé'),
                ],
                default='En attente',
                max_length=50,
            ),
        ),
        migrations.AddField(
            model_name='devis',
            name='status_updated_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='devis',
            name='status_updated_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='devis_status_updates',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.CreateModel(
            name='UserNotification',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('type', models.CharField(choices=[('devis_tag', 'Changement de tag devis')], default='devis_tag', max_length=50)),
                ('devis_numero', models.CharField(blank=True, default='', max_length=100)),
                ('chantier_name', models.CharField(blank=True, default='', max_length=255)),
                ('old_value', models.CharField(blank=True, default='', max_length=50)),
                ('new_value', models.CharField(blank=True, default='', max_length=50)),
                ('is_read', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('actor', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='notifications_sent', to=settings.AUTH_USER_MODEL)),
                ('chantier', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='notifications', to='api.chantier')),
                ('devis', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='tag_notifications', to='api.devis')),
                ('recipient', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='notifications', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='usernotification',
            index=models.Index(fields=['recipient', 'is_read', '-created_at'], name='api_usernotif_recip_idx'),
        ),
    ]
