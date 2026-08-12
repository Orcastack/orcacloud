"""
Kubernetes Integration ViewSets
────────────────────────────────
Exposes the following REST API under /api/kubernetes/:

  POST   /api/kubernetes/config/                – create / upsert kube config
  GET    /api/kubernetes/config/                – list configs (owner's)
  GET    /api/kubernetes/config/<id>/           – retrieve single config
  PATCH  /api/kubernetes/config/<id>/           – update config
  DELETE /api/kubernetes/config/<id>/           – delete config

  POST   /api/kubernetes/config/<id>/scan/      – scan git repo → manifest list
  POST   /api/kubernetes/config/<id>/apply/     – apply selected manifests
  GET    /api/kubernetes/config/<id>/monitor/   – cluster monitor data
  GET    /api/kubernetes/config/<id>/history/   – sync run history

  GET    /api/kubernetes/sync-runs/             – all sync runs for owner
"""

import threading
import logging

from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import KubeConfig, KubeSyncRun
from .serializers import (
    KubeConfigSerializer, KubeConfigCreateSerializer,
    KubeSyncRunSerializer, ScanResultSerializer,
)
from .git_service import GitService, GitServiceError
from .manifest_parser import parse_manifest_file, build_summary
from .kube_apply import execute_apply
from .kube_monitor import get_monitor_data

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# KubeConfig ViewSet
# ─────────────────────────────────────────────────────────────────────────────

class KubeConfigViewSet(viewsets.ModelViewSet):
    """
    CRUD + lifecycle actions for per-project Kubernetes configuration.

    Routes registered by DefaultRouter:
        GET    /kubernetes/config/           list
        POST   /kubernetes/config/           create
        GET    /kubernetes/config/<id>/      retrieve
        PATCH  /kubernetes/config/<id>/      partial_update
        DELETE /kubernetes/config/<id>/      destroy

    Extra actions:
        POST  /kubernetes/config/<id>/scan/    – scan git repo
        POST  /kubernetes/config/<id>/apply/   – apply manifests
        GET   /kubernetes/config/<id>/monitor/ – workloads / pods / events
        GET   /kubernetes/config/<id>/history/ – sync run history
    """

    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = KubeConfig.objects.filter(owner=self.request.user).prefetch_related('sync_runs')
        project_id  = self.request.query_params.get('project_id')
        environment = self.request.query_params.get('environment')
        if project_id:
            qs = qs.filter(project_id=project_id)
        if environment:
            qs = qs.filter(environment=environment)
        return qs.order_by('-created_at')

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return KubeConfigCreateSerializer
        return KubeConfigSerializer

    def perform_create(self, serializer):
        # Upsert: if config for project_id + environment already exists, update it
        project_id  = serializer.validated_data.get('project_id')
        environment = serializer.validated_data.get('environment', 'development')
        try:
            existing = KubeConfig.objects.get(
                owner=self.request.user,
                project_id=project_id,
                environment=environment,
            )
            for key, value in serializer.validated_data.items():
                setattr(existing, key, value)
            existing.save()
        except KubeConfig.DoesNotExist:
            serializer.save(owner=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        # Re-fetch the full object for the response
        project_id  = serializer.validated_data.get('project_id')
        environment = serializer.validated_data.get('environment', 'development')
        obj = KubeConfig.objects.get(
            owner=request.user,
            project_id=project_id,
            environment=environment,
        )
        return Response(
            KubeConfigSerializer(obj).data,
            status=status.HTTP_201_CREATED,
        )

    # ── Scan ─────────────────────────────────────────────────────────────────

    @action(detail=True, methods=['post'])
    def scan(self, request, pk=None):
        """
        Scan the configured Git repository for Kubernetes manifests.

        Request body (optional overrides):
          { "branch": "...", "path": "..." }

        Returns a structured manifest list with governance warnings.
        """
        kube_cfg = self.get_object()

        branch = request.data.get('branch', kube_cfg.git_branch)
        path   = request.data.get('path',   kube_cfg.git_path)
        token  = request.data.get('git_token', '')

        # Update the KubeSyncRun to 'scanning'
        kube_cfg.last_sync_status = 'scanning'
        kube_cfg.save(update_fields=['last_sync_status', 'updated_at'])

        git = GitService(
            provider=kube_cfg.git_provider,
            repo=kube_cfg.git_repo,
            branch=branch,
            path=path,
            access_token=token,
        )
        try:
            git.clone()
            commit_sha = git.get_current_commit()
            yaml_files = git.list_yaml_files()

            parsed_files = []
            all_warnings = []
            for rel_path in yaml_files:
                content = git.read_file(rel_path)
                parsed  = parse_manifest_file(content, rel_path)
                parsed_files.append(parsed)
                all_warnings.extend(parsed.get('warnings', []))

            summary = build_summary(parsed_files)

        except GitServiceError as exc:
            kube_cfg.last_sync_status = 'failed'
            kube_cfg.save(update_fields=['last_sync_status', 'updated_at'])
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        finally:
            git.cleanup()

        kube_cfg.last_sync_status    = 'pending'   # awaiting user confirmation
        kube_cfg.governance_warnings = all_warnings
        kube_cfg.save(update_fields=['last_sync_status', 'governance_warnings', 'updated_at'])

        return Response({
            'commit_sha':   commit_sha,
            'branch':       branch,
            'files':        parsed_files,
            'total_files':  len(parsed_files),
            'summary':      summary,
            'all_warnings': all_warnings,
        })

    # ── Apply ────────────────────────────────────────────────────────────────

    @action(detail=True, methods=['post'])
    def apply(self, request, pk=None):
        """
        Apply selected manifests to the Kubernetes cluster.

        Request body:
          {
            "commit_sha":      "abc123",
            "selected_files":  ["k8s/deployment.yaml", "k8s/service.yaml"],
            "dry_run":         false
          }
        """
        kube_cfg       = self.get_object()
        commit_sha     = request.data.get('commit_sha', '')
        selected_files = request.data.get('selected_files', [])
        dry_run        = request.data.get('dry_run', False)
        token          = request.data.get('git_token', '')

        if not selected_files:
            return Response(
                {'error': 'selected_files is required and must not be empty'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        kube_cfg.last_sync_status = 'syncing'
        kube_cfg.save(update_fields=['last_sync_status', 'updated_at'])

        git = GitService(
            provider=kube_cfg.git_provider,
            repo=kube_cfg.git_repo,
            branch=kube_cfg.git_branch,
            path=kube_cfg.git_path,
            access_token=token,
        )
        try:
            workdir = git.clone()
            if not commit_sha:
                commit_sha = git.get_current_commit()

            sync_run = execute_apply(
                kube_config    = kube_cfg,
                workdir        = workdir,
                selected_files = selected_files,
                commit_sha     = commit_sha,
                triggered_by   = request.user.username,
                dry_run        = dry_run,
            )
        except Exception as exc:
            logger.exception('Apply failed for KubeConfig %s', pk)
            kube_cfg.last_sync_status = 'failed'
            kube_cfg.save(update_fields=['last_sync_status', 'updated_at'])
            return Response({'error': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        finally:
            git.cleanup()

        return Response(
            KubeSyncRunSerializer(sync_run).data,
            status=status.HTTP_200_OK,
        )

    # ── Monitor ──────────────────────────────────────────────────────────────

    @action(detail=True, methods=['get'])
    def monitor(self, request, pk=None):
        """
        Return current workloads, pods, networking, events and health
        for the project namespace.
        """
        kube_cfg  = self.get_object()
        namespace = kube_cfg.derive_namespace()
        data      = get_monitor_data(namespace)
        data['last_commit']      = kube_cfg.last_commit
        data['last_sync_status'] = kube_cfg.last_sync_status
        data['last_synced_at']   = kube_cfg.last_synced_at
        data['auto_apply']       = kube_cfg.auto_apply
        return Response(data)

    # ── History ──────────────────────────────────────────────────────────────

    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        """Return sync run history for this config."""
        kube_cfg  = self.get_object()
        runs      = kube_cfg.sync_runs.order_by('-started_at')[:50]
        return Response(KubeSyncRunSerializer(runs, many=True).data)


# ─────────────────────────────────────────────────────────────────────────────
# KubeSyncRun ViewSet (read-only)
# ─────────────────────────────────────────────────────────────────────────────

class KubeSyncRunViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only access to all sync runs for the authenticated user.
    Useful for CI/CD pipeline status polling.
    """

    permission_classes = [IsAuthenticated]
    serializer_class   = KubeSyncRunSerializer

    def get_queryset(self):
        return KubeSyncRun.objects.filter(
            kube_config__owner=self.request.user
        ).select_related('kube_config').order_by('-started_at')[:200]
