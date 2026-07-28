# OrcaCloud — Team System Serializers

from django.contrib.auth.models import User
from rest_framework import serializers
from .models import (
    Team, TeamMember, TeamPermission, TeamResource,
    Portfolio, PortfolioResource, TeamActivityLog, TeamInvitation,
    PERMISSION_TEMPLATES,
)


# ── User summary ─────────────────────────────────────────────────────────────

class UserSummarySerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'full_name']

    def get_full_name(self, obj):
        name = f'{obj.first_name} {obj.last_name}'.strip()
        return name or obj.username


# ── Team Member ───────────────────────────────────────────────────────────────

class TeamMemberSerializer(serializers.ModelSerializer):
    user = UserSummarySerializer(read_only=True)
    user_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = TeamMember
        fields = ['id', 'user', 'user_id', 'role', 'joined_at']
        read_only_fields = ['id', 'joined_at']


class AddMemberSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    role = serializers.ChoiceField(choices=['admin', 'member', 'viewer'], default='member')


class ChangeRoleSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=['admin', 'member', 'viewer'])


# ── Team Permission ───────────────────────────────────────────────────────────

class TeamPermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeamPermission
        fields = ['id', 'permission_key', 'allowed']


class UpdatePermissionsSerializer(serializers.Serializer):
    permissions = serializers.DictField(child=serializers.BooleanField())


# ── Team Resource ─────────────────────────────────────────────────────────────

class TeamResourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeamResource
        fields = ['id', 'resource_type', 'resource_id', 'resource_name', 'permissions', 'created_at']
        read_only_fields = ['id', 'created_at']


class AttachResourceSerializer(serializers.Serializer):
    resource_type = serializers.CharField(max_length=60)
    resource_id   = serializers.CharField(max_length=64)
    resource_name = serializers.CharField(max_length=255, required=False, default='')
    permissions   = serializers.DictField(child=serializers.BooleanField(), required=False, default=dict)


# ── Portfolio ─────────────────────────────────────────────────────────────────

class PortfolioResourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = PortfolioResource
        fields = ['id', 'resource_type', 'resource_id', 'resource_name', 'created_at']
        read_only_fields = ['id', 'created_at']


class PortfolioSerializer(serializers.ModelSerializer):
    items = PortfolioResourceSerializer(many=True, read_only=True)
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = Portfolio
        fields = ['portfolio_id', 'name', 'portfolio_type', 'description', 'item_count', 'items', 'created_at', 'updated_at']
        read_only_fields = ['portfolio_id', 'created_at', 'updated_at']

    def get_item_count(self, obj):
        return obj.items.count()


class CreatePortfolioSerializer(serializers.Serializer):
    name           = serializers.CharField(max_length=255)
    portfolio_type = serializers.ChoiceField(choices=['developer', 'marketing', 'data', 'general'], default='general')
    description    = serializers.CharField(required=False, default='')


class AddPortfolioItemSerializer(serializers.Serializer):
    resource_type = serializers.CharField(max_length=60)
    resource_id   = serializers.CharField(max_length=64)
    resource_name = serializers.CharField(max_length=255, required=False, default='')


# ── Activity Log ─────────────────────────────────────────────────────────────

class TeamActivityLogSerializer(serializers.ModelSerializer):
    actor = UserSummarySerializer(read_only=True)

    class Meta:
        model = TeamActivityLog
        fields = ['id', 'actor', 'action', 'target_type', 'target_id', 'target_name', 'metadata', 'timestamp']
        read_only_fields = fields


# ── Invitation ────────────────────────────────────────────────────────────────

class TeamInvitationSerializer(serializers.ModelSerializer):
    invited_by = UserSummarySerializer(read_only=True)

    class Meta:
        model = TeamInvitation
        fields = ['invite_id', 'email', 'role', 'status', 'invited_by', 'expires_at', 'created_at']
        read_only_fields = ['invite_id', 'status', 'invited_by', 'created_at']


class CreateInvitationSerializer(serializers.Serializer):
    email = serializers.EmailField()
    role  = serializers.ChoiceField(choices=['admin', 'member', 'viewer'], default='member')


# ── Team ──────────────────────────────────────────────────────────────────────

class TeamListSerializer(serializers.ModelSerializer):
    owner       = UserSummarySerializer(read_only=True)
    member_count= serializers.SerializerMethodField()
    my_role     = serializers.SerializerMethodField()

    class Meta:
        model = Team
        fields = [
            'team_id', 'name', 'team_type', 'description',
            'avatar_color', 'status', 'member_count', 'my_role',
            'owner', 'created_at',
        ]

    def get_member_count(self, obj):
        return obj.members.count()

    def get_my_role(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        member = obj.members.filter(user=request.user).first()
        return member.role if member else None


class TeamDetailSerializer(serializers.ModelSerializer):
    owner       = UserSummarySerializer(read_only=True)
    members     = TeamMemberSerializer(many=True, read_only=True)
    permissions = TeamPermissionSerializer(many=True, read_only=True)
    portfolios  = PortfolioSerializer(many=True, read_only=True)
    resources   = TeamResourceSerializer(many=True, read_only=True)
    my_role     = serializers.SerializerMethodField()

    class Meta:
        model = Team
        fields = [
            'team_id', 'name', 'team_type', 'description',
            'avatar_color', 'status', 'owner', 'members',
            'permissions', 'portfolios', 'resources', 'my_role',
            'created_at', 'updated_at',
        ]

    def get_my_role(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        member = obj.members.filter(user=request.user).first()
        return member.role if member else None


class CreateTeamSerializer(serializers.Serializer):
    name        = serializers.CharField(max_length=255)
    team_type   = serializers.ChoiceField(choices=['developer', 'production', 'marketing', 'data', 'custom'])
    description = serializers.CharField(required=False, default='')
    avatar_color= serializers.CharField(max_length=7, required=False, default='#00E0FF')
    members = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        default=list,
    )
    apply_template = serializers.BooleanField(default=True)


class UpdateTeamSerializer(serializers.Serializer):
    name        = serializers.CharField(max_length=255, required=False)
    description = serializers.CharField(required=False)
    avatar_color= serializers.CharField(max_length=7, required=False)
    status      = serializers.ChoiceField(choices=['active', 'archived'], required=False)
