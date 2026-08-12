# OrcaCloud Storage Service - Serializers

from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    StorageBucket, S3Object, StorageVolume, StorageSnapshot,
    FileShare, FileShareMount, EncryptionKey,
    BackupPolicy, Backup, StorageMetric
)


# ============================================================================
# STORAGE BUCKET SERIALIZERS
# ============================================================================

class StorageBucketListSerializer(serializers.ModelSerializer):
    """Lightweight storage bucket serializer."""
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    total_size_gb = serializers.FloatField(read_only=True)

    class Meta:
        model = StorageBucket
        fields = [
            'resource_id', 'bucket_id', 'bucket_name', 'region', 'status',
            'total_objects', 'total_size_gb', 'owner_username',
            'versioning_enabled', 'encryption_enabled', 'created_at'
        ]
        read_only_fields = ['resource_id', 'bucket_id', 'created_at']


class StorageBucketDetailSerializer(serializers.ModelSerializer):
    """Full storage bucket details."""
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    total_size_gb = serializers.FloatField(read_only=True)
    object_count = serializers.SerializerMethodField()

    class Meta:
        model = StorageBucket
        fields = [
            'resource_id', 'bucket_id', 'bucket_name', 'region', 'acl',
            'versioning_enabled', 'mfa_delete_enabled', 'encryption_enabled',
            'encryption_type', 'kms_key_id', 'logging_enabled',
            'log_target_bucket', 'log_prefix', 'request_metrics_enabled',
            'status', 'total_objects', 'object_count', 'total_size_gb',
            'owner', 'owner_username', 'tags', 'metadata',
            'created_at'
        ]
        read_only_fields = [
            'resource_id', 'bucket_id', 'status', 'total_objects',
            'total_size_gb', 'created_at'
        ]

    def get_object_count(self, obj):
        return obj.objects.count()


class StorageBucketCreateSerializer(serializers.ModelSerializer):
    """Create storage bucket."""
    class Meta:
        model = StorageBucket
        fields = [
            'bucket_name', 'region', 'acl', 'versioning_enabled',
            'mfa_delete_enabled', 'encryption_enabled', 'encryption_type',
            'kms_key_id', 'logging_enabled', 'log_target_bucket',
            'log_prefix', 'request_metrics_enabled', 'tags', 'metadata'
        ]


class StorageBucketUpdateSerializer(serializers.ModelSerializer):
    """Update storage bucket."""
    class Meta:
        model = StorageBucket
        fields = [
            'acl', 'versioning_enabled', 'logging_enabled',
            'log_target_bucket', 'log_prefix', 'request_metrics_enabled',
            'tags', 'metadata'
        ]


# ============================================================================
# S3 OBJECT SERIALIZERS
# ============================================================================

class S3ObjectListSerializer(serializers.ModelSerializer):
    """Lightweight S3 object serializer."""
    bucket_name = serializers.CharField(source='bucket.bucket_name', read_only=True)
    size_mb = serializers.SerializerMethodField()

    class Meta:
        model = S3Object
        fields = [
            'object_key', 'bucket_name', 'size_mb', 'storage_class',
            'is_public', 'last_modified', 'created_at'
        ]

    def get_size_mb(self, obj):
        return round(obj.size_bytes / (1024 ** 2), 2)


class S3ObjectDetailSerializer(serializers.ModelSerializer):
    """Full S3 object details."""
    bucket_name = serializers.CharField(source='bucket.bucket_name', read_only=True)
    size_mb = serializers.SerializerMethodField()

    class Meta:
        model = S3Object
        fields = [
            'object_key', 'bucket', 'bucket_name', 'size_bytes', 'size_mb',
            'content_type', 'etag', 'version_id', 'is_latest',
            'metadata', 'tags', 'storage_class', 'is_public', 'acl',
            'created_at', 'last_modified'
        ]
        read_only_fields = [
            'object_key', 'size_bytes', 'etag', 'created_at', 'last_modified'
        ]

    def get_size_mb(self, obj):
        return round(obj.size_bytes / (1024 ** 2), 2)


class S3ObjectCreateSerializer(serializers.ModelSerializer):
    """Create/upload S3 object."""
    class Meta:
        model = S3Object
        fields = [
            'object_key', 'bucket', 'content_type', 'storage_class',
            'is_public', 'acl', 'metadata', 'tags'
        ]


class S3ObjectUpdateSerializer(serializers.ModelSerializer):
    """Update S3 object metadata."""
    class Meta:
        model = S3Object
        fields = [
            'storage_class', 'is_public', 'acl', 'metadata', 'tags'
        ]


# ============================================================================
# STORAGE VOLUME SERIALIZERS
# ============================================================================

class StorageVolumeListSerializer(serializers.ModelSerializer):
    """Lightweight storage volume serializer."""
    owner_username = serializers.CharField(source='owner.username', read_only=True)

    class Meta:
        model = StorageVolume
        fields = [
            'resource_id', 'volume_id', 'name', 'size_gb', 'volume_type',
            'status', 'is_attached', 'availability_zone',
            'owner_username', 'created_at'
        ]
        read_only_fields = ['resource_id', 'volume_id', 'created_at']


class StorageVolumeDetailSerializer(serializers.ModelSerializer):
    """Full storage volume details."""
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    snapshot_count = serializers.SerializerMethodField()

    class Meta:
        model = StorageVolume
        fields = [
            'resource_id', 'volume_id', 'name', 'description', 'size_gb',
            'volume_type', 'iops', 'throughput_mbps', 'region',
            'availability_zone', 'attached_to_instance', 'attachment_device',
            'is_attached', 'attached_at', 'encryption_enabled', 'kms_key_id',
            'status', 'delete_on_termination', 'owner', 'owner_username',
            'tags', 'metadata', 'created_at', 'updated_at', 'snapshot_count'
        ]
        read_only_fields = [
            'resource_id', 'volume_id', 'status', 'attached_at',
            'created_at', 'updated_at'
        ]

    def get_snapshot_count(self, obj):
        return obj.snapshots.count()


class StorageVolumeCreateSerializer(serializers.ModelSerializer):
    """Create storage volume."""
    class Meta:
        model = StorageVolume
        fields = [
            'name', 'description', 'size_gb', 'volume_type',
            'iops', 'throughput_mbps', 'availability_zone',
            'encryption_enabled', 'kms_key_id', 'delete_on_termination',
            'tags', 'metadata'
        ]


class StorageVolumeUpdateSerializer(serializers.ModelSerializer):
    """Update storage volume."""
    class Meta:
        model = StorageVolume
        fields = [
            'name', 'description', 'iops', 'throughput_mbps',
            'delete_on_termination', 'tags', 'metadata'
        ]


# ============================================================================
# STORAGE SNAPSHOT SERIALIZERS
# ============================================================================

class StorageSnapshotListSerializer(serializers.ModelSerializer):
    """Lightweight storage snapshot serializer."""
    volume_name = serializers.CharField(source='volume.name', read_only=True)
    owner_username = serializers.CharField(source='owner.username', read_only=True)

    class Meta:
        model = StorageSnapshot
        fields = [
            'snapshot_id', 'volume_name', 'size_gb', 'status',
            'progress_percent', 'is_public', 'owner_username', 'created_at'
        ]
        read_only_fields = ['snapshot_id', 'created_at']


class StorageSnapshotDetailSerializer(serializers.ModelSerializer):
    """Full storage snapshot details."""
    volume_name = serializers.CharField(source='volume.name', read_only=True)
    owner_username = serializers.CharField(source='owner.username', read_only=True)

    class Meta:
        model = StorageSnapshot
        fields = [
            'snapshot_id', 'volume', 'volume_name', 'size_gb', 'owner',
            'owner_username', 'status', 'progress_percent', 'is_public',
            'shared_with_accounts', 'retention_days', 'scheduled_deletion_date',
            'description', 'tags', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'snapshot_id', 'size_gb', 'created_at', 'updated_at'
        ]


# ============================================================================
# FILE SHARE SERIALIZERS
# ============================================================================

class FileShareMountSerializer(serializers.ModelSerializer):
    """Serializer for file share mounts."""
    class Meta:
        model = FileShareMount
        fields = [
            'mount_id', 'file_share', 'instance_id', 'mount_path',
            'mount_options', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['mount_id', 'created_at', 'updated_at']


class FileShareListSerializer(serializers.ModelSerializer):
    """Lightweight file share serializer."""
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    available_gb = serializers.FloatField(read_only=True)
    mount_count = serializers.SerializerMethodField()

    class Meta:
        model = FileShare
        fields = [
            'resource_id', 'file_share_id', 'name', 'size_gb', 'used_gb',
            'available_gb', 'protocol', 'status', 'owner_username',
            'mount_count', 'created_at'
        ]
        read_only_fields = ['resource_id', 'file_share_id', 'created_at']

    def get_mount_count(self, obj):
        return obj.mounts.count()


class FileShareDetailSerializer(serializers.ModelSerializer):
    """Full file share details."""
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    available_gb = serializers.FloatField(read_only=True)
    mounts = FileShareMountSerializer(many=True, read_only=True)

    class Meta:
        model = FileShare
        fields = [
            'resource_id', 'file_share_id', 'name', 'description', 'size_gb',
            'used_gb', 'available_gb', 'protocol', 'allowed_clients',
            'performance_tier', 'throughput_mbps', 'vpc_id', 'subnet_id',
            'security_group_id', 'mount_point', 'encryption_in_transit',
            'encryption_at_rest', 'status', 'owner', 'owner_username',
            'tags', 'metadata', 'created_at', 'updated_at', 'mounts'
        ]
        read_only_fields = [
            'resource_id', 'file_share_id', 'status', 'created_at', 'updated_at'
        ]

    def get_mount_count(self, obj):
        return obj.mounts.count()


class FileShareCreateSerializer(serializers.ModelSerializer):
    """Create file share."""
    class Meta:
        model = FileShare
        fields = [
            'name', 'description', 'size_gb', 'protocol', 'allowed_clients',
            'performance_tier', 'throughput_mbps', 'vpc_id', 'subnet_id',
            'security_group_id', 'encryption_in_transit', 'encryption_at_rest',
            'tags', 'metadata'
        ]


# ============================================================================
# ENCRYPTION KEY SERIALIZERS
# ============================================================================

class EncryptionKeyListSerializer(serializers.ModelSerializer):
    """Lightweight encryption key serializer."""
    owner_username = serializers.CharField(source='owner.username', read_only=True)

    class Meta:
        model = EncryptionKey
        fields = [
            'resource_id', 'key_id', 'name', 'key_type', 'algorithm',
            'key_state', 'rotation_enabled', 'encryption_operations_count',
            'owner_username', 'created_at'
        ]
        read_only_fields = ['resource_id', 'key_id', 'created_at']


class EncryptionKeyDetailSerializer(serializers.ModelSerializer):
    """Full encryption key details."""
    owner_username = serializers.CharField(source='owner.username', read_only=True)

    class Meta:
        model = EncryptionKey
        fields = [
            'resource_id', 'key_id', 'name', 'description', 'key_type',
            'algorithm', 'key_state', 'rotation_enabled', 'rotation_period_days',
            'last_rotated_at', 'next_rotation_at', 'encryption_operations_count',
            'scheduled_deletion_date', 'owner', 'owner_username',
            'tags', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'resource_id', 'key_id', 'encryption_operations_count',
            'created_at', 'updated_at'
        ]


class EncryptionKeyCreateSerializer(serializers.ModelSerializer):
    """Create encryption key."""
    class Meta:
        model = EncryptionKey
        fields = [
            'name', 'description', 'key_type', 'algorithm',
            'rotation_enabled', 'rotation_period_days', 'tags'
        ]


# ============================================================================
# BACKUP SERIALIZERS
# ============================================================================

class BackupListSerializer(serializers.ModelSerializer):
    """Lightweight backup serializer."""
    policy_name = serializers.CharField(source='policy.name', read_only=True)
    size_gb = serializers.SerializerMethodField()

    class Meta:
        model = Backup
        fields = [
            'backup_id', 'policy_name', 'resource_type', 'resource_id',
            'size_gb', 'status', 'completed_at', 'created_at'
        ]
        read_only_fields = ['backup_id', 'created_at']

    def get_size_gb(self, obj):
        return round(obj.size_bytes / (1024 ** 3), 2)


class BackupDetailSerializer(serializers.ModelSerializer):
    """Full backup details."""
    policy_name = serializers.CharField(source='policy.name', read_only=True)
    size_gb = serializers.SerializerMethodField()

    class Meta:
        model = Backup
        fields = [
            'backup_id', 'policy', 'policy_name', 'resource_type', 'resource_id',
            'size_bytes', 'size_gb', 'status', 'completed_at', 'error_message',
            'storage_location', 'storage_class', 'can_restore',
            'restore_window_expires_at', 'created_at'
        ]
        read_only_fields = [
            'backup_id', 'status', 'completed_at', 'created_at'
        ]

    def get_size_gb(self, obj):
        return round(obj.size_bytes / (1024 ** 3), 2)


class BackupPolicyListSerializer(serializers.ModelSerializer):
    """Lightweight backup policy serializer."""
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    backup_count = serializers.SerializerMethodField()

    class Meta:
        model = BackupPolicy
        fields = [
            'policy_id', 'name', 'resource_type', 'schedule_frequency',
            'retention_days', 'is_enabled', 'last_backup_time',
            'owner_username', 'backup_count', 'created_at'
        ]
        read_only_fields = ['policy_id', 'created_at']

    def get_backup_count(self, obj):
        return obj.backups.count()


class BackupPolicyDetailSerializer(serializers.ModelSerializer):
    """Full backup policy details."""
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    backups = BackupListSerializer(many=True, read_only=True)

    class Meta:
        model = BackupPolicy
        fields = [
            'policy_id', 'owner', 'owner_username', 'name', 'description',
            'resource_type', 'resource_ids', 'schedule_frequency',
            'schedule_time', 'retention_days', 'retention_count',
            'is_enabled', 'last_backup_time', 'next_backup_time',
            'tags', 'created_at', 'updated_at', 'backups'
        ]
        read_only_fields = [
            'policy_id', 'last_backup_time', 'created_at', 'updated_at'
        ]


class BackupPolicyCreateSerializer(serializers.ModelSerializer):
    """Create backup policy."""
    class Meta:
        model = BackupPolicy
        fields = [
            'name', 'description', 'resource_type', 'resource_ids',
            'schedule_frequency', 'schedule_time', 'retention_days',
            'retention_count', 'is_enabled', 'tags'
        ]


class BackupPolicyUpdateSerializer(serializers.ModelSerializer):
    """Update backup policy."""
    class Meta:
        model = BackupPolicy
        fields = [
            'name', 'description', 'resource_ids', 'schedule_frequency',
            'schedule_time', 'retention_days', 'retention_count',
            'is_enabled', 'tags'
        ]


# ============================================================================
# STORAGE METRIC SERIALIZERS
# ============================================================================

class StorageMetricSerializer(serializers.ModelSerializer):
    """Serializer for storage metrics."""
    used_gb = serializers.SerializerMethodField()
    allocated_gb = serializers.SerializerMethodField()

    class Meta:
        model = StorageMetric
        fields = [
            'storage_id', 'resource_type', 'used_gb', 'allocated_gb',
            'read_operations_per_second', 'write_operations_per_second',
            'read_throughput_mbps', 'write_throughput_mbps',
            'latency_ms', 'created_at'
        ]
        read_only_fields = ['created_at']

    def get_used_gb(self, obj):
        return round(obj.used_bytes / (1024 ** 3), 2) if obj.used_bytes else None

    def get_allocated_gb(self, obj):
        return round(obj.allocated_bytes / (1024 ** 3), 2) if obj.allocated_bytes else None
