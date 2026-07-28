# OrcaCloud – Monitoring & Incident Management Models
import uuid
from django.db import models
from django.contrib.auth.models import User
from ..core.base_models import ResourceModel, TimeStampedModel


# ── Service Health ─────────────────────────────────────────────────────────────

class ServiceHealth(TimeStampedModel):
    """Current health snapshot for a top-level service."""

    SERVICE_CHOICES = [
        ('compute',     'Compute'),
        ('database',    'Database'),
        ('storage',     'Storage'),
        ('networking',  'Networking'),
        ('containers',  'Containers'),
        ('email',       'Email'),
        ('dns',         'DNS'),
        ('cdn',         'CDN'),
        ('monitoring',  'Monitoring'),
    ]

    STATUS_CHOICES = [
        ('operational',        'Operational'),
        ('degraded',           'Degraded Performance'),
        ('partial_outage',     'Partial Outage'),
        ('major_outage',       'Major Outage'),
        ('maintenance',        'Under Maintenance'),
    ]

    service      = models.CharField(max_length=64, choices=SERVICE_CHOICES, unique=True)
    status       = models.CharField(max_length=32, choices=STATUS_CHOICES, default='operational')
    uptime_pct   = models.FloatField(default=100.0)
    latency_ms   = models.FloatField(default=0.0)
    error_rate   = models.FloatField(default=0.0)   # percentage
    note         = models.TextField(blank=True)
    last_checked = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'service healths'
        ordering = ['service']

    def __str__(self):
        return f'{self.service} – {self.status}'


# ── Metric Snapshot ────────────────────────────────────────────────────────────

class MetricSnapshot(TimeStampedModel):
    """Time-series metric point for a resource."""

    METRIC_CHOICES = [
        ('cpu_percent',       'CPU %'),
        ('memory_percent',    'Memory %'),
        ('disk_io_read',      'Disk IO Read (MB/s)'),
        ('disk_io_write',     'Disk IO Write (MB/s)'),
        ('network_in',        'Network In (MB/s)'),
        ('network_out',       'Network Out (MB/s)'),
        ('latency_ms',        'Latency (ms)'),
        ('error_rate',        'Error Rate (%)'),
        ('request_rate',      'Requests/sec'),
        ('queue_length',      'Queue Length'),
        ('replication_lag',   'Replication Lag (s)'),
        ('pod_restarts',      'Pod Restarts'),
        ('storage_used_pct',  'Storage Used (%)'),
        ('email_queue',       'Email Queue Length'),
        ('dns_query_rate',    'DNS Queries/sec'),
    ]

    owner       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='metric_snapshots')
    resource_id = models.CharField(max_length=64, db_index=True)
    service     = models.CharField(max_length=64, db_index=True)
    metric      = models.CharField(max_length=64, choices=METRIC_CHOICES, db_index=True)
    value       = models.FloatField()
    unit        = models.CharField(max_length=32, blank=True)
    region      = models.CharField(max_length=64, blank=True)
    timestamp   = models.DateTimeField(db_index=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['resource_id', 'metric', 'timestamp']),
            models.Index(fields=['owner', 'service', 'timestamp']),
        ]

    def __str__(self):
        return f'{self.resource_id}/{self.metric}={self.value} @ {self.timestamp}'


# ── Alert Rule ─────────────────────────────────────────────────────────────────

class AlertRule(ResourceModel):
    """User-defined alerting rule (like CloudWatch alarm)."""

    CONDITION_CHOICES = [
        ('gt', '>'),
        ('gte', '>='),
        ('lt', '<'),
        ('lte', '<='),
        ('eq', '=='),
    ]

    SEVERITY_CHOICES = [
        ('info',     'Info'),
        ('warning',  'Warning'),
        ('critical', 'Critical'),
    ]

    NOTIFY_CHOICES = [
        ('email',    'Email'),
        ('slack',    'Slack'),
        ('webhook',  'Webhook'),
        ('pagerduty','PagerDuty'),
    ]

    def save(self, *args, **kwargs):
        if not self.resource_id:
            self.resource_id = f'alr-{uuid.uuid4().hex[:12]}'
        super().save(*args, **kwargs)

    service        = models.CharField(max_length=64)
    resource_id_filter = models.CharField(max_length=64, blank=True,
        help_text='Specific resource to watch, or blank for service-wide')
    metric         = models.CharField(max_length=64)
    condition      = models.CharField(max_length=8, choices=CONDITION_CHOICES, default='gt')
    threshold      = models.FloatField()
    duration_mins  = models.IntegerField(default=5,
        help_text='Minutes the condition must hold before firing')
    severity       = models.CharField(max_length=16, choices=SEVERITY_CHOICES, default='warning')
    notify_via     = models.JSONField(default=list,
        help_text='List of notification channels')
    notify_target  = models.TextField(blank=True,
        help_text='Email / webhook URL / PagerDuty key')
    is_enabled     = models.BooleanField(default=True)
    last_fired_at  = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']


# ── Alert (fired instance) ─────────────────────────────────────────────────────

class MonitoringAlert(TimeStampedModel):
    """A fired alert event."""

    STATE_CHOICES = [
        ('firing',    'Firing'),
        ('resolved',  'Resolved'),
        ('silenced',  'Silenced'),
    ]

    rule        = models.ForeignKey(AlertRule, on_delete=models.CASCADE, related_name='alerts')
    owner       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='monitoring_alerts')
    state       = models.CharField(max_length=16, choices=STATE_CHOICES, default='firing')
    value       = models.FloatField(help_text='Metric value that triggered the alert')
    fired_at    = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    message     = models.TextField(blank=True)

    class Meta:
        ordering = ['-fired_at']


# ── Incident ───────────────────────────────────────────────────────────────────

class Incident(ResourceModel):
    """An operational incident requiring investigation/resolution."""

    SEVERITY_CHOICES = [
        ('sev1', 'SEV-1 Critical'),
        ('sev2', 'SEV-2 High'),
        ('sev3', 'SEV-3 Medium'),
        ('sev4', 'SEV-4 Low'),
    ]

    STATUS_CHOICES = [
        ('open',          'Open'),
        ('investigating', 'Investigating'),
        ('identified',    'Identified'),
        ('monitoring',    'Monitoring'),
        ('resolved',      'Resolved'),
        ('postmortem',    'Post-Mortem'),
    ]

    def save(self, *args, **kwargs):
        if not self.resource_id:
            self.resource_id = f'inc-{uuid.uuid4().hex[:12]}'
        super().save(*args, **kwargs)

    service       = models.CharField(max_length=64)
    severity      = models.CharField(max_length=8, choices=SEVERITY_CHOICES, default='sev3')
    status        = models.CharField(max_length=16, choices=STATUS_CHOICES, default='open')
    title         = models.CharField(max_length=255)
    summary       = models.TextField(blank=True)
    affected_resources = models.JSONField(default=list)
    assigned_to   = models.ForeignKey(User, null=True, blank=True,
                        on_delete=models.SET_NULL, related_name='assigned_incidents')
    alert         = models.ForeignKey(MonitoringAlert, null=True, blank=True,
                        on_delete=models.SET_NULL, related_name='incidents')
    detected_at   = models.DateTimeField(auto_now_add=True)
    resolved_at   = models.DateTimeField(null=True, blank=True)
    impact        = models.TextField(blank=True)
    resolution    = models.TextField(blank=True)

    class Meta:
        ordering = ['-detected_at']

    @property
    def duration_minutes(self):
        from django.utils import timezone
        end = self.resolved_at or timezone.now()
        return int((end - self.detected_at).total_seconds() / 60)


class IncidentUpdate(TimeStampedModel):
    """Timestamped status update on an incident (audit trail)."""

    incident = models.ForeignKey(Incident, on_delete=models.CASCADE, related_name='updates')
    author   = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    status   = models.CharField(max_length=16)
    message  = models.TextField()

    class Meta:
        ordering = ['created_at']


# ── Platform Activity / Audit ──────────────────────────────────────────────────

class PlatformActivityEvent(TimeStampedModel):
    """Audit trail event for developer-facing activity hub."""

    EVENT_TYPE_CHOICES = [
        ('pipeline_run',        'Pipeline Run'),
        ('pipeline_failed',     'Pipeline Failed'),
        ('deployment_started',  'Deployment Started'),
        ('deployment_succeeded','Deployment Succeeded'),
        ('deployment_failed',   'Deployment Failed'),
        ('config_changed',      'Config Changed'),
        ('alert_fired',         'Alert Fired'),
        ('alert_resolved',      'Alert Resolved'),
        ('incident_opened',     'Incident Opened'),
        ('incident_resolved',   'Incident Resolved'),
        ('kubernetes_sync',     'Kubernetes Sync'),
        ('user_login',          'User Login'),
        ('project_created',     'Project Created'),
        ('security_scan',       'Security Scan'),
    ]

    SEVERITY_CHOICES = [
        ('info',     'Info'),
        ('warning',  'Warning'),
        ('critical', 'Critical'),
    ]

    owner         = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activity_events')
    event_type    = models.CharField(max_length=32, choices=EVENT_TYPE_CHOICES)
    actor         = models.CharField(max_length=64, blank=True)
    project_id    = models.CharField(max_length=50, blank=True)
    project_name  = models.CharField(max_length=100, blank=True)
    resource_type = models.CharField(max_length=32, blank=True)   # pipeline | deployment | config | alert
    resource_id   = models.CharField(max_length=64, blank=True)
    resource_name = models.CharField(max_length=128, blank=True)
    environment   = models.CharField(max_length=32, blank=True)   # production | staging | dev
    description   = models.TextField(blank=True)
    before_state  = models.JSONField(default=dict, blank=True)
    after_state   = models.JSONField(default=dict, blank=True)
    ip_address    = models.GenericIPAddressField(null=True, blank=True)
    severity      = models.CharField(max_length=8, choices=SEVERITY_CHOICES, default='info')

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['owner', '-created_at']),
            models.Index(fields=['owner', 'event_type']),
            models.Index(fields=['owner', 'project_id']),
        ]

    def __str__(self):
        return f"[{self.severity.upper()}] {self.event_type} by {self.actor or 'system'}"


# ── SLO / SLA ─────────────────────────────────────────────────────────────────

class ServiceLevelObjective(ResourceModel):
    """SLO definition: target, error budget, burn-rate."""

    SLO_TYPE_CHOICES = [
        ('availability',  'Availability'),
        ('latency',       'Latency'),
        ('error_rate',    'Error Rate'),
        ('throughput',    'Throughput'),
        ('custom',        'Custom'),
    ]

    def save(self, *args, **kwargs):
        if not self.resource_id:
            self.resource_id = f'slo-{uuid.uuid4().hex[:12]}'
        super().save(*args, **kwargs)

    service         = models.CharField(max_length=64)
    slo_type        = models.CharField(max_length=20, choices=SLO_TYPE_CHOICES, default='availability')
    target_pct      = models.FloatField(default=99.9, help_text='SLO target as percentage')
    window_days     = models.IntegerField(default=30, help_text='Rolling window in days')
    current_value   = models.FloatField(default=100.0)
    error_budget_pct = models.FloatField(default=100.0, help_text='Remaining error budget %')
    burn_rate        = models.FloatField(default=0.0)
    breached         = models.BooleanField(default=False)
    last_calculated  = models.DateTimeField(null=True, blank=True)
    alert_on_breach  = models.BooleanField(default=True)
    alert_at_budget_pct = models.FloatField(default=10.0, help_text='Alert when budget drops below X%')

    class Meta:
        verbose_name = 'SLO'
        verbose_name_plural = 'SLOs'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.service} SLO: {self.target_pct}% ({self.slo_type})'


# ── Distributed Tracing Span ──────────────────────────────────────────────────

class TraceSpan(TimeStampedModel):
    """A single span in a distributed trace."""

    STATUS_CHOICES = [
        ('ok',      'OK'),
        ('error',   'Error'),
        ('timeout', 'Timeout'),
    ]

    owner         = models.ForeignKey(User, on_delete=models.CASCADE, related_name='trace_spans')
    trace_id      = models.CharField(max_length=64, db_index=True)
    span_id       = models.CharField(max_length=64, unique=True)
    parent_span_id = models.CharField(max_length=64, blank=True)
    operation_name = models.CharField(max_length=255)
    service_name   = models.CharField(max_length=128, db_index=True)
    start_time     = models.DateTimeField(db_index=True)
    duration_ms    = models.IntegerField(default=0)
    status         = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ok')
    tags           = models.JSONField(default=dict)
    logs           = models.JSONField(default=list)
    error_message  = models.TextField(blank=True)
    http_method    = models.CharField(max_length=10, blank=True)
    http_url       = models.CharField(max_length=512, blank=True)
    http_status_code = models.IntegerField(null=True, blank=True)
    db_type        = models.CharField(max_length=32, blank=True)
    db_statement   = models.TextField(blank=True)

    class Meta:
        ordering = ['-start_time']
        indexes = [
            models.Index(fields=['trace_id', 'start_time']),
            models.Index(fields=['service_name', 'start_time']),
            models.Index(fields=['owner', 'start_time']),
        ]

    def __str__(self):
        return f'{self.service_name}/{self.operation_name} ({self.duration_ms}ms)'


# ── DDoS Protection ───────────────────────────────────────────────────────────

class DDoSProtectionRule(ResourceModel):
    """DDoS mitigation rule."""

    RULE_TYPE_CHOICES = [
        ('rate_limit',  'Rate Limit'),
        ('geo_block',   'Geo Block'),
        ('ip_block',    'IP Block'),
        ('challenge',   'Challenge (CAPTCHA)'),
        ('managed',     'Managed Rule'),
    ]

    STATUS_CHOICES = [
        ('active',   'Active'),
        ('disabled', 'Disabled'),
        ('learning', 'Learning Mode'),
    ]

    def save(self, *args, **kwargs):
        if not self.resource_id:
            self.resource_id = f'ddos-{uuid.uuid4().hex[:10]}'
        super().save(*args, **kwargs)

    rule_type       = models.CharField(max_length=20, choices=RULE_TYPE_CHOICES, default='rate_limit')
    status          = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active', db_index=True)
    priority        = models.IntegerField(default=100)
    conditions      = models.JSONField(default=dict, help_text='Match conditions for this rule')
    rate_limit_rps  = models.IntegerField(null=True, blank=True, help_text='Requests per second limit')
    block_countries = models.JSONField(default=list, help_text='ISO country codes to block')
    block_ips       = models.JSONField(default=list, help_text='CIDR ranges to block')
    mitigations_count = models.BigIntegerField(default=0)
    last_triggered  = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'DDoS Rule'
        ordering = ['priority']

    def __str__(self):
        return f'{self.name} ({self.rule_type})'


class DDoSAttackEvent(TimeStampedModel):
    """Detected DDoS attack event."""

    ATTACK_TYPE_CHOICES = [
        ('volumetric',   'Volumetric'),
        ('protocol',     'Protocol'),
        ('application',  'Application Layer'),
        ('reflection',   'Reflection/Amplification'),
        ('botnet',       'Botnet'),
    ]

    STATUS_CHOICES = [
        ('detected',    'Detected'),
        ('mitigating',  'Mitigating'),
        ('mitigated',   'Mitigated'),
        ('false_positive', 'False Positive'),
    ]

    owner           = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ddos_events')
    attack_type     = models.CharField(max_length=20, choices=ATTACK_TYPE_CHOICES)
    status          = models.CharField(max_length=20, choices=STATUS_CHOICES, default='detected', db_index=True)
    source_ips      = models.JSONField(default=list)
    target_resource = models.CharField(max_length=255)
    target_region   = models.CharField(max_length=64, blank=True)
    peak_rps        = models.IntegerField(default=0)
    peak_bps        = models.BigIntegerField(default=0)
    packets_dropped = models.BigIntegerField(default=0)
    duration_secs   = models.IntegerField(default=0)
    started_at      = models.DateTimeField()
    ended_at        = models.DateTimeField(null=True, blank=True)
    rule_matched    = models.ForeignKey(DDoSProtectionRule, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        ordering = ['-started_at']

    def __str__(self):
        return f'{self.attack_type} attack on {self.target_resource} ({self.status})'


# ── Component Status (Service × Region) ──────────────────────────────────────

class ComponentStatus(TimeStampedModel):
    """
    Operational health for a single service within a specific region.
    Drives the Service × Region health grid on the Operational Page.
    """

    SERVICE_CHOICES = [
        ('compute',           'Compute Engine'),
        ('container_runtime', 'Container Runtime'),
        ('ci_cd',             'CI/CD Pipelines'),
        ('registry',          'Container Registry'),
        ('networking',        'Networking'),
        ('storage',           'Storage'),
        ('monitoring',        'Monitoring'),
        ('edge_robotics',     'Edge & Robotics'),
        ('database',          'Database'),
        ('dns',               'DNS'),
        ('cdn',               'CDN'),
        ('email',             'Email'),
        ('kubernetes',        'Kubernetes'),
        ('gpu_nodes',         'GPU Nodes'),
    ]

    STATUS_CHOICES = [
        ('operational',    'Operational'),
        ('degraded',       'Degraded Performance'),
        ('partial_outage', 'Partial Outage'),
        ('major_outage',   'Major Outage'),
        ('maintenance',    'Under Maintenance'),
    ]

    service    = models.CharField(max_length=64, choices=SERVICE_CHOICES, db_index=True)
    region     = models.CharField(max_length=64, db_index=True,
                                  help_text='Region code, e.g. us-east-1')
    status     = models.CharField(max_length=20, choices=STATUS_CHOICES, default='operational', db_index=True)
    uptime_pct = models.FloatField(default=100.0)
    latency_ms = models.FloatField(default=0.0)
    error_rate = models.FloatField(default=0.0)
    note       = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('service', 'region')
        ordering = ['service', 'region']
        verbose_name = 'Component Status'
        verbose_name_plural = 'Component Statuses'

    def __str__(self):
        return f'{self.service}/{self.region} – {self.status}'


# ── Running Process ───────────────────────────────────────────────────────────

class RunningProcess(TimeStampedModel):
    """
    Tracks actively-running platform processes (deployments, pipelines,
    automation tasks, GPU jobs, edge workloads) surfaced on the
    Operational Page's live-processes right sidebar.
    """

    PROCESS_TYPE_CHOICES = [
        ('deployment',  'Deployment'),
        ('pipeline',    'CI/CD Pipeline'),
        ('automation',  'Automation Task'),
        ('gpu_job',     'GPU Job'),
        ('edge_task',   'Edge / Robotics Task'),
        ('background',  'Background Task'),
        ('sync',        'Kubernetes Sync'),
    ]

    STATUS_CHOICES = [
        ('queued',     'Queued'),
        ('running',    'Running'),
        ('succeeded',  'Succeeded'),
        ('failed',     'Failed'),
        ('cancelled',  'Cancelled'),
    ]

    owner        = models.ForeignKey(User, on_delete=models.CASCADE, related_name='running_processes')
    process_type = models.CharField(max_length=20, choices=PROCESS_TYPE_CHOICES, db_index=True)
    name         = models.CharField(max_length=255)
    status       = models.CharField(max_length=16, choices=STATUS_CHOICES, default='running', db_index=True)
    region       = models.CharField(max_length=64, blank=True)
    cluster      = models.CharField(max_length=128, blank=True)
    environment  = models.CharField(max_length=64, blank=True)
    resource_id  = models.CharField(max_length=64, blank=True, db_index=True)
    resource_ref = models.CharField(max_length=255, blank=True,
                                    help_text='Human-readable resource name or path')
    progress_pct = models.IntegerField(default=0, help_text='0-100')
    logs_url     = models.CharField(max_length=512, blank=True)
    metrics_url  = models.CharField(max_length=512, blank=True)
    started_at   = models.DateTimeField(auto_now_add=True)
    finished_at  = models.DateTimeField(null=True, blank=True)
    meta         = models.JSONField(default=dict, blank=True,
                                    help_text='Extra metadata (branch, commit, etc.)')

    class Meta:
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['owner', 'status']),
            models.Index(fields=['process_type', 'status']),
        ]

    def __str__(self):
        return f'{self.process_type}: {self.name} [{self.status}]'

