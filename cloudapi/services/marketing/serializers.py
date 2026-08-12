# OrcaCloud – Email Marketing Serializers

from rest_framework import serializers
from .models import (
    ContactList, Contact, EmailTemplate,
    Campaign, CampaignAnalytics, SendEvent, Automation,
    Segment, ABTest, ABTestVariant, MarketingChannel, MarketingCalendarEvent,
    MarketingWorkspaceSettings,
)


# ── Contact List ──────────────────────────────────────────────────────────────

class ContactListSerializer(serializers.ModelSerializer):
    subscriber_count = serializers.ReadOnlyField()

    class Meta:
        model  = ContactList
        fields = [
            'resource_id', 'name', 'description', 'status',
            'double_optin', 'subscriber_count',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['resource_id', 'subscriber_count',
                            'created_at', 'updated_at']


class CreateContactListSerializer(serializers.ModelSerializer):
    class Meta:
        model  = ContactList
        fields = ['name', 'description', 'double_optin']


# ── Contact ───────────────────────────────────────────────────────────────────

class ContactSerializer(serializers.ModelSerializer):
    contact_list_id = serializers.CharField(source='contact_list.resource_id',
                                             read_only=True)

    class Meta:
        model  = Contact
        fields = [
            'id', 'contact_list_id', 'email',
            'first_name', 'last_name', 'status',
            'custom_fields', 'tags', 'subscribed_at',
            'unsubscribed_at', 'ip_address', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'contact_list_id', 'subscribed_at',
                            'unsubscribed_at', 'created_at', 'updated_at']


class CreateContactSerializer(serializers.ModelSerializer):
    contact_list_id = serializers.CharField(write_only=True)

    class Meta:
        model  = Contact
        fields = ['contact_list_id', 'email', 'first_name', 'last_name',
                  'custom_fields', 'tags', 'ip_address']

    def validate_contact_list_id(self, v):
        request = self.context.get('request')
        try:
            lst = ContactList.objects.get(resource_id=v,
                                          owner=request.user)
        except ContactList.DoesNotExist:
            raise serializers.ValidationError('Contact list not found.')
        self.context['contact_list'] = lst
        return v

    def create(self, validated_data):
        validated_data.pop('contact_list_id')
        validated_data['contact_list'] = self.context['contact_list']
        return Contact.objects.create(**validated_data)


# ── Email Template ────────────────────────────────────────────────────────────

class EmailTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = EmailTemplate
        fields = [
            'resource_id', 'name', 'description', 'category',
            'subject', 'preview_text', 'html_body', 'text_body',
            'thumbnail_url', 'is_active', 'variables',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['resource_id', 'created_at', 'updated_at']


class CreateEmailTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = EmailTemplate
        fields = ['name', 'description', 'category', 'subject',
                  'preview_text', 'html_body', 'text_body',
                  'thumbnail_url', 'variables']


# ── Campaign Analytics ────────────────────────────────────────────────────────

class CampaignAnalyticsSerializer(serializers.ModelSerializer):
    open_rate        = serializers.ReadOnlyField()
    click_rate       = serializers.ReadOnlyField()
    bounce_rate      = serializers.ReadOnlyField()
    unsubscribe_rate = serializers.ReadOnlyField()

    class Meta:
        model  = CampaignAnalytics
        fields = [
            'total_sent', 'delivered',
            'bounced', 'hard_bounces', 'soft_bounces',
            'opens', 'unique_opens',
            'clicks', 'unique_clicks',
            'unsubscribes', 'complaints',
            'link_clicks', 'last_synced_at',
            'open_rate', 'click_rate', 'bounce_rate', 'unsubscribe_rate',
        ]


# ── Campaign ──────────────────────────────────────────────────────────────────

class CampaignListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views."""
    analytics = serializers.SerializerMethodField()

    class Meta:
        model  = Campaign
        fields = [
            'resource_id', 'name', 'status', 'campaign_type',
            'from_email', 'subject', 'scheduled_at', 'sent_at',
            'created_at', 'updated_at', 'analytics',
        ]
        read_only_fields = fields

    def get_analytics(self, obj):
        try:
            a = obj.analytics
        except CampaignAnalytics.DoesNotExist:
            return None
        return {
            'total_sent':  a.total_sent,
            'open_rate':   a.open_rate,
            'click_rate':  a.click_rate,
            'bounce_rate': a.bounce_rate,
        }


class CampaignDetailSerializer(serializers.ModelSerializer):
    analytics    = CampaignAnalyticsSerializer(read_only=True)
    contact_lists = ContactListSerializer(many=True, read_only=True)
    template      = EmailTemplateSerializer(read_only=True)

    class Meta:
        model  = Campaign
        fields = [
            'resource_id', 'name', 'description', 'status', 'campaign_type',
            'from_name', 'from_email', 'reply_to',
            'subject', 'preview_text',
            'template', 'html_body', 'text_body',
            'contact_lists',
            'scheduled_at', 'sent_at',
            'track_opens', 'track_clicks', 'google_analytics',
            'utm_source', 'utm_medium', 'utm_campaign',
            'created_at', 'updated_at', 'analytics',
        ]
        read_only_fields = ['resource_id', 'status', 'sent_at',
                            'created_at', 'updated_at']


class CreateCampaignSerializer(serializers.ModelSerializer):
    contact_list_ids = serializers.ListField(
        child=serializers.CharField(), write_only=True, required=False)
    template_id = serializers.CharField(write_only=True, required=False,
                                         allow_blank=True, allow_null=True)

    class Meta:
        model  = Campaign
        fields = [
            'name', 'description', 'campaign_type',
            'from_name', 'from_email', 'reply_to',
            'subject', 'preview_text',
            'template_id', 'html_body', 'text_body',
            'contact_list_ids',
            'scheduled_at',
            'track_opens', 'track_clicks', 'google_analytics',
            'utm_source', 'utm_medium', 'utm_campaign',
        ]

    def validate_template_id(self, v):
        if not v:
            return v
        request = self.context.get('request')
        try:
            tpl = EmailTemplate.objects.get(resource_id=v, owner=request.user)
        except EmailTemplate.DoesNotExist:
            raise serializers.ValidationError('Template not found.')
        self.context['template'] = tpl
        return v

    def validate_contact_list_ids(self, values):
        request = self.context.get('request')
        lists   = []
        for rid in values:
            try:
                lst = ContactList.objects.get(resource_id=rid, owner=request.user)
                lists.append(lst)
            except ContactList.DoesNotExist:
                raise serializers.ValidationError(
                    f'Contact list {rid} not found.')
        self.context['contact_lists'] = lists
        return values

    def create(self, validated_data):
        validated_data.pop('contact_list_ids', None)
        tpl_id = validated_data.pop('template_id', None)
        if tpl_id and 'template' in self.context:
            validated_data['template'] = self.context['template']
        campaign = Campaign.objects.create(**validated_data)
        for lst in self.context.get('contact_lists', []):
            campaign.contact_lists.add(lst)
        return campaign


# ── Automation ────────────────────────────────────────────────────────────────

class AutomationSerializer(serializers.ModelSerializer):
    contact_list_id = serializers.CharField(
        source='contact_list.resource_id', read_only=True)

    class Meta:
        model  = Automation
        fields = [
            'resource_id', 'name', 'description',
            'trigger', 'contact_list_id',
            'is_active', 'steps',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['resource_id', 'created_at', 'updated_at']


class CreateAutomationSerializer(serializers.ModelSerializer):
    contact_list_id = serializers.CharField(write_only=True, required=False,
                                             allow_null=True)

    class Meta:
        model  = Automation
        fields = ['name', 'description', 'trigger',
                  'contact_list_id', 'steps']

    def validate_contact_list_id(self, v):
        if not v:
            return v
        request = self.context.get('request')
        try:
            lst = ContactList.objects.get(resource_id=v, owner=request.user)
        except ContactList.DoesNotExist:
            raise serializers.ValidationError('Contact list not found.')
        self.context['automation_list'] = lst
        return v

    def create(self, validated_data):
        validated_data.pop('contact_list_id', None)
        if 'automation_list' in self.context:
            validated_data['contact_list'] = self.context['automation_list']
        return Automation.objects.create(**validated_data)


# ═══════════════════════════════════════════════════════════════════════════════
# ORG-SCOPED MARKETING WORKSPACE SERIALIZERS
# ═══════════════════════════════════════════════════════════════════════════════

# ── Org Campaign (lightweight + detail) ─────────────────────────────────────

class OrgCampaignSerializer(serializers.ModelSerializer):
    """Org-scoped campaign list serializer."""
    analytics = serializers.SerializerMethodField()

    class Meta:
        model  = Campaign
        fields = [
            'resource_id', 'name', 'description', 'status', 'campaign_type',
            'channel', 'objective',
            'from_name', 'from_email', 'subject',
            'scheduled_at', 'sent_at',
            'organization', 'created_at', 'updated_at', 'analytics',
        ]
        read_only_fields = ['resource_id', 'created_at', 'updated_at']

    def get_analytics(self, obj):
        try:
            a = obj.analytics
        except CampaignAnalytics.DoesNotExist:
            return None
        return {
            'total_sent': a.total_sent, 'open_rate': a.open_rate,
            'click_rate': a.click_rate, 'bounce_rate': a.bounce_rate,
        }


class CreateOrgCampaignSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Campaign
        fields = [
            'name', 'description', 'campaign_type', 'channel', 'objective',
            'from_name', 'from_email', 'reply_to',
            'subject', 'preview_text', 'html_body', 'text_body',
            'scheduled_at', 'track_opens', 'track_clicks',
            'utm_source', 'utm_medium', 'utm_campaign',
        ]


# ── Org ContactList ──────────────────────────────────────────────────────────

class OrgContactListSerializer(serializers.ModelSerializer):
    subscriber_count = serializers.ReadOnlyField()

    class Meta:
        model  = ContactList
        fields = [
            'resource_id', 'name', 'description', 'status',
            'double_optin', 'subscriber_count', 'organization',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['resource_id', 'subscriber_count', 'created_at', 'updated_at']


class CreateOrgContactListSerializer(serializers.ModelSerializer):
    class Meta:
        model  = ContactList
        fields = ['name', 'description', 'double_optin']


# ── Org EmailTemplate ────────────────────────────────────────────────────────

class OrgEmailTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = EmailTemplate
        fields = [
            'resource_id', 'name', 'description', 'category',
            'subject', 'preview_text', 'html_body', 'text_body',
            'thumbnail_url', 'is_active', 'variables', 'organization',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['resource_id', 'created_at', 'updated_at']


class CreateOrgEmailTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = EmailTemplate
        fields = ['name', 'description', 'category', 'subject',
                  'preview_text', 'html_body', 'text_body', 'thumbnail_url', 'variables']


# ── Org Automation ───────────────────────────────────────────────────────────

class OrgAutomationSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Automation
        fields = [
            'resource_id', 'name', 'description',
            'trigger', 'is_active', 'steps', 'organization',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['resource_id', 'created_at', 'updated_at']


class CreateOrgAutomationSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Automation
        fields = ['name', 'description', 'trigger', 'steps']


# ── Segment ──────────────────────────────────────────────────────────────────

class SegmentSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Segment
        fields = [
            'id', 'organization', 'name', 'description',
            'segment_type', 'criteria', 'contact_count',
            'tags', 'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CreateSegmentSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Segment
        fields = ['name', 'description', 'segment_type', 'criteria', 'tags']


# ── A/B Test ─────────────────────────────────────────────────────────────────

class ABTestVariantSerializer(serializers.ModelSerializer):
    open_rate       = serializers.ReadOnlyField()
    click_rate      = serializers.ReadOnlyField()
    conversion_rate = serializers.ReadOnlyField()

    class Meta:
        model  = ABTestVariant
        fields = [
            'id', 'label', 'name',
            'subject_line', 'preview_text', 'html_body',
            'allocation', 'sends', 'opens', 'clicks', 'conversions',
            'open_rate', 'click_rate', 'conversion_rate',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'sends', 'opens', 'clicks', 'conversions',
                            'open_rate', 'click_rate', 'conversion_rate',
                            'created_at', 'updated_at']


class ABTestSerializer(serializers.ModelSerializer):
    variants = ABTestVariantSerializer(many=True, read_only=True)

    class Meta:
        model  = ABTest
        fields = [
            'id', 'organization', 'name', 'hypothesis', 'status',
            'test_type', 'start_at', 'end_at',
            'winner_variant', 'auto_select_winner', 'winner_metric',
            'variants', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'winner_variant', 'created_at', 'updated_at']


class CreateABTestSerializer(serializers.ModelSerializer):
    variants = serializers.ListField(
        child=serializers.DictField(), write_only=True, required=False)

    class Meta:
        model  = ABTest
        fields = ['name', 'hypothesis', 'test_type', 'start_at', 'end_at',
                  'auto_select_winner', 'winner_metric', 'variants']

    def create(self, validated_data):
        variants_data = validated_data.pop('variants', [])
        ab_test = ABTest.objects.create(**validated_data)
        for v in variants_data:
            ABTestVariant.objects.create(ab_test=ab_test, **v)
        return ab_test


# ── Marketing Channel ────────────────────────────────────────────────────────

class MarketingChannelSerializer(serializers.ModelSerializer):
    class Meta:
        model  = MarketingChannel
        fields = [
            'id', 'organization', 'channel_type', 'name', 'status',
            'provider', 'config', 'last_checked',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'last_checked', 'created_at', 'updated_at']


class CreateMarketingChannelSerializer(serializers.ModelSerializer):
    class Meta:
        model  = MarketingChannel
        fields = ['channel_type', 'name', 'provider', 'config']


# ── Calendar Event ───────────────────────────────────────────────────────────

class MarketingCalendarEventSerializer(serializers.ModelSerializer):
    class Meta:
        model  = MarketingCalendarEvent
        fields = [
            'id', 'organization', 'title', 'description', 'event_type',
            'start_at', 'end_at', 'all_day', 'color', 'assignee',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CreateMarketingCalendarEventSerializer(serializers.ModelSerializer):
    class Meta:
        model  = MarketingCalendarEvent
        fields = ['title', 'description', 'event_type',
                  'start_at', 'end_at', 'all_day', 'color', 'assignee']


# ── Workspace Settings ───────────────────────────────────────────────────────

class MarketingWorkspaceSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model  = MarketingWorkspaceSettings
        fields = [
            'organization',
            'default_from_name', 'default_from_email', 'default_reply_to',
            'brand_color', 'logo_url', 'unsubscribe_page',
            'gdpr_enabled', 'popia_enabled',
            'api_keys', 'permissions',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['organization', 'created_at', 'updated_at']
