# OrcaCloud – OpenStack Volume Service
#
# Wraps openstack.block_storage (Cinder) operations:
# volumes, snapshots, volume types, and server attachments.
#
# WORKSPACE-AWARE PATTERN
# ─────────────────────────────────────────────────────────────────────────────
# Every public function accepts an optional `conn` parameter:
#
#   conn=None   → falls back to get_connection() (legacy / admin views)
#   conn=<obj>  → uses the injected workspace-scoped connection

import logging
from typing import Any

import openstack.connection

from infrastructure.openstack_conn import get_connection

Connection = openstack.connection.Connection

logger = logging.getLogger(__name__)


# ── Volumes ───────────────────────────────────────────────────────────────────

def list_volumes(conn: Connection | None = None) -> list[dict]:
    """List all block storage volumes for the project."""
    conn = conn or get_connection()
    return [_volume_to_dict(v) for v in conn.block_storage.volumes(details=True)]


def get_volume(volume_id: str, conn: Connection | None = None) -> dict | None:
    """Fetch a volume by ID. Returns None if not found."""
    conn = conn or get_connection()
    vol = conn.block_storage.find_volume(volume_id, ignore_missing=True)
    return _volume_to_dict(vol) if vol else None


def create_volume(
    *,
    name: str,
    size_gb: int,
    volume_type: str | None = None,
    availability_zone: str | None = None,
    description: str = "",
    conn: Connection | None = None,
) -> dict:
    """
    Create a new block storage volume.

    Args:
        name:              Display name.
        size_gb:           Size in gigabytes (minimum 1).
        volume_type:       Optional volume type (e.g. 'SSD', 'HDD').
        availability_zone: Optional AZ placement.
        description:       Optional description.
        conn:              Pre-authenticated connection (workspace-scoped or global).

    Returns:
        Plain dict representation of the created volume.
    """
    conn = conn or get_connection()
    kwargs: dict[str, Any] = {
        "name":        name,
        "size":        size_gb,
        "description": description,
    }
    if volume_type:
        kwargs["volume_type"] = volume_type
    if availability_zone:
        kwargs["availability_zone"] = availability_zone

    vol = conn.block_storage.create_volume(**kwargs)
    logger.info("Created volume %s (%s) size=%dGB", vol.name, vol.id, size_gb)
    return _volume_to_dict(vol)


def delete_volume(volume_id: str, conn: Connection | None = None) -> None:
    """Delete a volume by ID. Silently succeeds if already gone."""
    conn = conn or get_connection()
    conn.block_storage.delete_volume(volume_id, ignore_missing=True)
    logger.info("Deleted volume %s", volume_id)


def attach_volume(*, server_id: str, volume_id: str, conn: Connection | None = None) -> dict:
    """
    Attach a volume to a server.
    Returns the volume attachment resource dict.
    """
    conn = conn or get_connection()
    attachment = conn.compute.create_volume_attachment(
        server_id,
        volumeId=volume_id,
    )
    logger.info("Attached volume %s to server %s", volume_id, server_id)
    return {
        "attachment_id": attachment.id,
        "server_id":     server_id,
        "volume_id":     volume_id,
        "device":        getattr(attachment, "device", None),
    }


def detach_volume(
    *,
    server_id: str,
    attachment_id: str,
    conn: Connection | None = None,
) -> None:
    """Detach a volume from a server."""
    conn = conn or get_connection()
    conn.compute.delete_volume_attachment(attachment_id, server_id)
    logger.info("Detached attachment %s from server %s", attachment_id, server_id)


# ── Snapshots ─────────────────────────────────────────────────────────────────

def list_snapshots(conn: Connection | None = None) -> list[dict]:
    """List all volume snapshots."""
    conn = conn or get_connection()
    return [
        {
            "id":          s.id,
            "name":        s.name,
            "status":      s.status,
            "size_gb":     s.size,
            "volume_id":   s.volume_id,
            "description": s.description,
            "created_at":  str(s.created_at) if hasattr(s, "created_at") else None,
        }
        for s in conn.block_storage.snapshots(details=True)
    ]


def create_snapshot(
    *,
    volume_id: str,
    name: str,
    description: str = "",
    force: bool = False,
    conn: Connection | None = None,
) -> dict:
    """Create a snapshot from an existing volume."""
    conn = conn or get_connection()
    snap = conn.block_storage.create_snapshot(
        volume_id=volume_id,
        name=name,
        description=description,
        force=force,
    )
    logger.info("Created snapshot %s from volume %s", snap.id, volume_id)
    return {
        "id":        snap.id,
        "name":      snap.name,
        "status":    snap.status,
        "volume_id": snap.volume_id,
        "size_gb":   snap.size,
    }


def delete_snapshot(snapshot_id: str, conn: Connection | None = None) -> None:
    """Delete a volume snapshot."""
    conn = conn or get_connection()
    conn.block_storage.delete_snapshot(snapshot_id, ignore_missing=True)
    logger.info("Deleted snapshot %s", snapshot_id)


# ── Volume Types ──────────────────────────────────────────────────────────────

def list_volume_types(conn: Connection | None = None) -> list[dict]:
    """List available volume types (storage tiers)."""
    conn = conn or get_connection()
    return [
        {"id": vt.id, "name": vt.name, "description": getattr(vt, "description", "")}
        for vt in conn.block_storage.types()
    ]


# ── Private helpers ────────────────────────────────────────────────────────────

def _volume_to_dict(v) -> dict:
    attachments = []
    for a in (v.attachments or []):
        attachments.append({
            "server_id":     a.get("server_id"),
            "attachment_id": a.get("attachment_id") or a.get("id"),
            "device":        a.get("device"),
        })
    return {
        "id":                v.id,
        "name":              v.name,
        "status":            v.status,
        "size_gb":           v.size,
        "volume_type":       v.volume_type,
        "availability_zone": v.availability_zone,
        "description":       v.description,
        "attachments":       attachments,
        "is_bootable":       getattr(v, "is_bootable", False),
        "created_at":        str(v.created_at) if hasattr(v, "created_at") else None,
    }
