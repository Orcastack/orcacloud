# OrcaCloud — Team System ViewSets

import logging
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ViewSet

from .models import (
    Team, TeamMember, TeamPermission, TeamResource,
    Portfolio, PortfolioResource, TeamActivityLog, TeamInvitation,
    PERMISSION_TEMPLATES,
)
from .serializers import (
    TeamListSerializer, TeamDetailSerializer, CreateTeamSerializer, UpdateTeamSerializer,
    TeamMemberSerializer, AddMemberSerializer, ChangeRoleSerializer,
    TeamPermissionSerializer, UpdatePermissionsSerializer,
    TeamResourceSerializer, AttachResourceSerializer,
    PortfolioSerializer, CreatePortfolioSerializer, AddPortfolioItemSerializer,
    TeamActivityLogSerializer,
    TeamInvitationSerializer, CreateInvitationSerializer,
)

logger = logging.getLogger(__name__)


def _log(team, actor, action, target_type='', target_id='', target_name='', **metadata):
    TeamActivityLog.objects.create(
        team=team, actor=actor, action=action,
        target_type=target_type, target_id=target_id,
        target_name=target_name, metadata=metadata,
    )


def _require_role(team, user, *roles):
    """Return member if user has any of the required roles, else None."""
    return TeamMember.objects.filter(team=team, user=user, role__in=roles).first()


# ── Team ViewSet ──────────────────────────────────────────────────────────────

class TeamViewSet(ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        """List all teams the current user belongs to."""
        team_ids = TeamMember.objects.filter(user=request.user).values_list('team_id', flat=True)
        queryset = Team.objects.filter(id__in=team_ids, status='active').select_related('owner')
        serializer = TeamListSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        """Get full team detail."""
        try:
            team = Team.objects.prefetch_related(
                'members__user', 'permissions', 'portfolios__items', 'resources'
            ).get(team_id=pk)
        except Team.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not TeamMember.objects.filter(team=team, user=request.user).exists():
            return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = TeamDetailSerializer(team, context={'request': request})
        return Response(serializer.data)

    def create(self, request):
        """Create a new team. Automatically applies the default permission template."""
        ser = CreateTeamSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        team = Team.objects.create(
            name=data['name'],
            team_type=data['team_type'],
            description=data.get('description', ''),
            avatar_color=data.get('avatar_color', '#00E0FF'),
            owner=request.user,
        )

        # Owner membership
        TeamMember.objects.create(team=team, user=request.user, role='owner')

        # Extra initial members
        for m in data.get('members', []):
            try:
                uid = int(m.get('user_id', 0))
                role = m.get('role', 'member')
                if role == 'owner':
                    role = 'member'
                u = User.objects.get(pk=uid)
                TeamMember.objects.get_or_create(team=team, user=u, defaults={'role': role})
            except (User.DoesNotExist, ValueError):
                pass

        # Apply permission template
        if data.get('apply_template', True):
            template = PERMISSION_TEMPLATES.get(data['team_type'], {})
            perms = [
                TeamPermission(team=team, permission_key=k, allowed=v)
                for k, v in template.items()
            ]
            TeamPermission.objects.bulk_create(perms)

        _log(team, request.user, 'team_created', metadata={'team_type': data['team_type']})
        return Response(TeamDetailSerializer(team, context={'request': request}).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None):
        """Update team name / description / avatar / status."""
        try:
            team = Team.objects.get(team_id=pk)
        except Team.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        member = _require_role(team, request.user, 'owner', 'admin')
        if not member:
            return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

        ser = UpdateTeamSerializer(data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data
        for field in ['name', 'description', 'avatar_color', 'status']:
            if field in d:
                setattr(team, field, d[field])
        team.save()
        _log(team, request.user, 'team_updated')
        return Response(TeamDetailSerializer(team, context={'request': request}).data)

    def destroy(self, request, pk=None):
        """Delete team — owner only."""
        try:
            team = Team.objects.get(team_id=pk)
        except Team.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        if team.owner != request.user:
            return Response({'detail': 'Only the team owner can delete a team.'}, status=status.HTTP_403_FORBIDDEN)

        team_name = team.name
        team.delete()
        logger.info('Team %s deleted by %s', team_name, request.user.username)
        return Response({'detail': f'Team "{team_name}" deleted.'}, status=status.HTTP_200_OK)

    # ── Members ──────────────────────────────────────────────────────────────

    @action(detail=True, methods=['get'], url_path='members')
    def members_list(self, request, pk=None):
        try:
            team = Team.objects.get(team_id=pk)
        except Team.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not TeamMember.objects.filter(team=team, user=request.user).exists():
            return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)
        return Response(TeamMemberSerializer(team.members.select_related('user'), many=True).data)

    @action(detail=True, methods=['post'], url_path='members/add')
    def member_add(self, request, pk=None):
        try:
            team = Team.objects.get(team_id=pk)
        except Team.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not _require_role(team, request.user, 'owner', 'admin'):
            return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)
        ser = AddMemberSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            user = User.objects.get(pk=ser.validated_data['user_id'])
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
        member, created = TeamMember.objects.get_or_create(
            team=team, user=user, defaults={'role': ser.validated_data['role']}
        )
        if not created:
            return Response({'detail': 'User is already a member.'}, status=status.HTTP_400_BAD_REQUEST)
        _log(team, request.user, 'member_added', 'user', str(user.id), user.username)
        return Response(TeamMemberSerializer(member).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'], url_path=r'members/(?P<user_id>\d+)')
    def member_remove(self, request, pk=None, user_id=None):
        try:
            team = Team.objects.get(team_id=pk)
        except Team.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not _require_role(team, request.user, 'owner', 'admin'):
            return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)
        try:
            member = TeamMember.objects.get(team=team, user_id=user_id)
        except TeamMember.DoesNotExist:
            return Response({'detail': 'Member not found.'}, status=status.HTTP_404_NOT_FOUND)
        if member.role == 'owner':
            return Response({'detail': 'Cannot remove the team owner.'}, status=status.HTTP_400_BAD_REQUEST)
        username = member.user.username
        member.delete()
        _log(team, request.user, 'member_removed', 'user', str(user_id), username)
        return Response({'detail': f'{username} removed from team.'})

    @action(detail=True, methods=['patch'], url_path=r'members/(?P<user_id>\d+)/role')
    def member_role(self, request, pk=None, user_id=None):
        try:
            team = Team.objects.get(team_id=pk)
        except Team.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not _require_role(team, request.user, 'owner', 'admin'):
            return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)
        ser = ChangeRoleSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            member = TeamMember.objects.get(team=team, user_id=user_id)
        except TeamMember.DoesNotExist:
            return Response({'detail': 'Member not found.'}, status=status.HTTP_404_NOT_FOUND)
        if member.role == 'owner':
            return Response({'detail': 'Cannot change the owner role.'}, status=status.HTTP_400_BAD_REQUEST)
        old_role = member.role
        member.role = ser.validated_data['role']
        member.save()
        _log(team, request.user, 'role_changed', 'user', str(user_id), member.user.username,
             old_role=old_role, new_role=member.role)
        return Response(TeamMemberSerializer(member).data)

    # ── Permissions ───────────────────────────────────────────────────────────

    @action(detail=True, methods=['get'], url_path='permissions')
    def permissions_list(self, request, pk=None):
        try:
            team = Team.objects.get(team_id=pk)
        except Team.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not TeamMember.objects.filter(team=team, user=request.user).exists():
            return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)
        return Response(TeamPermissionSerializer(team.permissions.all(), many=True).data)

    @action(detail=True, methods=['post'], url_path='permissions/update')
    def permissions_update(self, request, pk=None):
        try:
            team = Team.objects.get(team_id=pk)
        except Team.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not _require_role(team, request.user, 'owner', 'admin'):
            return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)
        ser = UpdatePermissionsSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        for key, allowed in ser.validated_data['permissions'].items():
            TeamPermission.objects.update_or_create(
                team=team, permission_key=key,
                defaults={'allowed': allowed},
            )
        _log(team, request.user, 'permissions_updated')
        return Response({'detail': 'Permissions updated.'})

    @action(detail=True, methods=['post'], url_path='permissions/apply-template')
    def permissions_apply_template(self, request, pk=None):
        try:
            team = Team.objects.get(team_id=pk)
        except Team.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not _require_role(team, request.user, 'owner', 'admin'):
            return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)
        template_key = request.data.get('template', team.team_type)
        template = PERMISSION_TEMPLATES.get(template_key, {})
        if not template:
            return Response({'detail': f'No template for "{template_key}".'}, status=status.HTTP_400_BAD_REQUEST)
        for key, allowed in template.items():
            TeamPermission.objects.update_or_create(
                team=team, permission_key=key, defaults={'allowed': allowed}
            )
        _log(team, request.user, 'template_applied', metadata={'template': template_key})
        return Response({'detail': f'Template "{template_key}" applied.', 'permissions': template})

    # ── Resources ─────────────────────────────────────────────────────────────

    @action(detail=True, methods=['get'], url_path='resources')
    def resources_list(self, request, pk=None):
        try:
            team = Team.objects.get(team_id=pk)
        except Team.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not TeamMember.objects.filter(team=team, user=request.user).exists():
            return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)
        return Response(TeamResourceSerializer(team.resources.all(), many=True).data)

    @action(detail=True, methods=['post'], url_path='resources/attach')
    def resource_attach(self, request, pk=None):
        try:
            team = Team.objects.get(team_id=pk)
        except Team.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not _require_role(team, request.user, 'owner', 'admin'):
            return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)
        ser = AttachResourceSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data
        tr, created = TeamResource.objects.get_or_create(
            team=team, resource_type=d['resource_type'], resource_id=d['resource_id'],
            defaults={'resource_name': d.get('resource_name', ''), 'permissions': d.get('permissions', {})},
        )
        if not created:
            return Response({'detail': 'Resource already attached.'}, status=status.HTTP_400_BAD_REQUEST)
        _log(team, request.user, 'resource_attached', d['resource_type'], d['resource_id'], d.get('resource_name', ''))
        return Response(TeamResourceSerializer(tr).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'], url_path=r'resources/(?P<resource_pk>\d+)')
    def resource_detach(self, request, pk=None, resource_pk=None):
        try:
            team = Team.objects.get(team_id=pk)
        except Team.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not _require_role(team, request.user, 'owner', 'admin'):
            return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)
        try:
            tr = TeamResource.objects.get(team=team, pk=resource_pk)
        except TeamResource.DoesNotExist:
            return Response({'detail': 'Resource not found.'}, status=status.HTTP_404_NOT_FOUND)
        _log(team, request.user, 'resource_detached', tr.resource_type, tr.resource_id, tr.resource_name)
        tr.delete()
        return Response({'detail': 'Resource detached.'})

    # ── Portfolios ────────────────────────────────────────────────────────────

    @action(detail=True, methods=['get', 'post'], url_path='portfolios')
    def portfolios(self, request, pk=None):
        try:
            team = Team.objects.get(team_id=pk)
        except Team.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not TeamMember.objects.filter(team=team, user=request.user).exists():
            return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

        if request.method == 'GET':
            return Response(PortfolioSerializer(team.portfolios.prefetch_related('items'), many=True).data)

        if not _require_role(team, request.user, 'owner', 'admin', 'member'):
            return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)
        ser = CreatePortfolioSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        portfolio = Portfolio.objects.create(team=team, **ser.validated_data)
        _log(team, request.user, 'portfolio_created', 'portfolio', portfolio.portfolio_id, portfolio.name)
        return Response(PortfolioSerializer(portfolio).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'], url_path=r'portfolios/(?P<portfolio_id>port-[a-f0-9]+)')
    def portfolio_delete(self, request, pk=None, portfolio_id=None):
        try:
            team = Team.objects.get(team_id=pk)
        except Team.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not _require_role(team, request.user, 'owner', 'admin'):
            return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)
        try:
            portfolio = Portfolio.objects.get(team=team, portfolio_id=portfolio_id)
        except Portfolio.DoesNotExist:
            return Response({'detail': 'Portfolio not found.'}, status=status.HTTP_404_NOT_FOUND)
        name = portfolio.name
        portfolio.delete()
        _log(team, request.user, 'portfolio_deleted', 'portfolio', portfolio_id, name)
        return Response({'detail': f'Portfolio "{name}" deleted.'})

    @action(detail=True, methods=['post'], url_path=r'portfolios/(?P<portfolio_id>port-[a-f0-9]+)/items')
    def portfolio_add_item(self, request, pk=None, portfolio_id=None):
        try:
            team = Team.objects.get(team_id=pk)
        except Team.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not _require_role(team, request.user, 'owner', 'admin', 'member'):
            return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)
        try:
            portfolio = Portfolio.objects.get(team=team, portfolio_id=portfolio_id)
        except Portfolio.DoesNotExist:
            return Response({'detail': 'Portfolio not found.'}, status=status.HTTP_404_NOT_FOUND)
        ser = AddPortfolioItemSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data
        item, created = PortfolioResource.objects.get_or_create(
            portfolio=portfolio, resource_type=d['resource_type'], resource_id=d['resource_id'],
            defaults={'resource_name': d.get('resource_name', '')},
        )
        if not created:
            return Response({'detail': 'Item already in portfolio.'}, status=status.HTTP_400_BAD_REQUEST)
        _log(team, request.user, 'portfolio_item_added', d['resource_type'], d['resource_id'], d.get('resource_name', ''))
        return Response({'detail': 'Item added to portfolio.'}, status=status.HTTP_201_CREATED)

    # ── Activity Log ──────────────────────────────────────────────────────────

    @action(detail=True, methods=['get'], url_path='activity')
    def activity(self, request, pk=None):
        try:
            team = Team.objects.get(team_id=pk)
        except Team.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not TeamMember.objects.filter(team=team, user=request.user).exists():
            return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)
        logs = team.activity_logs.select_related('actor')[:100]
        return Response(TeamActivityLogSerializer(logs, many=True).data)

    # ── Invitations ───────────────────────────────────────────────────────────

    @action(detail=True, methods=['get', 'post'], url_path='invitations')
    def invitations(self, request, pk=None):
        try:
            team = Team.objects.get(team_id=pk)
        except Team.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not TeamMember.objects.filter(team=team, user=request.user).exists():
            return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

        if request.method == 'GET':
            invites = team.invitations.filter(status='pending').select_related('invited_by')
            return Response(TeamInvitationSerializer(invites, many=True).data)

        if not _require_role(team, request.user, 'owner', 'admin'):
            return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)
        ser = CreateInvitationSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        invite = TeamInvitation.objects.create(
            team=team,
            invited_by=request.user,
            email=ser.validated_data['email'],
            role=ser.validated_data['role'],
            expires_at=timezone.now() + timedelta(days=7),
        )
        _log(team, request.user, 'invitation_sent', 'email', '', ser.validated_data['email'])
        return Response(TeamInvitationSerializer(invite).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path=r'invitations/(?P<invite_id>inv-[a-f0-9]+)/revoke')
    def invitation_revoke(self, request, pk=None, invite_id=None):
        try:
            team = Team.objects.get(team_id=pk)
        except Team.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not _require_role(team, request.user, 'owner', 'admin'):
            return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)
        try:
            invite = TeamInvitation.objects.get(team=team, invite_id=invite_id)
        except TeamInvitation.DoesNotExist:
            return Response({'detail': 'Invitation not found.'}, status=status.HTTP_404_NOT_FOUND)
        invite.status = 'declined'
        invite.save()
        return Response({'detail': 'Invitation revoked.'})

    # ── Permission templates catalogue ────────────────────────────────────────

    @action(detail=False, methods=['get'], url_path='permission-templates')
    def permission_templates(self, request):
        return Response({t: dict(p) for t, p in PERMISSION_TEMPLATES.items()})
