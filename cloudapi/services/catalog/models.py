"""
OrcaCloud Service Catalog Models.

Defines the authoritative list of services available per cloud type
(public / private / hybrid).  Consumed by the dashboard, provisioning
API, and WorkspaceBinding enforcement.
"""
import uuid

from django.db import models

from ..core.base_models import TimeStampedModel


# ---------------------------------------------------------------------------
# Choices
# ---------------------------------------------------------------------------

CLOUD_TYPE_CHOICES = [
    ("public",  "Public Cloud"),
    ("private", "Private Cloud"),
    ("hybrid",  "Hybrid Cloud"),
]

SERVICE_CATEGORY_CHOICES = [
    ("compute",       "Compute"),
    ("storage",       "Storage"),
    ("networking",    "Networking"),
    ("identity",      "Identity & Access"),
    ("orchestration", "Orchestration"),
    ("security",      "Security"),
    ("monitoring",    "Monitoring & Telemetry"),
    ("dns",           "DNS & Load Balancing"),
    ("object",        "Object Storage"),
    ("database",      "Database"),
    ("container",     "Container / Kubernetes"),
]

OPENSTACK_SERVICE_MAP = {
    "keystone":    "Identity & Access",
    "nova":        "Compute",
    "neutron":     "Networking",
    "cinder":      "Storage",
    "glance":      "Image Registry",
    "swift":       "Object Storage",
    "octavia":     "Load Balancing",
    "designate":   "DNS Automation",
    "barbican":    "Secrets Management",
    "heat":        "Orchestration",
    "mistral":     "Workflow Automation",
    "ceilometer":  "Metering",
    "gnocchi":     "Time-Series Storage",
    "aodh":        "Alarming",
    "ironic":      "Bare Metal",
    "magnum":      "Container Orchestration",
    "trove":       "Database Service",
}


# ---------------------------------------------------------------------------
# ServiceCatalogEntry
# ---------------------------------------------------------------------------

class ServiceCatalogEntry(TimeStampedModel):
    """
    A single service available within a specific cloud type.

    Multiple entries for the same service_slug can exist across cloud types
    (public, private, hybrid) with different availability and metadata.

    Seeded by ./management/commands/seed_service_catalog.py
    """

    id               = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cloud_type       = models.CharField(max_length=16, choices=CLOUD_TYPE_CHOICES, db_index=True)
    service_slug     = models.CharField(
        max_length=64, db_index=True,
        help_text="Short machine-readable key, e.g. nova, cinder, barbican",
    )
    display_name     = models.CharField(max_length=128)
    category         = models.CharField(max_length=32, choices=SERVICE_CATEGORY_CHOICES, default="compute")
    openstack_service = models.CharField(
        max_length=64, blank=True,
        help_text="Underlying OpenStack project name (nova, neutron, …)",
    )
    description      = models.TextField(blank=True)
    is_enabled       = models.BooleanField(default=True, db_index=True)
    is_preview       = models.BooleanField(default=False, help_text="Feature-flagged / beta service")
    is_billable      = models.BooleanField(default=True)
    # UI / docs
    icon_url         = models.URLField(blank=True)
    docs_url         = models.URLField(blank=True)
    # Per-cloud constraints / defaults stored as JSON
    constraints      = models.JSONField(
        default=dict,
        blank=True,
        help_text=(
            "Optional limits/defaults, e.g. "
            '{"max_vcpus": 256, "allowed_regions": ["RegionA"]}'
        ),
    )

    class Meta:
        ordering = ["cloud_type", "category", "service_slug"]
        unique_together = [("cloud_type", "service_slug")]
        verbose_name = "Service Catalog Entry"
        verbose_name_plural = "Service Catalog Entries"

    def __str__(self):
        return f"{self.display_name} [{self.cloud_type}]"


# ---------------------------------------------------------------------------
# ServiceCatalogPolicy
# ---------------------------------------------------------------------------

class ServiceCatalogPolicy(TimeStampedModel):
    """
    Workspace-level override: enable or disable a catalogued service
    for a specific workspace independent of the global catalog entry.

    Evaluated at provisioning time:
      1. If a policy exists → honour policy.is_allowed
      2. Else              → fall back to ServiceCatalogEntry.is_enabled
    """

    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace   = models.ForeignKey(
        "workspace.Workspace",
        on_delete=models.CASCADE,
        related_name="catalog_policies",
    )
    entry       = models.ForeignKey(
        ServiceCatalogEntry,
        on_delete=models.CASCADE,
        related_name="workspace_policies",
    )
    is_allowed  = models.BooleanField(default=True)
    reason      = models.CharField(max_length=255, blank=True)

    class Meta:
        unique_together = [("workspace", "entry")]
        ordering = ["workspace", "entry"]
        verbose_name = "Service Catalog Policy"

    def __str__(self):
        allowed = "ALLOW" if self.is_allowed else "DENY"
        return f"{allowed}: {self.workspace} → {self.entry}"
