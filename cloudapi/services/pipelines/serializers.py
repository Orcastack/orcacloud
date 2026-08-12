from rest_framework import serializers
from .models import (
    Project,
    Repository,
    SSHKey,
    PipelineFile,
    Pipeline,
    PipelineJob,
    JobLog,
    PipelineApproval,
    PipelineRule,
    Environment,
    EnvironmentDeployment,
    EnvironmentService,
    EnvironmentVariable,
    EnvironmentFeatureFlag,
    EnvironmentAuditEntry,
    EnvironmentRelease,
    EnvironmentFile,
    PipelineArtifact,
    PipelineDefinition,
    PipelineDefinitionStage,
    PipelineDefinitionStep,
    PipelineRun,
    PipelineRunNode,
    PipelineRunArtifact,
)


class ProjectSerializer(serializers.ModelSerializer):
    """Serializer for Project model."""
    owner_username   = serializers.CharField(source='owner.username', read_only=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    repo_count       = serializers.SerializerMethodField()
    pipeline_count   = serializers.SerializerMethodField()
    has_repo         = serializers.SerializerMethodField()

    def get_repo_count(self, obj):
        return obj.repositories.count()

    def get_pipeline_count(self, obj):
        return PipelineDefinition.objects.filter(project=obj).count()

    def get_has_repo(self, obj):
        return obj.repositories.exists()

    class Meta:
        model = Project
        fields = [
            'id', 'owner', 'owner_username',
            'created_by', 'created_by_username',
            'context', 'workspace_id', 'workspace_name',
            'group_id', 'group_name',
            'name', 'project_key', 'namespace', 'description',
            'visibility', 'avatar_color', 'last_activity',
            'repo_count', 'pipeline_count', 'has_repo',
            # Context-aware architecture fields
            'created_by_role', 'parent_context_id', 'return_path',
            'created_at', 'updated_at',
        ]
        read_only_fields = (
            'owner', 'owner_username', 'namespace',
            'created_by', 'created_by_username',
            'repo_count', 'pipeline_count', 'has_repo',
            'created_at', 'updated_at',
        )
        extra_kwargs = {
            'id': {'required': False, 'allow_blank': True},
        }


class RepositorySerializer(serializers.ModelSerializer):
    """Serializer for Repository model."""
    project_name    = serializers.CharField(source='project.name', read_only=True, default=None)
    owner_username       = serializers.CharField(source='owner.username', read_only=True, default=None)
    created_by_username  = serializers.CharField(source='created_by.username', read_only=True, default=None)
    clone_https_url      = serializers.SerializerMethodField()
    clone_ssh_url   = serializers.SerializerMethodField()

    def get_clone_https_url(self, obj):
        return obj.clone_https_url

    def get_clone_ssh_url(self, obj):
        return obj.clone_ssh_url

    class Meta:
        model = Repository
        fields = [
            'id', 'project', 'project_name', 'owner', 'owner_username',
            'created_by', 'created_by_username',
            'provider', 'repo_name', 'repo_description', 'default_branch',
            'visibility', 'is_bare', 'disk_path', 'storage_bucket',
            'clone_https_url', 'clone_ssh_url',
            'workspace_id', 'workspace_name', 'group_id', 'group_name',
            'tree_data', 'created_at', 'updated_at',
        ]
        extra_kwargs = {
            'id':         {'required': False},
            'owner':      {'required': False},
            'created_by': {'required': False},
        }


class SSHKeySerializer(serializers.ModelSerializer):
    """Serializer for SSH public keys."""

    class Meta:
        model = SSHKey
        fields = ['id', 'title', 'public_key', 'fingerprint', 'last_used', 'created_at', 'updated_at']
        extra_kwargs = {
            'id':          {'required': False},
            'fingerprint': {'read_only': True},
            'last_used':   {'read_only': True},
        }


class PipelineFileSerializer(serializers.ModelSerializer):
    """Serializer for PipelineFile model."""
    # FK is named `repo`, not `repository`
    repo_name = serializers.CharField(source='repo.repo_name', read_only=True)
    project_name = serializers.CharField(source='repo.project.name', read_only=True)

    class Meta:
        model = PipelineFile
        fields = '__all__'


class PipelineSerializer(serializers.ModelSerializer):
    """Serializer for Pipeline model.

    Note: pipeline_file and triggered_by are CharFields on the model
    (path string and username string respectively), *not* FK relations.
    """

    class Meta:
        model = Pipeline
        fields = '__all__'


class PipelineJobSerializer(serializers.ModelSerializer):
    """Serializer for PipelineJob model."""
    pipeline_name = serializers.CharField(source='pipeline.pipeline_name', read_only=True)

    class Meta:
        model = PipelineJob
        fields = '__all__'


class JobLogSerializer(serializers.ModelSerializer):
    """Serializer for JobLog model."""
    job_name = serializers.CharField(source='job.name', read_only=True)

    class Meta:
        model = JobLog
        fields = '__all__'


class PipelineApprovalSerializer(serializers.ModelSerializer):
    """Serializer for PipelineApproval model.

    approved_by is a CharField (username string), not a User FK.
    """
    pipeline_name = serializers.CharField(source='pipeline.pipeline_name', read_only=True)

    class Meta:
        model = PipelineApproval
        fields = '__all__'


class PipelineRuleSerializer(serializers.ModelSerializer):
    """Serializer for PipelineRule model."""
    project_name = serializers.CharField(source='project.name', read_only=True)

    class Meta:
        model = PipelineRule
        fields = '__all__'


class EnvironmentSerializer(serializers.ModelSerializer):
    """Serializer for Environment model."""
    owner_username = serializers.CharField(source='owner.username', read_only=True, default=None)
    has_active_processes = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Environment
        fields = [
            'id', 'name', 'region', 'description',
            'is_protected', 'auto_deploy', 'deployment_strategy',
            'require_approval', 'notify_email',
            'owner', 'owner_username', 'has_active_processes',
            'project', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'owner_username', 'has_active_processes', 'created_at', 'updated_at']

    def get_has_active_processes(self, obj):
        """Return True if there are running/pending pipelines that target this project."""
        return Pipeline.objects.filter(
            project=obj.project,
            status__in=['pending', 'running'],
        ).exists()

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['owner'] = request.user
        return super().create(validated_data)


class EnvironmentDeploymentSerializer(serializers.ModelSerializer):
    pipeline_id = serializers.CharField(source='pipeline_run_id', read_only=True, allow_null=True)

    class Meta:
        model  = EnvironmentDeployment
        fields = ['id', 'version', 'status', 'triggered_by',
                  'started_at', 'finished_at', 'notes', 'pipeline_id']
        read_only_fields = ['id', 'started_at']


class EnvironmentServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model  = EnvironmentService
        fields = ['id', 'name', 'status', 'replicas', 'desired',
                  'image', 'cpu_pct', 'ram_mb', 'endpoints', 'last_log']
        read_only_fields = ['id']


class EnvironmentVariableSerializer(serializers.ModelSerializer):
    class Meta:
        model  = EnvironmentVariable
        fields = ['key', 'value', 'secret', 'updated_at']
        read_only_fields = ['updated_at']


class EnvironmentFeatureFlagSerializer(serializers.ModelSerializer):
    class Meta:
        model  = EnvironmentFeatureFlag
        fields = ['key', 'enabled', 'note']


class EnvironmentAuditEntrySerializer(serializers.ModelSerializer):
    timestamp = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model  = EnvironmentAuditEntry
        fields = ['id', 'action', 'actor', 'resource', 'timestamp', 'result']
        read_only_fields = ['id', 'timestamp']


class EnvironmentReleaseSerializer(serializers.ModelSerializer):
    class Meta:
        model  = EnvironmentRelease
        fields = ['version', 'deployed_at', 'deployed_by', 'notes', 'active']
        read_only_fields = ['deployed_at']


class EnvironmentFileSerializer(serializers.ModelSerializer):
    class Meta:
        model  = EnvironmentFile
        fields = [
            'id', 'file_name', 'file_path', 'file_type',
            'associated_service', 'is_valid', 'has_errors', 'error_message',
            'is_env_specific', 'last_modified', 'discovered_at',
        ]
        read_only_fields = ['id', 'discovered_at']


class PipelineArtifactSerializer(serializers.ModelSerializer):
    """Serializer for PipelineArtifact model."""
    job_name = serializers.CharField(source='job.name', read_only=True)
    pipeline_name = serializers.CharField(source='job.pipeline.pipeline_name', read_only=True)

    class Meta:
        model = PipelineArtifact
        fields = '__all__'


class PipelineRunSerializer(serializers.Serializer):
    """Serializer for pipeline run request."""
    pipeline_file = serializers.PrimaryKeyRelatedField(
        queryset=PipelineFile.objects.all()
    )
    branch = serializers.CharField(max_length=255)
    environment = serializers.PrimaryKeyRelatedField(
        queryset=Environment.objects.all(),
        required=False,
        allow_null=True,
    )
    parameters = serializers.JSONField(required=False)


# ────────────────────────────────────────────────────────────────────────────
#  Pipeline Definition System serializers
# ────────────────────────────────────────────────────────────────────────────

class PipelineDefinitionStepSerializer(serializers.ModelSerializer):
    class Meta:
        model  = PipelineDefinitionStep
        fields = ['id', 'name', 'type', 'script', 'config_json', 'order',
                  'condition', 'timeout_seconds', 'retry_count']


class PipelineDefinitionStageSerializer(serializers.ModelSerializer):
    steps = PipelineDefinitionStepSerializer(many=True, read_only=True)

    class Meta:
        model  = PipelineDefinitionStage
        fields = ['id', 'definition', 'name', 'type', 'order', 'environment',
                  'parallel', 'condition', 'steps']
        read_only_fields = ['definition']


class PipelineDefinitionSerializer(serializers.ModelSerializer):
    stages       = PipelineDefinitionStageSerializer(many=True, read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    created_by_username = serializers.CharField(
        source='created_by.username', read_only=True, default=None)
    last_run_status = serializers.SerializerMethodField()
    total_runs      = serializers.SerializerMethodField()

    class Meta:
        model  = PipelineDefinition
        fields = ['id', 'project', 'project_name', 'name', 'description',
                  'yaml_definition', 'variables', 'triggers', 'is_active',
                  'created_by', 'created_by_username', 'created_at', 'updated_at',
                  'stages', 'last_run_status', 'total_runs']
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def get_last_run_status(self, obj):
        run = obj.runs.order_by('-created_at').first()
        return run.status if run else None

    def get_total_runs(self, obj):
        return obj.runs.count()


class PipelineRunNodeSerializer(serializers.ModelSerializer):
    class Meta:
        model  = PipelineRunNode
        fields = ['id', 'node_type', 'stage_name', 'step_name', 'status',
                  'order', 'started_at', 'finished_at', 'duration_s',
                  'log_output', 'error_msg', 'artifacts']


class PipelineRunArtifactSerializer(serializers.ModelSerializer):
    class Meta:
        model  = PipelineRunArtifact
        fields = ['id', 'run', 'node', 'name', 'artifact_type',
                  'storage_url', 'size_bytes', 'metadata', 'created_at']


class PipelineRunDetailSerializer(serializers.ModelSerializer):
    nodes           = PipelineRunNodeSerializer(many=True, read_only=True)
    run_artifacts   = PipelineRunArtifactSerializer(many=True, read_only=True)
    definition_name = serializers.CharField(source='definition.name', read_only=True)
    project_name    = serializers.CharField(source='definition.project.name', read_only=True)
    repo_name       = serializers.SerializerMethodField()

    def get_repo_name(self, obj):
        return obj.repo.repo_name if obj.repo else None

    class Meta:
        model  = PipelineRun
        fields = ['id', 'definition', 'definition_name', 'project_name',
                  'repo', 'repo_name',
                  'status', 'triggered_by', 'branch', 'commit_sha', 'commit_msg',
                  'variables', 'started_at', 'finished_at', 'duration_s',
                  'created_at', 'updated_at', 'nodes', 'run_artifacts']


class PipelineRunListSerializer(serializers.ModelSerializer):
    """Lighter serializer used in list views (no nested nodes)."""
    definition_name = serializers.CharField(source='definition.name', read_only=True)
    project_name    = serializers.CharField(source='definition.project.name', read_only=True)
    repo_name       = serializers.SerializerMethodField()

    def get_repo_name(self, obj):
        return obj.repo.repo_name if obj.repo else None

    class Meta:
        model  = PipelineRun
        fields = ['id', 'definition', 'definition_name', 'project_name',
                  'repo', 'repo_name',
                  'status', 'triggered_by', 'branch', 'commit_sha',
                  'started_at', 'finished_at', 'duration_s',
                  'created_at', 'updated_at']


class TriggerPipelineRunSerializer(serializers.Serializer):
    """Payload for POST /pipeline-definitions/{id}/trigger/"""
    branch     = serializers.CharField(max_length=200, default='main')
    commit_sha = serializers.CharField(max_length=64, required=False, allow_blank=True)
    commit_msg = serializers.CharField(max_length=300, required=False, allow_blank=True)
    variables  = serializers.JSONField(required=False, default=dict)
    repo       = serializers.CharField(max_length=50, required=False, allow_blank=True, allow_null=True, default=None)
