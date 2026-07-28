# OrcaCloud – Email Marketing ViewSets

import logging
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import (
    ContactList, Contact, EmailTemplate, Campaign, CampaignAnalytics, Automation
)
from .serializers import (
    ContactListSerializer, CreateContactListSerializer,
    ContactSerializer, CreateContactSerializer,
    EmailTemplateSerializer, CreateEmailTemplateSerializer,
    CampaignListSerializer, CampaignDetailSerializer, CreateCampaignSerializer,
    CampaignAnalyticsSerializer,
    AutomationSerializer, CreateAutomationSerializer,
)
from . import service as svc

logger = logging.getLogger(__name__)


# ── Campaign ──────────────────────────────────────────────────────────────────

class CampaignViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'resource_id'

    def get_queryset(self):
        return Campaign.objects.filter(owner=self.request.user).prefetch_related(
            'contact_lists', 'template')

    def get_serializer_class(self):
        if self.action in ('list',):
            return CampaignListSerializer
        if self.action in ('create',):
            return CreateCampaignSerializer
        if self.action in ('partial_update', 'update'):
            return CreateCampaignSerializer
        return CampaignDetailSerializer

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    # ── Custom actions ────────────────────────────────────────────────────

    @action(detail=True, methods=['post'])
    def send(self, request, resource_id=None):
        """Kick off a bulk send for this campaign."""
        campaign = self.get_object()
        if campaign.status not in ('draft', 'scheduled'):
            return Response({'error': 'Campaign cannot be sent in this state.'},
                            status=status.HTTP_400_BAD_REQUEST)
        campaign.status = 'sending'
        campaign.save(update_fields=['status', 'updated_at'])
        result = svc.send_campaign(campaign.resource_id)
        return Response(result)

    @action(detail=True, methods=['post'], url_path='send_test')
    def send_test(self, request, resource_id=None):
        email = request.data.get('email')
        if not email:
            return Response({'error': 'email is required.'},
                            status=status.HTTP_400_BAD_REQUEST)
        self.get_object()   # permission check
        result = svc.send_test_email(resource_id, email)
        return Response(result)

    @action(detail=True, methods=['post'])
    def schedule(self, request, resource_id=None):
        from django.utils import timezone
        campaign = self.get_object()
        scheduled_at = request.data.get('scheduled_at')
        if not scheduled_at:
            return Response({'error': 'scheduled_at is required.'},
                            status=status.HTTP_400_BAD_REQUEST)
        campaign.scheduled_at = scheduled_at
        campaign.status       = 'scheduled'
        campaign.save(update_fields=['scheduled_at', 'status', 'updated_at'])
        return Response(CampaignDetailSerializer(campaign).data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, resource_id=None):
        campaign = self.get_object()
        campaign.status = 'cancelled'
        campaign.save(update_fields=['status', 'updated_at'])
        return Response({'success': True, 'status': 'cancelled'})

    @action(detail=True, methods=['post'])
    def duplicate(self, request, resource_id=None):
        original = self.get_object()
        original.pk          = None
        original.resource_id = None          # triggers ResourceModel auto-gen
        original.name        = f'{original.name} (copy)'
        original.status      = 'draft'
        original.sent_at     = None
        original.scheduled_at = None
        original.save()
        return Response(CampaignDetailSerializer(original).data,
                        status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def analytics(self, request, resource_id=None):
        campaign = self.get_object()
        try:
            a = campaign.analytics
        except CampaignAnalytics.DoesNotExist:
            return Response({'error': 'No analytics yet.'}, status=404)
        return Response(CampaignAnalyticsSerializer(a).data)

    @action(detail=False, methods=['get'], url_path='account_stats')
    def account_stats(self, request):
        return Response(svc.get_account_stats(request.user))


# ── Contact List ──────────────────────────────────────────────────────────────

class ContactListViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'resource_id'

    def get_queryset(self):
        return ContactList.objects.filter(owner=self.request.user)

    def get_serializer_class(self):
        return CreateContactListSerializer if self.action == 'create' else ContactListSerializer

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=['post'], url_path='import_csv')
    def import_csv(self, request, resource_id=None):
        csv_text = request.data.get('csv') or ''
        if not csv_text:
            return Response({'error': 'csv field is required.'},
                            status=status.HTTP_400_BAD_REQUEST)
        result = svc.import_contacts_csv(resource_id, csv_text, request.user)
        return Response(result)

    @action(detail=True, methods=['get'], url_path='export_csv')
    def export_csv(self, request, resource_id=None):
        import csv, io
        lst = self.get_object()
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['email', 'first_name', 'last_name', 'status', 'subscribed_at'])
        for c in lst.contacts.all():
            writer.writerow([c.email, c.first_name, c.last_name,
                             c.status, c.subscribed_at])
        from django.http import HttpResponse
        resp = HttpResponse(output.getvalue(), content_type='text/csv')
        resp['Content-Disposition'] = (
            f'attachment; filename="contacts-{resource_id}.csv"')
        return resp

    @action(detail=True, methods=['get'])
    def subscribers(self, request, resource_id=None):
        lst = self.get_object()
        qs  = lst.contacts.filter(status='subscribed').order_by('-subscribed_at')
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(ContactSerializer(page, many=True).data)
        return Response(ContactSerializer(qs, many=True).data)


# ── Contact ───────────────────────────────────────────────────────────────────

class ContactViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Contact.objects.filter(contact_list__owner=self.request.user)
        list_id = self.request.query_params.get('list')
        if list_id:
            qs = qs.filter(contact_list__resource_id=list_id)
        return qs

    def get_serializer_class(self):
        return CreateContactSerializer if self.action == 'create' else ContactSerializer

    @action(detail=True, methods=['post'])
    def unsubscribe(self, request, pk=None):
        contact = self.get_object()
        from django.utils import timezone
        contact.status            = 'unsubscribed'
        contact.unsubscribed_at   = timezone.now()
        contact.save(update_fields=['status', 'unsubscribed_at', 'updated_at'])
        return Response({'success': True})


# ── Email Template ────────────────────────────────────────────────────────────

class EmailTemplateViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'resource_id'

    def get_queryset(self):
        return EmailTemplate.objects.filter(owner=self.request.user)

    def get_serializer_class(self):
        return CreateEmailTemplateSerializer if self.action == 'create' else EmailTemplateSerializer

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=['post'])
    def duplicate(self, request, resource_id=None):
        original = self.get_object()
        original.pk          = None
        original.resource_id = None
        original.name        = f'{original.name} (copy)'
        original.save()
        return Response(EmailTemplateSerializer(original).data,
                        status=status.HTTP_201_CREATED)


# ── Automation ────────────────────────────────────────────────────────────────

class AutomationViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'resource_id'

    def get_queryset(self):
        return Automation.objects.filter(owner=self.request.user)

    def get_serializer_class(self):
        return CreateAutomationSerializer if self.action == 'create' else AutomationSerializer

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=['post'])
    def activate(self, request, resource_id=None):
        auto = self.get_object()
        auto.is_active = True
        auto.save(update_fields=['is_active', 'updated_at'])
        return Response({'success': True, 'is_active': True})

    @action(detail=True, methods=['post'])
    def deactivate(self, request, resource_id=None):
        auto = self.get_object()
        auto.is_active = False
        auto.save(update_fields=['is_active', 'updated_at'])
        return Response({'success': True, 'is_active': False})
