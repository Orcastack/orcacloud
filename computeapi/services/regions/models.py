"""
OrcaCloud Multi-Region models.

Provides a queryable registry of cloud regions and availability zones,
with failover pairing and per-region service endpoint tracking.
"""
import uuid
from django.db import models

from ..core.base_models import TimeStampedModel


# ---------------------------------------------------------------------------
# Choices
# ---------------------------------------------------------------------------

REGION_STATUS_CHOICES = [
    ('active',       'Active'),
    ('degraded',     'Degraded'),
    ('maintenance',  'Maintenance'),
    ('unavailable',  'Unavailable'),
]

FAILOVER_MODE_CHOICES = [
    ('active-active',  'Active–Active'),
    ('active-passive', 'Active–Passive'),
    ('cold-standby',   'Cold Standby'),
]

ZONE_STATUS_CHOICES = [
    ('available',    'Available'),
    ('impaired',     'Impaired'),
    ('unavailable',  'Unavailable'),
]


# ---------------------------------------------------------------------------
# CloudRegion
# ---------------------------------------------------------------------------

class CloudRegion(TimeStampedModel):
    """
    A distinct geographic region offered by the platform.
    Data is seeded via the ``0001_initial`` migration and can be
    extended dynamically through the API.
    """
    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code         = models.CharField(max_length=32, unique=True, db_index=True,
                                    help_text='Short unique code, e.g. us-east-1')
    name         = models.CharField(max_length=128, help_text='Human-readable name')
    country      = models.CharField(max_length=64, blank=True)
    city         = models.CharField(max_length=64, blank=True)
    continent    = models.CharField(max_length=32, blank=True)
    latitude     = models.FloatField(null=True, blank=True)
    longitude    = models.FloatField(null=True, blank=True)
    status       = models.CharField(max_length=20, choices=REGION_STATUS_CHOICES, default='active', db_index=True)
    is_default   = models.BooleanField(default=False,
                                       help_text='Whether this is the default region for new resources')
    # Availability stats (updated periodically by a background task)
    uptime_30d_pct  = models.FloatField(default=100.0)
    latency_ms      = models.FloatField(null=True, blank=True,
                                        help_text='Average inter-region latency observed from this region')
    # Services enabled in this region (JSON array of service slugs)
    enabled_services = models.JSONField(default=list,
                                        help_text='e.g. ["compute","storage","database","kubernetes"]')
    # API endpoint for this region
    api_endpoint  = models.URLField(blank=True)

    class Meta:
        ordering = ['continent', 'code']
        verbose_name = 'Cloud Region'

    def __str__(self):
        return f"{self.code} ({self.name})"


# ---------------------------------------------------------------------------
# AvailabilityZone
# ---------------------------------------------------------------------------

class AvailabilityZone(TimeStampedModel):
    """
    An isolated fault domain within a CloudRegion.
    """
    id      = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    region  = models.ForeignKey(CloudRegion, on_delete=models.CASCADE, related_name='zones')
    code    = models.CharField(max_length=8, help_text='e.g. a, b, c')
    name    = models.CharField(max_length=64, help_text='e.g. us-east-1a')
    status  = models.CharField(max_length=20, choices=ZONE_STATUS_CHOICES, default='available')

    class Meta:
        ordering = ['region__code', 'code']
        unique_together = ('region', 'code')
        verbose_name = 'Availability Zone'

    def __str__(self):
        return self.name if self.name else f"{self.region.code}{self.code}"


# ---------------------------------------------------------------------------
# RegionPeer
# ---------------------------------------------------------------------------

class RegionPeer(TimeStampedModel):
    """
    A directional failover relationship between two CloudRegions.

    ``primary`` fails over to ``secondary`` when the primary enters a
    degraded / unavailable state.
    """
    id               = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    primary          = models.ForeignKey(CloudRegion, on_delete=models.CASCADE,
                                         related_name='failover_pairs_as_primary')
    secondary        = models.ForeignKey(CloudRegion, on_delete=models.CASCADE,
                                         related_name='failover_pairs_as_secondary')
    mode             = models.CharField(max_length=20, choices=FAILOVER_MODE_CHOICES, default='active-passive')
    rto_minutes      = models.PositiveIntegerField(default=15,
                                                   help_text='Recovery Time Objective in minutes')
    rpo_minutes      = models.PositiveIntegerField(default=5,
                                                   help_text='Recovery Point Objective in minutes')
    is_active        = models.BooleanField(default=True)
    last_tested_at   = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ('primary', 'secondary')
        verbose_name = 'Region Peer'

    def __str__(self):
        return f"{self.primary.code} → {self.secondary.code} [{self.mode}]"
