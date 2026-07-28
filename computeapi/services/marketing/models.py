# OrcaCloud – Marketing Workspace Models
# Campaigns, contact lists, templates, automations, analytics, segments, channels, A/B tests, calendar.
# All new org-scoped models are keyed via organization_id (string FK to enterprise.Organization).

import uuid
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from ..core.base_models import TimeStampedModel, ResourceModel


# ── Contact List ──────────────────────────────────────────────────────────────

class ContactList(ResourceModel):
    """A named list of subscriber contacts."""
    STATUSES = [
        ('active',   'Active'),
        ('archived', 'Archived'),
    ]
    organization = models.CharField(max_length=36, blank=True, db_index=True,
                                    help_text='Enterprise org ID (optional org scope)')
    status      = models.CharField(max_length=20, choices=STATUSES, default='active')
    description = models.TextField(blank=True)
    double_optin = models.BooleanField(default=False,
                                       help_text='Require email confirmation on subscribe')

    class Meta:
        verbose_name = 'Contact List'
        ordering     = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.resource_id:
            self.resource_id = f'lst-{uuid.uuid4().hex[:12]}'
        super().save(*args, **kwargs)

    @property
    def subscriber_count(self):
        return self.contacts.filter(status='subscribed').count()

    def __str__(self):
        return self.name


# ── Contact ───────────────────────────────────────────────────────────────────

class Contact(TimeStampedModel):
    """A single email subscriber."""
    STATUSES = [
        ('subscribed',   'Subscribed'),
        ('unsubscribed', 'Unsubscribed'),
        ('bounced',      'Bounced'),
        ('complained',   'Complained'),
        ('pending',      'Pending Confirmation'),
    ]

    contact_list = models.ForeignKey(ContactList, on_delete=models.CASCADE,
                                     related_name='contacts')
    email        = models.EmailField(db_index=True)
    first_name   = models.CharField(max_length=100, blank=True)
    last_name    = models.CharField(max_length=100, blank=True)
    status       = models.CharField(max_length=20, choices=STATUSES,
                                    default='subscribed')
    custom_fields = models.JSONField(default=dict,
                                     help_text='Extra fields: company, phone, etc.')
    subscribed_at  = models.DateTimeField(auto_now_add=True)
    unsubscribed_at = models.DateTimeField(null=True, blank=True)
    ip_address     = models.GenericIPAddressField(null=True, blank=True)
    tags           = models.JSONField(default=list)

    class Meta:
        unique_together = ('contact_list', 'email')
        ordering        = ['-created_at']

    @property
    def full_name(self):
        return f'{self.first_name} {self.last_name}'.strip() or self.email

    def __str__(self):
        return f'{self.email} ({self.status})'


# ── Email Template ────────────────────────────────────────────────────────────

class EmailTemplate(ResourceModel):
    """Reusable HTML email templates."""
    CATEGORIES = [
        ('newsletter',   'Newsletter'),
        ('promotional',  'Promotional'),
        ('transactional','Transactional'),
        ('welcome',      'Welcome'),
        ('announcement', 'Announcement'),
        ('custom',       'Custom'),
    ]

    organization   = models.CharField(max_length=36, blank=True, db_index=True,
                                       help_text='Enterprise org ID (optional org scope)')
    category       = models.CharField(max_length=30, choices=CATEGORIES,
                                      default='newsletter')
    subject        = models.CharField(max_length=255)
    preview_text   = models.CharField(max_length=255, blank=True,
                                      help_text='Short preview shown in inbox')
    html_body      = models.TextField(help_text='Full HTML email body')
    text_body      = models.TextField(blank=True,
                                      help_text='Plain-text fallback')
    thumbnail_url  = models.URLField(blank=True)
    is_active      = models.BooleanField(default=True)
    variables      = models.JSONField(default=list,
                                      help_text='List of merge-tag variable names')

    class Meta:
        verbose_name = 'Email Template'
        ordering     = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.resource_id:
            self.resource_id = f'tpl-{uuid.uuid4().hex[:12]}'
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.name} ({self.category})'


# ── Campaign ──────────────────────────────────────────────────────────────────

class Campaign(ResourceModel):
    """An email marketing campaign."""
    STATUSES = [
        ('draft',       'Draft'),
        ('scheduled',   'Scheduled'),
        ('sending',     'Sending'),
        ('sent',        'Sent'),
        ('paused',      'Paused'),
        ('cancelled',   'Cancelled'),
        ('error',       'Error'),
    ]
    TYPES = [
        ('regular',     'Regular'),
        ('ab_test',     'A/B Test'),
        ('automated',   'Automated'),
        ('rss',         'RSS Campaign'),
    ]
    CHANNELS = [
        ('email',  'Email'),
        ('sms',    'SMS'),
        ('social', 'Social'),
        ('push',   'Push Notification'),
        ('multi',  'Multi-Channel'),
        ('ads',    'Ads'),
    ]

    organization    = models.CharField(max_length=36, blank=True, db_index=True,
                                       help_text='Enterprise org ID (optional org scope)')
    status          = models.CharField(max_length=20, choices=STATUSES, default='draft')
    campaign_type   = models.CharField(max_length=20, choices=TYPES, default='regular')
    channel         = models.CharField(max_length=20, choices=CHANNELS, default='email')
    objective       = models.CharField(max_length=255, blank=True)

    # Sender
    from_name       = models.CharField(max_length=100)
    from_email      = models.EmailField()
    reply_to        = models.EmailField(blank=True)

    # Content
    subject         = models.CharField(max_length=255)
    preview_text    = models.CharField(max_length=255, blank=True)
    template        = models.ForeignKey(EmailTemplate, on_delete=models.SET_NULL,
                                        null=True, blank=True, related_name='campaigns')
    html_body       = models.TextField(blank=True)
    text_body       = models.TextField(blank=True)

    # Audience
    contact_lists   = models.ManyToManyField(ContactList, blank=True,
                                              related_name='campaigns')

    # Scheduling
    scheduled_at    = models.DateTimeField(null=True, blank=True)
    sent_at         = models.DateTimeField(null=True, blank=True)

    # Tracking
    track_opens     = models.BooleanField(default=True)
    track_clicks    = models.BooleanField(default=True)
    google_analytics = models.BooleanField(default=False)
    utm_source      = models.CharField(max_length=100, blank=True)
    utm_medium      = models.CharField(max_length=100, default='email', blank=True)
    utm_campaign    = models.CharField(max_length=100, blank=True)

    class Meta:
        verbose_name = 'Campaign'
        ordering     = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.resource_id:
            self.resource_id = f'cmp-{uuid.uuid4().hex[:12]}'
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.name} [{self.status}]'


# ── Campaign Analytics ────────────────────────────────────────────────────────

class CampaignAnalytics(TimeStampedModel):
    """Aggregate delivery/engagement metrics for a Campaign."""
    campaign        = models.OneToOneField(Campaign, on_delete=models.CASCADE,
                                           related_name='analytics')
    total_sent      = models.PositiveIntegerField(default=0)
    delivered       = models.PositiveIntegerField(default=0)
    bounced         = models.PositiveIntegerField(default=0)
    hard_bounces    = models.PositiveIntegerField(default=0)
    soft_bounces    = models.PositiveIntegerField(default=0)
    opens           = models.PositiveIntegerField(default=0)
    unique_opens    = models.PositiveIntegerField(default=0)
    clicks          = models.PositiveIntegerField(default=0)
    unique_clicks   = models.PositiveIntegerField(default=0)
    unsubscribes    = models.PositiveIntegerField(default=0)
    complaints      = models.PositiveIntegerField(default=0)
    # Enriched link-click breakdown
    link_clicks     = models.JSONField(default=dict,
                                       help_text='url → click count')
    last_synced_at  = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name_plural = 'Campaign Analytics'

    @property
    def open_rate(self):
        base = self.delivered or self.total_sent
        return round(self.unique_opens / base * 100, 2) if base else 0.0

    @property
    def click_rate(self):
        base = self.delivered or self.total_sent
        return round(self.unique_clicks / base * 100, 2) if base else 0.0

    @property
    def bounce_rate(self):
        if not self.total_sent:
            return 0.0
        return round(self.bounced / self.total_sent * 100, 2)

    @property
    def unsubscribe_rate(self):
        base = self.delivered or self.total_sent
        return round(self.unsubscribes / base * 100, 2) if base else 0.0


# ── Send Event (per-recipient tracking) ──────────────────────────────────────

class SendEvent(TimeStampedModel):
    """Individual delivery / engagement event for a campaign + contact."""
    EVENT_TYPES = [
        ('sent',        'Sent'),
        ('delivered',   'Delivered'),
        ('opened',      'Opened'),
        ('clicked',     'Clicked'),
        ('bounced',     'Bounced'),
        ('unsubscribed','Unsubscribed'),
        ('complained',  'Complained'),
    ]
    campaign  = models.ForeignKey(Campaign, on_delete=models.CASCADE,
                                  related_name='send_events')
    contact   = models.ForeignKey(Contact, on_delete=models.CASCADE,
                                  related_name='send_events')
    event     = models.CharField(max_length=20, choices=EVENT_TYPES)
    metadata  = models.JSONField(default=dict, help_text='url, user_agent, ip, etc.')

    class Meta:
        ordering = ['-created_at']


# ── Automation ────────────────────────────────────────────────────────────────

class Automation(ResourceModel):
    """
    Simple email automation sequence.
    e.g. Welcome series, drip campaigns.
    """
    TRIGGERS = [
        ('subscribe',       'On Subscribe'),
        ('unsubscribe',     'On Unsubscribe'),
        ('date_field',      'On Date Field'),
        ('campaign_open',   'On Campaign Open'),
        ('campaign_click',  'On Campaign Click'),
        ('manual',          'Manual Trigger'),
    ]

    organization    = models.CharField(max_length=36, blank=True, db_index=True,
                                       help_text='Enterprise org ID (optional org scope)')
    trigger         = models.CharField(max_length=30, choices=TRIGGERS,
                                       default='subscribe')
    contact_list    = models.ForeignKey(ContactList, on_delete=models.SET_NULL,
                                        null=True, blank=True, related_name='automations')
    is_active       = models.BooleanField(default=False)
    steps           = models.JSONField(default=list,
                                       help_text=(
                                           'Ordered list of steps: '
                                           '[{delay_days, subject, html_body, from_email}]'
                                       ))

    class Meta:
        verbose_name = 'Automation'
        ordering     = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.resource_id:
            self.resource_id = f'aut-{uuid.uuid4().hex[:12]}'
        super().save(*args, **kwargs)


def _seg_id():   return f'seg-{uuid.uuid4().hex[:12]}'
def _abt_id():   return f'abt-{uuid.uuid4().hex[:12]}'
def _var_id():   return f'var-{uuid.uuid4().hex[:12]}'
def _chn_id():   return f'chn-{uuid.uuid4().hex[:12]}'
def _cal_id():   return f'cal-{uuid.uuid4().hex[:12]}'


# ═══════════════════════════════════════════════════════════════════════════════
# ORG-SCOPED MARKETING WORKSPACE MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class Segment(TimeStampedModel):
    """Dynamic or static audience segment scoped to an organization."""
    TYPES = [
        ('dynamic', 'Dynamic'),
        ('static',  'Static'),
    ]

    id            = models.CharField(max_length=36, primary_key=True,
                                     default=_seg_id, editable=False)
    organization  = models.CharField(max_length=36, db_index=True)
    name          = models.CharField(max_length=255)
    description   = models.TextField(blank=True)
    segment_type  = models.CharField(max_length=10, choices=TYPES, default='static')
    criteria      = models.JSONField(default=dict,
                                     help_text='Filter rules: [{field, operator, value}]')
    contact_count = models.PositiveIntegerField(default=0)
    tags          = models.JSONField(default=list)
    is_active     = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Segment'
        ordering     = ['-created_at']

    def __str__(self):
        return f'{self.name} ({self.segment_type})'


class ABTest(TimeStampedModel):
    """A/B test entity for a marketing campaign."""
    STATUSES   = [('draft','Draft'), ('running','Running'), ('completed','Completed'), ('paused','Paused')]
    TEST_TYPES = [('subject','Subject Line'), ('creative','Creative'), ('audience','Audience'),
                  ('send_time','Send Time'), ('cta','Call to Action')]

    id                   = models.CharField(max_length=36, primary_key=True,
                                            default=_abt_id, editable=False)
    organization         = models.CharField(max_length=36, db_index=True)
    name                 = models.CharField(max_length=255)
    hypothesis           = models.TextField(blank=True)
    status               = models.CharField(max_length=20, choices=STATUSES, default='draft')
    test_type            = models.CharField(max_length=20, choices=TEST_TYPES, default='subject')
    campaign             = models.ForeignKey(Campaign, on_delete=models.SET_NULL,
                                             null=True, blank=True, related_name='ab_tests')
    start_at             = models.DateTimeField(null=True, blank=True)
    end_at               = models.DateTimeField(null=True, blank=True)
    winner_variant       = models.CharField(max_length=36, blank=True)
    auto_select_winner   = models.BooleanField(default=True)
    winner_metric        = models.CharField(max_length=20, default='open_rate',
                                            help_text='open_rate | click_rate | conversion_rate')

    class Meta:
        verbose_name = 'AB Test'
        ordering     = ['-created_at']

    def __str__(self):
        return f'{self.name} [{self.status}]'


class ABTestVariant(TimeStampedModel):
    """A single variant (A or B) inside an A/B test."""
    id           = models.CharField(max_length=36, primary_key=True,
                                    default=_var_id, editable=False)
    ab_test      = models.ForeignKey(ABTest, on_delete=models.CASCADE, related_name='variants')
    label        = models.CharField(max_length=10, help_text='A, B, C …')
    name         = models.CharField(max_length=255)
    subject_line = models.CharField(max_length=255, blank=True)
    preview_text = models.CharField(max_length=255, blank=True)
    html_body    = models.TextField(blank=True)
    allocation   = models.FloatField(default=0.5, help_text='Traffic share 0.0–1.0')
    sends        = models.PositiveIntegerField(default=0)
    opens        = models.PositiveIntegerField(default=0)
    clicks       = models.PositiveIntegerField(default=0)
    conversions  = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = 'AB Test Variant'
        ordering     = ['ab_test', 'label']

    @property
    def open_rate(self):
        return round(self.opens / self.sends * 100, 2) if self.sends else 0.0

    @property
    def click_rate(self):
        return round(self.clicks / self.sends * 100, 2) if self.sends else 0.0

    @property
    def conversion_rate(self):
        return round(self.conversions / self.sends * 100, 2) if self.sends else 0.0

    def __str__(self):
        return f'{self.ab_test.name} – Variant {self.label}'


class MarketingChannel(TimeStampedModel):
    """Per-channel configuration for an organization's marketing workspace."""
    CHANNEL_TYPES = [
        ('email',    'Email'),
        ('sms',      'SMS'),
        ('social',   'Social'),
        ('push',     'Push Notification'),
        ('ads',      'Ads'),
    ]
    STATUSES = [
        ('active',         'Active'),
        ('error',          'Error'),
        ('unconfigured',   'Unconfigured'),
        ('disconnected',   'Disconnected'),
    ]

    id            = models.CharField(max_length=36, primary_key=True,
                                     default=_chn_id, editable=False)
    organization  = models.CharField(max_length=36, db_index=True)
    channel_type  = models.CharField(max_length=20, choices=CHANNEL_TYPES)
    name          = models.CharField(max_length=255)
    status        = models.CharField(max_length=20, choices=STATUSES, default='unconfigured')
    provider      = models.CharField(max_length=100, blank=True,
                                     help_text='e.g. SendGrid, Twilio, Facebook')
    config        = models.JSONField(default=dict, help_text='Provider-specific config (API keys, etc.)')
    last_checked  = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Marketing Channel'
        ordering     = ['organization', 'channel_type']
        unique_together = ('organization', 'channel_type', 'name')

    def __str__(self):
        return f'{self.name} [{self.channel_type} / {self.status}]'


class MarketingCalendarEvent(TimeStampedModel):
    """Scheduled event on the marketing calendar."""
    EVENT_TYPES = [
        ('campaign',   'Campaign'),
        ('automation', 'Automation'),
        ('post',       'Social Post'),
        ('deadline',   'Deadline'),
        ('other',      'Other'),
    ]

    id           = models.CharField(max_length=36, primary_key=True,
                                    default=_cal_id, editable=False)
    organization = models.CharField(max_length=36, db_index=True)
    title        = models.CharField(max_length=255)
    description  = models.TextField(blank=True)
    event_type   = models.CharField(max_length=20, choices=EVENT_TYPES, default='other')
    campaign     = models.ForeignKey(Campaign, on_delete=models.SET_NULL,
                                     null=True, blank=True, related_name='calendar_events')
    start_at     = models.DateTimeField()
    end_at       = models.DateTimeField(null=True, blank=True)
    all_day      = models.BooleanField(default=False)
    color        = models.CharField(max_length=20, blank=True, help_text='hex color for UI')
    assignee     = models.CharField(max_length=255, blank=True)

    class Meta:
        verbose_name = 'Marketing Calendar Event'
        ordering     = ['start_at']

    def __str__(self):
        return f'{self.title} ({self.event_type}) @ {self.start_at}'


class MarketingWorkspaceSettings(TimeStampedModel):
    """Org-level marketing workspace preferences."""
    organization      = models.CharField(max_length=36, primary_key=True)
    default_from_name  = models.CharField(max_length=100, blank=True)
    default_from_email = models.EmailField(blank=True)
    default_reply_to   = models.EmailField(blank=True)
    brand_color        = models.CharField(max_length=20, blank=True)
    logo_url           = models.URLField(blank=True)
    unsubscribe_page   = models.URLField(blank=True)
    gdpr_enabled       = models.BooleanField(default=True)
    popia_enabled      = models.BooleanField(default=False)
    api_keys           = models.JSONField(default=dict)
    permissions        = models.JSONField(default=dict,
                                          help_text='Role → permission mapping')

    class Meta:
        verbose_name = 'Marketing Workspace Settings'

    def __str__(self):
        return f'MarketingSettings({self.organization})'
