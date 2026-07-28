# OrcaCloud – OpenStack Key Manager (Barbican)
#
# Wraps openstack.key_manager (Barbican) operations:
# secrets, containers (certificate bundles), and secret metadata.
#
# WORKSPACE-AWARE PATTERN
# ─────────────────────────────────────────────────────────────────────────────
# Every public function accepts an optional `conn` parameter.

import logging
import base64
from typing import Any

import openstack.connection

from infrastructure.openstack_conn import get_connection

Connection = openstack.connection.Connection

logger = logging.getLogger(__name__)


# ── Secrets ────────────────────────────────────────────────────────────────────

def list_secrets(
    *,
    name: str | None = None,
    secret_type: str | None = None,
    conn: Connection | None = None,
) -> list[dict]:
    """
    List Barbican secrets accessible to the project.

    Args:
        name:        Filter by name.
        secret_type: 'symmetric', 'public', 'private', 'passphrase', 'certificate', 'opaque'.
    """
    conn = conn or get_connection()
    kwargs: dict[str, Any] = {}
    if name:
        kwargs["name"] = name
    if secret_type:
        kwargs["secret_type"] = secret_type
    return [_secret_to_dict(s) for s in conn.key_manager.secrets(**kwargs)]


def get_secret(secret_ref_or_id: str, conn: Connection | None = None) -> dict | None:
    """Get secret metadata. Returns None if not found."""
    conn = conn or get_connection()
    s = conn.key_manager.find_secret(secret_ref_or_id, ignore_missing=True)
    return _secret_to_dict(s) if s else None


def get_secret_payload(
    secret_ref_or_id: str,
    conn: Connection | None = None,
) -> bytes | str | None:
    """
    Retrieve the plaintext payload of a secret.

    Returns bytes for binary secrets, str for text/plain.
    Returns None if the secret is not found.
    """
    conn = conn or get_connection()
    s = conn.key_manager.find_secret(secret_ref_or_id, ignore_missing=True)
    if s is None:
        return None
    try:
        payload = conn.key_manager.get_secret_payload(s)
        if isinstance(payload, bytes):
            return payload
        return str(payload)
    except Exception as exc:
        logger.warning("Could not retrieve payload for secret %s: %s", secret_ref_or_id, exc)
        return None


def create_secret(
    *,
    name: str,
    payload: str | bytes,
    payload_content_type: str = "text/plain",
    payload_content_encoding: str | None = None,
    secret_type: str = "opaque",
    expiration: str | None = None,
    algorithm: str | None = None,
    bit_length: int | None = None,
    mode: str | None = None,
    conn: Connection | None = None,
) -> dict:
    """
    Store a secret in Barbican.

    Args:
        name:                     Secret display name.
        payload:                  Secret data (str or bytes).
        payload_content_type:     MIME type: 'text/plain', 'application/octet-stream'.
        payload_content_encoding: None or 'base64' for binary payloads.
        secret_type:              'opaque', 'symmetric', 'passphrase', 'certificate', etc.
        expiration:               ISO 8601 datetime string (optional).
        algorithm:                e.g. 'aes', 'rsa'.
        bit_length:               Key bit length (e.g. 256 for AES-256).
        mode:                     Block cipher mode (e.g. 'cbc').
    """
    conn = conn or get_connection()
    kwargs: dict[str, Any] = {
        "name":                     name,
        "payload":                  payload,
        "payload_content_type":     payload_content_type,
        "secret_type":              secret_type,
    }
    if payload_content_encoding:
        kwargs["payload_content_encoding"] = payload_content_encoding
    if expiration:
        kwargs["expiration"] = expiration
    if algorithm:
        kwargs["algorithm"] = algorithm
    if bit_length:
        kwargs["bit_length"] = bit_length
    if mode:
        kwargs["mode"] = mode

    s = conn.key_manager.create_secret(**kwargs)
    logger.info("Created Barbican secret %s", s.secret_ref)
    return _secret_to_dict(s)


def delete_secret(secret_ref_or_id: str, conn: Connection | None = None) -> None:
    """Delete a secret from Barbican."""
    conn = conn or get_connection()
    conn.key_manager.delete_secret(secret_ref_or_id, ignore_missing=True)
    logger.info("Deleted secret %s", secret_ref_or_id)


# ── Containers ─────────────────────────────────────────────────────────────────

def list_containers(
    *,
    name: str | None = None,
    type: str | None = None,
    conn: Connection | None = None,
) -> list[dict]:
    """
    List Barbican containers (logical groupings of secrets).

    Container types: 'generic', 'rsa', 'certificate'.
    """
    conn = conn or get_connection()
    kwargs: dict[str, Any] = {}
    if name:
        kwargs["name"] = name
    if type:
        kwargs["type"] = type
    return [_container_to_dict(c) for c in conn.key_manager.containers(**kwargs)]


def get_container(container_ref_or_id: str, conn: Connection | None = None) -> dict | None:
    """Get a container by ID or href. Returns None if not found."""
    conn = conn or get_connection()
    c = conn.key_manager.find_container(container_ref_or_id, ignore_missing=True)
    return _container_to_dict(c) if c else None


def create_certificate_container(
    *,
    name: str,
    certificate_secret_ref: str,
    private_key_secret_ref: str,
    intermediates_secret_ref: str | None = None,
    private_key_passphrase_ref: str | None = None,
    conn: Connection | None = None,
) -> dict:
    """
    Create a Barbican 'certificate' container for TLS/SSL key pairs.

    Args:
        certificate_secret_ref:      Barbican secret href for the certificate.
        private_key_secret_ref:      Barbican secret href for the private key.
        intermediates_secret_ref:    Optional intermediate CA chain.
        private_key_passphrase_ref:  Optional passphrase for the private key.
    """
    conn = conn or get_connection()
    secret_refs: list[dict] = [
        {"name": "certificate",  "secret_ref": certificate_secret_ref},
        {"name": "private_key",  "secret_ref": private_key_secret_ref},
    ]
    if intermediates_secret_ref:
        secret_refs.append({"name": "intermediates", "secret_ref": intermediates_secret_ref})
    if private_key_passphrase_ref:
        secret_refs.append({"name": "private_key_passphrase", "secret_ref": private_key_passphrase_ref})

    c = conn.key_manager.create_container(
        name=name,
        type="certificate",
        secret_refs=secret_refs,
    )
    logger.info("Created certificate container %s", c.container_ref)
    return _container_to_dict(c)


def delete_container(container_ref_or_id: str, conn: Connection | None = None) -> None:
    """Delete a key manager container."""
    conn = conn or get_connection()
    conn.key_manager.delete_container(container_ref_or_id, ignore_missing=True)
    logger.info("Deleted container %s", container_ref_or_id)


# ── Orders ─────────────────────────────────────────────────────────────────────

def create_key_order(
    *,
    algorithm: str = "aes",
    bit_length: int = 256,
    mode: str = "cbc",
    name: str | None = None,
    conn: Connection | None = None,
) -> dict:
    """
    Request Barbican to generate a symmetric key on-behalf of the project.

    Returns an order dict with status and key secret_ref once 'ACTIVE'.
    """
    conn = conn or get_connection()
    kwargs: dict[str, Any] = {
        "type":        "key",
        "meta": {
            "algorithm":  algorithm,
            "bit_length": bit_length,
            "mode":       mode,
        },
    }
    if name:
        kwargs["meta"]["name"] = name
    order = conn.key_manager.create_order(**kwargs)
    logger.info("Created Barbican key order %s", order.order_ref)
    return {
        "order_ref": order.order_ref,
        "status":    order.status,
        "secret_ref": getattr(order, "secret_ref", None),
    }


def get_order(order_ref: str, conn: Connection | None = None) -> dict | None:
    """Poll an order's status. Returns None if not found."""
    conn = conn or get_connection()
    o = conn.key_manager.find_order(order_ref, ignore_missing=True)
    if o is None:
        return None
    return {
        "order_ref":  o.order_ref,
        "status":     o.status,
        "secret_ref": getattr(o, "secret_ref", None),
        "error":      getattr(o, "error_reason", None),
    }


# ── Private helpers ────────────────────────────────────────────────────────────

def _secret_to_dict(s) -> dict:
    return {
        "secret_ref":   s.secret_ref,
        "name":         s.name,
        "status":       s.status,
        "secret_type":  s.secret_type,
        "algorithm":    s.algorithm,
        "bit_length":   s.bit_length,
        "mode":         s.mode,
        "expiration":   str(s.expiration) if s.expiration else None,
        "created_at":   str(s.created_at) if hasattr(s, "created_at") else None,
    }


def _container_to_dict(c) -> dict:
    return {
        "container_ref": c.container_ref,
        "name":          c.name,
        "type":          c.type,
        "status":        c.status,
        "secret_refs":   [
            {"name": r.name, "secret_ref": r.secret_ref}
            for r in (c.secret_refs or [])
        ],
    }
