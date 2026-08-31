from django.db import migrations, models
import django.db.models.deletion


def backfill_periodes_inactivite(apps, schema_editor):
    Agent = apps.get_model('api', 'Agent')
    AgentPeriodeInactivite = apps.get_model('api', 'AgentPeriodeInactivite')
    for agent in Agent.objects.filter(is_active=False, date_desactivation__isnull=False):
        if AgentPeriodeInactivite.objects.filter(agent_id=agent.id).exists():
            continue
        AgentPeriodeInactivite.objects.create(
            agent_id=agent.id,
            date_debut=agent.date_desactivation,
            date_fin=None,
            motif='Migration depuis date_desactivation',
        )


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0122_ligne_masquee_tableau_fournisseur'),
    ]

    operations = [
        migrations.CreateModel(
            name='AgentPeriodeInactivite',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date_debut', models.DateField(help_text="Début d'inactivité (inclusif)")),
                ('date_fin', models.DateField(blank=True, help_text="Fin d'inactivité (inclusive) ; null = période ouverte jusqu'à réactivation", null=True)),
                ('motif', models.CharField(blank=True, default='', max_length=255)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('agent', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='periodes_inactivite', to='api.agent')),
            ],
            options={
                'verbose_name': "Période d'inactivité agent",
                'verbose_name_plural': "Périodes d'inactivité agents",
                'ordering': ['-date_debut', '-id'],
            },
        ),
        migrations.RunPython(backfill_periodes_inactivite, noop_reverse),
    ]
