# OrcaCloud – API Management Models
# Control-plane data model for APIs, gateways, consumers, keys, products, policies.

import uuid
from django.db import models
from django.contrib.auth.models import User
from ..core.base_models import TimeStampedModel


def _uid(prefix):
    return f'{prefix}-{uuid.uuid4().hex[:12]}'


def _uid_api():
    return _uid('api')


def _uid_gw():
    return _uid('gw')


def _uid_con():
    return _uid('con')


def _uid_key():
    return _uid('key')


def _uid_prod():
    return _uid('prod')


def _uid_pol():
    return _uid('pol')


# ── Environment choices (shared) ──────────────────────────────────────────────

ENV_CHOICES = [
    ('development', 'Development'),
    ('staging',     'Staging'),
    ('production',  'Production'),
]


# ── API Definition ─────────────────────────────────────────────────────────────

class ApiDefinition(TimeStampedModel):
    """Represents a versioned API in the control plane."""

    PROTOCOL_CHOICES = [
        ('rest',    'REST'),
        ('graphql', 'GraphQL'),
        ('grpc',    'gRPC'),
        ('ws',      'WebSocket'),
    ]

    AUTH_CHOICES = [
        ('none',   'None'),
        ('apikey', 'API Key'),
        ('jwt',    'JWT'),
        ('oauth2', 'OAuth 2.0'),
        ('mtls',   'mTLS'),
        ('basic',  'Basic Auth'),
    ]

    STATUS_CHOICES = [
        ('draft',      'Draft'),
        ('active',     'Active'),
        ('deprecated', 'Deprecated'),
        ('retired',    'Retired'),
    ]

    id              = models.CharField(max_length=40, primary_key=True,
                                       default=_uid_api, editable=False)
    owner           = models.ForeignKey(User, on_delete=models.CASCADE, related_name='apim_apis')
    name            = models.CharField(max_length=150)
    description     = models.TextField(blank=True)
    version         = models.CharField(max_length=32, default='v1')
    environment     = models.CharField(max_length=16, choices=ENV_CHOICES, default='development')
    protocol        = models.CharField(max_length=16, choices=PROTOCOL_CHOICES, default='rest')
    auth_type       = models.CharField(max_length=16, choices=AUTH_CHOICES, default='apikey')
    status          = models.CharField(max_length=16, choices=STATUS_CHOICES, default='draft')
    base_path       = models.CharField(max_length=255, blank=True)          # e.g. /v1/payments
    upstream_url    = models.CharField(max_length=500, blank=True)          # backend service URL
    tags            = models.JSONField(default=list, blank=True)
    openapi_spec    = models.JSONField(default=dict, blank=True)            # inline OpenAPI JSON
    request_count   = models.BigIntegerField(default=0)
    error_count     = models.BigIntegerField(default=0)
    avg_latency_ms  = models.FloatField(default=0.0)

    class Meta:
        db_table = 'apim_api_definitions'
        ordering = ['-created_at']
        indexes  = [
            models.Index(fields=['owner', 'environment']),
            models.Index(fields=['owner', 'status']),
        ]

    def __str__(self):
        return f'{self.name} {self.version} [{self.environment}]'


# ── Gateway ────────────────────────────────────────────────────────────────────

class ApiGateway(TimeStampedModel):
    """Represents a registered API gateway instance."""

    ENGINE_CHOICES = [
        ('kong',    'Kong'),
        ('envoy',   'Envoy'),
        ('nginx',   'NGINX'),
        ('tyk',     'Tyk'),
        ('atonix',  'OrcaCloud Gateway'),
        ('aws_agw', 'AWS API Gateway'),
    ]

    HEALTH_CHOICES = [
        ('healthy',   'Healthy'),
        ('degraded',  'Degraded'),
        ('unhealthy', 'Unhealthy'),
        ('unknown',   'Unknown'),
    ]

    id              = models.CharField(max_length=40, primary_key=True,
                                       default=_uid_gw, editable=False)
    owner           = models.ForeignKey(User, on_delete=models.CASCADE, related_name='apim_gateways')
    name            = models.CharField(max_length=150)
    description     = models.TextField(blank=True)
    engine          = models.CharField(max_length=16, choices=ENGINE_CHOICES, default='atonix')
    environment     = models.CharField(max_length=16, choices=ENV_CHOICES, default='development')
    region          = models.CharField(max_length=64, default='us-east-1')
    endpoint        = models.CharField(max_length=500, blank=True)          # admin API URL
    health          = models.CharField(max_length=16, choices=HEALTH_CHOICES, default='unknown')
    active_apis     = models.IntegerField(default=0)
    request_rate    = models.FloatField(default=0.0)                        # req/s
    error_rate      = models.FloatField(default=0.0)                        # %
    latency_p99_ms  = models.FloatField(default=0.0)
    uptime_percent  = models.FloatField(default=100.0)
    last_seen       = models.DateTimeField(null=True, blank=True)
    config          = models.JSONField(default=dict, blank=True)            # gateway-specific config

    class Meta:
        db_table = 'apim_gateways'
        ordering = ['-created_at']
        indexes  = [models.Index(fields=['owner', 'environment', 'health'])]

    def __str__(self):
        return f'{self.name} ({self.engine}/{self.environment})'


# ── Gateway ↔ API link ─────────────────────────────────────────────────────────

class GatewayApiRoute(TimeStampedModel):
    """M2M: which APIs are routed through which gateway."""
    gateway = models.ForeignKey(ApiGateway, on_delete=models.CASCADE, related_name='routes')
    api     = models.ForeignKey(ApiDefinition, on_delete=models.CASCADE, related_name='gateway_routes')

    class Meta:
        db_table        = 'apim_gateway_api_routes'
        unique_together = ('gateway', 'api')


# ── Consumer ───────────────────────────────────────────────────────────────────

class ApiConsumer(TimeStampedModel):
    """An app, service, or team that consumes APIs."""

    CONSUMER_TYPE_CHOICES = [
        ('app',     'Application'),
        ('service', 'Service'),
        ('team',    'Team'),
        ('partner', 'Partner'),
        ('internal','Internal'),
    ]

    id              = models.CharField(max_length=40, primary_key=True,
                                       default=_uid_con, editable=False)
    owner           = models.ForeignKey(User, on_delete=models.CASCADE, related_name='apim_consumers')
    name            = models.CharField(max_length=150)
    description     = models.TextField(blank=True)
    consumer_type   = models.CharField(max_length=16, choices=CONSUMER_TYPE_CHOICES, default='app')
    environment     = models.CharField(max_length=16, choices=ENV_CHOICES, default='development')
    contact_email   = models.EmailField(blank=True)
    active          = models.BooleanField(default=True)
    total_requests  = models.BigIntegerField(default=0)
    metadata        = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'apim_consumers'
        ordering = ['-created_at']
        indexes  = [models.Index(fields=['owner', 'environment', 'active'])]

    def __str__(self):
        return f'{self.name} ({self.consumer_type})'


# ── API Key ────────────────────────────────────────────────────────────────────

class ApiKey(TimeStampedModel):
    """An API key issued to a consumer."""

    STATUS_CHOICES = [
        ('active',   'Active'),
        ('revoked',  'Revoked'),
        ('expired',  'Expired'),
        ('rotating', 'Rotating'),
    ]

    id              = models.CharField(max_length=40, primary_key=True,
                                       default=_uid_key, editable=False)
    consumer        = models.ForeignKey(ApiConsumer, on_delete=models.CASCADE, related_name='keys')
    owner           = models.ForeignKey(User, on_delete=models.CASCADE, related_name='apim_keys')
    name            = models.CharField(max_length=150)
    key_prefix      = models.CharField(max_length=16, blank=True)           # e.g. atx_prod_xxxx
    key_hash        = models.CharField(max_length=128, blank=True)          # bcrypt hash; never expose plaintext
    environment     = models.CharField(max_length=16, choices=ENV_CHOICES, default='development')
    status          = models.CharField(max_length=16, choices=STATUS_CHOICES, default='active')
    scopes          = models.JSONField(default=list, blank=True)            # ['read', 'write']
    rate_limit      = models.IntegerField(default=1000)                     # req/min
    quota           = models.IntegerField(default=0)                        # 0 = unlimited req/day
    expires_at      = models.DateTimeField(null=True, blank=True)
    last_used_at    = models.DateTimeField(null=True, blank=True)
    request_count   = models.BigIntegerField(default=0)

    class Meta:
        db_table = 'apim_api_keys'
        ordering = ['-created_at']
        indexes  = [
            models.Index(fields=['consumer', 'status']),
            models.Index(fields=['owner', 'environment', 'status']),
        ]

    def __str__(self):
        return f'{self.name} [{self.status}]'


# ── Product / Plan ─────────────────────────────────────────────────────────────

class ApiProduct(TimeStampedModel):
    """A bundle of APIs with a rate limit tier (plan)."""

    TIER_CHOICES = [
        ('free',       'Free'),
        ('starter',    'Starter'),
        ('professional','Professional'),
        ('enterprise', 'Enterprise'),
        ('custom',     'Custom'),
    ]

    STATUS_CHOICES = [
        ('draft',     'Draft'),
        ('published', 'Published'),
        ('archived',  'Archived'),
    ]

    id              = models.CharField(max_length=40, primary_key=True,
                                       default=_uid_prod, editable=False)
    owner           = models.ForeignKey(User, on_delete=models.CASCADE, related_name='apim_products')
    name            = models.CharField(max_length=150)
    description     = models.TextField(blank=True)
    tier            = models.CharField(max_length=16, choices=TIER_CHOICES, default='free')
    status          = models.CharField(max_length=16, choices=STATUS_CHOICES, default='draft')
    environment     = models.CharField(max_length=16, choices=ENV_CHOICES, default='development')
    rate_limit      = models.IntegerField(default=1000)                     # req/min
    quota           = models.IntegerField(default=0)                        # req/day; 0 = unlimited
    burst_limit     = models.IntegerField(default=200)                      # short burst window
    apis            = models.ManyToManyField(ApiDefinition, blank=True,
                                              related_name='products', through='ApiProductApi')
    subscriber_count = models.IntegerField(default=0)

    class Meta:
        db_table = 'apim_products'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.name} ({self.tier})'


class ApiProductApi(models.Model):
    """Through table for ApiProduct ↔ ApiDefinition M2M."""
    product = models.ForeignKey(ApiProduct, on_delete=models.CASCADE)
    api     = models.ForeignKey(ApiDefinition, on_delete=models.CASCADE)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table        = 'apim_product_apis'
        unique_together = ('product', 'api')


# ── Policy ─────────────────────────────────────────────────────────────────────

class ApiPolicy(TimeStampedModel):
    """A reusable policy that can be attached to gateways, APIs, or operations."""

    POLICY_TYPE_CHOICES = [
        ('rate_limit',   'Rate Limiting'),
        ('auth',         'Authentication'),
        ('cors',         'CORS'),
        ('transform',    'Transformation'),
        ('cache',        'Caching'),
        ('ip_filter',    'IP Filtering'),
        ('circuit_break','Circuit Breaker'),
        ('retry',        'Retry'),
        ('logging',      'Logging'),
        ('custom',       'Custom'),
    ]

    SCOPE_CHOICES = [
        ('gateway', 'Gateway'),
        ('api',     'API'),
        ('product', 'Product'),
    ]

    id              = models.CharField(max_length=40, primary_key=True,
                                       default=_uid_pol, editable=False)
    owner           = models.ForeignKey(User, on_delete=models.CASCADE, related_name='apim_policies')
    name            = models.CharField(max_length=150)
    description     = models.TextField(blank=True)
    policy_type     = models.CharField(max_length=20, choices=POLICY_TYPE_CHOICES, default='rate_limit')
    scope           = models.CharField(max_length=16, choices=SCOPE_CHOICES, default='api')
    enabled         = models.BooleanField(default=True)
    environment     = models.CharField(max_length=16, choices=ENV_CHOICES, default='development')
    config          = models.JSONField(default=dict, blank=True)            # policy-specific params
    priority        = models.IntegerField(default=0)                        # execution order

    class Meta:
        db_table = 'apim_policies'
        ordering = ['priority', '-created_at']
        indexes  = [models.Index(fields=['owner', 'policy_type', 'enabled'])]

    def __str__(self):
        return f'{self.name} ({self.policy_type})'


class ApiPolicyAttachment(TimeStampedModel):
    """Attaches a policy to a gateway or API."""
    policy      = models.ForeignKey(ApiPolicy, on_delete=models.CASCADE, related_name='attachments')
    gateway     = models.ForeignKey(ApiGateway, null=True, blank=True,
                                    on_delete=models.CASCADE, related_name='policy_attachments')
    api         = models.ForeignKey(ApiDefinition, null=True, blank=True,
                                    on_delete=models.CASCADE, related_name='policy_attachments')

    class Meta:
        db_table = 'apim_policy_attachments'


# ── Metric Snapshot ────────────────────────────────────────────────────────────

class ApimMetricSnapshot(TimeStampedModel):
    """Time-series metric snapshot for an API or gateway."""

    METRIC_TYPE_CHOICES = [
        ('request_rate',  'Request Rate (req/s)'),
        ('error_rate',    'Error Rate (%)'),
        ('latency_p50',   'Latency P50 (ms)'),
        ('latency_p95',   'Latency P95 (ms)'),
        ('latency_p99',   'Latency P99 (ms)'),
        ('bandwidth_in',  'Bandwidth In (bytes/s)'),
        ('bandwidth_out', 'Bandwidth Out (bytes/s)'),
        ('status_2xx',    'HTTP 2xx Count'),
        ('status_4xx',    'HTTP 4xx Count'),
        ('status_5xx',    'HTTP 5xx Count'),
    ]

    RESOURCE_TYPE_CHOICES = [('api', 'API'), ('gateway', 'Gateway')]

    owner         = models.ForeignKey(User, on_delete=models.CASCADE, related_name='apim_metrics')
    resource_type = models.CharField(max_length=16, choices=RESOURCE_TYPE_CHOICES)
    resource_id   = models.CharField(max_length=40)
    metric_type   = models.CharField(max_length=20, choices=METRIC_TYPE_CHOICES)
    value         = models.FloatField()
    recorded_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'apim_metric_snapshots'
        ordering = ['-recorded_at']
        indexes  = [
            models.Index(fields=['resource_id', 'metric_type', '-recorded_at']),
            models.Index(fields=['owner', '-recorded_at']),
        ]


# ── Audit Log ──────────────────────────────────────────────────────────────────

class ApimAuditLog(TimeStampedModel):
    """Immutable audit record for every control-plane action."""

    ACTION_CHOICES = [
        ('api_created',        'API Created'),
        ('api_updated',        'API Updated'),
        ('api_deprecated',     'API Deprecated'),
        ('api_deleted',        'API Deleted'),
        ('gateway_registered', 'Gateway Registered'),
        ('gateway_updated',    'Gateway Updated'),
        ('consumer_created',   'Consumer Created'),
        ('key_generated',      'Key Generated'),
        ('key_revoked',        'Key Revoked'),
        ('key_rotated',        'Key Rotated'),
        ('policy_attached',    'Policy Attached'),
        ('policy_detached',    'Policy Detached'),
        ('product_created',    'Product Created'),
        ('product_updated',    'Product Updated'),
    ]

    owner         = models.ForeignKey(User, on_delete=models.CASCADE, related_name='apim_audit_logs')
    actor         = models.CharField(max_length=64)
    action        = models.CharField(max_length=32, choices=ACTION_CHOICES)
    entity_type   = models.CharField(max_length=32)         # api | gateway | consumer | key | policy | product
    entity_id     = models.CharField(max_length=40, blank=True)
    entity_name   = models.CharField(max_length=150, blank=True)
    environment   = models.CharField(max_length=16, blank=True)
    before_state  = models.JSONField(default=dict, blank=True)
    after_state   = models.JSONField(default=dict, blank=True)
    ip_address    = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        db_table = 'apim_audit_logs'
        ordering = ['-created_at']
        indexes  = [
            models.Index(fields=['owner', '-created_at']),
            models.Index(fields=['entity_type', 'entity_id']),
        ]

    def __str__(self):
        return f'[{self.action}] {self.entity_type}/{self.entity_id} by {self.actor}'
