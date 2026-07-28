# OrcaCloud KMS Service – Models
# Key Management: encryption keys, key rotations, usage audit

import uuid
from django.db import models
from django.contrib.auth.models import User
from ..core.base_models import TimeStampedModel, ResourceModel


class KMSEncryptionKey(ResourceModel):
    """Customer-managed encryption key (CMK)."""

    KEY_TYPE_CHOICES = [
        ('symmetric',   'Symmetric (AES-256)'),
        ('asymmetric',  'Asymmetric (RSA-4096)'),
        ('hmac',        'HMAC'),
    ]

    KEY_USAGE_CHOICES = [
        ('encrypt_decrypt',     'Encrypt / Decrypt'),
        ('sign_verify',         'Sign / Verify'),
        ('generate_mac_verify', 'Generate & Verify MAC'),
    ]

    STATUS_CHOICES = [
        ('enabled',            'Enabled'),
        ('disabled',           'Disabled'),
        ('pending_deletion',   'Pending Deletion'),
        ('pending_import',     'Pending Import'),
        ('unavailable',        'Unavailable'),
    ]

    key_id       = models.CharField(max_length=64, unique=True, db_index=True, editable=False)
    key_type     = models.CharField(max_length=20, choices=KEY_TYPE_CHOICES, default='symmetric')
    key_usage    = models.CharField(max_length=30, choices=KEY_USAGE_CHOICES, default='encrypt_decrypt')
    status       = models.CharField(max_length=30, choices=STATUS_CHOICES, default='enabled', db_index=True)
    key_material_origin = models.CharField(
        max_length=20,
        choices=[('atonix', 'OrcaCloud'), ('external', 'External'), ('custom_key_store', 'Custom Key Store')],
        default='atonix',
    )
    alias        = models.CharField(max_length=255, blank=True, db_index=True)
    rotation_enabled     = models.BooleanField(default=True)
    rotation_period_days = models.IntegerField(default=365)
    next_rotation_date   = models.DateField(null=True, blank=True)
    deletion_date        = models.DateTimeField(null=True, blank=True)
    deletion_window_days = models.IntegerField(default=30)
    policy               = models.JSONField(default=dict, help_text="Key policy document")

    class Meta:
        verbose_name = 'Encryption Key'
        verbose_name_plural = 'Encryption Keys'
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.key_id:
            self.key_id = f'atnx-key-{uuid.uuid4().hex[:12]}'
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.alias or self.key_id} ({self.key_type})'


class KeyRotationRecord(TimeStampedModel):
    """Historical record of key rotation events."""

    key          = models.ForeignKey(KMSEncryptionKey, on_delete=models.CASCADE, related_name='rotation_records')
    rotated_by   = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    rotation_type = models.CharField(
        max_length=20,
        choices=[('automatic', 'Automatic'), ('manual', 'Manual')],
        default='automatic',
    )
    previous_key_version = models.CharField(max_length=64, blank=True)
    new_key_version      = models.CharField(max_length=64, blank=True)
    status               = models.CharField(max_length=20, default='success')
    notes                = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.key} rotation @ {self.created_at}'


class KeyUsageLog(TimeStampedModel):
    """Log of cryptographic operations performed with a key."""

    OPERATION_CHOICES = [
        ('encrypt',   'Encrypt'),
        ('decrypt',   'Decrypt'),
        ('sign',      'Sign'),
        ('verify',    'Verify'),
        ('generate_data_key', 'Generate Data Key'),
        ('re_encrypt', 'Re-Encrypt'),
    ]

    key           = models.ForeignKey(KMSEncryptionKey, on_delete=models.CASCADE, related_name='usage_logs')
    actor         = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    operation     = models.CharField(max_length=30, choices=OPERATION_CHOICES)
    resource_id   = models.CharField(max_length=128, blank=True)
    resource_type = models.CharField(max_length=64, blank=True)
    caller_ip     = models.GenericIPAddressField(null=True, blank=True)
    region        = models.CharField(max_length=64, blank=True)
    outcome       = models.CharField(max_length=20, default='success')

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['key', 'created_at']),
        ]

    def __str__(self):
        return f'{self.key} {self.operation} by {self.actor}'
