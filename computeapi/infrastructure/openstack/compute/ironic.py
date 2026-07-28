# OrcaCloud – OpenStack Bare Metal Service (Ironic)
#
# Wraps openstack.baremetal (Ironic) operations:
# nodes, ports, chassis, and provisioning.
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


# ── Nodes ──────────────────────────────────────────────────────────────────────

def list_nodes(conn: Connection | None = None) -> list[dict]:
    """List all Ironic bare metal nodes."""
    conn = conn or get_connection()
    return [_node_to_dict(n) for n in conn.baremetal.nodes()]


def get_node(node_id: str, conn: Connection | None = None) -> dict | None:
    """Fetch a bare metal node by UUID or name. Returns None if not found."""
    conn = conn or get_connection()
    node = conn.baremetal.find_node(node_id, ignore_missing=True)
    return _node_to_dict(node) if node else None


def create_node(
    *,
    driver: str,
    name: str | None = None,
    driver_info: dict | None = None,
    properties: dict | None = None,
    resource_class: str | None = None,
    conn: Connection | None = None,
) -> dict:
    """
    Register a new bare metal node with Ironic.

    Args:
        driver:         Ironic hardware driver (e.g. 'ipmi', 'redfish').
        name:           Human-readable name (optional).
        driver_info:    Driver-specific connection info (IPMI credentials, etc.).
        properties:     Hardware properties (cpus, memory_mb, local_gb, etc.).
        resource_class: Nova resource class (e.g. 'baremetal.LARGE').
        conn:           Pre-authenticated connection.
    """
    conn = conn or get_connection()
    kwargs: dict[str, Any] = {"driver": driver}
    if name:
        kwargs["name"] = name
    if driver_info:
        kwargs["driver_info"] = driver_info
    if properties:
        kwargs["properties"] = properties
    if resource_class:
        kwargs["resource_class"] = resource_class

    node = conn.baremetal.create_node(**kwargs)
    logger.info("Created Ironic node %s (%s)", node.name or "unnamed", node.uuid)
    return _node_to_dict(node)


def delete_node(node_id: str, conn: Connection | None = None) -> None:
    """Delete a bare metal node by UUID."""
    conn = conn or get_connection()
    conn.baremetal.delete_node(node_id, ignore_missing=True)
    logger.info("Deleted Ironic node %s", node_id)


def set_node_provision_state(
    node_id: str,
    target: str,
    conn: Connection | None = None,
) -> dict:
    """
    Trigger a provisioning state transition.

    Common targets: 'manage', 'provide', 'deploy', 'clean', 'undeploy', 'inspect'.
    """
    conn = conn or get_connection()
    conn.baremetal.set_node_provision_state(node_id, target)
    logger.info("Node %s → provision state %s", node_id, target)
    return {"node_id": node_id, "target": target, "accepted": True}


def set_node_power_state(
    node_id: str,
    target: str,
    conn: Connection | None = None,
) -> dict:
    """Set node power state: 'power on', 'power off', 'rebooting'."""
    conn = conn or get_connection()
    conn.baremetal.set_node_power_state(node_id, target)
    logger.info("Node %s → power state %s", node_id, target)
    return {"node_id": node_id, "target": target, "accepted": True}


# ── Ports ──────────────────────────────────────────────────────────────────────

def list_ports(node_id: str | None = None, conn: Connection | None = None) -> list[dict]:
    """List Ironic ports, optionally filtered by node."""
    conn = conn or get_connection()
    kwargs: dict[str, Any] = {}
    if node_id:
        kwargs["node_id"] = node_id
    return [
        {
            "uuid":       p.uuid,
            "address":    p.address,
            "node_uuid":  p.node_uuid,
            "pxe_enabled": p.is_pxe_enabled,
        }
        for p in conn.baremetal.ports(**kwargs)
    ]


def create_port(
    *,
    node_id: str,
    address: str,
    pxe_enabled: bool = True,
    conn: Connection | None = None,
) -> dict:
    """Register a network port (NIC) for a bare metal node."""
    conn = conn or get_connection()
    port = conn.baremetal.create_port(
        node_id=node_id,
        address=address,
        is_pxe_enabled=pxe_enabled,
    )
    logger.info("Created port %s on node %s", port.address, node_id)
    return {"uuid": port.uuid, "address": port.address, "node_uuid": port.node_uuid}


# ── Private helpers ────────────────────────────────────────────────────────────

def _node_to_dict(n) -> dict:
    return {
        "uuid":             n.uuid,
        "name":             n.name,
        "driver":           n.driver,
        "provision_state":  n.provision_state,
        "power_state":      n.power_state,
        "resource_class":   n.resource_class,
        "properties":       dict(n.properties) if n.properties else {},
        "maintenance":      n.is_maintenance,
        "created_at":       str(n.created_at) if hasattr(n, "created_at") else None,
    }
