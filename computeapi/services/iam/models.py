# OrcaCloud IAM Service – Models
# Identity, Access Management: Users, Groups, Roles, Policies, Keys, MFA, Audit

import uuid
from django.db import models
from django.contrib.auth.models import User
from ..core.base_models import TimeStampedModel, ResourceModel


# ── IAM Group ─────────────────────────────────────────────────────────────────

class IAMGroup(ResourceModel):
    """Logical grouping of IAM users sharing policies."""
    name = models.CharField(max_length=255, unique=True, db_index=True)
    members = models.ManyToManyField(User, related_name='iam_groups', blank=True)
    policies = models.JSONField(default=list, help_text="List of attached policy IDs")
    member_count = models.IntegerField(default=0)

    class Meta:
        verbose_name = 'IAM Group'
        verbose_name_plural = 'IAM Groups'
        ordering = ['name']

    def __str__(self):
        return self.name


# ── IAM Role ──────────────────────────────────────────────────────────────────

class IAMRole(ResourceModel):
    """Assumable role with permission policies attached."""

    TRUST_PRINCIPAL_CHOICES = [
        ('user',       'IAM User'),
        ('service',    'AWS-like Service Principal'),
        ('federated',  'Federated Identity'),
        ('cross_account', 'Cross-Account'),
    ]

    trust_principal_type = models.CharField(
        max_length=32, choices=TRUST_PRINCIPAL_CHOICES, default='user'
    )
    trust_policy = models.JSONField(default=dict, help_text="Trust relationship policy document")
    permission_policies = models.JSONField(default=list, help_text="Attached permission policy IDs")
    max_session_duration_hours = models.IntegerField(default=1)
    is_service_role = models.BooleanField(default=False)
    last_used = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'IAM Role'
        verbose_name_plural = 'IAM Roles'
        ordering = ['name']

    def __str__(self):
        return self.name


# ── IAM Policy ───────────────────────────────────────────────────────────────

class IAMPolicy(ResourceModel):
    """JSON/YAML permission policy document."""

    POLICY_TYPE_CHOICES = [
        ('managed',  'Managed Policy'),
        ('inline',   'Inline Policy'),
        ('service',  'Service Control Policy'),
    ]

    policy_type     = models.CharField(max_length=20, choices=POLICY_TYPE_CHOICES, default='managed')
    policy_document = models.JSONField(help_text="Policy document (JSON)")
    version         = models.CharField(max_length=16, default='2024-10-17')
    is_atonix_managed = models.BooleanField(default=False, help_text="Managed by OrcaCloud")
    attachment_count  = models.IntegerField(default=0)

    class Meta:
        verbose_name = 'IAM Policy'
        verbose_name_plural = 'IAM Policies'
        ordering = ['-created_at']

    def __str__(self):
        return self.name


# ── Access Key ────────────────────────────────────────────────────────────────

class AccessKey(TimeStampedModel):
    """Programmatic access key for a user."""

    STATUS_CHOICES = [
        ('active',   'Active'),
        ('inactive', 'Inactive'),
        ('deleted',  'Deleted'),
    ]

    key_id       = models.CharField(max_length=64, unique=True, db_index=True, editable=False)
    owner        = models.ForeignKey(User, on_delete=models.CASCADE, related_name='access_keys')
    secret_hash  = models.CharField(max_length=255, help_text="Bcrypt hash – never store plaintext")
    status       = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active', db_index=True)
    last_used    = models.DateTimeField(null=True, blank=True)
    last_used_region    = models.CharField(max_length=64, blank=True)
    last_used_service   = models.CharField(max_length=64, blank=True)
    created_from_ip     = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.key_id:
            self.key_id = f'AK{uuid.uuid4().hex[:18].upper()}'
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.key_id} ({self.owner})'


# ── MFA Device ───────────────────────────────────────────────────────────────

class MFADevice(TimeStampedModel):
    """TOTP/FIDO2 MFA device registered to a user."""

    DEVICE_TYPE_CHOICES = [
        ('totp',    'Authenticator App (TOTP)'),
        ('fido2',   'Security Key (FIDO2/WebAuthn)'),
        ('sms',     'SMS'),
        ('email',   'Email OTP'),
    ]

    owner       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='mfa_devices')
    device_type = models.CharField(max_length=20, choices=DEVICE_TYPE_CHOICES, default='totp')
    device_name = models.CharField(max_length=100)
    is_active   = models.BooleanField(default=True, db_index=True)
    last_used   = models.DateTimeField(null=True, blank=True)
    serial      = models.CharField(max_length=255, blank=True, help_text="Device serial / credential_id (FIDO2)")

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.owner} – {self.device_name} ({self.device_type})'


# ── IAM User Profile (extends Django User) ────────────────────────────────────

class IAMUserProfile(TimeStampedModel):
    """Extended IAM profile linked to Django user."""

    user        = models.OneToOneField(User, on_delete=models.CASCADE, related_name='iam_profile')
    console_access = models.BooleanField(default=True)
    programmatic_access = models.BooleanField(default=True)
    mfa_enforced = models.BooleanField(default=False)
    mfa_enabled  = models.BooleanField(default=False)
    password_last_changed = models.DateTimeField(null=True, blank=True)
    password_never_expires = models.BooleanField(default=False)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    groups_list   = models.ManyToManyField(IAMGroup, related_name='user_profiles', blank=True)

    class Meta:
        verbose_name = 'IAM User Profile'

    def __str__(self):
        return f'IAM({self.user})'


# ── Audit Log ─────────────────────────────────────────────────────────────────

class IAMAuditLog(TimeStampedModel):
    """Immutable audit trail for all API and console actions."""

    SOURCE_CHOICES = [
        ('console', 'Web Console'),
        ('api',     'API Call'),
        ('cli',     'CLI'),
        ('service', 'Service'),
    ]

    OUTCOME_CHOICES = [
        ('success', 'Success'),
        ('failure', 'Failure'),
        ('denied',  'Denied'),
    ]

    event_id      = models.UUIDField(default=uuid.uuid4, unique=True, editable=False, db_index=True)
    actor         = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='audit_logs')
    actor_ip      = models.GenericIPAddressField(null=True, blank=True)
    actor_arn     = models.CharField(max_length=255, blank=True, help_text="Assumed role ARN or user ARN")
    source        = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='api')
    event_type    = models.CharField(max_length=128, db_index=True, help_text="e.g. iam.CreateUser")
    resource_type = models.CharField(max_length=64, blank=True)
    resource_id   = models.CharField(max_length=128, blank=True)
    region        = models.CharField(max_length=64, blank=True)
    outcome       = models.CharField(max_length=20, choices=OUTCOME_CHOICES, default='success', db_index=True)
    request_params = models.JSONField(default=dict)
    response_code  = models.IntegerField(null=True, blank=True)
    error_message  = models.TextField(blank=True)
    user_agent     = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['actor', 'created_at']),
            models.Index(fields=['event_type', 'created_at']),
            models.Index(fields=['outcome', 'created_at']),
        ]

    def __str__(self):
        return f'{self.event_type} by {self.actor} – {self.outcome}'
