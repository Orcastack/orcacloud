# OrcaCloud – OpenStack Workflow Service (Mistral)
#
# Wraps openstack.workflow (Mistral) operations:
# workflows, executions, tasks, and action executions.
#
# NOTE: The OpenStack SDK `workflow` proxy coverage is limited.
# Where the SDK proxy is incomplete, direct REST calls are made
# through the authenticated session.
#
# WORKSPACE-AWARE PATTERN
# ─────────────────────────────────────────────────────────────────────────────
# Every public function accepts an optional `conn` parameter.

import logging
import json
from typing import Any

import openstack.connection

from infrastructure.openstack_conn import get_connection

Connection = openstack.connection.Connection

logger = logging.getLogger(__name__)


# ── Workflows ──────────────────────────────────────────────────────────────────

def list_workflows(conn: Connection | None = None) -> list[dict]:
    """List all Mistral workflows visible to the project."""
    conn = conn or get_connection()
    return [_workflow_to_dict(w) for w in conn.workflow.workflows()]


def get_workflow(workflow_name_or_id: str, conn: Connection | None = None) -> dict | None:
    """Get a workflow by name or UUID. Returns None if not found."""
    conn = conn or get_connection()
    w = conn.workflow.find_workflow(workflow_name_or_id, ignore_missing=True)
    return _workflow_to_dict(w) if w else None


def create_workflow(
    definition: str,
    *,
    scope: str = "private",
    conn: Connection | None = None,
) -> list[dict]:
    """
    Create one or more Mistral workflows from a YAML definition.

    Args:
        definition: Mistral DSL YAML string (may define multiple workflows).
        scope:      'private' (project) or 'public' (all projects).

    Returns: List of created workflow dicts.
    """
    conn = conn or get_connection()
    results = conn.workflow.create_workflow(definition, scope=scope)
    if hasattr(results, "__iter__"):
        wfs = list(results)
    else:
        wfs = [results]
    logger.info("Created %d Mistral workflow(s)", len(wfs))
    return [_workflow_to_dict(w) for w in wfs]


def delete_workflow(workflow_name_or_id: str, conn: Connection | None = None) -> None:
    """Delete a Mistral workflow."""
    conn = conn or get_connection()
    conn.workflow.delete_workflow(workflow_name_or_id, ignore_missing=True)
    logger.info("Deleted Mistral workflow %s", workflow_name_or_id)


# ── Executions ─────────────────────────────────────────────────────────────────

def list_executions(
    *,
    workflow_name: str | None = None,
    state: str | None = None,
    conn: Connection | None = None,
) -> list[dict]:
    """
    List Mistral workflow executions.

    Args:
        workflow_name: Filter by workflow name.
        state:         Filter by state: 'RUNNING', 'SUCCESS', 'ERROR', 'PAUSED'.
    """
    conn = conn or get_connection()
    kwargs: dict[str, Any] = {}
    if workflow_name:
        kwargs["workflow_name"] = workflow_name
    if state:
        kwargs["state"] = state
    return [_execution_to_dict(e) for e in conn.workflow.executions(**kwargs)]


def get_execution(execution_id: str, conn: Connection | None = None) -> dict | None:
    """Get a workflow execution by UUID. Returns None if not found."""
    conn = conn or get_connection()
    e = conn.workflow.find_execution(execution_id, ignore_missing=True)
    return _execution_to_dict(e) if e else None


def create_execution(
    workflow_name: str,
    *,
    input: dict | None = None,
    description: str = "",
    conn: Connection | None = None,
) -> dict:
    """
    Start a new workflow execution.

    Args:
        workflow_name: Mistral workflow name or ID.
        input:         Key–value map of workflow input parameters.
        description:   Optional execution description.
    """
    conn = conn or get_connection()
    kwargs: dict[str, Any] = {
        "workflow_identifier": workflow_name,
        "description":         description,
    }
    if input:
        kwargs["input"] = json.dumps(input)
    e = conn.workflow.create_execution(**kwargs)
    logger.info(
        "Started Mistral execution %s for workflow %s", e.id, workflow_name
    )
    return _execution_to_dict(e)


def pause_execution(execution_id: str, conn: Connection | None = None) -> dict:
    """Pause a running workflow execution."""
    conn = conn or get_connection()
    e = conn.workflow.update_execution(execution_id, state="PAUSED")
    return _execution_to_dict(e)


def resume_execution(execution_id: str, conn: Connection | None = None) -> dict:
    """Resume a PAUSED workflow execution."""
    conn = conn or get_connection()
    e = conn.workflow.update_execution(execution_id, state="RUNNING")
    return _execution_to_dict(e)


def delete_execution(execution_id: str, conn: Connection | None = None) -> None:
    """Delete a workflow execution record."""
    conn = conn or get_connection()
    conn.workflow.delete_execution(execution_id, ignore_missing=True)
    logger.info("Deleted Mistral execution %s", execution_id)


# ── Tasks ──────────────────────────────────────────────────────────────────────

def list_tasks(
    *,
    execution_id: str | None = None,
    conn: Connection | None = None,
) -> list[dict]:
    """
    List Mistral tasks, optionally filtered by execution.

    Args:
        execution_id: Filter tasks belonging to this execution.
    """
    conn = conn or get_connection()
    kwargs: dict[str, Any] = {}
    if execution_id:
        kwargs["workflow_execution_id"] = execution_id
    return [_task_to_dict(t) for t in conn.workflow.tasks(**kwargs)]


def get_task(task_id: str, conn: Connection | None = None) -> dict | None:
    """Get a task by UUID. Returns None if not found."""
    conn = conn or get_connection()
    t = conn.workflow.find_task(task_id, ignore_missing=True)
    return _task_to_dict(t) if t else None


# ── Action Executions ──────────────────────────────────────────────────────────

def list_action_executions(
    *,
    task_execution_id: str | None = None,
    conn: Connection | None = None,
) -> list[dict]:
    """List action executions, optionally filtered by task."""
    conn = conn or get_connection()
    kwargs: dict[str, Any] = {}
    if task_execution_id:
        kwargs["task_execution_id"] = task_execution_id
    return [
        {
            "id":            ae.id,
            "name":          ae.name,
            "workflow_name": ae.workflow_name,
            "task_name":     ae.task_name,
            "state":         ae.state,
            "accepted":      ae.accepted,
        }
        for ae in conn.workflow.action_executions(**kwargs)
    ]


# ── Private helpers ────────────────────────────────────────────────────────────

def _workflow_to_dict(w) -> dict:
    return {
        "id":          w.id,
        "name":        w.name,
        "scope":       w.scope,
        "definition":  w.definition,
        "tags":        list(w.tags or []),
        "created_at":  str(w.created_at) if hasattr(w, "created_at") else None,
        "updated_at":  str(w.updated_at) if hasattr(w, "updated_at") else None,
    }


def _execution_to_dict(e) -> dict:
    return {
        "id":            e.id,
        "workflow_name": e.workflow_name,
        "state":         e.state,
        "state_info":    e.state_info,
        "input":         e.input,
        "output":        e.output,
        "description":   e.description,
        "created_at":    str(e.created_at) if hasattr(e, "created_at") else None,
        "updated_at":    str(e.updated_at) if hasattr(e, "updated_at") else None,
    }


def _task_to_dict(t) -> dict:
    return {
        "id":           t.id,
        "name":         t.name,
        "workflow_name": t.workflow_name,
        "execution_id": t.workflow_execution_id,
        "state":        t.state,
        "state_info":   t.state_info,
        "result":       t.result,
    }
