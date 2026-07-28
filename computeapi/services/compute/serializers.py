# OrcaCloud Compute Service - Serializers

from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    Flavor, Image, Instance, InstanceMetric,
    KubernetesCluster, KubernetesNode,
    ServerlessFunction, ServerlessFunctionTrigger,
    AutoScalingGroup, ScalingPolicy
)


# ============================================================================
# FLAVOR SERIALIZERS
# ============================================================================

class FlavorSerializer(serializers.ModelSerializer):
    """Serializer for VM flavors/instance types."""
    class Meta:
        model = Flavor
        fields = [
            'flavor_id', 'name', 'vcpus', 'memory_mb', 'disk_gb',
            'network_bandwidth_gbps', 'gpu_count', 'gpu_type',
            'hourly_cost_usd', 'is_active', 'is_gpu', 'created_at'
        ]
        read_only_fields = ['flavor_id', 'created_at']


# ============================================================================
# IMAGE SERIALIZERS
# ============================================================================

class ImageSerializer(serializers.ModelSerializer):
    """Serializer for VM images."""
    owner_username = serializers.CharField(source='owner.username', read_only=True)

    class Meta:
        model = Image
        fields = [
            'image_id', 'name', 'description', 'os_type', 'os_name', 'os_version',
            'size_gb', 'is_public', 'owner', 'owner_username', 'created_at', 'is_active'
        ]
        read_only_fields = ['image_id', 'created_at']


# ============================================================================
# INSTANCE SERIALIZERS
# ============================================================================

class InstanceMetricSerializer(serializers.ModelSerializer):
    """Serializer for instance metrics."""
    class Meta:
        model = InstanceMetric
        fields = [
            'instance', 'cpu_usage_percent', 'memory_usage_percent',
            'disk_usage_percent', 'network_in_bytes', 'network_out_bytes',
            'io_read_bytes', 'io_write_bytes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class InstanceListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for instance lists."""
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    flavor_name = serializers.CharField(source='flavor.name', read_only=True)
    image_name = serializers.CharField(source='image.name', read_only=True)

    class Meta:
        model = Instance
        fields = [
            'resource_id', 'instance_id', 'name', 'status', 'flavor_name',
            'image_name', 'private_ip', 'public_ip', 'owner_username',
            'created_at', 'is_running'
        ]
        read_only_fields = [
            'resource_id', 'instance_id', 'created_at', 'is_running'
        ]


class InstanceDetailSerializer(serializers.ModelSerializer):
    """Full serializer for instance details."""
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    flavor_details = FlavorSerializer(source='flavor', read_only=True)
    image_details = ImageSerializer(source='image', read_only=True)
    metrics = InstanceMetricSerializer(many=True, read_only=True)

    class Meta:
        model = Instance
        fields = [
            'resource_id', 'instance_id', 'name', 'description', 'status',
            'flavor', 'flavor_details', 'image', 'image_details',
            'vpc_id', 'subnet_id', 'private_ip', 'public_ip',
            'security_groups', 'key_pair', 'public_key',
            'root_volume_size_gb', 'attached_volumes', 'user_data',
            'enable_monitoring', 'enable_termination_protection',
            'launch_time', 'stop_time', 'termination_time',
            'owner', 'owner_username', 'tags', 'metadata',
            'created_at', 'updated_at', 'metrics'
        ]
        read_only_fields = [
            'resource_id', 'instance_id', 'status', 'launch_time',
            'stop_time', 'termination_time', 'created_at', 'updated_at'
        ]


class InstanceCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating instances."""
    class Meta:
        model = Instance
        fields = [
            'name', 'description', 'flavor', 'image', 'vpc_id', 'subnet_id',
            'security_groups', 'key_pair', 'root_volume_size_gb',
            'user_data', 'enable_monitoring', 'enable_termination_protection',
            'tags', 'metadata'
        ]


class InstanceUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating instances."""
    class Meta:
        model = Instance
        fields = [
            'name', 'description', 'security_groups',
            'enable_monitoring', 'enable_termination_protection', 'tags', 'metadata'
        ]


# ============================================================================
# KUBERNETES SERIALIZERS
# ============================================================================

class KubernetesNodeSerializer(serializers.ModelSerializer):
    """Serializer for Kubernetes nodes."""
    cluster_name = serializers.CharField(source='cluster.name', read_only=True)

    class Meta:
        model = KubernetesNode
        fields = [
            'node_name', 'instance_id', 'status', 'cpu_allocatable',
            'memory_allocatable_mb', 'pods_allocatable', 'kubernetes_version',
            'cluster', 'cluster_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class KubernetesClusterListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for Kubernetes cluster lists."""
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    node_count_actual = serializers.SerializerMethodField()

    class Meta:
        model = KubernetesCluster
        fields = [
            'resource_id', 'cluster_id', 'name', 'status', 'kubernetes_version',
            'node_count', 'node_count_actual', 'owner_username', 'created_at'
        ]
        read_only_fields = ['resource_id', 'cluster_id', 'created_at']

    def get_node_count_actual(self, obj):
        return obj.nodes.count()


class KubernetesClusterDetailSerializer(serializers.ModelSerializer):
    """Full Kubernetes cluster details."""
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    nodes = KubernetesNodeSerializer(many=True, read_only=True)

    class Meta:
        model = KubernetesCluster
        fields = [
            'resource_id', 'cluster_id', 'name', 'description', 'status',
            'kubernetes_version', 'node_count', 'node_flavor',
            'vpc_id', 'cluster_ip_range', 'service_ip_range',
            'auto_scaling_enabled', 'min_nodes', 'max_nodes',
            'rbac_enabled', 'network_policy_enabled', 'enabled_addons',
            'api_endpoint', 'region', 'owner', 'owner_username',
            'tags', 'metadata', 'created_at', 'updated_at', 'nodes'
        ]
        read_only_fields = [
            'resource_id', 'cluster_id', 'status', 'api_endpoint',
            'kubeconfig', 'created_at', 'updated_at'
        ]


class KubernetesClusterCreateSerializer(serializers.ModelSerializer):
    """Create Kubernetes cluster."""
    class Meta:
        model = KubernetesCluster
        fields = [
            'name', 'description', 'kubernetes_version', 'node_count',
            'node_flavor', 'vpc_id', 'cluster_ip_range', 'service_ip_range',
            'auto_scaling_enabled', 'min_nodes', 'max_nodes',
            'rbac_enabled', 'network_policy_enabled', 'enabled_addons',
            'region', 'tags', 'metadata'
        ]


# ============================================================================
# SERVERLESS FUNCTION SERIALIZERS
# ============================================================================

class ServerlessFunctionTriggerSerializer(serializers.ModelSerializer):
    """Serializer for function triggers."""
    class Meta:
        model = ServerlessFunctionTrigger
        fields = [
            'trigger_id', 'function', 'trigger_type', 'config',
            'is_enabled', 'created_at', 'updated_at'
        ]
        read_only_fields = ['trigger_id', 'function', 'created_at', 'updated_at']


class ServerlessFunctionListSerializer(serializers.ModelSerializer):
    """Lightweight serverless function serializer."""
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    trigger_count = serializers.SerializerMethodField()

    class Meta:
        model = ServerlessFunction
        fields = [
            'resource_id', 'function_id', 'name', 'runtime', 'status',
            'memory_mb', 'timeout_seconds', 'invocation_count',
            'last_invoked_at', 'owner_username', 'trigger_count', 'created_at'
        ]
        read_only_fields = ['resource_id', 'function_id', 'created_at']

    def get_trigger_count(self, obj):
        return obj.triggers.count()


class ServerlessFunctionDetailSerializer(serializers.ModelSerializer):
    """Full serverless function details."""
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    triggers = ServerlessFunctionTriggerSerializer(many=True, read_only=True)

    class Meta:
        model = ServerlessFunction
        fields = [
            'resource_id', 'function_id', 'name', 'description', 'runtime',
            'handler', 'code_sha256', 'timeout_seconds', 'memory_mb',
            'environment_variables', 'vpc_config', 'code_uri',
            'code_repository', 'code_branch', 'invocation_count',
            'last_invoked_at', 'status', 'last_update_status',
            'owner', 'owner_username', 'tags', 'metadata',
            'created_at', 'updated_at', 'triggers'
        ]
        read_only_fields = [
            'resource_id', 'function_id', 'code_sha256', 'invocation_count',
            'last_invoked_at', 'status', 'last_update_status',
            'created_at', 'updated_at'
        ]


class ServerlessFunctionCreateSerializer(serializers.ModelSerializer):
    """Create serverless function."""
    class Meta:
        model = ServerlessFunction
        fields = [
            'name', 'description', 'runtime', 'handler',
            'timeout_seconds', 'memory_mb', 'environment_variables',
            'vpc_config', 'code_uri', 'code_repository', 'code_branch',
            'tags', 'metadata'
        ]


class ServerlessFunctionUpdateSerializer(serializers.ModelSerializer):
    """Update serverless function."""
    class Meta:
        model = ServerlessFunction
        fields = [
            'name', 'description', 'handler', 'timeout_seconds',
            'memory_mb', 'environment_variables', 'vpc_config',
            'tags', 'metadata'
        ]


# ============================================================================
# AUTO-SCALING SERIALIZERS
# ============================================================================

class ScalingPolicySerializer(serializers.ModelSerializer):
    """Serializer for scaling policies."""
    asg_name = serializers.CharField(source='asg.name', read_only=True)

    class Meta:
        model = ScalingPolicy
        fields = [
            'policy_id', 'asg', 'asg_name', 'policy_type', 'metric_name',
            'target_value', 'adjustment_type', 'adjustment_value',
            'cooldown_seconds', 'is_enabled', 'created_at', 'updated_at'
        ]
        read_only_fields = ['policy_id', 'created_at', 'updated_at']


class AutoScalingGroupListSerializer(serializers.ModelSerializer):
    """Lightweight auto-scaling group serializer."""
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    policy_count = serializers.SerializerMethodField()

    class Meta:
        model = AutoScalingGroup
        fields = [
            'resource_id', 'asg_id', 'name', 'min_size', 'max_size',
            'desired_capacity', 'instance_count', 'owner_username',
            'policy_count', 'created_at'
        ]
        read_only_fields = ['resource_id', 'asg_id', 'instance_count', 'created_at']

    def get_policy_count(self, obj):
        return obj.policies.count()


class AutoScalingGroupDetailSerializer(serializers.ModelSerializer):
    """Full auto-scaling group details."""
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    policies = ScalingPolicySerializer(many=True, read_only=True)

    class Meta:
        model = AutoScalingGroup
        fields = [
            'resource_id', 'asg_id', 'name', 'description',
            'min_size', 'max_size', 'desired_capacity', 'instance_count',
            'launch_template_id', 'health_check_type',
            'health_check_grace_period', 'current_instances',
            'scaling_policies', 'owner', 'owner_username',
            'tags', 'metadata', 'created_at', 'updated_at', 'policies'
        ]
        read_only_fields = [
            'resource_id', 'asg_id', 'instance_count',
            'created_at', 'updated_at'
        ]


class AutoScalingGroupCreateSerializer(serializers.ModelSerializer):
    """Create auto-scaling group."""
    class Meta:
        model = AutoScalingGroup
        fields = [
            'name', 'description', 'min_size', 'max_size',
            'desired_capacity', 'launch_template_id', 'health_check_type',
            'health_check_grace_period', 'tags', 'metadata'
        ]


class AutoScalingGroupUpdateSerializer(serializers.ModelSerializer):
    """Update auto-scaling group."""
    class Meta:
        model = AutoScalingGroup
        fields = [
            'name', 'description', 'min_size', 'max_size',
            'desired_capacity', 'health_check_type',
            'health_check_grace_period', 'tags', 'metadata'
        ]
