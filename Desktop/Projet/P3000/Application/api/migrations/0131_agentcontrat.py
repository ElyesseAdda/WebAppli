from django.db import migrations, models
import django.db.models.deletion


def migrer_contrats_agent(apps, schema_editor):
    Agent = apps.get_model('api', 'Agent')
    AgentContrat = apps.get_model('api', 'AgentContrat')

    for agent in Agent.objects.all():
        has_data = any([
            agent.type_contrat,
            agent.date_debut_contrat,
            agent.date_fin_contrat,
            agent.fin_periode_essai,
            agent.carte_btp,
        ])
        if not has_data:
            continue

        libelle = ''
        if agent.type_contrat:
            libelle = agent.type_contrat.upper()
            if agent.date_debut_contrat:
                libelle = f"{libelle} {agent.date_debut_contrat.strftime('%m/%Y')}"

        AgentContrat.objects.create(
            agent=agent,
            libelle=libelle or 'Contrat initial',
            type_contrat=agent.type_contrat or None,
            fin_periode_essai=agent.fin_periode_essai,
            date_debut_contrat=agent.date_debut_contrat,
            date_fin_contrat=agent.date_fin_contrat,
            carte_btp=bool(agent.carte_btp),
        )


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0130_agent_contrat_photo'),
    ]

    operations = [
        migrations.CreateModel(
            name='AgentContrat',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('libelle', models.CharField(blank=True, default='', help_text="Libellé affiché dans l'onglet (ex. CDD 2024, CDI)", max_length=80)),
                ('type_contrat', models.CharField(blank=True, choices=[('cdi', 'CDI'), ('cdd', 'CDD')], max_length=10, null=True)),
                ('fin_periode_essai', models.DateField(blank=True, null=True)),
                ('date_debut_contrat', models.DateField(blank=True, null=True)),
                ('date_fin_contrat', models.DateField(blank=True, null=True)),
                ('carte_btp', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('agent', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='contrats', to='api.agent')),
            ],
            options={
                'verbose_name': 'Contrat agent',
                'verbose_name_plural': 'Contrats agents',
                'ordering': ['-date_debut_contrat', '-created_at'],
            },
        ),
        migrations.RunPython(migrer_contrats_agent, migrations.RunPython.noop),
    ]
