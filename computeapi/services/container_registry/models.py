# OrcaCloud – Container Registry Models
# Multi-tenant, OCI-compliant container image registry

import uuid
import secrets
from django.db import models
from django.contrib.auth.models import User
from ..core.base_models import TimeStampedModel


# ── Choices ───────────────────────────────────────────────────────────────────
VISIBILITY_CHOICES = [
    ('private', 'Private'),
    ('public',  'Public'),
]

REGION_CHOICES = [
    ('af-south-1', 'Africa — Johannesburg'),
    ('eu-west-1',  'Europe — Frankfurt'),
    ('ap-south-1', 'Asia — Singapore'),
    ('us-east-1',  'US East — New York'),
    ('us-west-1',  'US West — Los Angeles'),
]

REPO_STATUS_CHOICES = [
    ('active',    'Active'),
    ('deleting',  'Deleting'),
    ('error',     'Error'),
]

TOKEN_SCOPE_CHOICES = [
    ('pull',  'Pull Only'),
    ('push',  'Push Only'),
    ('admin', 'Admin (Push + Pull + Delete)'),
]

REPLICATION_MODE_CHOICES = [
    ('sync',      'Synchronous'),
    ('async',     'Asynchronous'),
    ('on_demand', 'On-Demand'),
]

SCAN_STATUS_CHOICES = [
    ('pending',    'Pending'),
    ('scanning',   'Scanning'),
    ('clean',      'Clean'),
    ('vulnerable', 'Vulnerable'),
    ('error',      'Error'),
]


def generate_token():
    return secrets.token_urlsafe(40)


# ── ContainerRepository ───────────────────────────────────────────────────────
class ContainerRepository(TimeStampedModel):
    """
    A named namespace (registry.orcacloud.com/<owner>/<name>) that stores
    container image tags.
    """
    id             = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner          = models.ForeignKey(User, on_delete=models.CASCADE, related_name='container_repositories')
    name           = models.CharField(max_length=128, db_index=True)
    description    = models.TextField(blank=True)
    visibility     = models.CharField(max_length=10, choices=VISIBILITY_CHOICES, default='private')
    region         = models.CharField(max_length=32, choices=REGION_CHOICES, default='us-east-1')
    status         = models.CharField(max_length=20, choices=REPO_STATUS_CHOICES, default='active')

    # Aggregated stats (updated on push/delete)
    image_count    = models.PositiveIntegerField(default=0)
    storage_mb     = models.FloatField(default=0.0)
    pull_count     = models.PositiveBigIntegerField(default=0)
    push_count     = models.PositiveBigIntegerField(default=0)
    last_pushed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('owner', 'name')
        ordering        = ['-created_at']

    def __str__(self):
        return f"{self.owner.username}/{self.name}"

    @property
    def full_name(self):
        return f"registry.orcacloud.com/{self.owner.username}/{self.name}"

    @property
    def region_display(self):
        return dict(REGION_CHOICES).get(self.region, self.region)


# ── ContainerImage ────────────────────────────────────────────────────────────
class ContainerImage(TimeStampedModel):
    """
    A single tagged image manifest inside a repository.
    """
    id              = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    repository      = models.ForeignKey(ContainerRepository, on_delete=models.CASCADE, related_name='images')
    tag             = models.CharField(max_length=128, db_index=True)
    digest          = models.CharField(max_length=128, db_index=True)   # sha256:...
    size_mb         = models.FloatField(default=0.0)
    architecture    = models.CharField(max_length=32, default='amd64')  # amd64 / arm64 / multi
    os              = models.CharField(max_length=32, default='linux')
    pushed_by       = models.CharField(max_length=128, blank=True)
    scan_status     = models.CharField(max_length=20, choices=SCAN_STATUS_CHOICES, default='pending')
    vulnerability_count = models.JSONField(
        default=dict,
        help_text='{"critical":0,"high":0,"medium":0,"low":0}'
    )
    # Simulated layer count
    layer_count     = models.PositiveSmallIntegerField(default=0)

    class Meta:
        unique_together = ('repository', 'tag')
        ordering        = ['-created_at']

    def __str__(self):
        return f"{self.repository}:{self.tag}"


# ── RegistryToken ─────────────────────────────────────────────────────────────
class RegistryToken(TimeStampedModel):
    """
    A scoped access token for authenticating docker login / CI pipelines.
    """
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='registry_tokens')
    name        = models.CharField(max_length=128)  # e.g. "ci-pipeline", "k8s-puller"
    token       = models.CharField(max_length=80, unique=True, default=generate_token)
    scope       = models.CharField(max_length=10, choices=TOKEN_SCOPE_CHOICES, default='pull')
    # Optional: restrict to specific repo(s); null = all repos
    repository  = models.ForeignKey(
        ContainerRepository, on_delete=models.CASCADE,
        null=True, blank=True, related_name='tokens',
    )
    expires_at  = models.DateTimeField(null=True, blank=True)
    is_active   = models.BooleanField(default=True)
    last_used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.owner.username}/{self.name} [{self.scope}]"


# ── ReplicationRule ───────────────────────────────────────────────────────────
class ReplicationRule(TimeStampedModel):
    """
    Cross-region replication rule for a repository.
    """
    id             = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    repository     = models.ForeignKey(ContainerRepository, on_delete=models.CASCADE, related_name='replication_rules')
    source_region  = models.CharField(max_length=32, choices=REGION_CHOICES)
    target_region  = models.CharField(max_length=32, choices=REGION_CHOICES)
    mode           = models.CharField(max_length=20, choices=REPLICATION_MODE_CHOICES, default='async')
    is_active      = models.BooleanField(default=True)
    last_triggered = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('repository', 'source_region', 'target_region')
        ordering        = ['-created_at']

    def __str__(self):
        return f"{self.repository} {self.source_region}→{self.target_region}"


# ── RegistryUsage ─────────────────────────────────────────────────────────────
class RegistryUsage(TimeStampedModel):
    """
    Usage snapshot for billing metering.
    """
    repository     = models.ForeignKey(ContainerRepository, on_delete=models.CASCADE, related_name='usage_records')
    storage_gb     = models.FloatField(default=0.0)
    pull_count     = models.PositiveIntegerField(default=0)
    push_count     = models.PositiveIntegerField(default=0)
    transfer_gb    = models.FloatField(default=0.0)
    hourly_cost_usd = models.DecimalField(max_digits=8, decimal_places=5, default=0.0)

    class Meta:
        ordering = ['-created_at']
