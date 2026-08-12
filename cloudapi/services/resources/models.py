import uuid
from django.db import models
from django.contrib.auth.models import User


RESOURCE_TYPE_CHOICES = [
    ('pipeline',               'Pipeline'),
    ('container',              'Container'),
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
]

STATUS_CHOICES = [
    ('running',   'Running'),
    ('failed',    'Failed'),
    ('degraded',  'Degraded'),
    ('pending',   'Pending'),
    ('stopped',   'Stopped'),
    ('unknown',   'Unknown'),
]

ENVIRONMENT_CHOICES = [
    ('dev',     'Development'),
    ('stage',   'Staging'),
    ('prod',    'Production'),
    ('global',  'Global'),
    ('unknown', 'Unknown'),
]


class PlatformResource(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Identity
    name          = models.CharField(max_length=255)
    resource_type = models.CharField(max_length=60, choices=RESOURCE_TYPE_CHOICES, db_index=True)
    subsystem     = models.CharField(max_length=100, blank=True)
    external_id   = models.CharField(max_length=255, blank=True)

    # Ownership
    group_id      = models.CharField(max_length=100, blank=True, db_index=True)
    group_name    = models.CharField(max_length=255, blank=True)
    project_id    = models.CharField(max_length=100, blank=True, db_index=True)
    project_name  = models.CharField(max_length=255, blank=True)
    owner         = models.ForeignKey(
        User,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='owned_platform_resources',
    )

    # State
    environment  = models.CharField(max_length=20, choices=ENVIRONMENT_CHOICES, default='unknown', db_index=True)
    status       = models.CharField(max_length=20, choices=STATUS_CHOICES, default='unknown', db_index=True)
    health_score = models.IntegerField(default=100)  # 0–100

    # Arbitrary key/value details per resource type
    metadata = models.JSONField(default=dict)

    # Timestamps
    last_synced = models.DateTimeField(auto_now=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = 'services'
        ordering  = ['-last_synced']
        verbose_name        = 'Platform Resource'
        verbose_name_plural = 'Platform Resources'

    def __str__(self):
        return f'[{self.resource_type}] {self.name} ({self.status})'
