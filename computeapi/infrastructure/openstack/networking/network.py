# OrcaCloud – OpenStack Network Service
#
# Wraps openstack.network (Neutron) operations:
# VPCs (networks), subnets, security groups, floating IPs, and routers.
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


# ── Networks ──────────────────────────────────────────────────────────────────

def list_networks(conn: Connection | None = None) -> list[dict]:
    """List all networks visible to the project."""
    conn = conn or get_connection()
    return [_network_to_dict(n) for n in conn.network.networks()]


def get_network(network_id: str, conn: Connection | None = None) -> dict | None:
    """Fetch a network by ID or name. Returns None if not found."""
    conn = conn or get_connection()
    net = conn.network.find_network(network_id, ignore_missing=True)
    return _network_to_dict(net) if net else None


def get_network_by_name(name: str, conn: Connection | None = None) -> dict | None:
    """Fetch network by display name. Returns None if not found."""
    conn = conn or get_connection()
    net = conn.network.find_network(name, ignore_missing=True)
    return _network_to_dict(net) if net else None


def create_network(
    *,
    name: str,
    admin_state_up: bool = True,
    shared: bool = False,
    conn: Connection | None = None,
) -> dict:
    """Create a new private network."""
    conn = conn or get_connection()
    net = conn.network.create_network(
        name=name,
        admin_state_up=admin_state_up,
        shared=shared,
    )
    logger.info("Created network %s (%s)", net.name, net.id)
    return _network_to_dict(net)


def delete_network(network_id: str, conn: Connection | None = None) -> None:
    """Delete a network by ID."""
    conn = conn or get_connection()
    conn.network.delete_network(network_id, ignore_missing=True)
    logger.info("Deleted network %s", network_id)


# ── Subnets ───────────────────────────────────────────────────────────────────

def list_subnets(
    network_id: str | None = None,
    conn: Connection | None = None,
) -> list[dict]:
    """List all subnets, optionally filtered by network."""
    conn = conn or get_connection()
    kwargs: dict[str, Any] = {}
    if network_id:
        kwargs["network_id"] = network_id
    return [_subnet_to_dict(s) for s in conn.network.subnets(**kwargs)]


def create_subnet(
    *,
    network_id: str,
    name: str,
    cidr: str,
    ip_version: int = 4,
    enable_dhcp: bool = True,
    dns_nameservers: list[str] | None = None,
    conn: Connection | None = None,
) -> dict:
    """Create a subnet on the given network."""
    conn = conn or get_connection()
    kwargs: dict[str, Any] = {
        "name":        name,
        "network_id":  network_id,
        "cidr":        cidr,
        "ip_version":  ip_version,
        "enable_dhcp": enable_dhcp,
    }
    if dns_nameservers:
        kwargs["dns_nameservers"] = dns_nameservers
    subnet = conn.network.create_subnet(**kwargs)
    logger.info("Created subnet %s (%s) on network %s", subnet.name, subnet.id, network_id)
    return _subnet_to_dict(subnet)


# ── Security Groups ───────────────────────────────────────────────────────────

def list_security_groups(conn: Connection | None = None) -> list[dict]:
    """List all security groups for the project."""
    conn = conn or get_connection()
    return [_sg_to_dict(sg) for sg in conn.network.security_groups()]


def create_security_group(
    *,
    name: str,
    description: str = "",
    conn: Connection | None = None,
) -> dict:
    """Create a new security group."""
    conn = conn or get_connection()
    sg = conn.network.create_security_group(name=name, description=description)
    logger.info("Created security group %s (%s)", sg.name, sg.id)
    return _sg_to_dict(sg)


def add_security_group_rule(
    *,
    security_group_id: str,
    direction: str = "ingress",
    protocol: str | None = None,
    port_range_min: int | None = None,
    port_range_max: int | None = None,
    remote_ip_prefix: str | None = None,
    ethertype: str = "IPv4",
    conn: Connection | None = None,
) -> dict:
    """Add an ingress or egress rule to a security group."""
    conn = conn or get_connection()
    rule = conn.network.create_security_group_rule(
        security_group_id=security_group_id,
        direction=direction,
        protocol=protocol,
        port_range_min=port_range_min,
        port_range_max=port_range_max,
        remote_ip_prefix=remote_ip_prefix,
        ethertype=ethertype,
    )
    return {"id": rule.id, "direction": rule.direction, "protocol": rule.protocol}


# ── Floating IPs ──────────────────────────────────────────────────────────────

def list_floating_ips(conn: Connection | None = None) -> list[dict]:
    """List all floating IPs allocated to the project."""
    conn = conn or get_connection()
    return [
        {
            "id":          fip.id,
            "floating_ip": fip.floating_ip_address,
            "fixed_ip":    fip.fixed_ip_address,
            "status":      fip.status,
            "port_id":     fip.port_id,
        }
        for fip in conn.network.ips()
    ]


def allocate_floating_ip(
    external_network_name: str = "public",
    conn: Connection | None = None,
) -> dict:
    """Allocate a floating IP from the external network pool."""
    conn = conn or get_connection()
    ext_net = conn.network.find_network(external_network_name, ignore_missing=True)
    if ext_net is None:
        raise ValueError(f"External network '{external_network_name}' not found")
    fip = conn.network.create_ip(floating_network_id=ext_net.id)
    logger.info("Allocated floating IP %s", fip.floating_ip_address)
    return {"id": fip.id, "floating_ip": fip.floating_ip_address}


def release_floating_ip(fip_id: str, conn: Connection | None = None) -> None:
    """Release (deallocate) a floating IP back to the pool."""
    conn = conn or get_connection()
    conn.network.delete_ip(fip_id, ignore_missing=True)
    logger.info("Released floating IP %s", fip_id)


# ── Routers ───────────────────────────────────────────────────────────────────

def list_routers(conn: Connection | None = None) -> list[dict]:
    """List all routers for the project."""
    conn = conn or get_connection()
    return [
        {
            "id":     r.id,
            "name":   r.name,
            "status": r.status,
            "admin_state_up": r.is_admin_state_up,
        }
        for r in conn.network.routers()
    ]


def create_router(
    *,
    name: str,
    external_gateway_network: str | None = None,
    conn: Connection | None = None,
) -> dict:
    """Create a router, optionally connected to an external network gateway."""
    conn = conn or get_connection()
    kwargs: dict = {"name": name}
    if external_gateway_network:
        ext_net = conn.network.find_network(external_gateway_network, ignore_missing=True)
        if ext_net:
            kwargs["external_gateway_info"] = {"network_id": ext_net.id}
    router = conn.network.create_router(**kwargs)
    logger.info("Created router %s (%s)", router.name, router.id)
    return {"id": router.id, "name": router.name, "status": router.status}


def delete_router(router_id: str, conn: Connection | None = None) -> None:
    """Delete a router by ID."""
    conn = conn or get_connection()
    conn.network.delete_router(router_id, ignore_missing=True)
    logger.info("Deleted router %s", router_id)


# ── Private helpers ────────────────────────────────────────────────────────────

def _network_to_dict(n) -> dict:
    return {
        "id":             n.id,
        "name":           n.name,
        "status":         n.status,
        "admin_state_up": n.is_admin_state_up,
        "shared":         n.is_shared,
        "subnets":        list(n.subnet_ids) if n.subnet_ids else [],
        "created_at":     str(n.created_at) if hasattr(n, "created_at") else None,
    }


def _subnet_to_dict(s) -> dict:
    return {
        "id":          s.id,
        "name":        s.name,
        "network_id":  s.network_id,
        "cidr":        s.cidr,
        "ip_version":  s.ip_version,
        "enable_dhcp": s.is_dhcp_enabled,
        "gateway_ip":  s.gateway_ip,
    }


def _sg_to_dict(sg) -> dict:
    return {
        "id":          sg.id,
        "name":        sg.name,
        "description": sg.description,
        "rules":       [
            {
                "id":              r.get("id"),
                "direction":       r.get("direction"),
                "protocol":        r.get("protocol"),
                "port_range_min":  r.get("port_range_min"),
                "port_range_max":  r.get("port_range_max"),
                "remote_ip_prefix": r.get("remote_ip_prefix"),
            }
            for r in (sg.security_group_rules or [])
        ],
    }
