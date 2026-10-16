from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0148_alter_stockloss_date_perte_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='devis',
            name='structure_isolee',
            field=models.BooleanField(
                default=False,
                help_text='True si le devis possède une copie isolée de sa structure (système unifié)',
            ),
        ),
        migrations.RemoveConstraint(
            model_name='lignedetail',
            name='unique_ligne_detail_active',
        ),
        migrations.RemoveConstraint(
            model_name='partie',
            name='unique_partie_active',
        ),
        migrations.RemoveConstraint(
            model_name='souspartie',
            name='unique_sous_partie_active',
        ),
        migrations.AddConstraint(
            model_name='lignedetail',
            constraint=models.UniqueConstraint(
                condition=models.Q(('devis__isnull', True), ('is_deleted', False)),
                fields=('sous_partie', 'description', 'unite'),
                name='unique_ligne_detail_active',
            ),
        ),
        migrations.AddConstraint(
            model_name='partie',
            constraint=models.UniqueConstraint(
                condition=models.Q(('devis__isnull', True), ('is_deleted', False)),
                fields=('titre', 'type'),
                name='unique_partie_active',
            ),
        ),
        migrations.AddConstraint(
            model_name='souspartie',
            constraint=models.UniqueConstraint(
                condition=models.Q(('devis__isnull', True), ('is_deleted', False)),
                fields=('partie', 'description'),
                name='unique_sous_partie_active',
            ),
        ),
    ]
