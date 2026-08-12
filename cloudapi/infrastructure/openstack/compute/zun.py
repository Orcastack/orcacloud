# OrcaCloud – OpenStack Container Service (Zun)
#
# Wraps openstack.container (Zun) operations:
# containers, capsules (pod-like groups), images, and exec/logs.
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


# ── Containers ─────────────────────────────────────────────────────────────────

def list_containers(conn: Connection | None = None) -> list[dict]:
    """List all containers in the project."""
    conn = conn or get_connection()
    return [_container_to_dict(c) for c in conn.container.containers()]


def get_container(container_id: str, conn: Connection | None = None) -> dict | None:
    """Fetch a container by UUID. Returns None if not found."""
    conn = conn or get_connection()
    c = conn.container.find_container(container_id, ignore_missing=True)
    return _container_to_dict(c) if c else None


def create_container(
    *,
    name: str,
    image: str,
    command: str | None = None,
    cpu: float = 0.1,
    memory_mb: int = 128,
    environment: dict | None = None,
    labels: dict | None = None,
    auto_remove: bool = False,
    conn: Connection | None = None,
) -> dict:
    """
    Create and start a Zun container.

    Args:
        name:        Container name.
        image:       Docker image reference (e.g. 'nginx:latest').
        command:     Override CMD (optional).
        cpu:         CPU allocation (fractional cores).
        memory_mb:   RAM allocation in MiB.
        environment: Environment variables dict (optional).
        labels:      Metadata labels dict (optional).
        auto_remove: Delete container on stop (default False).
        conn:        Pre-authenticated connection.
    """
    conn = conn or get_connection()
    kwargs: dict[str, Any] = {
        "name":        name,
        "image":       image,
        "cpu":         cpu,
        "memory":      memory_mb,
        "auto_remove": auto_remove,
    }
    if command:
        kwargs["command"] = command
    if environment:
        kwargs["environment"] = environment
    if labels:
        kwargs["labels"] = labels

    c = conn.container.create_container(**kwargs)
    conn.container.run_container(c)
    logger.info("Created Zun container %s (%s)", c.name, c.uuid)
    return _container_to_dict(c)


def delete_container(container_id: str, conn: Connection | None = None) -> None:
    """Delete a container by UUID."""
    conn = conn or get_connection()
    conn.container.delete_container(container_id, ignore_missing=True)
    logger.info("Deleted container %s", container_id)


def start_container(container_id: str, conn: Connection | None = None) -> None:
    """Start a stopped container."""
    conn = conn or get_connection()
    conn.container.start_container(container_id)
    logger.info("Started container %s", container_id)


def stop_container(
    container_id: str,
    timeout: int = 10,
    conn: Connection | None = None,
) -> None:
    """Stop a running container."""
    conn = conn or get_connection()
    conn.container.stop_container(container_id, timeout=timeout)
    logger.info("Stopped container %s", container_id)


def get_container_logs(
    container_id: str,
    stdout: bool = True,
    stderr: bool = True,
    conn: Connection | None = None,
) -> str:
    """Retrieve stdout/stderr logs from a container."""
    conn = conn or get_connection()
    return conn.container.get_container_logs(
        container_id, stdout=stdout, stderr=stderr
    )


def execute_command(
    container_id: str,
    command: str,
    run: bool = True,
    conn: Connection | None = None,
) -> dict:
    """Execute a command inside a running container."""
    conn = conn or get_connection()
    result = conn.container.execute_container(container_id, command=command, run=run)
    return {"exit_code": result.exit_code, "output": result.output}


# ── Capsules (pod-like) ────────────────────────────────────────────────────────

def list_capsules(conn: Connection | None = None) -> list[dict]:
    """List all capsules (pod-like multi-container groups)."""
    conn = conn or get_connection()
    return [
        {
            "uuid":   cap.uuid,
            "name":   cap.meta_name,
            "status": cap.status,
        }
        for cap in conn.container.capsules()
    ]


# ── Private helpers ────────────────────────────────────────────────────────────

def _container_to_dict(c) -> dict:
    return {
        "uuid":       c.uuid,
        "name":       c.name,
        "image":      c.image,
        "status":     c.status,
        "cpu":        c.cpu,
        "memory_mb":  c.memory,
        "addresses":  getattr(c, "addresses", {}),
        "labels":     getattr(c, "labels", {}),
        "created_at": str(c.created_at) if hasattr(c, "created_at") else None,
    }
