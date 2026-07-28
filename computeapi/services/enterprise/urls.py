# OrcaCloud – Enterprise API URL Configuration
# All routes are org-scoped via /organizations/:org_pk/...
# Mounted at /api/enterprise/ by the main orcacloud/urls.py

from django.urls import path, include
from rest_framework.routers import SimpleRouter

from .views import (
    EnterpriseEntryView,
    OrganizationViewSet, OrganizationMemberViewSet,
    DepartmentViewSet, DepartmentSidebarViewSet, OrgTeamViewSet, OrgGroupViewSet,
    EnterpriseSendDomainViewSet, EmailSenderIdentityViewSet,
    EnterpriseEmailTemplateViewSet, EmailLogViewSet,
    OrgDomainViewSet,
    BrandingProfileViewSet, BrandAssetViewSet,
    EnterprisePlanViewSet, SubscriptionViewSet, EnterpriseInvoiceViewSet,
    EnterpriseAuditLogViewSet,
    WikiCategoryViewSet, WikiPageViewSet,
    IntegrationConnectionViewSet, IntegrationWebhookView,
    OrgOrderViewSet,
    MeetingViewSet, MeetingNotificationViewSet, AnnouncementViewSet,
)
from ..marketing.suite_viewsets import (
    OrgMarketingOverviewViewSet,
    OrgCampaignViewSet,
    OrgContactListViewSet,
    OrgSegmentViewSet,
    OrgEmailTemplateViewSet,
    OrgAutomationViewSet,
    OrgABTestViewSet,
    OrgMarketingChannelViewSet,
    OrgCalendarEventViewSet,
    OrgMarketingSettingsViewSet,
)

# ── Top-level router (org CRUD + plans) ──────────────────────────────────────
router = SimpleRouter()
router.register(r'organizations', OrganizationViewSet,   basename='enterprise-org')
router.register(r'plans',         EnterprisePlanViewSet, basename='enterprise-plan')

# ── Nested sub-routers ────────────────────────────────────────────────────────
_r_members       = SimpleRouter(); _r_members.register(r'',       OrganizationMemberViewSet,      basename='org-member')
_r_depts         = SimpleRouter(); _r_depts.register(r'',         DepartmentViewSet,              basename='org-dept')
_r_sidebar       = SimpleRouter(); _r_sidebar.register(r'',       DepartmentSidebarViewSet,       basename='dept-sidebar')
_r_teams         = SimpleRouter(); _r_teams.register(r'',         OrgTeamViewSet,                 basename='dept-team')
_r_groups        = SimpleRouter(); _r_groups.register(r'',        OrgGroupViewSet,                basename='team-group')
_r_sdomains      = SimpleRouter(); _r_sdomains.register(r'',      EnterpriseSendDomainViewSet,    basename='org-sdomain')
_r_senders       = SimpleRouter(); _r_senders.register(r'',       EmailSenderIdentityViewSet,     basename='org-sender')
_r_tmpls         = SimpleRouter(); _r_tmpls.register(r'',         EnterpriseEmailTemplateViewSet, basename='org-etemplate')
_r_logs          = SimpleRouter(); _r_logs.register(r'',          EmailLogViewSet,                basename='org-elog')
_r_domains       = SimpleRouter(); _r_domains.register(r'',       OrgDomainViewSet,               basename='org-domain')
_r_branding      = SimpleRouter(); _r_branding.register(r'',      BrandingProfileViewSet,         basename='org-branding')
_r_assets        = SimpleRouter(); _r_assets.register(r'',        BrandAssetViewSet,              basename='org-basset')
_r_sub           = SimpleRouter(); _r_sub.register(r'',           SubscriptionViewSet,            basename='org-sub')
_r_invoices      = SimpleRouter(); _r_invoices.register(r'',      EnterpriseInvoiceViewSet,       basename='org-invoice')
_r_audit         = SimpleRouter(); _r_audit.register(r'',         EnterpriseAuditLogViewSet,      basename='org-audit')
_r_wiki_cats     = SimpleRouter(); _r_wiki_cats.register(r'',     WikiCategoryViewSet,            basename='org-wiki-cat')
_r_wiki_pgs      = SimpleRouter(); _r_wiki_pgs.register(r'',      WikiPageViewSet,                basename='org-wiki-page')
_r_integrations  = SimpleRouter(); _r_integrations.register(r'',  IntegrationConnectionViewSet,   basename='org-integration')
_r_orders        = SimpleRouter(); _r_orders.register(r'',        OrgOrderViewSet,                basename='org-order')
_r_meetings      = SimpleRouter(); _r_meetings.register(r'',      MeetingViewSet,                 basename='org-meeting')
_r_mtg_notifs    = SimpleRouter(); _r_mtg_notifs.register(r'',    MeetingNotificationViewSet,     basename='org-mtg-notif')
_r_announcements = SimpleRouter(); _r_announcements.register(r'', AnnouncementViewSet,            basename='org-announcement')

_P    = 'organizations/<str:org_pk>/'
_DEPT = _P + 'departments/<str:dept_pk>/'
_TEAM = _DEPT + 'teams/<str:team_pk>/'
_MKT  = _P + 'marketing/'

# ── Marketing sub-routers ─────────────────────────────────────────────────────
_r_mkt_overview  = SimpleRouter(); _r_mkt_overview.register(r'',  OrgMarketingOverviewViewSet,  basename='org-mkt-overview')
_r_mkt_campaigns = SimpleRouter(); _r_mkt_campaigns.register(r'', OrgCampaignViewSet,           basename='org-mkt-campaign')
_r_mkt_lists     = SimpleRouter(); _r_mkt_lists.register(r'',     OrgContactListViewSet,        basename='org-mkt-list')
_r_mkt_segments  = SimpleRouter(); _r_mkt_segments.register(r'',  OrgSegmentViewSet,            basename='org-mkt-segment')
_r_mkt_templates = SimpleRouter(); _r_mkt_templates.register(r'', OrgEmailTemplateViewSet,      basename='org-mkt-template')
_r_mkt_autos     = SimpleRouter(); _r_mkt_autos.register(r'',     OrgAutomationViewSet,         basename='org-mkt-automation')
_r_mkt_abtests   = SimpleRouter(); _r_mkt_abtests.register(r'',   OrgABTestViewSet,             basename='org-mkt-abtest')
_r_mkt_channels  = SimpleRouter(); _r_mkt_channels.register(r'',  OrgMarketingChannelViewSet,   basename='org-mkt-channel')
_r_mkt_calendar  = SimpleRouter(); _r_mkt_calendar.register(r'',  OrgCalendarEventViewSet,      basename='org-mkt-calendar')
_r_mkt_settings  = SimpleRouter(); _r_mkt_settings.register(r'',  OrgMarketingSettingsViewSet,  basename='org-mkt-settings')

urlpatterns = router.urls + [
    # Entry – resolves org for current user
    path('entry/', EnterpriseEntryView.as_view(), name='enterprise-entry'),

    # Members
    path(_P + 'members/',               include(_r_members.urls)),

    # Hierarchy
    path(_P + 'departments/',           include(_r_depts.urls)),
    path(_DEPT + 'sidebar/',            include(_r_sidebar.urls)),
    path(_DEPT + 'teams/',              include(_r_teams.urls)),
    path(_TEAM + 'groups/',             include(_r_groups.urls)),

    # Email
    path(_P + 'email-domains/',         include(_r_sdomains.urls)),
    path(_P + 'email-senders/',         include(_r_senders.urls)),
    path(_P + 'email-templates/',       include(_r_tmpls.urls)),
    path(_P + 'email-logs/',            include(_r_logs.urls)),

    # Domains
    path(_P + 'domains/',               include(_r_domains.urls)),

    # Branding
    path(_P + 'branding/',              include(_r_branding.urls)),
    path(_P + 'branding-assets/',       include(_r_assets.urls)),

    # Billing
    path(_P + 'billing-subscription/', include(_r_sub.urls)),
    path(_P + 'billing-invoices/',     include(_r_invoices.urls)),

    # Audit
    path(_P + 'audit-logs/',           include(_r_audit.urls)),

    # Wiki
    path(_P + 'wiki/categories/',      include(_r_wiki_cats.urls)),
    path(_P + 'wiki/pages/',           include(_r_wiki_pgs.urls)),

    # Orders
    path(_P + 'orders/',               include(_r_orders.urls)),

    # Integrations
    path(_P + 'integrations/',         include(_r_integrations.urls)),
    path('webhooks/<str:provider>/<str:org_pk>/', IntegrationWebhookView.as_view(), name='integration-webhook'),

    # Meeting Hub
    path(_P + 'meetings/',             include(_r_meetings.urls)),
    path(_P + 'meeting-notifications/', include(_r_mtg_notifs.urls)),
    path(_P + 'announcements/',        include(_r_announcements.urls)),

    # Marketing Workspace
    path(_MKT + 'overview/',           include(_r_mkt_overview.urls)),
    path(_MKT + 'campaigns/',          include(_r_mkt_campaigns.urls)),
    path(_MKT + 'contact-lists/',      include(_r_mkt_lists.urls)),
    path(_MKT + 'segments/',           include(_r_mkt_segments.urls)),
    path(_MKT + 'templates/',          include(_r_mkt_templates.urls)),
    path(_MKT + 'automations/',        include(_r_mkt_autos.urls)),
    path(_MKT + 'ab-tests/',           include(_r_mkt_abtests.urls)),
    path(_MKT + 'channels/',           include(_r_mkt_channels.urls)),
    path(_MKT + 'calendar/',           include(_r_mkt_calendar.urls)),
    path(_MKT + 'settings/',           include(_r_mkt_settings.urls)),
]
