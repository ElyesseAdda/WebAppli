from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('auth', '0012_alter_user_first_name_max_length'),
        ('api', '0137_devis_tags_rename'),
    ]

    operations = [
        migrations.CreateModel(
            name='DevisTagHistory',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('old_value', models.CharField(blank=True, default='', max_length=255)),
                ('new_value', models.CharField(blank=True, default='', max_length=255)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('actor', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='devis_tag_history', to='auth.user')),
                ('devis', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='tag_history', to='api.devis')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='devistaghistory',
            index=models.Index(fields=['devis', '-created_at'], name='api_devistaghist_devis_idx'),
        ),
    ]
