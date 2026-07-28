# OrcaCloud – Managed Database Service Models
# Supports: PostgreSQL, MySQL, MariaDB, MongoDB, Redis, ClickHouse, Cassandra

from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from ..core.base_models import ResourceModel, TimeStampedModel
import uuid


# ── Engine choices ────────────────────────────────────────────────────────────
ENGINE_CHOICES = [
    ('postgresql', 'PostgreSQL'),
    ('mysql',      'MySQL'),
    ('mariadb',    'MariaDB'),
    ('mongodb',    'MongoDB'),
    ('redis',      'Redis'),
    ('clickhouse', 'ClickHouse'),
    ('cassandra',  'Cassandra'),
]

VERSION_MAP = {
    'postgresql': ['15', '14', '13'],
    'mysql':      ['8.0', '5.7'],
    'mariadb':    ['10.11', '10.6'],
    'mongodb':    ['7.0', '6.0'],
    'redis':      ['7.2', '7.0', '6.2'],
    'clickhouse': ['24.1', '23.8'],
    'cassandra':  ['4.1', '4.0'],
}

REGION_CHOICES = [
    ('af-south-1', 'Africa — Johannesburg'),
    ('eu-west-1',  'Europe — Frankfurt'),
    ('ap-south-1', 'Asia — Singapore'),
    ('us-east-1',  'US East — New York'),
    ('us-west-1',  'US West — Los Angeles'),
]

TENANCY_CHOICES = [
    ('shared',     'Shared Cluster'),
    ('dedicated',  'Dedicated Instance'),
    ('cluster',    'Dedicated HA Cluster'),
]

STATUS_CHOICES = [
    ('provisioning', 'Provisioning'),
    ('running',      'Running'),
    ('stopped',      'Stopped'),
    ('restarting',   'Restarting'),
    ('scaling',      'Scaling'),
    ('deleting',     'Deleting'),
    ('error',        'Error'),
    ('backup',       'Backup in Progress'),
]


class ManagedDatabase(models.Model):
    """A managed database instance on OrcaCloud."""

    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='databases')
    name        = models.CharField(max_length=255, db_index=True)
    description = models.TextField(blank=True)

    # Engine
    engine  = models.CharField(max_length=30, choices=ENGINE_CHOICES, db_index=True)
    version = models.CharField(max_length=20)

    # Plan / sizing
    tenancy_model = models.CharField(max_length=20, choices=TENANCY_CHOICES, default='shared')
    vcpus         = models.IntegerField(default=1, validators=[MinValueValidator(1)])
    memory_mb     = models.IntegerField(default=1024, validators=[MinValueValidator(256)])
    storage_gb    = models.IntegerField(default=20, validators=[MinValueValidator(1)])
    read_replicas = models.IntegerField(default=0, validators=[MinValueValidator(0), MaxValueValidator(5)])

    # Region & status
    region = models.CharField(max_length=30, choices=REGION_CHOICES, default='af-south-1')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='provisioning', db_index=True)

    # Connectivity
    host            = models.CharField(max_length=255, blank=True)
    port            = models.IntegerField(null=True, blank=True)
    database_name   = models.CharField(max_length=255, default='atonix')
    connection_uri  = models.TextField(blank=True, help_text='Masked connection string stored securely')
    ssl_enabled     = models.BooleanField(default=True)

    # Security
    publicly_accessible = models.BooleanField(default=False)
    vpc_id              = models.CharField(max_length=64, blank=True)
    allowed_ips         = models.JSONField(default=list, help_text='CIDR allowlist')

    # Backup
    backup_enabled           = models.BooleanField(default=True)
    backup_retention_days    = models.IntegerField(default=7, validators=[MinValueValidator(1), MaxValueValidator(35)])
    last_backup_at           = models.DateTimeField(null=True, blank=True)

    # Usage
    current_storage_gb = models.FloatField(default=0.0)
    connection_count   = models.IntegerField(default=0)

    # Billing
    hourly_cost_usd = models.DecimalField(max_digits=8, decimal_places=4, default=0.0)

    # Lifecycle
    created_at    = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)
    provisioned_at = models.DateTimeField(null=True, blank=True)
    deleted_at    = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering  = ['-created_at']
        indexes   = [
            models.Index(fields=['owner', 'status']),
            models.Index(fields=['engine', 'status']),
            models.Index(fields=['region', 'status']),
        ]

    def __str__(self):
        return f"{self.name} — {self.engine} {self.version} ({self.status})"

    @property
    def is_running(self):
        return self.status == 'running'

    @property
    def default_port(self):
        ports = {
            'postgresql': 5432, 'mysql': 3306, 'mariadb': 3306,
            'mongodb': 27017, 'redis': 6379,
            'clickhouse': 9000, 'cassandra': 9042,
        }
        return ports.get(self.engine, 5432)


class DatabaseCredential(TimeStampedModel):
    """Credentials for a managed database (stored hashed/encrypted)."""

    database = models.ForeignKey(ManagedDatabase, on_delete=models.CASCADE, related_name='credentials')
    username = models.CharField(max_length=255)
    # In production this would be encrypted with KMS
    password = models.CharField(max_length=512, help_text='Stored encrypted in production')
    role     = models.CharField(
        max_length=30,
        choices=[('admin', 'Admin'), ('readwrite', 'Read/Write'), ('readonly', 'Read Only')],
        default='admin',
    )
    is_active        = models.BooleanField(default=True)
    last_rotated_at  = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('database', 'username')
        ordering = ['role']

    def __str__(self):
        return f"{self.username}@{self.database.name} ({self.role})"


class DatabaseBackup(TimeStampedModel):
    """Backup record for a managed database."""

    database = models.ForeignKey(ManagedDatabase, on_delete=models.CASCADE, related_name='backups')
    backup_id  = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    backup_type = models.CharField(
        max_length=20,
        choices=[('automated', 'Automated'), ('manual', 'Manual'), ('pitr', 'Point-in-Time')],
        default='automated',
    )
    status = models.CharField(
        max_length=20,
        choices=[('running', 'Running'), ('completed', 'Completed'), ('failed', 'Failed')],
        default='running',
    )
    size_gb     = models.FloatField(default=0.0)
    duration_s  = models.IntegerField(default=0, help_text='Backup duration in seconds')
    storage_path = models.CharField(max_length=512, blank=True)
    expires_at  = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes  = [models.Index(fields=['database', 'status'])]

    def __str__(self):
        return f"Backup {self.backup_id} — {self.database.name} ({self.status})"


class DatabaseMetric(TimeStampedModel):
    """Time-series performance metrics for a managed database."""

    database = models.ForeignKey(ManagedDatabase, on_delete=models.CASCADE, related_name='metrics')

    cpu_percent          = models.FloatField(null=True, blank=True)
    memory_percent       = models.FloatField(null=True, blank=True)
    storage_used_gb      = models.FloatField(null=True, blank=True)
    active_connections   = models.IntegerField(null=True, blank=True)
    queries_per_second   = models.FloatField(null=True, blank=True)
    avg_query_latency_ms = models.FloatField(null=True, blank=True)
    replication_lag_ms   = models.FloatField(null=True, blank=True)
    iops_read            = models.IntegerField(null=True, blank=True)
    iops_write           = models.IntegerField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes  = [models.Index(fields=['database', 'created_at'])]

    def __str__(self):
        return f"Metric {self.database.name} @ {self.created_at}"
