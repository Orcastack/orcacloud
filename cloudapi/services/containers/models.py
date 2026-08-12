from django.db import models
from django.contrib.auth.models import User
from ..core.base_models import TimeStampedModel
import uuid


def gen_id():
    return 'con_' + uuid.uuid4().hex[:12]


def gen_dep_id():
    return 'dep_' + uuid.uuid4().hex[:12]


class Container(TimeStampedModel):
    """
    Represents a deployable container linked to a project and pipeline.
    Stores runtime / networking configuration as JSON so the schema stays
    flexible as new container types are introduced.
    """

    CONTAINER_TYPES = [
        ('runtime', 'Runtime'),
        ('worker',  'Worker'),
        ('cron',    'Cron'),
        ('oneoff',  'One-off'),
    ]

    STATUS_CHOICES = [
        ('running',   'Running'),
        ('deploying', 'Deploying'),
        ('failed',    'Failed'),
        ('stopped',   'Stopped'),
    ]

    EXPOSE_CHOICES = [
        ('public',   'Public'),
        ('internal', 'Internal'),
        ('private',  'Private'),
    ]

    # ── Identity ──────────────────────────────────────────────────────────
    id          = models.CharField(max_length=50, primary_key=True, default=gen_id, editable=False)
    owner       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='containers')
    name        = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    container_type = models.CharField(max_length=20, choices=CONTAINER_TYPES, default='runtime')

    # ── Project / Pipeline linkage ─────────────────────────────────────────
    project_id   = models.CharField(max_length=50, blank=True)
    project_name = models.CharField(max_length=150, blank=True)
    pipeline     = models.CharField(max_length=150, blank=True)

    # ── Image ──────────────────────────────────────────────────────────────
    image      = models.CharField(max_length=500)
    image_tag  = models.CharField(max_length=100, default='latest')
    commit_sha = models.CharField(max_length=40, blank=True)

    # ── Runtime config ────────────────────────────────────────────────────
    cpu     = models.FloatField(default=0.5)   # vCPUs
    memory  = models.IntegerField(default=512) # MiB
    replicas = models.IntegerField(default=1)

    # ── Autoscaling ───────────────────────────────────────────────────────
    autoscaling   = models.BooleanField(default=False)
    autoscale_min = models.IntegerField(default=1)
    autoscale_max = models.IntegerField(default=10)
    autoscale_cpu = models.IntegerField(default=70)  # target CPU %

    # ── Networking ────────────────────────────────────────────────────────
    expose = models.CharField(max_length=20, choices=EXPOSE_CHOICES, default='internal')
    port   = models.IntegerField(default=8080)
    domain = models.CharField(max_length=300, blank=True)

    # ── Status ────────────────────────────────────────────────────────────
    status        = models.CharField(max_length=20, choices=STATUS_CHOICES, default='stopped')
    last_deployed = models.DateTimeField(null=True, blank=True)

    # ── Extra JSON blobs ──────────────────────────────────────────────────
    env_vars     = models.JSONField(default=dict, blank=True)  # {KEY: VALUE}
    labels       = models.JSONField(default=dict, blank=True)
    runtime_meta = models.JSONField(default=dict, blank=True)  # arbitrary extra

    class Meta:
        db_table  = 'containers'
        ordering  = ['-created_at']
        indexes   = [
            models.Index(fields=['owner', 'status']),
            models.Index(fields=['project_id']),
        ]

    def __str__(self):
        return f"{self.owner.username}/{self.name}:{self.image_tag}"


class ContainerDeployment(TimeStampedModel):
    """Immutable deployment record — one row per deployment attempt."""

    STATUS_CHOICES = [
        ('pending',  'Pending'),
        ('running',  'Running'),
        ('success',  'Success'),
        ('failed',   'Failed'),
        ('cancelled', 'Cancelled'),
    ]

    id         = models.CharField(max_length=50, primary_key=True, default=gen_dep_id, editable=False)
    container  = models.ForeignKey(Container, on_delete=models.CASCADE, related_name='deployments')
    trigger    = models.CharField(max_length=100, default='manual')  # 'manual' | 'pipeline' | 'webhook'
    commit_sha = models.CharField(max_length=40, blank=True)
    image_tag  = models.CharField(max_length=100)
    status     = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    logs       = models.TextField(blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at   = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'container_deployments'
        ordering = ['-created_at']

    def __str__(self):
        return f"Deploy {self.id} → {self.container.name} [{self.status}]"
