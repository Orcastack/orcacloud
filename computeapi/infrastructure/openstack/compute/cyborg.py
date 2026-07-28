# OrcaCloud – OpenStack Accelerator Service (Cyborg)
#
# Wraps openstack.accelerator (Cyborg) operations:
# devices (GPUs, FPGAs, SmartNICs) and device profiles.
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


# ── Devices ────────────────────────────────────────────────────────────────────

def list_devices(conn: Connection | None = None) -> list[dict]:
    """List all accelerator devices registered with Cyborg."""
    conn = conn or get_connection()
    return [
        {
            "uuid":        d.uuid,
            "type":        d.type,
            "vendor":      d.vendor,
            "model":       d.model,
            "hostname":    d.hostname,
            "std_board_info": getattr(d, "std_board_info", {}),
        }
        for d in conn.accelerator.devices()
    ]


def get_device(device_id: str, conn: Connection | None = None) -> dict | None:
    """Fetch an accelerator device by UUID. Returns None if not found."""
    conn = conn or get_connection()
    d = conn.accelerator.find_device(device_id, ignore_missing=True)
    if d is None:
        return None
    return {
        "uuid":     d.uuid,
        "type":     d.type,
        "vendor":   d.vendor,
        "model":    d.model,
        "hostname": d.hostname,
    }


# ── Device Profiles ────────────────────────────────────────────────────────────

def list_device_profiles(conn: Connection | None = None) -> list[dict]:
    """List all Cyborg device profiles (accelerator resource requests)."""
    conn = conn or get_connection()
    return [
        {
            "uuid":  dp.uuid,
            "name":  dp.name,
            "groups": getattr(dp, "groups", []),
        }
        for dp in conn.accelerator.device_profiles()
    ]


def create_device_profile(
    *,
    name: str,
    groups: list[dict],
    conn: Connection | None = None,
) -> dict:
    """
    Create a device profile describing accelerator resource requirements.

    Args:
        name:   Profile name (referenced by Nova flavor extra_specs).
        groups: List of resource group dicts, each with 'resources' and
                optionally 'traits' keys, e.g.:
                [{"resources": {"ACCELERATOR_FPGA": 1}}]
        conn:   Pre-authenticated connection.
    """
    conn = conn or get_connection()
    dp = conn.accelerator.create_device_profile(name=name, groups=groups)
    logger.info("Created Cyborg device profile %s (%s)", dp.name, dp.uuid)
    return {"uuid": dp.uuid, "name": dp.name, "groups": dp.groups}


def delete_device_profile(profile_id: str, conn: Connection | None = None) -> None:
    """Delete a device profile by UUID."""
    conn = conn or get_connection()
    conn.accelerator.delete_device_profile(profile_id, ignore_missing=True)
    logger.info("Deleted Cyborg device profile %s", profile_id)


# ── Accelerator Requests (ARQs) ────────────────────────────────────────────────

def list_accelerator_requests(conn: Connection | None = None) -> list[dict]:
    """List accelerator requests (ARQs) for the project."""
    conn = conn or get_connection()
    return [
        {
            "uuid":           arq.uuid,
            "state":          arq.state,
            "device_profile_name": arq.device_profile_name,
            "instance_uuid":  arq.instance_uuid,
            "attach_handle":  getattr(arq, "attach_handle_info", {}),
        }
        for arq in conn.accelerator.accelerator_requests()
    ]


def create_accelerator_request(
    *,
    device_profile_name: str,
    conn: Connection | None = None,
) -> dict:
    """Request an accelerator for a VM via a device profile."""
    conn = conn or get_connection()
    arq = conn.accelerator.create_accelerator_request(
        device_profile_name=device_profile_name
    )
    logger.info("Created ARQ %s for profile %s", arq.uuid, device_profile_name)
    return {
        "uuid":  arq.uuid,
        "state": arq.state,
        "device_profile_name": arq.device_profile_name,
    }


def delete_accelerator_request(arq_id: str, conn: Connection | None = None) -> None:
    """Delete/release an accelerator request."""
    conn = conn or get_connection()
    conn.accelerator.delete_accelerator_request(arq_id, ignore_missing=True)
    logger.info("Deleted ARQ %s", arq_id)
