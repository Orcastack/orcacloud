import logging
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet

from .models import EmailDomain, Mailbox, EmailAlias, DkimKey, EmailActivityLog
from .serializers import (
    EmailDomainSerializer,
    MailboxListSerializer, MailboxDetailSerializer,
    CreateMailboxSerializer, UpdateMailboxSerializer, ChangePasswordSerializer,
    EmailAliasSerializer, CreateAliasSerializer,
    EmailActivityLogSerializer,
)
from ..domain.models import Domain
from . import service as svc

logger = logging.getLogger(__name__)


def _log(email_domain, event, detail='', mailbox=None, actor=None):
    EmailActivityLog.objects.create(
        email_domain=email_domain,
        mailbox=mailbox,
        event=event,
        detail=detail,
        actor=actor,
    )


# ── Email Domain ViewSet ──────────────────────────────────────────────────────

class EmailDomainViewSet(ModelViewSet):
    """
    Manage email hosting for a Domain.
    One EmailDomain per Domain — auto-created on POST /email-domains/.
    """
    permission_classes = [IsAuthenticated]
    serializer_class   = EmailDomainSerializer
    lookup_field       = 'id'

    def get_queryset(self):
        return (
            EmailDomain.objects
            .filter(domain__owner=self.request.user)
            .select_related('domain')
            .prefetch_related('mailboxes', 'aliases', 'dkim_keys')
            .order_by('-created_at')
        )

    def create(self, request, *args, **kwargs):
        """Enable email for a domain (creates EmailDomain)."""
        domain_rid = request.data.get('domain_resource_id')
        if not domain_rid:
            return Response({'error': 'domain_resource_id required.'}, status=400)

        try:
            domain = Domain.objects.get(resource_id=domain_rid, owner=request.user)
        except Domain.DoesNotExist:
            return Response({'error': 'Domain not found.'}, status=404)

        if hasattr(domain, 'email_domain'):
            return Response(
                EmailDomainSerializer(domain.email_domain).data,
                status=status.HTTP_200_OK,
            )

        ed = EmailDomain.objects.create(
            domain=domain,
            webmail_url=f'https://webmail.orcacloud.com',
        )
        _log(ed, 'dns_provisioned', 'Email domain created', actor=request.user)
        return Response(EmailDomainSerializer(ed).data,
                        status=status.HTTP_201_CREATED)

    # ── DNS provisioning ──────────────────────────────────────────────────────

    @action(detail=True, methods=['post'], url_path='provision_dns')
    def provision_dns(self, request, id=None):
        """Provision MX, SPF, DKIM, DMARC records for this email domain."""
        ed = self.get_object()
        domain = ed.domain

        # Ensure a DNS zone exists
        try:
            zone = domain.dns_zone
        except Exception:
            return Response({'error': 'No DNS zone found for this domain.'}, status=404)

        # Generate DKIM key if we don't have one
        dkim_record = ''
        dkim_key    = ed.dkim_keys.filter(is_active=True).first()
        if not dkim_key:
            result = svc.generate_dkim_key(domain.domain_name)
            if result.get('success'):
                dkim_key = DkimKey.objects.create(
                    email_domain=ed,
                    selector=result['selector'],
                    public_key=result.get('dns_record', ''),
                    private_key=result.get('private_key', ''),
                    dns_record=result.get('dns_record', ''),
                )
                dkim_record = result.get('dns_record', '')
        else:
            dkim_record = dkim_key.dns_record

        # Provision DNS
        dns_result = svc.provision_email_dns(
            zone_id=zone.zone_id,
            domain_name=domain.domain_name,
            dkim_record=dkim_record,
            selector=dkim_key.selector if dkim_key else 'default',
        )

        # Update flags
        records = dns_result.get('records', {})
        ed.mx_provisioned    = records.get('mx',    False)
        ed.spf_provisioned   = records.get('spf',   False)
        ed.dkim_provisioned  = records.get('dkim',  False)
        ed.dmarc_provisioned = records.get('dmarc', False)
        if ed.dns_ready:
            ed.status = 'active'
        ed.save()

        _log(ed, 'dns_provisioned', str(records), actor=request.user)
        return Response(EmailDomainSerializer(ed).data)

    @action(detail=True, methods=['post'], url_path='generate_dkim')
    def generate_dkim(self, request, id=None):
        """Generate (or rotate) DKIM key pair for this domain."""
        ed       = self.get_object()
        selector = request.data.get('selector', 'default')

        # Deactivate old key with same selector
        ed.dkim_keys.filter(selector=selector).update(is_active=False)

        result = svc.generate_dkim_key(ed.domain.domain_name, selector)
        if not result.get('success'):
            return Response({'error': 'DKIM generation failed.'}, status=500)

        dk = DkimKey.objects.create(
            email_domain=ed,
            selector=selector,
            public_key=result.get('dns_record', ''),
            private_key=result.get('private_key', ''),
            dns_record=result.get('dns_record', ''),
        )
        _log(ed, 'dkim_generated', selector, actor=request.user)
        from .serializers import DkimKeySerializer
        return Response(DkimKeySerializer(dk).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='client_settings')
    def client_settings(self, request, id=None):
        """Return IMAP/SMTP/Webmail settings for this domain."""
        ed = self.get_object()
        return Response(svc.get_client_settings(ed.domain.domain_name))

    @action(detail=True, methods=['get'], url_path='activity')
    def activity(self, request, id=None):
        ed   = self.get_object()
        logs = ed.activity_logs.order_by('-created_at')[:50]
        return Response(EmailActivityLogSerializer(logs, many=True).data)


# ── Mailbox ViewSet ───────────────────────────────────────────────────────────

class MailboxViewSet(ModelViewSet):
    """CRUD + actions for individual mailboxes."""
    permission_classes = [IsAuthenticated]
    lookup_field       = 'resource_id'

    def get_queryset(self):
        return (
            Mailbox.objects
            .filter(owner=self.request.user)
            .exclude(status='deleted')
            .select_related('email_domain__domain')
            .order_by('-created_at')
        )

    def get_serializer_class(self):
        if self.action == 'list':
            return MailboxListSerializer
        return MailboxDetailSerializer

    def create(self, request, *args, **kwargs):
        ser = CreateMailboxSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        try:
            domain = Domain.objects.get(
                resource_id=d['domain_resource_id'], owner=request.user)
        except Domain.DoesNotExist:
            return Response({'error': 'Domain not found.'}, status=404)

        # Auto-create EmailDomain if not yet enabled
        ed, _ = EmailDomain.objects.get_or_create(
            domain=domain,
            defaults={'webmail_url': 'https://webmail.orcacloud.com'},
        )

        email_address = f'{d["local_part"]}@{domain.domain_name}'

        if Mailbox.objects.filter(email_domain=ed,
                                   local_part=d['local_part']).exists():
            return Response({'error': 'Mailbox already exists.'}, status=400)

        # Provision on mail server
        result = svc.create_mailbox(email_address, d['password'], d['quota_mb'])
        if not result.get('success'):
            return Response({'error': result.get('error', 'Provisioning failed.')},
                            status=500)

        mbx = Mailbox.objects.create(
            owner=request.user,
            email_domain=ed,
            local_part=d['local_part'],
            password_hash=result.get('password_hash', ''),
            quota_mb=d['quota_mb'],
            first_name=d.get('first_name', ''),
            last_name=d.get('last_name', ''),
            is_admin=d.get('is_admin', False),
            status='active',
        )
        _log(ed, 'mailbox_created', email_address, mailbox=mbx, actor=request.user)
        return Response(MailboxDetailSerializer(mbx).data,
                        status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        ser      = UpdateMailboxSerializer(data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        for field in ('first_name', 'last_name', 'quota_mb',
                      'forward_to', 'keep_local_copy', 'is_admin'):
            if field in d:
                setattr(instance, field, d[field])

        if 'quota_mb' in d:
            svc.update_quota(instance.email_address, d['quota_mb'])
            _log(instance.email_domain, 'quota_updated',
                 f'{instance.email_address} → {d["quota_mb"]} MB', actor=request.user)

        if 'forward_to' in d:
            svc.set_forward(instance.email_address, d['forward_to'],
                            d.get('keep_local_copy', instance.keep_local_copy))

        instance.save()
        return Response(MailboxDetailSerializer(instance).data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        svc.delete_mailbox(instance.email_address)
        instance.status = 'deleted'
        instance.save()
        _log(instance.email_domain, 'mailbox_deleted',
             instance.email_address, actor=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'], url_path='change_password')
    def change_password(self, request, resource_id=None):
        instance = self.get_object()
        ser      = ChangePasswordSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        new_pw   = ser.validated_data['new_password']
        result   = svc.update_password(instance.email_address, new_pw)
        if not result.get('success'):
            return Response({'error': result.get('error', 'Failed.')}, status=500)
        instance.password_hash = result.get('password_hash', instance.password_hash)
        instance.save(update_fields=['password_hash', 'updated_at'])
        _log(instance.email_domain, 'password_changed',
             instance.email_address, actor=request.user)
        return Response({'changed': True})

    @action(detail=True, methods=['post'], url_path='suspend')
    def suspend(self, request, resource_id=None):
        instance = self.get_object()
        svc.suspend_mailbox(instance.email_address)
        instance.status = 'suspended'
        instance.save(update_fields=['status', 'updated_at'])
        return Response({'status': 'suspended'})

    @action(detail=True, methods=['post'], url_path='activate')
    def activate(self, request, resource_id=None):
        instance = self.get_object()
        instance.status = 'active'
        instance.save(update_fields=['status', 'updated_at'])
        return Response({'status': 'active'})

    @action(detail=True, methods=['get'], url_path='usage')
    def usage(self, request, resource_id=None):
        instance = self.get_object()
        data     = svc.get_mailbox_usage(instance.email_address)
        instance.used_mb = data.get('used_mb', instance.used_mb)
        instance.save(update_fields=['used_mb', 'updated_at'])
        return Response(data)

    @action(detail=False, methods=['post'], url_path='generate_password')
    def generate_password(self, request):
        length = int(request.data.get('length', 16))
        return Response({'password': svc.generate_strong_password(length)})


# ── Email Alias ViewSet ───────────────────────────────────────────────────────

class EmailAliasViewSet(ModelViewSet):
    """Manage email aliases for domains owned by the user."""
    permission_classes = [IsAuthenticated]
    serializer_class   = EmailAliasSerializer

    def get_queryset(self):
        return EmailAlias.objects.filter(
            email_domain__domain__owner=self.request.user
        ).select_related('email_domain__domain').order_by('-created_at')

    def create(self, request, *args, **kwargs):
        ser = CreateAliasSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        try:
            domain = Domain.objects.get(
                resource_id=d['domain_resource_id'], owner=request.user)
        except Domain.DoesNotExist:
            return Response({'error': 'Domain not found.'}, status=404)

        ed, _ = EmailDomain.objects.get_or_create(
            domain=domain,
            defaults={'webmail_url': 'https://webmail.orcacloud.com'},
        )

        if EmailAlias.objects.filter(email_domain=ed,
                                      local_part=d['local_part']).exists():
            return Response({'error': 'Alias already exists.'}, status=400)

        alias = EmailAlias.objects.create(
            email_domain=ed,
            local_part=d['local_part'],
            destinations=d['destinations'],
        )
        _log(ed, 'alias_created', alias.alias_address, actor=request.user)
        return Response(EmailAliasSerializer(alias).data,
                        status=status.HTTP_201_CREATED)
