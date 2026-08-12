import uuid
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('services', '0013_groups_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='PlatformResource',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=255)),
                ('resource_type', models.CharField(
                    choices=[
                        ('pipeline',              'Pipeline'),
                        ('container',             'Container'),
                        ('kubernetes_pod',         'Kubernetes Pod'),
                        ('kubernetes_deployment',  'Kubernetes Deployment'),
                        ('kubernetes_service',     'Kubernetes Service'),
                        ('api_route',              'API Route'),
                        ('api_gateway',            'API Gateway'),
                        ('monitoring_alert',       'Monitoring Alert'),
                        ('group_runner',           'Group Runner'),
                        ('runner',                 'Runner'),
                        ('environment',            'Environment'),
                        ('storage_bucket',         'Storage Bucket'),
                        ('storage_volume',         'Storage Volume'),
                        ('workspace',              'Workspace'),
                        ('operational_task',       'Operational Task'),
                        ('domain',                 'Domain'),
                        ('secret',                 'Secret'),
                    ],
                    db_index=True,
                    max_length=60,
                )),
                ('subsystem', models.CharField(blank=True, max_length=100)),
                ('external_id', models.CharField(blank=True, max_length=255)),
                ('group_id', models.CharField(blank=True, db_index=True, max_length=100)),
                ('group_name', models.CharField(blank=True, max_length=255)),
                ('project_id', models.CharField(blank=True, db_index=True, max_length=100)),
                ('project_name', models.CharField(blank=True, max_length=255)),
                ('environment', models.CharField(
                    choices=[
                        ('dev',     'Development'),
                        ('stage',   'Staging'),
                        ('prod',    'Production'),
                        ('global',  'Global'),
                        ('unknown', 'Unknown'),
                    ],
                    db_index=True,
                    default='unknown',
                    max_length=20,
                )),
                ('status', models.CharField(
                    choices=[
                        ('running',  'Running'),
                        ('failed',   'Failed'),
                        ('degraded', 'Degraded'),
                        ('pending',  'Pending'),
                        ('stopped',  'Stopped'),
                        ('unknown',  'Unknown'),
                    ],
                    db_index=True,
                    default='unknown',
                    max_length=20,
                )),
                ('health_score', models.IntegerField(default=100)),
                ('metadata', models.JSONField(default=dict)),
                ('last_synced', models.DateTimeField(auto_now=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('owner', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='owned_platform_resources',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Platform Resource',
                'verbose_name_plural': 'Platform Resources',
                'ordering': ['-last_synced'],
            },
        ),
    ]
