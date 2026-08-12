import hashlib
import json
from datetime import timedelta

from django.contrib.auth.models import Group
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..core.base_models import AuditLog
from ..storage.models import EncryptionKey
from ..networking.models import SecurityGroup, VPC
from ..compute.models import KubernetesCluster


class ComplianceViewSet(viewsets.ViewSet):
    """Compliance controls and evidence collection APIs."""

    permission_classes = [IsAuthenticated]

    def _controls(self):
        return {
            'soc2': [
                {'id': 'CC6.1', 'name': 'Access controls', 'category': 'security'},
                {'id': 'CC6.6', 'name': 'Logical access security software', 'category': 'security'},
                {'id': 'CC7.2', 'name': 'Change management monitoring', 'category': 'change-management'},
                {'id': 'A1.2', 'name': 'Availability monitoring', 'category': 'availability'},
            ],
            'iso27001': [
                {'id': 'A.5.15', 'name': 'Access control policy', 'category': 'access-control'},
                {'id': 'A.8.15', 'name': 'Logging', 'category': 'operations-security'},
                {'id': 'A.8.24', 'name': 'Use of cryptography', 'category': 'cryptography'},
                {'id': 'A.5.23', 'name': 'Information security for cloud services', 'category': 'supplier-relationships'},
            ],
            'gdpr': [
                {'id': 'Art.5', 'name': 'Data minimization and integrity', 'category': 'principles'},
                {'id': 'Art.30', 'name': 'Records of processing', 'category': 'governance'},
                {'id': 'Art.32', 'name': 'Security of processing', 'category': 'security'},
                {'id': 'Art.33', 'name': 'Breach notification readiness', 'category': 'incident-management'},
            ],
        }

    def _snapshot(self, user):
        now = timezone.now()
        lookback = now - timedelta(days=30)

        audit_logs_30d = AuditLog.objects.filter(user=user, created_at__gte=lookback).count()
        admin_groups = Group.objects.filter(user=user, name__iregex='admin|security|ops').count()
        api_keys = user.api_keys.filter(is_active=True).count() if hasattr(user, 'api_keys') else 0

        encryption_keys_total = EncryptionKey.objects.filter(owner=user).count()
        encryption_keys_enabled = EncryptionKey.objects.filter(owner=user, is_active=True).count()

        sg_count = SecurityGroup.objects.filter(owner=user).count()
        vpc_count = VPC.objects.filter(owner=user).count()

        clusters = KubernetesCluster.objects.filter(owner=user)
        clusters_total = clusters.count()
        clusters_rbac_enabled = clusters.filter(rbac_enabled=True).count()
        clusters_network_policy_enabled = clusters.filter(network_policy_enabled=True).count()

        zero_trust_score = 0
        zero_trust_score += 35 if clusters_total == 0 or clusters_rbac_enabled == clusters_total else 10
        zero_trust_score += 30 if clusters_total == 0 or clusters_network_policy_enabled == clusters_total else 10
        zero_trust_score += 20 if sg_count > 0 and vpc_count > 0 else 5
        zero_trust_score += 15 if audit_logs_30d > 0 else 0

        iam_maturity = 'basic'
        if admin_groups > 0 and api_keys > 0:
            iam_maturity = 'advanced'
        elif admin_groups > 0 or api_keys > 0:
            iam_maturity = 'standard'

        return {
            'collected_at': now.isoformat(),
            'identity_access': {
                'admin_groups_count': admin_groups,
                'active_api_keys_count': api_keys,
                'iam_maturity': iam_maturity,
            },
            'encryption': {
                'customer_keys_total': encryption_keys_total,
                'customer_keys_active': encryption_keys_enabled,
                'at_rest_supported': True,
                'in_transit_supported': True,
            },
            'zero_trust': {
                'score': max(0, min(100, zero_trust_score)),
                'k8s_clusters_total': clusters_total,
                'k8s_rbac_enabled': clusters_rbac_enabled,
                'k8s_network_policy_enabled': clusters_network_policy_enabled,
                'security_groups_count': sg_count,
                'vpcs_count': vpc_count,
            },
            'auditability': {
                'audit_logs_last_30d': audit_logs_30d,
                'evidence_retention_days': 365,
            },
        }

    def list(self, request):
        return Response({
            'frameworks': ['soc2', 'iso27001', 'gdpr'],
            'controls': self._controls(),
            'actions': {
                'collect_evidence': '/api/services/compliance/collect_evidence/',
                'control_status': '/api/services/compliance/control_status/',
                'attestation': '/api/services/compliance/attestation/',
            },
        })

    @action(detail=False, methods=['get'])
    def control_status(self, request):
        framework = request.query_params.get('framework', 'soc2').lower()
        controls = self._controls().get(framework)
        if controls is None:
            return Response({'error': 'unsupported framework'}, status=status.HTTP_400_BAD_REQUEST)

        snapshot = self._snapshot(request.user)

        status_rows = []
        for control in controls:
            control_id = control['id']
            if control_id in {'CC6.1', 'A.5.15', 'Art.32'}:
                state = 'implemented' if snapshot['identity_access']['iam_maturity'] in {'standard', 'advanced'} else 'partial'
            elif control_id in {'CC6.6', 'A.8.24'}:
                state = 'implemented' if snapshot['encryption']['customer_keys_total'] > 0 else 'partial'
            elif control_id in {'CC7.2', 'A.8.15', 'Art.30'}:
                state = 'implemented' if snapshot['auditability']['audit_logs_last_30d'] > 0 else 'partial'
            elif control_id in {'A1.2', 'Art.33'}:
                state = 'implemented'
            elif control_id in {'A.5.23', 'Art.5'}:
                state = 'partial'
            else:
                state = 'partial'

            status_rows.append({
                **control,
                'status': state,
            })

        completion = round((sum(1 for c in status_rows if c['status'] == 'implemented') / max(len(status_rows), 1)) * 100, 2)
        return Response({
            'framework': framework,
            'completion_percent': completion,
            'controls': status_rows,
            'snapshot': snapshot,
        })

    @action(detail=False, methods=['post'])
    def collect_evidence(self, request):
        framework = request.data.get('framework', 'soc2').lower()
        snapshot = self._snapshot(request.user)

        body = {
            'framework': framework,
            'tenant': request.user.username,
            'generated_at': timezone.now().isoformat(),
            'controls': self._controls().get(framework, []),
            'snapshot': snapshot,
        }
        canonical = json.dumps(body, sort_keys=True).encode('utf-8')
        checksum = hashlib.sha256(canonical).hexdigest()

        return Response({
            'report_id': f"evidence-{timezone.now().strftime('%Y%m%d%H%M%S')}",
            'checksum_sha256': checksum,
            'evidence_pack': body,
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def attestation(self, request):
        framework = request.data.get('framework', 'soc2').lower()
        period_start = request.data.get('period_start')
        period_end = request.data.get('period_end')

        if not period_start or not period_end:
            return Response({'error': 'period_start and period_end are required'}, status=status.HTTP_400_BAD_REQUEST)

        snapshot = self._snapshot(request.user)
        attestation_payload = {
            'framework': framework,
            'period_start': period_start,
            'period_end': period_end,
            'declared_by': request.user.username,
            'declared_at': timezone.now().isoformat(),
            'summary': {
                'zero_trust_score': snapshot['zero_trust']['score'],
                'iam_maturity': snapshot['identity_access']['iam_maturity'],
                'audit_logs_last_30d': snapshot['auditability']['audit_logs_last_30d'],
            },
            'note': 'Programmatic attestation generated by Compliance API. Attach external evidence for formal audits.',
        }
        return Response(attestation_payload, status=status.HTTP_201_CREATED)
