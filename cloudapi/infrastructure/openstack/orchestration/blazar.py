# OrcaCloud – OpenStack Resource Reservation Service (Blazar)
#
# Wraps Blazar (blazar.reservation) operations:
# leases, hosts, instance reservations, and network segments.
#
# NOTE: The OpenStack SDK has limited Blazar proxy support.
# REST calls are made via the authenticated session.
#
# WORKSPACE-AWARE PATTERN
# ─────────────────────────────────────────────────────────────────────────────
# Every public function accepts an optional `conn` parameter.

import logging
from typing import Any

import openstack.connection

from infrastructure.openstack_conn import get_connection

Connection = openstack.connection.Connection

logger = logging.getLogger(__name__)

_BLAZAR_API_VERSION = "v1"


def _base_url(conn: Connection) -> str:
    """Resolve the Blazar service endpoint."""
    endpoint = conn.session.get_endpoint(
        service_type="reservation",
        interface="public",
    )
    return endpoint.rstrip("/") + f"/{_BLAZAR_API_VERSION}"


# ── Leases ─────────────────────────────────────────────────────────────────────

def list_leases(conn: Connection | None = None) -> list[dict]:
    """List all Blazar leases for the project."""
    conn = conn or get_connection()
    resp = conn.session.get(_base_url(conn) + "/leases")
    resp.raise_for_status()
    return resp.json().get("leases", [])


def get_lease(lease_id: str, conn: Connection | None = None) -> dict | None:
    """Get a lease by UUID. Returns None if not found."""
    conn = conn or get_connection()
    resp = conn.session.get(_base_url(conn) + f"/leases/{lease_id}")
    if resp.status_code == 404:
        return None
    resp.raise_for_status()
    return resp.json().get("lease")


def create_lease(
    *,
    name: str,
    start_date: str,
    end_date: str,
    reservations: list[dict],
    before_end_notification: str | None = None,
    events: list[dict] | None = None,
    conn: Connection | None = None,
) -> dict:
    """
    Create a Blazar lease.

    Args:
        name:                     Lease display name.
        start_date:               ISO 8601 datetime or 'now'.
        end_date:                 ISO 8601 datetime.
        reservations:             List of reservation specification dicts.
            For physical hosts:
                {"resource_type": "physical:host", "min": 1, "max": 1,
                 "hypervisor_properties": "", "resource_properties": ""}
            For instances:
                {"resource_type": "virtual:instance", "amount": 1,
                 "vcpus": 2, "memory_mb": 4096, "disk_gb": 40,
                 "affinity": False}
            For networks:
                {"resource_type": "virtual:network",
                 "network_name": "my_reserved_net"}
        before_end_notification:  ISO 8601 datetime for pre-end event trigger.
        events:                   Custom events list.
    """
    conn = conn or get_connection()
    payload: dict[str, Any] = {
        "name":         name,
        "start_date":   start_date,
        "end_date":     end_date,
        "reservations": reservations,
        "events":       events or [],
    }
    if before_end_notification:
        payload["before_end_notification"] = before_end_notification
    resp = conn.session.post(_base_url(conn) + "/leases", json=payload)
    resp.raise_for_status()
    data = resp.json().get("lease", {})
    logger.info("Created Blazar lease %s (%s)", name, data.get("id"))
    return data


def update_lease(lease_id: str, updates: dict, conn: Connection | None = None) -> dict:
    """
    Update a Blazar lease (name, end_date, before_end_notification).

    Only mutable fields that do not require re-scheduling can be changed.
    """
    conn = conn or get_connection()
    resp = conn.session.put(
        _base_url(conn) + f"/leases/{lease_id}",
        json=updates,
    )
    resp.raise_for_status()
    data = resp.json().get("lease", {})
    logger.info("Updated Blazar lease %s", lease_id)
    return data


def delete_lease(lease_id: str, conn: Connection | None = None) -> None:
    """Delete a Blazar lease and release all reserved resources."""
    conn = conn or get_connection()
    resp = conn.session.delete(_base_url(conn) + f"/leases/{lease_id}")
    if resp.status_code not in (200, 204, 404):
        resp.raise_for_status()
    logger.info("Deleted Blazar lease %s", lease_id)


# ── Hosts ──────────────────────────────────────────────────────────────────────

def list_hosts(conn: Connection | None = None) -> list[dict]:
    """List all physical hosts registered with Blazar."""
    conn = conn or get_connection()
    resp = conn.session.get(_base_url(conn) + "/os-hosts")
    resp.raise_for_status()
    return resp.json().get("hosts", [])


def get_host(host_id: str, conn: Connection | None = None) -> dict | None:
    """Get a Blazar host by UUID or name. Returns None if not found."""
    conn = conn or get_connection()
    resp = conn.session.get(_base_url(conn) + f"/os-hosts/{host_id}")
    if resp.status_code == 404:
        return None
    resp.raise_for_status()
    return resp.json().get("host")


def create_host(
    name: str,
    *,
    extra_capabilities: dict | None = None,
    conn: Connection | None = None,
) -> dict:
    """
    Register a physical host with Blazar.

    Args:
        name:                Nova host name (must match Nova compute host).
        extra_capabilities:  Key–value dict of arbitrary host properties for filtering.
    """
    conn = conn or get_connection()
    payload: dict[str, Any] = {"name": name}
    if extra_capabilities:
        payload.update(extra_capabilities)
    resp = conn.session.post(_base_url(conn) + "/os-hosts", json=payload)
    resp.raise_for_status()
    data = resp.json().get("host", {})
    logger.info("Registered host %s with Blazar (%s)", name, data.get("id"))
    return data


def delete_host(host_id: str, conn: Connection | None = None) -> None:
    """Remove a host from Blazar management."""
    conn = conn or get_connection()
    resp = conn.session.delete(_base_url(conn) + f"/os-hosts/{host_id}")
    if resp.status_code not in (200, 204, 404):
        resp.raise_for_status()
    logger.info("Deleted Blazar host %s", host_id)


# ── Reservable Networks ────────────────────────────────────────────────────────

def list_floatingips(conn: Connection | None = None) -> list[dict]:
    """List floating IPs registered for Blazar reservation."""
    conn = conn or get_connection()
    resp = conn.session.get(_base_url(conn) + "/floatingips")
    resp.raise_for_status()
    return resp.json().get("floatingips", [])
