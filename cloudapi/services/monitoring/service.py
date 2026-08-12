# OrcaCloud – Monitoring Service
# Collects metrics, evaluates alert rules, and manages incidents.
# Falls back to realistic mock data when live Prometheus/agents are unavailable.

import logging
import os
import random
import math
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)

PROMETHEUS_URL = os.environ.get('PROMETHEUS_URL', '')
PROMETHEUS_USER = os.environ.get('PROMETHEUS_USER', '')
PROMETHEUS_PASS = os.environ.get('PROMETHEUS_PASS', '')


def _live() -> bool:
    return bool(PROMETHEUS_URL)


# ── Mock data helpers ──────────────────────────────────────────────────────────

def _wave(base: float, amplitude: float, offset: int = 0) -> float:
    """Sinusoidal variation seeded by time to produce realistic-looking charts."""
    t = datetime.now(timezone.utc).timestamp()
    return round(base + amplitude * math.sin((t / 300) + offset), 2)


def _mock_service_health() -> list[dict]:
    return [
        {'service': 'compute',    'status': 'operational',    'uptime_pct': 99.98, 'latency_ms': _wave(45, 10, 0),  'error_rate': _wave(0.1, 0.05, 1)},
        {'service': 'database',   'status': 'operational',    'uptime_pct': 99.99, 'latency_ms': _wave(12, 4, 2),   'error_rate': _wave(0.05, 0.02, 3)},
        {'service': 'storage',    'status': 'operational',    'uptime_pct': 100.0, 'latency_ms': _wave(8, 2, 4),    'error_rate': 0.0},
        {'service': 'networking', 'status': 'operational',    'uptime_pct': 99.95, 'latency_ms': _wave(3, 1, 5),    'error_rate': _wave(0.02, 0.01, 6)},
        {'service': 'containers', 'status': 'degraded',       'uptime_pct': 98.5,  'latency_ms': _wave(120, 30, 7), 'error_rate': _wave(2.1, 0.5, 8)},
        {'service': 'email',      'status': 'operational',    'uptime_pct': 99.9,  'latency_ms': _wave(60, 15, 9),  'error_rate': _wave(0.3, 0.1, 10)},
        {'service': 'dns',        'status': 'operational',    'uptime_pct': 100.0, 'latency_ms': _wave(2, 0.5, 11), 'error_rate': 0.0},
        {'service': 'cdn',        'status': 'operational',    'uptime_pct': 99.97, 'latency_ms': _wave(18, 5, 12),  'error_rate': _wave(0.08, 0.03, 13)},
    ]


def _mock_metrics_series(resource_id: str, metric: str, hours: int = 24) -> list[dict]:
    """Generate a time-series of metric points going back `hours` hours."""
    now = datetime.now(timezone.utc)
    META = {
        'cpu_percent':      (45.0, 20.0, '%'),
        'memory_percent':   (62.0, 15.0, '%'),
        'disk_io_read':     (30.0, 20.0, 'MB/s'),
        'disk_io_write':    (15.0, 10.0, 'MB/s'),
        'network_in':       (50.0, 30.0, 'MB/s'),
        'network_out':      (25.0, 15.0, 'MB/s'),
        'latency_ms':       (40.0, 20.0, 'ms'),
        'error_rate':       (0.5,   0.4, '%'),
        'request_rate':     (850.0, 400.0, 'req/s'),
        'queue_length':     (12.0,  8.0, ''),
        'replication_lag':  (0.2,   0.15, 's'),
        'pod_restarts':     (0.5,   0.5, ''),
        'storage_used_pct': (68.0,  5.0, '%'),
        'email_queue':      (5.0,   4.0, ''),
        'dns_query_rate':   (1200.0, 400.0, 'q/s'),
    }
    base, amp, unit = META.get(metric, (50.0, 10.0, ''))
    points = []
    steps = hours * 4  # every 15 minutes
    seed = hash(resource_id + metric) % 1000
    for i in range(steps):
        ts = now - timedelta(minutes=15 * (steps - i))
        val = base + amp * math.sin((i / (steps / (2 * math.pi))) + seed)
        val += random.uniform(-amp * 0.1, amp * 0.1)
        val = max(0.0, round(val, 2))
        points.append({'timestamp': ts.isoformat(), 'value': val, 'unit': unit})
    return points


# ── Public API ─────────────────────────────────────────────────────────────────

def get_service_health(owner=None) -> list[dict]:
    """Return current health for all monitored services."""
    if _live():
        # TODO: query Prometheus for real up/error-rate metrics
        pass
    return _mock_service_health()


def get_overview_stats(owner) -> dict:
    """Top-level summary numbers for the monitoring overview."""
    from .models import Incident, MonitoringAlert, AlertRule
    from django.db.models import Q

    open_incidents  = Incident.objects.filter(owner=owner).exclude(status='resolved').count()
    firing_alerts   = MonitoringAlert.objects.filter(owner=owner, state='firing').count()
    total_rules     = AlertRule.objects.filter(owner=owner, is_enabled=True).count()

    health_list = get_service_health()
    operational  = sum(1 for s in health_list if s['status'] == 'operational')
    degraded     = len(health_list) - operational

    return {
        'services_total':       len(health_list),
        'services_operational': operational,
        'services_degraded':    degraded,
        'open_incidents':       open_incidents,
        'firing_alerts':        firing_alerts,
        'active_alert_rules':   total_rules,
        'overall_uptime':       round(sum(s['uptime_pct'] for s in health_list) / len(health_list), 3),
    }


def get_metric_series(owner, resource_id: str, metric: str,
                      hours: int = 24) -> list[dict]:
    """Return time-series data points for a resource metric."""
    if _live():
        # TODO: query Prometheus range API
        pass
    return _mock_metrics_series(resource_id, metric, hours)


def ingest_metric(owner, resource_id: str, service: str,
                  metric: str, value: float, unit: str = '') -> dict:
    """Store a single metric snapshot and evaluate alert rules."""
    from .models import MetricSnapshot
    from django.utils import timezone

    snap = MetricSnapshot.objects.create(
        owner=owner,
        resource_id=resource_id,
        service=service,
        metric=metric,
        value=value,
        unit=unit,
        timestamp=timezone.now(),
    )
    _evaluate_rules(owner, resource_id, service, metric, value)
    return {'id': snap.id, 'stored': True}


def _evaluate_rules(owner, resource_id, service, metric, value):
    """Check if any enabled alert rules are breached; fire alert if so."""
    from .models import AlertRule, MonitoringAlert
    from django.utils import timezone

    from django.db.models import Q
    rules = AlertRule.objects.filter(
        owner=owner, metric=metric, service=service, is_enabled=True
    ).filter(
        Q(resource_id_filter='') | Q(resource_id_filter=resource_id)
    )
    for rule in rules:
        op = rule.condition
        breached = (
            (op == 'gt'  and value >  rule.threshold) or
            (op == 'gte' and value >= rule.threshold) or
            (op == 'lt'  and value <  rule.threshold) or
            (op == 'lte' and value <= rule.threshold) or
            (op == 'eq'  and value == rule.threshold)
        )
        if breached:
            MonitoringAlert.objects.create(
                rule=rule, owner=owner, state='firing',
                value=value,
                message=f'{metric} is {value} (threshold {op} {rule.threshold})',
            )
            rule.last_fired_at = timezone.now()
            rule.save(update_fields=['last_fired_at'])


def create_incident(owner, service: str, severity: str, title: str,
                    description: str = '', affected: list | None = None) -> dict:
    """Open a new incident."""
    from .models import Incident, IncidentUpdate

    inc = Incident.objects.create(
        owner=owner,
        service=service,
        severity=severity,
        status='open',
        name=title,
        title=title,
        summary=description,
        affected_resources=affected or [],
    )
    IncidentUpdate.objects.create(
        incident=inc, author=owner, status='open',
        message=f'Incident opened: {description or title}',
    )
    return {'resource_id': inc.resource_id, 'created': True}


def update_incident_status(incident, new_status: str, message: str, author) -> dict:
    """Transition incident status and log the update."""
    from .models import IncidentUpdate
    from django.utils import timezone

    incident.status = new_status
    if new_status == 'resolved':
        incident.resolved_at = timezone.now()
    incident.save(update_fields=['status', 'resolved_at', 'updated_at'])

    IncidentUpdate.objects.create(
        incident=incident, author=author, status=new_status, message=message,
    )
    return {'status': new_status}


def get_log_stream(owner, service: str = '', search: str = '',
                   hours: int = 1, limit: int = 100) -> list[dict]:
    """
    Return a stream of mock log entries (replace with Elasticsearch query).
    """
    LEVELS   = ['INFO', 'INFO', 'INFO', 'WARNING', 'ERROR', 'DEBUG']
    SERVICES = ['compute', 'database', 'storage', 'networking', 'containers', 'email', 'dns']
    MSGS = [
        'Request processed successfully in {ms}ms',
        'Health check passed',
        'Connection established to {host}',
        'Cache miss – fetching from upstream',
        'Rate limit approaching for client {ip}',
        'Retrying failed operation (attempt {n}/3)',
        'Slow query detected: {ms}ms',
        'Authentication failure from {ip}',
        'Disk usage at {pct}%',
        'Auto-scaling triggered: adding 1 node',
        'TLS certificate renewal successful',
        'Backup completed in {ms}ms',
    ]

    import random
    now = datetime.now(timezone.utc)
    logs = []

    services_pool = [service] if service else SERVICES
    for i in range(limit):
        ts = now - timedelta(seconds=random.randint(0, hours * 3600))
        svc = random.choice(services_pool)
        level = random.choice(LEVELS)
        msg = random.choice(MSGS).format(
            ms=random.randint(5, 2000),
            host=f'{svc}-node-{random.randint(1, 8)}.internal',
            ip=f'10.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,254)}',
            n=random.randint(1, 3),
            pct=random.randint(40, 95),
        )
        if search and search.lower() not in msg.lower() and search.lower() not in svc.lower():
            continue
        logs.append({
            'timestamp': ts.isoformat(),
            'service':   svc,
            'level':     level,
            'message':   msg,
            'pod':       f'{svc}-{random.randint(1000,9999)}',
            'region':    random.choice(['us-east-1', 'eu-west-1', 'ap-south-1']),
        })

    logs.sort(key=lambda x: x['timestamp'], reverse=True)
    return logs[:limit]


# ── Developer Dashboard Service Functions ─────────────────────────────────────

def get_dev_overview(owner):
    """Combined overview for the developer monitoring hub."""
    from ..pipelines.models import Pipeline, PipelineJob
    from ..containers.models import ContainerDeployment
    from django.utils import timezone as tz
    now = tz.now()
    since_24h = now - timedelta(hours=24)
    since_7d  = now - timedelta(days=7)

    # Pipeline stats
    pipelines_qs = Pipeline.objects.filter(project__owner=owner)
    total_pipelines   = pipelines_qs.count()
    running_pipelines = pipelines_qs.filter(status='running').count()
    failed_24h        = pipelines_qs.filter(status='failed', started_at__gte=since_24h).count()
    success_24h       = pipelines_qs.filter(status='success', started_at__gte=since_24h).count()
    pipeline_runs_24h = pipelines_qs.filter(started_at__gte=since_24h).count()
    pipeline_success_rate = round(
        (success_24h / pipeline_runs_24h * 100) if pipeline_runs_24h else 0, 1
    )

    # Deployment stats
    deployments_qs = ContainerDeployment.objects.filter(container__owner=owner)
    deploys_24h     = deployments_qs.filter(started_at__gte=since_24h).count()
    deploys_failed  = deployments_qs.filter(status='failed', started_at__gte=since_24h).count()
    deploys_success = deployments_qs.filter(status='success', started_at__gte=since_24h).count()
    deploy_success_rate = round(
        (deploys_success / deploys_24h * 100) if deploys_24h else 0, 1
    )

    # Service health
    overview = get_overview_stats(owner)
    svc_health = get_service_health(owner)
    svc_healthy  = sum(1 for s in svc_health if s.get('status') == 'operational')
    svc_degraded = sum(1 for s in svc_health if s.get('status') in ('degraded', 'partial_outage'))
    svc_down     = sum(1 for s in svc_health if s.get('status') == 'major_outage')

    return {
        'pipelines': {
            'total':        total_pipelines,
            'running':      running_pipelines,
            'failed_24h':   failed_24h,
            'runs_24h':     pipeline_runs_24h,
            'success_rate': pipeline_success_rate,
        },
        'deployments': {
            'total_24h':    deploys_24h,
            'failed_24h':   deploys_failed,
            'success_24h':  deploys_success,
            'success_rate': deploy_success_rate,
        },
        'services': {
            'total':    len(svc_health),
            'healthy':  svc_healthy,
            'degraded': svc_degraded,
            'down':     svc_down,
        },
        'alerts': {
            'active':   overview.get('active_alerts', 0),
            'critical': overview.get('critical_alerts', 0),
        },
        'incidents': {
            'open':        overview.get('open_incidents', 0),
            'total_rules': overview.get('total_rules', 0),
        },
    }


def get_pipeline_health(owner, hours=24, project_id=None):
    """Pipeline health stats per project or overall."""
    from ..pipelines.models import Pipeline, Project
    from django.utils import timezone as tz
    from django.db.models import Count, Q
    now = tz.now()
    since = now - timedelta(hours=hours)

    projects_qs = Project.objects.filter(owner=owner)
    if project_id:
        projects_qs = projects_qs.filter(id=project_id)

    result = []
    for project in projects_qs:
        runs = Pipeline.objects.filter(project=project, started_at__gte=since)
        total   = runs.count()
        success = runs.filter(status='success').count()
        failed  = runs.filter(status='failed').count()
        running = runs.filter(status='running').count()
        cancelled = runs.filter(status='cancelled').count()
        recent = runs.order_by('-started_at').values(
            'id', 'pipeline_name', 'branch', 'status',
            'triggered_by', 'started_at', 'finished_at'
        )[:5]
        result.append({
            'project_id':    project.id,
            'project_name':  project.name,
            'total_runs':    total,
            'success':       success,
            'failed':        failed,
            'running':       running,
            'cancelled':     cancelled,
            'success_rate':  round((success / total * 100) if total else 0, 1),
            'recent_runs': list(recent),
        })
    return result


def get_deployment_health(owner, hours=24, project_id=None):
    """Deployment health stats."""
    from ..containers.models import Container, ContainerDeployment
    from django.utils import timezone as tz
    now = tz.now()
    since = now - timedelta(hours=hours)

    containers_qs = Container.objects.filter(owner=owner)
    if project_id:
        containers_qs = containers_qs.filter(project_id=project_id)

    result = []
    for container in containers_qs:
        deploys = ContainerDeployment.objects.filter(
            container=container, started_at__gte=since
        )
        total   = deploys.count()
        success = deploys.filter(status='success').count()
        failed  = deploys.filter(status='failed').count()
        running = deploys.filter(status='running').count()
        recent  = deploys.order_by('-started_at').values(
            'id', 'image_tag', 'trigger', 'status', 'started_at', 'ended_at'
        )[:5]
        result.append({
            'container_id':   container.id,
            'container_name': container.name,
            'image':          container.image,
            'total_deploys':  total,
            'success':        success,
            'failed':         failed,
            'running':        running,
            'success_rate':   round((success / total * 100) if total else 0, 1),
            'recent_deploys': list(recent),
        })
    return result


def get_project_health(owner):
    """Per-project health summary aggregating pipelines, deployments, alerts."""
    from ..pipelines.models import Pipeline, Project
    from ..containers.models import ContainerDeployment, Container
    from django.utils import timezone as tz
    from django.db.models import Count
    now = tz.now()
    since_7d = now - timedelta(days=7)

    result = []
    for project in Project.objects.filter(owner=owner):
        pl_runs     = Pipeline.objects.filter(project=project, started_at__gte=since_7d)
        pl_total    = pl_runs.count()
        pl_success  = pl_runs.filter(status='success').count()
        pl_failed   = pl_runs.filter(status='failed').count()

        dep_runs    = ContainerDeployment.objects.filter(
            container__owner=owner, started_at__gte=since_7d
        )
        dep_total   = dep_runs.count()
        dep_success = dep_runs.filter(status='success').count()
        dep_failed  = dep_runs.filter(status='failed').count()

        combined_total   = pl_total + dep_total
        combined_success = pl_success + dep_success

        if combined_total == 0:
            health_score = 100
        else:
            health_score = round(combined_success / combined_total * 100, 1)

        if health_score >= 90:
            health_status = 'healthy'
        elif health_score >= 70:
            health_status = 'degraded'
        else:
            health_status = 'critical'

        result.append({
            'project_id':       project.id,
            'project_name':     project.name,
            'health_score':     health_score,
            'health_status':    health_status,
            'pipelines_7d':     pl_total,
            'pipeline_success': pl_success,
            'pipeline_failed':  pl_failed,
            'deploys_7d':       dep_total,
            'deploy_success':   dep_success,
            'deploy_failed':    dep_failed,
        })
    return result


def get_activity_feed(owner, event_type=None, project_id=None, hours=24, limit=50):
    """Return audit activity events, merging DB records with synthetic recent events."""
    from .models import PlatformActivityEvent
    from ..pipelines.models import Pipeline
    from ..containers.models import ContainerDeployment
    from django.utils import timezone as tz
    now = tz.now()
    since = now - timedelta(hours=hours)

    # Real events from DB
    events_qs = PlatformActivityEvent.objects.filter(owner=owner, created_at__gte=since)
    if event_type:
        events_qs = events_qs.filter(event_type=event_type)
    if project_id:
        events_qs = events_qs.filter(project_id=project_id)

    db_events = list(events_qs.values(
        'id', 'event_type', 'actor', 'project_id', 'project_name',
        'resource_type', 'resource_id', 'resource_name',
        'environment', 'description', 'severity', 'created_at'
    )[:limit])

    # Augment with real pipeline events if DB is empty
    if not db_events:
        db_events = _synthesize_activity(owner, since, limit)

    for ev in db_events:
        if hasattr(ev.get('created_at'), 'isoformat'):
            ev['created_at'] = ev['created_at'].isoformat()

    return db_events[:limit]


def get_container_health(owner):
    """Return health rows for every container owned by the user."""
    from ..containers.models import Container, ContainerDeployment
    from django.utils import timezone as tz
    now = tz.now()
    since_1h = now - timedelta(hours=1)

    result = []
    for c in Container.objects.filter(owner=owner).select_related():
        last_deploy = (
            ContainerDeployment.objects
            .filter(container=c)
            .order_by('-started_at')
            .first()
        )
        recent_restarts = ContainerDeployment.objects.filter(
            container=c, started_at__gte=since_1h
        ).count()

        if c.status == 'running':
            if recent_restarts >= 3:
                health = 'red'
            else:
                cpu_sim = _wave(40, 20, hash(c.id) % 10)
                health = 'yellow' if cpu_sim > 75 else 'green'
        elif c.status in ('stopped', 'created'):
            health = 'yellow'
        else:
            health = 'red'

        result.append({
            'id':           c.id,
            'name':         c.name,
            'image':        c.image,
            'status':       c.status,
            'health':       health,
            'cpu_vcpus':    c.cpu,
            'memory_mib':   c.memory,
            'replicas':     c.replicas,
            'cpu_sim':      round(_wave(40, 20, hash(str(c.id)) % 10), 1),
            'memory_sim':   round(_wave(55, 15, hash(str(c.id) + 'm') % 10), 1),
            'restarts_1h':  recent_restarts,
            'last_deploy':  last_deploy.started_at.isoformat() if last_deploy and last_deploy.started_at else None,
            'last_deploy_status': last_deploy.status if last_deploy else None,
        })
    return result


def get_kubernetes_health(owner):
    """Return health overview from kubernetes integration data."""
    from ..kubernetes_integration.models import KubeConfig, KubeSyncRun
    from django.utils import timezone as tz
    now = tz.now()
    since_24h = now - timedelta(hours=24)

    configs = KubeConfig.objects.filter(owner=owner)
    result = []
    for cfg in configs:
        recent_syncs = KubeSyncRun.objects.filter(config=cfg, created_at__gte=since_24h)
        total_syncs  = recent_syncs.count()
        failed_syncs = recent_syncs.filter(status='failed').count()
        last_sync    = recent_syncs.order_by('-created_at').first()

        if last_sync is None:
            health = 'yellow'
        elif last_sync.status == 'failed':
            health = 'red'
        elif failed_syncs > 0:
            health = 'yellow'
        else:
            health = 'green'

        # Simulated pod metrics (realistic noise)
        seed = hash(str(cfg.id)) % 100
        result.append({
            'config_id':         cfg.id,
            'project_id':        cfg.project_id,
            'environment':       cfg.environment,
            'cluster_endpoint':  cfg.cluster_endpoint,
            'namespace':         cfg.namespace,
            'health':            health,
            'total_syncs_24h':   total_syncs,
            'failed_syncs_24h':  failed_syncs,
            'last_sync_status':  last_sync.status if last_sync else None,
            'last_sync_at':      last_sync.created_at.isoformat() if last_sync else None,
            # Simulated real-time metrics
            'pods_running':      max(0, 3 + seed % 5),
            'pods_failed':       failed_syncs,
            'pods_pending':      1 if health == 'yellow' else 0,
            'node_cpu_pct':      round(_wave(45, 20, seed), 1),
            'node_memory_pct':   round(_wave(60, 15, seed + 3), 1),
        })
    return result


def get_resource_health(owner):
    """Unified resource health index — all resource types, one health colour each."""
    from ..compute.models import Instance
    from ..storage.models import StorageBucket, StorageVolume
    from ..networking.models import VPC
    from ..database.models import ManagedDatabase
    from ..pipelines.models import Project

    resources = []

    # Compute instances
    for inst in Instance.objects.filter(owner=owner):
        health = 'green' if inst.status == 'ACTIVE' else ('red' if inst.status in ('ERROR', 'DELETED') else 'yellow')
        resources.append({
            'type': 'instance', 'id': inst.resource_id,
            'name': inst.name, 'status': inst.status, 'health': health,
            'detail': f'{inst.flavor} · {inst.region}', 'created_at': inst.created_at and inst.created_at.isoformat(),
        })

    # Databases
    for db in ManagedDatabase.objects.filter(owner=owner):
        health = 'green' if db.status == 'available' else ('red' if db.status in ('failed', 'deleted') else 'yellow')
        resources.append({
            'type': 'database', 'id': db.resource_id,
            'name': db.name, 'status': db.status, 'health': health,
            'detail': f'{db.engine} {db.engine_version} · {db.region}', 'created_at': db.created_at and db.created_at.isoformat(),
        })

    # Storage buckets
    for bkt in StorageBucket.objects.filter(owner=owner):
        health = 'green' if bkt.status == 'running' else 'yellow'
        resources.append({
            'type': 'bucket', 'id': bkt.resource_id,
            'name': bkt.name, 'status': bkt.status, 'health': health,
            'detail': f'{bkt.region} · {round(bkt.total_size_gb, 2)}GB used', 'created_at': bkt.created_at and bkt.created_at.isoformat(),
        })

    # Volumes
    for vol in StorageVolume.objects.filter(owner=owner):
        health = 'green' if vol.status == 'available' else ('red' if vol.status == 'error' else 'yellow')
        resources.append({
            'type': 'volume', 'id': vol.resource_id,
            'name': vol.name, 'status': vol.status, 'health': health,
            'detail': f'{vol.size_gb}GB · {vol.region}', 'created_at': vol.created_at and vol.created_at.isoformat(),
        })

    # VPCs
    for vpc in VPC.objects.filter(owner=owner):
        health = 'green' if vpc.status in ('available', 'active', 'running') else ('red' if vpc.status in ('error', 'failed') else 'yellow')
        resources.append({
            'type': 'vpc', 'id': vpc.resource_id,
            'name': vpc.name, 'status': vpc.status, 'health': health,
            'detail': f'{vpc.cidr_block} · {vpc.region}', 'created_at': vpc.created_at and vpc.created_at.isoformat(),
        })

    # Projects
    for proj in Project.objects.filter(owner=owner):
        resources.append({
            'type': 'project', 'id': str(proj.id),
            'name': proj.name, 'status': 'active', 'health': 'green',
            'detail': f'CI/CD project', 'created_at': proj.created_at and proj.created_at.isoformat(),
        })

    # Aggregate health summary
    total   = len(resources)
    healthy  = sum(1 for r in resources if r['health'] == 'green')
    degraded = sum(1 for r in resources if r['health'] == 'yellow')
    critical = sum(1 for r in resources if r['health'] == 'red')

    return {
        'summary': {'total': total, 'healthy': healthy, 'degraded': degraded, 'critical': critical},
        'resources': resources,
    }


def _synthesize_activity(owner, since, limit):
    """Generate activity events from real pipeline/deployment records."""
    from ..pipelines.models import Pipeline
    from ..containers.models import ContainerDeployment
    events = []

    for pl in Pipeline.objects.filter(project__owner=owner, started_at__gte=since).order_by('-started_at')[:20]:
        ev_type = 'pipeline_failed' if pl.status == 'failed' else 'pipeline_run'
        events.append({
            'id':            f'pl-{pl.id}',
            'event_type':    ev_type,
            'actor':         pl.triggered_by,
            'project_id':    pl.project_id,
            'project_name':  pl.project.name,
            'resource_type': 'pipeline',
            'resource_id':   pl.id,
            'resource_name': pl.pipeline_name,
            'environment':   pl.branch,
            'description':   f'Pipeline {pl.pipeline_name} {pl.status} on branch {pl.branch}',
            'severity':      'critical' if pl.status == 'failed' else 'info',
            'created_at':    pl.started_at.isoformat() if pl.started_at else None,
        })

    for dep in ContainerDeployment.objects.filter(
        container__owner=owner, started_at__gte=since
    ).order_by('-started_at')[:20]:
        if dep.status == 'failed':
            ev_type, sev = 'deployment_failed', 'critical'
        elif dep.status == 'success':
            ev_type, sev = 'deployment_succeeded', 'info'
        else:
            ev_type, sev = 'deployment_started', 'info'
        events.append({
            'id':            f'dep-{dep.id}',
            'event_type':    ev_type,
            'actor':         dep.trigger,
            'project_id':    '',
            'project_name':  '',
            'resource_type': 'deployment',
            'resource_id':   dep.id,
            'resource_name': dep.container.name,
            'environment':   '',
            'description':   f'Deploy {dep.image_tag} to {dep.container.name}: {dep.status}',
            'severity':      sev,
            'created_at':    dep.started_at.isoformat() if dep.started_at else None,
        })

    events.sort(key=lambda x: x.get('created_at') or '', reverse=True)
    return events[:limit]
