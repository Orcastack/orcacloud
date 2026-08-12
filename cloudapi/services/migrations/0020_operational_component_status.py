# Generated manually – creates only ComponentStatus and RunningProcess.
# Intentionally does NOT modify group models (those live in services.groups migrations).

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('services', '0019_group_resource_registry_config_registry'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ComponentStatus',
            fields=[
                ('id',         models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('service',    models.CharField(
                    choices=[
                        ('compute',           'Compute Engine'),
                        ('container_runtime', 'Container Runtime'),
                        ('ci_cd',             'CI/CD Pipelines'),
                        ('registry',          'Container Registry'),
                        ('networking',        'Networking'),
                        ('storage',           'Storage'),
                        ('monitoring',        'Monitoring'),
                        ('edge_robotics',     'Edge & Robotics'),
                        ('database',          'Database'),
                        ('dns',               'DNS'),
                        ('cdn',               'CDN'),
                        ('email',             'Email'),
                        ('kubernetes',        'Kubernetes'),
                        ('gpu_nodes',         'GPU Nodes'),
                    ],
                    db_index=True, max_length=64,
                )),
                ('region',     models.CharField(
                    db_index=True, max_length=64,
                    help_text='Region code, e.g. us-east-1',
                )),
                ('status',     models.CharField(
                    choices=[
                        ('operational',    'Operational'),
                        ('degraded',       'Degraded Performance'),
                        ('partial_outage', 'Partial Outage'),
                        ('major_outage',   'Major Outage'),
                        ('maintenance',    'Under Maintenance'),
                    ],
                    db_index=True, default='operational', max_length=20,
                )),
                ('uptime_pct', models.FloatField(default=100.0)),
                ('latency_ms', models.FloatField(default=0.0)),
                ('error_rate', models.FloatField(default=0.0)),
                ('note',       models.TextField(blank=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Component Status',
                'verbose_name_plural': 'Component Statuses',
                'ordering': ['service', 'region'],
            },
        ),
        migrations.CreateModel(
            name='RunningProcess',
            fields=[
                ('id',           models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at',   models.DateTimeField(auto_now_add=True)),
                ('process_type', models.CharField(
                    choices=[
                        ('deployment',  'Deployment'),
                        ('pipeline',    'CI/CD Pipeline'),
                        ('automation',  'Automation Task'),
                        ('gpu_job',     'GPU Job'),
                        ('edge_task',   'Edge / Robotics Task'),
                        ('background',  'Background Task'),
                        ('sync',        'Kubernetes Sync'),
                    ],
                    db_index=True, max_length=20,
                )),
                ('name',         models.CharField(max_length=255)),
                ('status',       models.CharField(
                    choices=[
                        ('queued',    'Queued'),
                        ('running',   'Running'),
                        ('succeeded', 'Succeeded'),
                        ('failed',    'Failed'),
                        ('cancelled', 'Cancelled'),
                    ],
                    db_index=True, default='running', max_length=16,
                )),
                ('region',       models.CharField(blank=True, max_length=64)),
                ('cluster',      models.CharField(blank=True, max_length=128)),
                ('environment',  models.CharField(blank=True, max_length=64)),
                ('resource_id',  models.CharField(blank=True, db_index=True, max_length=64)),
                ('resource_ref', models.CharField(blank=True, max_length=255)),
                ('progress_pct', models.IntegerField(default=0)),
                ('logs_url',     models.CharField(blank=True, max_length=512)),
                ('metrics_url',  models.CharField(blank=True, max_length=512)),
                ('started_at',   models.DateTimeField(auto_now_add=True)),
                ('finished_at',  models.DateTimeField(blank=True, null=True)),
                ('meta',         models.JSONField(blank=True, default=dict)),
                ('owner',        models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='running_processes',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'ordering': ['-started_at'],
            },
        ),
        migrations.AlterUniqueTogether(
            name='componentstatus',
            unique_together={('service', 'region')},
        ),
        migrations.AddIndex(
            model_name='runningprocess',
            index=models.Index(fields=['owner', 'status'], name='running_owner_status_idx'),
        ),
        migrations.AddIndex(
            model_name='runningprocess',
            index=models.Index(fields=['process_type', 'status'], name='running_type_status_idx'),
        ),
    ]
