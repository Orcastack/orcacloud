import logging
from django.contrib.auth.models import User
from django.db.models import Count
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from rest_framework.throttling import AnonRateThrottle
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet

from .models import Domain, DnsZone, DomainDnsRecord, SslCertificate
from .serializers import (
    DomainListSerializer,
    DomainDetailSerializer,
    DomainCreateSerializer,
    DomainTransferCreateSerializer,
    DnsRecordSerializer,
    DnsRecordCreateSerializer,
    DnsRecordUpdateSerializer,
    SslCertificateSerializer,
    UpdateNameserversSerializer,
    CheckAvailabilitySerializer,
)
from ..integrations import reseller_club_service as rc
from ..integrations import designate_service as dns_svc
from ..core.tasks import enqueue_domain_switch_workflow
from .service import create_domain_invoice

logger = logging.getLogger(__name__)


class DomainSearchAnonThrottle(AnonRateThrottle):
    scope = 'domain_search'


# ── Domain ViewSet ────────────────────────────────────────────────────────────

class DomainViewSet(ModelViewSet):
    """
    CRUD + actions for Domain resources owned by the requesting user.
    """
    permission_classes = [IsAuthenticated]
    lookup_field       = 'resource_id'

    def get_queryset(self):
        return (
            Domain.objects
            .filter(owner=self.request.user)
            .select_related('owner')
            .prefetch_related('ssl_certs', 'transfers')
            .order_by('-created_at')
        )

    def get_serializer_class(self):
        if self.action in ('list',):
            return DomainListSerializer
        return DomainDetailSerializer

    # ── Static / discovery endpoints ──────────────────────────────────────────

    @action(
        detail=False,
        methods=['post'],
        url_path='check_availability',
        permission_classes=[AllowAny],
        throttle_classes=[DomainSearchAnonThrottle],
    )
    def check_availability(self, request):
        ser = CheckAvailabilitySerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        result = rc.check_availability(
            ser.validated_data['domain_name'],
            ser.validated_data.get('tlds') or None,
        )
        return Response(result)

    @action(
        detail=False,
        methods=['get'],
        url_path='tld_catalogue',
        permission_classes=[AllowAny],
        throttle_classes=[DomainSearchAnonThrottle],
    )
    def tld_catalogue(self, request):
        return Response(rc.get_tld_catalogue())

    # ── Registration ──────────────────────────────────────────────────────────

    @action(detail=False, methods=['post'], url_path='register')
    def register(self, request):
        ser = DomainCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        # 1. Register with ResellerClub
        reg = rc.register_domain(
            domain_name=data['domain_name'],
            years=data['registration_years'],
            customer_id=str(request.user.id),
            contact_id=str(request.user.id),
        )
        if not reg.get('success'):
            return Response({'error': reg.get('error', 'Registration failed.')},
                            status=status.HTTP_400_BAD_REQUEST)

        # 2. Create domain record
        domain = Domain.objects.create(
            owner=request.user,
            domain_name=data['domain_name'],
            status='active',
            reseller_order_id=reg.get('reseller_order_id', ''),
            reseller_customer_id=str(request.user.id),
            registration_years=data['registration_years'],
            whois_privacy=data['whois_privacy'],
            auto_renew=data['auto_renew'],
        )

        # 3. Bootstrap DNS zone in Designate
        zone = dns_svc.create_zone(data['domain_name'])
        if zone.get('success'):
            DnsZone.objects.create(
                domain=domain,
                zone_id=zone['zone_id'],
                zone_name=zone['zone_name'],
                status=zone.get('status', 'active'),
            )

        try:
            create_domain_invoice(
                owner=request.user,
                domain=domain,
                operation='register',
                years=data['registration_years'],
            )
        except Exception:
            logger.exception('Failed creating register invoice for %s', domain.domain_name)

        return Response(
            DomainDetailSerializer(domain).data,
            status=status.HTTP_201_CREATED,
        )

    # ── Transfer ──────────────────────────────────────────────────────────────

    @action(detail=False, methods=['post'], url_path='transfer')
    def transfer(self, request):
        ser = DomainTransferCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        init = rc.initiate_transfer(
            domain_name=data['domain_name'],
            epp_code=data['epp_code'],
            customer_id=str(request.user.id),
            contact_id=str(request.user.id),
        )
        if not init.get('success'):
            return Response({'error': init.get('error', 'Transfer initiation failed.')},
                            status=status.HTTP_400_BAD_REQUEST)

        domain = Domain.objects.create(
            owner=request.user,
            domain_name=data['domain_name'],
            status='transferring',
            reseller_order_id=init.get('reseller_order_id', ''),
            reseller_customer_id=str(request.user.id),
        )
        domain.transfers.create(
            status='initiated',
            reseller_order_id=init.get('reseller_order_id', ''),
            epp_code=data['epp_code'],
        )

        return Response(
            DomainDetailSerializer(domain).data,
            status=status.HTTP_201_CREATED,
        )

    # ── Renewal ───────────────────────────────────────────────────────────────

    @action(detail=True, methods=['post'], url_path='renew')
    def renew(self, request, resource_id=None):
        domain = self.get_object()
        years  = int(request.data.get('years', 1))

        result = rc.renew_domain(
            reseller_order_id=domain.reseller_order_id,
            years=years,
        )
        if not result.get('success'):
            return Response({'error': result.get('error', 'Renewal failed.')},
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            create_domain_invoice(
                owner=request.user,
                domain=domain,
                operation='renew',
                years=years,
            )
        except Exception:
            logger.exception('Failed creating renewal invoice for %s', domain.domain_name)

        return Response({'renewed': True, 'years': years})

    @action(detail=True, methods=['get'], url_path='billing')
    def billing(self, request, resource_id=None):
        from ..billing.models import Invoice
        from ..billing.serializers import InvoiceListSerializer

        domain = self.get_object()
        invoices = (
            Invoice.objects
            .filter(owner=request.user, line_items__resource_id=domain.resource_id)
            .distinct()
            .order_by('-period_start')
        )
        return Response(InvoiceListSerializer(invoices, many=True).data)

    # ── DNS Zone ──────────────────────────────────────────────────────────────

    @action(detail=True, methods=['get'], url_path='dns_zone')
    def dns_zone(self, request, resource_id=None):
        domain = self.get_object()
        try:
            zone = domain.dns_zone
        except DnsZone.DoesNotExist:
            return Response({'error': 'No DNS zone configured.'}, status=404)
        from .serializers import DnsZoneSerializer
        return Response(DnsZoneSerializer(zone).data)

    # ── DNS Records ───────────────────────────────────────────────────────────

    @action(detail=True, methods=['get'], url_path='dns_records')
    def dns_records(self, request, resource_id=None):
        domain = self.get_object()
        try:
            zone    = domain.dns_zone
            records = zone.records.all()
        except DnsZone.DoesNotExist:
            return Response([])
        return Response(DnsRecordSerializer(records, many=True).data)

    @action(detail=True, methods=['post'], url_path='add_dns_record')
    def add_dns_record(self, request, resource_id=None):
        domain = self.get_object()
        ser    = DnsRecordCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        try:
            zone = domain.dns_zone
        except DnsZone.DoesNotExist:
            return Response({'error': 'No DNS zone found.'}, status=404)

        result = dns_svc.create_record(
            zone_id=zone.zone_id,
            name=d['name'],
            record_type=d['record_type'],
            records=d['records'],
            ttl=d['ttl'],
        )
        if not result.get('success'):
            return Response({'error': result.get('error', 'Failed to create record.')},
                            status=status.HTTP_400_BAD_REQUEST)

        record = DomainDnsRecord.objects.create(
            zone=zone,
            recordset_id=result.get('recordset_id', ''),
            name=d['name'],
            record_type=d['record_type'],
            records=d['records'],
            ttl=d['ttl'],
        )
        return Response(DnsRecordSerializer(record).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='delete_dns_record')
    def delete_dns_record(self, request, resource_id=None):
        domain       = self.get_object()
        recordset_id = request.data.get('recordset_id')
        if not recordset_id:
            return Response({'error': 'recordset_id required.'}, status=400)

        try:
            zone = domain.dns_zone
        except DnsZone.DoesNotExist:
            return Response({'error': 'No DNS zone found.'}, status=404)

        dns_svc.delete_record(zone.zone_id, recordset_id)
        zone.records.filter(recordset_id=recordset_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # ── SSL ───────────────────────────────────────────────────────────────────

    @action(detail=True, methods=['get'], url_path='ssl_certs')
    def ssl_certs(self, request, resource_id=None):
        domain = self.get_object()
        certs  = domain.ssl_certs.all()
        return Response(SslCertificateSerializer(certs, many=True).data)

    @action(detail=True, methods=['post'], url_path='request_ssl')
    def request_ssl(self, request, resource_id=None):
        domain = self.get_object()
        cert   = SslCertificate.objects.create(
            domain=domain,
            common_name=domain.domain_name,
            sans=[f'www.{domain.domain_name}'],
            status='pending',
        )
        return Response(SslCertificateSerializer(cert).data, status=status.HTTP_202_ACCEPTED)

    # ── Nameservers ───────────────────────────────────────────────────────────

    @action(detail=True, methods=['post'], url_path='update_nameservers')
    def update_nameservers(self, request, resource_id=None):
        domain = self.get_object()
        ser    = UpdateNameserversSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        ns = ser.validated_data['nameservers']

        result = rc.update_nameservers(domain.reseller_order_id, ns)
        if not result.get('success'):
            return Response({'error': result.get('error', 'Nameserver update failed.')},
                            status=status.HTTP_400_BAD_REQUEST)

        domain.nameservers = ns
        domain.save(update_fields=['nameservers', 'updated_at'])
        return Response({'nameservers': ns})

    # ── Privacy ───────────────────────────────────────────────────────────────

    @action(detail=True, methods=['post'], url_path='set_privacy')
    def set_privacy(self, request, resource_id=None):
        domain = self.get_object()
        enable = bool(request.data.get('enable', True))

        result = rc.set_whois_privacy(domain.reseller_order_id, enable)
        if not result.get('success'):
            return Response({'error': result.get('error', 'Privacy update failed.')},
                            status=status.HTTP_400_BAD_REQUEST)

        domain.whois_privacy = enable
        domain.save(update_fields=['whois_privacy', 'updated_at'])
        return Response({'whois_privacy': enable})

    # ── DNSSEC ────────────────────────────────────────────────────────────────

    @action(detail=True, methods=['post'], url_path='enable_dnssec')
    def enable_dnssec(self, request, resource_id=None):
        domain = self.get_object()
        domain.dnssec_enabled = True
        domain.save(update_fields=['dnssec_enabled', 'updated_at'])
        return Response({'dnssec_enabled': True})

    # ── Auto-renew toggle ─────────────────────────────────────────────────────

    @action(detail=True, methods=['post'], url_path='toggle_auto_renew')
    def toggle_auto_renew(self, request, resource_id=None):
        domain = self.get_object()
        domain.auto_renew = not domain.auto_renew
        domain.save(update_fields=['auto_renew', 'updated_at'])
        return Response({'auto_renew': domain.auto_renew})

    # ── Update existing DNS record ─────────────────────────────────────────────

    @action(detail=True, methods=['post'], url_path='update_dns_record')
    def update_dns_record(self, request, resource_id=None):
        domain = self.get_object()
        ser = DnsRecordUpdateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        try:
            zone = domain.dns_zone
        except DnsZone.DoesNotExist:
            return Response({'error': 'No DNS zone found.'}, status=404)

        try:
            record = zone.records.get(recordset_id=d['recordset_id'])
        except DomainDnsRecord.DoesNotExist:
            return Response({'error': 'Record not found.'}, status=404)

        result = dns_svc.update_record(
            zone_id=zone.zone_id,
            recordset_id=d['recordset_id'],
            records=d['records'],
            ttl=d.get('ttl', record.ttl),
        )
        if not result.get('success'):
            return Response({'error': result.get('error', 'Failed to update record.')},
                            status=status.HTTP_400_BAD_REQUEST)

        record.records = d['records']
        if 'ttl' in d:
            record.ttl = d['ttl']
        record.save(update_fields=['records', 'ttl', 'updated_at'])
        return Response(DnsRecordSerializer(record).data)

    # ── DNS Templates ──────────────────────────────────────────────────────────

    _DNS_TEMPLATES = [
        {
            'name': 'orcacloud_app',
            'label': 'Point to OrcaCloud App',
            'description': 'Route traffic to an OrcaCloud compute instance or load balancer.',
            'records': [
                {'record_type': 'A',     'name': '@',   'records': ['<your-app-ip>'],         'ttl': 300},
                {'record_type': 'CNAME', 'name': 'www', 'records': ['<your-domain.com>.'],     'ttl': 300},
            ],
        },
        {
            'name': 'orcacloud_cdn',
            'label': 'OrcaCloud CDN',
            'description': 'Route traffic through OrcaCloud CDN edge.',
            'records': [
                {'record_type': 'CNAME', 'name': '@',   'records': ['cdn.orcacloud.com.'],   'ttl': 300},
                {'record_type': 'CNAME', 'name': 'www', 'records': ['cdn.orcacloud.com.'],   'ttl': 300},
            ],
        },
        {
            'name': 'google_workspace',
            'label': 'Google Workspace Email',
            'description': 'MX records for Google Workspace (Gmail).',
            'records': [
                {'record_type': 'MX', 'name': '@', 'records': ['1 aspmx.l.google.com.'],     'ttl': 3600},
                {'record_type': 'MX', 'name': '@', 'records': ['5 alt1.aspmx.l.google.com.'],'ttl': 3600},
                {'record_type': 'MX', 'name': '@', 'records': ['10 alt2.aspmx.l.google.com.'],'ttl': 3600},
                {'record_type': 'TXT', 'name': '@', 'records': ['v=spf1 include:_spf.google.com ~all'], 'ttl': 3600},
            ],
        },
        {
            'name': 'microsoft_365',
            'label': 'Microsoft 365 Email',
            'description': 'MX and SPF records for Microsoft 365.',
            'records': [
                {'record_type': 'MX',  'name': '@', 'records': ['0 <tenant>.mail.protection.outlook.com.'], 'ttl': 3600},
                {'record_type': 'TXT', 'name': '@', 'records': ['v=spf1 include:spf.protection.outlook.com -all'], 'ttl': 3600},
            ],
        },
        {
            'name': 'domain_verification',
            'label': 'Domain Verification (TXT)',
            'description': 'Add a TXT record to verify domain ownership with a third-party service.',
            'records': [
                {'record_type': 'TXT', 'name': '@', 'records': ['<verification-code-here>'], 'ttl': 300},
            ],
        },
    ]

    @action(detail=True, methods=['get', 'post'], url_path='dns_templates')
    def dns_templates(self, request, resource_id=None):
        if request.method == 'GET':
            return Response(self._DNS_TEMPLATES)

        # POST: apply a named template
        template_name = request.data.get('template_name')
        template = next((t for t in self._DNS_TEMPLATES if t['name'] == template_name), None)
        if not template:
            return Response({'error': 'Unknown template name.'}, status=400)

        domain = self.get_object()
        try:
            zone = domain.dns_zone
        except DnsZone.DoesNotExist:
            return Response({'error': 'No DNS zone found for this domain.'}, status=404)

        created = []
        for rec in template['records']:
            result = dns_svc.create_record(
                zone_id=zone.zone_id,
                name=rec['name'],
                record_type=rec['record_type'],
                records=rec['records'],
                ttl=rec['ttl'],
            )
            if result.get('success'):
                obj = DomainDnsRecord.objects.create(
                    zone=zone,
                    recordset_id=result.get('recordset_id', ''),
                    name=rec['name'],
                    record_type=rec['record_type'],
                    records=rec['records'],
                    ttl=rec['ttl'],
                )
                created.append(DnsRecordSerializer(obj).data)
        return Response({'applied': template_name, 'records_created': created}, status=status.HTTP_201_CREATED)

    # ── Admin: TLD Pricing ────────────────────────────────────────────────────

    @action(
        detail=False,
        methods=['get'],
        url_path='admin/tld_pricing',
        permission_classes=[IsAuthenticated, IsAdminUser],
    )
    def admin_tld_pricing(self, request):
        """Return the full TLD pricing catalogue (from RC + any DB overrides)."""
        return Response(rc.get_tld_catalogue())

    @action(
        detail=False,
        methods=['get'],
        url_path='admin/metrics',
        permission_classes=[IsAuthenticated, IsAdminUser],
    )
    def admin_metrics(self, request):
        """System-level domain metrics for admin dashboard."""
        from django.utils import timezone
        from datetime import timedelta

        now = timezone.now()
        registrations_24h = Domain.objects.filter(created_at__gte=now - timedelta(hours=24)).count()
        registrations_7d  = Domain.objects.filter(created_at__gte=now - timedelta(days=7)).count()
        expiring_30d = Domain.objects.filter(
            expires_at__gte=now,
            expires_at__lte=now + timedelta(days=30),
        ).count()
        expired = Domain.objects.filter(status='expired').count()
        failed  = Domain.objects.filter(status__in=['error', 'failed']).count()

        return Response({
            'registrations_24h': registrations_24h,
            'registrations_7d': registrations_7d,
            'expiring_30d': expiring_30d,
            'expired': expired,
            'failed_or_error': failed,
        })

    @action(detail=True, methods=['post'], url_path='switch_domain')
    def switch_domain(self, request, resource_id=None):
        domain = self.get_object()
        target_endpoint = request.data.get('target_endpoint', '').strip()
        lb_resource_id = request.data.get('lb_resource_id', '').strip()
        cdn_resource_id = request.data.get('cdn_resource_id', '').strip()
        cluster_resource_id = request.data.get('cluster_resource_id', '').strip()
        queued = enqueue_domain_switch_workflow(
            domain_resource_id=domain.resource_id,
            user_id=request.user.id,
            target_endpoint=target_endpoint,
            lb_resource_id=lb_resource_id,
            cdn_resource_id=cdn_resource_id,
            cluster_resource_id=cluster_resource_id,
        )
        return Response(queued, status=status.HTTP_202_ACCEPTED)

    @action(detail=True, methods=['get'], url_path='switch_status')
    def switch_status(self, request, resource_id=None):
        """Return latest domain switch workflow status."""
        domain = self.get_object()
        switch_state = (domain.metadata or {}).get('domain_switch', {})
        return Response({
            'domain': domain.domain_name,
            'workflow': switch_state,
            'history': (domain.metadata or {}).get('domain_switch_history', []),
        })

    # ── Admin Console Endpoints ─────────────────────────────────────────────

    @action(
        detail=False,
        methods=['get'],
        url_path='admin/summary',
        permission_classes=[IsAuthenticated, IsAdminUser],
    )
    def admin_summary(self, request):
        total_domains = Domain.objects.count()
        status_counts = {
            item['status']: item['count']
            for item in Domain.objects.values('status').annotate(count=Count('id'))
        }
        tld_counts = list(
            Domain.objects
            .values('tld')
            .annotate(count=Count('id'))
            .order_by('-count')[:10]
        )
        total_users = User.objects.count()
        return Response({
            'total_domains': total_domains,
            'total_users': total_users,
            'status_counts': status_counts,
            'top_tlds': tld_counts,
        })

    @action(
        detail=False,
        methods=['get'],
        url_path='admin/domains',
        permission_classes=[IsAuthenticated, IsAdminUser],
    )
    def admin_domains(self, request):
        queryset = Domain.objects.select_related('owner').order_by('-created_at')[:200]
        rows = [
            {
                'resource_id': domain.resource_id,
                'domain_name': domain.domain_name,
                'status': domain.status,
                'tld': domain.tld,
                'owner_id': domain.owner_id,
                'owner_username': domain.owner.username if domain.owner else None,
                'expires_at': domain.expires_at,
                'auto_renew': domain.auto_renew,
                'created_at': domain.created_at,
            }
            for domain in queryset
        ]
        return Response(rows)

    @action(
        detail=False,
        methods=['get'],
        url_path='admin/users',
        permission_classes=[IsAuthenticated, IsAdminUser],
    )
    def admin_users(self, request):
        users = (
            User.objects
            .annotate(domains_count=Count('domain_owned'))
            .order_by('-date_joined')[:200]
        )
        rows = [
            {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'is_staff': user.is_staff,
                'is_active': user.is_active,
                'domains_count': user.domains_count,
                'date_joined': user.date_joined,
            }
            for user in users
        ]
        return Response(rows)

    @action(
        detail=True,
        methods=['post'],
        url_path='admin/force_status',
        permission_classes=[IsAuthenticated, IsAdminUser],
    )
    def admin_force_status(self, request, resource_id=None):
        domain = Domain.objects.get(resource_id=resource_id)
        new_status = (request.data.get('status') or '').strip().lower()
        allowed_statuses = {choice[0] for choice in Domain._meta.get_field('status').choices}
        if new_status not in allowed_statuses:
            return Response(
                {'error': 'Invalid status.', 'allowed': sorted(allowed_statuses)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        domain.status = new_status
        domain.save(update_fields=['status', 'updated_at'])
        return Response({'resource_id': domain.resource_id, 'status': domain.status})


# ── SslCertificate ViewSet ────────────────────────────────────────────────────

class SslCertificateViewSet(ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class   = SslCertificateSerializer
    lookup_field       = 'cert_id'

    def get_queryset(self):
        return SslCertificate.objects.filter(domain__owner=self.request.user)
