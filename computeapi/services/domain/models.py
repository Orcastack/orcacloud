# OrcaCloud – Domain Service Models

from django.db import models
from django.contrib.auth.models import User
from ..core.base_models import ResourceModel, TimeStampedModel
import uuid


# ── Choices ───────────────────────────────────────────────────────────────────

DOMAIN_STATUS = [
    ('pending',    'Pending'),
    ('active',     'Active'),
    ('expired',    'Expired'),
    ('suspended',  'Suspended'),
    ('transferring','Transferring'),
    ('deleting',   'Deleting'),
    ('error',      'Error'),
]

TRANSFER_STATUS = [
    ('initiated',  'Initiated'),
    ('pending',    'Pending Auth'),
    ('approved',   'Approved'),
    ('rejected',   'Rejected'),
    ('completed',  'Completed'),
    ('failed',     'Failed'),
]

DNS_RECORD_TYPE = [
    ('A',     'A'),
    ('AAAA',  'AAAA'),
    ('CNAME', 'CNAME'),
    ('MX',    'MX'),
    ('TXT',   'TXT'),
    ('NS',    'NS'),
    ('SOA',   'SOA'),
    ('SRV',   'SRV'),
    ('CAA',   'CAA'),
    ('PTR',   'PTR'),
]

DNS_ZONE_STATUS = [
    ('active',   'Active'),
    ('pending',  'Pending'),
    ('error',    'Error'),
    ('deleted',  'Deleted'),
]

CERT_STATUS = [
    ('pending',  'Pending'),
    ('active',   'Active'),
    ('expired',  'Expired'),
    ('revoked',  'Revoked'),
    ('error',    'Error'),
]


# ── Helpers ──────────────────────────────────────────────────────────────────

def _default_cert_id():
    return f'cert-{uuid.uuid4().hex[:10]}'


# ── Domain ────────────────────────────────────────────────────────────────────

class Domain(ResourceModel):
    """
    A registered domain managed through ResellerClub.
    resource_id is used as internal identifier; reseller_order_id is the
    external ID returned by ResellerClub.
    """
    domain_name         = models.CharField(max_length=253, unique=True, db_index=True)
    tld                 = models.CharField(max_length=20)   # 'com', 'net', 'io' …
    status              = models.CharField(max_length=20, choices=DOMAIN_STATUS, default='pending', db_index=True)
    # ResellerClub
    reseller_order_id   = models.CharField(max_length=64, blank=True)
    reseller_customer_id= models.CharField(max_length=64, blank=True)
    # Dates
    registered_at       = models.DateTimeField(null=True, blank=True)
    expires_at          = models.DateTimeField(null=True, blank=True, db_index=True)
    auto_renew          = models.BooleanField(default=True)
    # Registration years
    registration_years  = models.PositiveSmallIntegerField(default=1)
    # Privacy
    whois_privacy       = models.BooleanField(default=True)
    # DNSSEC
    dnssec_enabled      = models.BooleanField(default=False)
    # Nameservers (stored as JSON list)
    nameservers         = models.JSONField(default=list)
    # Contact IDs (from ResellerClub)
    registrant_contact  = models.JSONField(default=dict)
    admin_contact       = models.JSONField(default=dict)
    tech_contact        = models.JSONField(default=dict)
    # Linked cloud resources
    linked_compute_id   = models.CharField(max_length=64, blank=True)
    linked_storage_bucket = models.CharField(max_length=128, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.domain_name

    def save(self, *args, **kwargs):
        if not self.resource_id:
            self.resource_id = f'dom-{uuid.uuid4().hex[:12]}'
        if not self.tld and '.' in self.domain_name:
            self.tld = self.domain_name.rsplit('.', 1)[-1]
        super().save(*args, **kwargs)

    @property
    def days_until_expiry(self):
        if not self.expires_at:
            return None
        from django.utils import timezone
        delta = self.expires_at - timezone.now()
        return delta.days


# ── DNS Zone ──────────────────────────────────────────────────────────────────

class DnsZone(TimeStampedModel):
    """
    An OpenStack Designate DNS zone corresponding to a domain.
    """
    domain          = models.OneToOneField(Domain, on_delete=models.CASCADE, related_name='dns_zone')
    zone_id         = models.CharField(max_length=64, unique=True, db_index=True)  # Designate zone UUID
    zone_name       = models.CharField(max_length=255)   # e.g. 'example.com.'
    status          = models.CharField(max_length=20, choices=DNS_ZONE_STATUS, default='pending')
    email           = models.EmailField(default='hostmaster@orcacloud.com')
    ttl             = models.PositiveIntegerField(default=300)
    serial          = models.BigIntegerField(default=1)
    description     = models.TextField(blank=True)

    def __str__(self):
        return self.zone_name


# ── DNS Record ────────────────────────────────────────────────────────────────

class DomainDnsRecord(TimeStampedModel):
    """
    A single DNS record inside a DnsZone (backed by Designate recordset).
    """
    RECORD_TYPES = DNS_RECORD_TYPE

    zone            = models.ForeignKey(DnsZone, on_delete=models.CASCADE, related_name='records')
    recordset_id    = models.CharField(max_length=64, blank=True, db_index=True)  # Designate recordset id
    name            = models.CharField(max_length=255)   # e.g. 'www.example.com.'
    record_type     = models.CharField(max_length=10, choices=DNS_RECORD_TYPE)
    records         = models.JSONField(default=list)     # list of values
    ttl             = models.PositiveIntegerField(default=300)
    description     = models.TextField(blank=True)
    is_managed      = models.BooleanField(default=False, help_text='Auto-managed by platform')

    class Meta:
        db_table = 'services_domainrecord'
        ordering = ['record_type', 'name']

    def __str__(self):
        return f'{self.name} {self.record_type}'


# ── Domain Transfer ───────────────────────────────────────────────────────────

class DomainTransfer(TimeStampedModel):
    """
    Records an in-progress or completed domain transfer from another registrar.
    """
    domain          = models.ForeignKey(Domain, on_delete=models.CASCADE, related_name='transfers')
    status          = models.CharField(max_length=20, choices=TRANSFER_STATUS, default='initiated')
    reseller_order_id = models.CharField(max_length=64, blank=True)
    epp_code        = models.CharField(max_length=128, blank=True)  # encrypted at rest
    initiated_at    = models.DateTimeField(auto_now_add=True)
    completed_at    = models.DateTimeField(null=True, blank=True)
    error_message   = models.TextField(blank=True)

    def __str__(self):
        return f'Transfer of {self.domain.domain_name} – {self.status}'


# ── SSL Certificate ───────────────────────────────────────────────────────────

class SslCertificate(TimeStampedModel):
    """
    A Let's Encrypt (or other CA) SSL/TLS certificate for a domain.
    """
    domain          = models.ForeignKey(Domain, on_delete=models.CASCADE, related_name='ssl_certs')
    cert_id         = models.CharField(max_length=64, unique=True, default=_default_cert_id)
    common_name     = models.CharField(max_length=253)
    sans            = models.JSONField(default=list, help_text='Subject Alternative Names')
    issuer          = models.CharField(max_length=128, default='Let\'s Encrypt')
    status          = models.CharField(max_length=20, choices=CERT_STATUS, default='pending')
    issued_at       = models.DateTimeField(null=True, blank=True)
    expires_at      = models.DateTimeField(null=True, blank=True)
    auto_renew      = models.BooleanField(default=True)
    cert_pem        = models.TextField(blank=True)   # stored encrypted
    chain_pem       = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.common_name} ({self.status})'
