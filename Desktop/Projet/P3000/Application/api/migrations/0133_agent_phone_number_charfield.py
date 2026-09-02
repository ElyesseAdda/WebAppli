from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0132_agentcontratavenant'),
    ]

    operations = [
        migrations.AlterField(
            model_name='agent',
            name='phone_Number',
            field=models.CharField(max_length=20),
        ),
    ]
