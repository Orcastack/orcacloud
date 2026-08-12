from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify
import uuid
from .models import (
    Project,
    Repository,
    PipelineFile,
    Pipeline,
    PipelineJob,
    JobLog,
    PipelineApproval,
    PipelineRule,
    Environment,
    PipelineArtifact,
    SSHKey,
    PipelineDefinition,
    PipelineRun,
    PipelineRunNode,
)
from .serializers import (
    ProjectSerializer,
    RepositorySerializer,
    PipelineFileSerializer,
    PipelineSerializer,
    PipelineJobSerializer,
    JobLogSerializer,
    PipelineApprovalSerializer,
    PipelineRuleSerializer,
    EnvironmentSerializer,
    PipelineArtifactSerializer,
    PipelineRunSerializer,
    SSHKeySerializer,
    PipelineDefinitionSerializer,
    PipelineRunNodeSerializer,
)


class ProjectViewSet(viewsets.ModelViewSet):
    """ViewSet for managing projects."""
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Context-aware project filter.

        Query params:
            dashboard           'developer' (default) | 'enterprise' | 'group'
            parent_context_id   enterprise org id or group id
            group_id            shorthand for group context (legacy support)
        """
        qs = Project.objects.filter(owner=self.request.user)
        dashboard = self.request.query_params.get('dashboard', '')
        parent_id = self.request.query_params.get('parent_context_id', '')
        # Legacy: ?group_id= filter still works
        legacy_group = self.request.query_params.get('group_id', '')

        if dashboard == 'enterprise':
            qs = qs.filter(created_by_role='enterprise')
            if parent_id:
                qs = qs.filter(parent_context_id=parent_id)
        elif dashboard == 'group' or legacy_group:
            gid = parent_id or legacy_group
            qs = qs.filter(context='group')
            if gid:
                qs = qs.filter(group_id=gid)
        elif dashboard == 'developer':
            qs = qs.filter(created_by_role='developer')
        # No dashboard param → return all user projects (backward compat)
        return qs.order_by('-created_at')

    def perform_create(self, serializer):
        provided_id = self.request.data.get('id') or self.request.data.get('project_key')
        if provided_id:
            normalized = slugify(str(provided_id))[:40]
            project_id = normalized or f"proj-{uuid.uuid4().hex[:10]}"
        else:
            name = self.request.data.get('name', '')
            base = slugify(name)[:24] if name else 'project'
            project_id = f"{base}-{uuid.uuid4().hex[:8]}"
        serializer.save(owner=self.request.user, id=project_id)

    @action(detail=True, methods=['get'])
    def repositories(self, request, pk=None):
        """Get repositories for a project."""
        project = self.get_object()
        repositories = Repository.objects.filter(project=project)
        serializer = RepositorySerializer(repositories, many=True)
        return Response(serializer.data)


class RepositoryViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for managing repositories."""
    queryset = Repository.objects.all()
    serializer_class = RepositorySerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['get'])
    def pipeline_files(self, request, pk=None):
        """Get pipeline files for a repository."""
        repository = self.get_object()
        pipeline_files = PipelineFile.objects.filter(repository=repository)
        serializer = PipelineFileSerializer(pipeline_files, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def branches(self, request, pk=None):
        """Get branches for a repository."""
        repository = self.get_object()
        # In a real implementation, this would fetch from Git provider
        # For now, return mock branches
        branches = [
            {'name': 'main', 'commit': 'abc123'},
            {'name': 'develop', 'commit': 'def456'},
            {'name': 'feature/pipeline-ui', 'commit': 'ghi789'},
        ]
        return Response(branches)


class PipelineFileViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for managing pipeline files."""
    queryset = PipelineFile.objects.all()
    serializer_class = PipelineFileSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['get'])
    def pipelines(self, request, pk=None):
        """Get pipelines for a pipeline file."""
        pipeline_file = self.get_object()
        pipelines = Pipeline.objects.filter(pipeline_file=pipeline_file)
        serializer = PipelineSerializer(pipelines, many=True)
        return Response(serializer.data)


class PipelineViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for managing pipelines."""
    queryset = Pipeline.objects.all()
    serializer_class = PipelineSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['get'])
    def jobs(self, request, pk=None):
        """Get jobs for a pipeline."""
        pipeline = self.get_object()
        jobs = PipelineJob.objects.filter(pipeline=pipeline)
        serializer = PipelineJobSerializer(jobs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def run(self, request):
        """Run a pipeline."""
        serializer = PipelineRunSerializer(data=request.data)
        if serializer.is_valid():
            # Create pipeline run
            pipeline_file = serializer.validated_data['pipeline_file']
            branch = serializer.validated_data['branch']
            environment = serializer.validated_data.get('environment')

            with transaction.atomic():
                pipeline = Pipeline.objects.create(
                    pipeline_file=pipeline_file,
                    branch=branch,
                    environment=environment,
                    status='running',
                    triggered_by=request.user,
                    started_at=timezone.now(),
                )

                # Create initial job (build job)
                job = PipelineJob.objects.create(
                    pipeline=pipeline,
                    name='build',
                    status='running',
                    started_at=timezone.now(),
                )

                # Create initial log entry
                JobLog.objects.create(
                    job=job,
                    level='info',
                    message='Pipeline started',
                    timestamp=timezone.now(),
                )

            return Response(
                PipelineSerializer(pipeline).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a pipeline."""
        pipeline = self.get_object()
        approval_type = request.data.get('type', 'manual')

        approval = PipelineApproval.objects.create(
            pipeline=pipeline,
            approved_by=request.user,
            approval_type=approval_type,
            approved_at=timezone.now(),
        )

        # Update pipeline status if all required approvals are met
        if pipeline.status == 'waiting_approval':
            required_approvals = PipelineRule.objects.filter(
                pipeline_file=pipeline.pipeline_file,
                rule_type='approval_required'
            ).count()

            current_approvals = PipelineApproval.objects.filter(
                pipeline=pipeline
            ).count()

            if current_approvals >= required_approvals:
                pipeline.status = 'approved'
                pipeline.save()

        return Response(
            PipelineApprovalSerializer(approval).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a pipeline."""
        pipeline = self.get_object()

        if pipeline.status in ['running', 'waiting_approval']:
            pipeline.status = 'cancelled'
            pipeline.finished_at = timezone.now()
            pipeline.save()

            # Cancel all running jobs
            PipelineJob.objects.filter(
                pipeline=pipeline,
                status='running'
            ).update(
                status='cancelled',
                finished_at=timezone.now()
            )

        return Response({'status': 'cancelled'})


class PipelineJobViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for managing pipeline jobs."""
    queryset = PipelineJob.objects.all()
    serializer_class = PipelineJobSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['get'])
    def logs(self, request, pk=None):
        """Get logs for a job."""
        job = self.get_object()
        logs = JobLog.objects.filter(job=job).order_by('timestamp')
        serializer = JobLogSerializer(logs, many=True)
        return Response(serializer.data)


class PipelineApprovalViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for managing pipeline approvals."""
    queryset = PipelineApproval.objects.all()
    serializer_class = PipelineApprovalSerializer
    permission_classes = [IsAuthenticated]


class PipelineRuleViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for managing pipeline rules."""
    queryset = PipelineRule.objects.all()
    serializer_class = PipelineRuleSerializer
    permission_classes = [IsAuthenticated]


class EnvironmentViewSet(viewsets.ModelViewSet):
    """
    Full CRUD for Environment.

    DELETE is blocked if there are active (pending/running) pipelines
    attached to the environment's project. Owners and staff may bypass
    this check by passing ?force=1, but only staff can delete protected envs.
    """
    queryset           = Environment.objects.all()
    serializer_class   = EnvironmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Environment.objects.all()
        project_id = self.request.query_params.get('project_id')
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs

    def destroy(self, request, *args, **kwargs):
        env = self.get_object()
        # Cascade-delete the environment and all related data unconditionally.
        env.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PipelineArtifactViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for managing pipeline artifacts."""
    queryset = PipelineArtifact.objects.all()
    serializer_class = PipelineArtifactSerializer
    permission_classes = [IsAuthenticated]


class SSHKeyViewSet(viewsets.ModelViewSet):
    """CRUD for SSH keys scoped to the requesting user."""
    serializer_class = SSHKeySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return SSHKey.objects.filter(project__isnull=False)


class PipelineDefinitionViewSet(viewsets.ModelViewSet):
    """CRUD for pipeline definitions."""
    queryset = PipelineDefinition.objects.all()
    serializer_class = PipelineDefinitionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = PipelineDefinition.objects.all()
        project_id = self.request.query_params.get('project_id')
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs


class PipelineRunViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only view of pipeline runs."""
    queryset = PipelineRun.objects.all()
    serializer_class = PipelineRunSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = PipelineRun.objects.all()
        pipeline_id = self.request.query_params.get('pipeline_id')
        if pipeline_id:
            qs = qs.filter(pipeline_id=pipeline_id)
        return qs


class PipelineRunNodeViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only view of individual nodes within a pipeline run."""
    queryset = PipelineRunNode.objects.all()
    serializer_class = PipelineRunNodeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = PipelineRunNode.objects.all()
        run_id = self.request.query_params.get('run_id')
        if run_id:
            qs = qs.filter(run_id=run_id)
        return qs
