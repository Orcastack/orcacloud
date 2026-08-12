from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Container, ContainerDeployment
from .serializers import ContainerSerializer, ContainerCreateSerializer, ContainerDeploymentSerializer


class ContainerViewSet(viewsets.ModelViewSet):
    """
    CRUD + lifecycle actions for user containers.

    Routes registered:
        GET    /api/containers/             list
        POST   /api/containers/             create
        GET    /api/containers/{id}/        retrieve
        PATCH  /api/containers/{id}/        partial_update
        DELETE /api/containers/{id}/        destroy
        POST   /api/containers/{id}/deploy/ trigger a deployment
        POST   /api/containers/{id}/stop/   stop the container
        GET    /api/containers/{id}/logs/   stream (mocked) logs
        GET    /api/containers/{id}/metrics/ resource metrics snapshot
        GET    /api/containers/{id}/deployments/ deployment history
    """

    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Container.objects.filter(owner=self.request.user).select_related('owner').prefetch_related('deployments')
        # Optional query params for filtering
        container_type = self.request.query_params.get('type')
        status_filter  = self.request.query_params.get('status')
        project_id     = self.request.query_params.get('project_id')
        if container_type:
            qs = qs.filter(container_type=container_type)
        if status_filter:
            qs = qs.filter(status=status_filter)
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return ContainerCreateSerializer
        return ContainerSerializer

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user, status='stopped')

    # ── Lifecycle actions ──────────────────────────────────────────────────

    @action(detail=True, methods=['post'])
    def deploy(self, request, pk=None):
        """Trigger a new deployment for this container."""
        container = self.get_object()
        image_tag  = request.data.get('image_tag', container.image_tag)
        commit_sha = request.data.get('commit_sha', container.commit_sha)

        deployment = ContainerDeployment.objects.create(
            container  = container,
            trigger    = request.data.get('trigger', 'manual'),
            commit_sha = commit_sha,
            image_tag  = image_tag,
            status     = 'pending',
        )

        # Update container status
        container.status        = 'deploying'
        container.image_tag     = image_tag
        container.commit_sha    = commit_sha
        container.last_deployed = timezone.now()
        container.save(update_fields=['status', 'image_tag', 'commit_sha', 'last_deployed', 'updated_at'])

        return Response(
            ContainerDeploymentSerializer(deployment).data,
            status=status.HTTP_202_ACCEPTED,
        )

    @action(detail=True, methods=['post'])
    def stop(self, request, pk=None):
        """Stop a running / deploying container."""
        container = self.get_object()
        container.status = 'stopped'
        container.save(update_fields=['status', 'updated_at'])
        return Response({'status': 'stopped'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    def logs(self, request, pk=None):
        """Return recent log lines (real logs would be streamed from a log store)."""
        container = self.get_object()
        # In production this would query a log aggregator (Loki, CloudWatch, etc.)
        mock_lines = [
            f"[{timezone.now().isoformat()}] INFO  Container {container.name} log stream started",
            f"[{timezone.now().isoformat()}] INFO  Image: {container.image}:{container.image_tag}",
            f"[{timezone.now().isoformat()}] INFO  Replicas: {container.replicas}",
            f"[{timezone.now().isoformat()}] INFO  Status: {container.status}",
        ]
        return Response({'lines': mock_lines})

    @action(detail=True, methods=['get'])
    def metrics(self, request, pk=None):
        """Return a resource metrics snapshot."""
        import random
        container = self.get_object()
        return Response({
            'container_id': container.id,
            'cpu_percent':  round(random.uniform(10, 85), 1),
            'memory_mib':   random.randint(100, container.memory),
            'memory_total': container.memory,
            'replicas':     container.replicas,
            'requests_per_second': round(random.uniform(0, 500), 1),
            'error_rate':   round(random.uniform(0, 5), 2),
            'p99_latency_ms': round(random.uniform(5, 300), 1),
        })

    @action(detail=True, methods=['get'])
    def deployments(self, request, pk=None):
        """Return deployment history for this container."""
        container = self.get_object()
        qs = container.deployments.order_by('-created_at')[:20]
        return Response(ContainerDeploymentSerializer(qs, many=True).data)
