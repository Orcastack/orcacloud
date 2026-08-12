# OrcaCloud – OpenStack Shared Filesystem Service (Manila)
#
# Wraps openstack.shared_file_system (Manila) operations:
# shares, share networks, access rules, and snapshots.
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


# ── Shares ─────────────────────────────────────────────────────────────────────

def list_shares(conn: Connection | None = None) -> list[dict]:
    """List all Manila shares in the project."""
    conn = conn or get_connection()
    return [_share_to_dict(s) for s in conn.shared_file_system.shares()]


def get_share(share_id: str, conn: Connection | None = None) -> dict | None:
    """Fetch a share by UUID. Returns None if not found."""
    conn = conn or get_connection()
    s = conn.shared_file_system.find_share(share_id, ignore_missing=True)
    return _share_to_dict(s) if s else None


def create_share(
    *,
    name: str,
    size_gb: int,
    share_proto: str = "NFS",
    share_type: str | None = None,
    share_network_id: str | None = None,
    description: str = "",
    is_public: bool = False,
    conn: Connection | None = None,
) -> dict:
    """
    Create a shared filesystem.

    Args:
        name:             Share display name.
        size_gb:          Size in gigabytes.
        share_proto:      Protocol: 'NFS', 'CIFS', 'CEPHFS', 'GLUSTERFS'.
        share_type:       Manila share type (optional).
        share_network_id: Share network UUID (required for DHSS=True drivers).
        description:      Optional description.
        is_public:        Make share visible to all projects.
        conn:             Pre-authenticated connection.
    """
    conn = conn or get_connection()
    kwargs: dict[str, Any] = {
        "name":        name,
        "size":        size_gb,
        "share_proto": share_proto,
        "description": description,
        "is_public":   is_public,
    }
    if share_type:
        kwargs["share_type"] = share_type
    if share_network_id:
        kwargs["share_network_id"] = share_network_id

    share = conn.shared_file_system.create_share(**kwargs)
    logger.info("Created Manila share %s (%s)", share.name, share.id)
    return _share_to_dict(share)


def delete_share(share_id: str, conn: Connection | None = None) -> None:
    """Delete a share by UUID."""
    conn = conn or get_connection()
    conn.shared_file_system.delete_share(share_id, ignore_missing=True)
    logger.info("Deleted Manila share %s", share_id)


def extend_share(share_id: str, new_size_gb: int, conn: Connection | None = None) -> None:
    """Extend a share to a larger size."""
    conn = conn or get_connection()
    conn.shared_file_system.extend_share(share_id, new_size=new_size_gb)
    logger.info("Extended share %s to %dGB", share_id, new_size_gb)


# ── Access Rules ───────────────────────────────────────────────────────────────

def list_access_rules(share_id: str, conn: Connection | None = None) -> list[dict]:
    """List access rules for a share."""
    conn = conn or get_connection()
    return [
        {
            "id":            r.id,
            "access_type":   r.access_type,
            "access_to":     r.access_to,
            "access_level":  r.access_level,
            "state":         r.state,
        }
        for r in conn.shared_file_system.access_rules(share_id)
    ]


def grant_access(
    share_id: str,
    *,
    access_type: str,
    access_to: str,
    access_level: str = "rw",
    conn: Connection | None = None,
) -> dict:
    """
    Grant access to a share.

    Args:
        share_id:     Share UUID.
        access_type:  'ip', 'user', 'cert', or 'cephx'.
        access_to:    IP, username, certificate CN, or CephX ID.
        access_level: 'rw' (read-write) or 'ro' (read-only).
    """
    conn = conn or get_connection()
    rule = conn.shared_file_system.create_access_rule(
        share_id,
        access_type=access_type,
        access_to=access_to,
        access_level=access_level,
    )
    logger.info("Granted %s access to share %s for %s", access_level, share_id, access_to)
    return {"id": rule.id, "access_type": rule.access_type, "access_to": rule.access_to}


def revoke_access(share_id: str, access_id: str, conn: Connection | None = None) -> None:
    """Revoke an access rule from a share."""
    conn = conn or get_connection()
    conn.shared_file_system.delete_access_rule(share_id, access_id)
    logger.info("Revoked access rule %s from share %s", access_id, share_id)


# ── Share Networks ─────────────────────────────────────────────────────────────

def list_share_networks(conn: Connection | None = None) -> list[dict]:
    """List all share networks for the project."""
    conn = conn or get_connection()
    return [
        {
            "id":         sn.id,
            "name":       sn.name,
            "neutron_net_id":    sn.neutron_net_id,
            "neutron_subnet_id": sn.neutron_subnet_id,
        }
        for sn in conn.shared_file_system.share_networks()
    ]


def create_share_network(
    *,
    name: str,
    neutron_net_id: str,
    neutron_subnet_id: str,
    description: str = "",
    conn: Connection | None = None,
) -> dict:
    """Create a share network linking Manila to a Neutron network."""
    conn = conn or get_connection()
    sn = conn.shared_file_system.create_share_network(
        name=name,
        neutron_net_id=neutron_net_id,
        neutron_subnet_id=neutron_subnet_id,
        description=description,
    )
    logger.info("Created share network %s (%s)", sn.name, sn.id)
    return {"id": sn.id, "name": sn.name}


# ── Share Snapshots ────────────────────────────────────────────────────────────

def create_share_snapshot(
    share_id: str,
    *,
    name: str,
    description: str = "",
    conn: Connection | None = None,
) -> dict:
    """Create a snapshot of a share."""
    conn = conn or get_connection()
    snap = conn.shared_file_system.create_share_snapshot(
        share_id=share_id,
        name=name,
        description=description,
    )
    logger.info("Created snapshot %s of share %s", snap.id, share_id)
    return {"id": snap.id, "name": snap.name, "status": snap.status, "share_id": share_id}


def delete_share_snapshot(snapshot_id: str, conn: Connection | None = None) -> None:
    """Delete a share snapshot."""
    conn = conn or get_connection()
    conn.shared_file_system.delete_share_snapshot(snapshot_id, ignore_missing=True)
    logger.info("Deleted share snapshot %s", snapshot_id)


# ── Share Types ────────────────────────────────────────────────────────────────

def list_share_types(conn: Connection | None = None) -> list[dict]:
    """List available Manila share types."""
    conn = conn or get_connection()
    return [
        {
            "id":          st.id,
            "name":        st.name,
            "is_default":  st.is_default,
            "extra_specs": dict(st.extra_specs) if st.extra_specs else {},
        }
        for st in conn.shared_file_system.share_types()
    ]


# ── Private helpers ────────────────────────────────────────────────────────────

def _share_to_dict(s) -> dict:
    return {
        "id":               s.id,
        "name":             s.name,
        "status":           s.status,
        "size_gb":          s.size,
        "share_proto":      s.share_proto,
        "share_type":       s.share_type,
        "export_locations": getattr(s, "export_locations", []),
        "is_public":        s.is_public,
        "availability_zone": s.availability_zone,
        "created_at":       str(s.created_at) if hasattr(s, "created_at") else None,
    }
