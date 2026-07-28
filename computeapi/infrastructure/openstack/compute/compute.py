# OrcaCloud – OpenStack Compute Service
#
# Wraps openstack.compute (Nova) operations: servers, flavors, images, keypairs.
#
# WORKSPACE-AWARE PATTERN
# ─────────────────────────────────────────────────────────────────────────────
# Every public function accepts an optional `conn` parameter:
#
#   conn=None   → falls back to get_connection() (legacy / admin views)
#   conn=<obj>  → uses the injected workspace-scoped connection
#                 (obtained via WorkspaceService.get_connection(binding))
#
# Always inject conn from a WorkspaceService binding in provisioning code
# to guarantee multi-tenant isolation.

import logging
from typing import Any

import openstack.connection

from infrastructure.openstack_conn import get_connection

Connection = openstack.connection.Connection

logger = logging.getLogger(__name__)


# ── Servers ───────────────────────────────────────────────────────────────────

def list_servers(conn: Connection | None = None) -> list[dict]:
    """
    List all servers visible to the authenticated project.
    Pass a workspace-scoped conn to restrict results to that project.
    """
    conn = conn or get_connection()
    servers = [_server_to_dict(s) for s in conn.compute.servers(details=True)]
    logger.info("list_servers returned %d results", len(servers))
    return servers


def get_server(server_id: str, conn: Connection | None = None) -> dict | None:
    """Fetch a single server by ID. Returns None if not found."""
    conn = conn or get_connection()
    server = conn.compute.find_server(server_id, ignore_missing=True)
    if server is None:
        return None
    return _server_to_dict(conn.compute.get_server(server.id))


def create_server(
    *,
    name: str,
    image_id: str,
    flavor_id: str,
    network_id: str,
    key_name: str | None = None,
    security_groups: list[str] | None = None,
    user_data: str | None = None,
    wait: bool = True,
    timeout: int = 300,
    conn: Connection | None = None,
) -> dict:
    """
    Create a new VM and optionally wait for it to reach ACTIVE status.

    Args:
        name:            Display name of the server.
        image_id:        OpenStack image UUID.
        flavor_id:       OpenStack flavor UUID.
        network_id:      Network UUID to attach on boot.
        key_name:        Name of an existing keypair (optional).
        security_groups: List of security group names (optional).
        user_data:       Cloud-init script, base64 or plain text (optional).
        wait:            Block until server reaches ACTIVE (default True).
        timeout:         Seconds to wait before raising TimeoutError.
        conn:            Pre-authenticated connection (workspace-scoped or global).

    Returns:
        Plain dict representation of the created server.
    """
    conn = conn or get_connection()

    server_kwargs: dict[str, Any] = {
        "name":     name,
        "image_id": image_id,
        "flavor_id": flavor_id,
        "networks": [{"uuid": network_id}],
    }
    if key_name:
        server_kwargs["key_name"] = key_name
    if security_groups:
        server_kwargs["security_groups"] = [{"name": sg} for sg in security_groups]
    if user_data:
        server_kwargs["user_data"] = user_data

    logger.info("Creating server name=%s image=%s flavor=%s network=%s", name, image_id, flavor_id, network_id)
    server = conn.compute.create_server(**server_kwargs)

    if wait:
        server = conn.compute.wait_for_server(server, timeout=timeout)
        logger.info("Server %s reached status %s", server.id, server.status)

    return _server_to_dict(server)


def delete_server(server_id: str, conn: Connection | None = None) -> None:
    """Delete a server by ID. Silently succeeds if already gone."""
    conn = conn or get_connection()
    conn.compute.delete_server(server_id, ignore_missing=True)
    logger.info("Deleted server %s", server_id)


def start_server(server_id: str, conn: Connection | None = None) -> None:
    """Start a SHUTOFF server."""
    conn = conn or get_connection()
    conn.compute.start_server(server_id)
    logger.info("Started server %s", server_id)


def stop_server(server_id: str, conn: Connection | None = None) -> None:
    """Stop (SHUTOFF) a running server."""
    conn = conn or get_connection()
    conn.compute.stop_server(server_id)
    logger.info("Stopped server %s", server_id)


def reboot_server(
    server_id: str,
    reboot_type: str = "SOFT",
    conn: Connection | None = None,
) -> None:
    """Reboot a server. reboot_type: 'SOFT' or 'HARD'."""
    conn = conn or get_connection()
    conn.compute.reboot_server(server_id, reboot_type=reboot_type)
    logger.info("Rebooted server %s (%s)", server_id, reboot_type)


# ── Keypairs ──────────────────────────────────────────────────────────────────

def list_keypairs(conn: Connection | None = None) -> list[dict]:
    """List all keypairs in the project."""
    conn = conn or get_connection()
    return [
        {"name": kp.name, "fingerprint": kp.fingerprint, "type": getattr(kp, "type", "ssh")}
        for kp in conn.compute.keypairs()
    ]


def create_keypair(
    name: str,
    public_key: str | None = None,
    conn: Connection | None = None,
) -> dict:
    """
    Import or generate an SSH keypair.
    If public_key is None, OpenStack generates a new key pair and returns the
    private key in the response (only available at creation time).
    """
    conn = conn or get_connection()
    kwargs: dict[str, Any] = {"name": name}
    if public_key:
        kwargs["public_key"] = public_key
    kp = conn.compute.create_keypair(**kwargs)
    result: dict[str, Any] = {"name": kp.name, "fingerprint": kp.fingerprint}
    if hasattr(kp, "private_key") and kp.private_key:
        result["private_key"] = kp.private_key
    logger.info("Created keypair %s", name)
    return result


def delete_keypair(name: str, conn: Connection | None = None) -> None:
    """Delete a keypair by name."""
    conn = conn or get_connection()
    conn.compute.delete_keypair(name, ignore_missing=True)
    logger.info("Deleted keypair %s", name)


# ── Flavors ───────────────────────────────────────────────────────────────────

def list_flavors(conn: Connection | None = None) -> list[dict]:
    """List all available compute flavors."""
    conn = conn or get_connection()
    return [_flavor_to_dict(f) for f in conn.compute.flavors()]


def get_flavor(flavor_id: str, conn: Connection | None = None) -> dict | None:
    """Fetch a single flavor by ID or name. Returns None if not found."""
    conn = conn or get_connection()
    flavor = conn.compute.find_flavor(flavor_id, ignore_missing=True)
    return _flavor_to_dict(flavor) if flavor else None


# ── Images ────────────────────────────────────────────────────────────────────

def list_images(conn: Connection | None = None) -> list[dict]:
    """List all images from the Image service (via Glance)."""
    conn = conn or get_connection()
    return [
        {
            "id":          img.id,
            "name":        img.name,
            "status":      img.status,
            "os_type":     img.properties.get("os_type") if img.properties else None,
            "size_gb":     round((img.size or 0) / (1024 ** 3), 2),
            "min_disk_gb": img.min_disk,
            "visibility":  img.visibility,
            "created_at":  str(img.created_at),
        }
        for img in conn.image.images()
    ]


def get_image(image_id: str, conn: Connection | None = None) -> dict | None:
    """Fetch a single image by ID. Returns None if not found."""
    conn = conn or get_connection()
    img = conn.image.find_image(image_id, ignore_missing=True)
    if img is None:
        return None
    return {
        "id":          img.id,
        "name":        img.name,
        "status":      img.status,
        "size_gb":     round((img.size or 0) / (1024 ** 3), 2),
        "min_disk_gb": img.min_disk,
        "visibility":  img.visibility,
    }


# ── Private helpers ────────────────────────────────────────────────────────────

def _server_to_dict(s) -> dict:
    addresses = {}
    if hasattr(s, "addresses") and s.addresses:
        for net, addrs in s.addresses.items():
            addresses[net] = [a.get("addr") for a in addrs]
    return {
        "id":           s.id,
        "name":         s.name,
        "status":       s.status,
        "flavor_id":    s.flavor.get("id") if isinstance(s.flavor, dict) else getattr(s, "flavor_id", None),
        "image_id":     s.image.get("id") if isinstance(s.image, dict) else getattr(s, "image_id", None),
        "addresses":    addresses,
        "key_name":     getattr(s, "key_name", None),
        "created_at":   str(s.created_at) if hasattr(s, "created_at") else None,
        "updated_at":   str(s.updated_at) if hasattr(s, "updated_at") else None,
        "availability_zone": getattr(s, "availability_zone", None),
        "power_state":  getattr(s, "power_state", None),
    }


def _flavor_to_dict(f) -> dict:
    return {
        "id":         f.id,
        "name":       f.name,
        "vcpus":      f.vcpus,
        "memory_mb":  f.ram,
        "disk_gb":    f.disk,
        "is_public":  f.is_public,
        "extra_specs": dict(f.extra_specs) if hasattr(f, "extra_specs") else {},
    }
