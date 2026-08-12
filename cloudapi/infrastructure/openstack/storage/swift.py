# OrcaCloud – OpenStack Object Store (Swift)
#
# Wraps openstack.object_store (Swift) operations:
# containers (buckets), objects (files), temp URLs, and metadata.
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


# ── Containers (Buckets) ───────────────────────────────────────────────────────

def list_containers(conn: Connection | None = None) -> list[dict]:
    """List all Swift containers in the project account."""
    conn = conn or get_connection()
    return [
        {
            "name":         c.name,
            "count":        c.count,
            "bytes":        c.bytes,
        }
        for c in conn.object_store.containers()
    ]


def create_container(
    name: str,
    *,
    public_read: bool = False,
    metadata: dict | None = None,
    conn: Connection | None = None,
) -> dict:
    """
    Create a Swift container.

    Args:
        name:        Container name.
        public_read: Allow unauthenticated reads (sets X-Container-Read: .r:*).
        metadata:    Extra container metadata headers.
        conn:        Pre-authenticated connection.
    """
    conn = conn or get_connection()
    headers: dict[str, str] = {}
    if public_read:
        headers["x-container-read"] = ".r:*"
    if metadata:
        for k, v in metadata.items():
            headers[f"x-container-meta-{k}"] = str(v)

    conn.object_store.create_container(name)
    if headers:
        conn.object_store.set_container_metadata(name, **headers)

    logger.info("Created Swift container %s", name)
    return {"name": name, "public_read": public_read}


def delete_container(name: str, conn: Connection | None = None) -> None:
    """Delete a Swift container (must be empty)."""
    conn = conn or get_connection()
    conn.object_store.delete_container(name)
    logger.info("Deleted Swift container %s", name)


def get_container_metadata(name: str, conn: Connection | None = None) -> dict:
    """Return metadata headers for a container."""
    conn = conn or get_connection()
    return dict(conn.object_store.get_container_metadata(name))


# ── Objects (Files) ────────────────────────────────────────────────────────────

def list_objects(
    container: str,
    prefix: str | None = None,
    conn: Connection | None = None,
) -> list[dict]:
    """List objects in a container, optionally filtered by prefix."""
    conn = conn or get_connection()
    kwargs: dict[str, Any] = {}
    if prefix:
        kwargs["prefix"] = prefix
    return [
        {
            "name":          obj.name,
            "size_bytes":    obj.content_length,
            "content_type":  obj.content_type,
            "last_modified": obj.last_modified_at,
            "hash":          obj.etag,
        }
        for obj in conn.object_store.objects(container, **kwargs)
    ]


def upload_object(
    container: str,
    name: str,
    data: bytes,
    *,
    content_type: str = "application/octet-stream",
    metadata: dict | None = None,
    conn: Connection | None = None,
) -> dict:
    """
    Upload bytes as a Swift object.

    Args:
        container:    Target container name.
        name:         Object path/name within the container.
        data:         Raw bytes to upload.
        content_type: MIME type (default 'application/octet-stream').
        metadata:     Extra object metadata.
        conn:         Pre-authenticated connection.
    """
    conn = conn or get_connection()
    obj = conn.object_store.upload_object(
        container=container,
        name=name,
        data=data,
        content_type=content_type,
    )
    if metadata:
        conn.object_store.set_object_metadata(container, name, **{
            f"x-object-meta-{k}": str(v) for k, v in metadata.items()
        })
    logger.info("Uploaded object %s/%s (%d bytes)", container, name, len(data))
    return {"container": container, "name": name, "etag": getattr(obj, "etag", None)}


def download_object(
    container: str,
    name: str,
    conn: Connection | None = None,
) -> bytes:
    """Download a Swift object and return its bytes."""
    conn = conn or get_connection()
    return conn.object_store.download_object(container, name)


def delete_object(
    container: str,
    name: str,
    conn: Connection | None = None,
) -> None:
    """Delete a Swift object."""
    conn = conn or get_connection()
    conn.object_store.delete_object(name, container=container)
    logger.info("Deleted object %s/%s", container, name)


def copy_object(
    *,
    src_container: str,
    src_name: str,
    dst_container: str,
    dst_name: str,
    conn: Connection | None = None,
) -> dict:
    """Server-side copy of a Swift object."""
    conn = conn or get_connection()
    conn.object_store.copy_object(
        container=src_container,
        name=src_name,
        destination=f"/{dst_container}/{dst_name}",
    )
    logger.info("Copied %s/%s → %s/%s", src_container, src_name, dst_container, dst_name)
    return {"source": f"{src_container}/{src_name}", "destination": f"{dst_container}/{dst_name}"}


def generate_temp_url(
    container: str,
    name: str,
    *,
    expires_in_seconds: int = 3600,
    method: str = "GET",
    conn: Connection | None = None,
) -> str:
    """
    Generate a time-limited public URL for a Swift object.

    Args:
        container:           Container name.
        name:                Object name.
        expires_in_seconds:  URL TTL (default 1 hour).
        method:              HTTP method the URL allows ('GET' or 'PUT').
        conn:                Pre-authenticated connection.
    """
    conn = conn or get_connection()
    return conn.object_store.generate_temp_url(
        container=container,
        object=name,
        ttl=expires_in_seconds,
        method=method,
    )


def get_account_metadata(conn: Connection | None = None) -> dict:
    """Return Swift account-level metadata (total objects, bytes used, etc.)."""
    conn = conn or get_connection()
    return dict(conn.object_store.get_account_metadata())
