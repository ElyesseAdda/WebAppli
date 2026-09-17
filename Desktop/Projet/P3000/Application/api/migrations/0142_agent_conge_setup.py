from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0141_agent_conge_ajustement'),
    ]

    operations = [
        migrations.CreateModel(
            name='AgentCongeSetup',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('period_start', models.DateField()),
                ('acquis', models.DecimalField(blank=True, decimal_places=2, max_digits=6, null=True)),
                ('acquis_live', models.DecimalField(blank=True, decimal_places=2, max_digits=6, null=True)),
                ('en_cours', models.DecimalField(blank=True, decimal_places=2, max_digits=6, null=True)),
                ('en_cours_live', models.DecimalField(blank=True, decimal_places=2, max_digits=6, null=True)),
                ('previsionnel', models.DecimalField(blank=True, decimal_places=2, max_digits=6, null=True)),
                ('previsionnel_live', models.DecimalField(blank=True, decimal_places=2, max_digits=6, null=True)),
                ('pris', models.DecimalField(blank=True, decimal_places=2, max_digits=6, null=True)),
                ('pris_live', models.DecimalField(blank=True, decimal_places=2, max_digits=6, null=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('agent', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='conge_setups', to='api.agent')),
            ],
            options={
                'verbose_name': 'Setup congés agent',
                'verbose_name_plural': 'Setups congés agents',
                'unique_together': {('agent', 'period_start')},
            },
        ),
    ]
