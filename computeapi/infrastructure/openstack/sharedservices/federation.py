# OrcaCloud – OpenStack Keystone Federation Module
#
# Wraps Keystone federation operations:
#   • Identity providers (LDAP, SAML2, OIDC)
#   • Mapping rules (attribute mapping for federated tokens)
#   • Federation protocols
#   • Project quota bootstrapping for a new federated domain
#
# Usage in provisioning code:
#   from infrastructure.openstack.sharedservices.federation import (
#       create_identity_provider, create_mapping, create_protocol,
#       bootstrap_federated_domain,
#   )

import logging
from typing import Any

import openstack.connection

from infrastructure.openstack_conn import get_connection

Connection = openstack.connection.Connection
logger = logging.getLogger(__name__)


# ── Identity Providers ────────────────────────────────────────────────────────

def list_identity_providers(conn: Connection | None = None) -> list[dict]:
    """Return all registered identity providers."""
    conn = conn or get_connection()
    return [_idp_to_dict(idp) for idp in conn.identity.identity_providers()]


def get_identity_provider(idp_id: str, conn: Connection | None = None) -> dict | None:
    """Fetch an IDP by ID. Returns None if not found."""
    conn = conn or get_connection()
    idp = conn.identity.find_identity_provider(idp_id, ignore_missing=True)
    return _idp_to_dict(idp) if idp else None


def create_identity_provider(
    *,
    idp_id: str,
    description: str = "",
    remote_ids: list[str] | None = None,
    enabled: bool = True,
    conn: Connection | None = None,
) -> dict:
    """
    Register a new identity provider.

    Args:
        idp_id:      Machine-readable ID (e.g. 'ldap-corp', 'saml-okta').
        description: Human-readable description.
        remote_ids:  List of remote entity IDs asserted by this IDP.
        enabled:     Whether the IDP is active at creation.

    Returns:
        Dict representation of the created IDP.

    Example — OIDC IDP for corporate SSO:
        create_identity_provider(
            idp_id="oidc-corporate",
            description="Corporate OIDC provider via Keycloak",
            remote_ids=["https://sso.corp.example.com"],
        )
    """
    conn = conn or get_connection()
    kwargs: dict[str, Any] = {
        "identity_provider_id": idp_id,
        "description": description,
        "is_enabled": enabled,
    }
    if remote_ids:
        kwargs["remote_ids"] = remote_ids
    idp = conn.identity.create_identity_provider(**kwargs)
    logger.info("Created identity provider %s", idp_id)
    return _idp_to_dict(idp)


def update_identity_provider(
    idp_id: str,
    *,
    description: str | None = None,
    remote_ids: list[str] | None = None,
    enabled: bool | None = None,
    conn: Connection | None = None,
) -> dict:
    """Update an existing identity provider."""
    conn = conn or get_connection()
    kwargs: dict[str, Any] = {}
    if description is not None:
        kwargs["description"] = description
    if remote_ids is not None:
        kwargs["remote_ids"] = remote_ids
    if enabled is not None:
        kwargs["is_enabled"] = enabled
    idp = conn.identity.update_identity_provider(idp_id, **kwargs)
    logger.info("Updated identity provider %s", idp_id)
    return _idp_to_dict(idp)


def delete_identity_provider(idp_id: str, conn: Connection | None = None) -> None:
    """Delete an identity provider. Raises if protocols still exist."""
    conn = conn or get_connection()
    conn.identity.delete_identity_provider(idp_id, ignore_missing=True)
    logger.info("Deleted identity provider %s", idp_id)


# ── Attribute Mappings ────────────────────────────────────────────────────────

def create_mapping(
    *,
    mapping_id: str,
    rules: list[dict],
    conn: Connection | None = None,
) -> dict:
    """
    Create a Keystone attribute-mapping ruleset.

    ``rules`` should follow the Keystone mapping rules format:
    https://docs.openstack.org/keystone/latest/admin/federation/mapping_combinations.html

    Example — map LDAP group → project member:
        rules = [{
            "local": [
                {"user": {"name": "{0}"}},
                {"group": {"id": "<keystone-group-uuid>"}},
            ],
            "remote": [
                {"type": "REMOTE_USER"},
                {"type": "HTTP_OIDC_GROUPS", "any_one_of": ["cloud-users"]},
            ],
        }]
    """
    conn = conn or get_connection()
    mapping = conn.identity.create_mapping(mapping_id=mapping_id, rules=rules)
    logger.info("Created mapping %s with %d rule(s)", mapping_id, len(rules))
    return {"id": mapping.id, "rules": mapping.rules}


def update_mapping(
    mapping_id: str,
    *,
    rules: list[dict],
    conn: Connection | None = None,
) -> dict:
    """Replace mapping rules for an existing mapping."""
    conn = conn or get_connection()
    mapping = conn.identity.update_mapping(mapping_id, rules=rules)
    logger.info("Updated mapping %s", mapping_id)
    return {"id": mapping.id, "rules": mapping.rules}


def delete_mapping(mapping_id: str, conn: Connection | None = None) -> None:
    conn = conn or get_connection()
    conn.identity.delete_mapping(mapping_id, ignore_missing=True)
    logger.info("Deleted mapping %s", mapping_id)


# ── Federation Protocols ──────────────────────────────────────────────────────

def create_protocol(
    *,
    idp_id: str,
    protocol_id: str,
    mapping_id: str,
    conn: Connection | None = None,
) -> dict:
    """
    Bind an attribute mapping to an IDP via a federation protocol.

    Args:
        idp_id:      Registered IDP ID.
        protocol_id: Protocol slug: 'mapped', 'saml2', 'oidc', 'kerberos'.
        mapping_id:  Attribute mapping ID to apply for this protocol.
    """
    conn = conn or get_connection()
    proto = conn.identity.create_federation_protocol(
        identity_provider_id=idp_id,
        protocol_id=protocol_id,
        mapping_id=mapping_id,
    )
    logger.info("Created protocol %s for IDP %s", protocol_id, idp_id)
    return {"idp_id": idp_id, "protocol_id": proto.id, "mapping_id": mapping_id}


def delete_protocol(
    idp_id: str,
    protocol_id: str,
    conn: Connection | None = None,
) -> None:
    conn = conn or get_connection()
    conn.identity.delete_federation_protocol(
        identity_provider_id=idp_id,
        protocol_id=protocol_id,
        ignore_missing=True,
    )
    logger.info("Deleted protocol %s from IDP %s", protocol_id, idp_id)


# ── Service Provider (SP) ─────────────────────────────────────────────────────

def create_service_provider(
    *,
    sp_id: str,
    sp_url: str,
    auth_url: str,
    description: str = "",
    enabled: bool = True,
    conn: Connection | None = None,
) -> dict:
    """
    Register Keystone as a Service Provider for K2K (Keystone-to-Keystone) federation.

    Args:
        sp_id:    Unique SP identifier (e.g. 'region-b-private').
        sp_url:   Endpoint where SAML assertions are consumed.
        auth_url: Keystone auth URL of the remote SP region.
    """
    conn = conn or get_connection()
    sp = conn.identity.create_service_provider(
        id=sp_id,
        sp_url=sp_url,
        auth_url=auth_url,
        description=description,
        is_enabled=enabled,
    )
    logger.info("Created service provider %s", sp_id)
    return {"id": sp.id, "sp_url": sp.sp_url, "auth_url": sp.auth_url}


# ── Full Federation Bootstrap ─────────────────────────────────────────────────

def bootstrap_federated_domain(
    *,
    domain_name: str,
    idp_id: str,
    idp_remote_ids: list[str],
    protocol_id: str,
    mapping_rules: list[dict],
    additional_roles: list[str] | None = None,
    conn: Connection | None = None,
) -> dict:
    """
    End-to-end bootstrap of a federated Keystone domain.

    Creates:
      1. A new domain.
      2. An identity provider.
      3. An attribute mapping.
      4. A federation protocol binding the two.

    Returns a summary dict with all created resource IDs.

    Example — bootstrap an OIDC-federated domain for enterprise tenant:
        result = bootstrap_federated_domain(
            domain_name="acme-corp",
            idp_id="oidc-acme",
            idp_remote_ids=["https://sso.acme.com/auth/realms/acme"],
            protocol_id="oidc",
            mapping_rules=[...],
        )
    """
    conn = conn or get_connection()

    # 1. Domain
    from infrastructure.openstack.sharedservices.keystone import create_domain
    domain = create_domain(name=domain_name, conn=conn)

    # 2. Identity provider
    idp = create_identity_provider(
        idp_id=idp_id,
        description=f"Federated IDP for domain {domain_name}",
        remote_ids=idp_remote_ids,
        conn=conn,
    )

    # 3. Mapping
    mapping_id = f"mapping-{idp_id}"
    create_mapping(mapping_id=mapping_id, rules=mapping_rules, conn=conn)

    # 4. Protocol
    create_protocol(
        idp_id=idp_id,
        protocol_id=protocol_id,
        mapping_id=mapping_id,
        conn=conn,
    )

    logger.info(
        "Federated domain bootstrap complete: domain=%s idp=%s protocol=%s",
        domain_name, idp_id, protocol_id,
    )
    return {
        "domain": domain,
        "idp":    idp,
        "mapping_id": mapping_id,
        "protocol_id": protocol_id,
    }


# ── Private helpers ───────────────────────────────────────────────────────────

def _idp_to_dict(idp) -> dict:
    return {
        "id":          idp.id,
        "description": getattr(idp, "description", ""),
        "enabled":     idp.is_enabled,
        "remote_ids":  list(getattr(idp, "remote_ids", []) or []),
    }
