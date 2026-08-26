from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0121_ligne_masquee_tableau_sous_traitant'),
    ]

    operations = [
        migrations.CreateModel(
            name='LigneMasqueeTableauFournisseur',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('mois', models.IntegerField()),
                ('annee', models.IntegerField()),
                ('fournisseur', models.CharField(max_length=255)),
                ('chantier_id', models.IntegerField(default=0)),
                ('source_type', models.CharField(blank=True, default='', max_length=64)),
                ('chantier_name', models.CharField(blank=True, default='', max_length=255)),
                ('a_payer', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'verbose_name': 'Ligne masquée tableau fournisseur',
                'verbose_name_plural': 'Lignes masquées tableau fournisseur',
                'ordering': ['-annee', '-mois', 'fournisseur'],
            },
        ),
        migrations.AddIndex(
            model_name='lignemasqueetableaufournisseur',
            index=models.Index(fields=['mois', 'annee', 'fournisseur'], name='api_lignema_mois_a_fq_idx'),
        ),
        migrations.AddConstraint(
            model_name='lignemasqueetableaufournisseur',
            constraint=models.UniqueConstraint(
                fields=('mois', 'annee', 'fournisseur', 'chantier_id', 'source_type'),
                name='uniq_ligne_masquee_tableau_fournisseur',
            ),
        ),
    ]
