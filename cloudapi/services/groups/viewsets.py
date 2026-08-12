from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import (
    Group, GroupMember, GroupInvitation, GroupAccessToken,
    GroupAuditLog, GroupResourceRegistry, GroupConfigRegistry,
    GroupPipeline, GroupPipelineRun,
    PERMISSION_MATRIX,
)
from .serializers import (
    GroupSerializer,
    GroupCreateSerializer,
    GroupUpdateSerializer,
    GroupMemberSerializer,
    GroupMemberUpdateSerializer,
    GroupInvitationSerializer,
    GroupInviteCreateSerializer,
    GroupAccessTokenSerializer,
    GroupAuditLogSerializer,
    GroupResourceRegistrySerializer,
    GroupResourceRegistryCreateSerializer,
    GroupConfigRegistrySerializer,
    GroupConfigRegistryCreateSerializer,
    GroupResourceBundleSerializer,
    GroupSidebarSerializer,
    GroupPipelineSerializer,
    GroupPipelineCreateSerializer,
    GroupPipelineUpdateSerializer,
    GroupPipelineRunSerializer,
    GroupPipelineRunCreateSerializer,
)


def _audit(group, actor, action, target='', detail=None):
    GroupAuditLog.objects.create(
        group=group,
        actor=actor,
        action=action,
        target=target,
        detail=detail or {},
    )


# ── Permission helpers ────────────────────────────────────────────────────────

def _get_my_role(group: Group, user) -> str | None:
    """Return the requesting user's role string in this group, or None."""
    if group.owner_id == user.id:
        return 'owner'
    try:
        return group.memberships.get(user=user).role
    except GroupMember.DoesNotExist:
        return None


def _build_permission_set(role: str | None) -> dict[str, bool]:
    """Return a flat permission map for the given role."""
    return {perm: (role in allowed) for perm, allowed in PERMISSION_MATRIX.items()}


class GroupPermissionMixin:
    """
    Mixin for any view that needs to gate an action based on the requesting
    user's role inside a specific group.

    Usage::

        def some_action(self, request, pk=None):
            group = self.get_object()
            self._require_group_permission(group, request.user, 'pipeline.run')
            ...
    """

    def _require_group_permission(
        self,
        group: Group,
        user,
        permission: str,
        *,
        raise_on_deny: bool = True,
    ) -> bool:
        role = _get_my_role(group, user)
        allowed = PERMISSION_MATRIX.get(permission, frozenset())
        has_perm = role in allowed
        if not has_perm and raise_on_deny:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied(
                f"Your role ('{role}') does not have '{permission}' permission."
            )
        return has_perm


# ── GroupViewSet ──────────────────────────────────────────────────────────────

class GroupViewSet(GroupPermissionMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Return groups where user is owner or member
        member_group_ids = GroupMember.objects.filter(user=user).values_list('group_id', flat=True)
        return Group.objects.filter(
            id__in=list(member_group_ids)
        ).order_by('-created_at').select_related('owner').prefetch_related('memberships')

    def get_serializer_class(self):
        if self.action == 'create':
            return GroupCreateSerializer
        if self.action in ('update', 'partial_update'):
            return GroupUpdateSerializer
        return GroupSerializer

    def perform_create(self, serializer):
        group = serializer.save()
        _audit(group, self.request.user.username, 'group_created', group.name)

    def perform_update(self, serializer):
        group = self.get_object()
        self._require_group_permission(group, self.request.user, 'group.manage_settings')
        group = serializer.save()
        _audit(group, self.request.user.username, 'group_updated', group.name)

    def destroy(self, request, *args, **kwargs):
        group = self.get_object()
        if group.owner != request.user:
            return Response(
                {'error': 'Only the group owner can delete this group.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        if group.project_count > 0 or group.pipeline_count > 0:
            return Response(
                {'error': 'Remove all projects and pipelines before deleting the group.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)

    def perform_destroy(self, instance):
        _audit(instance, self.request.user.username, 'group_deleted', instance.name)
        instance.delete()

    # ── /groups/{id}/members/ ─────────────────────────────────────────────────

    @action(detail=True, methods=['get'], url_path='members')
    def members(self, request, pk=None):
        group = self.get_object()
        members = group.memberships.select_related('user', 'invited_by').all()
        serializer = GroupMemberSerializer(members, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='members/add')
    def add_member(self, request, pk=None):
        group = self.get_object()
        self._require_group_permission(group, request.user, 'group.manage_members')
        user_id = request.data.get('user_id')
        role = request.data.get('role', 'developer')
        from django.contrib.auth.models import User as DjangoUser
        try:
            user = DjangoUser.objects.get(pk=user_id)
        except DjangoUser.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)
        member, created = GroupMember.objects.get_or_create(
            group=group, user=user,
            defaults={'role': role, 'invited_by': request.user},
        )
        if not created:
            return Response({'error': 'Already a member'}, status=400)
        group.member_count = group.memberships.count()
        group.save(update_fields=['member_count'])
        _audit(group, request.user.username, 'member_added', user.username, {'role': role})
        return Response(GroupMemberSerializer(member, context={'request': request}).data, status=201)

    @action(detail=True, methods=['delete'], url_path='members/(?P<member_id>[^/.]+)')
    def remove_member(self, request, pk=None, member_id=None):
        group = self.get_object()
        self._require_group_permission(group, request.user, 'group.manage_members')
        try:
            member = group.memberships.get(pk=member_id)
        except GroupMember.DoesNotExist:
            return Response({'error': 'Member not found'}, status=404)
        if member.role == 'owner':
            return Response({'error': 'Cannot remove the group owner'}, status=400)
        username = member.user.username
        member.delete()
        group.member_count = group.memberships.count()
        group.save(update_fields=['member_count'])
        _audit(group, request.user.username, 'member_removed', username)
        return Response(status=204)

    @action(detail=True, methods=['patch'], url_path='members/(?P<member_id>[^/.]+)/role')
    def update_member_role(self, request, pk=None, member_id=None):
        group = self.get_object()
        self._require_group_permission(group, request.user, 'group.manage_members')
        try:
            member = group.memberships.get(pk=member_id)
        except GroupMember.DoesNotExist:
            return Response({'error': 'Member not found'}, status=404)
        if member.role == 'owner':
            return Response({'error': 'Use transfer_ownership to change the owner'}, status=400)
        serializer = GroupMemberUpdateSerializer(member, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        _audit(group, request.user.username, 'member_updated', member.user.username, {'role': serializer.data['role']})
        return Response(GroupMemberSerializer(member, context={'request': request}).data)

    # ── /groups/{id}/leave/ ───────────────────────────────────────────────────

    @action(detail=True, methods=['post'], url_path='leave')
    def leave(self, request, pk=None):
        group = self.get_object()
        try:
            member = group.memberships.get(user=request.user)
        except GroupMember.DoesNotExist:
            return Response({'error': 'Not a member'}, status=400)
        if member.role == 'owner':
            return Response({'error': 'Owner must transfer ownership before leaving'}, status=400)
        member.delete()
        group.member_count = group.memberships.count()
        group.save(update_fields=['member_count'])
        return Response(status=204)

    # ── /groups/{id}/transfer/ ────────────────────────────────────────────────

    @action(detail=True, methods=['post'], url_path='transfer')
    def transfer_ownership(self, request, pk=None):
        group = self.get_object()
        if group.owner != request.user:
            return Response({'error': 'Only the current owner can transfer ownership'}, status=403)
        new_owner_id = request.data.get('user_id')
        from django.contrib.auth.models import User as DjangoUser
        try:
            new_owner = DjangoUser.objects.get(pk=new_owner_id)
        except DjangoUser.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)
        GroupMember.objects.filter(group=group, role='owner').update(role='admin')
        GroupMember.objects.update_or_create(
            group=group, user=new_owner,
            defaults={'role': 'owner'},
        )
        group.owner = new_owner
        group.save(update_fields=['owner'])
        _audit(group, request.user.username, 'member_updated', new_owner.username, {'new_role': 'owner', 'transfer': True})
        return Response({'status': 'ownership transferred'})

    # ── /groups/{id}/invite/ ──────────────────────────────────────────────────

    @action(detail=True, methods=['get', 'post'], url_path='invite')
    def invite(self, request, pk=None):
        group = self.get_object()
        if request.method == 'GET':
            invites = group.invitations.filter(status='pending').order_by('-created_at')
            return Response(GroupInvitationSerializer(invites, many=True, context={'request': request}).data)

        self._require_group_permission(group, request.user, 'group.manage_members')
        serializer = GroupInviteCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']
        role = serializer.validated_data['role']

        invite, created = GroupInvitation.objects.get_or_create(
            group=group, email=email, status='pending',
            defaults={'role': role, 'invited_by': request.user},
        )
        if not created:
            return Response({'error': 'An active invite already exists for this email'}, status=400)
        _audit(group, request.user.username, 'invite_sent', email, {'role': role})
        return Response(GroupInvitationSerializer(invite, context={'request': request}).data, status=201)

    # ── /groups/{id}/invitations/{inv_id}/accept/ ─────────────────────────────

    @action(detail=True, methods=['post'], url_path='invitations/(?P<invite_id>[^/.]+)/accept')
    def accept_invite(self, request, pk=None, invite_id=None):
        group = self.get_object()
        try:
            invite = group.invitations.get(pk=invite_id, status='pending')
        except GroupInvitation.DoesNotExist:
            return Response({'error': 'Invitation not found or already actioned'}, status=404)
        if invite.expires_at and invite.expires_at < timezone.now():
            invite.status = 'expired'
            invite.save()
            return Response({'error': 'Invitation has expired'}, status=400)
        invite.status = 'accepted'
        invite.accepted_at = timezone.now()
        invite.save()
        member, _ = GroupMember.objects.get_or_create(
            group=group, user=request.user,
            defaults={'role': invite.role, 'invited_by': invite.invited_by},
        )
        group.member_count = group.memberships.count()
        group.save(update_fields=['member_count'])
        _audit(group, request.user.username, 'invite_accepted', invite.email)
        return Response(GroupMemberSerializer(member, context={'request': request}).data)

    # ── /groups/{id}/invitations/{inv_id}/decline/ ────────────────────────────

    @action(detail=True, methods=['post'], url_path='invitations/(?P<invite_id>[^/.]+)/decline')
    def decline_invite(self, request, pk=None, invite_id=None):
        group = self.get_object()
        try:
            invite = group.invitations.get(pk=invite_id, status='pending')
        except GroupInvitation.DoesNotExist:
            return Response({'error': 'Invitation not found or already actioned'}, status=404)
        invite.status = 'declined'
        invite.save()
        _audit(group, request.user.username, 'invite_sent', invite.email, {'declined': True})
        return Response({'status': 'declined'})

    # ── /groups/{id}/invitations/{inv_id}/cancel/ ─────────────────────────────

    @action(detail=True, methods=['delete'], url_path='invitations/(?P<invite_id>[^/.]+)/cancel')
    def cancel_invite(self, request, pk=None, invite_id=None):
        """Owner/Admin can cancel a pending invitation."""
        group = self.get_object()
        self._require_group_permission(group, request.user, 'group.manage_members')
        try:
            invite = group.invitations.get(pk=invite_id, status='pending')
        except GroupInvitation.DoesNotExist:
            return Response({'error': 'Invitation not found'}, status=404)
        invite.status = 'declined'
        invite.save()
        _audit(group, request.user.username, 'invite_sent', invite.email, {'cancelled': True})
        return Response(status=204)

    # ── /groups/{id}/permissions/ ─────────────────────────────────────────────

    @action(detail=True, methods=['get'], url_path='permissions')
    def permissions_view(self, request, pk=None):
        """
        GET /groups/{id}/permissions/
        Returns:
          - my_role: the requesting user's role in this group
          - my_permissions: flat dict { 'action.resource': bool }
          - role_matrix: full permission matrix for all roles (owner/admin only)
        """
        group = self.get_object()
        role = _get_my_role(group, request.user)
        my_perms = _build_permission_set(role)

        response: dict = {
            'group_id':      group.id,
            'my_role':       role,
            'my_permissions': my_perms,
        }

        # Full matrix only for owners / admins
        if role in ('owner', 'admin'):
            all_roles = [r[0] for r in [
                ('owner', ''), ('admin', ''), ('architect', ''),
                ('devops_engineer', ''), ('developer', ''),
                ('data_scientist', ''), ('finance', ''), ('viewer', ''),
            ]]
            role_matrix = {}
            for r in all_roles:
                role_matrix[r] = _build_permission_set(r)
            response['role_matrix'] = role_matrix

        return Response(response)

    # ── /groups/{id}/tokens/ ──────────────────────────────────────────────────

    @action(detail=True, methods=['get', 'post'], url_path='tokens')
    def tokens(self, request, pk=None):
        group = self.get_object()
        if request.method == 'GET':
            tokens = group.access_tokens.filter(revoked=False).order_by('-created_at')
            return Response(GroupAccessTokenSerializer(tokens, many=True, context={'request': request}).data)

        serializer = GroupAccessTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token = GroupAccessToken.objects.create(
            group=group,
            created_by=request.user,
            **serializer.validated_data,
        )
        _audit(group, request.user.username, 'token_created', token.name)
        return Response(GroupAccessTokenSerializer(token, context={'request': request}).data, status=201)

    @action(detail=True, methods=['delete'], url_path='tokens/(?P<token_id>[^/.]+)')
    def revoke_token(self, request, pk=None, token_id=None):
        group = self.get_object()
        try:
            token = group.access_tokens.get(pk=token_id)
        except GroupAccessToken.DoesNotExist:
            return Response({'error': 'Token not found'}, status=404)
        token.revoked = True
        token.save()
        _audit(group, request.user.username, 'token_revoked', token.name)
        return Response(status=204)

    # ── /groups/{id}/audit/ ───────────────────────────────────────────────────

    @action(detail=True, methods=['get'], url_path='audit')
    def audit_logs(self, request, pk=None):
        group = self.get_object()
        logs = group.audit_logs.order_by('-created_at')[:200]
        return Response(GroupAuditLogSerializer(logs, many=True).data)
    # ── /groups/{id}/projects/ ────────────────────────────────────────────────────

    @action(detail=True, methods=['get', 'post'], url_path='projects')
    def projects(self, request, pk=None):
        """
        GET  /groups/{id}/projects/  – list projects belonging to this group.
        POST /groups/{id}/projects/  – create a new project inside the group.

        Projects are not yet a first-class model – this endpoint returns an
        empty list on GET and a 501 on POST until the Project model is wired up.
        """
        group = self.get_object()  # noqa: F841 – ensures permission check runs
        if request.method == 'GET':
            # TODO: replace with Project.objects.filter(group=group) once modelled
            return Response([])
        return Response(
            {'detail': 'Project creation via group API is not yet available.'},
            status=status.HTTP_501_NOT_IMPLEMENTED,
        )

    # ── /groups/{id}/resources/ ───────────────────────────────────────────────

    @action(detail=True, methods=['get', 'post'], url_path='resources')
    def resources(self, request, pk=None):
        """
        GET  – Returns the full GroupResourceBundle: a structured summary of all
               resources owned by this group, grouped by type.  Used by the
               Workspace Dashboard to populate its sidebar.
        POST – Register (link) a new resource to this group.
        """
        group = self.get_object()

        if request.method == 'POST':
            serializer = GroupResourceRegistryCreateSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            entry = GroupResourceRegistry.objects.create(
                group=group,
                linked_by=request.user,
                **serializer.validated_data,
            )
            _audit(group, request.user.username, 'resource_linked',
                   entry.resource_name, {'type': entry.resource_type})
            return Response(GroupResourceRegistrySerializer(entry).data, status=201)

        # ── GET: build the resource bundle ────────────────────────────────────
        registry = group.resource_registry.filter(status='active').order_by('resource_type', 'resource_name')

        def _bucket(rtype):
            return [
                {
                    'id':   r.resource_id,
                    'name': r.resource_name,
                    'slug': r.resource_slug,
                    'status': r.status,
                    'region': r.region,
                    'environment': r.environment,
                    'tags': r.tags,
                    'metadata': r.metadata,
                    'created_at': r.created_at.isoformat() if r.created_at else None,
                }
                for r in registry if r.resource_type == rtype
            ]

        config_files = group.config_registry.order_by('file_type', 'file_name')
        counts = {}
        for r in registry:
            counts[r.resource_type] = counts.get(r.resource_type, 0) + 1

        bundle = {
            'projects':      _bucket('project'),
            'pipelines':     _bucket('pipeline'),
            'environments':  _bucket('environment'),
            'containers':    _bucket('container'),
            'k8s_clusters':  _bucket('k8s_cluster'),
            'secrets':       _bucket('secret'),
            'env_vars':      _bucket('env_var'),
            'deployments':   _bucket('deployment'),
            'metric_streams': _bucket('metric_stream'),
            'log_streams':   _bucket('log_stream'),
            'api_keys':      _bucket('api_key'),
            'config_files':  GroupConfigRegistrySerializer(config_files, many=True).data,
            'resource_counts': counts,
        }
        return Response(bundle)

    # ── /groups/{id}/resources/{reg_id}/ ──────────────────────────────────────

    @action(detail=True, methods=['delete'], url_path=r'resources/(?P<reg_id>[^/.]+)')
    def remove_resource(self, request, pk=None, reg_id=None):
        group = self.get_object()
        try:
            entry = group.resource_registry.get(pk=reg_id)
        except GroupResourceRegistry.DoesNotExist:
            return Response({'error': 'Resource not found'}, status=404)
        name = entry.resource_name
        rtype = entry.resource_type
        entry.delete()
        _audit(group, request.user.username, 'resource_removed', name, {'type': rtype})
        return Response(status=204)

    # ── /groups/{id}/config-files/ ────────────────────────────────────────────

    @action(detail=True, methods=['get', 'post'], url_path='config-files')
    def config_files(self, request, pk=None):
        """
        GET  – List all config files tracked by this group (right panel feed).
        POST – Register a new config file entry.
        """
        group = self.get_object()

        if request.method == 'POST':
            serializer = GroupConfigRegistryCreateSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            cfg = GroupConfigRegistry.objects.create(
                group=group,
                last_indexed_at=timezone.now(),
                **serializer.validated_data,
            )
            _audit(group, request.user.username, 'config_indexed', cfg.file_name,
                   {'type': cfg.file_type, 'path': cfg.file_path})
            return Response(GroupConfigRegistrySerializer(cfg).data, status=201)

        configs = group.config_registry.order_by('file_type', 'file_name')
        return Response(GroupConfigRegistrySerializer(configs, many=True).data)

    # ── /groups/{id}/discover/ ────────────────────────────────────────────────

    @action(detail=True, methods=['post'], url_path='discover')
    def discover(self, request, pk=None):
        """
        POST /groups/{id}/discover/
        Triggers auto-discovery: scans the platform for resources that belong
        to this group (matching group slug / handle tags) and registers them
        in the GroupResourceRegistry.

        In a full implementation this would fan out to Project / Pipeline /
        Environment / Container services and collect all matching IDs.
        Here we return a summary of what would be discovered.
        """
        group = self.get_object()
        # Stub – production would query each service for group-tagged resources
        newly_found = []

        return Response({
            'status': 'discovery_complete',
            'group': group.handle,
            'newly_registered': len(newly_found),
            'resources': newly_found,
        })

    # ── /groups/{id}/workspaces/ ──────────────────────────────────────────────

    @action(detail=True, methods=['get'], url_path='workspaces')
    def workspaces(self, request, pk=None):
        """
        GET /groups/{id}/workspaces/
        Returns all DevWorkspaces connected to this group.
        """
        group = self.get_object()
        from ..workspace.models import DevWorkspace
        ws_qs = DevWorkspace.objects.filter(connected_group_id=group.id).order_by('-created_at')
        data = [
            {
                'workspace_id':   ws.workspace_id,
                'display_name':   ws.display_name,
                'status':         ws.status,
                'region':         ws.region,
                'owner':          ws.owner.username,
                'created_at':     ws.created_at.isoformat(),
                'started_at':     ws.started_at.isoformat() if ws.started_at else None,
            }
            for ws in ws_qs
        ]
        return Response(data)

    # ── /groups/{id}/sidebar/ ─────────────────────────────────────────────────

    @action(detail=True, methods=['get'], url_path='sidebar')
    def sidebar(self, request, pk=None):
        """
        GET /groups/{id}/sidebar/
        Returns the sidebar navigation spec for this group, including resource
        counts for each section.  The Workspace Dashboard consumes this to build
        its live sidebar.
        """
        group = self.get_object()
        registry = group.resource_registry.filter(status='active')

        def _count(rtype):
            return registry.filter(resource_type=rtype).count()

        sections = [
            {'id': 'overview',      'label': 'Overview',          'count': 0,                        'badge': '', 'status': 'ok'},
            {'id': 'projects',      'label': 'Projects',          'count': group.project_count,       'badge': '', 'status': 'ok'},
            {'id': 'pipelines',     'label': 'CI/CD Pipelines',   'count': group.pipeline_count,      'badge': '', 'status': 'ok'},
            {'id': 'environments',  'label': 'Environments',       'count': _count('environment'),     'badge': '', 'status': 'ok'},
            {'id': 'containers',    'label': 'Containers',         'count': _count('container'),       'badge': '', 'status': 'ok'},
            {'id': 'kubernetes',    'label': 'Kubernetes',         'count': _count('k8s_cluster'),     'badge': '', 'status': 'ok'},
            {'id': 'deployments',   'label': 'Deployments',        'count': _count('deployment'),      'badge': '', 'status': 'ok'},
            {'id': 'metrics',       'label': 'Metrics',            'count': _count('metric_stream'),   'badge': '', 'status': 'ok'},
            {'id': 'logs',          'label': 'Logs',               'count': _count('log_stream'),      'badge': '', 'status': 'ok'},
            {'id': 'secrets',       'label': 'Secrets',            'count': _count('secret'),          'badge': '', 'status': 'ok'},
            {'id': 'env-vars',      'label': 'Environment Vars',   'count': _count('env_var'),         'badge': '', 'status': 'ok'},
            {'id': 'access',        'label': 'Access Control',     'count': group.member_count,        'badge': '', 'status': 'ok'},
            {'id': 'settings',      'label': 'Settings',           'count': 0,                        'badge': '', 'status': 'ok'},
        ]
        return Response({
            'group_id':     group.id,
            'group_name':   group.name,
            'group_handle': group.handle,
            'group_type':   group.group_type,
            'sections':     sections,
        })

    # ── /groups/{id}/group-pipelines/ ────────────────────────────────────────

    @action(detail=True, methods=['get', 'post'], url_path='group-pipelines')
    def group_pipelines(self, request, pk=None):
        """
        GET  /groups/{id}/group-pipelines/   – list pipelines owned by the group.
        POST /groups/{id}/group-pipelines/   – create a new pipeline definition.
        """
        group = self.get_object()

        if request.method == 'POST':
            self._require_group_permission(group, request.user, 'pipeline.create')
            serializer = GroupPipelineCreateSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            pipeline = GroupPipeline.objects.create(
                group=group,
                created_by=request.user,
                updated_by=request.user,
                **serializer.validated_data,
            )
            group.pipeline_count = group.pipelines.count()
            group.save(update_fields=['pipeline_count'])
            _audit(group, request.user.username, 'resource_linked', pipeline.name,
                   {'type': 'pipeline', 'id': pipeline.id})
            return Response(GroupPipelineSerializer(pipeline).data, status=201)

        qs = group.pipelines.select_related('created_by', 'updated_by').order_by('-created_at')
        # Filter by status if supplied
        status_filter = request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return Response(GroupPipelineSerializer(qs, many=True).data)

    @action(detail=True, methods=['get', 'put', 'patch', 'delete'],
            url_path=r'group-pipelines/(?P<pipeline_id>[^/.]+)')
    def group_pipeline_detail(self, request, pk=None, pipeline_id=None):
        """
        GET    /groups/{id}/group-pipelines/{pid}/  – retrieve pipeline.
        PUT/PATCH                                   – update pipeline definition.
        DELETE                                      – delete pipeline.
        """
        group = self.get_object()
        try:
            pipeline = group.pipelines.get(pk=pipeline_id)
        except GroupPipeline.DoesNotExist:
            # Also try by slug
            try:
                pipeline = group.pipelines.get(slug=pipeline_id)
            except GroupPipeline.DoesNotExist:
                return Response({'error': 'Pipeline not found'}, status=404)

        if request.method == 'DELETE':
            self._require_group_permission(group, request.user, 'pipeline.delete')
            pipeline.delete()
            group.pipeline_count = group.pipelines.count()
            group.save(update_fields=['pipeline_count'])
            return Response(status=204)

        if request.method in ('PUT', 'PATCH'):
            self._require_group_permission(group, request.user, 'pipeline.edit')
            partial = request.method == 'PATCH'
            serializer = GroupPipelineUpdateSerializer(pipeline, data=request.data, partial=partial)
            serializer.is_valid(raise_exception=True)
            serializer.save(updated_by=request.user)
            return Response(GroupPipelineSerializer(pipeline).data)

        # GET
        return Response(GroupPipelineSerializer(pipeline).data)

    @action(detail=True, methods=['get', 'put', 'patch'],
            url_path=r'group-pipelines/(?P<pipeline_id>[^/.]+)/definition')
    def group_pipeline_definition(self, request, pk=None, pipeline_id=None):
        """
        GET  – return the structured definition + YAML.
        PUT  – replace the full definition.
        PATCH – partial update (e.g. update only YAML or only stages).
        """
        group = self.get_object()
        try:
            pipeline = group.pipelines.get(pk=pipeline_id)
        except GroupPipeline.DoesNotExist:
            try:
                pipeline = group.pipelines.get(slug=pipeline_id)
            except GroupPipeline.DoesNotExist:
                return Response({'error': 'Pipeline not found'}, status=404)

        if request.method in ('PUT', 'PATCH'):
            self._require_group_permission(group, request.user, 'pipeline.edit')
            if 'definition' in request.data:
                pipeline.definition = request.data['definition']
            if 'yaml_content' in request.data:
                pipeline.yaml_content = request.data['yaml_content']
            if 'triggers' in request.data:
                pipeline.triggers = request.data['triggers']
            pipeline.updated_by = request.user
            pipeline.save()
            return Response({'definition': pipeline.definition, 'yaml_content': pipeline.yaml_content})

        return Response({
            'id':           pipeline.id,
            'name':         pipeline.name,
            'slug':         pipeline.slug,
            'definition':   pipeline.definition,
            'yaml_content': pipeline.yaml_content,
            'triggers':     pipeline.triggers,
        })

    # ── /groups/{id}/group-pipelines/{pid}/runs/ ──────────────────────────────

    @action(detail=True, methods=['get', 'post'],
            url_path=r'group-pipelines/(?P<pipeline_id>[^/.]+)/runs')
    def group_pipeline_runs(self, request, pk=None, pipeline_id=None):
        """
        GET  – list all runs for the pipeline.
        POST – trigger a new run.
        """
        group = self.get_object()
        try:
            pipeline = group.pipelines.get(pk=pipeline_id)
        except GroupPipeline.DoesNotExist:
            try:
                pipeline = group.pipelines.get(slug=pipeline_id)
            except GroupPipeline.DoesNotExist:
                return Response({'error': 'Pipeline not found'}, status=404)

        if request.method == 'POST':
            self._require_group_permission(group, request.user, 'pipeline.run')
            serializer = GroupPipelineRunCreateSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            run = GroupPipelineRun.objects.create(
                pipeline=pipeline,
                triggered_by=request.user,
                status='queued',
                stages_snapshot=pipeline.definition.get('stages', []),
                **serializer.validated_data,
            )
            pipeline.run_count = pipeline.runs.count()
            pipeline.last_run_at = run.created_at
            pipeline.last_run_status = run.status
            pipeline.save(update_fields=['run_count', 'last_run_at', 'last_run_status'])
            return Response(GroupPipelineRunSerializer(run).data, status=201)

        qs = pipeline.runs.select_related('triggered_by').order_by('-created_at')[:50]
        return Response(GroupPipelineRunSerializer(qs, many=True).data)

    @action(detail=True, methods=['get'],
            url_path=r'group-pipelines/(?P<pipeline_id>[^/.]+)/runs/(?P<run_id>[^/.]+)')
    def group_pipeline_run_detail(self, request, pk=None, pipeline_id=None, run_id=None):
        """GET /groups/{id}/group-pipelines/{pid}/runs/{rid}/ – full run detail."""
        group = self.get_object()
        try:
            pipeline = group.pipelines.get(pk=pipeline_id)
        except GroupPipeline.DoesNotExist:
            try:
                pipeline = group.pipelines.get(slug=pipeline_id)
            except GroupPipeline.DoesNotExist:
                return Response({'error': 'Pipeline not found'}, status=404)
        try:
            run = pipeline.runs.get(pk=run_id)
        except GroupPipelineRun.DoesNotExist:
            return Response({'error': 'Run not found'}, status=404)
        return Response(GroupPipelineRunSerializer(run).data)

    @action(detail=True, methods=['post'],
            url_path=r'group-pipelines/(?P<pipeline_id>[^/.]+)/runs/(?P<run_id>[^/.]+)/cancel')
    def group_pipeline_run_cancel(self, request, pk=None, pipeline_id=None, run_id=None):
        """POST .../cancel – cancel a queued or running run."""
        group = self.get_object()
        self._require_group_permission(group, request.user, 'pipeline.cancel')
        try:
            pipeline = group.pipelines.get(pk=pipeline_id)
        except GroupPipeline.DoesNotExist:
            return Response({'error': 'Pipeline not found'}, status=404)
        try:
            run = pipeline.runs.get(pk=run_id)
        except GroupPipelineRun.DoesNotExist:
            return Response({'error': 'Run not found'}, status=404)
        if run.status not in ('queued', 'running'):
            return Response({'error': f'Cannot cancel a run with status "{run.status}"'}, status=400)
        run.status = 'cancelled'
        run.save(update_fields=['status'])
        pipeline.last_run_status = 'cancelled'
        pipeline.save(update_fields=['last_run_status'])
        return Response(GroupPipelineRunSerializer(run).data)

    @action(detail=True, methods=['post'],
            url_path=r'group-pipelines/(?P<pipeline_id>[^/.]+)/runs/(?P<run_id>[^/.]+)/rollback')
    def group_pipeline_run_rollback(self, request, pk=None, pipeline_id=None, run_id=None):
        """POST .../rollback – create a rollback run from a failed or succeeded run."""
        group = self.get_object()
        self._require_group_permission(group, request.user, 'deployment.rollback')
        try:
            pipeline = group.pipelines.get(pk=pipeline_id)
        except GroupPipeline.DoesNotExist:
            return Response({'error': 'Pipeline not found'}, status=404)
        try:
            original_run = pipeline.runs.get(pk=run_id)
        except GroupPipelineRun.DoesNotExist:
            return Response({'error': 'Run not found'}, status=404)
        rollback_run = GroupPipelineRun.objects.create(
            pipeline=pipeline,
            triggered_by=request.user,
            trigger_source='user',
            status='queued',
            branch=original_run.branch,
            commit_sha=original_run.commit_sha,
            environment_id=original_run.environment_id,
            environment_name=original_run.environment_name,
            workspace_id=original_run.workspace_id,
            stages_snapshot=pipeline.definition.get('stages', []),
            rolled_back_from=original_run,
        )
        original_run.status = 'rolled_back'
        original_run.save(update_fields=['status'])
        pipeline.last_run_status = rollback_run.status
        pipeline.save(update_fields=['last_run_status'])
        return Response(GroupPipelineRunSerializer(rollback_run).data, status=201)

