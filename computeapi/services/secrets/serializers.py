# OrcaCloud Secrets Vault – Serializers

from rest_framework import serializers
from .models import Secret, SecretVersion, SecretAccessLog


class SecretVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = SecretVersion
        fields = ['id', 'version_id', 'status', 'rotation_triggered', 'created_at']
        read_only_fields = '__all__'


class SecretAccessLogSerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(source='actor.username', read_only=True)

    class Meta:
        model = SecretAccessLog
        fields = ['id', 'actor', 'actor_username', 'action', 'outcome', 'actor_ip', 'region', 'application', 'created_at']
        read_only_fields = '__all__'


class SecretSerializer(serializers.ModelSerializer):
    versions = SecretVersionSerializer(many=True, read_only=True)
    current_version = serializers.SerializerMethodField()
    days_until_expiry = serializers.SerializerMethodField()

    class Meta:
        model = Secret
        fields = [
            'id', 'secret_id', 'name', 'description', 'secret_type', 'status',
            'kms_key_id', 'rotation_enabled', 'rotation_days',
            'next_rotation_date', 'last_rotated_date', 'expiry_date',
            'deletion_scheduled_for', 'replication_regions',
            'last_accessed', 'last_changed', 'created_at', 'updated_at',
            'versions', 'current_version', 'days_until_expiry',
        ]
        read_only_fields = ['id', 'secret_id', 'created_at', 'updated_at', 'current_version', 'days_until_expiry']

    def get_current_version(self, obj):
        v = obj.versions.filter(status='current').first()
        return v.version_id if v else None

    def get_days_until_expiry(self, obj):
        if not obj.expiry_date:
            return None
        from django.utils import timezone
        delta = obj.expiry_date - timezone.now()
        return max(0, delta.days)
