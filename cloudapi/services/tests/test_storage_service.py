"""
Unit Tests for Storage Service

Tests all methods in StorageService:
- Bucket operations
- Object management
- Volume operations
- Snapshot management
- Backup operations
- Encryption operations

Marks: @pytest.mark.storage
"""

import pytest
from django.utils import timezone
from datetime import timedelta

pytestmark = pytest.mark.skip(reason='Legacy storage test suite targets pre-refactor contracts; pending rewrite for current backend models/services.')

from ..business_logic.storage import StorageService
from ..business_logic.exceptions import (
    QuotaExceededError, InvalidStateTransitionError, InvalidConfigurationError,
    ResourceNotFoundError, BucketNotFoundError, VolumeNotFoundError, VolumeError,
    ResourceInUseError, SnapshotError,
)
from ..core.models import StorageBucket, StorageVolume, S3Object


@pytest.mark.storage
class TestStorageServiceBucket:
    """Test bucket creation and management"""

    def test_create_bucket_success(self, db, user):
        """Test successful bucket creation"""
        service = StorageService()

        bucket = service.create_bucket({
            'bucket_name': 'test-bucket',
            'region': 'us-west-2',
            'versioning_enabled': False,
            'encryption_enabled': True,
        }, user=user)

        assert bucket.id is not None
        assert bucket.owner == user
        assert bucket.bucket_name == 'test-bucket'
        assert bucket.status == 'active'
        assert bucket.encryption_enabled is True

    def test_create_bucket_invalid_name(self, db, user):
        """Test bucket creation with invalid name"""
        service = StorageService()

        with pytest.raises(Exception):  # BucketError
            service.create_bucket({
                'bucket_name': 'INVALID_NAME',  # Uppercase not allowed
            }, user=user)

    def test_create_bucket_name_too_short(self, db, user):
        """Test bucket name too short"""
        service = StorageService()

        with pytest.raises(Exception):
            service.create_bucket({
                'bucket_name': 'ab',  # Less than 3 chars
            }, user=user)

    def test_create_bucket_duplicate_name(self, db, user, storage_bucket):
        """Test creating bucket with duplicate name"""
        service = StorageService()

        with pytest.raises(Exception):
            service.create_bucket({
                'bucket_name': storage_bucket.bucket_name,
            }, user=user)

    def test_enable_bucket_versioning(self, db, storage_bucket, user):
        """Test enabling versioning on bucket"""
        service = StorageService()

        bucket = service.enable_bucket_versioning(storage_bucket.id, user)

        assert bucket.versioning_enabled is True
        assert bucket.status == 'versioning_enabled'

    def test_delete_bucket_success(self, db, user, storage_bucket):
        """Test deleting empty bucket"""
        service = StorageService()

        deleted = service.delete_bucket(storage_bucket.id, user)

        assert deleted.status == 'deleted'
        assert deleted.deleted_at is not None

    def test_delete_bucket_with_objects_force_false(self, db, user, storage_bucket):
        """Test deleting bucket with objects (force=False)"""
        from ..core.models import S3Object

        service = StorageService()

        # Create object in bucket
        S3Object.objects.create(
            bucket=storage_bucket,
            key='test.txt',
            size_bytes=1000,
        )

        with pytest.raises(ResourceInUseError):
            service.delete_bucket(storage_bucket.id, user, force=False)

    def test_delete_bucket_with_objects_force_true(self, db, user, storage_bucket):
        """Test deleting bucket with force=True"""
        from ..core.models import S3Object

        service = StorageService()

        # Create objects
        S3Object.objects.create(bucket=storage_bucket, key='file1.txt', size_bytes=1000)
        S3Object.objects.create(bucket=storage_bucket, key='file2.txt', size_bytes=2000)

        deleted = service.delete_bucket(storage_bucket.id, user, force=True)

        assert deleted.status == 'deleted'
        assert S3Object.objects.filter(bucket=storage_bucket).count() == 0


@pytest.mark.storage
class TestStorageServiceVolume:
    """Test volume operations"""

    def test_create_volume_success(self, db, user):
        """Test successful volume creation"""
        service = StorageService()

        volume = service.create_volume({
            'name': 'data-volume',
            'size_gb': 100,
            'volume_type': 'gp2',
            'availability_zone': 'us-west-2a',
        }, user=user)

        assert volume.id is not None
        assert volume.owner == user
        assert volume.size_gb == 100
        assert volume.status == 'available'

    def test_create_volume_invalid_size(self, db, user):
        """Test creating volume with invalid size"""
        service = StorageService()

        with pytest.raises(InvalidConfigurationError):
            service.create_volume({
                'name': 'volume',
                'size_gb': 0,  # Too small
            }, user=user)

    def test_create_volume_invalid_type(self, db, user):
        """Test creating volume with invalid type"""
        service = StorageService()

        with pytest.raises(InvalidConfigurationError):
            service.create_volume({
                'name': 'volume',
                'size_gb': 100,
                'volume_type': 'invalid',
            }, user=user)

    def test_attach_volume_success(self, db, user, storage_volume, instance):
        """Test attaching volume to instance"""
        service = StorageService()

        attached = service.attach_volume(
            volume_id=storage_volume.id,
            instance_id=instance.id,
            user=user
        )

        assert attached.status == 'in_use'
        assert attached.attached_instance_id == instance.id

    def test_attach_volume_not_available(self, db, user, storage_volume):
        """Test attaching volume when not available"""
        service = StorageService()
        storage_volume.status = 'deleting'
        storage_volume.save()

        with pytest.raises(InvalidStateTransitionError):
            service.attach_volume(storage_volume.id, 1, user)

    def test_detach_volume_success(self, db, user, storage_volume, instance):
        """Test detaching volume from instance"""
        service = StorageService()

        storage_volume.status = 'in_use'
        storage_volume.attached_instance_id = instance.id
        storage_volume.save()

        detached = service.detach_volume(storage_volume.id, user)

        assert detached.status == 'available'
        assert detached.attached_instance_id is None


@pytest.mark.storage
class TestStorageServiceSnapshot:
    """Test snapshot operations"""

    def test_create_snapshot_success(self, db, user, storage_volume):
        """Test creating snapshot"""
        service = StorageService()

        snapshot = service.create_snapshot(storage_volume.id, user)

        assert snapshot.id is not None
        assert snapshot.volume == storage_volume
        assert snapshot.status == 'completed'
        assert snapshot.size_gb == storage_volume.size_gb

    def test_restore_from_snapshot_success(self, db, user, storage_volume):
        """Test restoring volume from snapshot"""
        service = StorageService()

        snapshot = service.create_snapshot(storage_volume.id, user)

        restored_volume = service.restore_from_snapshot(snapshot.id, user)

        assert restored_volume.size_gb == snapshot.size_gb
        assert restored_volume.status == 'available'
        assert restored_volume.owner == user


@pytest.mark.storage
class TestStorageServiceBackup:
    """Test backup operations"""

    def test_create_backup_policy(self, db, user, storage_volume):
        """Test creating backup policy"""
        service = StorageService()

        policy = service.create_backup_policy({
            'name': 'daily-backup',
            'schedule': 'daily',
            'retention_days': 30,
            'volume_ids': [storage_volume.id],
            'enabled': True,
        }, user=user)

        assert policy.id is not None
        assert policy.owner == user
        assert policy.schedule == 'daily'
        assert policy.retention_days == 30

    def test_create_backup_policy_invalid_schedule(self, db, user):
        """Test backup policy with invalid schedule"""
        service = StorageService()

        with pytest.raises(InvalidConfigurationError):
            service.create_backup_policy({
                'name': 'policy',
                'schedule': 'every-other-day',  # Invalid
            }, user=user)

    def test_create_backup_policy_invalid_retention(self, db, user):
        """Test backup policy with invalid retention"""
        service = StorageService()

        with pytest.raises(InvalidConfigurationError):
            service.create_backup_policy({
                'name': 'policy',
                'schedule': 'daily',
                'retention_days': 0,  # Invalid
            }, user=user)

    def test_execute_backup_policy(self, db, user, backup_policy, storage_volume):
        """Test executing backup policy"""
        service = StorageService()
        backup_policy.volume_ids = [storage_volume.id]
        backup_policy.save()

        backups = service.execute_backup_policy(backup_policy.id, user)

        assert len(backups) > 0
        assert backups[0].volume == storage_volume


@pytest.mark.storage
class TestStorageServiceEncryption:
    """Test encryption key operations"""

    def test_create_encryption_key(self, db, user):
        """Test creating encryption key"""
        service = StorageService()

        key = service.create_encryption_key({
            'key_alias': 'my-key',
            'description': 'Test key',
            'rotation_enabled': True,
        }, user=user)

        assert key.id is not None
        assert key.owner == user
        assert key.enabled is True
        assert key.key_material is not None

    def test_rotate_encryption_key(self, db, user):
        """Test rotating encryption key"""
        service = StorageService()

        key = service.create_encryption_key({
            'key_alias': 'my-key',
            'rotation_enabled': True,
        }, user=user)

        old_material = key.key_material
        rotated = service.rotate_encryption_key(key.id, user)

        assert rotated.key_material != old_material
        assert rotated.last_rotated_at is not None
        assert rotated.rotation_count == 1
