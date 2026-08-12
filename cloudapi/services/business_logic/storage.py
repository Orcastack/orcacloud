"""
Storage Service Business Logic

Handles all storage-related operations:
- Object bucket creation and management
- Block volume provisioning and attachment
- File share setup and mounting
- Snapshot management with retention
- Backup policy execution and restoration
- Encryption key management and rotation

Storage Classes:
- standard: High performance, frequently accessed data
- glacier: Long-term archival, infrequent access
- deep_archive: Minimal access archival
"""

import hashlib
from datetime import datetime, timedelta
from decimal import Decimal
from django.utils import timezone
from django.db import transaction
from django.db.models import Sum, Count

from ..core.models import (
    StorageBucket, S3Object,
    StorageVolume, StorageSnapshot,
    FileShare, FileShareMount,
    EncryptionKey, BackupPolicy, Backup,
    StorageMetric,
)
from .exceptions import (
    StorageError, BucketError, BucketNotFoundError,
    VolumeError, VolumeNotFoundError,
    SnapshotError, BackupError, EncryptionError,
    QuotaExceededError, InvalidStateTransitionError, InvalidConfigurationError,
    ResourceNotFoundError, DependencyNotFoundError, ResourceInUseError,
)


class StorageService:
    """Service for managing storage resources (buckets, volumes, backups)"""

    # Bucket state transitions
    BUCKET_STATE_TRANSITIONS = {
        'creating': ['active', 'faulted'],
        'active': ['versioning_enabled', 'deleting'],
        'versioning_enabled': ['active', 'deleting'],
        'deleting': ['deleted'],
        'faulted': ['active'],
        'deleted': [],
    }

    # Volume state transitions
    VOLUME_STATE_TRANSITIONS = {
        'creating': ['available', 'faulted'],
        'available': ['in_use', 'deleting'],
        'in_use': ['available'],
        'deleting': ['deleted'],
        'faulted': ['available'],
        'deleted': [],
    }

    # Snapshot state transitions
    SNAPSHOT_STATE_TRANSITIONS = {
        'pending': ['completed', 'error'],
        'completed': ['in_use', 'deleting'],
        'in_use': ['completed', 'deleting'],
        'deleting': ['deleted'],
        'error': [],
        'deleted': [],
    }

    def __init__(self):
        """Initialize storage service"""
        self.current_time = timezone.now()
        self.current_time_str = self.current_time.isoformat()

    # ========== BUCKET MANAGEMENT ==========

    @transaction.atomic
    def create_bucket(self, bucket_data, user):
        """
        Create a new S3-compatible storage bucket.

        Args:
            bucket_data: Dict with bucket configuration
            user: User who owns the bucket

        Returns:
            StorageBucket: Created bucket object

        Raises:
            QuotaExceededError: Bucket quota exceeded
            BucketError: Bucket name already exists or invalid
            InvalidConfigurationError: Invalid configuration
        """
        # Check quota
        bucket_count = StorageBucket.objects.filter(owner=user).count()
        if bucket_count >= 50:  # Default quota
            raise QuotaExceededError("Bucket quota exceeded")

        # Validate bucket name (S3 naming rules)
        bucket_name = bucket_data.get('bucket_name')
        if not self._validate_bucket_name(bucket_name):
            raise BucketError("Invalid bucket name. Must be 3-63 chars, lowercase alphanumeric and hyphens")

        if StorageBucket.objects.filter(bucket_name=bucket_name).exists():
            raise BucketError("Bucket name already exists")

        # Create bucket
        bucket = StorageBucket.objects.create(
            bucket_name=bucket_name,
            owner=user,
            region=bucket_data.get('region', 'us-west-2'),
            status='creating',
            versioning_enabled=bucket_data.get('versioning_enabled', False),
            encryption_enabled=bucket_data.get('encryption_enabled', True),
            public_read_access=bucket_data.get('public_read_access', False),
            public_write_access=bucket_data.get('public_write_access', False),
            lifecycle_rules=bucket_data.get('lifecycle_rules', []),
            metadata=bucket_data.get('metadata', {}),
        )

        # Simulate bucket creation (in production, would provision S3 bucket)
        bucket.status = 'active'
        bucket.created_at = timezone.now()
        bucket.save()

        # Create encryption key if enabled
        if bucket.encryption_enabled:
            self._create_bucket_encryption_key(bucket)

        self._audit_log(user, 'bucket_created', bucket.id, {'bucket_name': bucket_name, 'region': bucket.region})
        return bucket

    def enable_bucket_versioning(self, bucket_id, user):
        """
        Enable versioning on a bucket.

        Args:
            bucket_id: ID of bucket
            user: User performing operation

        Returns:
            StorageBucket: Updated bucket
        """
        try:
            bucket = StorageBucket.objects.get(id=bucket_id, owner=user)
        except StorageBucket.DoesNotExist:
            raise BucketNotFoundError("Bucket not found")

        if bucket.status not in ['active', 'versioning_enabled']:
            raise InvalidStateTransitionError(f"Cannot modify bucket in {bucket.status} state")

        bucket.versioning_enabled = True
        bucket.status = 'versioning_enabled'
        bucket.save()

        self._audit_log(user, 'bucket_versioning_enabled', bucket.id, {'bucket_name': bucket.bucket_name})
        return bucket

    @transaction.atomic
    def delete_bucket(self, bucket_id, user, force=False):
        """
        Delete a bucket.

        Args:
            bucket_id: ID of bucket to delete
            user: User performing operation
            force: Force delete even if bucket contains objects

        Raises:
            BucketNotFoundError: Bucket doesn't exist
            ResourceInUseError: Bucket not empty and force=False
        """
        try:
            bucket = StorageBucket.objects.get(id=bucket_id, owner=user)
        except StorageBucket.DoesNotExist:
            raise BucketNotFoundError("Bucket not found")

        # Check if bucket has objects
        object_count = S3Object.objects.filter(bucket=bucket).count()
        if object_count > 0 and not force:
            raise ResourceInUseError(f"Bucket contains {object_count} objects. Set force=True to delete.")

        # Delete all objects if force=True
        if force:
            S3Object.objects.filter(bucket=bucket).delete()

        bucket.status = 'deleting'
        bucket.save()

        # TODO: In production, would deprovision S3 bucket
        bucket.status = 'deleted'
        bucket.deleted_at = timezone.now()
        bucket.save()

        self._audit_log(user, 'bucket_deleted', bucket.id, {'bucket_name': bucket.bucket_name})
        return bucket

    # ========== OBJECT MANAGEMENT ==========

    @transaction.atomic
    def upload_object(self, bucket_id, object_data, user):
        """
        Upload an object to a bucket.

        Args:
            bucket_id: ID of bucket
            object_data: Dict with object metadata
            user: User uploading object

        Returns:
            S3Object: Created object
        """
        try:
            bucket = StorageBucket.objects.get(id=bucket_id, owner=user)
        except StorageBucket.DoesNotExist:
            raise BucketNotFoundError("Bucket not found")

        if bucket.status == 'deleted':
            raise BucketError("Cannot upload to deleted bucket")

        # Create object
        obj = S3Object.objects.create(
            bucket=bucket,
            key=object_data.get('key'),
            size_bytes=object_data.get('size_bytes', 0),
            storage_class=object_data.get('storage_class', 'standard'),
            object_hash=self._hash_object(object_data.get('content', '')),
            metadata=object_data.get('metadata', {}),
        )

        # Update bucket storage size
        bucket.total_size_bytes += obj.size_bytes
        bucket.object_count = S3Object.objects.filter(bucket=bucket).count()
        bucket.save()

        self._audit_log(user, 'object_uploaded', obj.id, {'bucket': bucket.bucket_name, 'key': obj.key})
        return obj

    def make_object_public(self, bucket_id, object_key, user):
        """
        Make an object publicly readable.

        Args:
            bucket_id: ID of bucket
            object_key: Key of object
            user: User performing operation

        Returns:
            S3Object: Updated object
        """
        try:
            obj = S3Object.objects.get(bucket_id=bucket_id, key=object_key, bucket__owner=user)
        except S3Object.DoesNotExist:
            raise ResourceNotFoundError("Object not found")

        obj.public_read_access = True
        obj.save()

        return obj

    def change_object_storage_class(self, bucket_id, object_key, new_class, user):
        """
        Change storage class of an object (e.g., standard → glacier).

        Args:
            bucket_id: ID of bucket
            object_key: Key of object
            new_class: New storage class (standard, glacier, deep_archive)
            user: User performing operation

        Returns:
            S3Object: Updated object
        """
        valid_classes = ['standard', 'glacier', 'deep_archive']
        if new_class not in valid_classes:
            raise InvalidConfigurationError(f"Invalid storage class. Must be one of: {valid_classes}")

        try:
            obj = S3Object.objects.get(bucket_id=bucket_id, key=object_key, bucket__owner=user)
        except S3Object.DoesNotExist:
            raise ResourceNotFoundError("Object not found")

        obj.storage_class = new_class
        obj.storage_class_changed_at = timezone.now()
        obj.save()

        return obj

    # ========== VOLUME MANAGEMENT ==========

    @transaction.atomic
    def create_volume(self, volume_data, user):
        """
        Create a new block storage volume.

        Args:
            volume_data: Dict with volume configuration
            user: User who owns the volume

        Returns:
            StorageVolume: Created volume

        Raises:
            QuotaExceededError: Volume quota exceeded
            InvalidConfigurationError: Invalid configuration
        """
        # Check quota
        volume_count = StorageVolume.objects.filter(owner=user).exclude(status='deleted').count()
        volume_storage = StorageVolume.objects.filter(owner=user).aggregate(Sum('size_gb'))['size_gb__sum'] or 0

        if volume_count >= 100:
            raise QuotaExceededError("Volume quota exceeded")

        if volume_storage + volume_data.get('size_gb', 0) > 10000:  # 10TB quota
            raise QuotaExceededError("Storage quota exceeded")

        # Validate configuration
        size_gb = volume_data.get('size_gb')
        if size_gb < 1:
            raise InvalidConfigurationError("Volume size must be at least 1 GB")

        volume_type = volume_data.get('volume_type', 'gp2')
        if volume_type not in ['gp2', 'gp3', 'io1', 'io2', 'st1', 'sc1']:
            raise InvalidConfigurationError(f"Invalid volume type: {volume_type}")

        # Create volume
        volume = StorageVolume.objects.create(
            name=volume_data.get('name'),
            owner=user,
            size_gb=size_gb,
            volume_type=volume_type,
            status='creating',
            availability_zone=volume_data.get('availability_zone', 'us-west-2a'),
            iops=volume_data.get('iops', self._get_default_iops(volume_type)),
            throughput_mbps=volume_data.get('throughput_mbps', self._get_default_throughput(volume_type)),
            encrypted=volume_data.get('encrypted', True),
            metadata=volume_data.get('metadata', {}),
        )

        # Simulate volume creation
        volume.status = 'available'
        volume.created_at = timezone.now()
        volume.save()

        self._audit_log(user, 'volume_created', volume.id, {'size_gb': size_gb, 'type': volume_type})
        return volume

    def attach_volume(self, volume_id, instance_id, user, device_name='/dev/sdf'):
        """
        Attach a volume to an instance.

        Args:
            volume_id: ID of volume
            instance_id: ID of instance to attach to
            user: User performing operation
            device_name: Device name (e.g., /dev/sdf)

        Returns:
            StorageVolume: Updated volume
        """
        try:
            volume = StorageVolume.objects.get(id=volume_id, owner=user)
        except StorageVolume.DoesNotExist:
            raise VolumeNotFoundError("Volume not found")

        if volume.status != 'available':
            raise InvalidStateTransitionError(f"Cannot attach volume in {volume.status} state")

        # Verify instance exists and belongs to user
        from ..core.models import Instance
        try:
            instance = Instance.objects.get(id=instance_id, owner=user)
        except Instance.DoesNotExist:
            raise DependencyNotFoundError("Instance not found or not owned by user")

        volume.attached_instance_id = instance_id
        volume.attach_device_name = device_name
        volume.status = 'in_use'
        volume.attached_at = timezone.now()
        volume.save()

        self._audit_log(user, 'volume_attached', volume.id, {'instance_id': instance_id})
        return volume

    def detach_volume(self, volume_id, user):
        """
        Detach a volume from an instance.

        Args:
            volume_id: ID of volume
            user: User performing operation

        Returns:
            StorageVolume: Updated volume
        """
        try:
            volume = StorageVolume.objects.get(id=volume_id, owner=user)
        except StorageVolume.DoesNotExist:
            raise VolumeNotFoundError("Volume not found")

        if volume.status != 'in_use':
            raise InvalidStateTransitionError(f"Cannot detach volume not in use")

        volume.attached_instance_id = None
        volume.attach_device_name = None
        volume.status = 'available'
        volume.detached_at = timezone.now()
        volume.save()

        self._audit_log(user, 'volume_detached', volume.id, {})
        return volume

    # ========== SNAPSHOT MANAGEMENT ==========

    @transaction.atomic
    def create_snapshot(self, volume_id, user, description=''):
        """
        Create a snapshot of a volume.

        Args:
            volume_id: ID of volume to snapshot
            user: User performing operation
            description: Description of snapshot

        Returns:
            StorageSnapshot: Created snapshot
        """
        try:
            volume = StorageVolume.objects.get(id=volume_id, owner=user)
        except StorageVolume.DoesNotExist:
            raise VolumeNotFoundError("Volume not found")

        # Create snapshot
        snapshot = StorageSnapshot.objects.create(
            volume=volume,
            size_gb=volume.size_gb,
            status='pending',
            description=description,
            encryption_enabled=volume.encrypted,
            metadata={'source_volume': volume.id},
        )

        # Simulate snapshot creation
        snapshot.status = 'completed'
        snapshot.completed_at = timezone.now()
        snapshot.snapshot_hash = self._hash_snapshot_data(volume.id, timezone.now())
        snapshot.save()

        self._audit_log(user, 'snapshot_created', snapshot.id, {'volume_id': volume_id})
        return snapshot

    def restore_from_snapshot(self, snapshot_id, user, target_size_gb=None):
        """
        Restore a new volume from a snapshot.

        Args:
            snapshot_id: ID of snapshot to restore from
            user: User performing operation
            target_size_gb: Size of new volume (must be >= snapshot size)

        Returns:
            StorageVolume: New volume restored from snapshot
        """
        try:
            snapshot = StorageSnapshot.objects.get(id=snapshot_id, volume__owner=user)
        except StorageSnapshot.DoesNotExist:
            raise SnapshotError("Snapshot not found")

        if snapshot.status != 'completed':
            raise InvalidStateTransitionError(f"Cannot restore from {snapshot.status} snapshot")

        size_gb = target_size_gb or snapshot.size_gb
        if size_gb < snapshot.size_gb:
            raise InvalidConfigurationError("Target size must be >= snapshot size")

        # Create new volume from snapshot
        volume = StorageVolume.objects.create(
            name=f"restore-{snapshot.id}",
            owner=user,
            size_gb=size_gb,
            volume_type=snapshot.volume.volume_type,
            status='available',
            availability_zone=snapshot.volume.availability_zone,
            iops=snapshot.volume.iops,
            throughput_mbps=snapshot.volume.throughput_mbps,
            encrypted=snapshot.encryption_enabled,
            metadata={'restored_from_snapshot': snapshot.id},
        )

        self._audit_log(user, 'volume_restored', volume.id, {'snapshot_id': snapshot_id})
        return volume

    # ========== BACKUP MANAGEMENT ==========

    @transaction.atomic
    def create_backup_policy(self, policy_data, user):
        """
        Create a backup policy for automated backups.

        Args:
            policy_data: Dict with policy configuration
            user: User who owns the policy

        Returns:
            BackupPolicy: Created policy
        """
        # Validate schedule
        schedule = policy_data.get('schedule', 'daily')
        if schedule not in ['hourly', 'daily', 'weekly', 'monthly']:
            raise InvalidConfigurationError(f"Invalid schedule: {schedule}")

        # Validate retention
        retention_days = policy_data.get('retention_days', 7)
        if retention_days < 1:
            raise InvalidConfigurationError("Retention must be at least 1 day")

        policy = BackupPolicy.objects.create(
            name=policy_data.get('name'),
            owner=user,
            schedule=schedule,
            retention_days=retention_days,
            volume_ids=policy_data.get('volume_ids', []),
            enabled=policy_data.get('enabled', True),
            metadata=policy_data.get('metadata', {}),
        )

        self._audit_log(user, 'backup_policy_created', policy.id, {'schedule': schedule})
        return policy

    def execute_backup_policy(self, policy_id, user):
        """
        Execute a backup policy, creating backups for all volumes.

        Args:
            policy_id: ID of policy to execute
            user: User owning the policy

        Returns:
            List[Backup]: List of created backups
        """
        try:
            policy = BackupPolicy.objects.get(id=policy_id, owner=user)
        except BackupPolicy.DoesNotExist:
            raise ResourceNotFoundError("Backup policy not found")

        if not policy.enabled:
            raise InvalidStateTransitionError("Policy is disabled")

        backups = []
        for volume_id in policy.volume_ids:
            try:
                volume = StorageVolume.objects.get(id=volume_id, owner=user)

                # Create backup
                backup = Backup.objects.create(
                    policy=policy,
                    volume=volume,
                    size_gb=volume.size_gb,
                    status='completed',
                    backup_hash=self._hash_snapshot_data(volume.id, timezone.now()),
                    backup_type='scheduled',
                )
                backups.append(backup)

                # Clean up old backups if exceeding retention
                self._cleanup_old_backups(policy, volume)

            except StorageVolume.DoesNotExist:
                continue

        policy.last_executed_at = timezone.now()
        policy.save()

        return backups

    def restore_from_backup(self, backup_id, user):
        """
        Restore a volume from a backup.

        Args:
            backup_id: ID of backup to restore from
            user: User performing operation

        Returns:
            StorageVolume: Restored volume
        """
        try:
            backup = Backup.objects.get(id=backup_id, volume__owner=user)
        except Backup.DoesNotExist:
            raise BackupError("Backup not found")

        if backup.status != 'completed':
            raise InvalidStateTransitionError(f"Cannot restore from {backup.status} backup")

        # Create new volume from backup
        volume = StorageVolume.objects.create(
            name=f"restore-{backup.id}",
            owner=user,
            size_gb=backup.size_gb,
            volume_type=backup.volume.volume_type,
            status='available',
            availability_zone=backup.volume.availability_zone,
            iops=backup.volume.iops,
            throughput_mbps=backup.volume.throughput_mbps,
            encrypted=True,
            metadata={'restored_from_backup': backup.id},
        )

        self._audit_log(user, 'volume_restored_from_backup', volume.id, {'backup_id': backup_id})
        return volume

    # ========== ENCRYPTION MANAGEMENT ==========

    @transaction.atomic
    def create_encryption_key(self, key_data, user):
        """
        Create a customer-managed encryption key.

        Args:
            key_data: Dict with key configuration
            user: User who owns the key

        Returns:
            EncryptionKey: Created key
        """
        key = EncryptionKey.objects.create(
            key_id=self._generate_key_id(),
            owner=user,
            key_material=self._generate_key_material(),
            key_alias=key_data.get('key_alias'),
            description=key_data.get('description'),
            enabled=True,
            rotation_enabled=key_data.get('rotation_enabled', True),
            rotation_period_days=key_data.get('rotation_period_days', 90),
        )

        self._audit_log(user, 'encryption_key_created', key.id, {'key_alias': key.key_alias})
        return key

    def rotate_encryption_key(self, key_id, user):
        """
        Rotate an encryption key to a new version.

        Args:
            key_id: ID of key to rotate
            user: User performing operation

        Returns:
            EncryptionKey: Updated key
        """
        try:
            key = EncryptionKey.objects.get(id=key_id, owner=user)
        except EncryptionKey.DoesNotExist:
            raise ResourceNotFoundError("Encryption key not found")

        if not key.enabled:
            raise EncryptionError("Cannot rotate disabled key")

        key.key_material = self._generate_key_material()
        key.last_rotated_at = timezone.now()
        key.rotation_count += 1
        key.save()

        self._audit_log(user, 'encryption_key_rotated', key.id, {'rotation_count': key.rotation_count})
        return key

    # ========== HELPER METHODS ==========

    def _validate_bucket_name(self, name):
        """Validate S3 bucket name"""
        if not name or len(name) < 3 or len(name) > 63:
            return False
        if not all(c.isalnum() or c == '-' for c in name):
            return False
        if name.startswith('-') or name.endswith('-'):
            return False
        if '..' in name:
            return False
        return True

    def _hash_object(self, content):
        """Hash object content for integrity"""
        return hashlib.sha256(content.encode() if isinstance(content, str) else content).hexdigest()

    def _hash_snapshot_data(self, volume_id, timestamp):
        """Hash snapshot data for integrity"""
        data = f"{volume_id}:{timestamp.isoformat()}".encode()
        return hashlib.sha256(data).hexdigest()

    def _get_default_iops(self, volume_type):
        """Get default IOPS for volume type"""
        defaults = {'gp2': 100, 'gp3': 3000, 'io1': 100, 'io2': 100}
        return defaults.get(volume_type, 100)

    def _get_default_throughput(self, volume_type):
        """Get default throughput for volume type"""
        defaults = {'gp2': 125, 'gp3': 125, 'io1': 125, 'io2': 125}
        return defaults.get(volume_type, 125)

    def _create_bucket_encryption_key(self, bucket):
        """Create encryption key for bucket"""
        key = EncryptionKey.objects.create(
            key_id=self._generate_key_id(),
            owner=bucket.owner,
            key_material=self._generate_key_material(),
            key_alias=f"bucket-{bucket.id}",
            description=f"Key for bucket {bucket.bucket_name}",
            enabled=True,
        )
        bucket.encryption_key = key
        bucket.save()

    def _generate_key_id(self):
        """Generate unique key ID"""
        return f"key-{hashlib.md5(str(timezone.now()).encode()).hexdigest()[:16]}"

    def _generate_key_material(self):
        """Generate key material (256-bit)"""
        import secrets
        return secrets.token_hex(32)

    def _cleanup_old_backups(self, policy, volume):
        """Clean up backups exceeding retention period"""
        cutoff_date = timezone.now() - timedelta(days=policy.retention_days)
        old_backups = Backup.objects.filter(
            policy=policy,
            volume=volume,
            created_at__lt=cutoff_date
        )
        old_backups.delete()

    def _audit_log(self, user, action, resource_id, details):
        """Log an audit event"""
        # TODO: Implement actual audit logging
        pass
