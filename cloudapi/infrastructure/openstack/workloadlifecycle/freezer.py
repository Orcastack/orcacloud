# OrcaCloud – OpenStack Backup/Restore Service (Freezer)
#
# Wraps Freezer (freezer.backup) operations:
# jobs, actions, sessions, and clients.
#
# NOTE: The OpenStack SDK does not include a Freezer proxy.
# All calls are direct REST via the authenticated session.
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

_FREEZER_API_VERSION = "v2"


def _base_url(conn: Connection) -> str:
    """Resolve the Freezer service endpoint."""
    endpoint = conn.session.get_endpoint(
        service_type="backup",
        interface="public",
    )
    return endpoint.rstrip("/") + f"/{_FREEZER_API_VERSION}"


# ── Jobs ───────────────────────────────────────────────────────────────────────

def list_jobs(conn: Connection | None = None) -> list[dict]:
    """List all Freezer backup jobs for the project."""
    conn = conn or get_connection()
    resp = conn.session.get(_base_url(conn) + "/jobs")
    resp.raise_for_status()
    return resp.json().get("jobs", [])


def get_job(job_id: str, conn: Connection | None = None) -> dict | None:
    """Get a Freezer job by UUID. Returns None if not found."""
    conn = conn or get_connection()
    resp = conn.session.get(_base_url(conn) + f"/jobs/{job_id}")
    if resp.status_code == 404:
        return None
    resp.raise_for_status()
    return resp.json()


def create_job(
    *,
    description: str,
    job_actions: list[dict],
    job_schedule: dict | None = None,
    client_id: str | None = None,
    conn: Connection | None = None,
) -> dict:
    """
    Create a Freezer backup job.

    Args:
        description:   Human-readable job description.
        job_actions:   List of action dicts. Each action contains:
                         {"action": {...},  <-- freezer_action definition
                          "freezer_action": {"action": "backup", "storage": "swift",
                                             "container": "my-backups"},
                          "max_retries": 3, "max_retries_interval": 60}
        job_schedule:  Cron or interval schedule:
                         {"time_created": 0, "time_started": 0, "time_ended": 0,
                          "status": "stopped",
                          "schedule_interval": "1 days" | "schedule_cron_style": "0 2 * * *"}
        client_id:     Freezer client ID (agent) to run the job.
    """
    conn = conn or get_connection()
    payload: dict[str, Any] = {
        "description":   description,
        "job_actions":   job_actions,
        "job_schedule":  job_schedule or {"status": "stopped"},
    }
    if client_id:
        payload["client_id"] = client_id

    resp = conn.session.post(_base_url(conn) + "/jobs", json=payload)
    resp.raise_for_status()
    data = resp.json()
    logger.info("Created Freezer job %s", data.get("job_id"))
    return data


def update_job(job_id: str, updates: dict, conn: Connection | None = None) -> dict:
    """Update a Freezer job (description, schedule, actions)."""
    conn = conn or get_connection()
    resp = conn.session.patch(_base_url(conn) + f"/jobs/{job_id}", json=updates)
    resp.raise_for_status()
    return resp.json()


def delete_job(job_id: str, conn: Connection | None = None) -> None:
    """Delete a Freezer job."""
    conn = conn or get_connection()
    resp = conn.session.delete(_base_url(conn) + f"/jobs/{job_id}")
    if resp.status_code not in (200, 204, 404):
        resp.raise_for_status()
    logger.info("Deleted Freezer job %s", job_id)


def start_job(job_id: str, conn: Connection | None = None) -> dict:
    """Trigger an immediate run of a Freezer job."""
    conn = conn or get_connection()
    resp = conn.session.post(_base_url(conn) + f"/jobs/{job_id}/event",
                             json={"event": "start"})
    resp.raise_for_status()
    logger.info("Started Freezer job %s", job_id)
    return resp.json()


def stop_job(job_id: str, conn: Connection | None = None) -> dict:
    """Stop a running Freezer job."""
    conn = conn or get_connection()
    resp = conn.session.post(_base_url(conn) + f"/jobs/{job_id}/event",
                             json={"event": "stop"})
    resp.raise_for_status()
    logger.info("Stopped Freezer job %s", job_id)
    return resp.json()


# ── Actions ────────────────────────────────────────────────────────────────────

def list_actions(conn: Connection | None = None) -> list[dict]:
    """List all Freezer actions in the project."""
    conn = conn or get_connection()
    resp = conn.session.get(_base_url(conn) + "/actions")
    resp.raise_for_status()
    return resp.json().get("actions", [])


def create_action(
    *,
    freezer_action: dict,
    max_retries: int = 3,
    max_retries_interval: int = 60,
    conn: Connection | None = None,
) -> dict:
    """
    Create an action template that can be shared across jobs.

    Args:
        freezer_action:        Core action definition:
                                 {"action": "backup", "mode": "fs",
                                  "storage": "swift",
                                  "container": "my-backup-container",
                                  "path_to_backup": "/var/data"}
        max_retries:            Times to retry on failure.
        max_retries_interval:   Seconds between retry attempts.
    """
    conn = conn or get_connection()
    payload = {
        "freezer_action":        freezer_action,
        "max_retries":           max_retries,
        "max_retries_interval":  max_retries_interval,
    }
    resp = conn.session.post(_base_url(conn) + "/actions", json=payload)
    resp.raise_for_status()
    data = resp.json()
    logger.info("Created Freezer action %s", data.get("action_id"))
    return data


def delete_action(action_id: str, conn: Connection | None = None) -> None:
    """Delete a Freezer action template."""
    conn = conn or get_connection()
    resp = conn.session.delete(_base_url(conn) + f"/actions/{action_id}")
    if resp.status_code not in (200, 204, 404):
        resp.raise_for_status()
    logger.info("Deleted Freezer action %s", action_id)


# ── Sessions ───────────────────────────────────────────────────────────────────

def list_sessions(conn: Connection | None = None) -> list[dict]:
    """List Freezer sessions (coordinated job groups)."""
    conn = conn or get_connection()
    resp = conn.session.get(_base_url(conn) + "/sessions")
    resp.raise_for_status()
    return resp.json().get("sessions", [])


def create_session(
    *,
    description: str,
    session_tag: int = 0,
    hold_off: int = 60,
    time_started: int = -1,
    conn: Connection | None = None,
) -> dict:
    """
    Create a Freezer session to coordinate multiple backup jobs.

    Args:
        description: Human-readable session description.
        session_tag: Session tag counter (for consistency tracking).
        hold_off:    Seconds to wait before starting jobs after trigger.
        time_started: Unix timestamp; -1 means the session has not started.
    """
    conn = conn or get_connection()
    payload = {
        "description":  description,
        "session_tag":  session_tag,
        "hold_off":     hold_off,
        "time_started": time_started,
        "status":       "running",
    }
    resp = conn.session.post(_base_url(conn) + "/sessions", json=payload)
    resp.raise_for_status()
    data = resp.json()
    logger.info("Created Freezer session %s", data.get("session_id"))
    return data


def delete_session(session_id: str, conn: Connection | None = None) -> None:
    """Delete a Freezer session."""
    conn = conn or get_connection()
    resp = conn.session.delete(_base_url(conn) + f"/sessions/{session_id}")
    if resp.status_code not in (200, 204, 404):
        resp.raise_for_status()
    logger.info("Deleted Freezer session %s", session_id)


# ── Clients ────────────────────────────────────────────────────────────────────

def list_clients(conn: Connection | None = None) -> list[dict]:
    """List registered Freezer agents (clients)."""
    conn = conn or get_connection()
    resp = conn.session.get(_base_url(conn) + "/clients")
    resp.raise_for_status()
    return resp.json().get("clients", [])
