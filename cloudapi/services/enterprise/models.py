# OrcaCloud – Enterprise Module Models
# All models are scoped to an Organization (multi-tenant anchor).
# Modules: Organization, Email Sending, Domains, Branding, Billing, Audit/Compliance.

import uuid
from django.db import models
from django.contrib.auth.models import User
from ..core.base_models import TimeStampedModel


# ── Helpers ───────────────────────────────────────────────────────────────────

def _uid(prefix: str) -> str:
    return f'{prefix}-{uuid.uuid4().hex[:12]}'

# Named default functions (required so Django migrations can serialize them)
def _org_id():   return _uid('org')
def _mbr_id():   return _uid('mbr')
def _sed_id():   return _uid('sed')
def _esi_id():   return _uid('esi')
def _etpl_id():  return _uid('etpl')
def _elog_id():  return _uid('elog')
def _odom_id():  return _uid('odom')
def _drec_id():  return _uid('drec')
def _brnd_id():  return _uid('brnd')
def _bast_id():  return _uid('bast')
def _plan_id():  return _uid('plan')
def _sub_id():   return _uid('sub')
def _einv_id():  return _uid('einv')
def _aud_id():   return _uid('aud')


# ═══════════════════════════════════════════════════════════════════════════════
# 1. ORGANIZATION (tenant anchor)
# ═══════════════════════════════════════════════════════════════════════════════

class Organization(TimeStampedModel):
    """Root tenant entity for the Enterprise system."""

    class Status(models.TextChoices):
        ACTIVE    = 'ACTIVE',    'Active'
        SUSPENDED = 'SUSPENDED', 'Suspended'
        TRIAL     = 'TRIAL',     'Trial'

    id             = models.CharField(max_length=36, primary_key=True,
                                      default=_org_id, editable=False)
    owner          = models.ForeignKey(User, on_delete=models.CASCADE,
                                       related_name='owned_organizations')
    name           = models.CharField(max_length=255, db_index=True)
    slug           = models.SlugField(max_length=100, unique=True, db_index=True)
    primary_domain = models.CharField(max_length=253, blank=True)
    industry       = models.CharField(max_length=100, blank=True)
    country        = models.CharField(max_length=64,  blank=True)
    plan           = models.CharField(max_length=64,  default='Enterprise')
    status         = models.CharField(max_length=20,  choices=Status.choices,
                                      default=Status.TRIAL)
    contact_email  = models.EmailField(blank=True)
    domain_email   = models.EmailField(blank=True)
    logo_url       = models.URLField(blank=True)

    # ── Settings fields ──────────────────────────────────────────────────────
    language                   = models.CharField(max_length=10,  default='en')
    timezone                   = models.CharField(max_length=64,  default='UTC')
    default_department         = models.CharField(max_length=100, blank=True)
    notifications_billing      = models.BooleanField(default=True)
    notifications_security     = models.BooleanField(default=True)
    notifications_usage        = models.BooleanField(default=True)
    notification_slack_webhook = models.CharField(max_length=500, blank=True)

    class Meta:
        verbose_name = 'Organization'

    def __str__(self):
        return f'{self.name} ({self.slug})'


# ── Organization Member ───────────────────────────────────────────────────────

class OrganizationMember(TimeStampedModel):

    class Role(models.TextChoices):
        OWNER   = 'OWNER',   'Owner'
        ADMIN   = 'ADMIN',   'Admin'
        MANAGER = 'MANAGER', 'Manager'
        MEMBER  = 'MEMBER',  'Member'
        VIEWER  = 'VIEWER',  'Viewer'

    class Status(models.TextChoices):
        ACTIVE    = 'ACTIVE',    'Active'
        INVITED   = 'INVITED',   'Invited'
        SUSPENDED = 'SUSPENDED', 'Suspended'

    id           = models.CharField(max_length=36, primary_key=True,
                                    default=_mbr_id, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE,
                                     related_name='members')
    user         = models.ForeignKey(User, on_delete=models.SET_NULL,
                                     null=True, blank=True, related_name='org_memberships')
    email        = models.EmailField(db_index=True)
    name         = models.CharField(max_length=255, blank=True)
    role         = models.CharField(max_length=20, choices=Role.choices, default=Role.MEMBER)
    status       = models.CharField(max_length=20, choices=Status.choices, default=Status.INVITED)
    joined_at    = models.DateTimeField(null=True, blank=True)
    invited_at   = models.DateTimeField(auto_now_add=True)
    # Module-level permissions override
    permissions  = models.JSONField(default=dict,
                                    help_text='Per-module permission overrides')

    class Meta:
        unique_together = ('organization', 'email')
        verbose_name = 'Organization Member'

    def __str__(self):
        return f'{self.email} @ {self.organization.slug} [{self.role}]'


# ═══════════════════════════════════════════════════════════════════════════════
# 2. EMAIL SERVICE (sending domains, identities, templates, logs)
# ═══════════════════════════════════════════════════════════════════════════════

class EnterpriseSendDomain(TimeStampedModel):
    """
    A sending domain for transactional / marketing email.
    Entirely separate from the cloud mailbox EmailDomain.
    """

    class Status(models.TextChoices):
        PENDING_DNS = 'PENDING_DNS', 'Pending DNS'
        VERIFIED    = 'VERIFIED',    'Verified'
        FAILED      = 'FAILED',      'Failed'

    id               = models.CharField(max_length=36, primary_key=True,
                                        default=_sed_id, editable=False)
    organization     = models.ForeignKey(Organization, on_delete=models.CASCADE,
                                         related_name='send_domains')
    domain           = models.CharField(max_length=253, db_index=True)
    status           = models.CharField(max_length=20, choices=Status.choices,
                                        default=Status.PENDING_DNS)
    dkim_record      = models.TextField(blank=True,
                                        help_text='Full TXT record value for DKIM')
    spf_record       = models.TextField(blank=True,
                                        help_text='TXT value for SPF')
    tracking_domain  = models.CharField(max_length=253, blank=True,
                                        help_text='Subdomain for open/click tracking')
    selector         = models.CharField(max_length=64, default='s1')
    last_checked_at  = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('organization', 'domain')
        verbose_name = 'Enterprise Send Domain'

    def __str__(self):
        return f'{self.domain} ({self.status})'

    def generate_dns_records(self):
        """Populate dkim_record + spf_record based on selector and domain."""
        if not self.dkim_record:
            self.dkim_record = (
                f'{self.selector}._domainkey.{self.domain} IN TXT '
                f'"v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQ"'
            )
        if not self.spf_record:
            self.spf_record = f'v=spf1 include:mail.orcacloud.com ~all'


class EmailSenderIdentity(TimeStampedModel):
    """A verified sender (From address) for enterprise email sending."""

    id           = models.CharField(max_length=36, primary_key=True,
                                    default=_esi_id, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE,
                                     related_name='sender_identities')
    email        = models.EmailField()
    name         = models.CharField(max_length=255)
    verified     = models.BooleanField(default=False)
    verify_token = models.CharField(max_length=64, blank=True)
    verified_at  = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('organization', 'email')
        verbose_name = 'Email Sender Identity'

    def __str__(self):
        return f'{self.name} <{self.email}>'


class EnterpriseEmailTemplate(TimeStampedModel):
    """HTML/text email template with variable substitution."""

    id               = models.CharField(max_length=36, primary_key=True,
                                        default=_etpl_id, editable=False)
    organization     = models.ForeignKey(Organization, on_delete=models.CASCADE,
                                         related_name='email_templates')
    name             = models.CharField(max_length=255)
    subject          = models.CharField(max_length=998)
    html_body        = models.TextField(blank=True)
    text_body        = models.TextField(blank=True)
    variables        = models.JSONField(default=list,
                                        help_text='List of variable names used in template')
    created_by       = models.ForeignKey(OrganizationMember, on_delete=models.SET_NULL,
                                         null=True, blank=True, related_name='created_templates')

    class Meta:
        unique_together = ('organization', 'name')
        verbose_name = 'Enterprise Email Template'

    def __str__(self):
        return f'{self.name} ({self.organization.slug})'


class EmailLog(TimeStampedModel):
    """Record of every outbound email sent through the Enterprise system."""

    class Status(models.TextChoices):
        QUEUED  = 'QUEUED',  'Queued'
        SENT    = 'SENT',    'Sent'
        FAILED  = 'FAILED',  'Failed'
        BOUNCED = 'BOUNCED', 'Bounced'
        OPENED  = 'OPENED',  'Opened'
        CLICKED = 'CLICKED', 'Clicked'

    id                  = models.CharField(max_length=36, primary_key=True,
                                           default=_elog_id, editable=False)
    organization        = models.ForeignKey(Organization, on_delete=models.CASCADE,
                                            related_name='email_logs')
    campaign_id         = models.CharField(max_length=128, blank=True, db_index=True)
    to_email            = models.EmailField()
    from_email          = models.EmailField()
    subject             = models.CharField(max_length=998)
    status              = models.CharField(max_length=20, choices=Status.choices,
                                           default=Status.QUEUED)
    provider_message_id = models.CharField(max_length=255, blank=True)
    metadata            = models.JSONField(default=dict)

    class Meta:
        verbose_name = 'Email Log'
        ordering = ['-created_at']
        indexes = [models.Index(fields=['organization', '-created_at'])]

    def __str__(self):
        return f'→{self.to_email} [{self.status}]'


# ═══════════════════════════════════════════════════════════════════════════════
# 3. DOMAINS (org-scoped, separate from cloud DNS management)
# ═══════════════════════════════════════════════════════════════════════════════

class OrgDomain(TimeStampedModel):
    """A domain registered or associated with an organization."""

    class Type(models.TextChoices):
        APP       = 'APP',       'Application'
        MARKETING = 'MARKETING', 'Marketing'
        EMAIL     = 'EMAIL',     'Email'
        MIXED     = 'MIXED',     'Mixed'

    class Status(models.TextChoices):
        PENDING_DNS = 'PENDING_DNS', 'Pending DNS'
        ACTIVE      = 'ACTIVE',      'Active'
        FAILED      = 'FAILED',      'Failed'

    id           = models.CharField(max_length=36, primary_key=True,
                                    default=_odom_id, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE,
                                     related_name='org_domains')
    name         = models.CharField(max_length=253, db_index=True)
    type         = models.CharField(max_length=20, choices=Type.choices, default=Type.MIXED)
    status       = models.CharField(max_length=20, choices=Status.choices,
                                    default=Status.PENDING_DNS)
    linked_apps  = models.JSONField(default=list,
                                    help_text='List of app/service names this domain is linked to')

    class Meta:
        unique_together = ('organization', 'name')
        verbose_name = 'Organization Domain'

    def __str__(self):
        return f'{self.name} ({self.organization.slug})'


class OrgDomainRecord(TimeStampedModel):
    """DNS-style record associated with an OrgDomain."""

    class RecordType(models.TextChoices):
        A     = 'A',     'A'
        CNAME = 'CNAME', 'CNAME'
        TXT   = 'TXT',   'TXT'
        MX    = 'MX',    'MX'

    id                  = models.CharField(max_length=36, primary_key=True,
                                           default=_drec_id, editable=False)
    domain              = models.ForeignKey(OrgDomain, on_delete=models.CASCADE,
                                            related_name='records')
    type                = models.CharField(max_length=10, choices=RecordType.choices)
    name                = models.CharField(max_length=253)
    value               = models.TextField()
    ttl                 = models.PositiveIntegerField(default=3600)
    managed_by_platform = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Domain Record'

    def __str__(self):
        return f'{self.type} {self.name} → {self.value[:40]}'


# ═══════════════════════════════════════════════════════════════════════════════
# 4. BRANDING
# ═══════════════════════════════════════════════════════════════════════════════

class BrandingProfile(TimeStampedModel):
    """Visual brand settings for an organization."""

    GOOGLE_FONTS = [
        'IBM Plex Sans', 'Inter', 'Roboto', 'Open Sans', 'Lato',
        'Montserrat', 'Nunito', 'Source Sans 3', 'Raleway',
    ]

    id              = models.CharField(max_length=36, primary_key=True,
                                       default=_brnd_id, editable=False)
    organization    = models.OneToOneField(Organization, on_delete=models.CASCADE,
                                           related_name='branding')
    name            = models.CharField(max_length=255, default='Default')
    primary_color   = models.CharField(max_length=7,  default='#153d75')
    secondary_color = models.CharField(max_length=7,  default='#1e3a5f')
    accent_color    = models.CharField(max_length=7,  default='#3b82f6')
    logo_url        = models.URLField(blank=True)
    favicon_url     = models.URLField(blank=True)
    font_family     = models.CharField(max_length=100, default='IBM Plex Sans')
    custom_css      = models.TextField(blank=True,
                                       help_text='Additional CSS injected into branded pages')

    class Meta:
        verbose_name = 'Branding Profile'

    def __str__(self):
        return f'Branding: {self.organization.slug}'


class BrandAsset(TimeStampedModel):
    """A binary asset (logo, icon, image, document) attached to a BrandingProfile."""

    class AssetType(models.TextChoices):
        LOGO     = 'LOGO',     'Logo'
        ICON     = 'ICON',     'Icon'
        IMAGE    = 'IMAGE',    'Image'
        DOCUMENT = 'DOCUMENT', 'Document'

    id              = models.CharField(max_length=36, primary_key=True,
                                       default=_bast_id, editable=False)
    branding_profile = models.ForeignKey(BrandingProfile, on_delete=models.CASCADE,
                                          related_name='assets')
    type            = models.CharField(max_length=20, choices=AssetType.choices)
    url             = models.URLField()
    label           = models.CharField(max_length=255)
    file_size_bytes = models.PositiveBigIntegerField(default=0)
    mime_type       = models.CharField(max_length=64, blank=True)

    class Meta:
        verbose_name = 'Brand Asset'

    def __str__(self):
        return f'{self.type}: {self.label}'


# ═══════════════════════════════════════════════════════════════════════════════
# 5. BILLING (org-scoped plans, subscriptions, invoices)
# ═══════════════════════════════════════════════════════════════════════════════

class EnterprisePlan(TimeStampedModel):
    """Platform-defined plan offered to enterprise organizations."""

    id            = models.CharField(max_length=36, primary_key=True,
                                     default=_plan_id, editable=False)
    name          = models.CharField(max_length=100, unique=True)
    price_monthly = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    price_yearly  = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    limits        = models.JSONField(default=dict,
                                     help_text='{"members": 500, "teams": 50, ...}')
    features      = models.JSONField(default=list,
                                     help_text='Marketing feature bullets')
    is_active     = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Enterprise Plan'

    def __str__(self):
        return self.name


class Subscription(TimeStampedModel):
    """Active subscription linking an Organization to a Plan."""

    class Status(models.TextChoices):
        ACTIVE   = 'ACTIVE',   'Active'
        TRIALING = 'TRIALING', 'Trialing'
        PAST_DUE = 'PAST_DUE', 'Past Due'
        CANCELED = 'CANCELED', 'Canceled'

    id           = models.CharField(max_length=36, primary_key=True,
                                    default=_sub_id, editable=False)
    organization = models.OneToOneField(Organization, on_delete=models.CASCADE,
                                        related_name='subscription')
    plan         = models.ForeignKey(EnterprisePlan, on_delete=models.SET_NULL,
                                     null=True, related_name='subscriptions')
    status       = models.CharField(max_length=20, choices=Status.choices,
                                    default=Status.TRIALING)
    renewal_date = models.DateField(null=True, blank=True)
    external_id  = models.CharField(max_length=128, blank=True,
                                    help_text='Stripe subscription ID etc.')

    class Meta:
        verbose_name = 'Subscription'

    def __str__(self):
        plan_name = self.plan.name if self.plan else 'No Plan'
        return f'{self.organization.slug} → {plan_name} [{self.status}]'


class EnterpriseInvoice(TimeStampedModel):
    """Invoice issued to an organization."""

    class Status(models.TextChoices):
        DUE    = 'DUE',    'Due'
        PAID   = 'PAID',   'Paid'
        FAILED = 'FAILED', 'Failed'

    id           = models.CharField(max_length=36, primary_key=True,
                                    default=_einv_id, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE,
                                     related_name='enterprise_invoices')
    amount       = models.DecimalField(max_digits=12, decimal_places=2)
    currency     = models.CharField(max_length=8, default='USD')
    status       = models.CharField(max_length=20, choices=Status.choices, default=Status.DUE)
    period_start = models.DateField()
    period_end   = models.DateField()
    pdf_url      = models.URLField(blank=True)
    external_id  = models.CharField(max_length=128, blank=True)

    class Meta:
        verbose_name = 'Enterprise Invoice'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.organization.slug} {self.period_start}→{self.period_end} ${self.amount}'


# ═══════════════════════════════════════════════════════════════════════════════
# 6. AUDIT LOG (compliance)
# ═══════════════════════════════════════════════════════════════════════════════

class EnterpriseAuditLog(models.Model):
    """Immutable record of every significant action in an organization."""

    id           = models.CharField(max_length=36, primary_key=True,
                                    default=_aud_id, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE,
                                     related_name='audit_logs')
    actor_member = models.ForeignKey(OrganizationMember, on_delete=models.SET_NULL,
                                     null=True, blank=True, related_name='audit_events')
    actor_email  = models.EmailField(blank=True,
                                     help_text='Denormalized email for deleted members')
    action       = models.CharField(max_length=100, db_index=True)
    target_type  = models.CharField(max_length=50, db_index=True, blank=True)
    target_id    = models.CharField(max_length=128, blank=True)
    target_label = models.CharField(max_length=255, blank=True)
    metadata     = models.JSONField(default=dict)
    ip_address   = models.GenericIPAddressField(null=True, blank=True)
    timestamp    = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = 'Enterprise Audit Log'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['organization', '-timestamp']),
            models.Index(fields=['organization', 'action']),
        ]

    def __str__(self):
        return f'[{self.timestamp:%Y-%m-%d}] {self.actor_email} {self.action}'


# ═══════════════════════════════════════════════════════════════════════════════
# 7. HIERARCHY: Department → Team → Group
# ═══════════════════════════════════════════════════════════════════════════════

def _dept_id():   return _uid('dept')
def _dsbi_id():   return _uid('dsbi')
def _team_id():   return _uid('team')
def _grp_id():    return _uid('grp')


class Department(TimeStampedModel):
    """Top-level grouping within an Organization (e.g. Engineering, Marketing)."""

    id               = models.CharField(max_length=36, primary_key=True,
                                        default=_dept_id, editable=False)
    organization     = models.ForeignKey(Organization, on_delete=models.CASCADE,
                                         related_name='departments')
    name             = models.CharField(max_length=255)
    category         = models.CharField(max_length=100, blank=True)
    description      = models.TextField(blank=True)
    department_lead  = models.CharField(max_length=255, blank=True)
    parent           = models.ForeignKey('self', null=True, blank=True,
                                         on_delete=models.SET_NULL,
                                         related_name='sub_departments')

    class Meta:
        unique_together = ('organization', 'name')
        verbose_name = 'Department'

    def __str__(self):
        return f'{self.name} ({self.organization.slug})'


class DepartmentSidebarItem(TimeStampedModel):
    """Custom sidebar navigation item for a Department sub-dashboard."""

    class ItemType(models.TextChoices):
        LINK   = 'LINK',   'Link'
        HEADER = 'HEADER', 'Header'
        DIVIDER = 'DIVIDER', 'Divider'

    id          = models.CharField(max_length=36, primary_key=True,
                                   default=_dsbi_id, editable=False)
    department  = models.ForeignKey(Department, on_delete=models.CASCADE,
                                    related_name='sidebar_items')
    item_type   = models.CharField(max_length=20, choices=ItemType.choices,
                                   default=ItemType.LINK)
    label       = models.CharField(max_length=100)
    url         = models.CharField(max_length=500, blank=True)
    icon        = models.CharField(max_length=60,  blank=True)
    order_index = models.PositiveSmallIntegerField(default=0)
    is_active   = models.BooleanField(default=True)

    class Meta:
        ordering = ['order_index']
        verbose_name = 'Department Sidebar Item'

    def __str__(self):
        return f'{self.department.name} / {self.label}'


class OrgTeam(TimeStampedModel):
    """A team inside a Department."""

    class TeamType(models.TextChoices):
        DEPARTMENT = 'DEPARTMENT', 'Department'
        FUNCTION   = 'FUNCTION',   'Function'
        SQUAD      = 'SQUAD',      'Squad'

    id          = models.CharField(max_length=36, primary_key=True,
                                   default=_team_id, editable=False)
    department  = models.ForeignKey(Department, on_delete=models.CASCADE,
                                    related_name='teams')
    name        = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    team_type   = models.CharField(max_length=20, choices=TeamType.choices,
                                   default=TeamType.SQUAD)

    class Meta:
        unique_together = ('department', 'name')
        verbose_name = 'Organization Team'

    def __str__(self):
        return f'{self.department.name} / {self.name}'


class OrgGroup(TimeStampedModel):
    """A sub-group within a Team."""

    id          = models.CharField(max_length=36, primary_key=True,
                                   default=_grp_id, editable=False)
    team        = models.ForeignKey(OrgTeam, on_delete=models.CASCADE,
                                    related_name='groups')
    name        = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    class Meta:
        unique_together = ('team', 'name')
        verbose_name = 'Organization Group'

    def __str__(self):
        return f'{self.team.name} / {self.name}'


# ═══════════════════════════════════════════════════════════════════════════════
# 8. WIKI
# ═══════════════════════════════════════════════════════════════════════════════

def _wcat_id():   return _uid('wcat')
def _wpage_id():  return _uid('wpag')
def _wver_id():   return _uid('wver')


class WikiCategory(TimeStampedModel):
    id           = models.CharField(max_length=36, primary_key=True,
                                    default=_wcat_id, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE,
                                     related_name='wiki_categories')
    name         = models.CharField(max_length=120)
    color        = models.CharField(max_length=20, default='#3b82f6')
    description  = models.TextField(blank=True)

    class Meta:
        unique_together = ('organization', 'name')
        verbose_name = 'Wiki Category'

    def __str__(self):
        return f'{self.organization.slug} / {self.name}'


class WikiPage(TimeStampedModel):
    id            = models.CharField(max_length=36, primary_key=True,
                                     default=_wpage_id, editable=False)
    organization  = models.ForeignKey(Organization, on_delete=models.CASCADE,
                                      related_name='wiki_pages')
    title         = models.CharField(max_length=255)
    slug          = models.SlugField(max_length=255, blank=True)
    content       = models.TextField(blank=True)
    summary       = models.CharField(max_length=500, blank=True)
    is_pinned     = models.BooleanField(default=False)
    view_count    = models.PositiveIntegerField(default=0)
    tags          = models.JSONField(default=list)
    categories    = models.ManyToManyField(WikiCategory, blank=True,
                                           related_name='pages')
    linked_module = models.CharField(max_length=50, blank=True)
    created_by    = models.ForeignKey(User, null=True, blank=True,
                                      on_delete=models.SET_NULL,
                                      related_name='wiki_pages_created')
    updated_by    = models.ForeignKey(User, null=True, blank=True,
                                      on_delete=models.SET_NULL,
                                      related_name='wiki_pages_updated')

    class Meta:
        unique_together = ('organization', 'slug')
        verbose_name = 'Wiki Page'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.title} ({self.organization.slug})'


class WikiPageVersion(models.Model):
    id           = models.CharField(max_length=36, primary_key=True,
                                    default=_wver_id, editable=False)
    page         = models.ForeignKey(WikiPage, on_delete=models.CASCADE,
                                     related_name='versions')
    title        = models.CharField(max_length=255)
    content      = models.TextField(blank=True)
    edited_by    = models.ForeignKey(User, null=True, blank=True,
                                     on_delete=models.SET_NULL)
    edited_at    = models.DateTimeField(auto_now_add=True)
    version_note = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ['-edited_at']
        verbose_name = 'Wiki Page Version'

    def __str__(self):
        return f'{self.page.title} v@{self.edited_at:%Y-%m-%d %H:%M}'


# ═══════════════════════════════════════════════════════════════════════════════
# 9. INTEGRATIONS
# ═══════════════════════════════════════════════════════════════════════════════

def _intc_id():  return _uid('intc')
def _intl_id():  return _uid('intl')
def _intwh_id(): return _uid('inwh')


class IntegrationConnection(TimeStampedModel):
    class Status(models.TextChoices):
        CONNECTED    = 'CONNECTED',    'Connected'
        DISCONNECTED = 'DISCONNECTED', 'Disconnected'
        ERROR        = 'ERROR',        'Error'
        PENDING      = 'PENDING',      'Pending'

    id             = models.CharField(max_length=36, primary_key=True,
                                      default=_intc_id, editable=False)
    organization   = models.ForeignKey(Organization, on_delete=models.CASCADE,
                                       related_name='integrations')
    provider       = models.CharField(max_length=80, db_index=True)
    display_name   = models.CharField(max_length=120, blank=True)
    category       = models.CharField(max_length=50, default='other')
    status         = models.CharField(max_length=20, choices=Status.choices,
                                      default=Status.PENDING)
    config         = models.JSONField(default=dict)
    credentials    = models.JSONField(default=dict,
                                      help_text='Encrypted at rest; never expose to client')
    last_sync      = models.DateTimeField(null=True, blank=True)
    last_error     = models.TextField(blank=True)
    total_calls    = models.PositiveBigIntegerField(default=0)
    error_count    = models.PositiveIntegerField(default=0)
    connected_by   = models.ForeignKey(User, null=True, blank=True,
                                       on_delete=models.SET_NULL)
    webhook_secret = models.CharField(max_length=64, blank=True)

    class Meta:
        unique_together = ('organization', 'provider')
        verbose_name = 'Integration Connection'

    def __str__(self):
        return f'{self.provider} ({self.organization.slug}) [{self.status}]'


class IntegrationLog(models.Model):
    id             = models.CharField(max_length=36, primary_key=True,
                                      default=_intl_id, editable=False)
    connection     = models.ForeignKey(IntegrationConnection, null=True, blank=True,
                                       on_delete=models.CASCADE,
                                       related_name='logs')
    provider       = models.CharField(max_length=80)
    event_type     = models.CharField(max_length=80)
    level          = models.CharField(max_length=10, default='INFO')
    message        = models.TextField(blank=True)
    http_status    = models.PositiveSmallIntegerField(null=True, blank=True)
    duration_ms    = models.PositiveIntegerField(default=0)
    retry_count    = models.PositiveSmallIntegerField(default=0)
    correlation_id = models.CharField(max_length=64, blank=True)
    timestamp      = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Integration Log'

    def __str__(self):
        return f'[{self.provider}] {self.event_type} {self.level}'


class IntegrationWebhookEvent(models.Model):
    id                = models.CharField(max_length=36, primary_key=True,
                                         default=_intwh_id, editable=False)
    connection        = models.ForeignKey(IntegrationConnection, null=True, blank=True,
                                          on_delete=models.CASCADE,
                                          related_name='webhook_events')
    provider          = models.CharField(max_length=80)
    event_type        = models.CharField(max_length=80)
    event_id          = models.CharField(max_length=128, blank=True)
    payload           = models.JSONField(default=dict)
    normalized        = models.JSONField(default=dict)
    processed         = models.BooleanField(default=False)
    processing_error  = models.TextField(blank=True)
    received_at       = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-received_at']
        verbose_name = 'Integration Webhook Event'

    def __str__(self):
        return f'{self.provider} / {self.event_type}'


# ═══════════════════════════════════════════════════════════════════════════════
# 10. ORDERS
# ═══════════════════════════════════════════════════════════════════════════════

def _order_id():  return _uid('ordr')
def _oitem_id():  return _uid('oitm')


class OrgOrder(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING   = 'PENDING',   'Pending'
        CONFIRMED = 'CONFIRMED', 'Confirmed'
        FULFILLED = 'FULFILLED', 'Fulfilled'
        CANCELED  = 'CANCELED',  'Canceled'

    id           = models.CharField(max_length=36, primary_key=True,
                                    default=_order_id, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE,
                                     related_name='orders')
    order_number = models.CharField(max_length=32, unique=True)
    status       = models.CharField(max_length=20, choices=Status.choices,
                                    default=Status.PENDING)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    currency     = models.CharField(max_length=8, default='USD')
    notes        = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Organization Order'

    def __str__(self):
        return f'{self.order_number} ({self.organization.slug})'

    def save(self, *args, **kwargs):
        if not self.order_number:
            import uuid as _uuid
            self.order_number = f'ORD-{_uuid.uuid4().hex[:8].upper()}'
        super().save(*args, **kwargs)


class OrderItem(models.Model):
    id          = models.CharField(max_length=36, primary_key=True,
                                   default=_oitem_id, editable=False)
    order       = models.ForeignKey(OrgOrder, on_delete=models.CASCADE,
                                    related_name='items')
    product     = models.CharField(max_length=255)
    quantity    = models.PositiveIntegerField(default=1)
    unit_price  = models.DecimalField(max_digits=12, decimal_places=2)
    total_price = models.DecimalField(max_digits=12, decimal_places=2)

    def save(self, *args, **kwargs):
        self.total_price = self.unit_price * self.quantity
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = 'Order Item'

    def __str__(self):
        return f'{self.product} x{self.quantity}'


# ═══════════════════════════════════════════════════════════════════════════════
# 11. MEETINGS & ANNOUNCEMENTS
# ═══════════════════════════════════════════════════════════════════════════════

def _mtg_id():  return _uid('mtg')
def _mtp_id():  return _uid('mtp')
def _mtn_id():  return _uid('mtn')
def _ann_id():  return _uid('ann')


class Meeting(TimeStampedModel):
    class Type(models.TextChoices):
        STANDUP   = 'STANDUP',   'Standup'
        REVIEW    = 'REVIEW',    'Review'
        PLANNING  = 'PLANNING',  'Planning'
        ONE_ON_ONE = 'ONE_ON_ONE', '1:1'
        ALL_HANDS = 'ALL_HANDS', 'All Hands'
        OTHER     = 'OTHER',     'Other'

    class Status(models.TextChoices):
        SCHEDULED = 'SCHEDULED', 'Scheduled'
        IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
        COMPLETED = 'COMPLETED', 'Completed'
        CANCELED  = 'CANCELED',  'Canceled'

    id               = models.CharField(max_length=36, primary_key=True,
                                        default=_mtg_id, editable=False)
    organization     = models.ForeignKey(Organization, on_delete=models.CASCADE,
                                         related_name='meetings')
    department       = models.ForeignKey(Department, null=True, blank=True,
                                         on_delete=models.SET_NULL,
                                         related_name='meetings')
    created_by       = models.ForeignKey(User, null=True, blank=True,
                                         on_delete=models.SET_NULL,
                                         related_name='meetings_created')
    title            = models.CharField(max_length=255)
    description      = models.TextField(blank=True)
    agenda           = models.TextField(blank=True)
    start_time       = models.DateTimeField()
    end_time         = models.DateTimeField(null=True, blank=True)
    meeting_type     = models.CharField(max_length=20, choices=Type.choices,
                                        default=Type.OTHER)
    status           = models.CharField(max_length=20, choices=Status.choices,
                                        default=Status.SCHEDULED)
    video_room_id    = models.CharField(max_length=128, blank=True)
    video_provider   = models.CharField(max_length=40, blank=True)
    video_join_url   = models.URLField(blank=True)
    location         = models.CharField(max_length=255, blank=True)
    is_recurring     = models.BooleanField(default=False)
    recurrence_rule  = models.CharField(max_length=255, blank=True)
    recording_url    = models.URLField(blank=True)
    notes            = models.TextField(blank=True)
    max_participants = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['-start_time']
        verbose_name = 'Meeting'

    @property
    def duration_minutes(self):
        if self.end_time and self.start_time:
            delta = self.end_time - self.start_time
            return int(delta.total_seconds() / 60)
        return None

    def __str__(self):
        return f'{self.title} @ {self.start_time:%Y-%m-%d %H:%M}'


class MeetingParticipant(models.Model):
    class Role(models.TextChoices):
        ORGANIZER = 'ORGANIZER', 'Organizer'
        ATTENDEE  = 'ATTENDEE',  'Attendee'
        OPTIONAL  = 'OPTIONAL',  'Optional'

    class InviteStatus(models.TextChoices):
        PENDING  = 'PENDING',  'Pending'
        ACCEPTED = 'ACCEPTED', 'Accepted'
        DECLINED = 'DECLINED', 'Declined'

    id            = models.CharField(max_length=36, primary_key=True,
                                     default=_mtp_id, editable=False)
    meeting       = models.ForeignKey(Meeting, on_delete=models.CASCADE,
                                      related_name='participants')
    user          = models.ForeignKey(User, null=True, blank=True,
                                      on_delete=models.SET_NULL)
    member        = models.ForeignKey(OrganizationMember, null=True, blank=True,
                                      on_delete=models.SET_NULL)
    email         = models.EmailField(blank=True)
    name          = models.CharField(max_length=255, blank=True)
    role          = models.CharField(max_length=20, choices=Role.choices,
                                     default=Role.ATTENDEE)
    invite_status = models.CharField(max_length=20, choices=InviteStatus.choices,
                                     default=InviteStatus.PENDING)
    joined_at     = models.DateTimeField(null=True, blank=True)
    left_at       = models.DateTimeField(null=True, blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('meeting', 'email')
        verbose_name = 'Meeting Participant'

    def __str__(self):
        return f'{self.email} @ {self.meeting.title}'


class MeetingNotification(models.Model):
    id          = models.CharField(max_length=36, primary_key=True,
                                   default=_mtn_id, editable=False)
    user        = models.ForeignKey(User, on_delete=models.CASCADE,
                                    related_name='meeting_notifications')
    meeting     = models.ForeignKey(Meeting, on_delete=models.CASCADE,
                                    related_name='notifications')
    notif_type  = models.CharField(max_length=40, default='REMINDER')
    message     = models.TextField(blank=True)
    is_read     = models.BooleanField(default=False)
    sent_at     = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-sent_at']
        verbose_name = 'Meeting Notification'

    def __str__(self):
        return f'Notif for {self.user_id} / {self.meeting.title}'


class Announcement(TimeStampedModel):
    class Priority(models.TextChoices):
        LOW    = 'LOW',    'Low'
        NORMAL = 'NORMAL', 'Normal'
        HIGH   = 'HIGH',   'High'
        URGENT = 'URGENT', 'Urgent'

    id           = models.CharField(max_length=36, primary_key=True,
                                    default=_ann_id, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE,
                                     related_name='announcements')
    department   = models.ForeignKey(Department, null=True, blank=True,
                                     on_delete=models.SET_NULL,
                                     related_name='announcements')
    created_by   = models.ForeignKey(User, null=True, blank=True,
                                     on_delete=models.SET_NULL,
                                     related_name='announcements_created')
    title        = models.CharField(max_length=255)
    message      = models.TextField()
    priority     = models.CharField(max_length=10, choices=Priority.choices,
                                    default=Priority.NORMAL)
    is_pinned    = models.BooleanField(default=False)
    expires_at   = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Announcement'

    def __str__(self):
        return f'{self.title} [{self.priority}]'
