# OrcaCloud – Monitoring ViewSets

import logging
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response

from .models import (
    ServiceHealth, MetricSnapshot, AlertRule, MonitoringAlert, Incident,
    ServiceLevelObjective, TraceSpan, DDoSProtectionRule, DDoSAttackEvent,
)
from .serializers import (
    ServiceHealthSerializer, MetricSnapshotSerializer,
    AlertRuleSerializer, CreateAlertRuleSerializer,
    AlertSerializer,
    IncidentListSerializer, IncidentDetailSerializer, CreateIncidentSerializer,
    SLOSerializer, TraceSpanSerializer, DDoSRuleSerializer, DDoSAttackEventSerializer,
)
from . import service as svc

logger = logging.getLogger(__name__)


# ── Overview ──────────────────────────────────────────────────────────────────

class MonitoringOverviewViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        """GET /monitoring/overview/ – summary stats + service health."""
        stats  = svc.get_overview_stats(request.user)
        health = svc.get_service_health(request.user)
        return Response({'stats': stats, 'service_health': health})


# ── Metrics ───────────────────────────────────────────────────────────────────

class MetricViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        """GET /metrics/?resource=<id>&metric=<name>&hours=<n>"""
        resource_id = request.query_params.get('resource', 'global')
        metric      = request.query_params.get('metric', 'cpu_percent')
        hours       = int(request.query_params.get('hours', 24))
        data = svc.get_metric_series(request.user, resource_id, metric, hours)
        return Response({'resource_id': resource_id, 'metric': metric,
                         'hours': hours, 'points': data})

    @action(detail=False, methods=['post'])
    def ingest(self, request):
        """POST /metrics/ingest/ – push a metric value."""
        d = request.data
        result = svc.ingest_metric(
            request.user,
            d.get('resource_id', 'unknown'),
            d.get('service', 'unknown'),
            d.get('metric', 'cpu_percent'),
            float(d.get('value', 0)),
            d.get('unit', ''),
        )
        return Response(result)

    @action(detail=False, methods=['get'], url_path='available')
    def available(self, request):
        """GET /metrics/available/ – list of metric names."""
        choices = [
            {'value': v, 'label': l}
            for v, l in MetricSnapshot.METRIC_CHOICES
        ]
        return Response(choices)


# ── Alert Rules ───────────────────────────────────────────────────────────────

class AlertRuleViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'resource_id'

    def get_queryset(self):
        return AlertRule.objects.filter(owner=self.request.user)

    def get_serializer_class(self):
        return CreateAlertRuleSerializer if self.action == 'create' else AlertRuleSerializer

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=['post'])
    def enable(self, request, resource_id=None):
        rule = self.get_object()
        rule.is_enabled = True
        rule.save(update_fields=['is_enabled', 'updated_at'])
        return Response({'is_enabled': True})

    @action(detail=True, methods=['post'])
    def disable(self, request, resource_id=None):
        rule = self.get_object()
        rule.is_enabled = False
        rule.save(update_fields=['is_enabled', 'updated_at'])
        return Response({'is_enabled': False})


# ── Alerts (fired events) ─────────────────────────────────────────────────────

class AlertViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class   = AlertSerializer

    def get_queryset(self):
        qs = MonitoringAlert.objects.filter(owner=self.request.user).select_related('rule')
        state = self.request.query_params.get('state')
        if state:
            qs = qs.filter(state=state)
        return qs

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        from django.utils import timezone
        alert = self.get_object()
        alert.state       = 'resolved'
        alert.resolved_at = timezone.now()
        alert.save(update_fields=['state', 'resolved_at'])
        return Response({'state': 'resolved'})

    @action(detail=True, methods=['post'])
    def silence(self, request, pk=None):
        alert = self.get_object()
        alert.state = 'silenced'
        alert.save(update_fields=['state'])
        return Response({'state': 'silenced'})


# ── Incidents ─────────────────────────────────────────────────────────────────

class IncidentViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'resource_id'

    def get_queryset(self):
        qs = Incident.objects.filter(owner=self.request.user).prefetch_related('updates')
        svc_filter = self.request.query_params.get('service')
        status_filter = self.request.query_params.get('status')
        if svc_filter:
            qs = qs.filter(service=svc_filter)
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateIncidentSerializer
        if self.action in ('list',):
            return IncidentListSerializer
        return IncidentDetailSerializer

    def perform_create(self, serializer):
        inc = serializer.save(owner=self.request.user)
        from .models import IncidentUpdate
        IncidentUpdate.objects.create(
            incident=inc, author=self.request.user,
            status='open', message='Incident opened.',
        )

    @action(detail=True, methods=['post'])
    def update_status(self, request, resource_id=None):
        incident   = self.get_object()
        new_status = request.data.get('status')
        message    = request.data.get('message', '')
        if not new_status:
            return Response({'error': 'status is required.'},
                            status=status.HTTP_400_BAD_REQUEST)
        result = svc.update_incident_status(incident, new_status, message, request.user)
        return Response(result)

    @action(detail=True, methods=['post'])
    def assign(self, request, resource_id=None):
        from django.contrib.auth.models import User as DjangoUser
        incident = self.get_object()
        user_id  = request.data.get('user_id')
        try:
            user = DjangoUser.objects.get(pk=user_id)
        except DjangoUser.DoesNotExist:
            return Response({'error': 'User not found.'}, status=404)
        incident.assigned_to = user
        incident.save(update_fields=['assigned_to', 'updated_at'])
        return Response({'assigned_to': user.username})


# ── Logs ──────────────────────────────────────────────────────────────────────

class LogViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        """GET /logs/?service=<name>&search=<text>&hours=<n>&limit=<n>"""
        svc_filter = request.query_params.get('service', '')
        search     = request.query_params.get('search', '')
        hours      = int(request.query_params.get('hours', 1))
        limit      = min(int(request.query_params.get('limit', 100)), 500)
        logs = svc.get_log_stream(request.user, svc_filter, search, hours, limit)
        return Response({'count': len(logs), 'logs': logs})


# ── Developer Dashboard Monitoring ────────────────────────────────────────────

class DevMonitoringViewSet(viewsets.ViewSet):
    """Unified developer-facing monitoring endpoints for the monitoring hub."""
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        """GET /monitoring/dev/ — combined overview stats."""
        data = svc.get_dev_overview(request.user)
        return Response(data)

    @action(detail=False, methods=['get'], url_path='pipeline-health')
    def pipeline_health(self, request):
        """GET /monitoring/dev/pipeline-health/?hours=<n>&project_id=<id>"""
        hours      = int(request.query_params.get('hours', 24))
        project_id = request.query_params.get('project_id', None)
        data = svc.get_pipeline_health(request.user, hours=hours, project_id=project_id)
        return Response({'count': len(data), 'results': data})

    @action(detail=False, methods=['get'], url_path='deployment-health')
    def deployment_health(self, request):
        """GET /monitoring/dev/deployment-health/?hours=<n>&project_id=<id>"""
        hours      = int(request.query_params.get('hours', 24))
        project_id = request.query_params.get('project_id', None)
        data = svc.get_deployment_health(request.user, hours=hours, project_id=project_id)
        return Response({'count': len(data), 'results': data})

    @action(detail=False, methods=['get'], url_path='project-health')
    def project_health(self, request):
        """GET /monitoring/dev/project-health/"""
        data = svc.get_project_health(request.user)
        return Response({'count': len(data), 'results': data})

    @action(detail=False, methods=['get'], url_path='activity')
    def activity(self, request):
        """GET /monitoring/dev/activity/?event_type=<t>&project_id=<id>&hours=<n>&limit=<n>"""
        event_type = request.query_params.get('event_type', None)
        project_id = request.query_params.get('project_id', None)
        hours      = int(request.query_params.get('hours', 24))
        limit      = min(int(request.query_params.get('limit', 50)), 200)
        data = svc.get_activity_feed(
            request.user, event_type=event_type,
            project_id=project_id, hours=hours, limit=limit,
        )
        return Response({'count': len(data), 'results': data})

    @action(detail=False, methods=['get'], url_path='service-health')
    def service_health(self, request):
        """GET /monitoring/dev/service-health/ — list of service health records."""
        data = svc.get_service_health(request.user)
        return Response({'count': len(data), 'results': data})

    @action(detail=False, methods=['get'], url_path='container-health')
    def container_health(self, request):
        """GET /monitoring/dev/container-health/ — all containers with health status."""
        data = svc.get_container_health(request.user)
        return Response({'count': len(data), 'results': data})

    @action(detail=False, methods=['get'], url_path='kubernetes-health')
    def kubernetes_health(self, request):
        """GET /monitoring/dev/kubernetes-health/ — k8s cluster health per config."""
        data = svc.get_kubernetes_health(request.user)
        return Response({'count': len(data), 'results': data})

    @action(detail=False, methods=['get'], url_path='resource-health')
    def resource_health(self, request):
        """GET /monitoring/dev/resource-health/ — unified health index for all resources."""
        data = svc.get_resource_health(request.user)
        return Response(data)


# ── SLO ViewSet ───────────────────────────────────────────────────────────────

class SLOViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = SLOSerializer

    def get_queryset(self):
        return ServiceLevelObjective.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=['post'])
    def recalculate(self, request, pk=None):
        """Trigger a recalculation of SLO metrics."""
        from django.utils import timezone
        slo = self.get_object()
        # Simple recalculation logic; production would query MetricSnapshot
        import random
        slo.current_value = round(random.uniform(slo.target_pct - 1.5, 100.0), 3)
        budget_used = max(0, slo.target_pct - slo.current_value)
        max_budget = 100.0 - slo.target_pct
        slo.error_budget_pct = round(max(0, (max_budget - budget_used) / max_budget * 100), 2) if max_budget > 0 else 100.0
        slo.burn_rate = round(budget_used / max_budget * 30, 2) if max_budget > 0 else 0.0
        slo.breached = slo.current_value < slo.target_pct
        slo.last_calculated = timezone.now()
        slo.save()
        return Response(SLOSerializer(slo).data)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        qs = self.get_queryset()
        return Response({
            'total': qs.count(),
            'breached': qs.filter(breached=True).count(),
            'healthy': qs.filter(breached=False).count(),
            'budget_critical': qs.filter(error_budget_pct__lt=10).count(),
        })


# ── Distributed Tracing ViewSet ───────────────────────────────────────────────

class TraceViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TraceSpanSerializer

    def get_queryset(self):
        qs = TraceSpan.objects.filter(owner=self.request.user)
        trace_id = self.request.query_params.get('trace_id')
        service_name = self.request.query_params.get('service')
        if trace_id:
            qs = qs.filter(trace_id=trace_id)
        if service_name:
            qs = qs.filter(service_name=service_name)
        return qs[:1000]

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=False, methods=['get'])
    def services(self, request):
        """List all distinct service names with trace data."""
        names = list(
            TraceSpan.objects.filter(owner=request.user)
            .values_list('service_name', flat=True)
            .distinct()
        )
        return Response({'services': names})

    @action(detail=False, methods=['get'])
    def summary(self, request):
        from django.db.models import Avg, Max, Count
        qs = TraceSpan.objects.filter(owner=request.user)
        agg = qs.aggregate(
            total_spans=Count('id'),
            avg_latency=Avg('duration_ms'),
            max_latency=Max('duration_ms'),
            error_spans=Count('id', filter=models.Q(status='error')),
        )
        return Response(agg)


# ── DDoS Protection ViewSet ───────────────────────────────────────────────────

from django.db import models as dj_models

class DDoSRuleViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = DDoSRuleSerializer

    def get_queryset(self):
        return DDoSProtectionRule.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=['post'])
    def enable(self, request, pk=None):
        rule = self.get_object()
        rule.status = 'active'
        rule.save(update_fields=['status'])
        return Response({'status': 'active'})

    @action(detail=True, methods=['post'])
    def disable(self, request, pk=None):
        rule = self.get_object()
        rule.status = 'disabled'
        rule.save(update_fields=['status'])
        return Response({'status': 'disabled'})

    @action(detail=False, methods=['get'])
    def summary(self, request):
        qs = self.get_queryset()
        attacks = DDoSAttackEvent.objects.filter(owner=request.user)
        return Response({
            'total_rules': qs.count(),
            'active_rules': qs.filter(status='active').count(),
            'total_attacks': attacks.count(),
            'active_attacks': attacks.filter(status__in=['detected', 'mitigating']).count(),
            'mitigated': attacks.filter(status='mitigated').count(),
        })


class DDoSAttackEventViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = DDoSAttackEventSerializer

    def get_queryset(self):
        return DDoSAttackEvent.objects.filter(owner=self.request.user)


# ── Operational Status ────────────────────────────────────────────────────────

class OperationalStatusViewSet(viewsets.ViewSet):
    """
    Central data provider for the Operational Page.

    GET  /operational/                 → global banner + service health + region health
    GET  /operational/health-grid/     → service × region ComponentStatus matrix
    GET  /operational/running/         → active running processes
    POST /operational/running/         → register a new process (from CI workers)
    GET  /operational/running/{id}/    → detail for one process
    PATCH /operational/running/{id}/   → update progress/status
    GET  /operational/summary/         → counts only (for polling)
    """
    permission_classes = [permissions.IsAuthenticated]

    # ────────────────────────────────────
    def list(self, request):
        """GET /operational/ – global banner, service health, region list."""
        from ..regions.models import CloudRegion
        from ..regions.serializers import CloudRegionSerializer
        from django.utils import timezone

        # Service health
        service_health = ServiceHealth.objects.all()
        if not service_health.exists():
            service_health = svc.get_service_health(request.user)
            health_data = service_health
        else:
            health_data = ServiceHealthSerializer(service_health, many=True).data

        # Active incidents
        active_incidents = Incident.objects.filter(
            status__in=['open', 'investigating', 'identified', 'monitoring']
        ).order_by('-detected_at')[:10]
        incidents_data = IncidentListSerializer(active_incidents, many=True).data

        # Regions
        regions = CloudRegion.objects.filter(status='active').order_by('continent', 'code')
        regions_data = CloudRegionSerializer(regions, many=True).data

        # Running processes count
        running_count = RunningProcess.objects.filter(
            owner=request.user,
            status__in=['running', 'queued']
        ).count()

        # Global banner
        has_major = Incident.objects.filter(status__in=['open', 'investigating'], severity='sev1').exists()
        has_partial = Incident.objects.filter(status__in=['open', 'investigating']).exists()
        if has_major:
            banner = {'level': 'major_incident', 'message': 'Major Incident Detected'}
        elif has_partial:
            banner = {'level': 'partial_outage', 'message': 'Partial Outage in Progress'}
        else:
            banner = {'level': 'operational', 'message': 'All Systems Operational'}

        return Response({
            'banner': banner,
            'service_health': health_data,
            'regions': regions_data,
            'active_incidents': incidents_data,
            'running_count': running_count,
            'generated_at': timezone.now().isoformat(),
        })

    # ────────────────────────────────────
    @action(detail=False, methods=['get'], url_path='health-grid')
    def health_grid(self, request):
        """GET /operational/health-grid/ – service × region matrix."""
        from ..regions.models import CloudRegion

        qs = ComponentStatus.objects.all().order_by('service', 'region')
        regions = CloudRegion.objects.filter(status__in=['active', 'degraded', 'maintenance']).values_list('code', flat=True)

        # Build grid: {service: {region: status_obj}}
        grid: dict = {}
        for item in ComponentStatusSerializer(qs, many=True).data:
            grid.setdefault(item['service'], {})
            grid[item['service']][item['region']] = item

        return Response({
            'services': [s for s, _ in ComponentStatus.SERVICE_CHOICES],
            'regions': list(regions),
            'grid': grid,
        })

    @action(detail=False, methods=['post'], url_path='health-grid/update')
    def update_health_grid(self, request):
        """POST /operational/health-grid/update/ – upsert a cell."""
        ser = ComponentStatusWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        obj, _ = ComponentStatus.objects.update_or_create(
            service=ser.validated_data['service'],
            region=ser.validated_data['region'],
            defaults={k: v for k, v in ser.validated_data.items()
                      if k not in ('service', 'region')},
        )
        return Response(ComponentStatusSerializer(obj).data)

    # ────────────────────────────────────
    @action(detail=False, methods=['get', 'post'], url_path='running')
    def running_processes(self, request):
        """GET/POST /operational/running/"""
        if request.method == 'GET':
            proc_type = request.query_params.get('type')
            status_filter = request.query_params.get('status', 'running,queued')
            statuses = [s.strip() for s in status_filter.split(',')]
            qs = RunningProcess.objects.filter(
                owner=request.user,
                status__in=statuses,
            )
            if proc_type:
                qs = qs.filter(process_type=proc_type)
            qs = qs.order_by('-started_at')[:50]
            return Response(RunningProcessSerializer(qs, many=True).data)

        # POST – register/update a process
        ser = RunningProcessCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        proc = ser.save(owner=request.user)
        return Response(RunningProcessSerializer(proc).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get', 'patch'], url_path=r'running/(?P<proc_id>[^/.]+)')
    def running_process_detail(self, request, proc_id=None):
        """GET/PATCH /operational/running/{id}/"""
        try:
            proc = RunningProcess.objects.get(id=proc_id, owner=request.user)
        except RunningProcess.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        if request.method == 'PATCH':
            for field in ('status', 'progress_pct', 'finished_at', 'meta'):
                if field in request.data:
                    setattr(proc, field, request.data[field])
            proc.save()
        return Response(RunningProcessSerializer(proc).data)

    # ────────────────────────────────────
    @action(detail=False, methods=['get'], url_path='summary')
    def summary(self, request):
        """GET /operational/summary/ – lightweight count payload for polling."""
        active_inc = Incident.objects.filter(
            status__in=['open', 'investigating', 'identified']
        ).count()
        running = RunningProcess.objects.filter(
            owner=request.user, status__in=['running', 'queued']
        ).count()
        sev1 = Incident.objects.filter(
            status__in=['open', 'investigating'], severity='sev1'
        ).count()
        return Response({
            'active_incidents': active_inc,
            'sev1_incidents': sev1,
            'running_processes': running,
        })


