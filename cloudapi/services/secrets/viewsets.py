# OrcaCloud Secrets Vault – ViewSets

from django.utils import timezone
from datetime import timedelta
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Secret, SecretVersion, SecretAccessLog
from .serializers import SecretSerializer, SecretVersionSerializer, SecretAccessLogSerializer


class SecretViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = SecretSerializer

    def get_queryset(self):
        return Secret.objects.filter(
            owner=self.request.user
        ).exclude(status='deleted').prefetch_related('versions')

    def perform_create(self, serializer):
        secret = serializer.save(owner=self.request.user)
        # Create initial version
        SecretVersion.objects.create(secret=secret, created_by=self.request.user, status='current')
        # Audit
        SecretAccessLog.objects.create(
            secret=secret, actor=self.request.user, action='put_value', outcome='success',
            actor_ip=self.request.META.get('REMOTE_ADDR', ''),
        )

    @action(detail=True, methods=['get'])
    def value(self, request, pk=None):
        """Get current secret value metadata (not the actual value – see vault backend)."""
        secret = self.get_object()
        secret.last_accessed = timezone.now()
        secret.save(update_fields=['last_accessed'])
        SecretAccessLog.objects.create(
            secret=secret, actor=request.user, action='get_value', outcome='success',
            actor_ip=request.META.get('REMOTE_ADDR', ''),
        )
        current = secret.versions.filter(status='current').first()
        return Response({
            'secret_id': secret.secret_id,
            'name': secret.name,
            'version_id': current.version_id if current else None,
            'last_changed': secret.last_changed,
            'message': 'Value available via vault backend API, not this endpoint.',
        })

    @action(detail=True, methods=['post'])
    def put_value(self, request, pk=None):
        """Store a new version of the secret."""
        secret = self.get_object()
        # Deprecate old current versions
        secret.versions.filter(status='current').update(status='previous')
        new_version = SecretVersion.objects.create(
            secret=secret,
            created_by=request.user,
            status='current',
        )
        secret.last_changed = timezone.now()
        secret.save(update_fields=['last_changed'])
        SecretAccessLog.objects.create(
            secret=secret, actor=request.user, action='put_value', outcome='success',
            actor_ip=request.META.get('REMOTE_ADDR', ''),
        )
        return Response(SecretVersionSerializer(new_version).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def rotate(self, request, pk=None):
        """Trigger immediate rotation."""
        secret = self.get_object()
        if not secret.rotation_enabled:
            return Response({'error': 'Rotation is not enabled for this secret.'}, status=status.HTTP_400_BAD_REQUEST)
        # Mark old as previous
        secret.versions.filter(status='current').update(status='previous')
        new_version = SecretVersion.objects.create(
            secret=secret, created_by=request.user, status='current', rotation_triggered=True
        )
        secret.last_rotated_date = timezone.now().date()
        if secret.rotation_days:
            secret.next_rotation_date = (timezone.now() + timedelta(days=secret.rotation_days)).date()
        secret.save(update_fields=['last_rotated_date', 'next_rotation_date'])
        SecretAccessLog.objects.create(
            secret=secret, actor=request.user, action='rotate', outcome='success',
            actor_ip=request.META.get('REMOTE_ADDR', ''),
        )
        return Response({'status': 'rotated', 'new_version_id': new_version.version_id})

    @action(detail=True, methods=['post'])
    def schedule_deletion(self, request, pk=None):
        secret = self.get_object()
        days = int(request.data.get('recovery_window_days', 30))
        secret.deletion_scheduled_for = timezone.now() + timedelta(days=days)
        secret.status = 'scheduled_delete'
        secret.save(update_fields=['deletion_scheduled_for', 'status'])
        SecretAccessLog.objects.create(
            secret=secret, actor=request.user, action='delete', outcome='success',
            actor_ip=request.META.get('REMOTE_ADDR', ''),
        )
        return Response({'status': 'scheduled_delete', 'deletion_scheduled_for': secret.deletion_scheduled_for})

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        secret = self.get_object()
        secret.status = 'active'
        secret.deletion_scheduled_for = None
        secret.save(update_fields=['status', 'deletion_scheduled_for'])
        SecretAccessLog.objects.create(
            secret=secret, actor=request.user, action='restore', outcome='success',
            actor_ip=request.META.get('REMOTE_ADDR', ''),
        )
        return Response({'status': 'active'})

    @action(detail=True, methods=['get'])
    def versions(self, request, pk=None):
        secret = self.get_object()
        return Response(SecretVersionSerializer(secret.versions.all(), many=True).data)

    @action(detail=True, methods=['get'])
    def access_logs(self, request, pk=None):
        secret = self.get_object()
        logs = secret.access_logs.all()[:200]
        return Response(SecretAccessLogSerializer(logs, many=True).data)

    @action(detail=False, methods=['get'])
    def expiring_soon(self, request):
        """Secrets expiring within 30 days."""
        cutoff = timezone.now() + timedelta(days=30)
        qs = self.get_queryset().filter(expiry_date__lte=cutoff, expiry_date__isnull=False)
        return Response(SecretSerializer(qs, many=True).data)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        qs = self.get_queryset()
        cutoff = timezone.now() + timedelta(days=30)
        return Response({
            'total': qs.count(),
            'active': qs.filter(status='active').count(),
            'rotation_enabled': qs.filter(rotation_enabled=True).count(),
            'expiring_soon': qs.filter(expiry_date__lte=cutoff, expiry_date__isnull=False).count(),
            'scheduled_deletion': qs.filter(status='scheduled_delete').count(),
        })
