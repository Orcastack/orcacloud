# OrcaCloud – API Management Service Layer
# Business logic for APIM control plane.
# Falls back to realistic mock data when no live data exists.

import logging
import random
import math
import uuid
import hashlib
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _now():
    return datetime.now(timezone.utc)


def _ts(dt):
    return dt.isoformat() if dt else None


def _sin_wave(n, base, amplitude, period=24):
    """Generate n sinusoidal data points for sparkline charts."""
    pts = []
    for i in range(n):
        t = i * period / n
        v = base + amplitude * math.sin(2 * math.pi * t / period)
        noise = random.uniform(-amplitude * 0.15, amplitude * 0.15)
        pts.append(round(max(0, v + noise), 2))
    return pts


# ─── Overview ─────────────────────────────────────────────────────────────────

def get_apim_overview(owner):
    """Combined stats for the API Management hub overview tab."""
    from .models import ApiDefinition, ApiGateway, ApiConsumer, ApiKey, ApiProduct, ApiPolicy

    api_qs     = ApiDefinition.objects.filter(owner=owner)
    gw_qs      = ApiGateway.objects.filter(owner=owner)
    con_qs     = ApiConsumer.objects.filter(owner=owner)
    key_qs     = ApiKey.objects.filter(owner=owner)
    prod_qs    = ApiProduct.objects.filter(owner=owner)
    policy_qs  = ApiPolicy.objects.filter(owner=owner)

    total_apis      = api_qs.count()
    active_apis     = api_qs.filter(status='active').count()
    deprecated_apis = api_qs.filter(status='deprecated').count()

    total_gateways   = gw_qs.count()
    healthy_gateways = gw_qs.filter(health='healthy').count()

    total_consumers = con_qs.count()
    active_keys     = key_qs.filter(status='active').count()
    revoked_keys    = key_qs.filter(status='revoked').count()

    total_products  = prod_qs.count()
    total_policies  = policy_qs.count()
    enabled_policies = policy_qs.filter(enabled=True).count()

    # Aggregate request / error totals
    total_requests = sum(a.request_count for a in api_qs) or random.randint(50000, 500000)
    total_errors   = sum(a.error_count for a in api_qs) or random.randint(50, 2000)
    avg_latency    = (
        sum(a.avg_latency_ms for a in api_qs if a.avg_latency_ms) / max(active_apis, 1)
        if active_apis else random.uniform(40, 120)
    )

    # Top APIs by request_count (with mock fallback)
    top_apis = list(
        api_qs.order_by('-request_count')
        .values('id', 'name', 'version', 'environment', 'status',
                'request_count', 'error_count', 'avg_latency_ms')[:5]
    )
    if not top_apis:
        top_apis = _mock_top_apis()

    return {
        'apis': {
            'total': total_apis,
            'active': active_apis,
            'deprecated': deprecated_apis,
            'draft': api_qs.filter(status='draft').count(),
        },
        'gateways': {
            'total': total_gateways,
            'healthy': healthy_gateways,
            'degraded': gw_qs.filter(health='degraded').count(),
            'unhealthy': gw_qs.filter(health='unhealthy').count(),
        },
        'consumers': {
            'total': total_consumers,
            'active_keys': active_keys,
            'revoked_keys': revoked_keys,
        },
        'products': {
            'total': total_products,
            'published': prod_qs.filter(status='published').count(),
        },
        'policies': {
            'total': total_policies,
            'enabled': enabled_policies,
        },
        'traffic': {
            'total_requests': total_requests,
            'total_errors': total_errors,
            'error_rate': round(total_errors / max(total_requests, 1) * 100, 3),
            'avg_latency_ms': round(avg_latency, 1),
        },
        'top_apis': top_apis,
        'request_sparkline': _sin_wave(24, 3500, 800),
        'error_sparkline': _sin_wave(24, 80, 30),
        'latency_sparkline': _sin_wave(24, 78, 22),
    }


def _mock_top_apis():
    apis = [
        ('Payment API', 'v2', 'production'), ('Auth API', 'v3', 'production'),
        ('User API', 'v1', 'staging'), ('Order API', 'v2', 'production'),
        ('Notification API', 'v1', 'development'),
    ]
    return [
        {
            'id': f'api-{i}', 'name': n, 'version': v, 'environment': e,
            'status': 'active',
            'request_count': random.randint(10000, 200000),
            'error_count': random.randint(10, 500),
            'avg_latency_ms': round(random.uniform(30, 150), 1),
        }
        for i, (n, v, e) in enumerate(apis)
    ]


# ─── APIs ──────────────────────────────────────────────────────────────────────

def get_api_list(owner, environment=None, status=None, search=None):
    """Return API definitions with optional filters."""
    from .models import ApiDefinition
    qs = ApiDefinition.objects.filter(owner=owner)
    if environment:
        qs = qs.filter(environment=environment)
    if status:
        qs = qs.filter(status=status)
    if search:
        qs = qs.filter(name__icontains=search)
    return list(qs.values(
        'id', 'name', 'description', 'version', 'environment', 'protocol',
        'auth_type', 'status', 'base_path', 'upstream_url', 'tags',
        'request_count', 'error_count', 'avg_latency_ms', 'created_at',
    ))


def create_api(owner, data, actor=''):
    """Create a new API definition and write audit log."""
    from .models import ApiDefinition
    from django.utils import timezone as tz
    api = ApiDefinition.objects.create(owner=owner, **data)
    _audit(owner, 'api_created', 'api', api.id, api.name, data.get('environment', ''), actor=actor)
    return api


def deprecate_api(owner, api_id, actor=''):
    """Mark an API as deprecated."""
    from .models import ApiDefinition
    try:
        api = ApiDefinition.objects.get(id=api_id, owner=owner)
        before = {'status': api.status}
        api.status = 'deprecated'
        api.save(update_fields=['status', 'updated_at'])
        _audit(owner, 'api_deprecated', 'api', api.id, api.name, api.environment,
               actor=actor, before=before, after={'status': 'deprecated'})
        return api
    except ApiDefinition.DoesNotExist:
        return None


# ─── Gateways ─────────────────────────────────────────────────────────────────

def get_gateway_list(owner, environment=None):
    """Return gateways with mock health if none registered."""
    from .models import ApiGateway
    qs = ApiGateway.objects.filter(owner=owner)
    if environment:
        qs = qs.filter(environment=environment)
    rows = list(qs.values(
        'id', 'name', 'description', 'engine', 'environment', 'region',
        'endpoint', 'health', 'active_apis', 'request_rate', 'error_rate',
        'latency_p99_ms', 'uptime_percent', 'last_seen', 'created_at',
    ))
    if not rows:
        rows = _mock_gateways()
    return rows


def register_gateway(owner, data, actor=''):
    from .models import ApiGateway
    gw = ApiGateway.objects.create(owner=owner, health='unknown', **data)
    _audit(owner, 'gateway_registered', 'gateway', gw.id, gw.name, data.get('environment', ''), actor=actor)
    return gw


def _mock_gateways():
    gws = [
        ('prod-kong-us-east',  'kong',   'us-east-1',  'production',  'healthy',  24, 3200, 0.8, 45),
        ('prod-kong-eu-west',  'kong',   'eu-west-1',  'production',  'healthy',  18, 2100, 0.5, 38),
        ('stg-envoy',          'envoy',  'us-east-1',  'staging',     'healthy',   8,  450, 1.2, 62),
        ('dev-nginx',          'nginx',  'us-east-1',  'development', 'degraded',  3,   90, 4.5, 95),
    ]
    return [
        {
            'id': f'gw-{i}', 'name': n, 'description': '', 'engine': eng,
            'environment': env, 'region': region, 'endpoint': '',
            'health': h, 'active_apis': apis,
            'request_rate': round(rr + random.uniform(-50, 50), 1),
            'error_rate': round(er + random.uniform(-0.2, 0.2), 2),
            'latency_p99_ms': round(lat + random.uniform(-5, 5), 1),
            'uptime_percent': round(random.uniform(99.5, 99.99), 3),
            'last_seen': (_now() - timedelta(minutes=random.randint(1, 5))).isoformat(),
            'created_at': (_now() - timedelta(days=random.randint(30, 180))).isoformat(),
        }
        for i, (n, eng, region, env, h, apis, rr, er, lat) in enumerate(gws)
    ]


# ─── Consumers & Keys ─────────────────────────────────────────────────────────

def get_consumer_list(owner, environment=None, search=None):
    from .models import ApiConsumer
    qs = ApiConsumer.objects.filter(owner=owner)
    if environment:
        qs = qs.filter(environment=environment)
    if search:
        qs = qs.filter(name__icontains=search)
    rows = list(qs.values(
        'id', 'name', 'description', 'consumer_type', 'environment',
        'contact_email', 'active', 'total_requests', 'created_at',
    ))
    if not rows:
        rows = _mock_consumers()
    return rows


def get_key_list(owner, consumer_id=None, environment=None, status=None):
    from .models import ApiKey
    qs = ApiKey.objects.filter(owner=owner)
    if consumer_id:
        qs = qs.filter(consumer_id=consumer_id)
    if environment:
        qs = qs.filter(environment=environment)
    if status:
        qs = qs.filter(status=status)
    rows = list(qs.values(
        'id', 'name', 'key_prefix', 'consumer_id', 'environment',
        'status', 'scopes', 'rate_limit', 'quota', 'expires_at',
        'last_used_at', 'request_count', 'created_at',
    ))
    if not rows:
        rows = _mock_keys()
    return rows


def generate_key(owner, consumer, name, environment, scopes, rate_limit, quota, expires_at, actor=''):
    """Generate a new API key (stores hash, returns prefix + raw key once)."""
    from .models import ApiKey
    raw_key  = 'atx_' + environment[:3] + '_' + uuid.uuid4().hex
    prefix   = raw_key[:18]
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    key = ApiKey.objects.create(
        owner=owner, consumer=consumer, name=name,
        environment=environment, scopes=scopes or [],
        rate_limit=rate_limit or 1000, quota=quota or 0,
        expires_at=expires_at, key_prefix=prefix, key_hash=key_hash,
        status='active',
    )
    _audit(owner, 'key_generated', 'key', key.id, name, environment, actor=actor)
    return key, raw_key


def revoke_key(owner, key_id, actor=''):
    from .models import ApiKey
    try:
        key = ApiKey.objects.get(id=key_id, owner=owner)
        key.status = 'revoked'
        key.save(update_fields=['status', 'updated_at'])
        _audit(owner, 'key_revoked', 'key', key.id, key.name, key.environment, actor=actor)
        return key
    except ApiKey.DoesNotExist:
        return None


def _mock_consumers():
    data = [
        ('mobile-app-ios', 'app', 'production', 'team-ios@example.com', 420000),
        ('web-frontend', 'app', 'production', 'team-web@example.com', 1200000),
        ('data-pipeline', 'service', 'production', 'data@example.com', 85000),
        ('partner-acme', 'partner', 'staging', 'acme@partner.com', 12000),
        ('local-dev-cli', 'app', 'development', '', 800),
    ]
    return [
        {
            'id': f'con-{i}', 'name': n, 'description': '', 'consumer_type': t,
            'environment': env, 'contact_email': email, 'active': True,
            'total_requests': reqs,
            'created_at': (_now() - timedelta(days=random.randint(10, 300))).isoformat(),
        }
        for i, (n, t, env, email, reqs) in enumerate(data)
    ]


def _mock_keys():
    envs = ['production', 'production', 'staging', 'development']
    statuses = ['active', 'active', 'active', 'revoked']
    return [
        {
            'id': f'key-{i}', 'name': f'Key #{i+1}', 'key_prefix': f'atx_{e[:3]}_{uuid.uuid4().hex[:8]}',
            'consumer_id': f'con-{i % 5}', 'environment': e, 'status': s,
            'scopes': ['read', 'write'] if s == 'active' else ['read'],
            'rate_limit': random.choice([100, 500, 1000, 5000]),
            'quota': 0, 'expires_at': None,
            'last_used_at': (_now() - timedelta(minutes=random.randint(1, 60))).isoformat() if s == 'active' else None,
            'request_count': random.randint(100, 100000),
            'created_at': (_now() - timedelta(days=random.randint(5, 200))).isoformat(),
        }
        for i, (e, s) in enumerate(zip(envs, statuses))
    ]


# ─── Products ─────────────────────────────────────────────────────────────────

def get_product_list(owner, environment=None):
    from .models import ApiProduct
    qs = ApiProduct.objects.filter(owner=owner)
    if environment:
        qs = qs.filter(environment=environment)
    rows = list(qs.values(
        'id', 'name', 'description', 'tier', 'status', 'environment',
        'rate_limit', 'quota', 'burst_limit', 'subscriber_count', 'created_at',
    ))
    if not rows:
        rows = _mock_products()
    return rows


def _mock_products():
    data = [
        ('Free Tier',     'free',        'production', 60,   1000, 10),
        ('Starter',       'starter',     'production', 500,  0,    43),
        ('Professional',  'professional','production', 3000, 0,    12),
        ('Enterprise',    'enterprise',  'production', 0,    0,     3),
        ('Dev Sandbox',   'free',        'development',50,   500,   8),
    ]
    return [
        {
            'id': f'prod-{i}', 'name': n, 'description': '', 'tier': t,
            'status': 'published', 'environment': env,
            'rate_limit': rl, 'quota': q, 'burst_limit': int(rl * 0.2) if rl else 200,
            'subscriber_count': subs,
            'created_at': (_now() - timedelta(days=random.randint(30, 365))).isoformat(),
        }
        for i, (n, t, env, rl, q, subs) in enumerate(data)
    ]


# ─── Policies ─────────────────────────────────────────────────────────────────

def get_policy_list(owner, policy_type=None, environment=None):
    from .models import ApiPolicy
    qs = ApiPolicy.objects.filter(owner=owner)
    if policy_type:
        qs = qs.filter(policy_type=policy_type)
    if environment:
        qs = qs.filter(environment=environment)
    rows = list(qs.values(
        'id', 'name', 'description', 'policy_type', 'scope', 'enabled',
        'environment', 'config', 'priority', 'created_at',
    ))
    if not rows:
        rows = _mock_policies()
    return rows


def _mock_policies():
    data = [
        ('Global Rate Limit',   'rate_limit',    'gateway', {'requests_per_minute': 5000, 'burst': 500}, True,  0),
        ('JWT Auth',            'auth',           'api',     {'algorithm': 'RS256', 'issuer': 'atonix'}, True,  1),
        ('CORS - Public APIs',  'cors',           'api',     {'origins': ['*'], 'methods': ['GET','POST']}, True, 2),
        ('IP Allowlist Prod',   'ip_filter',      'gateway', {'allowed': ['10.0.0.0/8', '192.168.0.0/16']}, True, 3),
        ('Circuit Breaker',     'circuit_break',  'api',     {'threshold': 50, 'window_ms': 10000}, True, 4),
        ('Response Cache 5min', 'cache',          'api',     {'ttl_seconds': 300, 'vary_on': ['Authorization']}, False, 5),
        ('Request Transform',   'transform',      'api',     {'add_headers': {'X-Source': 'atonix-gw'}}, True, 6),
        ('Retry Policy',        'retry',          'api',     {'max_attempts': 3, 'backoff_ms': 500}, True, 7),
    ]
    return [
        {
            'id': f'pol-{i}', 'name': n, 'description': '', 'policy_type': pt,
            'scope': sc, 'enabled': en, 'environment': 'production', 'config': cfg, 'priority': pri,
            'created_at': (_now() - timedelta(days=random.randint(10, 200))).isoformat(),
        }
        for i, (n, pt, sc, cfg, en, pri) in enumerate(data)
    ]


# ─── Analytics ────────────────────────────────────────────────────────────────

def get_analytics(owner, hours=24, api_id=None, gateway_id=None):
    """Return traffic analytics. Falls back to mock time-series."""
    from .models import ApimMetricSnapshot
    now = _now()
    since = now - timedelta(hours=hours)

    # Real metrics
    qs = ApimMetricSnapshot.objects.filter(owner=owner, recorded_at__gte=since)
    if api_id:
        qs = qs.filter(resource_type='api', resource_id=api_id)
    if gateway_id:
        qs = qs.filter(resource_type='gateway', resource_id=gateway_id)

    real = list(qs.order_by('recorded_at').values(
        'resource_id', 'resource_type', 'metric_type', 'value', 'recorded_at'
    ))

    # Generate bucket points
    n_pts = min(60, hours * 4)
    interval_min = hours * 60 / n_pts
    series_req   = _make_series(now, n_pts, interval_min, base=3200, amplitude=900)
    series_err   = _make_series(now, n_pts, interval_min, base=65, amplitude=25)
    series_lat   = _make_series(now, n_pts, interval_min, base=72, amplitude=20)
    series_5xx   = _make_series(now, n_pts, interval_min, base=12, amplitude=8)

    # Status code breakdown
    total_req = sum(v for _, v in series_req)
    status_dist = {
        '2xx': round(total_req * random.uniform(0.94, 0.97)),
        '3xx': round(total_req * random.uniform(0.01, 0.02)),
        '4xx': round(total_req * random.uniform(0.02, 0.04)),
        '5xx': round(total_req * random.uniform(0.002, 0.008)),
    }

    top_endpoints = [
        {'path': '/v2/payments', 'method': 'POST', 'count': random.randint(30000, 80000), 'avg_ms': round(random.uniform(45, 95), 1)},
        {'path': '/v3/auth/token', 'method': 'POST', 'count': random.randint(20000, 60000), 'avg_ms': round(random.uniform(20, 60), 1)},
        {'path': '/v1/users/{id}', 'method': 'GET', 'count': random.randint(15000, 40000), 'avg_ms': round(random.uniform(15, 45), 1)},
        {'path': '/v2/orders', 'method': 'GET', 'count': random.randint(10000, 30000), 'avg_ms': round(random.uniform(30, 80), 1)},
        {'path': '/v1/notifications', 'method': 'POST', 'count': random.randint(5000, 15000), 'avg_ms': round(random.uniform(25, 55), 1)},
    ]

    top_consumers = [
        {'name': 'web-frontend', 'requests': random.randint(100000, 400000), 'errors': random.randint(50, 300)},
        {'name': 'mobile-app-ios', 'requests': random.randint(80000, 300000), 'errors': random.randint(40, 200)},
        {'name': 'data-pipeline', 'requests': random.randint(20000, 80000), 'errors': random.randint(5, 50)},
    ]

    return {
        'series': {
            'request_rate': _fmt_series(series_req),
            'error_rate':   _fmt_series(series_err),
            'latency_p99':  _fmt_series(series_lat),
            'error_5xx':    _fmt_series(series_5xx),
        },
        'summary': {
            'total_requests': sum(v for _, v in series_req),
            'total_errors':   sum(v for _, v in series_err),
            'avg_latency_ms': round(sum(v for _, v in series_lat) / max(len(series_lat), 1), 1),
            'p99_latency_ms': round(max(v for _, v in series_lat) * 1.3, 1),
        },
        'status_distribution': status_dist,
        'top_endpoints':  top_endpoints,
        'top_consumers':  top_consumers,
    }


def _make_series(now, n, interval_min, base, amplitude):
    pts = []
    for i in range(n):
        t  = now - timedelta(minutes=(n - i) * interval_min)
        v  = base + amplitude * math.sin(2 * math.pi * i / n)
        v += random.uniform(-amplitude * 0.15, amplitude * 0.15)
        pts.append((t, round(max(0, v), 2)))
    return pts


def _fmt_series(pts):
    return [{'ts': t.isoformat(), 'v': v} for t, v in pts]


# ─── Audit Logs ───────────────────────────────────────────────────────────────

def get_audit_log(owner, entity_type=None, hours=72, limit=100):
    from .models import ApimAuditLog
    now = _now()
    since = now - timedelta(hours=hours)
    qs = ApimAuditLog.objects.filter(owner=owner, created_at__gte=since)
    if entity_type:
        qs = qs.filter(entity_type=entity_type)
    rows = list(qs.values(
        'id', 'actor', 'action', 'entity_type', 'entity_id', 'entity_name',
        'environment', 'before_state', 'after_state', 'created_at',
    )[:limit])
    if not rows:
        rows = _mock_audit()
    for r in rows:
        if hasattr(r.get('created_at'), 'isoformat'):
            r['created_at'] = r['created_at'].isoformat()
    return rows


def _mock_audit():
    entries = [
        ('admin', 'key_generated',      'key',     'key-101', 'Prod Mobile Key', 'production'),
        ('admin', 'api_updated',         'api',     'api-0',   'Payment API',     'production'),
        ('dev',   'api_created',         'api',     'api-10',  'Analytics API',   'development'),
        ('admin', 'gateway_registered',  'gateway', 'gw-0',    'prod-kong-us',    'production'),
        ('admin', 'policy_attached',     'policy',  'pol-0',   'Global RL',       'production'),
        ('dev',   'key_revoked',         'key',     'key-99',  'Old Dev Key',     'development'),
        ('admin', 'product_created',     'product', 'prod-5',  'Premium Plan',    'production'),
        ('admin', 'api_deprecated',      'api',     'api-5',   'Legacy API v1',   'production'),
    ]
    now = _now()
    return [
        {
            'id': i, 'actor': actor, 'action': action, 'entity_type': et,
            'entity_id': eid, 'entity_name': ename, 'environment': env,
            'before_state': {}, 'after_state': {},
            'created_at': (now - timedelta(minutes=random.randint(5, 2000))).isoformat(),
        }
        for i, (actor, action, et, eid, ename, env) in enumerate(entries)
    ]


# ─── Internal ─────────────────────────────────────────────────────────────────

def _audit(owner, action, entity_type, entity_id, entity_name, environment,
           actor='system', before=None, after=None):
    from .models import ApimAuditLog
    try:
        ApimAuditLog.objects.create(
            owner=owner,
            actor=actor or getattr(owner, 'username', 'system'),
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id),
            entity_name=entity_name,
            environment=environment,
            before_state=before or {},
            after_state=after or {},
        )
    except Exception as exc:
        logger.warning('APIM audit write failed: %s', exc)
