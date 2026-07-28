# OrcaCloud – Enterprise Module Serializers

from rest_framework import serializers
from .models import (
    Organization, OrganizationMember,
    Department, OrgTeam, OrgGroup, DepartmentSidebarItem,
    EnterpriseSendDomain, EmailSenderIdentity, EnterpriseEmailTemplate, EmailLog,
    OrgDomain, OrgDomainRecord,
    BrandingProfile, BrandAsset,
    EnterprisePlan, Subscription, EnterpriseInvoice,
    EnterpriseAuditLog,
    WikiCategory, WikiPage, WikiPageVersion,
    IntegrationConnection, IntegrationLog, IntegrationWebhookEvent,
    OrgOrder, OrderItem,
)


# ── Organization ──────────────────────────────────────────────────────────────

class OrganizationSerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()

    class Meta:
        model  = Organization
        fields = [
            'id', 'name', 'slug', 'primary_domain', 'industry', 'country',
            'plan', 'status', 'member_count', 'contact_email', 'domain_email',
            'logo_url', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'member_count']

    def get_member_count(self, obj):
        return obj.members.filter(status=OrganizationMember.Status.ACTIVE).count()


class OrganizationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Organization
        fields = ['name', 'slug', 'primary_domain', 'industry', 'country',
                  'contact_email', 'domain_email', 'logo_url']


class OrgSettingsSerializer(serializers.ModelSerializer):
    branding_primary_color = serializers.SerializerMethodField()

    class Meta:
        model  = Organization
        fields = [
            'language', 'timezone', 'default_department',
            'notifications_billing', 'notifications_security', 'notifications_usage',
            'notification_slack_webhook', 'branding_primary_color',
        ]

    def get_branding_primary_color(self, obj):
        try:
            return obj.branding.primary_color
        except Exception:
            return '#153d75'

    def update(self, instance, validated_data):
        branding_color = self.context.get('branding_primary_color')
        if branding_color:
            try:
                instance.branding.primary_color = branding_color
                instance.branding.save(update_fields=['primary_color'])
            except Exception:
                pass
        return super().update(instance, validated_data)


# ── Organization Member ───────────────────────────────────────────────────────

class OrganizationMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model  = OrganizationMember
        fields = [
            'id', 'organization', 'email', 'name', 'role', 'status',
            'permissions', 'joined_at', 'invited_at', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'organization', 'invited_at', 'joined_at',
                            'created_at', 'updated_at']


class InviteMemberSerializer(serializers.Serializer):
    email = serializers.EmailField()
    name  = serializers.CharField(max_length=255, required=False, default='')
    role  = serializers.ChoiceField(choices=OrganizationMember.Role.choices,
                                    default=OrganizationMember.Role.MEMBER)


class UpdateMemberRoleSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=OrganizationMember.Role.choices)


# ── Hierarchy: Department → Team → Group ──────────────────────────────────────

class OrgGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model  = OrgGroup
        fields = ['id', 'team', 'name', 'description', 'created_at', 'updated_at']
        read_only_fields = ['id', 'team', 'created_at', 'updated_at']


class OrgTeamSerializer(serializers.ModelSerializer):
    groups = OrgGroupSerializer(many=True, read_only=True)

    class Meta:
        model  = OrgTeam
        fields = ['id', 'department', 'name', 'description', 'team_type', 'groups', 'created_at', 'updated_at']
        read_only_fields = ['id', 'department', 'created_at', 'updated_at']


class DepartmentSerializer(serializers.ModelSerializer):
    teams = OrgTeamSerializer(many=True, read_only=True)

    class Meta:
        model  = Department
        fields = [
            'id', 'organization', 'name', 'category', 'description',
            'department_lead', 'parent', 'teams', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'organization', 'created_at', 'updated_at']


# ── Create helpers (write-only, no nested expansions) ─────────────────────────

class DepartmentCreateSerializer(serializers.Serializer):
    name            = serializers.CharField(max_length=255)
    category        = serializers.CharField(required=False, default='', allow_blank=True)
    description     = serializers.CharField(required=False, default='', allow_blank=True)
    department_lead = serializers.CharField(required=False, default='', allow_blank=True)
    parent          = serializers.CharField(required=False, default='', allow_blank=True)


# ── Department Sidebar ────────────────────────────────────────────────────────

class DepartmentSidebarItemSerializer(serializers.ModelSerializer):
    class Meta:
        model  = DepartmentSidebarItem
        fields = [
            'id', 'item_type', 'label', 'url', 'icon',
            'order_index', 'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class DepartmentSidebarItemWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model  = DepartmentSidebarItem
        fields = ['item_type', 'label', 'url', 'icon', 'order_index', 'is_active']


class DepartmentSidebarBulkSerializer(serializers.Serializer):
    """Accepts a list of items to set/replace the full sidebar configuration."""
    items = DepartmentSidebarItemWriteSerializer(many=True)


class OrgTeamCreateSerializer(serializers.Serializer):
    name        = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, default='', allow_blank=True)
    team_type   = serializers.ChoiceField(choices=OrgTeam.TeamType.choices,
                                          default=OrgTeam.TeamType.SQUAD)


class OrgGroupCreateSerializer(serializers.Serializer):
    name        = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, default='', allow_blank=True)


# ── Enterprise Send Domain ────────────────────────────────────────────────────

class EnterpriseSendDomainSerializer(serializers.ModelSerializer):
    class Meta:
        model  = EnterpriseSendDomain
        fields = [
            'id', 'organization', 'domain', 'status', 'dkim_record',
            'spf_record', 'tracking_domain', 'selector',
            'last_checked_at', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'organization', 'status', 'dkim_record', 'spf_record',
            'last_checked_at', 'created_at', 'updated_at',
        ]


class CreateSendDomainSerializer(serializers.Serializer):
    domain          = serializers.CharField(max_length=253)
    tracking_domain = serializers.CharField(max_length=253, required=False, default='')
    selector        = serializers.CharField(max_length=64, required=False, default='s1')


# ── Email Sender Identity ─────────────────────────────────────────────────────

class EmailSenderIdentitySerializer(serializers.ModelSerializer):
    class Meta:
        model  = EmailSenderIdentity
        fields = [
            'id', 'organization', 'email', 'name', 'verified',
            'verified_at', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'organization', 'verified', 'verified_at',
                            'verify_token', 'created_at', 'updated_at']


class CreateSenderIdentitySerializer(serializers.Serializer):
    email = serializers.EmailField()
    name  = serializers.CharField(max_length=255)


# ── Email Template ────────────────────────────────────────────────────────────

class EnterpriseEmailTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = EnterpriseEmailTemplate
        fields = [
            'id', 'organization', 'name', 'subject', 'html_body',
            'text_body', 'variables', 'created_by',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'organization', 'created_at', 'updated_at']


# ── Email Log ─────────────────────────────────────────────────────────────────

class EmailLogSerializer(serializers.ModelSerializer):
    class Meta:
        model  = EmailLog
        fields = [
            'id', 'organization', 'campaign_id', 'to_email', 'from_email',
            'subject', 'status', 'provider_message_id', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'organization', 'created_at', 'updated_at']


# ── Org Domain ───────────────────────────────────────────────────────────────

class OrgDomainRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model  = OrgDomainRecord
        fields = [
            'id', 'domain', 'type', 'name', 'value', 'ttl',
            'managed_by_platform', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'domain', 'created_at', 'updated_at']


class OrgDomainSerializer(serializers.ModelSerializer):
    records      = OrgDomainRecordSerializer(many=True, read_only=True)
    record_count = serializers.SerializerMethodField()

    class Meta:
        model  = OrgDomain
        fields = [
            'id', 'organization', 'name', 'type', 'status',
            'linked_apps', 'record_count', 'records',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'organization', 'created_at', 'updated_at']

    def get_record_count(self, obj):
        return obj.records.count()


class CreateOrgDomainSerializer(serializers.Serializer):
    name       = serializers.CharField(max_length=253)
    type       = serializers.ChoiceField(choices=OrgDomain.Type.choices,
                                         default=OrgDomain.Type.MIXED)


# ── Branding ──────────────────────────────────────────────────────────────────

class BrandAssetSerializer(serializers.ModelSerializer):
    class Meta:
        model  = BrandAsset
        fields = [
            'id', 'branding_profile', 'type', 'url', 'label',
            'file_size_bytes', 'mime_type', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'branding_profile', 'created_at', 'updated_at']


class BrandingProfileSerializer(serializers.ModelSerializer):
    assets = BrandAssetSerializer(many=True, read_only=True)

    class Meta:
        model  = BrandingProfile
        fields = [
            'id', 'organization', 'name',
            'primary_color', 'secondary_color', 'accent_color',
            'logo_url', 'favicon_url', 'font_family', 'custom_css',
            'assets', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'organization', 'created_at', 'updated_at']


# ── Enterprise Plan & Subscription ───────────────────────────────────────────

class EnterprisePlanSerializer(serializers.ModelSerializer):
    class Meta:
        model  = EnterprisePlan
        fields = [
            'id', 'name', 'price_monthly', 'price_yearly',
            'limits', 'features', 'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SubscriptionSerializer(serializers.ModelSerializer):
    plan = EnterprisePlanSerializer(read_only=True)

    class Meta:
        model  = Subscription
        fields = [
            'id', 'organization', 'plan', 'status', 'renewal_date',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'organization', 'created_at', 'updated_at']


class EnterpriseInvoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model  = EnterpriseInvoice
        fields = [
            'id', 'organization', 'amount', 'currency', 'status',
            'period_start', 'period_end', 'pdf_url',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'organization', 'created_at', 'updated_at']


# ── Orders ───────────────────────────────────────────────────────────────────

class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model  = OrderItem
        fields = ['id', 'product', 'quantity', 'unit_price', 'total_price']
        read_only_fields = ['id', 'total_price']


class OrgOrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model  = OrgOrder
        fields = [
            'id', 'order_number', 'status', 'total_amount', 'currency',
            'notes', 'items', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'order_number', 'created_at', 'updated_at']


class OrgOrderWriteSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True)

    class Meta:
        model  = OrgOrder
        fields = ['status', 'total_amount', 'currency', 'notes', 'items']

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        order = OrgOrder.objects.create(**validated_data)
        for item in items_data:
            OrderItem.objects.create(order=order, **item)
        return order

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        if items_data is not None:
            instance.items.all().delete()
            for item in items_data:
                OrderItem.objects.create(order=instance, **item)
        return instance


# ── Audit Log ────────────────────────────────────────────────────────────────

class EnterpriseAuditLogSerializer(serializers.ModelSerializer):
    actor_name  = serializers.SerializerMethodField()

    class Meta:
        model  = EnterpriseAuditLog
        fields = [
            'id', 'organization', 'actor_member', 'actor_email', 'actor_name',
            'action', 'target_type', 'target_id', 'target_label',
            'metadata', 'ip_address', 'timestamp',
        ]
        read_only_fields = [
            'id', 'organization', 'actor_member', 'actor_email',
            'action', 'target_type', 'target_id', 'target_label',
            'metadata', 'ip_address', 'timestamp',
        ]

    def get_actor_name(self, obj):
        if obj.actor_member:
            return obj.actor_member.name or obj.actor_member.email
        return obj.actor_email or 'System'


# ── Wiki ─────────────────────────────────────────────────────────────────────

class WikiCategorySerializer(serializers.ModelSerializer):
    page_count = serializers.SerializerMethodField()

    class Meta:
        model  = WikiCategory
        fields = ['id', 'organization', 'name', 'color', 'description',
                  'page_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'organization', 'page_count', 'created_at', 'updated_at']

    def get_page_count(self, obj):
        return obj.pages.count()


class WikiPageListSerializer(serializers.ModelSerializer):
    """Compact serializer for list views (no content body)."""
    categories   = WikiCategorySerializer(many=True, read_only=True)
    created_by_name = serializers.SerializerMethodField()
    updated_by_name = serializers.SerializerMethodField()

    class Meta:
        model  = WikiPage
        fields = [
            'id', 'organization', 'title', 'slug', 'summary',
            'is_pinned', 'view_count', 'tags', 'categories',
            'linked_module', 'created_by_name', 'updated_by_name',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'organization', 'view_count', 'created_at', 'updated_at']

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return ''

    def get_updated_by_name(self, obj):
        if obj.updated_by:
            return obj.updated_by.get_full_name() or obj.updated_by.username
        return ''


class WikiPageDetailSerializer(WikiPageListSerializer):
    """Full serializer including markdown content."""

    class Meta(WikiPageListSerializer.Meta):
        fields = WikiPageListSerializer.Meta.fields + ['content']


class WikiPageVersionSerializer(serializers.ModelSerializer):
    edited_by_name = serializers.SerializerMethodField()

    class Meta:
        model  = WikiPageVersion
        fields = ['id', 'page', 'title', 'content', 'edited_by_name',
                  'edited_at', 'version_note']
        read_only_fields = ['id', 'page', 'edited_at']

    def get_edited_by_name(self, obj):
        if obj.edited_by:
            return obj.edited_by.get_full_name() or obj.edited_by.username
        return 'System'


class WikiPageWriteSerializer(serializers.Serializer):
    title         = serializers.CharField(max_length=255)
    slug          = serializers.SlugField(max_length=255, required=False, allow_blank=True)
    content       = serializers.CharField(required=False, default='', allow_blank=True)
    summary       = serializers.CharField(max_length=500, required=False,
                                          default='', allow_blank=True)
    is_pinned     = serializers.BooleanField(required=False, default=False)
    tags          = serializers.ListField(
                        child=serializers.CharField(max_length=50),
                        required=False, default=list)
    category_ids  = serializers.ListField(
                        child=serializers.CharField(max_length=36),
                        required=False, default=list)
    linked_module = serializers.CharField(max_length=50, required=False,
                                          default='', allow_blank=True)
    version_note  = serializers.CharField(max_length=255, required=False,
                                          default='', allow_blank=True)


class WikiCategoryWriteSerializer(serializers.Serializer):
    name        = serializers.CharField(max_length=120)
    color       = serializers.CharField(max_length=20, required=False, default='#3b82f6')
    description = serializers.CharField(required=False, default='', allow_blank=True)


# ── Integrations ──────────────────────────────────────────────────────────────

class IntegrationConnectionSerializer(serializers.ModelSerializer):
    connected_by_name = serializers.SerializerMethodField()

    class Meta:
        model  = IntegrationConnection
        fields = [
            'id', 'organization', 'provider', 'display_name', 'category',
            'status', 'config', 'last_sync', 'last_error',
            'total_calls', 'error_count',
            'connected_by_name', 'webhook_secret',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'organization', 'total_calls', 'error_count',
            'last_sync', 'last_error', 'connected_by_name',
            'webhook_secret', 'created_at', 'updated_at',
        ]

    def get_connected_by_name(self, obj):
        if obj.connected_by:
            return obj.connected_by.get_full_name() or obj.connected_by.username
        return ''


class IntegrationConnectionWriteSerializer(serializers.Serializer):
    provider     = serializers.CharField(max_length=80)
    display_name = serializers.CharField(max_length=120, required=False, default='', allow_blank=True)
    category     = serializers.CharField(max_length=50, required=False, default='other')
    credentials  = serializers.DictField(required=False, default=dict)
    config       = serializers.DictField(required=False, default=dict)


class IntegrationLogSerializer(serializers.ModelSerializer):
    class Meta:
        model  = IntegrationLog
        fields = [
            'id', 'provider', 'event_type', 'level', 'message',
            'http_status', 'duration_ms', 'retry_count',
            'correlation_id', 'timestamp',
        ]
        read_only_fields = fields


class IntegrationWebhookEventSerializer(serializers.ModelSerializer):
    class Meta:
        model  = IntegrationWebhookEvent
        fields = [
            'id', 'provider', 'event_type', 'event_id',
            'payload', 'normalized', 'processed', 'processing_error',
            'received_at',
        ]
        read_only_fields = fields


# ── Meeting Hub ───────────────────────────────────────────────────────────────

from .models import Meeting, MeetingParticipant, MeetingNotification, Announcement


class MeetingParticipantSerializer(serializers.ModelSerializer):
    class Meta:
        model  = MeetingParticipant
        fields = [
            'id', 'meeting', 'user', 'member', 'email', 'name',
            'role', 'invite_status', 'joined_at', 'left_at',
            'created_at',
        ]
        read_only_fields = ['id', 'meeting', 'joined_at', 'left_at', 'created_at']


class MeetingSerializer(serializers.ModelSerializer):
    participants        = MeetingParticipantSerializer(many=True, read_only=True)
    participant_count   = serializers.SerializerMethodField()
    duration_minutes    = serializers.ReadOnlyField()
    created_by_name     = serializers.SerializerMethodField()
    department_name     = serializers.SerializerMethodField()

    class Meta:
        model  = Meeting
        fields = [
            'id', 'organization', 'department', 'department_name',
            'created_by', 'created_by_name',
            'title', 'description', 'agenda',
            'start_time', 'end_time', 'duration_minutes',
            'meeting_type', 'status',
            'video_room_id', 'video_provider', 'video_join_url',
            'location', 'is_recurring', 'recurrence_rule',
            'recording_url', 'notes', 'max_participants',
            'participants', 'participant_count',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'organization', 'created_by', 'duration_minutes',
            'video_room_id', 'recording_url', 'created_at', 'updated_at',
        ]

    def get_participant_count(self, obj):
        return obj.participants.count()

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return ''

    def get_department_name(self, obj):
        return obj.department.name if obj.department else ''


class MeetingWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Meeting
        fields = [
            'title', 'description', 'agenda',
            'start_time', 'end_time', 'meeting_type', 'status',
            'video_provider', 'video_join_url', 'location',
            'is_recurring', 'recurrence_rule', 'notes', 'max_participants',
            'department',
        ]


class MeetingNotificationSerializer(serializers.ModelSerializer):
    meeting_title = serializers.SerializerMethodField()

    class Meta:
        model  = MeetingNotification
        fields = ['id', 'user', 'meeting', 'meeting_title', 'notif_type', 'message', 'is_read', 'sent_at']
        read_only_fields = ['id', 'user', 'meeting', 'sent_at']

    def get_meeting_title(self, obj):
        return obj.meeting.title if obj.meeting_id else ''


class AnnouncementSerializer(serializers.ModelSerializer):
    created_by_name  = serializers.SerializerMethodField()
    department_name  = serializers.SerializerMethodField()

    class Meta:
        model  = Announcement
        fields = [
            'id', 'organization', 'department', 'department_name',
            'created_by', 'created_by_name',
            'title', 'message', 'priority', 'is_pinned', 'expires_at',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'organization', 'created_by', 'created_at', 'updated_at']

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return ''

    def get_department_name(self, obj):
        return obj.department.name if obj.department else 'Organization-wide'


class AnnouncementWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Announcement
        fields = ['title', 'message', 'priority', 'is_pinned', 'expires_at', 'department']
