import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('services', '0007_domain_models'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='UserProfile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('max_instances', models.IntegerField(default=10)),
                ('max_volumes', models.IntegerField(default=20)),
                ('max_storage_gb', models.IntegerField(default=1000)),
                ('max_networks', models.IntegerField(default=5)),
                ('max_functions', models.IntegerField(default=50)),
                ('company', models.CharField(blank=True, default='', max_length=255)),
                ('timezone', models.CharField(default='UTC', max_length=64)),
                ('notifications_enabled', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='userprofile',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'User Profile',
                'verbose_name_plural': 'User Profiles',
            },
        ),
        migrations.CreateModel(
            name='UserAPIKey',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(default='default', max_length=255)),
                ('key', models.CharField(editable=False, max_length=64, unique=True)),
                ('key_prefix', models.CharField(default='orcacloud_', max_length=32)),
                ('is_active', models.BooleanField(db_index=True, default=True)),
                ('expires_at', models.DateTimeField(blank=True, null=True)),
                ('scopes', models.JSONField(default=list)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='api_key_set',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
