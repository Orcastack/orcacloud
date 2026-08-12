# OrcaCloud – Email Service Models
# Mailboxes, aliases, DKIM keys, and email domains are all scoped per Domain.

import uuid
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from ..core.base_models import TimeStampedModel, ResourceModel
from ..domain.models import Domain


# ── Email Domain ──────────────────────────────────────────────────────────────

class EmailDomain(TimeStampedModel):
    """
    Links an OrcaCloud Domain to the email service.
    One EmailDomain per Domain — created automatically when email is enabled.
    """
    STATUSES = [
        ('pending',  'Pending Verification'),
        ('active',   'Active'),
        ('disabled', 'Disabled'),
        ('error',    'Error'),
    ]

    domain       = models.OneToOneField(Domain, on_delete=models.CASCADE,
                                        related_name='email_domain')
    status       = models.CharField(max_length=20, choices=STATUSES, default='pending')
    mail_host    = models.CharField(max_length=253, default='mail.orcacloud.com',
                                    help_text='FQDN of the mail server')
    smtp_port    = models.PositiveIntegerField(default=587)
    imap_port    = models.PositiveIntegerField(default=993)
    pop_port     = models.PositiveIntegerField(default=995)
    # DNS verification state
    mx_provisioned    = models.BooleanField(default=False)
    spf_provisioned   = models.BooleanField(default=False)
    dkim_provisioned  = models.BooleanField(default=False)
    dmarc_provisioned = models.BooleanField(default=False)
    # Webmail
    webmail_url  = models.URLField(blank=True)
    # Quota (MB) per mailbox default
    default_quota_mb = models.PositiveIntegerField(default=5120)  # 5 GB

    class Meta:
        verbose_name = 'Email Domain'

    def __str__(self):
        return f'email:{self.domain.domain_name}'

    @property
    def dns_ready(self):
        return all([
            self.mx_provisioned,
            self.spf_provisioned,
            self.dkim_provisioned,
            self.dmarc_provisioned,
        ])


# ── DKIM Key ──────────────────────────────────────────────────────────────────

class DkimKey(TimeStampedModel):
    """Stores DKIM key pairs per email domain / selector."""
    email_domain  = models.ForeignKey(EmailDomain, on_delete=models.CASCADE,
                                      related_name='dkim_keys')
    selector      = models.CharField(max_length=64, default='default')
    public_key    = models.TextField(blank=True)
    private_key   = models.TextField(blank=True)  # stored encrypted in production
    dns_record    = models.TextField(blank=True,
                                     help_text='Full TXT record value for DNS')
    is_active     = models.BooleanField(default=True)

    class Meta:
        unique_together = ('email_domain', 'selector')
        verbose_name = 'DKIM Key'

    def __str__(self):
        return f'{self.selector}._domainkey.{self.email_domain.domain.domain_name}'


# ── Mailbox ───────────────────────────────────────────────────────────────────

class Mailbox(ResourceModel):
    """A single hosted mailbox (user@domain)."""
    STATUSES = [
        ('active',    'Active'),
        ('suspended', 'Suspended'),
        ('deleted',   'Deleted'),
        ('creating',  'Creating'),
        ('error',     'Error'),
    ]

    email_domain    = models.ForeignKey(EmailDomain, on_delete=models.CASCADE,
                                        related_name='mailboxes')
    local_part      = models.CharField(max_length=64,
                                       help_text='The part before @')
    # Hashed password stored via Dovecot scheme (never plaintext after creation)
    password_hash   = models.CharField(max_length=256, blank=True)
    status          = models.CharField(max_length=20, choices=STATUSES, default='creating')
    quota_mb        = models.PositiveIntegerField(default=5120)
    used_mb         = models.PositiveIntegerField(default=0)
    first_name      = models.CharField(max_length=100, blank=True)
    last_name       = models.CharField(max_length=100, blank=True)
    is_admin        = models.BooleanField(default=False,
                                          help_text='Domain admin mailbox')
    last_login      = models.DateTimeField(null=True, blank=True)
    # Forward to external address
    forward_to      = models.EmailField(blank=True)
    keep_local_copy = models.BooleanField(default=True)

    class Meta:
        unique_together = ('email_domain', 'local_part')
        verbose_name = 'Mailbox'

    def save(self, *args, **kwargs):
        if not self.resource_id:
            self.resource_id = f'mbx-{uuid.uuid4().hex[:12]}'
        if not self.name:
            self.name = self.email_address
        super().save(*args, **kwargs)

    @property
    def email_address(self):
        return f'{self.local_part}@{self.email_domain.domain.domain_name}'

    @property
    def quota_used_pct(self):
        if not self.quota_mb:
            return 0
        return round(self.used_mb / self.quota_mb * 100, 1)

    def __str__(self):
        return self.email_address


# ── Email Alias ───────────────────────────────────────────────────────────────

class EmailAlias(TimeStampedModel):
    """
    An alias redirects one address to a mailbox (or a list of recipients).
    e.g. info@example.com → john@example.com
    """
    email_domain  = models.ForeignKey(EmailDomain, on_delete=models.CASCADE,
                                      related_name='aliases')
    local_part    = models.CharField(max_length=64)
    # Destinations: list of email addresses (may include external)
    destinations  = models.JSONField(default=list,
                                     help_text='List of destination email addresses')
    is_active     = models.BooleanField(default=True)

    class Meta:
        unique_together = ('email_domain', 'local_part')
        verbose_name = 'Email Alias'

    @property
    def alias_address(self):
        return f'{self.local_part}@{self.email_domain.domain.domain_name}'

    def __str__(self):
        return f'{self.alias_address} → {", ".join(self.destinations)}'


# ── Email Activity Log ────────────────────────────────────────────────────────

class EmailActivityLog(TimeStampedModel):
    """Lightweight log for email events (provisioning, delivery issues, etc.)."""
    EVENTS = [
        ('mailbox_created',  'Mailbox Created'),
        ('mailbox_deleted',  'Mailbox Deleted'),
        ('alias_created',    'Alias Created'),
        ('dns_provisioned',  'DNS Provisioned'),
        ('dkim_generated',   'DKIM Key Generated'),
        ('password_changed', 'Password Changed'),
        ('quota_updated',    'Quota Updated'),
        ('error',            'Error'),
    ]

    email_domain = models.ForeignKey(EmailDomain, on_delete=models.CASCADE,
                                     related_name='activity_logs',
                                     null=True, blank=True)
    mailbox      = models.ForeignKey(Mailbox, on_delete=models.SET_NULL,
                                     related_name='activity_logs',
                                     null=True, blank=True)
    event        = models.CharField(max_length=40, choices=EVENTS)
    detail       = models.TextField(blank=True)
    actor        = models.ForeignKey(User, on_delete=models.SET_NULL,
                                     null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.event} @ {self.created_at:%Y-%m-%d %H:%M}'
