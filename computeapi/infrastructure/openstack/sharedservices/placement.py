# OrcaCloud – OpenStack Placement Service
#
# Wraps openstack.placement operations:
# resource providers, inventories, usages, resource classes, and traits.
#
# WORKSPACE-AWARE PATTERN
# ─────────────────────────────────────────────────────────────────────────────
# Every public function accepts an optional `conn` parameter.

import logging

import openstack.connection

from infrastructure.openstack_conn import get_connection

Connection = openstack.connection.Connection

logger = logging.getLogger(__name__)


# ── Resource Providers ─────────────────────────────────────────────────────────

def list_resource_providers(
    *,
    name: str | None = None,
    uuid: str | None = None,
    in_tree: str | None = None,
    conn: Connection | None = None,
) -> list[dict]:
    """
    List Placement resource providers.

    Args:
        name:    Filter by provider name (substring).
        uuid:    Filter by UUID.
        in_tree: UUID of root provider; returns entire subtree.
    """
    conn = conn or get_connection()
    kwargs: dict = {}
    if name:
        kwargs["name"] = name
    if uuid:
        kwargs["uuid"] = uuid
    if in_tree:
        kwargs["in_tree"] = in_tree
    return [_rp_to_dict(rp) for rp in conn.placement.resource_providers(**kwargs)]


def get_resource_provider(rp_id: str, conn: Connection | None = None) -> dict | None:
    """Get a resource provider by UUID. Returns None if not found."""
    conn = conn or get_connection()
    rp = conn.placement.find_resource_provider(rp_id, ignore_missing=True)
    return _rp_to_dict(rp) if rp else None


def create_resource_provider(
    *,
    name: str,
    uuid: str | None = None,
    parent_provider_uuid: str | None = None,
    conn: Connection | None = None,
) -> dict:
    """Create a custom resource provider (for nested provider trees)."""
    conn = conn or get_connection()
    kwargs: dict = {"name": name}
    if uuid:
        kwargs["uuid"] = uuid
    if parent_provider_uuid:
        kwargs["parent_provider_uuid"] = parent_provider_uuid
    rp = conn.placement.create_resource_provider(**kwargs)
    logger.info("Created resource provider %s (%s)", rp.name, rp.uuid)
    return _rp_to_dict(rp)


def delete_resource_provider(rp_id: str, conn: Connection | None = None) -> None:
    """Delete a resource provider."""
    conn = conn or get_connection()
    conn.placement.delete_resource_provider(rp_id, ignore_missing=True)
    logger.info("Deleted resource provider %s", rp_id)


# ── Inventories ────────────────────────────────────────────────────────────────

def get_resource_provider_inventories(
    rp_id: str,
    conn: Connection | None = None,
) -> list[dict]:
    """Get all resource inventories (capacity) for a provider."""
    conn = conn or get_connection()
    inventories = conn.placement.get_resource_provider_inventories(rp_id)
    result = []
    for resource_class, inv in (inventories.inventories or {}).items():
        result.append({
            "resource_class":    resource_class,
            "total":             inv.total,
            "reserved":          inv.reserved,
            "min_unit":          inv.min_unit,
            "max_unit":          inv.max_unit,
            "step_size":         inv.step_size,
            "allocation_ratio":  inv.allocation_ratio,
        })
    return result


def set_resource_provider_inventory(
    rp_id: str,
    *,
    resource_class: str,
    total: int,
    reserved: int = 0,
    min_unit: int = 1,
    max_unit: int | None = None,
    step_size: int = 1,
    allocation_ratio: float = 1.0,
    conn: Connection | None = None,
) -> None:
    """Set (create or update) inventory for a specific resource class on a provider."""
    conn = conn or get_connection()
    conn.placement.set_resource_provider_inventory(
        rp_id,
        resource_class=resource_class,
        total=total,
        reserved=reserved,
        min_unit=min_unit,
        max_unit=max_unit or total,
        step_size=step_size,
        allocation_ratio=allocation_ratio,
    )
    logger.info(
        "Set inventory for provider %s: %s=%d",
        rp_id, resource_class, total,
    )


# ── Usages ─────────────────────────────────────────────────────────────────────

def get_resource_provider_usages(
    rp_id: str,
    conn: Connection | None = None,
) -> list[dict]:
    """Get current allocations (usages) by resource class for a provider."""
    conn = conn or get_connection()
    usages = conn.placement.get_resource_provider_usages(rp_id)
    return [
        {"resource_class": rc, "used": used}
        for rc, used in (usages.usages or {}).items()
    ]


def get_project_usages(
    project_id: str,
    conn: Connection | None = None,
) -> list[dict]:
    """Get total resource usage for a project across all providers."""
    conn = conn or get_connection()
    usages = conn.placement.usages(project_id=project_id)
    return [
        {"resource_class": rc, "used": used}
        for rc, used in (usages.usages or {}).items()
    ]


# ── Allocations ────────────────────────────────────────────────────────────────

def get_allocations(consumer_uuid: str, conn: Connection | None = None) -> dict:
    """Get all allocations for a consumer (VM instance UUID)."""
    conn = conn or get_connection()
    allocs = conn.placement.get_allocations(consumer_uuid)
    return {
        "consumer_uuid": consumer_uuid,
        "allocations":   allocs.allocations or {},
    }


# ── Resource Classes ───────────────────────────────────────────────────────────

def list_resource_classes(conn: Connection | None = None) -> list[str]:
    """List all supported resource classes (standard + custom)."""
    conn = conn or get_connection()
    return [rc.name for rc in conn.placement.resource_classes()]


def create_custom_resource_class(name: str, conn: Connection | None = None) -> str:
    """
    Create a custom resource class.

    Custom class names must be prefixed with 'CUSTOM_'.
    Returns the resource class name.
    """
    conn = conn or get_connection()
    prefix = "CUSTOM_"
    rc_name = name if name.upper().startswith(prefix) else f"CUSTOM_{name.upper()}"
    conn.placement.create_resource_class(name=rc_name)
    logger.info("Created custom resource class %s", rc_name)
    return rc_name


def delete_custom_resource_class(name: str, conn: Connection | None = None) -> None:
    """Delete a custom resource class (must have no inventory)."""
    conn = conn or get_connection()
    conn.placement.delete_resource_class(name, ignore_missing=True)
    logger.info("Deleted resource class %s", name)


# ── Traits ─────────────────────────────────────────────────────────────────────

def list_traits(
    *,
    name: str | None = None,
    associated: bool | None = None,
    conn: Connection | None = None,
) -> list[str]:
    """
    List supported Placement traits.

    Args:
        name:       Filter by name (prefix match, e.g. 'COMPUTE_').
        associated: If True, only return traits associated with some provider.
    """
    conn = conn or get_connection()
    kwargs: dict = {}
    if name:
        kwargs["name"] = name
    if associated is not None:
        kwargs["associated"] = associated
    return [t.name for t in conn.placement.traits(**kwargs)]


def get_resource_provider_traits(
    rp_id: str,
    conn: Connection | None = None,
) -> list[str]:
    """List traits associated with a resource provider."""
    conn = conn or get_connection()
    traits = conn.placement.get_resource_provider_traits(rp_id)
    return [t.name for t in (traits.traits or [])]


def set_resource_provider_traits(
    rp_id: str,
    traits: list[str],
    conn: Connection | None = None,
) -> None:
    """
    Set (replace) the full trait list for a resource provider.

    Existing traits are overwritten; pass [] to clear all traits.
    """
    conn = conn or get_connection()
    conn.placement.set_resource_provider_traits(rp_id, traits=traits)
    logger.info("Set traits for provider %s: %s", rp_id, traits)


# ── Private helpers ────────────────────────────────────────────────────────────

def _rp_to_dict(rp) -> dict:
    return {
        "uuid":                  rp.uuid,
        "name":                  rp.name,
        "generation":            rp.generation,
        "parent_provider_uuid":  getattr(rp, "parent_provider_uuid", None),
        "root_provider_uuid":    getattr(rp, "root_provider_uuid", None),
    }
