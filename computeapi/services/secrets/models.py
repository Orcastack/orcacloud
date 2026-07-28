# OrcaCloud Secrets Vault – Models
# Secrets manager: storing, versioning, rotating, expiring secrets

import uuid
from django.db import models
from django.contrib.auth.models import User
from ..core.base_models import TimeStampedModel, ResourceModel


class Secret(ResourceModel):
    """A named secret (password, token, cert, etc.) with versioning."""

    SECRET_TYPE_CHOICES = [
        ('password',        'Password'),
        ('api_key',         'API Key'),
        ('database',        'Database Credentials'),
        ('tls_certificate', 'TLS Certificate'),
        ('ssh_key',         'SSH Key'),
        ('oauth_token',     'OAuth Token'),
        ('generic',         'Generic'),
    ]

    STATUS_CHOICES = [
        ('active',          'Active'),
        ('deprecated',      'Deprecated'),
        ('scheduled_delete','Scheduled for Deletion'),
        ('deleted',         'Deleted'),
    ]

    secret_id       = models.CharField(max_length=64, unique=True, db_index=True, editable=False)
    secret_type     = models.CharField(max_length=30, choices=SECRET_TYPE_CHOICES, default='generic')
    status          = models.CharField(max_length=30, choices=STATUS_CHOICES, default='active', db_index=True)
    kms_key_id      = models.CharField(max_length=64, blank=True, help_text="KMS key used to encrypt")
    rotation_enabled       = models.BooleanField(default=False)
    rotation_lambda_arn    = models.CharField(max_length=255, blank=True)
    rotation_days          = models.IntegerField(default=90)
    next_rotation_date     = models.DateField(null=True, blank=True)
    last_rotated_date      = models.DateField(null=True, blank=True)
    expiry_date            = models.DateTimeField(null=True, blank=True)
    deletion_scheduled_for = models.DateTimeField(null=True, blank=True)
    replication_regions    = models.JSONField(default=list)
    resource_policy        = models.JSONField(default=dict)
    last_accessed          = models.DateTimeField(null=True, blank=True)
    last_changed           = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Secret'
        verbose_name_plural = 'Secrets'
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.secret_id:
            self.secret_id = f'atnx-sec-{uuid.uuid4().hex[:12]}'
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.name} ({self.secret_type})'


class SecretVersion(TimeStampedModel):
    """A specific version of a secret's value (value is always encrypted at rest)."""

    STATUS_CHOICES = [
        ('current',    'Current (AWSCURRENT)'),
        ('previous',   'Previous (AWSPREVIOUS)'),
        ('pending',    'Pending (AWSPENDING)'),
        ('deprecated', 'Deprecated'),
    ]

    secret          = models.ForeignKey(Secret, on_delete=models.CASCADE, related_name='versions')
    version_id      = models.CharField(max_length=64, unique=True, editable=False)
    status          = models.CharField(max_length=20, choices=STATUS_CHOICES, default='current', db_index=True)
    # encrypted_value stored externally in KMS or vault backend – we store a reference
    value_cipher_ref = models.CharField(max_length=512, blank=True, help_text="Reference to encrypted value in vault backend")
    created_by      = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    rotation_triggered = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.version_id:
            self.version_id = uuid.uuid4().hex
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.secret.name} v{self.version_id[:8]}'


class SecretAccessLog(TimeStampedModel):
    """Audit log for secret access events."""

    ACTION_CHOICES = [
        ('get_value',    'Get Value'),
        ('put_value',    'Put Value'),
        ('rotate',       'Rotate'),
        ('delete',       'Delete'),
        ('restore',      'Restore'),
        ('describe',     'Describe'),
    ]

    secret      = models.ForeignKey(Secret, on_delete=models.CASCADE, related_name='access_logs')
    actor       = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    action      = models.CharField(max_length=30, choices=ACTION_CHOICES)
    outcome     = models.CharField(max_length=20, default='success')
    actor_ip    = models.GenericIPAddressField(null=True, blank=True)
    region      = models.CharField(max_length=64, blank=True)
    application = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['secret', 'created_at']),
        ]

    def __str__(self):
        return f'{self.secret.name} {self.action} by {self.actor}'
