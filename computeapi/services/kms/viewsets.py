# OrcaCloud KMS Service – ViewSets

from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import KMSEncryptionKey, KeyRotationRecord, KeyUsageLog
from .serializers import KMSEncryptionKeySerializer, KeyRotationRecordSerializer, KeyUsageLogSerializer


class KMSEncryptionKeyViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = KMSEncryptionKeySerializer

    def get_queryset(self):
        return KMSEncryptionKey.objects.filter(owner=self.request.user).prefetch_related('rotation_records')

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=['post'])
    def rotate(self, request, pk=None):
        key = self.get_object()
        record = KeyRotationRecord.objects.create(
            key=key,
            rotated_by=request.user,
            rotation_type=request.data.get('rotation_type', 'manual'),
            status='success',
        )
        key.next_rotation_date = None
        key.save(update_fields=['next_rotation_date'])
        return Response(KeyRotationRecordSerializer(record).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def disable(self, request, pk=None):
        key = self.get_object()
        key.status = 'disabled'
        key.save(update_fields=['status'])
        return Response({'status': 'disabled'})

    @action(detail=True, methods=['post'])
    def enable(self, request, pk=None):
        key = self.get_object()
        key.status = 'enabled'
        key.save(update_fields=['status'])
        return Response({'status': 'enabled'})

    @action(detail=True, methods=['post'])
    def schedule_deletion(self, request, pk=None):
        key = self.get_object()
        window = int(request.data.get('window_days', 30))
        key.status = 'pending_deletion'
        key.deletion_window_days = window
        from datetime import timedelta
        key.deletion_date = timezone.now() + timedelta(days=window)
        key.save(update_fields=['status', 'deletion_window_days', 'deletion_date'])
        return Response({'status': 'pending_deletion', 'deletion_date': key.deletion_date})

    @action(detail=True, methods=['post'])
    def cancel_deletion(self, request, pk=None):
        key = self.get_object()
        key.status = 'enabled'
        key.deletion_date = None
        key.save(update_fields=['status', 'deletion_date'])
        return Response({'status': 'enabled'})

    @action(detail=True, methods=['get'])
    def usage_logs(self, request, pk=None):
        key = self.get_object()
        logs = KeyUsageLog.objects.filter(key=key)[:200]
        return Response(KeyUsageLogSerializer(logs, many=True).data)

    @action(detail=True, methods=['get'])
    def rotation_history(self, request, pk=None):
        key = self.get_object()
        records = KeyRotationRecord.objects.filter(key=key)
        return Response(KeyRotationRecordSerializer(records, many=True).data)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        qs = self.get_queryset()
        return Response({
            'total': qs.count(),
            'enabled': qs.filter(status='enabled').count(),
            'disabled': qs.filter(status='disabled').count(),
            'pending_deletion': qs.filter(status='pending_deletion').count(),
            'rotation_enabled': qs.filter(rotation_enabled=True).count(),
        })
