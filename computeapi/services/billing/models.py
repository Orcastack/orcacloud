# OrcaCloud – Billing Models

import uuid
from django.db import models
from django.contrib.auth.models import User
from ..core.base_models import TimeStampedModel, ResourceModel


# ── Plan / Subscription ───────────────────────────────────────────────────────

class PlanTier(models.TextChoices):
    FREE       = 'free',         'Free'
    STARTER    = 'starter',      'Starter'
    PROFESSIONAL = 'professional', 'Professional'
    ENTERPRISE = 'enterprise',   'Enterprise'


class BillingAccount(TimeStampedModel):
    """One billing account per user."""
    owner           = models.OneToOneField(User, on_delete=models.CASCADE, related_name='billing_account')
    plan            = models.CharField(max_length=32, choices=PlanTier.choices, default=PlanTier.FREE)
    company_name    = models.CharField(max_length=255, blank=True)
    billing_email   = models.EmailField(blank=True)
    tax_id          = models.CharField(max_length=64, blank=True)
    address_line1   = models.CharField(max_length=255, blank=True)
    address_line2   = models.CharField(max_length=255, blank=True)
    city            = models.CharField(max_length=100, blank=True)
    state           = models.CharField(max_length=100, blank=True)
    postal_code     = models.CharField(max_length=20, blank=True)
    country         = models.CharField(max_length=64, blank=True, default='US')
    currency        = models.CharField(max_length=8, default='USD')
    credit_balance  = models.DecimalField(max_digits=12, decimal_places=4, default=0)
    auto_pay        = models.BooleanField(default=True)
    spend_limit     = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)

    class Meta:
        verbose_name = 'Billing Account'

    def __str__(self):
        return f'{self.owner.username} – {self.plan}'


PLAN_PRICES = {
    'free':         0.00,
    'starter':      29.00,
    'professional': 99.00,
    'enterprise':   499.00,
}

PLAN_FEATURES = {
    'free':         {'compute_hours': 100,  'storage_gb': 5,    'bandwidth_gb': 10,  'api_calls': 10_000},
    'starter':      {'compute_hours': 500,  'storage_gb': 50,   'bandwidth_gb': 100, 'api_calls': 100_000},
    'professional': {'compute_hours': 2000, 'storage_gb': 500,  'bandwidth_gb': 1000,'api_calls': 1_000_000},
    'enterprise':   {'compute_hours': None, 'storage_gb': None, 'bandwidth_gb': None,'api_calls': None},
}


# ── Payment Method ─────────────────────────────────────────────────────────────

class PaymentMethodType(models.TextChoices):
    CARD        = 'card',         'Credit / Debit Card'
    BANK        = 'bank_account', 'Bank Account (ACH)'
    PAYPAL      = 'paypal',       'PayPal'


class PaymentMethod(TimeStampedModel):
    owner           = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payment_methods')
    type            = models.CharField(max_length=32, choices=PaymentMethodType.choices)
    is_default      = models.BooleanField(default=False)
    # Card fields
    card_brand      = models.CharField(max_length=32, blank=True)   # visa, mastercard…
    card_last4      = models.CharField(max_length=4, blank=True)
    card_exp_month  = models.IntegerField(null=True, blank=True)
    card_exp_year   = models.IntegerField(null=True, blank=True)
    # Generic
    display_name    = models.CharField(max_length=128, blank=True)
    external_id     = models.CharField(max_length=128, blank=True)  # Stripe pm_xxx etc.
    is_verified     = models.BooleanField(default=False)

    class Meta:
        ordering = ['-is_default', '-created_at']

    def __str__(self):
        return f'{self.type} {self.card_last4 or ""} ({self.owner.username})'


# ── Invoice ────────────────────────────────────────────────────────────────────

class InvoiceStatus(models.TextChoices):
    DRAFT    = 'draft',    'Draft'
    OPEN     = 'open',     'Open'
    PAID     = 'paid',     'Paid'
    VOID     = 'void',     'Void'
    UNCOLLECTABLE = 'uncollectable', 'Uncollectable'


class Invoice(TimeStampedModel):
    owner           = models.ForeignKey(User, on_delete=models.CASCADE, related_name='invoices')
    invoice_number  = models.CharField(max_length=64, unique=True, db_index=True)
    status          = models.CharField(max_length=32, choices=InvoiceStatus.choices, default=InvoiceStatus.DRAFT)
    period_start    = models.DateField()
    period_end      = models.DateField()
    subtotal        = models.DecimalField(max_digits=12, decimal_places=4, default=0)
    tax_rate        = models.DecimalField(max_digits=6, decimal_places=4, default=0)
    tax_amount      = models.DecimalField(max_digits=12, decimal_places=4, default=0)
    credits_applied = models.DecimalField(max_digits=12, decimal_places=4, default=0)
    total           = models.DecimalField(max_digits=12, decimal_places=4, default=0)
    currency        = models.CharField(max_length=8, default='USD')
    due_date        = models.DateField(null=True, blank=True)
    paid_at         = models.DateTimeField(null=True, blank=True)
    payment_method  = models.ForeignKey(PaymentMethod, null=True, blank=True, on_delete=models.SET_NULL)
    notes           = models.TextField(blank=True)
    pdf_url         = models.URLField(blank=True)

    class Meta:
        ordering = ['-period_start']
        indexes  = [models.Index(fields=['owner', 'status']),
                    models.Index(fields=['owner', 'period_start'])]

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            self.invoice_number = f'INV-{uuid.uuid4().hex[:10].upper()}'
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.invoice_number} ({self.owner.username})'


class InvoiceLineItem(TimeStampedModel):
    invoice      = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='line_items')
    service      = models.CharField(max_length=64)
    resource_id  = models.CharField(max_length=64, blank=True)
    description  = models.CharField(max_length=255)
    quantity     = models.DecimalField(max_digits=14, decimal_places=4, default=1)
    unit         = models.CharField(max_length=32, default='unit')   # hours, GB, calls…
    unit_price   = models.DecimalField(max_digits=12, decimal_places=6)
    amount       = models.DecimalField(max_digits=12, decimal_places=4)

    class Meta:
        ordering = ['service', 'description']

    def __str__(self):
        return f'{self.description} – ${self.amount}'


# ── Usage Record ───────────────────────────────────────────────────────────────

class UsageMetric(models.TextChoices):
    COMPUTE_HOURS   = 'compute_hours',   'Compute Hours'
    STORAGE_GB      = 'storage_gb',      'Storage GB'
    BANDWIDTH_GB    = 'bandwidth_gb',    'Bandwidth GB'
    API_CALLS       = 'api_calls',       'API Calls'
    EMAIL_SENT      = 'email_sent',      'Emails Sent'
    DB_HOURS        = 'db_hours',        'Database Hours'
    SNAPSHOTS       = 'snapshots',       'Snapshots'
    IP_ADDRESSES    = 'ip_addresses',    'Floating IPs'
    LOAD_BALANCERS  = 'load_balancers',  'Load Balancers'


# Unit prices per metric (USD)
UNIT_PRICES = {
    'compute_hours':  0.045,
    'storage_gb':     0.023,
    'bandwidth_gb':   0.09,
    'api_calls':      0.000004,
    'email_sent':     0.0001,
    'db_hours':       0.065,
    'snapshots':      0.05,
    'ip_addresses':   0.005,
    'load_balancers': 0.025,
}


class UsageRecord(TimeStampedModel):
    owner         = models.ForeignKey(User, on_delete=models.CASCADE, related_name='usage_records')
    service       = models.CharField(max_length=64)
    resource_id   = models.CharField(max_length=64, blank=True, db_index=True)
    metric        = models.CharField(max_length=64, choices=UsageMetric.choices)
    quantity      = models.DecimalField(max_digits=18, decimal_places=4)
    unit          = models.CharField(max_length=32)
    unit_price    = models.DecimalField(max_digits=12, decimal_places=6, default=0)
    cost          = models.DecimalField(max_digits=12, decimal_places=4, default=0)
    period_start  = models.DateTimeField(db_index=True)
    period_end    = models.DateTimeField()

    class Meta:
        ordering = ['-period_start']
        indexes  = [
            models.Index(fields=['owner', 'metric', 'period_start']),
            models.Index(fields=['owner', 'service', 'period_start']),
        ]

    def save(self, *args, **kwargs):
        if not self.unit_price:
            self.unit_price = UNIT_PRICES.get(self.metric, 0)
        if not self.cost:
            self.cost = float(self.quantity) * float(self.unit_price)
        super().save(*args, **kwargs)


# ── Weekly Billing Snapshot ───────────────────────────────────────────────────

class WeeklyBillingSnapshot(TimeStampedModel):
    """
    Pre-computed weekly cost rollup per user and service.
    Generated every Monday by `billing_weekly_calculation` management command.
    Also created on-demand when the weekly endpoint is accessed.
    """
    owner         = models.ForeignKey(User, on_delete=models.CASCADE, related_name='weekly_snapshots')
    week_start    = models.DateField(db_index=True)   # Monday
    week_end      = models.DateField()                # Sunday
    week_number   = models.IntegerField()             # ISO week number
    year          = models.IntegerField()
    service       = models.CharField(max_length=64, db_index=True)  # 'compute', 'storage', '__total__'
    total_cost    = models.DecimalField(max_digits=14, decimal_places=4, default=0)
    total_units   = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    record_count  = models.IntegerField(default=0)
    is_mock       = models.BooleanField(default=False)

    class Meta:
        unique_together = [('owner', 'week_start', 'service')]
        ordering        = ['-week_start', 'service']
        indexes         = [
            models.Index(fields=['owner', 'year', 'week_number']),
            models.Index(fields=['owner', 'week_start']),
        ]

    def __str__(self):
        return f'W{self.week_number}/{self.year} {self.service} – ${self.total_cost} ({self.owner.username})'


# ── Platform Usage Event ──────────────────────────────────────────────────────

class PlatformUsageEvent(TimeStampedModel):
    """
    Lightweight event emitted by any platform service (compute, storage, etc.)
    when resources are consumed.  Aggregated into UsageRecord + WeeklyBillingSnapshot.
    """
    owner         = models.ForeignKey(User, on_delete=models.CASCADE, related_name='usage_events')
    service       = models.CharField(max_length=64, db_index=True)
    resource_id   = models.CharField(max_length=128, blank=True, db_index=True)
    resource_type = models.CharField(max_length=64, blank=True)   # 'vm', 'volume', 'bucket', …
    metric        = models.CharField(max_length=64)
    quantity      = models.DecimalField(max_digits=18, decimal_places=4)
    unit          = models.CharField(max_length=32)
    unit_price    = models.DecimalField(max_digits=12, decimal_places=6, default=0)
    cost          = models.DecimalField(max_digits=12, decimal_places=4, default=0)
    event_time    = models.DateTimeField(db_index=True)
    processed     = models.BooleanField(default=False, db_index=True)

    class Meta:
        ordering = ['-event_time']
        indexes  = [
            models.Index(fields=['owner', 'service', 'event_time']),
            models.Index(fields=['processed', 'event_time']),
        ]

    def save(self, *args, **kwargs):
        from .models import UNIT_PRICES
        if not self.unit_price:
            self.unit_price = UNIT_PRICES.get(self.metric, 0)
        if not self.cost:
            self.cost = float(self.quantity) * float(self.unit_price)
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.service}/{self.metric} qty={self.quantity} cost=${self.cost} ({self.owner.username})'


# ── Credit Note ────────────────────────────────────────────────────────────────

class CreditNoteReason(models.TextChoices):
    SERVICE_CREDIT  = 'service_credit', 'Service Credit'
    PROMO           = 'promo',          'Promotional Credit'
    SLA_VIOLATION   = 'sla',            'SLA Violation'
    REFUND          = 'refund',         'Refund'
    ADJUSTMENT      = 'adjustment',     'Manual Adjustment'


class CreditNote(TimeStampedModel):
    owner         = models.ForeignKey(User, on_delete=models.CASCADE, related_name='credit_notes')
    amount        = models.DecimalField(max_digits=12, decimal_places=4)
    currency      = models.CharField(max_length=8, default='USD')
    reason        = models.CharField(max_length=32, choices=CreditNoteReason.choices)
    description   = models.TextField(blank=True)
    expires_at    = models.DateField(null=True, blank=True)
    applied_to    = models.ForeignKey(Invoice, null=True, blank=True, on_delete=models.SET_NULL)
    created_by    = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='issued_credits')

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Credit ${self.amount} ({self.reason}) – {self.owner.username}'
