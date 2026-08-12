# OrcaCloud – Enterprise Module ViewSets
# All views resolve the Organization from the URL slug and gate on ownership / membership.

import logging
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import action
from .serializers import OrgSettingsSerializer
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import GenericViewSet, ModelViewSet
from rest_framework.mixins import (
    ListModelMixin, CreateModelMixin,
    RetrieveModelMixin, UpdateModelMixin, DestroyModelMixin,
)

from .models import (
    Organization, OrganizationMember,
    Department, DepartmentSidebarItem, OrgTeam, OrgGroup,
    EnterpriseSendDomain, EmailSenderIdentity, EnterpriseEmailTemplate, EmailLog,
    OrgDomain, OrgDomainRecord,
    BrandingProfile, BrandAsset,
    EnterprisePlan, Subscription, EnterpriseInvoice,
    EnterpriseAuditLog,
    WikiCategory, WikiPage, WikiPageVersion,
    IntegrationConnection, IntegrationLog, IntegrationWebhookEvent,
    OrgOrder, OrderItem,
    Meeting, MeetingParticipant, MeetingNotification, Announcement,
)
from .serializers import (
    OrganizationSerializer, OrganizationCreateSerializer,
    OrganizationMemberSerializer, InviteMemberSerializer, UpdateMemberRoleSerializer,
    DepartmentSerializer, DepartmentCreateSerializer,
    DepartmentSidebarItemSerializer, DepartmentSidebarBulkSerializer,
    OrgTeamSerializer, OrgTeamCreateSerializer,
    OrgGroupSerializer, OrgGroupCreateSerializer,
    EnterpriseSendDomainSerializer, CreateSendDomainSerializer,
    EmailSenderIdentitySerializer, CreateSenderIdentitySerializer,
    EnterpriseEmailTemplateSerializer,
    EmailLogSerializer,
    OrgDomainSerializer, OrgDomainRecordSerializer, CreateOrgDomainSerializer,
    BrandingProfileSerializer, BrandAssetSerializer,
    EnterprisePlanSerializer, SubscriptionSerializer, EnterpriseInvoiceSerializer,
    EnterpriseAuditLogSerializer,
    WikiCategorySerializer, WikiCategoryWriteSerializer,
    WikiPageListSerializer, WikiPageDetailSerializer,
    WikiPageVersionSerializer, WikiPageWriteSerializer,
    IntegrationConnectionSerializer, IntegrationConnectionWriteSerializer,
    IntegrationLogSerializer, IntegrationWebhookEventSerializer,
    OrgOrderSerializer, OrgOrderWriteSerializer,
    MeetingSerializer, MeetingWriteSerializer,
    MeetingNotificationSerializer,
    AnnouncementSerializer, AnnouncementWriteSerializer,
)

logger = logging.getLogger(__name__)


# ── Shared helpers ────────────────────────────────────────────────────────────

def _get_org(request, org_id: str) -> Organization:
    """Resolve org by ID or slug; assert requester is owner or member."""
    try:
        org = Organization.objects.get(pk=org_id)
    except Organization.DoesNotExist:
        org = get_object_or_404(Organization, slug=org_id)
    # Gate: must be owner or active member
    if org.owner != request.user:
        if not org.members.filter(user=request.user,
                                  status=OrganizationMember.Status.ACTIVE).exists():
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You are not a member of this organization.')
    return org


def _log_action(org: Organization, request, action: str,
                target_type: str = '', target_id: str = '',
                target_label: str = '', metadata: dict | None = None):
    """Write an immutable audit log entry."""
    actor = None
    try:
        actor = org.members.get(user=request.user)
    except OrganizationMember.DoesNotExist:
        pass
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    ip = x_forwarded.split(',')[0] if x_forwarded else request.META.get('REMOTE_ADDR')
    EnterpriseAuditLog.objects.create(
        organization=org,
        actor_member=actor,
        actor_email=request.user.email,
        action=action,
        target_type=target_type,
        target_id=target_id,
        target_label=target_label,
        metadata=metadata or {},
        ip_address=ip,
    )


# ── 1. Organization ───────────────────────────────────────────────────────────

class OrganizationViewSet(
    CreateModelMixin, RetrieveModelMixin, UpdateModelMixin,
    ListModelMixin, GenericViewSet,
):
    """
    GET  /api/enterprise/organizations/          – list orgs you own or are a member of
    POST /api/enterprise/organizations/          – create a new org
    GET  /api/enterprise/organizations/:id/      – detail
    PATCH /api/enterprise/organizations/:id/     – update
    """
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return OrganizationCreateSerializer
        return OrganizationSerializer

    def get_queryset(self):
        user = self.request.user
        owned = Organization.objects.filter(owner=user)
        member_of = Organization.objects.filter(
            members__user=user,
            members__status=OrganizationMember.Status.ACTIVE,
        )
        return (owned | member_of).distinct().order_by('-created_at')

    def create(self, request, *args, **kwargs):
        ser = OrganizationCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        org = Organization.objects.create(owner=request.user, **ser.validated_data)
        # Auto-create OWNER membership
        OrganizationMember.objects.create(
            organization=org,
            user=request.user,
            email=request.user.email,
            name=request.user.get_full_name() or request.user.username,
            role=OrganizationMember.Role.OWNER,
            status=OrganizationMember.Status.ACTIVE,
            joined_at=timezone.now(),
        )
        # Auto-create branding profile
        BrandingProfile.objects.create(organization=org)
        _log_action(org, request, 'ORGANIZATION_CREATED',
                    target_type='ORGANIZATION', target_id=org.id, target_label=org.name)
        return Response(OrganizationSerializer(org).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        org = self.get_object()
        if org.owner != request.user:
            return Response({'error': 'Only the owner can update org settings.'}, status=403)
        partial = kwargs.pop('partial', True)
        ser = OrganizationSerializer(org, data=request.data, partial=partial)
        ser.is_valid(raise_exception=True)
        ser.save()
        _log_action(org, request, 'ORGANIZATION_UPDATED',
                    target_type='ORGANIZATION', target_id=org.id, target_label=org.name)
        return Response(ser.data)

    @action(detail=True, methods=['get', 'put'], url_path='settings')
    def settings(self, request, pk=None):
        """
        GET  /api/enterprise/organizations/:id/settings/  – retrieve org settings
        PUT  /api/enterprise/organizations/:id/settings/  – update org settings
        """
        org = self.get_object()
        if request.method == 'GET':
            return Response(OrgSettingsSerializer(org).data)
        # PUT
        branding_color = request.data.get('branding_primary_color')
        ser = OrgSettingsSerializer(
            org, data=request.data, partial=True,
            context={**self.get_serializer_context(), 'branding_primary_color': branding_color},
        )
        ser.is_valid(raise_exception=True)
        ser.save()
        _log_action(org, request, 'ORGANIZATION_SETTINGS_UPDATED',
                    target_type='ORGANIZATION', target_id=org.id, target_label=org.name)
        return Response(OrgSettingsSerializer(org).data)


# ── 2. Organization Members ───────────────────────────────────────────────────

class OrganizationMemberViewSet(
    ListModelMixin, RetrieveModelMixin, UpdateModelMixin,
    DestroyModelMixin, GenericViewSet,
):
    """
    GET  /api/enterprise/organizations/:orgId/members/       – list
    POST /api/enterprise/organizations/:orgId/members/invite/ – invite
    PATCH /api/enterprise/organizations/:orgId/members/:id/   – update role
    DELETE /api/enterprise/organizations/:orgId/members/:id/  – remove
    """
    permission_classes = [IsAuthenticated]
    serializer_class   = OrganizationMemberSerializer

    def _org(self):
        return _get_org(self.request, self.kwargs['org_pk'])

    def get_queryset(self):
        org = self._org()
        return org.members.select_related('user').order_by('name', 'email')

    @action(detail=False, methods=['post'], url_path='invite')
    def invite(self, request, org_pk=None):
        org = _get_org(request, org_pk)
        ser = InviteMemberSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        email = ser.validated_data['email']
        name  = ser.validated_data['name']
        role  = ser.validated_data['role']

        member, created = OrganizationMember.objects.get_or_create(
            organization=org, email=email,
            defaults={'name': name, 'role': role, 'status': OrganizationMember.Status.INVITED},
        )
        if not created:
            return Response({'error': 'Member already exists.'}, status=400)

        _log_action(org, request, 'MEMBER_INVITED',
                    target_type='MEMBER', target_id=member.id, target_label=email)
        return Response(OrganizationMemberSerializer(member).data, status=201)

    def update(self, request, *args, **kwargs):
        org    = self._org()
        member = self.get_object()
        ser    = UpdateMemberRoleSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        old_role = member.role
        member.role = ser.validated_data['role']
        member.save(update_fields=['role', 'updated_at'])
        _log_action(org, request, 'MEMBER_ROLE_CHANGED',
                    target_type='MEMBER', target_id=member.id, target_label=member.email,
                    metadata={'old_role': old_role, 'new_role': member.role})
        return Response(OrganizationMemberSerializer(member).data)

    def destroy(self, request, *args, **kwargs):
        org    = self._org()
        member = self.get_object()
        if member.role == OrganizationMember.Role.OWNER:
            return Response({'error': 'Cannot remove the organization owner.'}, status=400)
        _log_action(org, request, 'MEMBER_REMOVED',
                    target_type='MEMBER', target_id=member.id,
                    target_label=member.email)
        member.delete()
        return Response(status=204)


# ── 3. Enterprise Send Domains ────────────────────────────────────────────────

class EnterpriseSendDomainViewSet(
    ListModelMixin, CreateModelMixin, RetrieveModelMixin,
    DestroyModelMixin, GenericViewSet,
):
    permission_classes = [IsAuthenticated]
    serializer_class   = EnterpriseSendDomainSerializer

    def _org(self):
        return _get_org(self.request, self.kwargs['org_pk'])

    def get_queryset(self):
        return self._org().send_domains.order_by('-created_at')

    def create(self, request, org_pk=None):
        org = _get_org(request, org_pk)
        ser = CreateSendDomainSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        domain_str = ser.validated_data['domain']

        if org.send_domains.filter(domain=domain_str).exists():
            return Response({'error': 'Domain already registered.'}, status=400)

        obj = EnterpriseSendDomain(
            organization=org,
            domain=domain_str,
            tracking_domain=ser.validated_data.get('tracking_domain', f'track.{domain_str}'),
            selector=ser.validated_data.get('selector', 's1'),
        )
        obj.generate_dns_records()
        obj.save()
        _log_action(org, request, 'EMAIL_DOMAIN_ADDED',
                    target_type='EMAIL_DOMAIN', target_id=obj.id, target_label=domain_str)
        return Response(EnterpriseSendDomainSerializer(obj).data, status=201)

    @action(detail=True, methods=['post'], url_path='check-dns')
    def check_dns(self, request, org_pk=None, pk=None):
        """Trigger a DNS verification check."""
        obj = self.get_object()
        # In production: run actual DNS lookups here.
        # For now, simulate: if records are non-empty mark as VERIFIED.
        if obj.dkim_record and obj.spf_record:
            obj.status = EnterpriseSendDomain.Status.VERIFIED
        else:
            obj.status = EnterpriseSendDomain.Status.FAILED
        obj.last_checked_at = timezone.now()
        obj.save(update_fields=['status', 'last_checked_at', 'updated_at'])
        return Response(EnterpriseSendDomainSerializer(obj).data)


# ── 4. Email Sender Identities ────────────────────────────────────────────────

class EmailSenderIdentityViewSet(
    ListModelMixin, CreateModelMixin, DestroyModelMixin, GenericViewSet,
):
    permission_classes = [IsAuthenticated]
    serializer_class   = EmailSenderIdentitySerializer

    def _org(self):
        return _get_org(self.request, self.kwargs['org_pk'])

    def get_queryset(self):
        return self._org().sender_identities.order_by('-created_at')

    def create(self, request, org_pk=None):
        org = _get_org(request, org_pk)
        ser = CreateSenderIdentitySerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        email_str = ser.validated_data['email']

        if org.sender_identities.filter(email=email_str).exists():
            return Response({'error': 'Sender identity already exists.'}, status=400)

        import secrets
        identity = EmailSenderIdentity.objects.create(
            organization=org,
            email=email_str,
            name=ser.validated_data['name'],
            verify_token=secrets.token_urlsafe(32),
        )
        # In production: send verification email with token link.
        _log_action(org, request, 'SENDER_IDENTITY_ADDED',
                    target_type='SENDER', target_id=identity.id, target_label=email_str)
        return Response(EmailSenderIdentitySerializer(identity).data, status=201)

    @action(detail=True, methods=['post'], url_path='verify')
    def verify(self, request, org_pk=None, pk=None):
        """Mark a sender identity as verified (token flow simulated)."""
        identity = self.get_object()
        identity.verified    = True
        identity.verified_at = timezone.now()
        identity.save(update_fields=['verified', 'verified_at', 'updated_at'])
        return Response(EmailSenderIdentitySerializer(identity).data)


# ── 5. Email Templates ────────────────────────────────────────────────────────

class EnterpriseEmailTemplateViewSet(ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class   = EnterpriseEmailTemplateSerializer

    def _org(self):
        return _get_org(self.request, self.kwargs['org_pk'])

    def get_queryset(self):
        return self._org().email_templates.order_by('-created_at')

    def perform_create(self, serializer):
        org = _get_org(self.request, self.kwargs['org_pk'])
        # Resolve current member
        try:
            member = org.members.get(user=self.request.user)
        except OrganizationMember.DoesNotExist:
            member = None
        instance = serializer.save(organization=org, created_by=member)
        _log_action(org, self.request, 'EMAIL_TEMPLATE_CREATED',
                    target_type='TEMPLATE', target_id=instance.id,
                    target_label=instance.name)

    def perform_update(self, serializer):
        instance = serializer.save()
        org = instance.organization
        _log_action(org, self.request, 'EMAIL_TEMPLATE_UPDATED',
                    target_type='TEMPLATE', target_id=instance.id,
                    target_label=instance.name)

    def perform_destroy(self, instance):
        org = instance.organization
        _log_action(org, self.request, 'EMAIL_TEMPLATE_DELETED',
                    target_type='TEMPLATE', target_id=instance.id,
                    target_label=instance.name)
        instance.delete()


# ── 6. Email Logs ─────────────────────────────────────────────────────────────

class EmailLogViewSet(ListModelMixin, RetrieveModelMixin, GenericViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class   = EmailLogSerializer

    def get_queryset(self):
        org = _get_org(self.request, self.kwargs['org_pk'])
        qs  = org.email_logs.order_by('-created_at')
        status_f = self.request.query_params.get('status')
        if status_f:
            qs = qs.filter(status=status_f.upper())
        campaign_f = self.request.query_params.get('campaign_id')
        if campaign_f:
            qs = qs.filter(campaign_id=campaign_f)
        return qs[:500]  # cap at 500


# ── 7. Organization Domains ───────────────────────────────────────────────────

class OrgDomainViewSet(
    ListModelMixin, CreateModelMixin, RetrieveModelMixin,
    UpdateModelMixin, DestroyModelMixin, GenericViewSet,
):
    permission_classes = [IsAuthenticated]
    serializer_class   = OrgDomainSerializer

    def _org(self):
        return _get_org(self.request, self.kwargs['org_pk'])

    def get_queryset(self):
        return self._org().org_domains.prefetch_related('records').order_by('-created_at')

    def create(self, request, org_pk=None):
        org = _get_org(request, org_pk)
        ser = CreateOrgDomainSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        if org.org_domains.filter(name=ser.validated_data['name']).exists():
            return Response({'error': 'Domain already registered.'}, status=400)

        dom = OrgDomain.objects.create(organization=org, **ser.validated_data)
        _log_action(org, request, 'DOMAIN_ADDED',
                    target_type='DOMAIN', target_id=dom.id, target_label=dom.name)
        return Response(OrgDomainSerializer(dom).data, status=201)

    @action(detail=True, methods=['get'], url_path='records')
    def records(self, request, org_pk=None, pk=None):
        dom     = self.get_object()
        records = dom.records.all()
        return Response(OrgDomainRecordSerializer(records, many=True).data)

    @action(detail=True, methods=['post'], url_path='activate')
    def activate(self, request, org_pk=None, pk=None):
        """Mark domain as ACTIVE (DNS verified)."""
        dom        = self.get_object()
        dom.status = OrgDomain.Status.ACTIVE
        dom.save(update_fields=['status', 'updated_at'])
        org = dom.organization
        _log_action(org, request, 'DOMAIN_ACTIVATED',
                    target_type='DOMAIN', target_id=dom.id, target_label=dom.name)
        return Response(OrgDomainSerializer(dom).data)


# ── 8. Branding ───────────────────────────────────────────────────────────────

class BrandingProfileViewSet(RetrieveModelMixin, UpdateModelMixin, GenericViewSet):
    """
    GET  /api/enterprise/organizations/:orgId/branding/profile/ – retrieve
    PATCH /api/enterprise/organizations/:orgId/branding/profile/ – update
    """
    permission_classes = [IsAuthenticated]
    serializer_class   = BrandingProfileSerializer

    def _org(self):
        return _get_org(self.request, self.kwargs['org_pk'])

    def get_object(self):
        org = self._org()
        profile, _ = BrandingProfile.objects.get_or_create(organization=org)
        return profile

    @action(detail=False, methods=['get', 'patch'], url_path='profile')
    def profile(self, request, org_pk=None):
        obj = self.get_object()
        if request.method == 'PATCH':
            ser = BrandingProfileSerializer(obj, data=request.data, partial=True)
            ser.is_valid(raise_exception=True)
            ser.save()
            org = obj.organization
            _log_action(org, request, 'BRANDING_UPDATED',
                        target_type='BRANDING', target_id=obj.id)
            return Response(ser.data)
        return Response(BrandingProfileSerializer(obj).data)


class BrandAssetViewSet(
    ListModelMixin, CreateModelMixin, DestroyModelMixin, GenericViewSet,
):
    permission_classes = [IsAuthenticated]
    serializer_class   = BrandAssetSerializer

    def _branding(self):
        org = _get_org(self.request, self.kwargs['org_pk'])
        profile, _ = BrandingProfile.objects.get_or_create(organization=org)
        return profile

    def get_queryset(self):
        return self._branding().assets.order_by('-created_at')

    def create(self, request, org_pk=None):
        profile = self._branding()
        ser     = BrandAssetSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        asset   = ser.save(branding_profile=profile)
        _log_action(profile.organization, request, 'BRAND_ASSET_UPLOADED',
                    target_type='BRAND_ASSET', target_id=asset.id, target_label=asset.label)
        return Response(BrandAssetSerializer(asset).data, status=201)


# ── 9. Enterprise Plans ───────────────────────────────────────────────────────

class EnterprisePlanViewSet(ListModelMixin, RetrieveModelMixin, GenericViewSet):
    """Public list of available enterprise plans."""
    permission_classes = [IsAuthenticated]
    serializer_class   = EnterprisePlanSerializer

    def get_queryset(self):
        return EnterprisePlan.objects.filter(is_active=True).order_by('price_monthly')


# ── 10. Subscription ──────────────────────────────────────────────────────────

class SubscriptionViewSet(RetrieveModelMixin, UpdateModelMixin, GenericViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class   = SubscriptionSerializer

    def _org(self):
        return _get_org(self.request, self.kwargs['org_pk'])

    def get_object(self):
        org = self._org()
        sub, created = Subscription.objects.get_or_create(organization=org)
        return sub

    @action(detail=False, methods=['get'], url_path='current')
    def current(self, request, org_pk=None):
        sub = self.get_object()
        return Response(SubscriptionSerializer(sub).data)

    @action(detail=False, methods=['post'], url_path='change-plan')
    def change_plan(self, request, org_pk=None):
        org     = _get_org(request, org_pk)
        plan_id = request.data.get('plan_id')
        plan    = get_object_or_404(EnterprisePlan, pk=plan_id, is_active=True)
        sub     = self.get_object()
        old_plan = sub.plan.name if sub.plan else 'None'
        sub.plan   = plan
        sub.status = Subscription.Status.ACTIVE
        sub.save(update_fields=['plan', 'status', 'updated_at'])
        _log_action(org, request, 'SUBSCRIPTION_PLAN_CHANGED',
                    target_type='SUBSCRIPTION', target_id=sub.id,
                    metadata={'old_plan': old_plan, 'new_plan': plan.name})
        return Response(SubscriptionSerializer(sub).data)


# ── 11. Enterprise Invoices ───────────────────────────────────────────────────

class EnterpriseInvoiceViewSet(ListModelMixin, RetrieveModelMixin, GenericViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class   = EnterpriseInvoiceSerializer

    def get_queryset(self):
        org = _get_org(self.request, self.kwargs['org_pk'])
        return org.enterprise_invoices.order_by('-created_at')


# ── 12. Audit Logs ────────────────────────────────────────────────────────────

class EnterpriseAuditLogViewSet(ListModelMixin, RetrieveModelMixin, GenericViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class   = EnterpriseAuditLogSerializer

    def get_queryset(self):
        org = _get_org(self.request, self.kwargs['org_pk'])
        qs  = org.audit_logs.order_by('-timestamp')
        # Filters
        actor  = self.request.query_params.get('actor')
        action = self.request.query_params.get('action')
        target = self.request.query_params.get('target_type')
        since  = self.request.query_params.get('since')   # ISO date
        until  = self.request.query_params.get('until')
        if actor:
            qs = qs.filter(actor_email__icontains=actor)
        if action:
            qs = qs.filter(action__icontains=action)
        if target:
            qs = qs.filter(target_type__iexact=target)
        if since:
            qs = qs.filter(timestamp__date__gte=since)
        if until:
            qs = qs.filter(timestamp__date__lte=until)
        return qs[:1000]


# ── Enterprise Entry ──────────────────────────────────────────────────────────

class EnterpriseEntryView(APIView):
    """
    GET /api/enterprise/entry/
    Returns the first org the user owns or is a member of.
    Frontend uses this to decide: go to org dashboard OR create-org flow.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        org = (
            Organization.objects.filter(owner=user).first()
            or Organization.objects.filter(
                members__user=user,
                members__status=OrganizationMember.Status.ACTIVE,
            ).first()
        )
        if not org:
            return Response({'has_org': False, 'org': None})
        return Response({'has_org': True, 'org': OrganizationSerializer(org).data})


# ── 13. Department ────────────────────────────────────────────────────────────

class DepartmentViewSet(
    ListModelMixin, CreateModelMixin, RetrieveModelMixin,
    UpdateModelMixin, DestroyModelMixin, GenericViewSet,
):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        return DepartmentSerializer

    def get_queryset(self):
        org = _get_org(self.request, self.kwargs['org_pk'])
        return org.departments.prefetch_related('teams__groups').order_by('name')

    def create(self, request, *args, **kwargs):
        org = _get_org(request, self.kwargs['org_pk'])
        ser = DepartmentCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data
        parent_id = d.pop('parent', '') or None
        parent = Department.objects.filter(pk=parent_id, organization=org).first() if parent_id else None
        dept = Department.objects.create(organization=org, parent=parent, **d)
        _log_action(org, request, 'DEPARTMENT_CREATED',
                    target_type='DEPARTMENT', target_id=dept.id, target_label=dept.name)
        return Response(DepartmentSerializer(dept).data, status=status.HTTP_201_CREATED)


# ── 14. Department Sidebar ────────────────────────────────────────────────────

class DepartmentSidebarViewSet(
    ListModelMixin, CreateModelMixin, UpdateModelMixin,
    DestroyModelMixin, GenericViewSet,
):
    permission_classes = [IsAuthenticated]
    serializer_class   = DepartmentSidebarItemSerializer

    def _get_dept(self):
        org  = _get_org(self.request, self.kwargs['org_pk'])
        return get_object_or_404(Department, pk=self.kwargs['dept_pk'], organization=org)

    def get_queryset(self):
        dept = self._get_dept()
        return dept.sidebar_items.order_by('order_index')

    @action(detail=False, methods=['post'], url_path='bulk')
    def bulk_set(self, request, **kwargs):
        dept = self._get_dept()
        ser  = DepartmentSidebarBulkSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        dept.sidebar_items.all().delete()
        items = [
            DepartmentSidebarItem(department=dept, **item)
            for item in ser.validated_data['items']
        ]
        DepartmentSidebarItem.objects.bulk_create(items)
        return Response(DepartmentSidebarItemSerializer(
            dept.sidebar_items.order_by('order_index'), many=True).data)


# ── 15. OrgTeam ───────────────────────────────────────────────────────────────

class OrgTeamViewSet(
    ListModelMixin, CreateModelMixin, RetrieveModelMixin,
    UpdateModelMixin, DestroyModelMixin, GenericViewSet,
):
    permission_classes = [IsAuthenticated]
    serializer_class   = OrgTeamSerializer

    def _get_dept(self):
        org = _get_org(self.request, self.kwargs['org_pk'])
        return get_object_or_404(Department, pk=self.kwargs['dept_pk'], organization=org)

    def get_queryset(self):
        dept = self._get_dept()
        return dept.teams.prefetch_related('groups').order_by('name')

    def create(self, request, *args, **kwargs):
        dept = self._get_dept()
        ser  = OrgTeamCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        team = OrgTeam.objects.create(department=dept, **ser.validated_data)
        org  = dept.organization
        _log_action(org, request, 'TEAM_CREATED',
                    target_type='TEAM', target_id=team.id, target_label=team.name)
        return Response(OrgTeamSerializer(team).data, status=status.HTTP_201_CREATED)


# ── 16. OrgGroup ──────────────────────────────────────────────────────────────

class OrgGroupViewSet(
    ListModelMixin, CreateModelMixin, RetrieveModelMixin,
    UpdateModelMixin, DestroyModelMixin, GenericViewSet,
):
    permission_classes = [IsAuthenticated]
    serializer_class   = OrgGroupSerializer

    def _get_team(self):
        org  = _get_org(self.request, self.kwargs['org_pk'])
        dept = get_object_or_404(Department, pk=self.kwargs['dept_pk'], organization=org)
        return get_object_or_404(OrgTeam, pk=self.kwargs['team_pk'], department=dept)

    def get_queryset(self):
        team = self._get_team()
        return team.groups.order_by('name')

    def create(self, request, *args, **kwargs):
        team = self._get_team()
        ser  = OrgGroupCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        grp  = OrgGroup.objects.create(team=team, **ser.validated_data)
        org  = team.department.organization
        _log_action(org, request, 'GROUP_CREATED',
                    target_type='GROUP', target_id=grp.id, target_label=grp.name)
        return Response(OrgGroupSerializer(grp).data, status=status.HTTP_201_CREATED)


# ── 17. Wiki ──────────────────────────────────────────────────────────────────

class WikiCategoryViewSet(
    ListModelMixin, CreateModelMixin, RetrieveModelMixin,
    UpdateModelMixin, DestroyModelMixin, GenericViewSet,
):
    permission_classes = [IsAuthenticated]
    serializer_class   = WikiCategorySerializer

    def get_queryset(self):
        org = _get_org(self.request, self.kwargs['org_pk'])
        return org.wiki_categories.order_by('name')

    def create(self, request, *args, **kwargs):
        org = _get_org(request, self.kwargs['org_pk'])
        ser = WikiCategoryWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        cat = WikiCategory.objects.create(organization=org, **ser.validated_data)
        return Response(WikiCategorySerializer(cat).data, status=status.HTTP_201_CREATED)


class WikiPageViewSet(
    ListModelMixin, CreateModelMixin, RetrieveModelMixin,
    UpdateModelMixin, DestroyModelMixin, GenericViewSet,
):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return WikiPageDetailSerializer
        return WikiPageListSerializer

    def get_queryset(self):
        org = _get_org(self.request, self.kwargs['org_pk'])
        qs  = org.wiki_pages.prefetch_related('categories').order_by('-created_at')
        q = self.request.query_params.get('q')
        pinned = self.request.query_params.get('pinned')
        module = self.request.query_params.get('module')
        if q:
            qs = qs.filter(title__icontains=q)
        if pinned == 'true':
            qs = qs.filter(is_pinned=True)
        if module:
            qs = qs.filter(linked_module=module)
        return qs

    def create(self, request, *args, **kwargs):
        org = _get_org(request, self.kwargs['org_pk'])
        ser = WikiPageWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data
        category_ids = d.pop('category_ids', [])
        version_note = d.pop('version_note', '')
        if not d.get('slug'):
            from django.utils.text import slugify
            d['slug'] = slugify(d['title'])[:255] or 'page'
        page = WikiPage.objects.create(organization=org, created_by=request.user,
                                       updated_by=request.user, **d)
        if category_ids:
            cats = WikiCategory.objects.filter(pk__in=category_ids, organization=org)
            page.categories.set(cats)
        WikiPageVersion.objects.create(page=page, title=page.title, content=page.content,
                                       edited_by=request.user, version_note=version_note)
        return Response(WikiPageDetailSerializer(page).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        page = self.get_object()
        ser  = WikiPageWriteSerializer(data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data
        category_ids = d.pop('category_ids', None)
        version_note = d.pop('version_note', '')
        for attr, val in d.items():
            setattr(page, attr, val)
        page.updated_by = request.user
        page.save()
        if category_ids is not None:
            org  = _get_org(request, self.kwargs['org_pk'])
            cats = WikiCategory.objects.filter(pk__in=category_ids, organization=org)
            page.categories.set(cats)
        if d.get('content') is not None:
            WikiPageVersion.objects.create(page=page, title=page.title, content=page.content,
                                           edited_by=request.user, version_note=version_note)
        return Response(WikiPageDetailSerializer(page).data)


# ── 18. Integrations ──────────────────────────────────────────────────────────

class IntegrationConnectionViewSet(
    ListModelMixin, CreateModelMixin, RetrieveModelMixin,
    UpdateModelMixin, DestroyModelMixin, GenericViewSet,
):
    permission_classes = [IsAuthenticated]
    serializer_class   = IntegrationConnectionSerializer

    def get_queryset(self):
        org = _get_org(self.request, self.kwargs['org_pk'])
        return org.integrations.order_by('provider')

    def create(self, request, *args, **kwargs):
        import secrets
        org = _get_org(request, self.kwargs['org_pk'])
        ser = IntegrationConnectionWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data
        creds = d.pop('credentials', {})
        conn  = IntegrationConnection.objects.create(
            organization=org, connected_by=request.user,
            webhook_secret=secrets.token_hex(24),
            credentials=creds, **d,
        )
        _log_action(org, request, 'INTEGRATION_CONNECTED',
                    target_type='INTEGRATION', target_id=conn.id,
                    target_label=conn.provider)
        return Response(IntegrationConnectionSerializer(conn).data,
                        status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def logs(self, request, **kwargs):
        conn = self.get_object()
        logs = conn.logs.order_by('-timestamp')[:200]
        return Response(IntegrationLogSerializer(logs, many=True).data)


class IntegrationWebhookView(APIView):
    """Receive inbound webhooks from external providers."""
    authentication_classes = []
    permission_classes     = []

    def post(self, request, org_pk, integration_pk):
        conn = get_object_or_404(IntegrationConnection, pk=integration_pk)
        IntegrationWebhookEvent.objects.create(
            connection=conn,
            provider=conn.provider,
            event_type=request.headers.get('X-Event-Type', 'unknown'),
            event_id=request.headers.get('X-Event-Id', ''),
            payload=request.data,
        )
        return Response({'received': True})


# ── 19. Orders ────────────────────────────────────────────────────────────────

class OrgOrderViewSet(
    ListModelMixin, CreateModelMixin, RetrieveModelMixin,
    UpdateModelMixin, GenericViewSet,
):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return OrgOrderWriteSerializer
        return OrgOrderSerializer

    def get_queryset(self):
        org = _get_org(self.request, self.kwargs['org_pk'])
        return org.orders.prefetch_related('items').order_by('-created_at')

    def create(self, request, *args, **kwargs):
        org = _get_org(request, self.kwargs['org_pk'])
        ser = OrgOrderWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        order = ser.save(organization=org)
        return Response(OrgOrderSerializer(order).data, status=status.HTTP_201_CREATED)


# ── 20. Meetings ─────────────────────────────────────────────────────────────

class MeetingViewSet(
    ListModelMixin, CreateModelMixin, RetrieveModelMixin,
    UpdateModelMixin, DestroyModelMixin, GenericViewSet,
):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return MeetingWriteSerializer
        return MeetingSerializer

    def get_queryset(self):
        org = _get_org(self.request, self.kwargs['org_pk'])
        qs  = org.meetings.prefetch_related('participants').order_by('-start_time')
        dept = self.request.query_params.get('department')
        if dept:
            qs = qs.filter(department_id=dept)
        return qs

    def create(self, request, *args, **kwargs):
        org = _get_org(request, self.kwargs['org_pk'])
        ser = MeetingWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        meeting = ser.save(organization=org, created_by=request.user)
        _log_action(org, request, 'MEETING_CREATED',
                    target_type='MEETING', target_id=meeting.id, target_label=meeting.title)
        return Response(MeetingSerializer(meeting).data, status=status.HTTP_201_CREATED)


# ── 21. Meeting Notifications ────────────────────────────────────────────────

class MeetingNotificationViewSet(
    ListModelMixin, UpdateModelMixin, GenericViewSet,
):
    permission_classes = [IsAuthenticated]
    serializer_class   = MeetingNotificationSerializer

    def get_queryset(self):
        _get_org(self.request, self.kwargs['org_pk'])
        return MeetingNotification.objects.filter(
            user=self.request.user,
        ).select_related('meeting').order_by('-sent_at')

    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_read(self, request, **kwargs):
        _get_org(request, self.kwargs['org_pk'])
        MeetingNotification.objects.filter(
            user=request.user, is_read=False,
        ).update(is_read=True)
        return Response({'marked': True})


# ── 22. Announcements ────────────────────────────────────────────────────────

class AnnouncementViewSet(
    ListModelMixin, CreateModelMixin, RetrieveModelMixin,
    UpdateModelMixin, DestroyModelMixin, GenericViewSet,
):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return AnnouncementWriteSerializer
        return AnnouncementSerializer

    def get_queryset(self):
        org  = _get_org(self.request, self.kwargs['org_pk'])
        qs   = org.announcements.order_by('-is_pinned', '-created_at')
        dept = self.request.query_params.get('department')
        if dept:
            qs = qs.filter(department_id=dept)
        return qs

    def create(self, request, *args, **kwargs):
        org = _get_org(request, self.kwargs['org_pk'])
        ser = AnnouncementWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        ann = ser.save(organization=org, created_by=request.user)
        _log_action(org, request, 'ANNOUNCEMENT_CREATED',
                    target_type='ANNOUNCEMENT', target_id=ann.id, target_label=ann.title)
        return Response(AnnouncementSerializer(ann).data, status=status.HTTP_201_CREATED)
