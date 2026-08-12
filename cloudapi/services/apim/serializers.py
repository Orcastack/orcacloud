# OrcaCloud – API Management Serializers

from rest_framework import serializers
from .models import (
    ApiDefinition, ApiGateway, GatewayApiRoute,
    ApiConsumer, ApiKey,
    ApiProduct, ApiProductApi,
    ApiPolicy, ApiPolicyAttachment,
    ApimMetricSnapshot, ApimAuditLog,
)


class ApiDefinitionSerializer(serializers.ModelSerializer):
    policy_count = serializers.SerializerMethodField()
    gateway_count = serializers.SerializerMethodField()

    class Meta:
        model  = ApiDefinition
        fields = [
            'id', 'name', 'description', 'version', 'environment', 'protocol',
            'auth_type', 'status', 'base_path', 'upstream_url', 'tags',
            'request_count', 'error_count', 'avg_latency_ms',
            'policy_count', 'gateway_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'request_count', 'error_count', 'avg_latency_ms', 'created_at', 'updated_at']

    def get_policy_count(self, obj):
        return obj.policy_attachments.count()

    def get_gateway_count(self, obj):
        return obj.gateway_routes.count()


class ApiDefinitionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = ApiDefinition
        fields = [
            'name', 'description', 'version', 'environment', 'protocol',
            'auth_type', 'status', 'base_path', 'upstream_url', 'tags',
        ]


class ApiGatewaySerializer(serializers.ModelSerializer):
    api_count = serializers.SerializerMethodField()

    class Meta:
        model  = ApiGateway
        fields = [
            'id', 'name', 'description', 'engine', 'environment', 'region',
            'endpoint', 'health', 'active_apis', 'request_rate', 'error_rate',
            'latency_p99_ms', 'uptime_percent', 'last_seen', 'api_count',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'health', 'active_apis', 'request_rate',
                            'error_rate', 'latency_p99_ms', 'created_at', 'updated_at']

    def get_api_count(self, obj):
        return obj.routes.count()


class ApiGatewayCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = ApiGateway
        fields = ['name', 'description', 'engine', 'environment', 'region', 'endpoint', 'config']


class ApiConsumerSerializer(serializers.ModelSerializer):
    key_count = serializers.SerializerMethodField()

    class Meta:
        model  = ApiConsumer
        fields = [
            'id', 'name', 'description', 'consumer_type', 'environment',
            'contact_email', 'active', 'total_requests', 'key_count',
            'metadata', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'total_requests', 'created_at', 'updated_at']

    def get_key_count(self, obj):
        return obj.keys.filter(status='active').count()


class ApiConsumerCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = ApiConsumer
        fields = ['name', 'description', 'consumer_type', 'environment', 'contact_email', 'metadata']


class ApiKeySerializer(serializers.ModelSerializer):
    consumer_name = serializers.CharField(source='consumer.name', read_only=True)

    class Meta:
        model  = ApiKey
        fields = [
            'id', 'name', 'key_prefix', 'consumer', 'consumer_name', 'environment',
            'status', 'scopes', 'rate_limit', 'quota', 'expires_at', 'last_used_at',
            'request_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'key_prefix', 'key_hash', 'request_count',
                            'last_used_at', 'created_at', 'updated_at']


class ApiKeyCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = ApiKey
        fields = ['name', 'consumer', 'environment', 'scopes', 'rate_limit', 'quota', 'expires_at']


class ApiProductSerializer(serializers.ModelSerializer):
    api_count = serializers.SerializerMethodField()

    class Meta:
        model  = ApiProduct
        fields = [
            'id', 'name', 'description', 'tier', 'status', 'environment',
            'rate_limit', 'quota', 'burst_limit', 'subscriber_count',
            'api_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'subscriber_count', 'created_at', 'updated_at']

    def get_api_count(self, obj):
        return obj.apis.count()


class ApiProductCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = ApiProduct
        fields = ['name', 'description', 'tier', 'status', 'environment',
                  'rate_limit', 'quota', 'burst_limit']


class ApiPolicySerializer(serializers.ModelSerializer):
    attachment_count = serializers.SerializerMethodField()

    class Meta:
        model  = ApiPolicy
        fields = [
            'id', 'name', 'description', 'policy_type', 'scope', 'enabled',
            'environment', 'config', 'priority', 'attachment_count',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_attachment_count(self, obj):
        return obj.attachments.count()


class ApiPolicyCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = ApiPolicy
        fields = ['name', 'description', 'policy_type', 'scope', 'enabled',
                  'environment', 'config', 'priority']


class ApimMetricSnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model  = ApimMetricSnapshot
        fields = ['id', 'resource_type', 'resource_id', 'metric_type', 'value', 'recorded_at']


class ApimAuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model  = ApimAuditLog
        fields = [
            'id', 'actor', 'action', 'entity_type', 'entity_id', 'entity_name',
            'environment', 'before_state', 'after_state', 'created_at',
        ]
