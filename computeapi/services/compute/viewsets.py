# OrcaCloud Compute Service - ViewSets

import hashlib
import uuid

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from .models import (
    Flavor, Image, Instance, InstanceMetric,
    KubernetesCluster, KubernetesNode,
    ServerlessFunction, ServerlessFunctionTrigger,
    AutoScalingGroup, ScalingPolicy
)
from .serializers import (
    FlavorSerializer, ImageSerializer,
    InstanceListSerializer, InstanceDetailSerializer, InstanceCreateSerializer, InstanceUpdateSerializer,
    InstanceMetricSerializer,
    KubernetesClusterListSerializer, KubernetesClusterDetailSerializer, KubernetesClusterCreateSerializer,
    KubernetesNodeSerializer,
    ServerlessFunctionListSerializer, ServerlessFunctionDetailSerializer,
    ServerlessFunctionCreateSerializer, ServerlessFunctionUpdateSerializer,
    ServerlessFunctionTriggerSerializer,
    AutoScalingGroupListSerializer, AutoScalingGroupDetailSerializer,
    AutoScalingGroupCreateSerializer, AutoScalingGroupUpdateSerializer,
    ScalingPolicySerializer
)
from ..core.tenant import TenantScopedViewSetMixin
from infrastructure.openstack.compute import (
    provision_kubernetes_cluster,
    deploy_kubernetes_manifest,
    deploy_serverless_function,
    invoke_serverless_function,
)


# ============================================================================
# FLAVOR VIEWSET
# ============================================================================

class FlavorViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Viewset for VM flavors (instance types).
    Provides listing and detail views for available instance types.
    """
    queryset = Flavor.objects.filter(is_active=True).order_by('vcpus', 'memory_mb')
    serializer_class = FlavorSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_gpu', 'is_active']
    search_fields = ['name', 'flavor_id']
    ordering_fields = ['vcpus', 'memory_mb', 'hourly_cost_usd']

    @action(detail=False, methods=['get'])
    def gpu_flavors(self, request):
        """Get GPU-enabled flavors."""
        flavors = self.queryset.filter(is_gpu=True)
        serializer = self.get_serializer(flavors, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_vcpus(self, request):
        """Filter flavors by vCPU count."""
        vcpus = request.query_params.get('vcpus')
        if vcpus:
            flavors = self.queryset.filter(vcpus=int(vcpus))
            serializer = self.get_serializer(flavors, many=True)
            return Response(serializer.data)
        return Response({'error': 'vcpus parameter required'}, status=status.HTTP_400_BAD_REQUEST)


# ============================================================================
# IMAGE VIEWSET
# ============================================================================

class ImageViewSet(TenantScopedViewSetMixin, viewsets.ModelViewSet):
    """
    Viewset for VM images/templates.
    Full CRUD operations for managing OS images and custom AMIs.
    """
    serializer_class = ImageSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['os_type', 'is_public', 'is_active']
    search_fields = ['name', 'os_name', 'image_id']
    ordering_fields = ['created_at', 'size_gb', 'name']
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter images by owner or public images."""
        user = self.request.user
        return Image.objects.filter(is_public=True) | self.filter_queryset_by_tenant(Image.objects.filter(owner=user))

    @action(detail=False, methods=['get'])
    def public(self, request):
        """Get all public images."""
        images = Image.objects.filter(is_public=True)
        serializer = self.get_serializer(images, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def my_images(self, request):
        """Get user's private images."""
        images = Image.objects.filter(owner=request.user)
        serializer = self.get_serializer(images, many=True)
        return Response(serializer.data)


# ============================================================================
# INSTANCE VIEWSET
# ============================================================================

class InstanceViewSet(TenantScopedViewSetMixin, viewsets.ModelViewSet):
    """
    Viewset for VM instances.
    Full CRUD operations for creating, managing, and monitoring VM instances.
    """
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['owner', 'status', 'flavor', 'availability_zone']
    search_fields = ['instance_id', 'name', 'private_ip', 'public_ip']
    ordering_fields = ['created_at', 'name', 'status']
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter instances by owner."""
        return self.filter_queryset_by_tenant(Instance.objects.all())

    def get_serializer_class(self):
        """Use different serializers for different actions."""
        if self.action == 'retrieve':
            return InstanceDetailSerializer
        elif self.action == 'create':
            return InstanceCreateSerializer
        elif self.action == 'update' or self.action == 'partial_update':
            return InstanceUpdateSerializer
        return InstanceListSerializer

    def perform_create(self, serializer):
        """Set owner to current user."""
        serializer.save(**self.build_tenant_create_kwargs(Instance))

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        """Start a stopped instance."""
        instance = self.get_object()
        if instance.status == 'stopped':
            instance.status = 'running'
            instance.save()
            return Response({'status': 'Instance started'})
        return Response({'error': 'Instance must be stopped'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def stop(self, request, pk=None):
        """Stop a running instance."""
        instance = self.get_object()
        if instance.status == 'running':
            instance.status = 'stopped'
            instance.save()
            return Response({'status': 'Instance stopped'})
        return Response({'error': 'Instance must be running'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def terminate(self, request, pk=None):
        """Terminate an instance."""
        instance = self.get_object()
        if instance.enable_termination_protection:
            return Response({'error': 'Instance is protected from termination'},
                          status=status.HTTP_400_BAD_REQUEST)
        instance.status = 'terminated'
        instance.save()
        return Response({'status': 'Instance terminated'})

    @action(detail=True, methods=['get'])
    def metrics(self, request, pk=None):
        """Get instance metrics."""
        instance = self.get_object()
        metrics = instance.metrics.all()[:100]  # Last 100 metrics
        serializer = InstanceMetricSerializer(metrics, many=True)
        return Response(serializer.data)


# ============================================================================
# KUBERNETES CLUSTER VIEWSET
# ============================================================================

class KubernetesClusterViewSet(TenantScopedViewSetMixin, viewsets.ModelViewSet):
    """
    Viewset for Kubernetes clusters.
    Full CRUD operations for managing Kubernetes clusters.
    """
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    lookup_field = 'resource_id'
    lookup_url_kwarg = 'pk'
    filterset_fields = ['owner', 'status', 'region']
    search_fields = ['cluster_id', 'name']
    ordering_fields = ['created_at', 'name', 'status']
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter clusters by owner."""
        return self.filter_queryset_by_tenant(KubernetesCluster.objects.all())

    def get_serializer_class(self):
        """Use different serializers for different actions."""
        if self.action == 'retrieve':
            return KubernetesClusterDetailSerializer
        elif self.action == 'create':
            return KubernetesClusterCreateSerializer
        return KubernetesClusterListSerializer

    def perform_create(self, serializer):
        """Create cluster, provision backing resources, and bootstrap nodes."""
        cluster = serializer.save(
            **self.build_tenant_create_kwargs(KubernetesCluster),
            cluster_id=f"k8s-{uuid.uuid4().hex[:10]}",
            status='provisioning',
        )

        provision_result = provision_kubernetes_cluster(
            cluster_name=cluster.name,
            node_count=cluster.node_count,
            region=cluster.region,
            kubernetes_version=cluster.kubernetes_version,
        )

        cluster.api_endpoint = provision_result.get('api_endpoint', '')
        cluster.kubeconfig = provision_result.get('kubeconfig', '')
        cluster.status = 'running'
        cluster.metadata = {
            **(cluster.metadata or {}),
            'provider': provision_result.get('provider', 'simulated'),
        }
        cluster.save()

        KubernetesNode.objects.filter(cluster=cluster).delete()
        for node in provision_result.get('nodes', []):
            KubernetesNode.objects.create(
                cluster=cluster,
                node_name=node['node_name'],
                instance_id=node['instance_id'],
                status=node.get('status', 'ready'),
                cpu_allocatable=node.get('cpu_allocatable', 4),
                memory_allocatable_mb=node.get('memory_allocatable_mb', 8192),
                pods_allocatable=node.get('pods_allocatable', 110),
                kubernetes_version=cluster.kubernetes_version,
            )

    @action(detail=True, methods=['get'])
    def nodes(self, request, pk=None):
        """Get cluster nodes."""
        cluster = self.get_object()
        nodes = cluster.nodes.all()
        serializer = KubernetesNodeSerializer(nodes, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def scale(self, request, pk=None):
        """Scale cluster node count."""
        cluster = self.get_object()
        desired_count = request.data.get('desired_count')
        if desired_count is None:
            return Response({'error': 'desired_count required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            desired_count = int(desired_count)
        except (ValueError, TypeError):
            return Response({'error': 'desired_count must be an integer'}, status=status.HTTP_400_BAD_REQUEST)

        if desired_count < cluster.min_nodes or desired_count > cluster.max_nodes:
            return Response(
                {'error': f'desired_count must be between {cluster.min_nodes} and {cluster.max_nodes}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        current_count = cluster.nodes.count()
        if desired_count > current_count:
            for index in range(current_count, desired_count):
                KubernetesNode.objects.create(
                    cluster=cluster,
                    node_name=f"{cluster.name}-node-{index + 1}",
                    instance_id=f"scale-{uuid.uuid4().hex[:8]}",
                    status='ready',
                    cpu_allocatable=4,
                    memory_allocatable_mb=8192,
                    pods_allocatable=110,
                    kubernetes_version=cluster.kubernetes_version,
                )
        elif desired_count < current_count:
            nodes_to_remove = cluster.nodes.order_by('-created_at')[: (current_count - desired_count)]
            nodes_to_remove.delete()

        cluster.node_count = desired_count
        cluster.save()
        return Response({'status': f'Cluster scaling to {desired_count} nodes'})

    @action(detail=True, methods=['get'])
    def kubeconfig(self, request, pk=None):
        """Get base64 kubeconfig and API endpoint for this cluster."""
        cluster = self.get_object()
        return Response({
            'cluster_id': cluster.cluster_id,
            'api_endpoint': cluster.api_endpoint,
            'kubeconfig': cluster.kubeconfig,
        })

    @action(detail=True, methods=['post'])
    def deploy_yaml(self, request, pk=None):
        """Submit raw Kubernetes YAML manifest to cluster deployment pipeline."""
        cluster = self.get_object()
        manifest_yaml = request.data.get('manifest_yaml', '')
        if not manifest_yaml.strip():
            return Response({'error': 'manifest_yaml is required'}, status=status.HTTP_400_BAD_REQUEST)

        deploy_result = deploy_kubernetes_manifest(
            cluster_name=cluster.name,
            manifest_yaml=manifest_yaml,
        )
        return Response(deploy_result)

    @action(detail=True, methods=['get'])
    def metrics(self, request, pk=None):
        """Return summary metrics for the cluster dashboard."""
        cluster = self.get_object()
        node_count = cluster.nodes.count()
        return Response({
            'cpu_percent': min(95, 35 + node_count * 7),
            'memory_percent': min(95, 42 + node_count * 6),
            'pod_health_percent': 100 if node_count else 0,
            'node_count': node_count,
            'running_nodes': cluster.nodes.filter(status='ready').count(),
        })


# ============================================================================
# SERVERLESS FUNCTION VIEWSET
# ============================================================================

class ServerlessFunctionViewSet(viewsets.ModelViewSet):
    """
    Viewset for serverless functions (FaaS).
    Full CRUD operations for managing serverless functions.
    """
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    lookup_field = 'resource_id'
    lookup_url_kwarg = 'pk'
    filterset_fields = ['owner', 'runtime', 'status']
    search_fields = ['function_id', 'name', 'handler']
    ordering_fields = ['created_at', 'name', 'invocation_count', 'last_invoked_at']
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter functions by owner."""
        return ServerlessFunction.objects.filter(owner=self.request.user)

    def get_serializer_class(self):
        """Use different serializers for different actions."""
        if self.action == 'retrieve':
            return ServerlessFunctionDetailSerializer
        elif self.action == 'create':
            return ServerlessFunctionCreateSerializer
        elif self.action == 'update' or self.action == 'partial_update':
            return ServerlessFunctionUpdateSerializer
        return ServerlessFunctionListSerializer

    def perform_create(self, serializer):
        """Create serverless function and deploy runtime artifact."""
        function = serializer.save(
            owner=self.request.user,
            function_id=f"fn-{uuid.uuid4().hex[:10]}",
            status='provisioning',
            code_sha256=hashlib.sha256((serializer.validated_data.get('code_uri') or '').encode('utf-8')).hexdigest(),
        )

        deployment = deploy_serverless_function(
            function_name=function.name,
            runtime=function.runtime,
            code_uri=function.code_uri,
        )
        function.status = 'running'
        function.metadata = {
            **(function.metadata or {}),
            'endpoint': deployment.get('endpoint'),
            'provider': deployment.get('provider', 'knative-simulated'),
        }
        function.last_update_status = deployment.get('status', 'active')
        function.save()

    @action(detail=True, methods=['post'])
    def invoke(self, request, pk=None):
        """Invoke a serverless function."""
        function = self.get_object()
        payload = request.data.get('payload', {})
        endpoint = (function.metadata or {}).get('endpoint', f"https://functions.orcacloud.cloud/{function.name}")
        result = invoke_serverless_function(endpoint=endpoint, payload=payload)

        function.invocation_count += 1
        function.last_invoked_at = timezone.now()
        function.save()
        return Response({'status': 'Function invoked', 'invocation_count': function.invocation_count, 'result': result})

    @action(detail=True, methods=['get'])
    def logs(self, request, pk=None):
        """Return function execution logs stream."""
        function = self.get_object()
        return Response({
            'function_id': function.function_id,
            'entries': [
                {
                    'timestamp': timezone.now().isoformat(),
                    'level': 'INFO',
                    'message': f"Function {function.name} ready on runtime {function.runtime}",
                },
                {
                    'timestamp': timezone.now().isoformat(),
                    'level': 'INFO',
                    'message': f"Total invocations: {function.invocation_count}",
                },
            ],
        })

    @action(detail=True, methods=['get'])
    def metrics(self, request, pk=None):
        """Return function metrics for dashboard charts."""
        function = self.get_object()
        return Response({
            'invocations': function.invocation_count,
            'error_rate_percent': 0.2 if function.invocation_count else 0,
            'avg_duration_ms': min(1200, 120 + function.memory_mb // 2),
            'p95_duration_ms': min(2000, 180 + function.memory_mb),
        })

    @action(detail=True, methods=['get'])
    def triggers(self, request, pk=None):
        """Get function triggers."""
        function = self.get_object()
        triggers = function.triggers.all()
        serializer = ServerlessFunctionTriggerSerializer(triggers, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_trigger(self, request, pk=None):
        """Add a trigger to function."""
        function = self.get_object()
        serializer = ServerlessFunctionTriggerSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(function=function)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ============================================================================
# AUTO-SCALING GROUP VIEWSET
# ============================================================================

class AutoScalingGroupViewSet(viewsets.ModelViewSet):
    """
    Viewset for auto-scaling groups.
    Full CRUD operations for managing auto-scaling groups and policies.
    """
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['owner', 'health_check_type']
    search_fields = ['asg_id', 'name']
    ordering_fields = ['created_at', 'name', 'desired_capacity']
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter ASGs by owner."""
        return AutoScalingGroup.objects.filter(owner=self.request.user)

    def get_serializer_class(self):
        """Use different serializers for different actions."""
        if self.action == 'retrieve':
            return AutoScalingGroupDetailSerializer
        elif self.action == 'create':
            return AutoScalingGroupCreateSerializer
        elif self.action == 'update' or self.action == 'partial_update':
            return AutoScalingGroupUpdateSerializer
        return AutoScalingGroupListSerializer

    def perform_create(self, serializer):
        """Set owner to current user."""
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=['post'])
    def update_capacity(self, request, pk=None):
        """Update desired capacity."""
        asg = self.get_object()
        desired_capacity = request.data.get('desired_capacity')
        if desired_capacity is None:
            return Response({'error': 'desired_capacity required'}, status=status.HTTP_400_BAD_REQUEST)
        if not (asg.min_size <= desired_capacity <= asg.max_size):
            return Response({'error': f'Must be between {asg.min_size} and {asg.max_size}'},
                          status=status.HTTP_400_BAD_REQUEST)
        asg.desired_capacity = desired_capacity
        asg.save()
        return Response({'status': f'Capacity updated to {desired_capacity}'})

    @action(detail=True, methods=['get'])
    def policies(self, request, pk=None):
        """Get scaling policies."""
        asg = self.get_object()
        policies = asg.policies.all()
        serializer = ScalingPolicySerializer(policies, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_policy(self, request, pk=None):
        """Add scaling policy."""
        asg = self.get_object()
        serializer = ScalingPolicySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(asg=asg)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
