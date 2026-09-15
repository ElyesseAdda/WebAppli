from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0139_devistaghistory_transform_meta'),
    ]

    operations = [
        migrations.AddField(
            model_name='usernotification',
            name='document_numero',
            field=models.CharField(blank=True, default='', max_length=100),
        ),
        migrations.AddField(
            model_name='usernotification',
            name='preview_url',
            field=models.CharField(blank=True, default='', max_length=500),
        ),
        migrations.AddField(
            model_name='usernotification',
            name='transform_type',
            field=models.CharField(blank=True, default='', max_length=20),
        ),
    ]
