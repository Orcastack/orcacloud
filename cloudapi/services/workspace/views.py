"""
Developer Workspace ViewSet
===========================
REST API for managing personal DevWorkspace instances.

Endpoints:
    GET    /api/services/dev-workspaces/           – list current user's workspaces
    POST   /api/services/dev-workspaces/           – create a new workspace
    GET    /api/services/dev-workspaces/<id>/       – retrieve a workspace
    PUT    /api/services/dev-workspaces/<id>/       – replace
    PATCH  /api/services/dev-workspaces/<id>/       – partial update
    DELETE /api/services/dev-workspaces/<id>/       – delete a stopped workspace
    POST   /api/services/dev-workspaces/<id>/start/ – start the workspace
    POST   /api/services/dev-workspaces/<id>/stop/  – stop the workspace
"""

from __future__ import annotations

import uuid
from datetime import timezone

from django.utils import timezone as django_tz
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import DevWorkspace
from .serializers import DevWorkspaceSerializer, DevWorkspaceCreateSerializer, WorkspaceSetupSerializer


class DevWorkspaceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = DevWorkspaceSerializer
    lookup_field = 'workspace_id'

    def get_queryset(self):
        """
        Context-aware queryset filter.

        Query params:
            dashboard           'developer' (default) | 'enterprise' | 'group'
            parent_context_id   enterprise org id or group id (required when
                                dashboard is 'enterprise' or 'group')

        Visibility rules:
            developer  → only workspaces created from the Developer Dashboard
            enterprise → only workspaces for the given enterprise org
            group      → only workspaces for the given group
        """
        qs = DevWorkspace.objects.filter(owner=self.request.user)
        dashboard = self.request.query_params.get('dashboard', 'developer')
        parent_id = self.request.query_params.get('parent_context_id', '')

        if dashboard == 'enterprise':
            qs = qs.filter(created_from_dashboard='enterprise')
            if parent_id:
                qs = qs.filter(parent_context_id=parent_id)
        elif dashboard == 'group':
            qs = qs.filter(created_from_dashboard='group')
            if parent_id:
                qs = qs.filter(parent_context_id=parent_id)
        else:
            # Default: Developer Dashboard — only personal workspaces
            qs = qs.filter(created_from_dashboard='developer')
        return qs

    def get_serializer_class(self):
        if self.action == 'create':
            return DevWorkspaceCreateSerializer
        return DevWorkspaceSerializer

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def destroy(self, request, *args, **kwargs):
        workspace = self.get_object()
        if workspace.status == 'running':
            return Response(
                {'detail': 'Stop the workspace before deleting it.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        workspace.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # ------------------------------------------------------------------
    # Custom actions
    # ------------------------------------------------------------------

    @action(detail=True, methods=['post'], url_path='start')
    def start(self, request, workspace_id=None):
        workspace = self.get_object()
        if workspace.status == 'running':
            return Response(
                {'detail': 'Workspace is already running.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if workspace.status == 'starting':
            return Response(
                {'detail': 'Workspace is already starting.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Simulate start: set a demo editor URL and update metrics.
        # In production this would trigger a Kubernetes Job / Docker API call.
        workspace.status = 'running'
        workspace.started_at = django_tz.now()
        workspace.editor_url = (
            f'https://editor.orcacloud.dev/{workspace.workspace_id}'
        )
        workspace.cpu_percent = 5
        workspace.ram_percent = 20
        workspace.containers = 1
        workspace.volumes = 1
        workspace.save(update_fields=[
            'status', 'started_at', 'editor_url',
            'cpu_percent', 'ram_percent', 'containers', 'volumes',
        ])
        return Response(DevWorkspaceSerializer(workspace).data)

    @action(detail=True, methods=['post'], url_path='stop')
    def stop(self, request, workspace_id=None):
        workspace = self.get_object()
        if workspace.status == 'stopped':
            return Response(
                {'detail': 'Workspace is already stopped.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        workspace.status = 'stopped'
        workspace.editor_url = ''
        workspace.cpu_percent = 0
        workspace.ram_percent = 0
        workspace.containers = 0
        workspace.volumes = 0
        workspace.save(update_fields=[
            'status', 'editor_url',
            'cpu_percent', 'ram_percent', 'containers', 'volumes',
        ])
        return Response(DevWorkspaceSerializer(workspace).data)

    @action(detail=True, methods=['post'], url_path='restart')
    def restart(self, request, workspace_id=None):
        workspace = self.get_object()
        workspace.status = 'running'
        workspace.started_at = django_tz.now()
        workspace.editor_url = f'https://editor.orcacloud.dev/{workspace.workspace_id}'
        workspace.cpu_percent = 5
        workspace.ram_percent = 20
        workspace.containers = 1
        workspace.volumes = 1
        workspace.save(update_fields=[
            'status', 'started_at', 'editor_url',
            'cpu_percent', 'ram_percent', 'containers', 'volumes',
        ])
        return Response(DevWorkspaceSerializer(workspace).data)

    # ------------------------------------------------------------------
    # Unified Setup action
    # POST /api/services/dev-workspaces/<workspace_id>/setup/
    # ------------------------------------------------------------------

    @action(detail=False, methods=['get'], url_path='catalog')
    def catalog(self, request):
        """
        GET /api/services/dev-workspaces/catalog/
        Returns all hardware template options for the Workspace Creation Wizard.
        """
        return Response({
            'compute_plans': [
                {'id': 'nano',    'label': 'Nano',    'vcpus': 1,  'ram_gb': 2,  'price_hint': 'Free tier'},
                {'id': 'micro',   'label': 'Micro',   'vcpus': 2,  'ram_gb': 4,  'price_hint': 'Starter'},
                {'id': 'small',   'label': 'Small',   'vcpus': 4,  'ram_gb': 8,  'price_hint': 'Standard'},
                {'id': 'medium',  'label': 'Medium',  'vcpus': 8,  'ram_gb': 16, 'price_hint': 'Professional'},
                {'id': 'large',   'label': 'Large',   'vcpus': 16, 'ram_gb': 32, 'price_hint': 'Enterprise'},
            ],
            'storage_types': [
                {'id': 'standard',  'label': 'Standard SSD',   'iops_hint': 'Up to 3,000 IOPS'},
                {'id': 'high-iops', 'label': 'High-IOPS SSD',  'iops_hint': 'Up to 16,000 IOPS'},
            ],
            'backup_policies': [
                {'id': 'none',   'label': 'No Backup'},
                {'id': 'daily',  'label': 'Daily Backup'},
                {'id': 'weekly', 'label': 'Weekly Backup'},
            ],
            'firewall_profiles': [
                {'id': 'default', 'label': 'Default (web-server)',  'description': 'Ports 80, 443, 22 open'},
                {'id': 'strict',  'label': 'Strict (no inbound)',    'description': 'Outbound only'},
                {'id': 'open',    'label': 'Open (all)',             'description': 'All ports open – dev only'},
                {'id': 'custom',  'label': 'Custom',                 'description': 'Define your own rules'},
            ],
            'container_runtimes': [
                {'id': 'docker',     'label': 'Docker'},
                {'id': 'podman',     'label': 'Podman'},
                {'id': 'kubernetes', 'label': 'Kubernetes Pod'},
            ],
            'container_templates': [
                {'id': 'node',     'label': 'Node.js',    'image': 'orcacloud/devbox:node20'},
                {'id': 'python',   'label': 'Python',     'image': 'orcacloud/devbox:python312'},
                {'id': 'go',       'label': 'Go',         'image': 'orcacloud/devbox:golang123'},
                {'id': 'php',      'label': 'PHP',        'image': 'orcacloud/devbox:php83'},
                {'id': 'java',     'label': 'Java',       'image': 'orcacloud/devbox:java21'},
                {'id': 'rust',     'label': 'Rust',       'image': 'orcacloud/devbox:rust'},
                {'id': 'ubuntu',   'label': 'Ubuntu LTS', 'image': 'orcacloud/devbox:22.04-lts'},
                {'id': 'debian',   'label': 'Debian',     'image': 'debian:bookworm'},
                {'id': 'lxc',      'label': 'LXC',        'image': 'orcacloud/devbox:lxc-ubuntu22'},
                {'id': 'nerdctl',  'label': 'Nerdctl',    'image': 'orcacloud/devbox:nerdctl-latest'},
                {'id': 'custom',   'label': 'Custom',     'image': ''},
            ],
            'regions': [
                {'id': 'us-east-1',      'label': 'US East (N. Virginia)'},
                {'id': 'us-west-2',      'label': 'US West (Oregon)'},
                {'id': 'eu-west-1',      'label': 'EU West (Ireland)'},
                {'id': 'eu-central-1',   'label': 'EU Central (Frankfurt)'},
                {'id': 'ap-southeast-1', 'label': 'AP Southeast (Singapore)'},
                {'id': 'ap-northeast-1', 'label': 'AP Northeast (Tokyo)'},
            ],
        })

    @action(detail=True, methods=['post'], url_path='setup')
    def setup(self, request, workspace_id=None):
        """
        Accepts the full unified-creation payload from the workspace setup
        wizard and persists connection metadata on the DevWorkspace record.

        In a production system each section would call the relevant service
        (ProjectService, ContainerService, EnvironmentService, GroupService)
        and collect the created / connected resource IDs.  Here we store the
        payload as-is so the frontend can immediately reflect the state.
        """
        workspace = self.get_object()
        serializer = WorkspaceSetupSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        d = serializer.validated_data
        update_fields = ['updated_at']

        # ── Project ──────────────────────────────────────────────────────────
        if d.get('project_action') == 'connect' and d.get('project_id'):
            workspace.connected_project_id   = d['project_id']
            workspace.connected_project_name = d.get('project_name', '')
            update_fields += ['connected_project_id', 'connected_project_name']

        elif d.get('project_action') == 'create' and d.get('project_name'):
            # Simulate creation: store the name as the ID slug
            slug = d['project_name'].lower().replace(' ', '-')[:64]
            workspace.connected_project_id   = slug
            workspace.connected_project_name = d['project_name']
            update_fields += ['connected_project_id', 'connected_project_name']

        # ── Container ────────────────────────────────────────────────────────
        if d.get('container_action') == 'connect' and d.get('container_id'):
            ids = list(workspace.connected_container_ids)
            if d['container_id'] not in ids:
                ids.append(d['container_id'])
            workspace.connected_container_ids = ids
            update_fields.append('connected_container_ids')

        elif d.get('container_action') == 'create' and d.get('container_name'):
            slug = d['container_name'].lower().replace(' ', '-')[:64]
            ids = list(workspace.connected_container_ids)
            if slug not in ids:
                ids.append(slug)
            workspace.connected_container_ids = ids
            update_fields.append('connected_container_ids')

        # ── Environment ──────────────────────────────────────────────────────
        if d.get('environment_action') == 'connect' and d.get('environment_id'):
            workspace.connected_env_id   = d['environment_id']
            workspace.connected_env_name = d.get('environment_name', '')
            update_fields += ['connected_env_id', 'connected_env_name']

        elif d.get('environment_action') == 'create' and d.get('environment_name'):
            slug = d['environment_name'].lower().replace(' ', '-')[:64]
            workspace.connected_env_id   = slug
            workspace.connected_env_name = d['environment_name']
            update_fields += ['connected_env_id', 'connected_env_name']

        # ── Group ────────────────────────────────────────────────────────────
        if d.get('group_action') == 'connect' and d.get('group_id'):
            workspace.connected_group_id   = d['group_id']
            workspace.connected_group_name = d.get('group_name', '')
            update_fields += ['connected_group_id', 'connected_group_name']

        elif d.get('group_action') == 'create' and d.get('group_name'):
            slug = d['group_name'].lower().replace(' ', '-')[:64]
            workspace.connected_group_id   = slug
            workspace.connected_group_name = d['group_name']
            update_fields += ['connected_group_id', 'connected_group_name']

        # ── Pipeline trigger ─────────────────────────────────────────────────
        if d.get('pipeline_auto_trigger') and d.get('pipeline_id'):
            workspace.pipeline_last_run    = django_tz.now()
            workspace.pipeline_last_status = 'queued'
            update_fields += ['pipeline_last_run', 'pipeline_last_status']

        # ── Persist extra setup metadata ─────────────────────────────────────
        workspace.setup_metadata = {**workspace.setup_metadata, **{
            k: v for k, v in d.items()
            if k not in ('project_id', 'container_id', 'environment_id', 'group_id')
        }}
        update_fields.append('setup_metadata')

        workspace.save(update_fields=list(set(update_fields)))
        return Response(
            DevWorkspaceSerializer(workspace).data,
            status=status.HTTP_200_OK,
        )

    # ------------------------------------------------------------------
    # Group-powered sidebar
    # GET /api/services/dev-workspaces/<workspace_id>/group-sidebar/
    # ------------------------------------------------------------------

    @action(detail=True, methods=['get'], url_path='group-sidebar')
    def group_sidebar(self, request, workspace_id=None):
        """
        Returns the Group sidebar spec for the workspace's connected group,
        including per-section resource counts.  If no group is connected
        the response has an empty sections list.
        """
        workspace = self.get_object()
        if not workspace.connected_group_id:
            return Response({
                'group_id': '',
                'group_name': '',
                'group_handle': '',
                'group_type': '',
                'sections': [],
                'workspace_connected': False,
            })

        from ..groups.models import Group as GroupModel, GroupResourceRegistry
        try:
            group = GroupModel.objects.get(id=workspace.connected_group_id)
        except GroupModel.DoesNotExist:
            return Response({
                'group_id': workspace.connected_group_id,
                'group_name': workspace.connected_group_name,
                'group_handle': '',
                'group_type': '',
                'sections': [],
                'workspace_connected': True,
                'error': 'Group not found',
            })

        registry = GroupResourceRegistry.objects.filter(group=group, status='active')

        def _count(rtype):
            return registry.filter(resource_type=rtype).count()

        sections = [
            {'id': 'overview',     'label': 'Overview',         'count': 0,                    'badge': '', 'status': 'ok'},
            {'id': 'projects',     'label': 'Projects',         'count': group.project_count,   'badge': '', 'status': 'ok'},
            {'id': 'pipelines',    'label': 'CI/CD Pipelines',  'count': group.pipeline_count,  'badge': '', 'status': 'ok'},
            {'id': 'environments', 'label': 'Environments',      'count': _count('environment'), 'badge': '', 'status': 'ok'},
            {'id': 'containers',   'label': 'Containers',        'count': _count('container'),   'badge': '', 'status': 'ok'},
            {'id': 'kubernetes',   'label': 'Kubernetes',        'count': _count('k8s_cluster'), 'badge': '', 'status': 'ok'},
            {'id': 'deployments',  'label': 'Deployments',       'count': _count('deployment'),  'badge': '', 'status': 'ok'},
            {'id': 'metrics',      'label': 'Metrics',           'count': _count('metric_stream'),'badge': '','status': 'ok'},
            {'id': 'logs',         'label': 'Logs',              'count': _count('log_stream'),  'badge': '', 'status': 'ok'},
            {'id': 'secrets',      'label': 'Secrets',           'count': _count('secret'),      'badge': '', 'status': 'ok'},
            {'id': 'env-vars',     'label': 'Environment Vars',  'count': _count('env_var'),     'badge': '', 'status': 'ok'},
            {'id': 'access',       'label': 'Access Control',    'count': group.member_count,    'badge': '', 'status': 'ok'},
            {'id': 'settings',     'label': 'Settings',          'count': 0,                    'badge': '', 'status': 'ok'},
        ]

        return Response({
            'group_id':          group.id,
            'group_name':        group.name,
            'group_handle':      group.handle,
            'group_type':        group.group_type,
            'sections':          sections,
            'workspace_connected': True,
        })
