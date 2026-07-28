# OrcaCloud – OpenStack Instance HA Service (Masakari)
#
# Wraps openstack.instance_ha (Masakari) operations:
# segments, hosts, failover notifications, and recovery workflows.
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


# ── Segments ───────────────────────────────────────────────────────────────────

def list_segments(conn: Connection | None = None) -> list[dict]:
    """List all Masakari failover segments."""
    conn = conn or get_connection()
    return [_segment_to_dict(s) for s in conn.instance_ha.segments()]


def get_segment(segment_id: str, conn: Connection | None = None) -> dict | None:
    """Get a failover segment by UUID. Returns None if not found."""
    conn = conn or get_connection()
    s = conn.instance_ha.find_segment(segment_id, ignore_missing=True)
    return _segment_to_dict(s) if s else None


def create_segment(
    *,
    name: str,
    recovery_method: str,
    service_type: str,
    description: str = "",
    enabled: bool = True,
    conn: Connection | None = None,
) -> dict:
    """
    Create a Masakari failover segment.

    Args:
        name:             Segment display name.
        recovery_method:  'auto', 'reserved_host', 'auto_priority',
                          'rh_priority', 'auto_then_reserved_host'.
        service_type:     Nova service type hosting the compute nodes: 'COMPUTE'.
        description:      Optional description.
        enabled:          Enable automatic failover for this segment.
    """
    conn = conn or get_connection()
    s = conn.instance_ha.create_segment(
        name=name,
        recovery_method=recovery_method,
        service_type=service_type,
        description=description,
        is_enabled=enabled,
    )
    logger.info("Created Masakari segment %s (%s)", s.name, s.uuid)
    return _segment_to_dict(s)


def update_segment(segment_id: str, updates: dict, conn: Connection | None = None) -> dict:
    """Update a failover segment."""
    conn = conn or get_connection()
    s = conn.instance_ha.update_segment(segment_id, **updates)
    return _segment_to_dict(s)


def delete_segment(segment_id: str, conn: Connection | None = None) -> None:
    """Delete a Masakari failover segment."""
    conn = conn or get_connection()
    conn.instance_ha.delete_segment(segment_id, ignore_missing=True)
    logger.info("Deleted Masakari segment %s", segment_id)


# ── Hosts ──────────────────────────────────────────────────────────────────────

def list_hosts(segment_id: str, conn: Connection | None = None) -> list[dict]:
    """List compute hosts in a failover segment."""
    conn = conn or get_connection()
    return [_host_to_dict(h) for h in conn.instance_ha.hosts(segment_id)]


def get_host(segment_id: str, host_id: str, conn: Connection | None = None) -> dict | None:
    """Get a host in a segment by UUID. Returns None if not found."""
    conn = conn or get_connection()
    h = conn.instance_ha.find_host(segment_id, host_id, ignore_missing=True)
    return _host_to_dict(h) if h else None


def create_host(
    segment_id: str,
    *,
    name: str,
    type: str = "COMPUTE",
    control_attributes: str = "SSH",
    on_maintenance: bool = False,
    reserved: bool = False,
    conn: Connection | None = None,
) -> dict:
    """
    Register a compute host in a Masakari failover segment.

    Args:
        segment_id:         Segment UUID.
        name:               Nova compute host name (must match `nova-compute` host).
        type:               Host type — always 'COMPUTE' for compute nodes.
        control_attributes: Fencing mechanism: 'SSH', 'IPMI', 'REDFISH'.
        on_maintenance:     Mark host as under maintenance (skips auto-recovery).
        reserved:           Reserve this host as a standby for 'reserved_host' policy.
    """
    conn = conn or get_connection()
    h = conn.instance_ha.create_host(
        segment_id,
        name=name,
        type=type,
        control_attributes=control_attributes,
        on_maintenance=on_maintenance,
        reserved=reserved,
    )
    logger.info("Added host %s to Masakari segment %s", h.name, segment_id)
    return _host_to_dict(h)


def update_host(
    segment_id: str,
    host_id: str,
    updates: dict,
    conn: Connection | None = None,
) -> dict:
    """Update host properties (maintenance flag, reserved, control_attributes)."""
    conn = conn or get_connection()
    h = conn.instance_ha.update_host(segment_id, host_id, **updates)
    return _host_to_dict(h)


def delete_host(segment_id: str, host_id: str, conn: Connection | None = None) -> None:
    """Remove a host from a Masakari failover segment."""
    conn = conn or get_connection()
    conn.instance_ha.delete_host(segment_id, host_id, ignore_missing=True)
    logger.info("Deleted host %s from Masakari segment %s", host_id, segment_id)


# ── Notifications ──────────────────────────────────────────────────────────────

def list_notifications(
    *,
    status: str | None = None,
    source_host_uuid: str | None = None,
    conn: Connection | None = None,
) -> list[dict]:
    """
    List Masakari failure notifications.

    Args:
        status:           Filter by status: 'new', 'running', 'error',
                          'failed', 'ignored', 'finished'.
        source_host_uuid: Filter by the UUID of the reporting compute host.
    """
    conn = conn or get_connection()
    kwargs: dict[str, Any] = {}
    if status:
        kwargs["status"] = status
    if source_host_uuid:
        kwargs["source_host_uuid"] = source_host_uuid
    return [_notification_to_dict(n) for n in conn.instance_ha.notifications(**kwargs)]


def get_notification(
    notification_id: str,
    conn: Connection | None = None,
) -> dict | None:
    """Get a notification by UUID. Returns None if not found."""
    conn = conn or get_connection()
    n = conn.instance_ha.find_notification(notification_id, ignore_missing=True)
    return _notification_to_dict(n) if n else None


def create_notification(
    *,
    type: str,
    hostname: str,
    generated_time: str,
    source_host_uuid: str,
    payload: dict | None = None,
    conn: Connection | None = None,
) -> dict:
    """
    Submit a failure notification to Masakari.

    This is typically called by a monitoring daemon (e.g. pacemaker-remote)
    when it detects a host or process failure.

    Args:
        type:             Notification type: 'COMPUTE_HOST', 'VM', 'PROCESS'.
        hostname:         Name of the failing host.
        generated_time:   ISO 8601 datetime when the failure was detected.
        source_host_uuid: UUID of the Masakari host resource reporting the failure.
        payload:          Extra details for VM / PROCESS notifications.
    """
    conn = conn or get_connection()
    kwargs: dict[str, Any] = {
        "type":             type,
        "hostname":         hostname,
        "generated_time":   generated_time,
        "source_host_uuid": source_host_uuid,
        "payload":          payload or {},
    }
    n = conn.instance_ha.create_notification(**kwargs)
    logger.info(
        "Submitted Masakari notification %s (type=%s, host=%s)",
        n.notification_uuid, type, hostname,
    )
    return _notification_to_dict(n)


# ── Private helpers ────────────────────────────────────────────────────────────

def _segment_to_dict(s) -> dict:
    return {
        "uuid":            s.uuid,
        "name":            s.name,
        "description":     s.description,
        "recovery_method": s.recovery_method,
        "service_type":    s.service_type,
        "is_enabled":      s.is_enabled,
        "created_at":      str(s.created_at) if hasattr(s, "created_at") else None,
        "updated_at":      str(s.updated_at) if hasattr(s, "updated_at") else None,
    }


def _host_to_dict(h) -> dict:
    return {
        "uuid":               h.uuid,
        "name":               h.name,
        "type":               h.type,
        "control_attributes": h.control_attributes,
        "on_maintenance":     h.on_maintenance,
        "reserved":           h.reserved,
        "failover_segment_id": h.failover_segment_id,
        "created_at":         str(h.created_at) if hasattr(h, "created_at") else None,
    }


def _notification_to_dict(n) -> dict:
    return {
        "notification_uuid": n.notification_uuid,
        "type":              n.type,
        "hostname":          n.hostname,
        "source_host_uuid":  n.source_host_uuid,
        "status":            n.status,
        "generated_time":    str(n.generated_time) if hasattr(n, "generated_time") else None,
        "payload":           n.payload or {},
    }
