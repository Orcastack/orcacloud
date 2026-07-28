# OrcaCloud – Workspace Models
#
# A Workspace is an isolated unit of cloud resources belonging to a team/project.
# Each Workspace maps to exactly one OpenStack project per environment.
#
# Diagram:
#   Workspace (devops, finance, sandbox)
#       └─ WorkspaceBinding (staging → devops-project-staging)
#       └─ WorkspaceBinding (prod    → devops-project-prod)

from django.db import models
from django.contrib.auth import get_user_model
from ..core.base_models import ResourceContextMixin

User = get_user_model()


class Workspace(models.Model):
    """Top-level organisational unit.  Every resource belongs to a Workspace."""

    ENVIRONMENT_CHOICES = [
        ("dev",        "Development"),
        ("staging",    "Staging"),
        ("prod",       "Production"),
    ]

    # Slug-style identifier used in resource names and API payloads
    workspace_id   = models.SlugField(max_length=64, unique=True)
    display_name   = models.CharField(max_length=128)
    description    = models.TextField(blank=True)
    owner          = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="owned_workspaces")
    members        = models.ManyToManyField(User, blank=True, related_name="workspaces")
    created_at     = models.DateTimeField(auto_now_add=True)
    updated_at     = models.DateTimeField(auto_now=True)
    is_active      = models.BooleanField(default=True)

    class Meta:
        ordering = ["workspace_id"]

    def __str__(self):
        return self.workspace_id


class WorkspaceBinding(models.Model):
    """
    Maps a Workspace + Environment → OpenStack project credentials.

    The backend resolves the correct OpenStack project from this table
    for every provisioning request.

    Fields:
        workspace          – FK to Workspace
        environment        – dev / staging / prod
        cloud_type         – public / private / hybrid  (drives service catalog)
        openstack_project  – OpenStack project name (used as OS_PROJECT_NAME)
        openstack_region   – OpenStack region (default: RegionOne)
        quota_vcpus        – max vCPUs allowed in this workspace/environment
        quota_ram_gb       – max RAM (GB) allowed
        quota_storage_gb   – max block storage (GB) allowed
    """

    CLOUD_TYPE_CHOICES = [
        ("public",  "Public Cloud"),
        ("private", "Private Cloud"),
        ("hybrid",  "Hybrid Cloud"),
    ]

    workspace          = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name="bindings")
    environment        = models.CharField(max_length=16, choices=Workspace.ENVIRONMENT_CHOICES)
    cloud_type         = models.CharField(
        max_length=16, choices=CLOUD_TYPE_CHOICES, default="public", db_index=True,
        help_text="Determines which service catalog entries are available for this binding.",
    )
    openstack_project  = models.CharField(max_length=128, help_text="OpenStack project/tenant name")
    openstack_region   = models.CharField(max_length=64, default="RegionOne")
    quota_vcpus        = models.PositiveIntegerField(default=20)
    quota_ram_gb       = models.PositiveIntegerField(default=100)
    quota_storage_gb   = models.PositiveIntegerField(default=500)
    created_at         = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("workspace", "environment")]
        ordering        = ["workspace", "environment"]

    def __str__(self):
        return f"{self.workspace.workspace_id} [{self.environment}] → {self.openstack_project}"


class ProvisionedResource(models.Model):
    """
    Audit log of every resource the backend creates in OpenStack.
    Provides the source-of-truth for workspace resource inventory.
    """

    RESOURCE_TYPES = [
        ("vm",        "Virtual Machine"),
        ("volume",    "Block Storage Volume"),
        ("network",   "Network"),
        ("subnet",    "Subnet"),
        ("snapshot",  "Snapshot"),
        ("floating_ip", "Floating IP"),
        ("k8s_cluster", "Kubernetes Cluster"),
    ]

    STATUS_CHOICES = [
        ("creating",  "Creating"),
        ("active",    "Active"),
        ("error",     "Error"),
        ("deleting",  "Deleting"),
        ("deleted",   "Deleted"),
    ]

    workspace         = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name="resources")
    environment       = models.CharField(max_length=16)
    resource_type     = models.CharField(max_length=32, choices=RESOURCE_TYPES)
    resource_id       = models.CharField(max_length=255, help_text="OpenStack resource UUID")
    resource_name     = models.CharField(max_length=255)
    openstack_project = models.CharField(max_length=128)
    region            = models.CharField(max_length=64, default="RegionOne")
    status            = models.CharField(max_length=16, choices=STATUS_CHOICES, default="creating")
    metadata          = models.JSONField(default=dict, blank=True)
    created_by        = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at        = models.DateTimeField(auto_now_add=True)
    updated_at        = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes  = [
            models.Index(fields=["workspace", "environment"]),
            models.Index(fields=["resource_type"]),
            models.Index(fields=["resource_id"]),
        ]

    def __str__(self):
        return f"{self.resource_type}:{self.resource_name} ({self.workspace.workspace_id}/{self.environment})"


# ---------------------------------------------------------------------------
# Developer Workspace (browser terminal + web IDE)
# ---------------------------------------------------------------------------

class DevWorkspace(models.Model):
    """
    Represents a personal developer workspace with a browser-accessible
    terminal (WebSocket) and optional web IDE.

    This is separate from the cloud-resource Workspace model above; a DevWorkspace
    is an ephemeral container-based dev environment that a user can start/stop on
    demand from the dashboard.
    """

    STATUS_CHOICES = [
        ('stopped',  'Stopped'),
        ('starting', 'Starting'),
        ('running',  'Running'),
        ('stopping', 'Stopping'),
        ('error',    'Error'),
    ]

    workspace_id  = models.SlugField(max_length=64, unique=True)
    display_name  = models.CharField(max_length=128)
    owner         = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='dev_workspaces'
    )
    status        = models.CharField(max_length=16, choices=STATUS_CHOICES, default='stopped')
    region        = models.CharField(max_length=64, default='us-east-1')
    image         = models.CharField(max_length=200, default='atonix/devbox:22.04-lts')
    ide           = models.CharField(max_length=100, default='VS Code')
    # Set by the backend when the workspace starts; cleared on stop
    editor_url    = models.URLField(blank=True, default='')
    # Live metrics (updated periodically while running)
    cpu_percent   = models.PositiveSmallIntegerField(default=0)
    ram_percent   = models.PositiveSmallIntegerField(default=0)
    containers    = models.PositiveSmallIntegerField(default=0)
    volumes       = models.PositiveSmallIntegerField(default=0)
    started_at    = models.DateTimeField(null=True, blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)

    # ── Provisioning plan (set during creation wizard) ────────────────────────
    # Compute
    vcpus            = models.PositiveSmallIntegerField(default=2,
        help_text='Number of virtual CPUs to reserve.')
    ram_gb           = models.PositiveSmallIntegerField(default=4,
        help_text='RAM in GB to reserve.')
    gpu_enabled      = models.BooleanField(default=False,
        help_text='Whether a GPU accelerator is requested.')

    # Storage
    STORAGE_TYPE_CHOICES = [
        ('standard',  'Standard SSD'),
        ('high-iops', 'High-IOPS SSD'),
    ]
    BACKUP_POLICY_CHOICES = [
        ('none',   'No Backup'),
        ('daily',  'Daily Backup'),
        ('weekly', 'Weekly Backup'),
    ]
    storage_type     = models.CharField(max_length=16, choices=STORAGE_TYPE_CHOICES, default='standard')
    storage_gb       = models.PositiveIntegerField(default=20,
        help_text='Block storage size in GB.')
    backup_policy    = models.CharField(max_length=16, choices=BACKUP_POLICY_CHOICES, default='none')

    # Network
    FIREWALL_PROFILE_CHOICES = [
        ('default', 'Default (web-server)'),
        ('strict',  'Strict (no inbound)'),
        ('open',    'Open (all)'),
        ('custom',  'Custom'),
    ]
    vpc_name         = models.CharField(max_length=128, blank=True, default='',
        help_text='VPC to attach the workspace to.')
    subnet_name      = models.CharField(max_length=128, blank=True, default='',
        help_text='Subnet inside the VPC.')
    firewall_profile = models.CharField(max_length=16, choices=FIREWALL_PROFILE_CHOICES, default='default')
    public_ip        = models.BooleanField(default=False,
        help_text='Whether a floating / public IP should be assigned.')

    # Container runtime
    CONTAINER_RUNTIME_CHOICES = [
        ('docker',     'Docker'),
        ('podman',     'Podman'),
        ('kubernetes', 'Kubernetes Pod'),
    ]
    container_runtime  = models.CharField(
        max_length=32, choices=CONTAINER_RUNTIME_CHOICES, default='docker')
    container_template = models.CharField(max_length=64, blank=True, default='',
        help_text='Template image family (node, python, go, php, java, etc.)')

    # Domain binding (optional)
    domain           = models.CharField(max_length=253, blank=True, default='',
        help_text='Optional custom domain or auto-generated subdomain for this workspace.')

    # ── Unified setup connections ─────────────────────────────────────────────
    # Stores IDs / slugs of resources attached via the Setup Wizard.
    # Kept as plain char fields for portability (no hard FK across apps).
    connected_project_id   = models.CharField(max_length=64, blank=True, default='',
        help_text='Project ID / key connected to this workspace.')
    connected_project_name = models.CharField(max_length=200, blank=True, default='')
    connected_env_id       = models.CharField(max_length=64, blank=True, default='',
        help_text='Environment ID connected to this workspace.')
    connected_env_name     = models.CharField(max_length=200, blank=True, default='')
    connected_group_id     = models.CharField(max_length=64, blank=True, default='')
    connected_group_name   = models.CharField(max_length=200, blank=True, default='')
    connected_container_ids = models.JSONField(default=list, blank=True,
        help_text='List of container IDs attached to this workspace.')
    # Pipeline tracking (populated when a pipeline is triggered from this workspace)
    pipeline_last_run      = models.DateTimeField(null=True, blank=True)
    pipeline_last_success  = models.DateTimeField(null=True, blank=True)
    pipeline_last_failure  = models.DateTimeField(null=True, blank=True)
    pipeline_last_status   = models.CharField(max_length=32, blank=True, default='')
    # Flexible extra metadata supplied by setup wizard
    setup_metadata         = models.JSONField(default=dict, blank=True)

    # ── Resource origin context (context-aware architecture) ─────────────────
    # These four fields drive dashboard visibility, navigation, and governance.
    # See ResourceContextMixin in services/core/base_models.py for full docs.
    ROLE_CHOICES = [
        ('enterprise', 'Enterprise'),
        ('developer',  'Developer'),
    ]
    DASHBOARD_CHOICES = [
        ('enterprise', 'Enterprise Dashboard'),
        ('developer',  'Developer Dashboard'),
        ('group',      'Group Dashboard'),
    ]
    created_by_role = models.CharField(
        max_length=20, choices=ROLE_CHOICES, default='developer',
        db_index=True,
        help_text='Role of the user who created this workspace.',
    )
    created_from_dashboard = models.CharField(
        max_length=20, choices=DASHBOARD_CHOICES, default='developer',
        db_index=True,
        help_text='Dashboard context in which this workspace was created.',
    )
    parent_context_id = models.CharField(
        max_length=100, blank=True, default='',
        db_index=True,
        help_text='Owning entity ID: enterprise org id, group id, or empty for personal.',
    )
    return_path = models.CharField(
        max_length=500, blank=True, default='',
        help_text='Frontend URL the user navigates back to from this workspace.',
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"DevWorkspace({self.workspace_id}, {self.status})"

    @property
    def terminal_ws_url(self) -> str:
        """WebSocket path clients connect to for the interactive terminal."""
        return f'/ws/workspace/{self.workspace_id}/terminal/'
