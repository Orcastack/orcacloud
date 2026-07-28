# OrcaCloud Zero-Trust Service – Models
# Zero-Trust Network Access: policies, identities, device posture, access logs

import uuid
from django.db import models
from django.contrib.auth.models import User
from ..core.base_models import TimeStampedModel, ResourceModel


class ZeroTrustPolicy(ResourceModel):
    """Zero-trust access policy: who can reach what resource under what conditions."""

    ACTION_CHOICES = [
        ('allow', 'Allow'),
        ('deny',  'Deny'),
        ('mfa_required', 'Allow (MFA Required)'),
        ('device_check',  'Allow (Device Check Required)'),
    ]

    STATUS_CHOICES = [
        ('active',   'Active'),
        ('disabled', 'Disabled'),
        ('draft',    'Draft'),
    ]

    policy_action = models.CharField(max_length=20, choices=ACTION_CHOICES, default='allow')
    status        = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active', db_index=True)
    priority      = models.IntegerField(default=100, help_text="Lower = evaluated first")
    subjects      = models.JSONField(default=list, help_text="List of user/group/role identifiers")
    resources     = models.JSONField(default=list, help_text="Target services/URLs/CIDRs")
    conditions    = models.JSONField(default=dict, help_text="Location, device, time conditions")
    matched_count = models.BigIntegerField(default=0)
    last_matched  = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Zero-Trust Policy'
        verbose_name_plural = 'Zero-Trust Policies'
        ordering = ['priority', 'name']

    def __str__(self):
        return f'{self.name} ({self.policy_action})'


class DevicePosture(TimeStampedModel):
    """Device health/compliance assessment record."""

    POSTURE_STATUS_CHOICES = [
        ('compliant',    'Compliant'),
        ('non_compliant','Non-Compliant'),
        ('unknown',      'Unknown'),
        ('pending',      'Pending Assessment'),
    ]

    PLATFORM_CHOICES = [
        ('windows', 'Windows'),
        ('macos',   'macOS'),
        ('linux',   'Linux'),
        ('ios',     'iOS'),
        ('android', 'Android'),
        ('chromeos','ChromeOS'),
    ]

    device_id         = models.CharField(max_length=128, unique=True, db_index=True)
    owner             = models.ForeignKey(User, on_delete=models.CASCADE, related_name='devices')
    device_name       = models.CharField(max_length=255)
    platform          = models.CharField(max_length=20, choices=PLATFORM_CHOICES)
    os_version        = models.CharField(max_length=100)
    posture_status    = models.CharField(max_length=20, choices=POSTURE_STATUS_CHOICES, default='unknown', db_index=True)
    is_managed        = models.BooleanField(default=False)
    disk_encrypted    = models.BooleanField(default=False)
    screen_lock       = models.BooleanField(default=False)
    antivirus_active  = models.BooleanField(default=False)
    os_patched        = models.BooleanField(default=False)
    firewall_active   = models.BooleanField(default=False)
    last_seen         = models.DateTimeField(null=True, blank=True)
    last_assessed     = models.DateTimeField(null=True, blank=True)
    posture_score     = models.IntegerField(default=0, help_text="0-100 compliance score")

    class Meta:
        ordering = ['-last_seen']

    def __str__(self):
        return f'{self.device_name} ({self.owner}) – {self.posture_status}'


class ZeroTrustAccessLog(TimeStampedModel):
    """Log of zero-trust policy evaluation outcomes."""

    DECISION_CHOICES = [
        ('allowed',  'Allowed'),
        ('denied',   'Denied'),
        ('mfa_challenged', 'MFA Challenged'),
    ]

    actor       = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='zt_access_logs')
    device      = models.ForeignKey(DevicePosture, on_delete=models.SET_NULL, null=True, blank=True)
    policy      = models.ForeignKey(ZeroTrustPolicy, on_delete=models.SET_NULL, null=True, blank=True)
    target_resource   = models.CharField(max_length=255)
    target_service    = models.CharField(max_length=128, blank=True)
    decision          = models.CharField(max_length=20, choices=DECISION_CHOICES, default='allowed', db_index=True)
    reason            = models.TextField(blank=True)
    source_ip         = models.GenericIPAddressField(null=True, blank=True)
    source_country    = models.CharField(max_length=64, blank=True)
    risk_score        = models.IntegerField(default=0, help_text="0-100 risk assessment")
    latency_ms        = models.IntegerField(default=0)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['actor', 'created_at']),
            models.Index(fields=['decision', 'created_at']),
        ]

    def __str__(self):
        return f'{self.actor} → {self.target_resource}: {self.decision}'
