# OrcaCloud – Container Registry Serializers

from rest_framework import serializers
from .models import (
    ContainerRepository, ContainerImage, RegistryToken,
    ReplicationRule, RegistryUsage, REGION_CHOICES,
)


class ContainerImageSerializer(serializers.ModelSerializer):
    pull_command = serializers.SerializerMethodField()

    class Meta:
        model  = ContainerImage
        fields = [
            'id', 'tag', 'digest', 'size_mb', 'architecture', 'os',
            'pushed_by', 'scan_status', 'vulnerability_count',
            'layer_count', 'created_at', 'pull_command',
        ]

    def get_pull_command(self, obj):
        return f"docker pull {obj.repository.full_name}:{obj.tag}"


class RegistryTokenSerializer(serializers.ModelSerializer):
    token_masked = serializers.SerializerMethodField()
    repository_name = serializers.SerializerMethodField()

    class Meta:
        model  = RegistryToken
        fields = [
            'id', 'name', 'token_masked', 'scope', 'repository',
            'repository_name', 'expires_at', 'is_active',
            'last_used_at', 'created_at',
        ]

    def get_token_masked(self, obj):
        # Show token only in create/rotate context (set via serializer context)
        if self.context.get('show_token'):
            return obj.token
        return obj.token[:8] + '••••••••••••••••••••••••••••••' + obj.token[-4:]

    def get_repository_name(self, obj):
        return str(obj.repository) if obj.repository else None


class ReplicationRuleSerializer(serializers.ModelSerializer):
    source_region_display = serializers.SerializerMethodField()
    target_region_display = serializers.SerializerMethodField()

    class Meta:
        model  = ReplicationRule
        fields = [
            'id', 'source_region', 'source_region_display',
            'target_region', 'target_region_display',
            'mode', 'is_active', 'last_triggered', 'created_at',
        ]

    def get_source_region_display(self, obj):
        return dict(REGION_CHOICES).get(obj.source_region, obj.source_region)

    def get_target_region_display(self, obj):
        return dict(REGION_CHOICES).get(obj.target_region, obj.target_region)


class RegistryUsageSerializer(serializers.ModelSerializer):
    class Meta:
        model  = RegistryUsage
        fields = ['storage_gb', 'pull_count', 'push_count', 'transfer_gb', 'hourly_cost_usd', 'created_at']


# ── Repository ────────────────────────────────────────────────────────────────
class ContainerRepositoryListSerializer(serializers.ModelSerializer):
    full_name     = serializers.ReadOnlyField()
    region_display = serializers.ReadOnlyField()

    class Meta:
        model  = ContainerRepository
        fields = [
            'id', 'name', 'description', 'visibility', 'region', 'region_display',
            'status', 'image_count', 'storage_mb', 'pull_count', 'push_count',
            'last_pushed_at', 'created_at', 'full_name',
        ]


class ContainerRepositoryDetailSerializer(serializers.ModelSerializer):
    full_name          = serializers.ReadOnlyField()
    region_display     = serializers.ReadOnlyField()
    images             = ContainerImageSerializer(many=True, read_only=True)
    tokens             = serializers.SerializerMethodField()
    replication_rules  = ReplicationRuleSerializer(many=True, read_only=True)
    latest_usage       = serializers.SerializerMethodField()
    push_command       = serializers.SerializerMethodField()
    pull_command       = serializers.SerializerMethodField()
    login_command      = serializers.SerializerMethodField()

    class Meta:
        model  = ContainerRepository
        fields = [
            'id', 'name', 'description', 'visibility', 'region', 'region_display',
            'status', 'image_count', 'storage_mb', 'pull_count', 'push_count',
            'last_pushed_at', 'created_at', 'updated_at',
            'full_name', 'push_command', 'pull_command', 'login_command',
            'images', 'tokens', 'replication_rules', 'latest_usage',
        ]

    def get_tokens(self, obj):
        return RegistryTokenSerializer(
            obj.tokens.filter(is_active=True)[:10], many=True, context=self.context
        ).data

    def get_latest_usage(self, obj):
        rec = obj.usage_records.first()
        return RegistryUsageSerializer(rec).data if rec else None

    def get_push_command(self, obj):
        return (
            f"docker tag <image> {obj.full_name}:latest\n"
            f"docker push {obj.full_name}:latest"
        )

    def get_pull_command(self, obj):
        return f"docker pull {obj.full_name}:latest"

    def get_login_command(self, obj):
        return (
            "docker login registry.orcacloud.com \\\n"
            "  --username <your-username> \\\n"
            "  --password <your-token>"
        )


class CreateRepositorySerializer(serializers.Serializer):
    name        = serializers.RegexField(
        r'^[a-z0-9][a-z0-9\-]{1,126}$',
        error_messages={'invalid': 'Name must be 2–128 chars: lowercase letters, numbers, hyphens.'}
    )
    description = serializers.CharField(required=False, allow_blank=True, max_length=500)
    visibility  = serializers.ChoiceField(choices=['private', 'public'], default='private')
    region      = serializers.ChoiceField(
        choices=[r[0] for r in REGION_CHOICES], default='us-east-1'
    )

    def validate_name(self, value):
        request = self.context.get('request')
        if request and ContainerRepository.objects.filter(owner=request.user, name=value).exists():
            raise serializers.ValidationError('A repository with this name already exists.')
        return value


class CreateTokenSerializer(serializers.Serializer):
    name          = serializers.CharField(max_length=128)
    scope         = serializers.ChoiceField(choices=['pull', 'push', 'admin'], default='pull')
    repository_id = serializers.UUIDField(required=False, allow_null=True)
    expires_days  = serializers.IntegerField(required=False, min_value=1, max_value=365)
