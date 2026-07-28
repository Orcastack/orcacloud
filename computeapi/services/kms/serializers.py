# OrcaCloud KMS Service – Serializers

from rest_framework import serializers
from .models import KMSEncryptionKey, KeyRotationRecord, KeyUsageLog


class KeyRotationRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = KeyRotationRecord
        fields = ['id', 'rotation_type', 'previous_key_version', 'new_key_version', 'status', 'notes', 'created_at']
        read_only_fields = '__all__'


class KeyUsageLogSerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(source='actor.username', read_only=True)

    class Meta:
        model = KeyUsageLog
        fields = ['id', 'actor', 'actor_username', 'operation', 'resource_id', 'resource_type',
                  'caller_ip', 'region', 'outcome', 'created_at']
        read_only_fields = '__all__'


class KMSEncryptionKeySerializer(serializers.ModelSerializer):
    rotation_records = KeyRotationRecordSerializer(many=True, read_only=True)

    class Meta:
        model = KMSEncryptionKey
        fields = [
            'id', 'key_id', 'name', 'description', 'key_type', 'key_usage', 'status',
            'key_material_origin', 'alias', 'rotation_enabled', 'rotation_period_days',
            'next_rotation_date', 'deletion_date', 'deletion_window_days', 'policy',
            'created_at', 'updated_at', 'rotation_records',
        ]
        read_only_fields = ['id', 'key_id', 'created_at', 'updated_at']
