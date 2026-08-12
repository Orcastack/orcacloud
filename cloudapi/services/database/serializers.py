# OrcaCloud – Managed Database Serializers

from rest_framework import serializers
from .models import ManagedDatabase, DatabaseCredential, DatabaseBackup, DatabaseMetric


class DatabaseMetricSerializer(serializers.ModelSerializer):
    class Meta:
        model  = DatabaseMetric
        fields = [
            'id', 'cpu_percent', 'memory_percent', 'storage_used_gb',
            'active_connections', 'queries_per_second', 'avg_query_latency_ms',
            'replication_lag_ms', 'iops_read', 'iops_write', 'created_at',
        ]
        read_only_fields = fields


class DatabaseBackupSerializer(serializers.ModelSerializer):
    class Meta:
        model  = DatabaseBackup
        fields = [
            'backup_id', 'backup_type', 'status', 'size_gb',
            'duration_s', 'expires_at', 'created_at',
        ]
        read_only_fields = fields


class DatabaseCredentialSerializer(serializers.ModelSerializer):
    password = serializers.SerializerMethodField()

    class Meta:
        model  = DatabaseCredential
        fields = ['id', 'username', 'password', 'role', 'is_active', 'last_rotated_at', 'created_at']

    def get_password(self, obj):
        # Only expose in create/rotate context, otherwise mask
        request = self.context.get('request')
        if request and request.method == 'POST':
            return obj.password
        return '••••••••'


class ManagedDatabaseListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views."""
    engine_display  = serializers.CharField(source='get_engine_display', read_only=True)
    region_display  = serializers.CharField(source='get_region_display', read_only=True)
    default_port    = serializers.IntegerField(read_only=True)

    class Meta:
        model  = ManagedDatabase
        fields = [
            'id', 'name', 'description', 'engine', 'engine_display',
            'version', 'tenancy_model', 'vcpus', 'memory_mb', 'storage_gb',
            'read_replicas', 'region', 'region_display', 'status',
            'host', 'port', 'database_name', 'ssl_enabled',
            'publicly_accessible', 'backup_enabled', 'backup_retention_days',
            'last_backup_at', 'current_storage_gb', 'connection_count',
            'hourly_cost_usd', 'created_at', 'updated_at', 'provisioned_at',
            'default_port',
        ]
        read_only_fields = ['id', 'status', 'host', 'port', 'created_at', 'updated_at', 'provisioned_at', 'last_backup_at']


class ManagedDatabaseDetailSerializer(ManagedDatabaseListSerializer):
    """Full serializer with credentials and backups."""
    credentials = DatabaseCredentialSerializer(many=True, read_only=True)
    backups      = DatabaseBackupSerializer(many=True, read_only=True)
    latest_metric = serializers.SerializerMethodField()

    class Meta(ManagedDatabaseListSerializer.Meta):
        fields = ManagedDatabaseListSerializer.Meta.fields + [
            'allowed_ips', 'vpc_id', 'connection_uri',
            'credentials', 'backups', 'latest_metric',
        ]

    def get_latest_metric(self, obj):
        m = obj.metrics.first()
        if m:
            return DatabaseMetricSerializer(m).data
        return None


class CreateDatabaseSerializer(serializers.ModelSerializer):
    class Meta:
        model  = ManagedDatabase
        fields = [
            'name', 'description', 'engine', 'version', 'tenancy_model',
            'vcpus', 'memory_mb', 'storage_gb', 'read_replicas',
            'region', 'database_name', 'ssl_enabled',
            'publicly_accessible', 'backup_enabled', 'backup_retention_days',
            'allowed_ips', 'hourly_cost_usd',
        ]

    def validate_version(self, value):
        from .models import VERSION_MAP
        engine = self.initial_data.get('engine')
        valid  = VERSION_MAP.get(engine, [])
        if valid and value not in valid:
            raise serializers.ValidationError(f"Version '{value}' is not valid for {engine}. Valid: {valid}")
        return value


class ScaleDatabaseSerializer(serializers.Serializer):
    vcpus      = serializers.IntegerField(min_value=1, required=False)
    memory_mb  = serializers.IntegerField(min_value=256, required=False)
    storage_gb = serializers.IntegerField(min_value=1, required=False)
    read_replicas = serializers.IntegerField(min_value=0, max_value=5, required=False)

    def validate(self, data):
        if not data:
            raise serializers.ValidationError('At least one scaling parameter must be provided.')
        return data
