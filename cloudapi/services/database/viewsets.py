# OrcaCloud – Managed Database ViewSets
# Handles CRUD + actions: scale, restart, rotate credentials, create backup, metrics

import secrets
import string
from datetime import datetime, timedelta

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import (
    ManagedDatabase, DatabaseCredential, DatabaseBackup, DatabaseMetric,
    ENGINE_CHOICES, VERSION_MAP, REGION_CHOICES,
)
from .serializers import (
    ManagedDatabaseListSerializer, ManagedDatabaseDetailSerializer,
    CreateDatabaseSerializer, ScaleDatabaseSerializer,
    DatabaseBackupSerializer, DatabaseCredentialSerializer,
    DatabaseMetricSerializer,
)


def _generate_password(length=24):
    alphabet = string.ascii_letters + string.digits + '!@#$%^&*()'
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def _simulate_provision(db: ManagedDatabase):
    """Set mock connectivity info on first provision."""
    region_host_map = {
        'af-south-1': 'af-south.db.orcacloud.cloud',
        'eu-west-1':  'eu-west.db.orcacloud.cloud',
        'ap-south-1': 'ap-south.db.orcacloud.cloud',
        'us-east-1':  'us-east.db.orcacloud.cloud',
        'us-west-1':  'us-west.db.orcacloud.cloud',
    }
    db.host   = f"{db.name}.{region_host_map.get(db.region, 'db.orcacloud.cloud')}"
    db.port   = db.default_port
    db.status = 'running'
    db.provisioned_at = timezone.now()
    # Build a masked connection URI
    db.connection_uri = f"{db.engine}://<user>:<password>@{db.host}:{db.port}/{db.database_name}?sslmode=require"
    db.save()


class ManagedDatabaseViewSet(viewsets.ModelViewSet):
    """
    CRUD + lifecycle actions for managed databases.

    list          GET   /databases/
    create        POST  /databases/
    retrieve      GET   /databases/{id}/
    update        PATCH /databases/{id}/
    destroy       DELETE /databases/{id}/
    scale         POST  /databases/{id}/scale/
    restart       POST  /databases/{id}/restart/
    credentials   GET   /databases/{id}/credentials/
    rotate        POST  /databases/{id}/rotate/
    backups       GET   /databases/{id}/backups/
    backup        POST  /databases/{id}/backup/
    restore       POST  /databases/{id}/restore/
    metrics       GET   /databases/{id}/metrics/
    engines       GET   /databases/engines/
    """

    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ManagedDatabase.objects.filter(
            owner=self.request.user
        ).prefetch_related('credentials', 'backups', 'metrics')

    def get_serializer_class(self):
        if self.action == 'list':
            return ManagedDatabaseListSerializer
        if self.action == 'create':
            return CreateDatabaseSerializer
        return ManagedDatabaseDetailSerializer

    # ── Create ───────────────────────────────────────────────────────────────
    def perform_create(self, serializer):
        db = serializer.save(owner=self.request.user)
        # Create default admin credential
        pwd = _generate_password()
        DatabaseCredential.objects.create(
            database=db, username='orcacloud_admin', password=pwd, role='admin',
        )
        # Simulate provisioning
        _simulate_provision(db)

    def create(self, request, *args, **kwargs):
        serializer = CreateDatabaseSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        # Return full detail
        db = ManagedDatabase.objects.filter(
            owner=request.user, name=request.data['name']
        ).first()
        resp = ManagedDatabaseDetailSerializer(db, context={'request': request})
        # Include the initial password once
        cred = db.credentials.filter(username='orcacloud_admin').first()
        data = resp.data
        data['initial_password'] = cred.password if cred else None
        return Response(data, status=status.HTTP_201_CREATED)

    # ── Destroy ───────────────────────────────────────────────────────────────
    def destroy(self, request, *args, **kwargs):
        db = self.get_object()
        db.status = 'deleting'
        db.deleted_at = timezone.now()
        db.save()
        db.delete()
        return Response({'message': f'Database {db.name} deleted.'}, status=status.HTTP_204_NO_CONTENT)

    # ── Scale ─────────────────────────────────────────────────────────────────
    @action(detail=True, methods=['post'])
    def scale(self, request, pk=None):
        db  = self.get_object()
        ser = ScaleDatabaseSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        for field, value in ser.validated_data.items():
            setattr(db, field, value)
        db.status = 'scaling'
        db.save()
        # Simulate scaling completion
        db.status = 'running'
        db.save()
        return Response(ManagedDatabaseDetailSerializer(db).data)

    # ── Restart ───────────────────────────────────────────────────────────────
    @action(detail=True, methods=['post'])
    def restart(self, request, pk=None):
        db = self.get_object()
        if db.status not in ('running', 'error', 'stopped'):
            return Response({'error': 'Database is not in a restartable state.'}, status=400)
        db.status = 'restarting'
        db.save()
        db.status = 'running'
        db.save()
        return Response({'message': f'{db.name} restarted successfully.', 'status': db.status})

    # ── Credentials ───────────────────────────────────────────────────────────
    @action(detail=True, methods=['get'])
    def credentials(self, request, pk=None):
        db    = self.get_object()
        creds = db.credentials.filter(is_active=True)
        return Response(DatabaseCredentialSerializer(creds, many=True, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def rotate(self, request, pk=None):
        db       = self.get_object()
        username = request.data.get('username', 'orcacloud_admin')
        cred     = get_object_or_404(DatabaseCredential, database=db, username=username)
        new_pwd  = _generate_password()
        cred.password        = new_pwd
        cred.last_rotated_at = timezone.now()
        cred.save()
        return Response({
            'message':   f'Credentials for {username} rotated.',
            'username':  username,
            'password':  new_pwd,
            'rotated_at': cred.last_rotated_at,
        })

    # ── Backups ───────────────────────────────────────────────────────────────
    @action(detail=True, methods=['get'])
    def backups(self, request, pk=None):
        db      = self.get_object()
        backups = db.backups.all()[:20]
        return Response(DatabaseBackupSerializer(backups, many=True).data)

    @action(detail=True, methods=['post'])
    def backup(self, request, pk=None):
        db = self.get_object()
        if db.status != 'running':
            return Response({'error': 'Database must be running to create a backup.'}, status=400)
        backup = DatabaseBackup.objects.create(
            database    = db,
            backup_type = request.data.get('backup_type', 'manual'),
            status      = 'completed',
            size_gb     = round(db.current_storage_gb * 0.85, 2) or 0.5,
            duration_s  = 42,
            expires_at  = timezone.now() + timedelta(days=db.backup_retention_days),
        )
        db.last_backup_at = timezone.now()
        db.status         = 'running'
        db.save()
        return Response(DatabaseBackupSerializer(backup).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        db        = self.get_object()
        backup_id = request.data.get('backup_id')
        if not backup_id:
            return Response({'error': 'backup_id is required.'}, status=400)
        backup = get_object_or_404(DatabaseBackup, database=db, backup_id=backup_id)
        if backup.status != 'completed':
            return Response({'error': 'Cannot restore from an incomplete backup.'}, status=400)
        db.status = 'provisioning'
        db.save()
        db.status = 'running'
        db.save()
        return Response({'message': f'Restore from backup {backup_id} initiated for {db.name}.'})

    # ── Metrics ───────────────────────────────────────────────────────────────
    @action(detail=True, methods=['get'])
    def metrics(self, request, pk=None):
        db = self.get_object()
        # Generate mock time-series metrics for the last 24 hours if empty
        if not db.metrics.exists():
            _seed_mock_metrics(db)
        metrics = db.metrics.all()[:48]
        return Response(DatabaseMetricSerializer(metrics, many=True).data)

    # ── Engine catalogue ──────────────────────────────────────────────────────
    @action(detail=False, methods=['get'])
    def engines(self, request):
        data = []
        for key, label in ENGINE_CHOICES:
            data.append({
                'engine':   key,
                'label':    label,
                'versions': VERSION_MAP.get(key, []),
            })
        return Response(data)

    @action(detail=False, methods=['get'])
    def regions(self, request):
        return Response([{'region': k, 'label': v} for k, v in REGION_CHOICES])

    # ── Migrate ───────────────────────────────────────────────────────────────
    @action(detail=True, methods=['post'])
    def migrate(self, request, pk=None):
        """
        Simulate a DB-to-DB migration.
        Payload:
          target_id   – UUID of the destination ManagedDatabase (must belong to the same user)
          strategy    – 'full_copy' | 'schema_only' | 'data_only' | 'incremental'
          tables      – optional list of table/collection names; empty means all
          truncate_target – bool, default False
          dry_run      – bool, default False
        """
        import random, uuid

        source = self.get_object()

        target_id = request.data.get('target_id')
        if not target_id:
            return Response({'error': 'target_id is required.'}, status=400)

        try:
            target = ManagedDatabase.objects.get(pk=target_id, owner=request.user)
        except ManagedDatabase.DoesNotExist:
            return Response({'error': 'Target database not found or access denied.'}, status=404)

        if source.pk == target.pk:
            return Response({'error': 'Source and target databases must be different.'}, status=400)

        if source.engine != target.engine:
            return Response({
                'error': f'Engine mismatch: cannot migrate from {source.engine} to {target.engine}.',
                'hint':  'Cross-engine migrations require an ETL pipeline.',
            }, status=400)

        strategy  = request.data.get('strategy', 'full_copy')
        tables    = request.data.get('tables', [])
        dry_run   = bool(request.data.get('dry_run', False))
        truncate  = bool(request.data.get('truncate_target', False))

        valid_strategies = ('full_copy', 'schema_only', 'data_only', 'incremental')
        if strategy not in valid_strategies:
            return Response({'error': f'Invalid strategy. Choose one of: {", ".join(valid_strategies)}'}, status=400)

        if source.status != 'running':
            return Response({'error': 'Source database must be running to start a migration.'}, status=400)
        if target.status != 'running':
            return Response({'error': 'Target database must be running to accept a migration.'}, status=400)

        migration_id = str(uuid.uuid4())

        # Simulated migration stats
        tables_migrated = random.randint(8, 40) if not tables else len(tables)
        rows_migrated   = random.randint(1_000, 5_000_000) if strategy != 'schema_only' else 0
        duration_s      = round(random.uniform(3.5, 180.0), 1)
        warnings        = []
        if strategy == 'incremental':
            warnings.append('Incremental sync: ensure binary logging / WAL is enabled on source.')
        if truncate:
            warnings.append(f'Target database {target.name} was truncated before migration.')

        return Response({
            'migration_id':    migration_id,
            'status':          'simulated' if dry_run else 'completed',
            'dry_run':         dry_run,
            'source':          {'id': str(source.pk), 'name': source.name, 'engine': source.engine},
            'target':          {'id': str(target.pk), 'name': target.name, 'engine': target.engine},
            'strategy':        strategy,
            'tables':          tables if tables else '(all)',
            'tables_migrated': tables_migrated,
            'rows_migrated':   rows_migrated,
            'duration_s':      duration_s,
            'truncate_target': truncate,
            'warnings':        warnings,
            'message':         (
                f'Dry-run complete — no data was written.' if dry_run
                else f'Migration of "{source.name}" → "{target.name}" completed in {duration_s}s.'
            ),
        })


def _seed_mock_metrics(db: ManagedDatabase):
    """Seed a few mock metric data points for demo purposes."""
    import random
    now = timezone.now()
    for i in range(24):
        DatabaseMetric.objects.create(
            database             = db,
            cpu_percent          = random.uniform(5, 45),
            memory_percent       = random.uniform(20, 70),
            storage_used_gb      = db.current_storage_gb or random.uniform(0.5, db.storage_gb * 0.4),
            active_connections   = random.randint(1, db.vcpus * 5),
            queries_per_second   = random.uniform(10, 500),
            avg_query_latency_ms = random.uniform(0.5, 15.0),
            replication_lag_ms   = random.uniform(0, 50) if db.read_replicas > 0 else 0,
            iops_read            = random.randint(50, 2000),
            iops_write           = random.randint(20, 500),
            created_at           = now - timedelta(hours=i),
        )
