from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    Group, GroupMember, GroupInvitation, GroupAccessToken,
    GroupAuditLog, GroupResourceRegistry, GroupConfigRegistry,
    GroupPipeline, GroupPipelineRun,
)


# ── User summary ──────────────────────────────────────────────────────────────

class UserSummarySerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'display_name']

    def get_display_name(self, obj):
        full = f'{obj.first_name} {obj.last_name}'.strip()
        return full or obj.username


# ── Group ─────────────────────────────────────────────────────────────────────

class GroupSerializer(serializers.ModelSerializer):
    owner = UserSummarySerializer(read_only=True)
    my_role = serializers.SerializerMethodField()

    class Meta:
        model = Group
        fields = [
            'id', 'name', 'handle', 'description',
            'visibility', 'group_type', 'avatar_url',
            'resources',
            'member_count', 'project_count', 'pipeline_count',
            'import_source', 'import_external_id',
            'owner', 'my_role',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'owner', 'member_count', 'project_count', 'pipeline_count', 'created_at', 'updated_at']

    def get_my_role(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        if obj.owner_id == request.user.id:
            return 'owner'
        membership = obj.memberships.filter(user=request.user).first()
        return membership.role if membership else None


class GroupCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = [
            'name', 'handle', 'description',
            'visibility', 'group_type', 'avatar_url',
            'resources',
        ]

    def create(self, validated_data):
        request = self.context['request']
        group = Group.objects.create(owner=request.user, **validated_data)
        # Creator becomes the owner member
        GroupMember.objects.create(
            group=group,
            user=request.user,
            role='owner',
        )
        return group


class GroupUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = [
            'name', 'description', 'visibility',
            'group_type', 'avatar_url', 'resources',
        ]


# ── GroupMember ───────────────────────────────────────────────────────────────

class GroupMemberSerializer(serializers.ModelSerializer):
    user = UserSummarySerializer(read_only=True)
    invited_by = UserSummarySerializer(read_only=True)

    class Meta:
        model = GroupMember
        fields = ['id', 'group', 'user', 'role', 'invited_by', 'created_at']
        read_only_fields = ['id', 'group', 'user', 'created_at']


class GroupMemberUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = GroupMember
        fields = ['role']


# ── GroupInvitation ───────────────────────────────────────────────────────────

class GroupInvitationSerializer(serializers.ModelSerializer):
    invited_by = UserSummarySerializer(read_only=True)

    class Meta:
        model = GroupInvitation
        fields = [
            'id', 'group', 'email', 'role', 'status',
            'invited_by', 'expires_at', 'accepted_at',
            'created_at',
        ]
        read_only_fields = ['id', 'group', 'status', 'invited_by', 'accepted_at', 'created_at']



class GroupInviteCreateSerializer(serializers.Serializer):
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=['admin', 'maintainer', 'developer', 'viewer'])


# ── GroupAccessToken ──────────────────────────────────────────────────────────

class GroupAccessTokenSerializer(serializers.ModelSerializer):
    created_by = UserSummarySerializer(read_only=True)

    class Meta:
        model = GroupAccessToken
        fields = [
            'id', 'name', 'scopes', 'token_prefix',
            'expires_at', 'last_used_at', 'revoked',
            'created_by', 'created_at',
        ]
        read_only_fields = ['id', 'token_prefix', 'last_used_at', 'revoked', 'created_by', 'created_at']


# ── GroupAuditLog ─────────────────────────────────────────────────────────────

class GroupAuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = GroupAuditLog
        fields = ['id', 'actor', 'action', 'target', 'detail', 'created_at']
        read_only_fields = fields


# ── GroupResourceRegistry ─────────────────────────────────────────────────────

class GroupResourceRegistrySerializer(serializers.ModelSerializer):
    class Meta:
        model = GroupResourceRegistry
        fields = [
            'id', 'resource_type', 'resource_id', 'resource_name',
            'resource_slug', 'status', 'region', 'environment',
            'tags', 'metadata', 'discovered_at', 'created_at',
        ]
        read_only_fields = ['id', 'discovered_at', 'created_at']


class GroupResourceRegistryCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = GroupResourceRegistry
        fields = [
            'resource_type', 'resource_id', 'resource_name',
            'resource_slug', 'status', 'region', 'environment',
            'tags', 'metadata',
        ]


# ── GroupConfigRegistry ───────────────────────────────────────────────────────

class GroupConfigRegistrySerializer(serializers.ModelSerializer):
    class Meta:
        model = GroupConfigRegistry
        fields = [
            'id', 'project_id', 'file_type', 'file_name', 'file_path',
            'repo_url', 'branch', 'content_preview', 'sha',
            'last_indexed_at', 'tags', 'created_at',
        ]
        read_only_fields = ['id', 'last_indexed_at', 'created_at']


class GroupConfigRegistryCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = GroupConfigRegistry
        fields = [
            'project_id', 'file_type', 'file_name', 'file_path',
            'repo_url', 'branch', 'content_preview', 'sha', 'tags',
        ]


# ── GroupResourceBundle (read-only aggregate) ─────────────────────────────────

class GroupResourceBundleSerializer(serializers.Serializer):
    """
    Aggregated resources returned by GET /groups/{id}/resources/
    Used by Workspace Dashboard to populate its sidebar from the Group.
    """
    projects = serializers.ListField(child=serializers.DictField(), default=list)
    pipelines = serializers.ListField(child=serializers.DictField(), default=list)
    environments = serializers.ListField(child=serializers.DictField(), default=list)
    containers = serializers.ListField(child=serializers.DictField(), default=list)
    k8s_clusters = serializers.ListField(child=serializers.DictField(), default=list)
    secrets = serializers.ListField(child=serializers.DictField(), default=list)
    env_vars = serializers.ListField(child=serializers.DictField(), default=list)
    deployments = serializers.ListField(child=serializers.DictField(), default=list)
    metric_streams = serializers.ListField(child=serializers.DictField(), default=list)
    log_streams = serializers.ListField(child=serializers.DictField(), default=list)
    api_keys = serializers.ListField(child=serializers.DictField(), default=list)
    config_files = GroupConfigRegistrySerializer(many=True, default=list)
    resource_counts = serializers.DictField(default=dict)


# ── GroupSidebarSerializer ────────────────────────────────────────────────────

class GroupSidebarItemSerializer(serializers.Serializer):
    id = serializers.CharField()
    label = serializers.CharField()
    count = serializers.IntegerField(default=0)
    badge = serializers.CharField(allow_blank=True, default='')
    status = serializers.CharField(allow_blank=True, default='')


class GroupSidebarSerializer(serializers.Serializer):
    group_id = serializers.CharField()
    group_name = serializers.CharField()
    group_handle = serializers.CharField()
    group_type = serializers.CharField()
    sections = GroupSidebarItemSerializer(many=True)


# ── GroupPipeline serializers ────────────────────────────────────────────────────

class GroupPipelineRunSummarySerializer(serializers.ModelSerializer):
    triggered_by = UserSummarySerializer(read_only=True)

    class Meta:
        model = GroupPipelineRun
        fields = [
            'id', 'status', 'trigger_source', 'branch', 'commit_sha',
            'commit_message', 'environment_id', 'environment_name',
            'workspace_id', 'started_at', 'finished_at', 'duration_s',
            'triggered_by', 'created_at',
        ]


class GroupPipelineSerializer(serializers.ModelSerializer):
    created_by = UserSummarySerializer(read_only=True)
    updated_by = UserSummarySerializer(read_only=True)
    last_run = serializers.SerializerMethodField()

    class Meta:
        model = GroupPipeline
        fields = [
            'id', 'name', 'slug', 'description', 'pipeline_type', 'status',
            'project_id', 'project_name', 'environment_targets',
            'definition', 'yaml_content', 'triggers',
            'upstream_pipeline_ids', 'downstream_pipeline_ids',
            'notifications', 'tags',
            'run_count', 'last_run_status', 'last_run_at',
            'avg_duration_s', 'success_rate',
            'created_by', 'updated_by', 'created_at', 'updated_at',
            'last_run',
        ]
        read_only_fields = ['id', 'run_count', 'last_run_status', 'last_run_at',
                            'avg_duration_s', 'success_rate', 'created_at', 'updated_at']

    def get_last_run(self, obj):
        run = obj.runs.order_by('-created_at').first()
        if not run:
            return None
        return GroupPipelineRunSummarySerializer(run).data


class GroupPipelineCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = GroupPipeline
        fields = [
            'name', 'slug', 'description', 'pipeline_type', 'status',
            'project_id', 'project_name', 'environment_targets',
            'definition', 'yaml_content', 'triggers',
            'upstream_pipeline_ids', 'downstream_pipeline_ids',
            'notifications', 'tags',
        ]


class GroupPipelineUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = GroupPipeline
        fields = [
            'name', 'description', 'pipeline_type', 'status',
            'project_id', 'project_name', 'environment_targets',
            'definition', 'yaml_content', 'triggers',
            'upstream_pipeline_ids', 'downstream_pipeline_ids',
            'notifications', 'tags',
        ]


class GroupPipelineRunSerializer(serializers.ModelSerializer):
    triggered_by = UserSummarySerializer(read_only=True)
    pipeline_name = serializers.CharField(source='pipeline.name', read_only=True)
    pipeline_slug = serializers.CharField(source='pipeline.slug', read_only=True)

    class Meta:
        model = GroupPipelineRun
        fields = [
            'id', 'pipeline', 'pipeline_name', 'pipeline_slug',
            'status', 'trigger_source', 'triggered_by',
            'branch', 'commit_sha', 'commit_message',
            'environment_id', 'environment_name', 'workspace_id',
            'parameters', 'started_at', 'finished_at', 'duration_s',
            'stages_snapshot', 'artifacts', 'log_url', 'metrics',
            'rolled_back_from', 'created_at',
        ]
        read_only_fields = ['id', 'pipeline', 'triggered_by', 'started_at',
                            'finished_at', 'duration_s', 'created_at']


class GroupPipelineRunCreateSerializer(serializers.Serializer):
    """Controls what a caller may supply when triggering a run."""
    branch          = serializers.CharField(required=False, default='')
    commit_sha      = serializers.CharField(required=False, default='')
    commit_message  = serializers.CharField(required=False, default='')
    environment_id  = serializers.CharField(required=False, default='')
    environment_name = serializers.CharField(required=False, default='')
    workspace_id    = serializers.CharField(required=False, default='')
    parameters      = serializers.DictField(required=False, default=dict)
    trigger_source  = serializers.ChoiceField(
        choices=['user', 'webhook', 'schedule', 'api', 'upstream'],
        default='user',
    )
