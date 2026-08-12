from rest_framework import serializers
from .models import Workspace, WorkspaceBinding, ProvisionedResource, DevWorkspace


class WorkspaceBindingSerializer(serializers.ModelSerializer):
    class Meta:
        model  = WorkspaceBinding
        fields = [
            "id", "workspace", "environment", "cloud_type",
            "openstack_project", "openstack_region",
            "quota_vcpus", "quota_ram_gb", "quota_storage_gb",
        ]
        read_only_fields = ["id"]


class WorkspaceSerializer(serializers.ModelSerializer):
    bindings = WorkspaceBindingSerializer(many=True, read_only=True)

    class Meta:
        model  = Workspace
        fields = [
            "id", "workspace_id", "display_name", "description",
            "owner", "members", "is_active", "created_at", "bindings",
        ]
        read_only_fields = ["id", "created_at"]


class ProvisionedResourceSerializer(serializers.ModelSerializer):
    workspace_id = serializers.CharField(source="workspace.workspace_id", read_only=True)

    class Meta:
        model  = ProvisionedResource
        fields = [
            "id", "workspace_id", "environment",
            "resource_type", "resource_id", "resource_name",
            "openstack_project", "region",
            "status", "metadata",
            "created_by", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "workspace_id", "resource_id",
            "openstack_project", "region",
            "created_by", "created_at", "updated_at",
        ]


class DevWorkspaceSerializer(serializers.ModelSerializer):
    terminal_ws_url = serializers.ReadOnlyField()
    owner = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = DevWorkspace
        fields = [
            'id', 'workspace_id', 'display_name', 'owner',
            'status', 'region', 'image', 'ide', 'editor_url',
            'cpu_percent', 'ram_percent', 'containers', 'volumes',
            'terminal_ws_url', 'started_at', 'created_at', 'updated_at',
            # Provisioning plan
            'vcpus', 'ram_gb', 'gpu_enabled',
            'storage_type', 'storage_gb', 'backup_policy',
            'vpc_name', 'subnet_name', 'firewall_profile', 'public_ip',
            'container_runtime', 'container_template',
            'domain',
            # Setup-wizard connections
            'connected_project_id', 'connected_project_name',
            'connected_env_id', 'connected_env_name',
            'connected_group_id', 'connected_group_name',
            'connected_container_ids',
            'pipeline_last_run', 'pipeline_last_success',
            'pipeline_last_failure', 'pipeline_last_status',
            'setup_metadata',
            # Context-aware architecture fields
            'created_by_role', 'created_from_dashboard',
            'parent_context_id', 'return_path',
        ]
        read_only_fields = [
            'id', 'owner', 'status', 'editor_url',
            'cpu_percent', 'ram_percent', 'containers', 'volumes',
            'terminal_ws_url', 'started_at', 'created_at', 'updated_at',
            'pipeline_last_run', 'pipeline_last_success',
            'pipeline_last_failure',
        ]


class DevWorkspaceCreateSerializer(serializers.ModelSerializer):
    """
    Full creation serializer — used on POST /dev-workspaces/.
    Accepts all provisioning plan fields collected by the Workspace Creation Wizard.
    """

    class Meta:
        model = DevWorkspace
        fields = [
            # Basics
            'workspace_id', 'display_name', 'region', 'image', 'ide',
            # Compute plan
            'vcpus', 'ram_gb', 'gpu_enabled',
            # Storage plan
            'storage_type', 'storage_gb', 'backup_policy',
            # Network plan
            'vpc_name', 'subnet_name', 'firewall_profile', 'public_ip',
            # Container runtime
            'container_runtime', 'container_template',
            # Domain
            'domain',
            # Context-aware architecture fields
            'created_by_role', 'created_from_dashboard',
            'parent_context_id', 'return_path',
        ]


class WorkspaceSetupSerializer(serializers.Serializer):
    """
    Accepts the full unified-setup payload from the wizard.

    Each section is optional — clients only submit what the user filled in.
    """

    # ── Project ──────────────────────────────────────────────────────────────
    project_action        = serializers.ChoiceField(
        choices=['create', 'connect', 'skip'], default='skip')
    project_name          = serializers.CharField(max_length=200,  required=False, allow_blank=True)
    project_description   = serializers.CharField(max_length=2000, required=False, allow_blank=True)
    project_repo_option   = serializers.ChoiceField(
        choices=['empty', 'github', 'gitlab', 'bitbucket'], default='empty', required=False)
    project_repo_url      = serializers.URLField(required=False, allow_blank=True)
    project_auto_cicd     = serializers.BooleanField(default=False, required=False)
    project_id            = serializers.CharField(max_length=64,  required=False, allow_blank=True,
        help_text='ID of an existing project to connect.')
    project_auto_sync     = serializers.BooleanField(default=False, required=False)
    project_auto_pipeline = serializers.BooleanField(default=False, required=False)

    # ── Container ────────────────────────────────────────────────────────────
    container_action       = serializers.ChoiceField(
        choices=['create', 'connect', 'skip'], default='skip')
    container_name         = serializers.CharField(max_length=150, required=False, allow_blank=True)
    container_type         = serializers.ChoiceField(
        choices=['app', 'worker', 'cron', 'api', 'custom'], default='app', required=False)
    container_runtime_size = serializers.ChoiceField(
        choices=['s', 'm', 'l', 'xl'], default='m', required=False)
    container_scaling_mode = serializers.ChoiceField(
        choices=['manual', 'auto'], default='manual', required=False)
    container_attach_project  = serializers.BooleanField(default=False, required=False)
    container_connect_repo    = serializers.BooleanField(default=False, required=False)
    container_connect_pipeline= serializers.BooleanField(default=False, required=False)
    container_id           = serializers.CharField(max_length=64, required=False, allow_blank=True)
    container_attach_env      = serializers.BooleanField(default=False, required=False)

    # ── Environment ──────────────────────────────────────────────────────────
    environment_action     = serializers.ChoiceField(
        choices=['create', 'connect', 'skip'], default='skip')
    environment_name       = serializers.CharField(max_length=200, required=False, allow_blank=True)
    environment_type       = serializers.ChoiceField(
        choices=['dev', 'stage', 'prod'], default='dev', required=False)
    environment_region     = serializers.CharField(max_length=64, required=False, allow_blank=True)
    environment_auto_deploy= serializers.BooleanField(default=False, required=False)
    environment_id         = serializers.CharField(max_length=64, required=False, allow_blank=True)
    environment_sync_vars  = serializers.BooleanField(default=False, required=False)
    environment_sync_secrets = serializers.BooleanField(default=False, required=False)

    # ── Group ────────────────────────────────────────────────────────────────
    group_action           = serializers.ChoiceField(
        choices=['create', 'connect', 'skip'], default='skip')
    group_name             = serializers.CharField(max_length=200, required=False, allow_blank=True)
    group_description      = serializers.CharField(max_length=2000, required=False, allow_blank=True)
    group_members          = serializers.ListField(
        child=serializers.CharField(), required=False, default=list)
    group_id               = serializers.CharField(max_length=64, required=False, allow_blank=True)
    group_role             = serializers.ChoiceField(
        choices=['owner', 'maintainer', 'developer', 'viewer'],
        default='developer', required=False)

    # ── Pipeline ─────────────────────────────────────────────────────────────
    pipeline_id            = serializers.CharField(max_length=64, required=False, allow_blank=True)
    pipeline_auto_trigger  = serializers.BooleanField(default=False, required=False)
