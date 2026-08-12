from django.utils import timezone
from django.db.models import Sum
from django.shortcuts import get_object_or_404
from rest_framework import permissions, viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied

from .models import (
    Campaign, CampaignAnalytics, Contact, ContactList, EmailTemplate,
    Automation, Segment, ABTest, ABTestVariant,
    MarketingChannel, MarketingCalendarEvent, MarketingWorkspaceSettings,
)
from .serializers import (
    OrgCampaignSerializer, CreateOrgCampaignSerializer,
    OrgContactListSerializer, CreateOrgContactListSerializer,
    OrgEmailTemplateSerializer, CreateOrgEmailTemplateSerializer,
    OrgAutomationSerializer, CreateOrgAutomationSerializer,
    SegmentSerializer, CreateSegmentSerializer,
    ABTestSerializer, CreateABTestSerializer, ABTestVariantSerializer,
    MarketingChannelSerializer, CreateMarketingChannelSerializer,
    MarketingCalendarEventSerializer, CreateMarketingCalendarEventSerializer,
    MarketingWorkspaceSettingsSerializer,
)
from ..billing.service import get_billing_overview
from ..enterprise.models import Organization, OrganizationMember


# ── Helper ────────────────────────────────────────────────────────────────────

def _resolve_org(request, org_pk: str) -> Organization:
    """Resolve org by PK or slug and assert requester is owner/member."""
    try:
        org = Organization.objects.get(pk=org_pk)
    except Organization.DoesNotExist:
        org = get_object_or_404(Organization, slug=org_pk)
    if org.owner != request.user:
        if not org.members.filter(user=request.user,
                                  status=OrganizationMember.Status.ACTIVE).exists():
            raise PermissionDenied('Not a member of this organization.')
    return org


# ═══════════════════════════════════════════════════════════════════════════════
# LEGACY USER-SCOPED OVERVIEW (kept for /marketing/overview route)
# ═══════════════════════════════════════════════════════════════════════════════

class MarketingOverviewViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        owner = request.user

        campaigns = Campaign.objects.filter(owner=owner)
        analytics_qs = CampaignAnalytics.objects.filter(campaign__owner=owner)

        aggregates = analytics_qs.aggregate(
            total_sent=Sum('total_sent'),
            delivered=Sum('delivered'),
            unique_opens=Sum('unique_opens'),
            unique_clicks=Sum('unique_clicks'),
            bounced=Sum('bounced'),
        )

        total_sent = aggregates.get('total_sent') or 0
        delivered = aggregates.get('delivered') or total_sent
        unique_opens = aggregates.get('unique_opens') or 0
        unique_clicks = aggregates.get('unique_clicks') or 0
        bounced = aggregates.get('bounced') or 0

        engagement_rate = round(unique_clicks / delivered, 4) if delivered else 0
        deliverability_score = round(((delivered - bounced) / delivered) * 100) if delivered else 96

        try:
            billing = get_billing_overview(owner)
            monthly_spend = float(billing.get('usage', {}).get('month_to_date', 0) or 0)
        except Exception:
            monthly_spend = 0.0

        running_campaigns = campaigns.filter(status__in=['sending', 'scheduled']).order_by('-updated_at')[:5]
        active_experiments = campaigns.filter(campaign_type='ab_test', status__in=['draft', 'sending', 'scheduled']).order_by('-updated_at')[:3]
        upcoming_content = campaigns.filter(scheduled_at__isnull=False, scheduled_at__gte=timezone.now()).order_by('scheduled_at')[:5]

        return Response({
            'top_metrics': {
                'total_campaigns': campaigns.count(),
                'active_campaigns': campaigns.filter(status__in=['sending', 'scheduled']).count(),
                'audience_size': Contact.objects.filter(contact_list__owner=owner, status='subscribed').count(),
                'monthly_spend': round(monthly_spend, 2),
                'overall_roi': 3.4,
                'seo_score': 82,
                'deliverability_score': deliverability_score,
                'avg_engagement_rate': engagement_rate,
            },
            'live_activity': {
                'running_campaigns': [{'id': c.resource_id, 'name': c.name, 'channel': c.channel} for c in running_campaigns],
                'active_experiments': [{'id': c.resource_id, 'name': c.name} for c in active_experiments],
                'upcoming_content': [{'id': c.resource_id, 'title': c.name, 'scheduled_at': c.scheduled_at.isoformat() if c.scheduled_at else None} for c in upcoming_content],
            },
            'insights': {
                'best_channel': 'email',
                'best_segment': 'High LTV – Africa',
                'seo_opportunities': [
                    'Improve meta descriptions for /pricing',
                    "Target keyword: 'prime source africa news'",
                ],
                'ai_recommendations': [
                    'Increase budget on campaigns with CTR > 5%',
                    "Create lookalike audience from 'High LTV – Africa'",
                ],
            },
            'quick_actions': [
                {'label': 'Create Campaign', 'route': '/marketing-dashboard/campaigns'},
                {'label': 'Create Segment', 'route': '/marketing-dashboard/audience-segmentation'},
                {'label': 'Run A/B Test', 'route': '/marketing-dashboard/ab-testing'},
                {'label': 'Add Domain', 'route': '/marketing-dashboard/seo-domains'},
                {'label': 'Schedule Content', 'route': '/marketing-dashboard/content-distribution'},
            ],
        })


# ═══════════════════════════════════════════════════════════════════════════════
# ORG-SCOPED MARKETING WORKSPACE VIEWSETS
# All views receive org_pk from URL: /api/enterprise/organizations/<org_pk>/marketing/...
# ═══════════════════════════════════════════════════════════════════════════════

class OrgMarketingOverviewViewSet(viewsets.ViewSet):
    """Overview dashboard data for the org marketing workspace."""
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request, org_pk=None):
        org = _resolve_org(request, org_pk)
        oid = org.id

        campaigns    = Campaign.objects.filter(organization=oid)
        analytics_qs = CampaignAnalytics.objects.filter(campaign__organization=oid)
        agg = analytics_qs.aggregate(
            total_sent=Sum('total_sent'), delivered=Sum('delivered'),
            unique_opens=Sum('unique_opens'), unique_clicks=Sum('unique_clicks'),
            bounced=Sum('bounced'),
        )
        total_sent    = agg.get('total_sent') or 0
        delivered     = agg.get('delivered') or total_sent
        unique_opens  = agg.get('unique_opens') or 0
        unique_clicks = agg.get('unique_clicks') or 0
        bounced       = agg.get('bounced') or 0

        audience_size = Contact.objects.filter(
            contact_list__organization=oid, status='subscribed').count()
        segments_count = Segment.objects.filter(organization=oid).count()
        automations_active = Automation.objects.filter(organization=oid, is_active=True).count()
        channels = MarketingChannel.objects.filter(organization=oid)

        return Response({
            'stats': {
                'total_campaigns':   campaigns.count(),
                'active_campaigns':  campaigns.filter(status__in=['sending', 'scheduled']).count(),
                'draft_campaigns':   campaigns.filter(status='draft').count(),
                'audience_size':     audience_size,
                'segments':          segments_count,
                'active_automations': automations_active,
                'total_sent':        total_sent,
                'open_rate':         round(unique_opens / delivered * 100, 2) if delivered else 0,
                'click_rate':        round(unique_clicks / delivered * 100, 2) if delivered else 0,
                'bounce_rate':       round(bounced / total_sent * 100, 2) if total_sent else 0,
            },
            'recent_campaigns': OrgCampaignSerializer(
                campaigns.order_by('-updated_at')[:5], many=True).data,
            'channel_health': MarketingChannelSerializer(channels, many=True).data,
            'upcoming': MarketingCalendarEventSerializer(
                MarketingCalendarEvent.objects.filter(
                    organization=oid, start_at__gte=timezone.now()
                ).order_by('start_at')[:5], many=True).data,
        })


class OrgCampaignViewSet(viewsets.ViewSet):
    """Org-scoped campaign CRUD."""
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request, org_pk=None):
        org = _resolve_org(request, org_pk)
        qs  = Campaign.objects.filter(organization=org.id).order_by('-created_at')
        # Optional filters
        status_f  = request.query_params.get('status')
        channel_f = request.query_params.get('channel')
        if status_f:  qs = qs.filter(status=status_f)
        if channel_f: qs = qs.filter(channel=channel_f)
        return Response(OrgCampaignSerializer(qs, many=True).data)

    def retrieve(self, request, org_pk=None, pk=None):
        org = _resolve_org(request, org_pk)
        obj = get_object_or_404(Campaign, resource_id=pk, organization=org.id)
        return Response(OrgCampaignSerializer(obj).data)

    def create(self, request, org_pk=None):
        org  = _resolve_org(request, org_pk)
        ser  = CreateOrgCampaignSerializer(data=request.data, context={'request': request})
        ser.is_valid(raise_exception=True)
        obj  = ser.save(owner=request.user, organization=org.id)
        return Response(OrgCampaignSerializer(obj).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, org_pk=None, pk=None):
        org = _resolve_org(request, org_pk)
        obj = get_object_or_404(Campaign, resource_id=pk, organization=org.id)
        ser = CreateOrgCampaignSerializer(obj, data=request.data, partial=True, context={'request': request})
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(OrgCampaignSerializer(obj).data)

    def destroy(self, request, org_pk=None, pk=None):
        org = _resolve_org(request, org_pk)
        obj = get_object_or_404(Campaign, resource_id=pk, organization=org.id)
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'])
    def duplicate(self, request, org_pk=None, pk=None):
        org = _resolve_org(request, org_pk)
        obj = get_object_or_404(Campaign, resource_id=pk, organization=org.id)
        obj.pk          = None
        obj.resource_id = None
        obj.name        = f'{obj.name} (copy)'
        obj.status      = 'draft'
        obj.sent_at     = obj.scheduled_at = None
        obj.save()
        return Response(OrgCampaignSerializer(obj).data, status=status.HTTP_201_CREATED)


class OrgContactListViewSet(viewsets.ViewSet):
    """Org-scoped contact list CRUD."""
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request, org_pk=None):
        org = _resolve_org(request, org_pk)
        qs  = ContactList.objects.filter(organization=org.id).order_by('-created_at')
        return Response(OrgContactListSerializer(qs, many=True).data)

    def retrieve(self, request, org_pk=None, pk=None):
        org = _resolve_org(request, org_pk)
        obj = get_object_or_404(ContactList, resource_id=pk, organization=org.id)
        return Response(OrgContactListSerializer(obj).data)

    def create(self, request, org_pk=None):
        org = _resolve_org(request, org_pk)
        ser = CreateOrgContactListSerializer(data=request.data, context={'request': request})
        ser.is_valid(raise_exception=True)
        obj = ser.save(owner=request.user, organization=org.id)
        return Response(OrgContactListSerializer(obj).data, status=status.HTTP_201_CREATED)

    def destroy(self, request, org_pk=None, pk=None):
        org = _resolve_org(request, org_pk)
        obj = get_object_or_404(ContactList, resource_id=pk, organization=org.id)
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class OrgSegmentViewSet(viewsets.ViewSet):
    """Org-scoped audience segments."""
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request, org_pk=None):
        org = _resolve_org(request, org_pk)
        qs  = Segment.objects.filter(organization=org.id).order_by('-created_at')
        return Response(SegmentSerializer(qs, many=True).data)

    def retrieve(self, request, org_pk=None, pk=None):
        org = _resolve_org(request, org_pk)
        obj = get_object_or_404(Segment, id=pk, organization=org.id)
        return Response(SegmentSerializer(obj).data)

    def create(self, request, org_pk=None):
        org = _resolve_org(request, org_pk)
        ser = CreateSegmentSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        obj = ser.save(organization=org.id)
        return Response(SegmentSerializer(obj).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, org_pk=None, pk=None):
        org = _resolve_org(request, org_pk)
        obj = get_object_or_404(Segment, id=pk, organization=org.id)
        ser = CreateSegmentSerializer(obj, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(SegmentSerializer(obj).data)

    def destroy(self, request, org_pk=None, pk=None):
        org = _resolve_org(request, org_pk)
        obj = get_object_or_404(Segment, id=pk, organization=org.id)
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class OrgEmailTemplateViewSet(viewsets.ViewSet):
    """Org-scoped email templates (Content Studio)."""
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request, org_pk=None):
        org = _resolve_org(request, org_pk)
        qs  = EmailTemplate.objects.filter(organization=org.id).order_by('-created_at')
        return Response(OrgEmailTemplateSerializer(qs, many=True).data)

    def retrieve(self, request, org_pk=None, pk=None):
        org = _resolve_org(request, org_pk)
        obj = get_object_or_404(EmailTemplate, resource_id=pk, organization=org.id)
        return Response(OrgEmailTemplateSerializer(obj).data)

    def create(self, request, org_pk=None):
        org = _resolve_org(request, org_pk)
        ser = CreateOrgEmailTemplateSerializer(data=request.data, context={'request': request})
        ser.is_valid(raise_exception=True)
        obj = ser.save(owner=request.user, organization=org.id)
        return Response(OrgEmailTemplateSerializer(obj).data, status=status.HTTP_201_CREATED)

    def destroy(self, request, org_pk=None, pk=None):
        org = _resolve_org(request, org_pk)
        obj = get_object_or_404(EmailTemplate, resource_id=pk, organization=org.id)
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class OrgAutomationViewSet(viewsets.ViewSet):
    """Org-scoped automations."""
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request, org_pk=None):
        org = _resolve_org(request, org_pk)
        qs  = Automation.objects.filter(organization=org.id).order_by('-created_at')
        return Response(OrgAutomationSerializer(qs, many=True).data)

    def retrieve(self, request, org_pk=None, pk=None):
        org = _resolve_org(request, org_pk)
        obj = get_object_or_404(Automation, resource_id=pk, organization=org.id)
        return Response(OrgAutomationSerializer(obj).data)

    def create(self, request, org_pk=None):
        org = _resolve_org(request, org_pk)
        ser = CreateOrgAutomationSerializer(data=request.data, context={'request': request})
        ser.is_valid(raise_exception=True)
        obj = ser.save(owner=request.user, organization=org.id)
        return Response(OrgAutomationSerializer(obj).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, org_pk=None, pk=None):
        org = _resolve_org(request, org_pk)
        obj = get_object_or_404(Automation, resource_id=pk, organization=org.id)
        ser = CreateOrgAutomationSerializer(obj, data=request.data, partial=True, context={'request': request})
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(OrgAutomationSerializer(obj).data)

    def destroy(self, request, org_pk=None, pk=None):
        org = _resolve_org(request, org_pk)
        obj = get_object_or_404(Automation, resource_id=pk, organization=org.id)
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'])
    def toggle(self, request, org_pk=None, pk=None):
        org = _resolve_org(request, org_pk)
        obj = get_object_or_404(Automation, resource_id=pk, organization=org.id)
        obj.is_active = not obj.is_active
        obj.save(update_fields=['is_active', 'updated_at'])
        return Response({'is_active': obj.is_active})


class OrgABTestViewSet(viewsets.ViewSet):
    """Org-scoped A/B tests."""
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request, org_pk=None):
        org = _resolve_org(request, org_pk)
        qs  = ABTest.objects.filter(organization=org.id).prefetch_related('variants').order_by('-created_at')
        return Response(ABTestSerializer(qs, many=True).data)

    def retrieve(self, request, org_pk=None, pk=None):
        org = _resolve_org(request, org_pk)
        obj = get_object_or_404(ABTest, id=pk, organization=org.id)
        return Response(ABTestSerializer(obj).data)

    def create(self, request, org_pk=None):
        org = _resolve_org(request, org_pk)
        ser = CreateABTestSerializer(data=request.data, context={'request': request})
        ser.is_valid(raise_exception=True)
        obj = ser.save(organization=org.id)
        return Response(ABTestSerializer(obj).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, org_pk=None, pk=None):
        org = _resolve_org(request, org_pk)
        obj = get_object_or_404(ABTest, id=pk, organization=org.id)
        allowed_fields = ['name', 'hypothesis', 'status', 'start_at', 'end_at',
                          'auto_select_winner', 'winner_metric', 'winner_variant']
        for field in allowed_fields:
            if field in request.data:
                setattr(obj, field, request.data[field])
        obj.save()
        return Response(ABTestSerializer(obj).data)

    def destroy(self, request, org_pk=None, pk=None):
        org = _resolve_org(request, org_pk)
        obj = get_object_or_404(ABTest, id=pk, organization=org.id)
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class OrgMarketingChannelViewSet(viewsets.ViewSet):
    """Org-scoped channel configurations."""
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request, org_pk=None):
        org = _resolve_org(request, org_pk)
        qs  = MarketingChannel.objects.filter(organization=org.id).order_by('channel_type')
        return Response(MarketingChannelSerializer(qs, many=True).data)

    def retrieve(self, request, org_pk=None, pk=None):
        org = _resolve_org(request, org_pk)
        obj = get_object_or_404(MarketingChannel, id=pk, organization=org.id)
        return Response(MarketingChannelSerializer(obj).data)

    def create(self, request, org_pk=None):
        org = _resolve_org(request, org_pk)
        ser = CreateMarketingChannelSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        obj = ser.save(organization=org.id)
        return Response(MarketingChannelSerializer(obj).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, org_pk=None, pk=None):
        org = _resolve_org(request, org_pk)
        obj = get_object_or_404(MarketingChannel, id=pk, organization=org.id)
        ser = CreateMarketingChannelSerializer(obj, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(MarketingChannelSerializer(obj).data)

    def destroy(self, request, org_pk=None, pk=None):
        org = _resolve_org(request, org_pk)
        obj = get_object_or_404(MarketingChannel, id=pk, organization=org.id)
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'], url_path='check')
    def check_health(self, request, org_pk=None, pk=None):
        org = _resolve_org(request, org_pk)
        obj = get_object_or_404(MarketingChannel, id=pk, organization=org.id)
        obj.last_checked = timezone.now()
        obj.status = 'active'   # placeholder – real check would probe API
        obj.save(update_fields=['last_checked', 'status', 'updated_at'])
        return Response(MarketingChannelSerializer(obj).data)


class OrgCalendarEventViewSet(viewsets.ViewSet):
    """Org-scoped marketing calendar events."""
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request, org_pk=None):
        org = _resolve_org(request, org_pk)
        qs  = MarketingCalendarEvent.objects.filter(organization=org.id).order_by('start_at')
        # Optional date range filter
        from_dt = request.query_params.get('from')
        to_dt   = request.query_params.get('to')
        if from_dt: qs = qs.filter(start_at__gte=from_dt)
        if to_dt:   qs = qs.filter(start_at__lte=to_dt)
        return Response(MarketingCalendarEventSerializer(qs, many=True).data)

    def create(self, request, org_pk=None):
        org = _resolve_org(request, org_pk)
        ser = CreateMarketingCalendarEventSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        obj = ser.save(organization=org.id)
        return Response(MarketingCalendarEventSerializer(obj).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, org_pk=None, pk=None):
        org = _resolve_org(request, org_pk)
        obj = get_object_or_404(MarketingCalendarEvent, id=pk, organization=org.id)
        ser = CreateMarketingCalendarEventSerializer(obj, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(MarketingCalendarEventSerializer(obj).data)

    def destroy(self, request, org_pk=None, pk=None):
        org = _resolve_org(request, org_pk)
        obj = get_object_or_404(MarketingCalendarEvent, id=pk, organization=org.id)
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class OrgMarketingSettingsViewSet(viewsets.ViewSet):
    """Org marketing workspace settings (get/update)."""
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request, org_pk=None):
        org  = _resolve_org(request, org_pk)
        obj, _ = MarketingWorkspaceSettings.objects.get_or_create(organization=org.id)
        return Response(MarketingWorkspaceSettingsSerializer(obj).data)

    def partial_update(self, request, org_pk=None, pk=None):
        org  = _resolve_org(request, org_pk)
        obj, _ = MarketingWorkspaceSettings.objects.get_or_create(organization=org.id)
        ser  = MarketingWorkspaceSettingsSerializer(obj, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(MarketingWorkspaceSettingsSerializer(obj).data)


class MarketingOverviewViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        owner = request.user

        campaigns = Campaign.objects.filter(owner=owner)
        analytics_qs = CampaignAnalytics.objects.filter(campaign__owner=owner)

        aggregates = analytics_qs.aggregate(
            total_sent=Sum('total_sent'),
            delivered=Sum('delivered'),
            unique_opens=Sum('unique_opens'),
            unique_clicks=Sum('unique_clicks'),
            bounced=Sum('bounced'),
        )

        total_sent = aggregates.get('total_sent') or 0
        delivered = aggregates.get('delivered') or total_sent
        unique_opens = aggregates.get('unique_opens') or 0
        unique_clicks = aggregates.get('unique_clicks') or 0
        bounced = aggregates.get('bounced') or 0

        engagement_rate = round(unique_clicks / delivered, 4) if delivered else 0
        deliverability_score = round(((delivered - bounced) / delivered) * 100) if delivered else 96

        try:
            billing = get_billing_overview(owner)
            monthly_spend = float(billing.get('usage', {}).get('month_to_date', 0) or 0)
        except Exception:
            monthly_spend = 0.0

        running_campaigns = campaigns.filter(status__in=['sending', 'scheduled']).order_by('-updated_at')[:5]
        active_experiments = campaigns.filter(campaign_type='ab_test', status__in=['draft', 'sending', 'scheduled']).order_by('-updated_at')[:3]
        upcoming_content = campaigns.filter(scheduled_at__isnull=False, scheduled_at__gte=timezone.now()).order_by('scheduled_at')[:5]

        overview_payload = {
            'top_metrics': {
                'total_campaigns': campaigns.count(),
                'active_campaigns': campaigns.filter(status__in=['sending', 'scheduled']).count(),
                'audience_size': Contact.objects.filter(contact_list__owner=owner, status='subscribed').count(),
                'monthly_spend': round(monthly_spend, 2),
                'overall_roi': 3.4,
                'seo_score': 82,
                'deliverability_score': deliverability_score,
                'avg_engagement_rate': engagement_rate,
            },
            'live_activity': {
                'running_campaigns': [
                    {
                        'id': item.resource_id,
                        'name': item.name,
                        'channel': 'email',
                    }
                    for item in running_campaigns
                ],
                'active_experiments': [
                    {
                        'id': item.resource_id,
                        'name': item.name,
                    }
                    for item in active_experiments
                ],
                'upcoming_content': [
                    {
                        'id': item.resource_id,
                        'title': item.name,
                        'scheduled_at': item.scheduled_at.isoformat() if item.scheduled_at else None,
                    }
                    for item in upcoming_content
                ],
            },
            'insights': {
                'best_channel': 'email',
                'best_segment': 'High LTV – Africa',
                'seo_opportunities': [
                    'Improve meta descriptions for /pricing',
                    "Target keyword: 'prime source africa news'",
                ],
                'ai_recommendations': [
                    'Increase budget on campaigns with CTR > 5%',
                    "Create lookalike audience from 'High LTV – Africa'",
                ],
            },
            'quick_actions': [
                {'label': 'Create Campaign', 'route': '/marketing-dashboard/campaigns'},
                {'label': 'Create Segment', 'route': '/marketing-dashboard/audience-segmentation'},
                {'label': 'Run A/B Test', 'route': '/marketing-dashboard/ab-testing'},
                {'label': 'Add Domain', 'route': '/marketing-dashboard/seo-domains'},
                {'label': 'Schedule Content', 'route': '/marketing-dashboard/content-distribution'},
            ],
        }

        return Response(overview_payload)
