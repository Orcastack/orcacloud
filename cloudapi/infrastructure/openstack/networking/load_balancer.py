# OrcaCloud – OpenStack Load Balancer Service (Octavia)
#
# Wraps openstack.load_balancer (Octavia) operations:
# load balancers, listeners, pools, members, and health monitors.
#
# Simulated-fallback logic is preserved for dev / demo environments.
#
# WORKSPACE-AWARE PATTERN
# ─────────────────────────────────────────────────────────────────────────────
# Every public function accepts an optional `conn` parameter:
#
#   conn=None   → falls back to get_connection() (legacy / admin views)
#   conn=<obj>  → uses the injected workspace-scoped connection

import logging
import uuid
from typing import Any

import openstack.connection

from infrastructure.openstack_conn import get_connection, is_openstack_configured

Connection = openstack.connection.Connection

logger = logging.getLogger(__name__)


# ── Load Balancers ─────────────────────────────────────────────────────────────

def list_load_balancers(conn: Connection | None = None) -> list[dict]:
    """List all Octavia load balancers for the project."""
    conn = conn or get_connection()
    lb_proxy = getattr(conn, "load_balancer", None)
    if not lb_proxy:
        return []
    return [
        {
            "id":          lb.id,
            "name":        lb.name,
            "vip_address": lb.vip_address,
            "status":      lb.provisioning_status,
            "admin_state": lb.is_admin_state_up,
        }
        for lb in lb_proxy.load_balancers()
    ]


def get_load_balancer(lb_id: str, conn: Connection | None = None) -> dict | None:
    """Fetch a single load balancer by ID. Returns None if not found."""
    conn = conn or get_connection()
    lb_proxy = getattr(conn, "load_balancer", None)
    if not lb_proxy:
        return None
    lb = lb_proxy.find_load_balancer(lb_id, ignore_missing=True)
    if lb is None:
        return None
    return {
        "id":          lb.id,
        "name":        lb.name,
        "vip_address": lb.vip_address,
        "status":      lb.provisioning_status,
    }


def provision_load_balancer(
    *,
    name: str,
    scheme: str,
    subnets: list[str] | None = None,
    conn: Connection | None = None,
) -> dict[str, Any]:
    """
    Create/provision an Octavia load balancer.
    Falls back to simulated provisioning in local/dev environments without Octavia.

    Args:
        name:    Load balancer display name.
        scheme:  'internal' or 'internet-facing'.
        subnets: List of subnet UUIDs; first is used as the VIP subnet.
        conn:    Pre-authenticated connection (workspace-scoped or global).
    """
    lb_dns = f"{name}-{uuid.uuid4().hex[:6]}.lb.orcacloud.cloud"

    if not is_openstack_configured():
        return {
            "provider":    "simulated",
            "dns_name":    lb_dns,
            "status":      "running",
            "vip_address": f"10.0.{uuid.uuid4().int % 200}.{uuid.uuid4().int % 250}",
        }

    try:
        _conn = conn or get_connection()
        lb_proxy = getattr(_conn, "load_balancer", None)
        if not lb_proxy:
            raise RuntimeError("OpenStack load_balancer proxy not available")

        vip_subnet = (subnets or [None])[0]

        lb = lb_proxy.create_load_balancer(
            name=name,
            vip_subnet_id=vip_subnet,
            description=f"OrcaCloud {scheme} LB",
            admin_state_up=True,
        )
        logger.info("Created Octavia LB %s (%s)", name, getattr(lb, "id", ""))
        return {
            "provider":     "openstack-octavia",
            "dns_name":     lb_dns,
            "status":       "running",
            "vip_address":  getattr(lb, "vip_address", ""),
            "openstack_id": getattr(lb, "id", ""),
        }

    except Exception as exc:
        logger.warning("OpenStack LB provisioning failed, using simulated fallback: %s", exc)
        return {
            "provider":    "simulated-fallback",
            "dns_name":    lb_dns,
            "status":      "running",
            "vip_address": f"10.1.{uuid.uuid4().int % 200}.{uuid.uuid4().int % 250}",
        }


def delete_load_balancer(
    *,
    openstack_id: str | None,
    conn: Connection | None = None,
) -> dict[str, Any]:
    """Delete an Octavia load balancer by ID."""
    if not openstack_id:
        return {"provider": "simulated", "deleted": True}

    if not is_openstack_configured():
        return {"provider": "simulated", "deleted": True}

    try:
        _conn = conn or get_connection()
        lb_proxy = getattr(_conn, "load_balancer", None)
        if lb_proxy:
            lb_proxy.delete_load_balancer(openstack_id, ignore_missing=True)
            logger.info("Deleted Octavia LB %s", openstack_id)
        return {"provider": "openstack-octavia", "deleted": True}

    except Exception as exc:
        logger.warning("OpenStack LB deletion fallback: %s", exc)
        return {"provider": "simulated-fallback", "deleted": True}


def load_balancer_metrics(*, lb_name: str) -> dict[str, Any]:
    """Synthetic metrics for dashboard until telemetry pipeline is connected."""
    seed = sum(ord(ch) for ch in lb_name) % 50
    return {
        "latency_ms_p50":      25 + seed,
        "latency_ms_p95":      55 + seed,
        "request_rate_rps":    120 + seed * 3,
        "error_rate_percent":  round((seed % 5) * 0.2, 2),
        "healthy_targets":     max(1, 3 + seed % 4),
        "unhealthy_targets":   0 if seed % 6 else 1,
        "throughput_mbps":     80 + seed * 2,
    }
