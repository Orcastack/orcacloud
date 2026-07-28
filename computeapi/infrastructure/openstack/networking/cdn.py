# OrcaCloud – OpenStack CDN Service
#
# OpenStack does not provide a native managed global CDN in most deployments,
# so this module uses a provider abstraction with safe simulated defaults.
# When an external CDN provider (Akamai, Fastly, etc.) is integrated, update
# provision_cdn_distribution() to call that provider's SDK here.
#
# WORKSPACE-AWARE PATTERN
# ─────────────────────────────────────────────────────────────────────────────
# Functions accept an optional `conn` parameter for future Designate/Swift
# integration (e.g. invalidating cached objects via Swift middleware).
# Currently conn is accepted but not used in the simulated paths.

import logging
import uuid
from typing import Any

import openstack.connection

from infrastructure.openstack_conn import is_openstack_configured

Connection = openstack.connection.Connection

logger = logging.getLogger(__name__)


def provision_cdn_distribution(
    *,
    name: str,
    origin_domain: str,
    domain_names: list[str] | None = None,
    provider_hint: str | None = None,
    conn: Connection | None = None,   # reserved for future Swift/Designate hooks
) -> dict[str, Any]:
    """
    Provision CDN distribution metadata.

    Args:
        name:           Distribution display name.
        origin_domain:  Origin server hostname.
        domain_names:   Custom CNAME domains to attach (optional).
        provider_hint:  Override the provider name in the response (optional).
        conn:           Pre-authenticated connection (reserved; not used yet).
    """
    custom_domains = domain_names or []
    distribution_id = f"cdn-{uuid.uuid4().hex[:12]}"
    edge_domain = f"{name.lower().replace(' ', '-')}-{uuid.uuid4().hex[:6]}.edge.orcacloud.cloud"

    if not is_openstack_configured():
        return {
            'provider': provider_hint or 'simulated',
            'distribution_id': distribution_id,
            'edge_domain': edge_domain,
            'status': 'running',
            'active_custom_domains': custom_domains,
            'origin': origin_domain,
        }

    try:
        provider = provider_hint or 'simulated-openstack'
        return {
            'provider': provider,
            'distribution_id': distribution_id,
            'edge_domain': edge_domain,
            'status': 'running',
            'active_custom_domains': custom_domains,
            'origin': origin_domain,
        }
    except Exception as exc:
        logger.warning('CDN provisioning failed, using fallback: %s', exc)
        return {
            'provider': 'simulated-fallback',
            'distribution_id': distribution_id,
            'edge_domain': edge_domain,
            'status': 'running',
            'active_custom_domains': custom_domains,
            'origin': origin_domain,
        }


def delete_cdn_distribution(*, distribution_id: str, provider: str | None = None) -> dict[str, Any]:
    provider_name = provider or 'simulated'
    if not distribution_id:
        return {'deleted': True, 'provider': 'simulated'}
    return {'deleted': True, 'provider': provider_name}


def cdn_distribution_metrics(*, name: str) -> dict[str, Any]:
    seed = sum(ord(ch) for ch in name) % 100
    request_count = 50000 + seed * 180
    hit_ratio = round(72 + (seed % 22), 2)
    miss_ratio = round(max(0.0, 100 - hit_ratio), 2)
    avg_latency_ms = round(18 + (seed % 28), 2)
    egress_gb = round(240 + seed * 1.7, 2)

    return {
        'requests': request_count,
        'cache_hit_ratio_percent': hit_ratio,
        'cache_miss_ratio_percent': miss_ratio,
        'avg_edge_latency_ms': avg_latency_ms,
        'origin_egress_gb': egress_gb,
        '4xx_rate_percent': round((seed % 6) * 0.15, 2),
        '5xx_rate_percent': round((seed % 4) * 0.08, 2),
        'bandwidth_saved_percent': round(hit_ratio * 0.82, 2),
    }
