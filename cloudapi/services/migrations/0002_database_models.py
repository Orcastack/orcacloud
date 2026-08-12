

import django.core.validators
import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('services', '0001_onboarding_progress'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ManagedDatabase',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(db_index=True, max_length=255)),
                ('description', models.TextField(blank=True)),
                ('engine', models.CharField(choices=[('postgresql', 'PostgreSQL'), ('mysql', 'MySQL'), ('mariadb', 'MariaDB'), ('mongodb', 'MongoDB'), ('redis', 'Redis'), ('clickhouse', 'ClickHouse'), ('cassandra', 'Cassandra')], db_index=True, max_length=30)),
                ('version', models.CharField(max_length=20)),
                ('tenancy_model', models.CharField(choices=[('shared', 'Shared Cluster'), ('dedicated', 'Dedicated Instance'), ('cluster', 'Dedicated HA Cluster')], default='shared', max_length=20)),
                ('vcpus', models.IntegerField(default=1, validators=[django.core.validators.MinValueValidator(1)])),
                ('memory_mb', models.IntegerField(default=1024, validators=[django.core.validators.MinValueValidator(256)])),
                ('storage_gb', models.IntegerField(default=20, validators=[django.core.validators.MinValueValidator(1)])),
                ('read_replicas', models.IntegerField(default=0, validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(5)])),
                ('region', models.CharField(choices=[('af-south-1', 'Africa — Johannesburg'), ('eu-west-1', 'Europe — Frankfurt'), ('ap-south-1', 'Asia — Singapore'), ('us-east-1', 'US East — New York'), ('us-west-1', 'US West — Los Angeles')], default='af-south-1', max_length=30)),
                ('status', models.CharField(choices=[('provisioning', 'Provisioning'), ('running', 'Running'), ('stopped', 'Stopped'), ('restarting', 'Restarting'), ('scaling', 'Scaling'), ('deleting', 'Deleting'), ('error', 'Error'), ('backup', 'Backup in Progress')], db_index=True, default='provisioning', max_length=20)),
                ('host', models.CharField(blank=True, max_length=255)),
                ('port', models.IntegerField(blank=True, null=True)),
                ('database_name', models.CharField(default='orcacloud', max_length=255)),
                ('connection_uri', models.TextField(blank=True, help_text='Masked connection string stored securely')),
                ('ssl_enabled', models.BooleanField(default=True)),
                ('publicly_accessible', models.BooleanField(default=False)),
                ('vpc_id', models.CharField(blank=True, max_length=64)),
                ('allowed_ips', models.JSONField(default=list, help_text='CIDR allowlist')),
                ('backup_enabled', models.BooleanField(default=True)),
                ('backup_retention_days', models.IntegerField(default=7, validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(35)])),
                ('last_backup_at', models.DateTimeField(blank=True, null=True)),
                ('current_storage_gb', models.FloatField(default=0.0)),
                ('connection_count', models.IntegerField(default=0)),
                ('hourly_cost_usd', models.DecimalField(decimal_places=4, default=0.0, max_digits=8)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('provisioned_at', models.DateTimeField(blank=True, null=True)),
                ('deleted_at', models.DateTimeField(blank=True, null=True)),
                ('owner', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='databases', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='DatabaseMetric',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('cpu_percent', models.FloatField(blank=True, null=True)),
                ('memory_percent', models.FloatField(blank=True, null=True)),
                ('storage_used_gb', models.FloatField(blank=True, null=True)),
                ('active_connections', models.IntegerField(blank=True, null=True)),
                ('queries_per_second', models.FloatField(blank=True, null=True)),
                ('avg_query_latency_ms', models.FloatField(blank=True, null=True)),
                ('replication_lag_ms', models.FloatField(blank=True, null=True)),
                ('iops_read', models.IntegerField(blank=True, null=True)),
                ('iops_write', models.IntegerField(blank=True, null=True)),
                ('database', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='metrics', to='services.manageddatabase')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='DatabaseCredential',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('username', models.CharField(max_length=255)),
                ('password', models.CharField(help_text='Stored encrypted in production', max_length=512)),
                ('role', models.CharField(choices=[('admin', 'Admin'), ('readwrite', 'Read/Write'), ('readonly', 'Read Only')], default='admin', max_length=30)),
                ('is_active', models.BooleanField(default=True)),
                ('last_rotated_at', models.DateTimeField(blank=True, null=True)),
                ('database', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='credentials', to='services.manageddatabase')),
            ],
            options={
                'ordering': ['role'],
            },
        ),
        migrations.CreateModel(
            name='DatabaseBackup',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('backup_id', models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
                ('backup_type', models.CharField(choices=[('automated', 'Automated'), ('manual', 'Manual'), ('pitr', 'Point-in-Time')], default='automated', max_length=20)),
                ('status', models.CharField(choices=[('running', 'Running'), ('completed', 'Completed'), ('failed', 'Failed')], default='running', max_length=20)),
                ('size_gb', models.FloatField(default=0.0)),
                ('duration_s', models.IntegerField(default=0, help_text='Backup duration in seconds')),
                ('storage_path', models.CharField(blank=True, max_length=512)),
                ('expires_at', models.DateTimeField(blank=True, null=True)),
                ('database', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='backups', to='services.manageddatabase')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='manageddatabase',
            index=models.Index(fields=['owner', 'status'], name='services_ma_owner_i_bad671_idx'),
        ),
        migrations.AddIndex(
            model_name='manageddatabase',
            index=models.Index(fields=['engine', 'status'], name='services_ma_engine_6a68ce_idx'),
        ),
        migrations.AddIndex(
            model_name='manageddatabase',
            index=models.Index(fields=['region', 'status'], name='services_ma_region_4121e1_idx'),
        ),
        migrations.AddIndex(
            model_name='databasemetric',
            index=models.Index(fields=['database', 'created_at'], name='services_da_databas_356dd2_idx'),
        ),
        migrations.AlterUniqueTogether(
            name='databasecredential',
            unique_together={('database', 'username')},
        ),
        migrations.AddIndex(
            model_name='databasebackup',
            index=models.Index(fields=['database', 'status'], name='services_da_databas_7753f1_idx'),
        ),
    ]
