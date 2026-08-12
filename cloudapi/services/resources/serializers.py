from rest_framework import serializers
from .models import PlatformResource


class PlatformResourceSerializer(serializers.ModelSerializer):
    owner_username = serializers.SerializerMethodField()

    class Meta:
        model  = PlatformResource
        fields = [
            'id', 'name', 'resource_type', 'subsystem', 'external_id',
            'group_id', 'group_name', 'project_id', 'project_name',
            'environment', 'status', 'health_score', 'metadata',
            'owner', 'owner_username', 'last_synced', 'created_at',
        ]
        read_only_fields = ['id', 'last_synced', 'created_at', 'owner_username']

    def get_owner_username(self, obj):
        return obj.owner.username if obj.owner else None
