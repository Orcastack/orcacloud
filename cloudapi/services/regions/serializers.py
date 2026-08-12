from rest_framework import serializers
from .models import CloudRegion, AvailabilityZone, RegionPeer


class AvailabilityZoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = AvailabilityZone
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class CloudRegionSerializer(serializers.ModelSerializer):
    zones = AvailabilityZoneSerializer(many=True, read_only=True)
    zone_count = serializers.IntegerField(source='zones.count', read_only=True)

    class Meta:
        model = CloudRegion
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class CloudRegionListSerializer(serializers.ModelSerializer):
    """Lightweight serializer used in list views (no nested zones)."""
    zone_count = serializers.IntegerField(source='zones.count', read_only=True)

    class Meta:
        model = CloudRegion
        fields = [
            'id', 'code', 'name', 'country', 'city', 'continent',
            'latitude', 'longitude', 'status', 'is_default',
            'uptime_30d_pct', 'latency_ms', 'enabled_services',
            'zone_count', 'created_at',
        ]


class RegionPeerSerializer(serializers.ModelSerializer):
    primary_code   = serializers.CharField(source='primary.code',   read_only=True)
    secondary_code = serializers.CharField(source='secondary.code', read_only=True)

    class Meta:
        model = RegionPeer
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'primary_code', 'secondary_code']
