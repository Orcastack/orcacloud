# OrcaCloud – OpenStack Orchestration Service (Heat)
#
# Wraps openstack.orchestration (Heat) operations:
# stacks, resources, events, and template management.
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


# ── Stacks ─────────────────────────────────────────────────────────────────────

def list_stacks(
    *,
    status: str | None = None,
    conn: Connection | None = None,
) -> list[dict]:
    """
    List Heat stacks, optionally filtered by status.

    Status values: 'CREATE_COMPLETE', 'CREATE_IN_PROGRESS', 'UPDATE_COMPLETE',
                   'DELETE_COMPLETE', 'CREATE_FAILED', 'UPDATE_FAILED', etc.
    """
    conn = conn or get_connection()
    kwargs: dict[str, Any] = {}
    if status:
        kwargs["status"] = status
    return [_stack_to_dict(s) for s in conn.orchestration.stacks(**kwargs)]


def get_stack(stack_name_or_id: str, conn: Connection | None = None) -> dict | None:
    """Get a stack by name or UUID. Returns None if not found."""
    conn = conn or get_connection()
    s = conn.orchestration.find_stack(stack_name_or_id, ignore_missing=True)
    return _stack_to_dict(s) if s else None


def create_stack(
    *,
    name: str,
    template: dict | str,
    parameters: dict | None = None,
    timeout_mins: int = 60,
    disable_rollback: bool = False,
    tags: list[str] | None = None,
    conn: Connection | None = None,
) -> dict:
    """
    Create (launch) a Heat stack.

    Args:
        name:             Stack name.
        template:         HOT template as a dict or YAML/JSON string.
        parameters:       Template parameter overrides.
        timeout_mins:     Stack creation timeout in minutes.
        disable_rollback: If True, do not rollback on creation failure.
        tags:             Optional string tags.
    """
    conn = conn or get_connection()
    kwargs: dict[str, Any] = {
        "name":             name,
        "timeout_mins":     timeout_mins,
        "disable_rollback": disable_rollback,
    }
    if isinstance(template, dict):
        kwargs["template"] = template
    else:
        kwargs["template"] = template          # YAML/JSON string
    if parameters:
        kwargs["parameters"] = parameters
    if tags:
        kwargs["tags"] = ",".join(tags)

    s = conn.orchestration.create_stack(**kwargs)
    logger.info("Creating Heat stack %s (%s)", s.name, s.id)
    return _stack_to_dict(s)


def update_stack(
    stack_name_or_id: str,
    *,
    template: dict | str | None = None,
    parameters: dict | None = None,
    timeout_mins: int = 60,
    conn: Connection | None = None,
) -> dict:
    """
    Update an existing Heat stack with a new template or parameters.

    If template is None, a stack UPDATE is triggered with the existing template.
    """
    conn = conn or get_connection()
    s = conn.orchestration.find_stack(stack_name_or_id)
    kwargs: dict[str, Any] = {"timeout_mins": timeout_mins}
    if template is not None:
        kwargs["template"] = template
    if parameters:
        kwargs["parameters"] = parameters
    updated = conn.orchestration.update_stack(s, **kwargs)
    logger.info("Updating Heat stack %s", stack_name_or_id)
    return _stack_to_dict(updated)


def delete_stack(stack_name_or_id: str, conn: Connection | None = None) -> None:
    """Delete a Heat stack and all the resources it manages."""
    conn = conn or get_connection()
    conn.orchestration.delete_stack(stack_name_or_id, ignore_missing=True)
    logger.info("Deleted Heat stack %s", stack_name_or_id)


def preview_stack(
    *,
    name: str,
    template: dict | str,
    parameters: dict | None = None,
    conn: Connection | None = None,
) -> dict:
    """
    Preview a stack creation — returns the resources that would be created
    without actually creating the stack.
    """
    conn = conn or get_connection()
    kwargs: dict[str, Any] = {"name": name, "template": template}
    if parameters:
        kwargs["parameters"] = parameters
    result = conn.orchestration.preview_stack(**kwargs)
    return {
        "stack_name": result.stack_name,
        "resources":  [_resource_to_dict(r) for r in (result.resources or [])],
    }


# ── Stack Resources ────────────────────────────────────────────────────────────

def list_stack_resources(
    stack_name_or_id: str,
    *,
    nested_depth: int = 0,
    conn: Connection | None = None,
) -> list[dict]:
    """
    List all resources in a stack.

    Args:
        nested_depth: Recurse into nested stacks up to this many levels (0 = top only).
    """
    conn = conn or get_connection()
    return [
        _resource_to_dict(r)
        for r in conn.orchestration.resources(stack_name_or_id, nested_depth=nested_depth)
    ]


def get_stack_resource(
    stack_name_or_id: str,
    resource_name: str,
    conn: Connection | None = None,
) -> dict | None:
    """Get a specific resource from a stack. Returns None if not found."""
    conn = conn or get_connection()
    r = conn.orchestration.find_resource(stack_name_or_id, resource_name, ignore_missing=True)
    return _resource_to_dict(r) if r else None


# ── Stack Events ───────────────────────────────────────────────────────────────

def list_stack_events(
    stack_name_or_id: str,
    *,
    limit: int = 50,
    conn: Connection | None = None,
) -> list[dict]:
    """
    List events for a stack (most recent first).

    Args:
        limit: Maximum events to return.
    """
    conn = conn or get_connection()
    events = list(conn.orchestration.events(stack_name_or_id, limit=limit))
    return [
        {
            "id":                e.id,
            "resource_name":     e.resource_name,
            "resource_status":   e.resource_status,
            "resource_status_reason": e.resource_status_reason,
            "event_time":        str(e.event_time) if hasattr(e, "event_time") else None,
        }
        for e in events
    ]


# ── Stack Outputs ──────────────────────────────────────────────────────────────

def get_stack_outputs(stack_name_or_id: str, conn: Connection | None = None) -> list[dict]:
    """Retrieve output values declared in a stack template."""
    conn = conn or get_connection()
    s = conn.orchestration.find_stack(stack_name_or_id)
    return [
        {
            "output_key":   o.get("output_key"),
            "output_value": o.get("output_value"),
            "description":  o.get("description"),
        }
        for o in (s.outputs or [])
    ]


# ── Template Validation ────────────────────────────────────────────────────────

def validate_template(template: dict | str, conn: Connection | None = None) -> dict:
    """
    Validate a Heat template and return its parameter declarations.

    Returns a dict with 'parameters', 'parameter_groups', 'Description' keys.
    """
    conn = conn or get_connection()
    if isinstance(template, str):
        result = conn.orchestration.validate_template(template=template)
    else:
        result = conn.orchestration.validate_template(template=template)
    return dict(result)


# ── Private helpers ────────────────────────────────────────────────────────────

def _stack_to_dict(s) -> dict:
    return {
        "id":                  s.id,
        "name":                s.name,
        "status":              s.status,
        "status_reason":       s.status_reason,
        "created_at":          str(s.created_at) if hasattr(s, "created_at") else None,
        "updated_at":          str(s.updated_at) if hasattr(s, "updated_at") else None,
        "tags":                s.tags,
        "outputs":             s.outputs or [],
        "parameters":          s.parameters or {},
    }


def _resource_to_dict(r) -> dict:
    return {
        "name":            r.name,
        "resource_type":   r.resource_type,
        "logical_id":      getattr(r, "logical_resource_id", r.name),
        "physical_id":     getattr(r, "physical_resource_id", None),
        "status":          r.status,
        "required_by":     list(getattr(r, "required_by", []) or []),
    }
