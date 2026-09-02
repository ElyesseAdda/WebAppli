from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0131_agentcontrat'),
    ]

    operations = [
        migrations.CreateModel(
            name='AgentContratAvenant',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('numero', models.PositiveIntegerField()),
                ('libelle', models.CharField(blank=True, default='', max_length=80)),
                ('date_fin_contrat', models.DateField(help_text='Nouvelle date de fin du CDD après cet avenant')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('contrat', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='avenants', to='api.agentcontrat')),
            ],
            options={
                'verbose_name': 'Avenant contrat agent',
                'verbose_name_plural': 'Avenants contrats agents',
                'ordering': ['numero'],
                'unique_together': {('contrat', 'numero')},
            },
        ),
    ]
