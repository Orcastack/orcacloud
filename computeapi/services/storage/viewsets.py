# OrcaCloud Storage Service - ViewSets

import json
from django.db.models import Sum
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from ..integrations import swift_service
from .models import (
    StorageBucket, S3Object, StorageVolume, StorageSnapshot,
    FileShare, FileShareMount, EncryptionKey,
    BackupPolicy, Backup, StorageMetric
)
from .serializers import (
    StorageBucketListSerializer, StorageBucketDetailSerializer, StorageBucketCreateSerializer, StorageBucketUpdateSerializer,
    S3ObjectListSerializer, S3ObjectDetailSerializer, S3ObjectCreateSerializer, S3ObjectUpdateSerializer,
    StorageVolumeListSerializer, StorageVolumeDetailSerializer, StorageVolumeCreateSerializer, StorageVolumeUpdateSerializer,
    StorageSnapshotListSerializer, StorageSnapshotDetailSerializer,
    FileShareListSerializer, FileShareDetailSerializer, FileShareCreateSerializer, FileShareMountSerializer,
    EncryptionKeyListSerializer, EncryptionKeyDetailSerializer, EncryptionKeyCreateSerializer,
    BackupListSerializer, BackupDetailSerializer,
    BackupPolicyListSerializer, BackupPolicyDetailSerializer, BackupPolicyCreateSerializer, BackupPolicyUpdateSerializer,
    StorageMetricSerializer
)
from ..core.tenant import TenantScopedViewSetMixin


# ============================================================================
# STORAGE BUCKET VIEWSET
# ============================================================================

class StorageBucketViewSet(TenantScopedViewSetMixin, viewsets.ModelViewSet):
    """
    Viewset for object storage buckets (S3-compatible).
    Full CRUD operations for managing storage buckets.
    """
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['owner', 'region', 'status', 'versioning_enabled']
    search_fields = ['bucket_id', 'bucket_name']
    ordering_fields = ['created_at', 'bucket_name', 'total_size_gb']
    permission_classes = [IsAuthenticated]
    lookup_field = 'resource_id'

    def get_queryset(self):
        """Filter buckets by owner."""
        return self.filter_queryset_by_tenant(StorageBucket.objects.all())

    def get_serializer_class(self):
        """Use different serializers for different actions."""
        if self.action == 'retrieve':
            return StorageBucketDetailSerializer
        elif self.action == 'create':
            return StorageBucketCreateSerializer
        elif self.action == 'update' or self.action == 'partial_update':
            return StorageBucketUpdateSerializer
        return StorageBucketListSerializer

    def perform_create(self, serializer):
        """Set owner to current user."""
        serializer.save(**self.build_tenant_create_kwargs(StorageBucket))

    @action(detail=True, methods=['get'])
    def objects(self, request, pk=None):
        """List objects in bucket."""
        bucket = self.get_object()
        objects = bucket.objects.all()[:1000]  # Limit to 1000
        serializer = S3ObjectListSerializer(objects, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def statistics(self, request, pk=None):
        """Get bucket statistics."""
        bucket = self.get_object()
        return Response({
            'total_objects': bucket.total_objects,
            'total_size_gb': bucket.total_size_gb,
            'versioning_enabled': bucket.versioning_enabled,
            'encryption_enabled': bucket.encryption_enabled,
            'average_object_size_mb': (bucket.total_size_bytes / max(bucket.total_objects, 1)) / (1024**2)
        })

    @action(detail=True, methods=['post'])
    def enable_versioning(self, request, pk=None):
        """Enable bucket versioning."""
        bucket = self.get_object()
        bucket.versioning_enabled = True
        bucket.save()
        return Response({'status': 'Versioning enabled'})

    @action(detail=True, methods=['post'])
    def enable_logging(self, request, pk=None):
        """Enable bucket access logging."""
        bucket = self.get_object()
        log_bucket = request.data.get('log_target_bucket')
        if not log_bucket:
            return Response({'error': 'log_target_bucket required'}, status=status.HTTP_400_BAD_REQUEST)
        bucket.logging_enabled = True
        bucket.log_target_bucket = log_bucket
        bucket.save()
        return Response({'status': 'Logging enabled'})

    # ── OpenStack Swift integration actions ────────────────────────────────

    @action(detail=True, methods=['post'])
    def swift_sync(self, request, pk=None):
        """
        Create / update the corresponding Swift container and synchronise
        this bucket's metadata to OpenStack object-storage.
        """
        bucket = self.get_object()
        result = swift_service.create_swift_container(
            bucket_name=bucket.bucket_name,
            region=bucket.region,
            storage_class='standard',
            public=(bucket.acl == 'public-read'),
        )
        if result.get('success'):
            bucket.status = 'active'
            bucket.save(update_fields=['status'])
        return Response(result)

    @action(detail=True, methods=['post'])
    def generate_presigned_url(self, request, pk=None):
        """Generate a Swift TempURL (pre-signed) for an object in this bucket."""
        bucket = self.get_object()
        object_key = request.data.get('object_key')
        expires_in = int(request.data.get('expires_in', 3600))
        method     = request.data.get('method', 'GET').upper()

        if not object_key:
            return Response(
                {'error': 'object_key is required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        result = swift_service.generate_presigned_url(
            bucket_name=bucket.bucket_name,
            object_key=object_key,
            expires_in=expires_in,
            method=method,
        )
        return Response(result)

    @action(detail=True, methods=['get', 'post'])
    def lifecycle(self, request, pk=None):
        """
        GET  – return lifecycle rules stored in bucket metadata.
        POST – save new lifecycle rules and apply to Swift container.
        """
        bucket = self.get_object()

        if request.method == 'GET':
            rules_raw = bucket.tags.get('lifecycle_rules', '[]') if bucket.tags else '[]'
            try:
                rules = json.loads(rules_raw) if isinstance(rules_raw, str) else rules_raw
            except ValueError:
                rules = []
            return Response({'rules': rules, 'bucket': bucket.bucket_name})

        # POST
        rules = request.data.get('rules', [])
        if not isinstance(rules, list):
            return Response({'error': 'rules must be a list'}, status=status.HTTP_400_BAD_REQUEST)

        # Persist rules as JSON inside bucket.tags
        if bucket.tags is None:
            bucket.tags = {}
        bucket.tags['lifecycle_rules'] = json.dumps(rules)
        bucket.save(update_fields=['tags'])

        # Push to Swift
        result = swift_service.apply_lifecycle_policy(bucket.bucket_name, rules)
        return Response({'saved': True, 'rules_count': len(rules), 'swift': result})

    @action(detail=True, methods=['post'])
    def upload_object(self, request, pk=None):
        """
        Simulate an object upload – creates an S3Object record and
        pushes the raw bytes to the Swift container (if available).
        """
        from .models import S3Object
        import hashlib

        bucket     = self.get_object()
        file_obj   = request.FILES.get('file')
        object_key = request.data.get('object_key')

        if not file_obj and not object_key:
            return Response({'error': 'file or object_key required'}, status=status.HTTP_400_BAD_REQUEST)

        if file_obj:
            data         = file_obj.read()
            object_key   = object_key or file_obj.name
            content_type = file_obj.content_type or 'application/octet-stream'
            size_bytes   = len(data)
            etag         = hashlib.md5(data).hexdigest()
        else:
            # Metadata-only record (client-side upload)
            data         = b''
            content_type = request.data.get('content_type', 'application/octet-stream')
            size_bytes   = int(request.data.get('size_bytes', 0))
            etag         = request.data.get('etag', hashlib.md5(object_key.encode()).hexdigest())

        s3_obj, created = S3Object.objects.get_or_create(
            bucket=bucket,
            object_key=object_key,
            defaults={
                'size_bytes':    size_bytes,
                'content_type':  content_type,
                'etag':          etag,
                'storage_class': request.data.get('storage_class', 'standard'),
            },
        )

        if not created:
            s3_obj.size_bytes   = size_bytes
            s3_obj.content_type = content_type
            s3_obj.etag         = etag
            s3_obj.save()

        # Update aggregate counts
        bucket.total_objects = bucket.s3_objects.count()
        bucket.total_size_bytes = bucket.s3_objects.aggregate(
            total=Sum('size_bytes')
        )['total'] or 0
        bucket.save(update_fields=['total_objects', 'total_size_bytes'])

        # Forward to Swift
        if data:
            swift_service.upload_swift_object(
                bucket_name=bucket.bucket_name,
                object_key=object_key,
                data=data,
                content_type=content_type,
            )

        return Response({
            'success':   True,
            'object_key': object_key,
            'size_bytes': size_bytes,
            'etag':       etag,
            'created':    created,
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def replicate(self, request, pk=None):
        """Configure cross-region replication for this bucket."""
        bucket        = self.get_object()
        target_region = request.data.get('target_region')
        if not target_region:
            return Response({'error': 'target_region required'}, status=status.HTTP_400_BAD_REQUEST)

        result = swift_service.replicate_container(
            source_bucket=bucket.bucket_name,
            target_region=target_region,
        )
        return Response(result)

    @action(detail=False, methods=['get'])
    def storage_classes(self, request):
        """Return the storage class catalogue with descriptions and pricing."""
        return Response([
            {
                'id':          'standard',
                'name':        'Standard',
                'description': 'High availability, frequently accessed objects',
                'durability':  '99.999999999%',
                'availability':'99.99%',
                'price_gb':    0.023,
            },
            {
                'id':          'standard-ia',
                'name':        'Standard-IA',
                'description': 'Infrequently accessed, but rapid retrieval',
                'durability':  '99.999999999%',
                'availability':'99.9%',
                'price_gb':    0.0125,
            },
            {
                'id':          'intelligent-tiering',
                'name':        'Intelligent-Tiering',
                'description': 'Auto-moves objects between tiers based on access',
                'durability':  '99.999999999%',
                'availability':'99.9%',
                'price_gb':    0.023,
            },
            {
                'id':          'glacier',
                'name':        'Glacier',
                'description': 'Low-cost archive storage, retrieval in minutes',
                'durability':  '99.999999999%',
                'availability':'N/A',
                'price_gb':    0.004,
            },
            {
                'id':          'deep-archive',
                'name':        'Glacier Deep Archive',
                'description': 'Lowest cost, retrieval in 12 hours',
                'durability':  '99.999999999%',
                'availability':'N/A',
                'price_gb':    0.00099,
            },
        ])

    @action(detail=False, methods=['get'])
    def regions(self, request):
        """Return available regions for object storage."""
        return Response([
            {'id': 'us-east-1',  'name': 'US East — New York',         'flag': 'US'},
            {'id': 'us-west-1',  'name': 'US West — Los Angeles',      'flag': 'US'},
            {'id': 'eu-west-1',  'name': 'Europe — Frankfurt',         'flag': 'DE'},
            {'id': 'ap-south-1', 'name': 'Asia Pacific — Singapore',   'flag': 'SG'},
            {'id': 'af-south-1', 'name': 'Africa — Johannesburg',      'flag': 'ZA'},
        ])


# ============================================================================
# S3 OBJECT VIEWSET
# ============================================================================

class S3ObjectViewSet(viewsets.ModelViewSet):
    """
    Viewset for objects in storage buckets.
    Full CRUD operations for managing objects.
    """
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['bucket', 'storage_class', 'is_public']
    search_fields = ['object_key', 'bucket__bucket_name']
    ordering_fields = ['created_at', 'size_bytes', 'object_key']
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter objects by bucket owner."""
        return S3Object.objects.filter(bucket__owner=self.request.user)

    def get_serializer_class(self):
        """Use different serializers for different actions."""
        if self.action == 'retrieve':
            return S3ObjectDetailSerializer
        elif self.action == 'create':
            return S3ObjectCreateSerializer
        elif self.action == 'update' or self.action == 'partial_update':
            return S3ObjectUpdateSerializer
        return S3ObjectListSerializer

    @action(detail=True, methods=['post'])
    def make_public(self, request, pk=None):
        """Make object publicly accessible."""
        obj = self.get_object()
        obj.is_public = True
        obj.acl = 'public-read'
        obj.save()
        return Response({'status': 'Object is now public'})

    @action(detail=True, methods=['post'])
    def make_private(self, request, pk=None):
        """Make object private."""
        obj = self.get_object()
        obj.is_public = False
        obj.acl = 'private'
        obj.save()
        return Response({'status': 'Object is now private'})

    @action(detail=True, methods=['post'])
    def change_storage_class(self, request, pk=None):
        """Change object storage class."""
        obj = self.get_object()
        storage_class = request.data.get('storage_class')
        if storage_class not in dict(S3Object._meta.get_field('storage_class').choices):
            return Response({'error': 'Invalid storage_class'}, status=status.HTTP_400_BAD_REQUEST)
        obj.storage_class = storage_class
        obj.save()
        return Response({'status': f'Storage class changed to {storage_class}'})


# ============================================================================
# STORAGE VOLUME VIEWSET
# ============================================================================

class StorageVolumeViewSet(viewsets.ModelViewSet):
    """
    Viewset for block storage volumes (EBS-like).
    Full CRUD operations for managing storage volumes.
    """
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['owner', 'status', 'volume_type', 'is_attached']
    search_fields = ['volume_id', 'name']
    ordering_fields = ['created_at', 'size_gb', 'volume_type']
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter volumes by owner."""
        return StorageVolume.objects.filter(owner=self.request.user)

    def get_serializer_class(self):
        """Use different serializers for different actions."""
        if self.action == 'retrieve':
            return StorageVolumeDetailSerializer
        elif self.action == 'create':
            return StorageVolumeCreateSerializer
        elif self.action == 'update' or self.action == 'partial_update':
            return StorageVolumeUpdateSerializer
        return StorageVolumeListSerializer

    def perform_create(self, serializer):
        """Set owner to current user."""
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=['post'])
    def attach(self, request, pk=None):
        """Attach volume to instance."""
        volume = self.get_object()
        instance_id = request.data.get('instance_id')
        device = request.data.get('device', '/dev/sdfn')
        if not instance_id:
            return Response({'error': 'instance_id required'}, status=status.HTTP_400_BAD_REQUEST)
        volume.is_attached = True
        volume.attached_to_instance = instance_id
        volume.attachment_device = device
        volume.save()
        return Response({'status': f'Volume attached to {instance_id}'})

    @action(detail=True, methods=['post'])
    def detach(self, request, pk=None):
        """Detach volume from instance."""
        volume = self.get_object()
        if not volume.is_attached:
            return Response({'error': 'Volume is not attached'}, status=status.HTTP_400_BAD_REQUEST)
        volume.is_attached = False
        volume.attached_to_instance = ''
        volume.attachment_device = ''
        volume.save()
        return Response({'status': 'Volume detached'})

    @action(detail=True, methods=['post'])
    def create_snapshot(self, request, pk=None):
        """Create snapshot of volume."""
        volume = self.get_object()
        description = request.data.get('description', '')
        snapshot = StorageSnapshot.objects.create(
            volume=volume,
            size_gb=volume.size_gb,
            owner=self.request.user,
            description=description,
            status='completed'
        )
        serializer = StorageSnapshotDetailSerializer(snapshot)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# ============================================================================
# STORAGE SNAPSHOT VIEWSET
# ============================================================================

class StorageSnapshotViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Viewset for storage snapshots.
    Read-only access to snapshots (creation handled via volume snapshots).
    """
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['volume', 'status', 'is_public']
    search_fields = ['snapshot_id']
    ordering_fields = ['created_at', 'size_gb', 'status']
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter snapshots by owner."""
        return StorageSnapshot.objects.filter(owner=self.request.user)

    def get_serializer_class(self):
        """Use different serializers for different actions."""
        if self.action == 'retrieve':
            return StorageSnapshotDetailSerializer
        return StorageSnapshotListSerializer

    @action(detail=True, methods=['post'])
    def make_public(self, request, pk=None):
        """Share snapshot publicly."""
        snapshot = self.get_object()
        snapshot.is_public = True
        snapshot.save()
        return Response({'status': 'Snapshot is now public'})

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        """Create volume from snapshot."""
        snapshot = self.get_object()
        volume = StorageVolume.objects.create(
            volume_id=f"vol-{snapshot.snapshot_id[:8]}",
            name=request.data.get('name', f"restored-{snapshot.snapshot_id}"),
            size_gb=snapshot.size_gb,
            volume_type=request.data.get('volume_type', 'gp3'),
            availability_zone=request.data.get('availability_zone', 'us-west-2a'),
            owner=self.request.user,
            status='available'
        )
        serializer = StorageVolumeDetailSerializer(volume)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# ============================================================================
# FILE SHARE VIEWSET
# ============================================================================

class FileShareViewSet(viewsets.ModelViewSet):
    """
    Viewset for file storage shares (NFS/SMB).
    Full CRUD operations for managing file shares.
    """
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['owner', 'protocol', 'status']
    search_fields = ['file_share_id', 'name']
    ordering_fields = ['created_at', 'size_gb', 'used_gb']
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter file shares by owner."""
        return FileShare.objects.filter(owner=self.request.user)

    def get_serializer_class(self):
        """Use different serializers for different actions."""
        if self.action == 'retrieve':
            return FileShareDetailSerializer
        elif self.action == 'create':
            return FileShareCreateSerializer
        return FileShareListSerializer

    def perform_create(self, serializer):
        """Set owner to current user."""
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=['get'])
    def mounts(self, request, pk=None):
        """Get all mounts for file share."""
        file_share = self.get_object()
        mounts = file_share.mounts.all()
        serializer = FileShareMountSerializer(mounts, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def mount(self, request, pk=None):
        """Mount file share to instance."""
        file_share = self.get_object()
        instance_id = request.data.get('instance_id')
        mount_path = request.data.get('mount_path')
        if not instance_id or not mount_path:
            return Response({'error': 'instance_id and mount_path required'}, status=status.HTTP_400_BAD_REQUEST)
        mount = FileShareMount.objects.create(
            file_share=file_share,
            instance_id=instance_id,
            mount_path=mount_path,
            mount_options=request.data.get('mount_options', '')
        )
        serializer = FileShareMountSerializer(mount)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def unmount(self, request, pk=None):
        """Unmount file share from instance."""
        file_share = self.get_object()
        instance_id = request.data.get('instance_id')
        if not instance_id:
            return Response({'error': 'instance_id required'}, status=status.HTTP_400_BAD_REQUEST)
        mounts = file_share.mounts.filter(instance_id=instance_id)
        mounts.delete()
        return Response({'status': f'Unmounted from {instance_id}'})


# ============================================================================
# ENCRYPTION KEY VIEWSET
# ============================================================================

class EncryptionKeyViewSet(viewsets.ModelViewSet):
    """
    Viewset for customer-managed encryption keys.
    Full CRUD operations for managing encryption keys.
    """
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['owner', 'key_type', 'key_state']
    search_fields = ['key_id', 'name']
    ordering_fields = ['created_at', 'key_type']
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter keys by owner."""
        return EncryptionKey.objects.filter(owner=self.request.user)

    def get_serializer_class(self):
        """Use different serializers for different actions."""
        if self.action == 'retrieve':
            return EncryptionKeyDetailSerializer
        elif self.action == 'create':
            return EncryptionKeyCreateSerializer
        return EncryptionKeyListSerializer

    def perform_create(self, serializer):
        """Set owner to current user."""
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=['post'])
    def rotate(self, request, pk=None):
        """Manually rotate encryption key."""
        from django.utils import timezone
        key = self.get_object()
        key.last_rotated_at = timezone.now()
        key.next_rotation_at = timezone.now() + timezone.timedelta(days=key.rotation_period_days)
        key.save()
        return Response({'status': 'Key rotated successfully'})

    @action(detail=True, methods=['post'])
    def disable(self, request, pk=None):
        """Disable encryption key."""
        key = self.get_object()
        key.key_state = 'disabled'
        key.save()
        return Response({'status': 'Key disabled'})

    @action(detail=True, methods=['post'])
    def enable(self, request, pk=None):
        """Re-enable encryption key."""
        key = self.get_object()
        key.key_state = 'enabled'
        key.save()
        return Response({'status': 'Key enabled'})


# ============================================================================
# BACKUP POLICY VIEWSET
# ============================================================================

class BackupPolicyViewSet(viewsets.ModelViewSet):
    """
    Viewset for backup policies.
    Full CRUD operations for managing backup policies.
    """
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['owner', 'resource_type', 'schedule_frequency', 'is_enabled']
    search_fields = ['policy_id', 'name']
    ordering_fields = ['created_at', 'name', 'last_backup_time']
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter policies by owner."""
        return BackupPolicy.objects.filter(owner=self.request.user)

    def get_serializer_class(self):
        """Use different serializers for different actions."""
        if self.action == 'retrieve':
            return BackupPolicyDetailSerializer
        elif self.action == 'create':
            return BackupPolicyCreateSerializer
        elif self.action == 'update' or self.action == 'partial_update':
            return BackupPolicyUpdateSerializer
        return BackupPolicyListSerializer

    def perform_create(self, serializer):
        """Set owner to current user."""
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=['get'])
    def backups(self, request, pk=None):
        """Get backups for policy."""
        policy = self.get_object()
        backups = policy.backups.all()
        serializer = BackupListSerializer(backups, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def trigger_backup(self, request, pk=None):
        """Trigger backup immediately."""
        from django.utils import timezone
        policy = self.get_object()
        backup = Backup.objects.create(
            policy=policy,
            resource_type=policy.resource_type,
            resource_id=policy.resource_ids[0] if policy.resource_ids else '',
            size_bytes=1024 * 1024 * 1024,  # 1GB placeholder
            status='completed',
            completed_at=timezone.now()
        )
        serializer = BackupDetailSerializer(backup)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# ============================================================================
# BACKUP VIEWSET
# ============================================================================

class BackupViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Viewset for backups.
    Read-only access to backups (creation handled via policies).
    """
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['policy', 'resource_type', 'status']
    search_fields = ['backup_id', 'resource_id']
    ordering_fields = ['created_at', 'status', 'size_bytes']
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter backups by policy owner."""
        return Backup.objects.filter(policy__owner=self.request.user)

    def get_serializer_class(self):
        """Use different serializers for different actions."""
        if self.action == 'retrieve':
            return BackupDetailSerializer
        return BackupListSerializer

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        """Restore from backup."""
        backup = self.get_object()
        if not backup.can_restore:
            return Response({'error': 'Backup cannot be restored'}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'status': f'Restoring from backup {backup.backup_id}'})
