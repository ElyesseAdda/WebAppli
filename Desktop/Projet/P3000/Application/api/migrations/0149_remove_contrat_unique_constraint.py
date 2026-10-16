# Generated manually

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0148_alter_stockloss_date_perte_and_more'),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='contratsoustraitance',
            unique_together=set(),
        ),
    ]
