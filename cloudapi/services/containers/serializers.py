from rest_framework import serializers
from .models import Container, ContainerDeployment


class ContainerDeploymentSerializer(serializers.ModelSerializer):
    class Meta:
        model  = ContainerDeployment
        fields = [
            'id', 'trigger', 'commit_sha', 'image_tag',
            'status', 'logs', 'started_at', 'ended_at', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class ContainerSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    deployments    = ContainerDeploymentSerializer(many=True, read_only=True)

    class Meta:
        model  = Container
        fields = [
            'id', 'owner_username',
            'name', 'description', 'container_type',
            'project_id', 'project_name', 'pipeline',
            'image', 'image_tag', 'commit_sha',
            'cpu', 'memory', 'replicas',
            'autoscaling', 'autoscale_min', 'autoscale_max', 'autoscale_cpu',
            'expose', 'port', 'domain',
            'status', 'last_deployed',
            'env_vars', 'labels', 'runtime_meta',
            'deployments',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'owner_username', 'last_deployed', 'created_at', 'updated_at']


class ContainerCreateSerializer(serializers.ModelSerializer):
    """Write serializer — strips read-only computed fields."""

    class Meta:
        model  = Container
        fields = [
            'name', 'description', 'container_type',
            'project_id', 'project_name', 'pipeline',
            'image', 'image_tag', 'commit_sha',
            'cpu', 'memory', 'replicas',
            'autoscaling', 'autoscale_min', 'autoscale_max', 'autoscale_cpu',
            'expose', 'port', 'domain',
            'env_vars', 'labels',
        ]
