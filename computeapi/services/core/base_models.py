# OrcaCloud Backend - Base Models and Utilities

from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
import uuid
import json

# ============================================================================
# BASE MODELS & MIXINS
# ============================================================================

class TimeStampedModel(models.Model):
    """Base model with created_at and updated_at timestamps."""
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class ResourceContextMixin(models.Model):
    """
    Mixin that records *where* and *by whom* a resource was created.

    This is the foundation of the context-aware architecture:

        created_by_role         — the user's active role at creation time
                                  ('enterprise' | 'developer')
        created_from_dashboard  — which dashboard triggered the creation
                                  ('enterprise' | 'developer' | 'group')
        parent_context_id       — the owning entity's ID
                                  (enterprise org id, group id, or '')
        return_path             — full frontend URL the user navigates back to
                                  e.g. '/enterprise/acme/workspace/developer/workspace'

    Visibility rules enforced at the viewset layer:
        • developer dashboard  → filter created_from_dashboard='developer'
        • enterprise dashboard → filter created_from_dashboard='enterprise'
                                   AND parent_context_id=<org_id>
        • group context        → filter created_from_dashboard='group'
                                   AND parent_context_id=<group_id>
    """
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
        help_text='Role of the user who created this resource.',
    )
    created_from_dashboard = models.CharField(
        max_length=20, choices=DASHBOARD_CHOICES, default='developer',
        db_index=True,
        help_text='Dashboard context in which this resource was created.',
    )
    parent_context_id = models.CharField(
        max_length=100, blank=True, default='',
        db_index=True,
        help_text='ID of the owning entity: enterprise org id, group id, or empty for personal.',
    )
    return_path = models.CharField(
        max_length=500, blank=True, default='',
        help_text='Frontend URL the user returns to after viewing this resource.',
    )

    class Meta:
        abstract = True


class ResourceModel(TimeStampedModel):
    """Base model for cloud resources."""
    resource_id = models.CharField(
        max_length=64,
        unique=True,
        db_index=True,
        editable=False
    )
    name = models.CharField(max_length=255, db_index=True)
    description = models.TextField(blank=True, null=True)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='%(class)s_owned')
    tags = models.JSONField(default=dict, help_text="Key-value tags for resource")
    metadata = models.JSONField(default=dict, help_text="Additional metadata")

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        """Generate resource_id if not set."""
        if not self.resource_id:
            self.resource_id = self.generate_resource_id()
        super().save(*args, **kwargs)

    @staticmethod
    def generate_resource_id(prefix='res'):
        """Generate unique resource ID."""
        return f"{prefix}-{uuid.uuid4().hex[:12]}"


class Status(models.TextChoices):
    """Common status choices for resources."""
    PENDING = 'pending', 'Pending'
    CREATING = 'creating', 'Creating'
    RUNNING = 'running', 'Running'
    STOPPING = 'stopping', 'Stopping'
    STOPPED = 'stopped', 'Stopped'
    TERMINATING = 'terminating', 'Terminating'
    TERMINATED = 'terminated', 'Terminated'
    ERROR = 'error', 'Error'
    FAILED = 'failed', 'Failed'


# ============================================================================
# AUDIT & LOGGING MODELS
# ============================================================================

class AuditLog(TimeStampedModel):
    """Log all resource changes for compliance and debugging."""
    ACTION_CHOICES = [
        ('create', 'Create'),
        ('update', 'Update'),
        ('delete', 'Delete'),
        ('start', 'Start'),
        ('stop', 'Stop'),
        ('restart', 'Restart'),
        ('scale', 'Scale'),
        ('error', 'Error'),
    ]

    audit_id = models.CharField(max_length=64, unique=True)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    resource_type = models.CharField(max_length=100, db_index=True)
    resource_id = models.CharField(max_length=64, db_index=True)
    resource_name = models.CharField(max_length=255, blank=True)
    status = models.CharField(
        max_length=20,
        choices=[('success', 'Success'), ('failure', 'Failure')],
        default='success'
    )
    details = models.JSONField(default=dict)
    error_message = models.TextField(blank=True)
    source_ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'action']),
            models.Index(fields=['resource_type', 'resource_id']),
        ]

    def save(self, *args, **kwargs):
        if not self.audit_id:
            self.audit_id = f"audit-{uuid.uuid4().hex[:12]}"
        super().save(*args, **kwargs)

    @classmethod
    def log_action(cls, user, action, resource_type, resource_id, resource_name='',
                   status='success', details=None, error_message='', source_ip=''):
        """Convenience method to create audit log."""
        return cls.objects.create(
            user=user,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            resource_name=resource_name,
            status=status,
            details=details or {},
            error_message=error_message,
            source_ip=source_ip,
        )


class ResourceTag(models.Model):
    """Tagging system for resources."""
    key = models.CharField(max_length=100, db_index=True)
    value = models.CharField(max_length=255)
    resource_type = models.CharField(max_length=100, db_index=True)
    resource_id = models.CharField(max_length=64, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('resource_type', 'resource_id', 'key')
        indexes = [
            models.Index(fields=['key', 'value']),
            models.Index(fields=['resource_type', 'resource_id']),
        ]

# ============================================================================
# QUOTAS & LIMITS
# ============================================================================

class ResourceQuota(models.Model):
    """Track quotas and usage limits per user."""
    RESOURCE_TYPES = [
        ('instances', 'Virtual Machine Instances'),
        ('volumes', 'Storage Volumes'),
        ('buckets', 'Storage Buckets'),
        ('networks', 'Virtual Networks'),
        ('functions', 'Serverless Functions'),
        ('cpus', 'CPU Cores'),
        ('memory_gb', 'Memory (GB)'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='resource_quota')
    resource_type = models.CharField(max_length=100)
    limit = models.IntegerField()
    used = models.IntegerField(default=0, db_index=True)
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'resource_type')

    @property
    def available(self):
        return self.limit - self.used

    @property
    def usage_percentage(self):
        if self.limit == 0:
            return 0
        return (self.used / self.limit) * 100

    def is_available(self, amount=1):
        """Check if quota is available for the requested amount."""
        return self.available >= amount


# ============================================================================
# NOTIFICATIONS & ALERTS
# ============================================================================

class Alert(TimeStampedModel):
    """System alerts and notifications."""
    SEVERITY_CHOICES = [
        ('info', 'Info'),
        ('warning', 'Warning'),
        ('critical', 'Critical'),
    ]

    alert_id = models.CharField(max_length=64, unique=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='alerts')
    title = models.CharField(max_length=255)
    message = models.TextField()
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='info')
    resource_type = models.CharField(max_length=100, blank=True)
    resource_id = models.CharField(max_length=64, blank=True)
    is_read = models.BooleanField(default=False, db_index=True)
    metadata = models.JSONField(default=dict)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.alert_id:
            self.alert_id = f"alert-{uuid.uuid4().hex[:12]}"
        super().save(*args, **kwargs)


# ============================================================================
# USER PROFILE
# ============================================================================

class UserProfile(models.Model):
    """Extended user profile with quota limits and preferences."""
    user = models.OneToOneField(
        User, on_delete=models.CASCADE,
        related_name='userprofile',
    )
    max_instances = models.IntegerField(default=10)
    max_volumes = models.IntegerField(default=20)
    max_storage_gb = models.IntegerField(default=1000)
    max_networks = models.IntegerField(default=5)
    max_functions = models.IntegerField(default=50)
    company = models.CharField(max_length=255, blank=True, default='')
    timezone = models.CharField(max_length=64, default='UTC')
    notifications_enabled = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Profile for {self.user.username}"

    class Meta:
        verbose_name = 'User Profile'
        verbose_name_plural = 'User Profiles'


# ============================================================================
# USER API KEY (plain key storage)
# ============================================================================

class UserAPIKey(models.Model):
    """
    Per-user API keys for programmatic authentication.
    The raw key is stored (use TLS in production); prefix is cosmetic.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='api_key_set')
    name = models.CharField(max_length=255, default='default')
    key = models.CharField(max_length=64, unique=True, editable=False)
    key_prefix = models.CharField(max_length=32, default='atonix_')
    is_active = models.BooleanField(default=True, db_index=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    scopes = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.key:
            self.key = f"{self.key_prefix}{uuid.uuid4().hex}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.user.username})"

    class Meta:
        ordering = ['-created_at']
