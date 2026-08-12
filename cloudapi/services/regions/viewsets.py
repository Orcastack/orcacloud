"""
Region management viewsets.

CloudRegionViewSet exposes a public (read) + admin (write) catalogue of
platform regions. AvailabilityZoneViewSet and RegionPeerViewSet provide
fine-grained zone and failover pair management.
"""
from django.utils import timezone

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response

from .models import CloudRegion, AvailabilityZone, RegionPeer
from .serializers import (
    CloudRegionSerializer,
    CloudRegionListSerializer,
    AvailabilityZoneSerializer,
    RegionPeerSerializer,
)


class CloudRegionViewSet(viewsets.ModelViewSet):
    """
    List, retrieve, create, update and delete cloud regions.

    GET  /regions/        — list all regions (lightweight)
    GET  /regions/{id}/   — full detail including zones
    POST /regions/        — create region (admin only)
    POST /regions/{id}/set_status/  — update operational status
    GET  /regions/availability/     — live availability snapshot
    """
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = CloudRegion.objects.prefetch_related('zones').order_by('continent', 'code')
        continent = self.request.query_params.get('continent')
        region_status = self.request.query_params.get('status')
        if continent:
            qs = qs.filter(continent__iexact=continent)
        if region_status:
            qs = qs.filter(status=region_status)
        return qs

    def get_serializer_class(self):
        if self.action == 'list':
            return CloudRegionListSerializer
        return CloudRegionSerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAdminUser()]
        return [IsAuthenticated()]

    @action(detail=True, methods=['post'])
    def set_status(self, request, pk=None):
        """Update the operational status of a region (admin only)."""
        if not request.user.is_staff:
            return Response({'detail': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)
        region = self.get_object()
        new_status = request.data.get('status')
        valid = [c[0] for c in CloudRegion._meta.get_field('status').choices]
        if new_status not in valid:
            return Response({'error': f'Invalid status. Choose from: {valid}'}, status=status.HTTP_400_BAD_REQUEST)
        region.status = new_status
        region.save(update_fields=['status', 'updated_at'])
        return Response(CloudRegionSerializer(region).data)

    @action(detail=False, methods=['get'])
    def availability(self, request):
        """Return a live snapshot of region availability stats."""
        regions = CloudRegion.objects.prefetch_related('zones').all()
        snapshot = []
        for region in regions:
            zones = region.zones.all()
            available_zones = zones.filter(status='available').count()
            snapshot.append({
                'code': region.code,
                'name': region.name,
                'status': region.status,
                'uptime_30d_pct': region.uptime_30d_pct,
                'latency_ms': region.latency_ms,
                'zones_total': zones.count(),
                'zones_available': available_zones,
                'fully_available': region.status == 'active' and available_zones == zones.count(),
            })
        return Response({
            'checked_at': timezone.now().isoformat(),
            'regions': snapshot,
        })

    @action(detail=True, methods=['get'])
    def services(self, request, pk=None):
        """Return the list of services enabled in this region."""
        region = self.get_object()
        return Response({
            'region': region.code,
            'enabled_services': region.enabled_services,
        })


class AvailabilityZoneViewSet(viewsets.ModelViewSet):
    """CRUD for availability zones within a region."""
    serializer_class = AvailabilityZoneSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = AvailabilityZone.objects.select_related('region')
        region_code = self.request.query_params.get('region')
        if region_code:
            qs = qs.filter(region__code=region_code)
        return qs

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAdminUser()]
        return [IsAuthenticated()]


class RegionPeerViewSet(viewsets.ModelViewSet):
    """Manage failover pairs between regions."""
    serializer_class = RegionPeerSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return RegionPeer.objects.select_related('primary', 'secondary').all()

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAdminUser()]
        return [IsAuthenticated()]

    @action(detail=True, methods=['post'])
    def test_failover(self, request, pk=None):
        """Record a successful failover test timestamp."""
        if not request.user.is_staff:
            return Response({'detail': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)
        peer = self.get_object()
        peer.last_tested_at = timezone.now()
        peer.save(update_fields=['last_tested_at'])
        return Response({
            'detail': f'Failover test recorded for {peer}.',
            'last_tested_at': peer.last_tested_at.isoformat(),
        })
