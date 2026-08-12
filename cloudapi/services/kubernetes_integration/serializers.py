from rest_framework import serializers
from .models import KubeConfig, KubeSyncRun


# ─────────────────────────────────────────────────────────────────────────────
# Sync Run
# ─────────────────────────────────────────────────────────────────────────────

class KubeSyncRunSerializer(serializers.ModelSerializer):
    duration_seconds = serializers.SerializerMethodField()

    class Meta:
        model  = KubeSyncRun
        fields = [
            'id', 'run_type', 'triggered_by',
            'commit_sha', 'branch',
            'files_selected', 'files_applied', 'resources_created',
            'governance_issues',
            'status', 'logs', 'error',
            'started_at', 'finished_at', 'duration_seconds',
        ]
        read_only_fields = fields

    def get_duration_seconds(self, obj):
        if obj.finished_at and obj.started_at:
            return (obj.finished_at - obj.started_at).seconds
        return None


# ─────────────────────────────────────────────────────────────────────────────
# KubeConfig
# ─────────────────────────────────────────────────────────────────────────────

class KubeConfigSerializer(serializers.ModelSerializer):
    owner_username  = serializers.CharField(source='owner.username', read_only=True)
    sync_runs       = KubeSyncRunSerializer(many=True, read_only=True)
    derived_namespace = serializers.SerializerMethodField()

    class Meta:
        model  = KubeConfig
        fields = [
            'id', 'owner_username',
            'project_id', 'project_name', 'environment',
            'cluster_id', 'cluster_name', 'namespace', 'derived_namespace',
            'git_provider', 'git_repo', 'git_branch', 'git_path',
            'last_commit', 'last_sync_status', 'last_synced_at',
            'auto_apply', 'governance_warnings',
            'sync_runs',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'owner_username', 'last_commit', 'last_sync_status',
                            'last_synced_at', 'governance_warnings', 'created_at', 'updated_at']

    def get_derived_namespace(self, obj):
        return obj.derive_namespace()


class KubeConfigCreateSerializer(serializers.ModelSerializer):
    """Write serializer — used for POST/PATCH."""

    class Meta:
        model  = KubeConfig
        fields = [
            'project_id', 'project_name', 'environment',
            'cluster_id', 'cluster_name',
            'git_provider', 'git_repo', 'git_branch', 'git_path',
            'auto_apply',
        ]


# ─────────────────────────────────────────────────────────────────────────────
# Scan result (transient — not a model)
# ─────────────────────────────────────────────────────────────────────────────

class ManifestFileSerializer(serializers.Serializer):
    path      = serializers.CharField()
    resources = serializers.ListField(child=serializers.DictField())
    warnings  = serializers.ListField(child=serializers.CharField())


class ScanResultSerializer(serializers.Serializer):
    commit_sha   = serializers.CharField()
    branch       = serializers.CharField()
    files        = ManifestFileSerializer(many=True)
    total_files  = serializers.IntegerField()
    summary      = serializers.DictField()   # {Deployment: 3, Service: 2, …}
    all_warnings = serializers.ListField(child=serializers.CharField())
