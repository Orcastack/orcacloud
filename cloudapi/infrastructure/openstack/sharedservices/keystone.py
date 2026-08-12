# OrcaCloud – OpenStack Identity Service (Keystone)
#
# Wraps openstack.identity (Keystone) operations:
# projects, users, roles, domains, groups, and service catalog.
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


# ── Domains ────────────────────────────────────────────────────────────────────

def list_domains(conn: Connection | None = None) -> list[dict]:
    """List all domains visible to the authenticated token."""
    conn = conn or get_connection()
    return [
        {"id": d.id, "name": d.name, "enabled": d.is_enabled, "description": d.description}
        for d in conn.identity.domains()
    ]


def create_domain(
    *,
    name: str,
    description: str = "",
    enabled: bool = True,
    conn: Connection | None = None,
) -> dict:
    """Create a Keystone domain."""
    conn = conn or get_connection()
    d = conn.identity.create_domain(name=name, description=description, is_enabled=enabled)
    logger.info("Created domain %s (%s)", d.name, d.id)
    return {"id": d.id, "name": d.name}


def delete_domain(domain_id: str, conn: Connection | None = None) -> None:
    """Disable and delete a domain (Keystone requires disabling first)."""
    conn = conn or get_connection()
    conn.identity.update_domain(domain_id, is_enabled=False)
    conn.identity.delete_domain(domain_id, ignore_missing=True)
    logger.info("Deleted domain %s", domain_id)


# ── Projects ───────────────────────────────────────────────────────────────────

def list_projects(
    *,
    domain_id: str | None = None,
    conn: Connection | None = None,
) -> list[dict]:
    """List Keystone projects, optionally filtered by domain."""
    conn = conn or get_connection()
    kwargs: dict[str, Any] = {}
    if domain_id:
        kwargs["domain_id"] = domain_id
    return [_project_to_dict(p) for p in conn.identity.projects(**kwargs)]


def get_project(project_id: str, conn: Connection | None = None) -> dict | None:
    """Get a project by ID or name. Returns None if not found."""
    conn = conn or get_connection()
    p = conn.identity.find_project(project_id, ignore_missing=True)
    return _project_to_dict(p) if p else None


def create_project(
    *,
    name: str,
    domain_id: str | None = None,
    description: str = "",
    enabled: bool = True,
    parent_id: str | None = None,
    conn: Connection | None = None,
) -> dict:
    """Create a new Keystone project (tenant)."""
    conn = conn or get_connection()
    kwargs: dict[str, Any] = {"name": name, "description": description, "is_enabled": enabled}
    if domain_id:
        kwargs["domain_id"] = domain_id
    if parent_id:
        kwargs["parent_id"] = parent_id
    p = conn.identity.create_project(**kwargs)
    logger.info("Created project %s (%s)", p.name, p.id)
    return _project_to_dict(p)


def update_project(project_id: str, updates: dict, conn: Connection | None = None) -> dict:
    """Update mutable project fields."""
    conn = conn or get_connection()
    p = conn.identity.update_project(project_id, **updates)
    return _project_to_dict(p)


def delete_project(project_id: str, conn: Connection | None = None) -> None:
    """Delete a Keystone project."""
    conn = conn or get_connection()
    conn.identity.delete_project(project_id, ignore_missing=True)
    logger.info("Deleted project %s", project_id)


# ── Users ──────────────────────────────────────────────────────────────────────

def list_users(
    *,
    domain_id: str | None = None,
    conn: Connection | None = None,
) -> list[dict]:
    """List Keystone users, optionally filtered by domain."""
    conn = conn or get_connection()
    kwargs: dict[str, Any] = {}
    if domain_id:
        kwargs["domain_id"] = domain_id
    return [_user_to_dict(u) for u in conn.identity.users(**kwargs)]


def get_user(user_id: str, conn: Connection | None = None) -> dict | None:
    """Get a user by ID. Returns None if not found."""
    conn = conn or get_connection()
    u = conn.identity.find_user(user_id, ignore_missing=True)
    return _user_to_dict(u) if u else None


def create_user(
    *,
    name: str,
    password: str,
    email: str = "",
    domain_id: str | None = None,
    enabled: bool = True,
    conn: Connection | None = None,
) -> dict:
    """Create a new Keystone user."""
    conn = conn or get_connection()
    kwargs: dict[str, Any] = {
        "name":       name,
        "password":   password,
        "is_enabled": enabled,
    }
    if email:
        kwargs["email"] = email
    if domain_id:
        kwargs["domain_id"] = domain_id
    u = conn.identity.create_user(**kwargs)
    logger.info("Created user %s (%s)", u.name, u.id)
    return _user_to_dict(u)


def update_user_password(
    user_id: str,
    new_password: str,
    conn: Connection | None = None,
) -> None:
    """Change a user's password."""
    conn = conn or get_connection()
    conn.identity.update_user(user_id, password=new_password)
    logger.info("Updated password for user %s", user_id)


def delete_user(user_id: str, conn: Connection | None = None) -> None:
    """Delete a Keystone user."""
    conn = conn or get_connection()
    conn.identity.delete_user(user_id, ignore_missing=True)
    logger.info("Deleted user %s", user_id)


# ── Groups ─────────────────────────────────────────────────────────────────────

def list_groups(
    *,
    domain_id: str | None = None,
    conn: Connection | None = None,
) -> list[dict]:
    """List Keystone groups."""
    conn = conn or get_connection()
    kwargs: dict[str, Any] = {}
    if domain_id:
        kwargs["domain_id"] = domain_id
    return [{"id": g.id, "name": g.name} for g in conn.identity.groups(**kwargs)]


def add_user_to_group(
    group_id: str,
    user_id: str,
    conn: Connection | None = None,
) -> None:
    """Add a user to a group."""
    conn = conn or get_connection()
    conn.identity.add_user_to_group(group_id, user_id)
    logger.info("Added user %s to group %s", user_id, group_id)


def remove_user_from_group(
    group_id: str,
    user_id: str,
    conn: Connection | None = None,
) -> None:
    """Remove a user from a group."""
    conn = conn or get_connection()
    conn.identity.remove_user_from_group(group_id, user_id)
    logger.info("Removed user %s from group %s", user_id, group_id)


# ── Roles ──────────────────────────────────────────────────────────────────────

def list_roles(conn: Connection | None = None) -> list[dict]:
    """List all Keystone roles."""
    conn = conn or get_connection()
    return [{"id": r.id, "name": r.name} for r in conn.identity.roles()]


def assign_project_role_to_user(
    project_id: str,
    user_id: str,
    role_id: str,
    conn: Connection | None = None,
) -> None:
    """Assign a project-scoped role to a user."""
    conn = conn or get_connection()
    conn.identity.assign_project_role_to_user(project_id, user_id, role_id)
    logger.info("Assigned role %s to user %s on project %s", role_id, user_id, project_id)


def revoke_project_role_from_user(
    project_id: str,
    user_id: str,
    role_id: str,
    conn: Connection | None = None,
) -> None:
    """Revoke a project-scoped role from a user."""
    conn = conn or get_connection()
    conn.identity.unassign_project_role_from_user(project_id, user_id, role_id)
    logger.info("Revoked role %s from user %s on project %s", role_id, user_id, project_id)


def list_user_project_roles(
    project_id: str,
    user_id: str,
    conn: Connection | None = None,
) -> list[dict]:
    """List roles assigned to a user on a project."""
    conn = conn or get_connection()
    return [
        {"id": r.id, "name": r.name}
        for r in conn.identity.role_assignments(project_id=project_id, user_id=user_id)
    ]


# ── Credentials & Tokens ───────────────────────────────────────────────────────

def get_token_info(conn: Connection | None = None) -> dict:
    """Return information about the current auth token."""
    conn = conn or get_connection()
    session = conn.session
    return {
        "project_id": conn.current_project_id,
        "user_id":    conn.current_user_id,
        "auth_url":   session.auth.auth_url if hasattr(session.auth, "auth_url") else None,
    }


# ── Private helpers ────────────────────────────────────────────────────────────

def _project_to_dict(p) -> dict:
    return {
        "id":          p.id,
        "name":        p.name,
        "domain_id":   p.domain_id,
        "is_enabled":  p.is_enabled,
        "description": p.description,
        "parent_id":   getattr(p, "parent_id", None),
    }


def _user_to_dict(u) -> dict:
    return {
        "id":         u.id,
        "name":       u.name,
        "email":      getattr(u, "email", None),
        "is_enabled": u.is_enabled,
        "domain_id":  u.domain_id,
    }
