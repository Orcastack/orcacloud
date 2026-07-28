# OrcaCloud – OpenStack Messaging Service (Zaqar)
#
# NOTE: The OpenStack SDK has limited Zaqar proxy support.
# This module uses the authenticated session's REST calls as a fallback
# alongside any available SDK methods.
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

_ZAQAR_API_VERSION = "v2"


def _base_url(conn: Connection) -> str:
    """Resolve the Zaqar service endpoint for the current session."""
    endpoint = conn.session.get_endpoint(
        service_type="messaging",
        interface="public",
    )
    return endpoint.rstrip("/") + f"/{_ZAQAR_API_VERSION}"


# ── Queues ─────────────────────────────────────────────────────────────────────

def list_queues(conn: Connection | None = None) -> list[dict]:
    """List all Zaqar queues in the project."""
    conn = conn or get_connection()
    url = _base_url(conn) + "/queues"
    resp = conn.session.get(url)
    resp.raise_for_status()
    data = resp.json()
    return data.get("queues", [])


def create_queue(
    name: str,
    *,
    metadata: dict | None = None,
    conn: Connection | None = None,
) -> dict:
    """
    Create a Zaqar queue.

    Args:
        name:     Queue name (up to 64 alphanumeric / hyphen / underscore chars).
        metadata: Optional dict of queue metadata (ttl, max_messages_post_size, etc.).
    """
    conn = conn or get_connection()
    url = _base_url(conn) + f"/queues/{name}"
    resp = conn.session.put(url, json=metadata or {})
    resp.raise_for_status()
    logger.info("Created Zaqar queue %s", name)
    return {"name": name, "metadata": metadata or {}}


def delete_queue(name: str, conn: Connection | None = None) -> None:
    """Delete a Zaqar queue and all its messages."""
    conn = conn or get_connection()
    url = _base_url(conn) + f"/queues/{name}"
    resp = conn.session.delete(url)
    if resp.status_code not in (200, 204, 404):
        resp.raise_for_status()
    logger.info("Deleted Zaqar queue %s", name)


def get_queue_metadata(name: str, conn: Connection | None = None) -> dict:
    """Get metadata for a queue."""
    conn = conn or get_connection()
    url = _base_url(conn) + f"/queues/{name}/metadata"
    resp = conn.session.get(url)
    resp.raise_for_status()
    return resp.json()


def set_queue_metadata(
    name: str,
    metadata: dict,
    conn: Connection | None = None,
) -> dict:
    """Replace all metadata for a queue."""
    conn = conn or get_connection()
    url = _base_url(conn) + f"/queues/{name}/metadata"
    resp = conn.session.put(url, json=metadata)
    resp.raise_for_status()
    return metadata


def get_queue_stats(name: str, conn: Connection | None = None) -> dict:
    """Get message statistics for a queue."""
    conn = conn or get_connection()
    url = _base_url(conn) + f"/queues/{name}/stats"
    resp = conn.session.get(url)
    resp.raise_for_status()
    return resp.json()


# ── Messages ───────────────────────────────────────────────────────────────────

def post_messages(
    queue_name: str,
    messages: list[dict],
    client_id: str,
    conn: Connection | None = None,
) -> dict:
    """
    Post messages to a Zaqar queue.

    Args:
        queue_name: Target queue.
        messages:   List of {body: Any, ttl: int} dicts.
        client_id:  Unique client UUID (required by Zaqar for deduplication).
    """
    conn = conn or get_connection()
    url = _base_url(conn) + f"/queues/{queue_name}/messages"
    headers = {"Client-ID": client_id}
    resp = conn.session.post(url, json={"messages": messages}, headers=headers)
    resp.raise_for_status()
    data = resp.json()
    logger.info("Posted %d message(s) to queue %s", len(messages), queue_name)
    return data


def get_messages(
    queue_name: str,
    client_id: str,
    *,
    limit: int = 10,
    echo: bool = False,
    include_claimed: bool = False,
    conn: Connection | None = None,
) -> list[dict]:
    """
    Retrieve a batch of messages from a queue.

    Args:
        client_id:       Unique client UUID.
        limit:           Max messages to return (1–25).
        echo:            If True, return messages posted by this client.
        include_claimed: If True, include claimed messages.
    """
    conn = conn or get_connection()
    url = _base_url(conn) + f"/queues/{queue_name}/messages"
    headers = {"Client-ID": client_id}
    params = {"limit": limit, "echo": echo, "include_claimed": include_claimed}
    resp = conn.session.get(url, headers=headers, params=params)
    resp.raise_for_status()
    return resp.json().get("messages", [])


def delete_messages(
    queue_name: str,
    message_ids: list[str],
    client_id: str,
    conn: Connection | None = None,
) -> None:
    """Delete specific messages by ID."""
    conn = conn or get_connection()
    url = _base_url(conn) + f"/queues/{queue_name}/messages"
    headers = {"Client-ID": client_id}
    params = {"ids": ",".join(message_ids)}
    resp = conn.session.delete(url, headers=headers, params=params)
    if resp.status_code not in (200, 204):
        resp.raise_for_status()
    logger.info("Deleted %d message(s) from queue %s", len(message_ids), queue_name)


# ── Claims ─────────────────────────────────────────────────────────────────────

def claim_messages(
    queue_name: str,
    client_id: str,
    *,
    ttl: int = 3600,
    grace: int = 3600,
    limit: int = 10,
    conn: Connection | None = None,
) -> list[dict]:
    """
    Claim messages from a queue (consumer lock).

    Args:
        ttl:   Claim TTL in seconds — message invisible to other consumers.
        grace: Grace period after TTL before message becomes available again.
        limit: Max messages to claim.
    """
    conn = conn or get_connection()
    url = _base_url(conn) + f"/queues/{queue_name}/claims"
    headers = {"Client-ID": client_id}
    resp = conn.session.post(
        url,
        json={"ttl": ttl, "grace": grace, "limit": limit},
        headers=headers,
    )
    if resp.status_code == 204:
        return []   # No messages available
    resp.raise_for_status()
    return resp.json()


def release_claim(
    queue_name: str,
    claim_id: str,
    client_id: str,
    conn: Connection | None = None,
) -> None:
    """Release a claim (re-enqueue claimed messages)."""
    conn = conn or get_connection()
    url = _base_url(conn) + f"/queues/{queue_name}/claims/{claim_id}"
    headers = {"Client-ID": client_id}
    resp = conn.session.delete(url, headers=headers)
    if resp.status_code not in (200, 204, 404):
        resp.raise_for_status()
    logger.info("Released claim %s on queue %s", claim_id, queue_name)


# ── Subscriptions ──────────────────────────────────────────────────────────────

def list_subscriptions(queue_name: str, conn: Connection | None = None) -> list[dict]:
    """List webhook subscriptions for a queue."""
    conn = conn or get_connection()
    url = _base_url(conn) + f"/queues/{queue_name}/subscriptions"
    resp = conn.session.get(url)
    resp.raise_for_status()
    return resp.json().get("subscriptions", [])


def create_subscription(
    queue_name: str,
    *,
    subscriber: str,
    ttl: int = 3600,
    options: dict | None = None,
    conn: Connection | None = None,
) -> dict:
    """
    Subscribe a webhook to queue notifications.

    Args:
        subscriber: HTTP/HTTPS endpoint URL.
        ttl:        Subscription TTL in seconds.
        options:    Delivery options (headers, retries, etc.).
    """
    conn = conn or get_connection()
    url = _base_url(conn) + f"/queues/{queue_name}/subscriptions"
    payload = {"subscriber": subscriber, "ttl": ttl, "options": options or {}}
    resp = conn.session.post(url, json=payload)
    resp.raise_for_status()
    sub_id = resp.json().get("subscription_id")
    logger.info("Created subscription %s on queue %s", sub_id, queue_name)
    return {"subscription_id": sub_id, "subscriber": subscriber, "ttl": ttl}
