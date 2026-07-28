# OrcaCloud – OpenStack DNS Service (Designate)
#
# Wraps openstack.dns (Designate) operations:
# zones, record sets, and reverse DNS mappings.
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


# ── Zones ──────────────────────────────────────────────────────────────────────

def list_zones(conn: Connection | None = None) -> list[dict]:
    """List all DNS zones in the project."""
    conn = conn or get_connection()
    return [_zone_to_dict(z) for z in conn.dns.zones()]


def get_zone(zone_id: str, conn: Connection | None = None) -> dict | None:
    """Get a DNS zone by ID or name. Returns None if not found."""
    conn = conn or get_connection()
    z = conn.dns.find_zone(zone_id, ignore_missing=True)
    return _zone_to_dict(z) if z else None


def create_zone(
    *,
    name: str,
    email: str,
    ttl: int = 300,
    zone_type: str = "PRIMARY",
    description: str = "",
    conn: Connection | None = None,
) -> dict:
    """
    Create a DNS zone.

    Args:
        name:       Fully qualified zone name (must end with '.').
        email:      SOA contact email.
        ttl:        Default TTL for records.
        zone_type:  'PRIMARY' (authoritative) or 'SECONDARY' (slave).
        description: Optional description.
    """
    conn = conn or get_connection()
    kwargs: dict[str, Any] = {
        "name":        name if name.endswith(".") else name + ".",
        "email":       email,
        "ttl":         ttl,
        "type":        zone_type,
        "description": description,
    }
    z = conn.dns.create_zone(**kwargs)
    logger.info("Created Designate zone %s (%s)", z.name, z.id)
    return _zone_to_dict(z)


def update_zone(zone_id: str, updates: dict, conn: Connection | None = None) -> dict:
    """Update mutable fields of a zone (ttl, email, description)."""
    conn = conn or get_connection()
    z = conn.dns.update_zone(zone_id, **updates)
    return _zone_to_dict(z)


def delete_zone(zone_id: str, conn: Connection | None = None) -> None:
    """Delete a DNS zone and all its record sets."""
    conn = conn or get_connection()
    conn.dns.delete_zone(zone_id, ignore_missing=True)
    logger.info("Deleted Designate zone %s", zone_id)


# ── Record Sets ────────────────────────────────────────────────────────────────

def list_recordsets(zone_id: str, conn: Connection | None = None) -> list[dict]:
    """List all record sets in a zone."""
    conn = conn or get_connection()
    return [_rrset_to_dict(r) for r in conn.dns.recordsets(zone_id)]


def get_recordset(zone_id: str, rrset_id: str, conn: Connection | None = None) -> dict | None:
    """Get a specific record set. Returns None if not found."""
    conn = conn or get_connection()
    r = conn.dns.find_recordset(zone_id, rrset_id, ignore_missing=True)
    return _rrset_to_dict(r) if r else None


def create_recordset(
    zone_id: str,
    *,
    name: str,
    type: str,
    records: list[str],
    ttl: int = 300,
    description: str = "",
    conn: Connection | None = None,
) -> dict:
    """
    Create a DNS record set in a zone.

    Args:
        zone_id:     Zone UUID.
        name:        FQDN of the record set (must end with '.').
        type:        Record type: 'A', 'AAAA', 'CNAME', 'MX', 'TXT', 'SRV', 'PTR', etc.
        records:     List of record data strings.
        ttl:         Time-to-live in seconds.
        description: Optional description.
    """
    conn = conn or get_connection()
    fqdn = name if name.endswith(".") else name + "."
    r = conn.dns.create_recordset(
        zone_id,
        name=fqdn,
        type=type,
        records=records,
        ttl=ttl,
        description=description,
    )
    logger.info("Created recordset %s %s in zone %s", type, fqdn, zone_id)
    return _rrset_to_dict(r)


def update_recordset(
    zone_id: str,
    rrset_id: str,
    updates: dict,
    conn: Connection | None = None,
) -> dict:
    """Update records or TTL of a record set."""
    conn = conn or get_connection()
    r = conn.dns.update_recordset(zone_id, rrset_id, **updates)
    return _rrset_to_dict(r)


def delete_recordset(zone_id: str, rrset_id: str, conn: Connection | None = None) -> None:
    """Delete a record set from a zone."""
    conn = conn or get_connection()
    conn.dns.delete_recordset(zone_id, rrset_id, ignore_missing=True)
    logger.info("Deleted recordset %s from zone %s", rrset_id, zone_id)


# ── Reverse PTR records ────────────────────────────────────────────────────────

def list_floatingip_ptrs(conn: Connection | None = None) -> list[dict]:
    """List PTR (reverse DNS) records for floating IPs."""
    conn = conn or get_connection()
    return [
        {
            "floatingip_id": p.floatingip_id,
            "ptrdname":      p.ptrdname,
            "ttl":           p.ttl,
            "address":       p.address,
        }
        for p in conn.dns.floating_ip_ptrs()
    ]


def set_floatingip_ptr(
    floatingip_id: str,
    *,
    ptrdname: str,
    ttl: int = 300,
    conn: Connection | None = None,
) -> dict:
    """
    Set a reverse DNS (PTR) record for a floating IP.

    Args:
        floatingip_id: Neutron floating IP UUID.
        ptrdname:      Fully qualified PTR target (must end with '.').
        ttl:           Time-to-live in seconds.
    """
    conn = conn or get_connection()
    fqdn = ptrdname if ptrdname.endswith(".") else ptrdname + "."
    p = conn.dns.set_floating_ip_ptr(floatingip_id, ptrdname=fqdn, ttl=ttl)
    logger.info("Set PTR %s for floating IP %s", fqdn, floatingip_id)
    return {"floatingip_id": floatingip_id, "ptrdname": fqdn, "ttl": ttl}


def unset_floatingip_ptr(floatingip_id: str, conn: Connection | None = None) -> None:
    """Remove the reverse DNS record for a floating IP."""
    conn = conn or get_connection()
    conn.dns.unset_floating_ip_ptr(floatingip_id)
    logger.info("Removed PTR record for floating IP %s", floatingip_id)


# ── Private helpers ────────────────────────────────────────────────────────────

def _zone_to_dict(z) -> dict:
    return {
        "id":          z.id,
        "name":        z.name,
        "type":        z.type,
        "status":      z.status,
        "email":       z.email,
        "ttl":         z.ttl,
        "serial":      z.serial,
        "description": z.description,
        "created_at":  str(z.created_at) if hasattr(z, "created_at") else None,
    }


def _rrset_to_dict(r) -> dict:
    return {
        "id":          r.id,
        "zone_id":     r.zone_id,
        "name":        r.name,
        "type":        r.type,
        "records":     list(r.records) if r.records else [],
        "ttl":         r.ttl,
        "status":      r.status,
        "description": r.description,
    }
