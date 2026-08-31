from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0120_suivipaiement_montant_paye_saisi'),
    ]

    operations = [
        migrations.CreateModel(
            name='LigneMasqueeTableauSousTraitant',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('mois', models.IntegerField()),
                ('annee', models.IntegerField()),
                ('sous_traitant', models.CharField(max_length=255)),
                ('chantier_id', models.IntegerField(default=0)),
                ('source_type', models.CharField(blank=True, default='', max_length=64)),
                ('chantier_name', models.CharField(blank=True, default='', max_length=255)),
                ('a_payer', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'verbose_name': 'Ligne masquée tableau sous-traitant',
                'verbose_name_plural': 'Lignes masquées tableau sous-traitant',
                'ordering': ['-annee', '-mois', 'sous_traitant'],
            },
        ),
        migrations.AddIndex(
            model_name='lignemasqueetableausoustraitant',
            index=models.Index(fields=['mois', 'annee', 'sous_traitant'], name='api_lignema_mois_a7c1d0_idx'),
        ),
        migrations.AddConstraint(
            model_name='lignemasqueetableausoustraitant',
            constraint=models.UniqueConstraint(
                fields=('mois', 'annee', 'sous_traitant', 'chantier_id', 'source_type'),
                name='uniq_ligne_masquee_tableau_st',
            ),
        ),
    ]
