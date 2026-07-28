# OrcaCloud Zero-Trust – Serializers

from rest_framework import serializers
from .models import ZeroTrustPolicy, DevicePosture, ZeroTrustAccessLog


class ZeroTrustPolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = ZeroTrustPolicy
        fields = [
            'id', 'resource_id', 'name', 'description', 'policy_action', 'status', 'priority',
            'subjects', 'resources', 'conditions', 'matched_count', 'last_matched',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'resource_id', 'matched_count', 'last_matched', 'created_at', 'updated_at']


class DevicePostureSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source='owner.username', read_only=True)

    class Meta:
        model = DevicePosture
        fields = [
            'id', 'device_id', 'owner', 'owner_username', 'device_name', 'platform',
            'os_version', 'posture_status', 'is_managed', 'disk_encrypted', 'screen_lock',
            'antivirus_active', 'os_patched', 'firewall_active', 'last_seen',
            'last_assessed', 'posture_score', 'created_at',
        ]
        read_only_fields = ['id', 'device_id', 'posture_score', 'last_assessed', 'created_at']


class ZeroTrustAccessLogSerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(source='actor.username', read_only=True)

    class Meta:
        model = ZeroTrustAccessLog
        fields = [
            'id', 'actor', 'actor_username', 'device', 'policy', 'target_resource',
            'target_service', 'decision', 'reason', 'source_ip', 'source_country',
            'risk_score', 'latency_ms', 'created_at',
        ]
        read_only_fields = '__all__'
