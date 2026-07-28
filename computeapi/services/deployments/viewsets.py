# OrcaCloud — Deploy Service ViewSets

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import (
    DeploymentTemplate, DeploymentRequest, DeploymentPlan,
    DeploymentExecution, DeploymentAuditLog,
)
from .serializers import (
    DeploymentTemplateSerializer,
    DeploymentRequestCreateSerializer,
    DeploymentRequestSerializer,
    DeploymentRequestUpdateSerializer,
    DeploymentPlanSerializer,
    DeploymentExecutionSerializer,
    DeploymentAuditLogSerializer,
)
from .logic import (
    PlanGenerator, PermissionChecker, AuditLogger,
    start_execution, PermissionError as DeployPermissionError,
)


# ─────────────────────────────────────────────────────────────────────────────
# 1.  DeploymentTemplate  (read-only list + detail; admin-write)
# ─────────────────────────────────────────────────────────────────────────────

class DeploymentTemplateViewSet(viewsets.ModelViewSet):
    queryset           = DeploymentTemplate.objects.filter(is_active=True)
    serializer_class   = DeploymentTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [permissions.IsAdminUser()]
        return [permissions.IsAuthenticated()]


# ─────────────────────────────────────────────────────────────────────────────
# 2.  DeploymentRequest
# POST   /deploy/requests/          → create + auto-plan
# GET    /deploy/requests/          → list (my requests)
# GET    /deploy/requests/{id}/     → detail with embedded plan + executions
# PATCH  /deploy/requests/{id}/     → update description/git fields (pre-plan only)
# POST   /deploy/requests/{id}/plan/     → re-generate plan
# POST   /deploy/requests/{id}/confirm/ → confirm & start execution(s)
# POST   /deploy/requests/{id}/rollback/ → rollback latest execution
# ─────────────────────────────────────────────────────────────────────────────

class DeploymentRequestViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    # ── Queryset ──────────────────────────────────────────────────────────────

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return DeploymentRequest.objects.select_related('owner', 'template').prefetch_related('executions').all()
        return DeploymentRequest.objects.filter(owner=user).select_related('owner', 'template').prefetch_related('executions')

    # ── Serializer selection ──────────────────────────────────────────────────

    def get_serializer_class(self):
        if self.action == 'create':
            return DeploymentRequestCreateSerializer
        if self.action in ('update', 'partial_update'):
            return DeploymentRequestUpdateSerializer
        return DeploymentRequestSerializer

    # ── Create: save + auto-generate plan ────────────────────────────────────

    def perform_create(self, serializer):
        PermissionChecker.check_can_create_request(self.request.user)
        obj = serializer.save(owner=self.request.user)

        AuditLogger.log(
            user       = self.request.user,
            action     = 'deploy.request.created',
            detail     = {'request_id': obj.pk, 'app': obj.app_name},
            request_obj= obj,
            ip_address = AuditLogger.get_ip(self.request),
        )

        # Auto-generate plan immediately
        PlanGenerator.generate(obj)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        # Return full representation (with embedded plan)
        instance   = DeploymentRequest.objects.get(pk=serializer.instance.pk)
        out_serial = DeploymentRequestSerializer(instance, context={'request': request})
        return Response(out_serial.data, status=status.HTTP_201_CREATED)

    # ── Re-generate plan ──────────────────────────────────────────────────────

    @action(detail=True, methods=['post'], url_path='plan')
    def plan(self, request, pk=None):
        obj = self.get_object()
        PermissionChecker.check_can_confirm(request.user, obj)

        plan = PlanGenerator.generate(obj)
        AuditLogger.log(
            user        = request.user,
            action      = 'deploy.plan.regenerated',
            detail      = {'plan_id': plan.pk},
            request_obj = obj,
            ip_address  = AuditLogger.get_ip(request),
        )
        return Response(DeploymentPlanSerializer(plan).data)

    # ── Confirm & start deployment ────────────────────────────────────────────

    @action(detail=True, methods=['post'], url_path='confirm')
    def confirm(self, request, pk=None):
        obj = self.get_object()

        try:
            PermissionChecker.check_can_confirm(request.user, obj)
        except DeployPermissionError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_403_FORBIDDEN)

        if obj.status not in ('planned', 'draft', 'pending'):
            return Response(
                {'detail': f'Cannot confirm a request in "{obj.status}" status.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Ensure a plan exists
        if not hasattr(obj, 'plan'):
            PlanGenerator.generate(obj)

        plan         = obj.plan
        environments = obj.target_environments or ['dev']
        executions   = []

        for env in environments:
            if env == 'prod':
                try:
                    PermissionChecker.check_can_deploy_to_prod(request.user)
                except DeployPermissionError as exc:
                    return Response({'detail': str(exc)}, status=status.HTTP_403_FORBIDDEN)

            exe = DeploymentExecution.objects.create(
                plan        = plan,
                environment = env,
                status      = 'pending',
                log_lines   = [],
            )
            executions.append(exe)
            start_execution(exe)

        obj.status = 'deploying'
        obj.save(update_fields=['status'])

        AuditLogger.log(
            user        = request.user,
            action      = 'deploy.confirmed',
            detail      = {
                'environments': environments,
                'execution_ids': [e.pk for e in executions],
            },
            request_obj = obj,
            ip_address  = AuditLogger.get_ip(request),
        )

        return Response({
            'message':    f'Deployment started for {obj.app_name}',
            'executions': DeploymentExecutionSerializer(executions, many=True).data,
        }, status=status.HTTP_201_CREATED)

    # ── Rollback ──────────────────────────────────────────────────────────────

    @action(detail=True, methods=['post'], url_path='rollback')
    def rollback(self, request, pk=None):
        obj = self.get_object()

        latest = (
            DeploymentExecution.objects
            .filter(plan__request=obj)
            .order_by('-created_at')
            .first()
        )

        if not latest:
            return Response({'detail': 'No executions found to roll back.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            PermissionChecker.check_can_rollback(request.user, latest)
        except DeployPermissionError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_403_FORBIDDEN)

        import django.utils.timezone as dj_tz
        latest.status          = 'rolled_back'
        latest.rolled_back_at  = dj_tz.now()
        latest.save(update_fields=['status', 'rolled_back_at'])

        obj.status = 'rolled_back'
        obj.save(update_fields=['status'])

        AuditLogger.log(
            user        = request.user,
            action      = 'deploy.rollback',
            detail      = {'execution_id': latest.pk},
            request_obj = obj,
            execution   = latest,
            ip_address  = AuditLogger.get_ip(request),
        )

        return Response({'message': 'Rollback triggered.', 'execution': DeploymentExecutionSerializer(latest).data})


# ─────────────────────────────────────────────────────────────────────────────
# 3.  DeploymentExecution
# GET  /deploy/executions/{id}/         → detail (with logs)
# GET  /deploy/executions/{id}/status/  → lightweight status poll
# POST /deploy/executions/{id}/webhook/ → CI/CD pipeline status callback
# ─────────────────────────────────────────────────────────────────────────────

class DeploymentExecutionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class   = DeploymentExecutionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return DeploymentExecution.objects.select_related('plan__request').all()
        return DeploymentExecution.objects.filter(
            plan__request__owner=user
        ).select_related('plan__request')

    @action(detail=True, methods=['get'], url_path='status')
    def status(self, request, pk=None):
        exe = self.get_object()
        return Response({
            'id':           exe.pk,
            'status':       exe.status,
            'health_status':exe.health_status,
            'app_url':      exe.app_url,
            'log_count':    len(exe.log_lines),
            'started_at':   exe.started_at,
            'finished_at':  exe.finished_at,
        })

    @action(detail=True, methods=['post'], url_path='webhook',
            permission_classes=[permissions.IsAuthenticated])
    def webhook(self, request, pk=None):
        """
        Called by CI/CD systems when a pipeline step completes.
        Expected payload: { "status": "succeeded|failed", "log_lines": [...], "pipeline_run_id": "..." }
        """
        exe = self.get_object()
        new_status    = request.data.get('status')
        new_logs      = request.data.get('log_lines', [])
        pipeline_run  = request.data.get('pipeline_run_id', '')

        allowed_statuses = {'running', 'succeeded', 'failed', 'pending'}
        if new_status not in allowed_statuses:
            return Response({'detail': f'Invalid status "{new_status}".'}, status=status.HTTP_400_BAD_REQUEST)

        exe.status   = new_status
        exe.log_lines = exe.log_lines + new_logs
        if pipeline_run:
            exe.pipeline_run_id = pipeline_run

        import django.utils.timezone as dj_tz
        if new_status == 'succeeded':
            exe.finished_at  = dj_tz.now()
            exe.health_status= 'healthy'
        elif new_status == 'failed':
            exe.finished_at  = dj_tz.now()
            exe.health_status= 'unhealthy'

        exe.save()

        action_name = f'deploy.pipeline.{new_status}'
        AuditLogger.log(
            user       = request.user,
            action     = action_name,
            detail     = {'execution_id': exe.pk, 'pipeline_run_id': pipeline_run},
            execution  = exe,
            ip_address = AuditLogger.get_ip(request),
        )

        return Response({'message': f'Execution updated to "{new_status}".'})


# ─────────────────────────────────────────────────────────────────────────────
# 4.  DeploymentAuditLog  (read-only — staff only)
# ─────────────────────────────────────────────────────────────────────────────

class DeploymentAuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class   = DeploymentAuditLogSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset           = DeploymentAuditLog.objects.select_related('user', 'request', 'execution').order_by('-created_at')

    def get_queryset(self):
        qs  = super().get_queryset()
        req = self.request.query_params.get('request')
        exe = self.request.query_params.get('execution')
        if req:
            qs = qs.filter(request__id=req)
        if exe:
            qs = qs.filter(execution__id=exe)
        return qs
