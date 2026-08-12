# OrcaCloud Storage Service - Models

from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from ..core.base_models import ResourceModel, Status, TimeStampedModel
import uuid


# ============================================================================
# STORAGE - OBJECT STORAGE (S3-like)
# ============================================================================

class StorageBucket(ResourceModel):
    """Object storage bucket."""
    bucket_id = models.CharField(max_length=64, unique=True, db_index=True)
    bucket_name = models.CharField(max_length=255, unique=True, db_index=True)

    # Bucket configuration
    region = models.CharField(max_length=50, default='us-west-2')
    acl = models.CharField(
        max_length=50,
        choices=[
            ('private', 'Private'),
            ('public-read', 'Public Read'),
            ('public-read-write', 'Public Read/Write'),
            ('authenticated-read', 'Authenticated Read'),
        ],
        default='private'
    )

    # Versioning
    versioning_enabled = models.BooleanField(default=False)
    mfa_delete_enabled = models.BooleanField(default=False)

    # Encryption
    encryption_enabled = models.BooleanField(default=True)
    encryption_type = models.CharField(
        max_length=50,
        choices=[
            ('sse-s3', 'SSE-S3'),
            ('sse-kms', 'SSE-KMS'),
            ('cse-kms', 'CSE-KMS'),
        ],
        default='sse-s3'
    )
    kms_key_id = models.CharField(max_length=255, blank=True)

    # Logging
    logging_enabled = models.BooleanField(default=False)
    log_target_bucket = models.CharField(max_length=255, blank=True)
    log_prefix = models.CharField(max_length=255, blank=True)

    # Performance
    request_metrics_enabled = models.BooleanField(default=False)

    # Status and quota
    status = models.CharField(max_length=20, choices=Status.choices, default='running')
    total_objects = models.BigIntegerField(default=0)
    total_size_bytes = models.BigIntegerField(default=0)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['owner', 'region']),
        ]

    def __str__(self):
        return self.bucket_name

    @property
    def total_size_gb(self):
        return self.total_size_bytes / (1024 ** 3)


class S3Object(TimeStampedModel):
    """Object in a storage bucket."""
    bucket = models.ForeignKey(StorageBucket, on_delete=models.CASCADE, related_name='s3_objects')
    object_key = models.CharField(max_length=1024, db_index=True)

    # Content properties
    size_bytes = models.BigIntegerField()
    content_type = models.CharField(max_length=150, default='application/octet-stream')
    etag = models.CharField(max_length=64, unique=True)

    # Version
    version_id = models.CharField(max_length=128, blank=True, db_index=True)
    is_latest = models.BooleanField(default=True)

    # Metadata
    metadata = models.JSONField(default=dict)
    tags = models.JSONField(default=dict)

    # Storage class/tier
    storage_class = models.CharField(
        max_length=50,
        choices=[
            ('standard', 'Standard'),
            ('standard-ia', 'Standard-IA'),
            ('intelligent-tiering', 'Intelligent-Tiering'),
            ('glacier', 'Glacier'),
            ('deep-archive', 'Deep Archive'),
        ],
        default='standard'
    )

    # Access
    is_public = models.BooleanField(default=False)
    acl = models.CharField(max_length=50, default='private')

    # Timestamps
    last_modified = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('bucket', 'object_key', 'version_id')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.bucket.bucket_name}/{self.object_key}"


# ============================================================================
# STORAGE - BLOCK STORAGE (EBS-like)
# ============================================================================

class StorageVolume(ResourceModel):
    """Block storage volume."""
    volume_id = models.CharField(max_length=64, unique=True, db_index=True)

    # Volume properties
    size_gb = models.IntegerField(validators=[MinValueValidator(1)])
    volume_type = models.CharField(
        max_length=50,
        choices=[
            ('gp3', 'General Purpose gp3'),
            ('gp2', 'General Purpose gp2'),
            ('io2', 'Provisioned IOPS io2'),
            ('io1', 'Provisioned IOPS io1'),
            ('st1', 'Throughput Optimized st1'),
            ('sc1', 'Cold storage sc1'),
        ],
        default='gp3'
    )

    # Performance (for provisioned IOPS)
    iops = models.IntegerField(null=True, blank=True, validators=[MinValueValidator(100)])
    throughput_mbps = models.IntegerField(null=True, blank=True, validators=[MinValueValidator(125)])

    # Availability
    region = models.CharField(max_length=50, default='us-west-2')
    availability_zone = models.CharField(max_length=50)

    # Attachment
    attached_to_instance = models.CharField(max_length=64, blank=True, db_index=True)
    attachment_device = models.CharField(max_length=50, blank=True)  # /dev/sdf, etc.
    is_attached = models.BooleanField(default=False, db_index=True)
    attached_at = models.DateTimeField(null=True, blank=True)

    # Encryption
    encryption_enabled = models.BooleanField(default=True)
    kms_key_id = models.CharField(max_length=255, blank=True)

    # Status
    status = models.CharField(max_length=20, choices=Status.choices, default='creating')

    # Auto-delete with instance
    delete_on_termination = models.BooleanField(default=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['owner', 'status']),
            models.Index(fields=['availability_zone', 'is_attached']),
        ]

    def __str__(self):
        return f"{self.volume_id} ({self.size_gb}GB)"


class StorageSnapshot(TimeStampedModel):
    """Snapshot of a storage volume."""
    snapshot_id = models.CharField(max_length=64, unique=True, primary_key=True)
    volume = models.ForeignKey(StorageVolume, on_delete=models.CASCADE, related_name='snapshots')

    size_gb = models.IntegerField()
    owner = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

    # Snapshot details
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('completed', 'Completed'),
            ('error', 'Error'),
        ],
        default='pending'
    )

    progress_percent = models.IntegerField(default=0, validators=[
        MinValueValidator(0),
        MaxValueValidator(100)
    ])

    # Sharing
    is_public = models.BooleanField(default=False)
    shared_with_accounts = models.JSONField(default=list)

    # Retention
    retention_days = models.IntegerField(null=True, blank=True)
    scheduled_deletion_date = models.DateTimeField(null=True, blank=True)

    # Tags/description
    description = models.TextField(blank=True)
    tags = models.JSONField(default=dict)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Snapshot of {self.volume.volume_id}"


# ============================================================================
# STORAGE - FILE STORAGE (NFS-like)
# ============================================================================

class FileShare(ResourceModel):
    """File storage share (NFS/SMB)."""
    file_share_id = models.CharField(max_length=64, unique=True, db_index=True)

    # Share properties
    size_gb = models.IntegerField(validators=[MinValueValidator(1)])
    protocol = models.CharField(
        max_length=20,
        choices=[
            ('nfs', 'NFS v4.1'),
            ('smb', 'SMB 3.0'),
            ('both', 'Both NFS and SMB'),
        ],
        default='nfs'
    )

    # Access
    allowed_clients = models.JSONField(default=list, help_text="List of IP ranges or client IDs")

    # Performance tier
    performance_tier = models.CharField(
        max_length=50,
        choices=[
            ('standard', 'Standard'),
            ('performance', 'Performance'),
        ],
        default='standard'
    )
    throughput_mbps = models.IntegerField(null=True, blank=True)

    # Network
    vpc_id = models.CharField(max_length=64)
    subnet_id = models.CharField(max_length=64)
    security_group_id = models.CharField(max_length=64, blank=True)

    # Mount configuration
    mount_point = models.CharField(max_length=255, blank=True, help_text="e.g., nfs.example.com:/share")

    # Encryption
    encryption_in_transit = models.BooleanField(default=True)
    encryption_at_rest = models.BooleanField(default=True)

    # Status
    status = models.CharField(max_length=20, choices=Status.choices, default='creating')

    # Usage
    used_gb = models.IntegerField(default=0)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.size_gb}GB {self.protocol})"

    @property
    def available_gb(self):
        return self.size_gb - self.used_gb


class FileShareMount(TimeStampedModel):
    """Mount of a file share to a compute instance."""
    mount_id = models.CharField(max_length=64, unique=True)
    file_share = models.ForeignKey(FileShare, on_delete=models.CASCADE, related_name='mounts')
    instance_id = models.CharField(max_length=64)

    mount_path = models.CharField(max_length=255)
    mount_options = models.CharField(max_length=500, blank=True)

    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('file_share', 'instance_id', 'mount_path')

    def save(self, *args, **kwargs):
        if not self.mount_id:
            self.mount_id = f"mount-{uuid.uuid4().hex[:12]}"
        super().save(*args, **kwargs)


# ============================================================================
# STORAGE - ENCRYPTION & KEYS
# ============================================================================

class EncryptionKey(ResourceModel):
    """Customer-managed encryption key."""
    key_id = models.CharField(max_length=64, unique=True, db_index=True)

    # Key properties
    key_type = models.CharField(
        max_length=50,
        choices=[
            ('symmetric', 'Symmetric (AES-256)'),
            ('asymmetric-rsa', 'Asymmetric (RSA)'),
            ('asymmetric-ecc', 'Asymmetric (ECC)'),
        ],
        default='symmetric'
    )

    algorithm = models.CharField(max_length=50, default='AES_256')

    # Key state
    key_state = models.CharField(
        max_length=20,
        choices=[
            ('enabled', 'Enabled'),
            ('disabled', 'Disabled'),
            ('pending-deletion', 'Pending Deletion'),
            ('retired', 'Retired'),
        ],
        default='enabled'
    )

    # Rotation
    rotation_enabled = models.BooleanField(default=True)
    rotation_period_days = models.IntegerField(default=365)
    last_rotated_at = models.DateTimeField(null=True, blank=True)
    next_rotation_at = models.DateTimeField(null=True, blank=True)

    # Usage
    encryption_operations_count = models.BigIntegerField(default=0)

    # Scheduled deletion
    scheduled_deletion_date = models.DateTimeField(null=True, blank=True)

    # Tags
    tags = models.JSONField(default=dict)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.key_state})"


# ============================================================================
# STORAGE - BACKUP & RECOVERY
# ============================================================================

class BackupPolicy(TimeStampedModel):
    """Backup policy for resources."""
    policy_id = models.CharField(max_length=64, unique=True)
    owner = models.ForeignKey(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    # Resources to backup
    resource_type = models.CharField(
        max_length=50,
        choices=[
            ('volume', 'Volume'),
            ('instance', 'Instance'),
            ('filesystem', 'File Share'),
            ('database', 'Database'),
        ]
    )
    resource_ids = models.JSONField(default=list)

    # Backup schedule
    schedule_frequency = models.CharField(
        max_length=50,
        choices=[
            ('hourly', 'Hourly'),
            ('daily', 'Daily'),
            ('weekly', 'Weekly'),
            ('monthly', 'Monthly'),
        ],
        default='daily'
    )
    schedule_time = models.TimeField(default='02:00')  # 2 AM UTC

    # Retention
    retention_days = models.IntegerField(default=30)
    retention_count = models.IntegerField(null=True, blank=True)

    # Lifecycle
    is_enabled = models.BooleanField(default=True)
    last_backup_time = models.DateTimeField(null=True, blank=True)
    next_backup_time = models.DateTimeField(null=True, blank=True)

    # Tags
    tags = models.JSONField(default=dict)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.policy_id:
            self.policy_id = f"policy-{uuid.uuid4().hex[:12]}"
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Backup(TimeStampedModel):
    """Individual backup/snapshot."""
    backup_id = models.CharField(max_length=64, unique=True, db_index=True, primary_key=True)
    policy = models.ForeignKey(BackupPolicy, on_delete=models.CASCADE, related_name='backups')

    # Resource info
    resource_type = models.CharField(max_length=50)
    resource_id = models.CharField(max_length=64, db_index=True)
    size_bytes = models.BigIntegerField()

    # Status
    status = models.CharField(
        max_length=20,
        choices=[
            ('in-progress', 'In Progress'),
            ('completed', 'Completed'),
            ('failed', 'Failed'),
        ],
        default='in-progress'
    )

    # Completion
    completed_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)

    # Storage location
    storage_location = models.CharField(max_length=255, blank=True)
    storage_class = models.CharField(
        max_length=50,
        choices=[
            ('hot', 'Hot'),
            ('warm', 'Warm'),
            ('cold', 'Cold'),
        ],
        default='hot'
    )

    # Restore capability
    can_restore = models.BooleanField(default=True)
    restore_window_expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Backup of {self.resource_id}"


# ============================================================================
# STORAGE - MONITORING & METRICS
# ============================================================================

class StorageMetric(TimeStampedModel):
    """Storage usage and performance metrics."""
    RESOURCE_TYPES = [
        ('bucket', 'Bucket'),
        ('volume', 'Volume'),
        ('file-share', 'File Share'),
    ]

    storage_id = models.CharField(max_length=64, db_index=True)
    resource_type = models.CharField(max_length=50, choices=RESOURCE_TYPES)

    # Usage metrics
    used_bytes = models.BigIntegerField(null=True, blank=True)
    allocated_bytes = models.BigIntegerField(null=True, blank=True)

    # Performance metrics
    read_operations_per_second = models.FloatField(null=True, blank=True)
    write_operations_per_second = models.FloatField(null=True, blank=True)
    read_throughput_mbps = models.FloatField(null=True, blank=True)
    write_throughput_mbps = models.FloatField(null=True, blank=True)

    # Health
    latency_ms = models.FloatField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['storage_id', 'created_at']),
        ]
