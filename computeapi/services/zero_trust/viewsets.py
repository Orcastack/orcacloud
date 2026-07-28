# OrcaCloud Zero-Trust – ViewSets

from django.db.models import Q
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import ZeroTrustPolicy, DevicePosture, ZeroTrustAccessLog
from .serializers import ZeroTrustPolicySerializer, DevicePostureSerializer, ZeroTrustAccessLogSerializer


class ZeroTrustPolicyViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ZeroTrustPolicySerializer

    def get_queryset(self):
        return ZeroTrustPolicy.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=['post'])
    def enable(self, request, pk=None):
        policy = self.get_object()
        policy.status = 'active'
        policy.save(update_fields=['status'])
        return Response({'status': 'active'})

    @action(detail=True, methods=['post'])
    def disable(self, request, pk=None):
        policy = self.get_object()
        policy.status = 'disabled'
        policy.save(update_fields=['status'])
        return Response({'status': 'disabled'})

    @action(detail=False, methods=['get'])
    def summary(self, request):
        qs = self.get_queryset()
        return Response({
            'total': qs.count(),
            'active': qs.filter(status='active').count(),
            'disabled': qs.filter(status='disabled').count(),
            'allow': qs.filter(policy_action='allow').count(),
            'deny':  qs.filter(policy_action='deny').count(),
        })


class DevicePostureViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = DevicePostureSerializer

    def get_queryset(self):
        return DevicePosture.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        import uuid
        serializer.save(owner=self.request.user, device_id=f'dev-{uuid.uuid4().hex[:12]}')

    @action(detail=True, methods=['post'])
    def assess(self, request, pk=None):
        """Re-assess posture score based on current flags."""
        device = self.get_object()
        checks = [
            device.disk_encrypted,
            device.screen_lock,
            device.antivirus_active,
            device.os_patched,
            device.firewall_active,
            device.is_managed,
        ]
        score = int((sum(checks) / len(checks)) * 100)
        device.posture_score = score
        device.posture_status = 'compliant' if score >= 80 else 'non_compliant' if score < 50 else 'unknown'
        device.last_assessed = timezone.now()
        device.save(update_fields=['posture_score', 'posture_status', 'last_assessed'])
        return Response(DevicePostureSerializer(device).data)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        qs = self.get_queryset()
        return Response({
            'total': qs.count(),
            'compliant': qs.filter(posture_status='compliant').count(),
            'non_compliant': qs.filter(posture_status='non_compliant').count(),
            'unknown': qs.filter(posture_status='unknown').count(),
            'managed': qs.filter(is_managed=True).count(),
        })


class ZeroTrustAccessLogViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ZeroTrustAccessLogSerializer

    def get_queryset(self):
        qs = ZeroTrustAccessLog.objects.filter(actor=self.request.user)
        decision = self.request.query_params.get('decision')
        if decision:
            qs = qs.filter(decision=decision)
        return qs[:500]

    @action(detail=False, methods=['get'])
    def summary(self, request):
        qs = ZeroTrustAccessLog.objects.filter(actor=request.user)
        return Response({
            'total': qs.count(),
            'allowed': qs.filter(decision='allowed').count(),
            'denied':  qs.filter(decision='denied').count(),
            'mfa_challenged': qs.filter(decision='mfa_challenged').count(),
        })
