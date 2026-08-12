"""
Kubernetes Integration Models
──────────────────────────────
KubeConfig  → stores per-project cluster + git configuration
KubeSyncRun → audit trail for every apply/scan operation
"""

from django.db import models
from django.contrib.auth.models import User
from ..core.base_models import TimeStampedModel
import uuid


def _kube_id():
    return 'kube_' + uuid.uuid4().hex[:12]


def _sync_id():
    return 'ksync_' + uuid.uuid4().hex[:10]


# ─────────────────────────────────────────────────────────────────────────────
# KubeConfig
# ─────────────────────────────────────────────────────────────────────────────

class KubeConfig(TimeStampedModel):
    """
    Stores the Kubernetes + Git configuration for a project.
    One config per (project_id, environment).
    """

    PROVIDER_CHOICES = [
        ('github',    'GitHub'),
        ('gitlab',    'GitLab'),
        ('bitbucket', 'Bitbucket'),
        ('other',     'Other'),
    ]

    SYNC_STATUS_CHOICES = [
        ('never',    'Never synced'),
        ('pending',  'Pending'),
        ('scanning', 'Scanning'),
        ('syncing',  'Syncing'),
        ('success',  'Success'),
        ('failed',   'Failed'),
    ]

    ENV_CHOICES = [
        ('development', 'Development'),
        ('staging',     'Staging'),
        ('production',  'Production'),
    ]

    # Identity
    id          = models.CharField(max_length=60, primary_key=True, default=_kube_id, editable=False)
    owner       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='kube_configs')
    project_id  = models.CharField(max_length=60, db_index=True)
    project_name = models.CharField(max_length=150, blank=True)
    environment = models.CharField(max_length=30, choices=ENV_CHOICES, default='development')

    # Cluster
    cluster_id   = models.CharField(max_length=150, blank=True, help_text='Cluster identifier / context name')
    cluster_name = models.CharField(max_length=150, blank=True)
    namespace    = models.CharField(max_length=150, blank=True, help_text='Derived from project slug + env')

    # Git source
    git_provider = models.CharField(max_length=20, choices=PROVIDER_CHOICES, default='github')
    git_repo     = models.CharField(max_length=300, blank=True, help_text='owner/repo')
    git_branch   = models.CharField(max_length=150, default='main')
    git_path     = models.CharField(max_length=300, default='k8s/', help_text='Path inside repo to scan')

    # Sync state
    last_commit       = models.CharField(max_length=40, blank=True)
    last_sync_status  = models.CharField(max_length=20, choices=SYNC_STATUS_CHOICES, default='never')
    last_synced_at    = models.DateTimeField(null=True, blank=True)

    # CI/CD flags
    auto_apply = models.BooleanField(default=False, help_text='Apply without human confirmation (e.g. dev/staging)')

    # Governance
    governance_warnings = models.JSONField(default=list, help_text='Last governance warning list')

    class Meta:
        db_table = 'kube_configs'
        unique_together = ['project_id', 'environment']
        indexes = [models.Index(fields=['owner', 'project_id'])]

    def __str__(self):
        return f'{self.project_name} / {self.environment}'

    def derive_namespace(self):
        """Compute the enforced namespace for this config."""
        slug = self.project_name.lower().replace(' ', '-') if self.project_name else self.project_id
        return f'project-{slug}-{self.environment}'


# ─────────────────────────────────────────────────────────────────────────────
# KubeSyncRun
# ─────────────────────────────────────────────────────────────────────────────

class KubeSyncRun(TimeStampedModel):
    """
    Immutable audit record for every scan / apply operation.
    Never deleted — forms the compliance audit trail.
    """

    RUN_TYPE_CHOICES = [
        ('scan',     'Scan'),
        ('apply',    'Apply'),
        ('ci_scan',  'CI/CD Scan'),
        ('ci_apply', 'CI/CD Apply'),
    ]

    STATUS_CHOICES = [
        ('running',  'Running'),
        ('success',  'Success'),
        ('partial',  'Partial success'),
        ('failed',   'Failed'),
        ('cancelled','Cancelled'),
    ]

    id          = models.CharField(max_length=60, primary_key=True, default=_sync_id, editable=False)
    kube_config = models.ForeignKey(KubeConfig, on_delete=models.CASCADE, related_name='sync_runs')
    run_type    = models.CharField(max_length=20, choices=RUN_TYPE_CHOICES, default='apply')
    triggered_by = models.CharField(max_length=150, default='manual', help_text='username or "ci/cd"')

    # Git context
    commit_sha  = models.CharField(max_length=40, blank=True)
    branch      = models.CharField(max_length=150, blank=True)

    # What was processed
    files_selected  = models.JSONField(default=list, help_text='List of file paths user confirmed')
    files_applied   = models.JSONField(default=list, help_text='Files successfully applied')
    resources_created = models.JSONField(default=list, help_text='[{kind, name, namespace}]')

    # Governance findings
    governance_issues = models.JSONField(default=list)

    # Outcome
    status  = models.CharField(max_length=20, choices=STATUS_CHOICES, default='running')
    logs    = models.TextField(blank=True)
    error   = models.TextField(blank=True)

    # Timing
    started_at  = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'kube_sync_runs'
        ordering = ['-started_at']
        indexes  = [models.Index(fields=['kube_config', '-started_at'])]

    def __str__(self):
        return f'{self.run_type} @ {self.started_at:%Y-%m-%d %H:%M} [{self.status}]'
