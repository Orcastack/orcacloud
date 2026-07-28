# OrcaCloud – OpenStack Alarming Service (Aodh)
#
# Wraps Aodh (aodh.alarm) operations:
# alarms, alarm history, quota management.
#
# NOTE: OpenStack SDK ≥0.101 exposes `conn.alarm` proxy.
# Older SDK versions may require direct REST calls — this module
# tries the SDK proxy first and falls back to REST.
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

_AODH_API_VERSION = "v2"


def _base_url(conn: Connection) -> str:
    """Resolve the Aodh alarming service endpoint."""
    endpoint = conn.session.get_endpoint(
        service_type="alarming",
        interface="public",
    )
    return endpoint.rstrip("/")


# ── Alarms ─────────────────────────────────────────────────────────────────────

def list_alarms(
    *,
    name: str | None = None,
    type: str | None = None,
    state: str | None = None,
    conn: Connection | None = None,
) -> list[dict]:
    """
    List Aodh alarms.

    Args:
        name:  Filter by alarm name.
        type:  'threshold', 'gnocchi_aggregation_by_resources_threshold',
               'gnocchi_resources_threshold', 'composite', 'event', etc.
        state: 'ok', 'alarm', 'insufficient data'.
    """
    conn = conn or get_connection()
    params: dict[str, Any] = {}
    if name:
        params["name"] = name
    if type:
        params["type"] = type
    if state:
        params["state"] = state
    resp = conn.session.get(_base_url(conn) + "/alarms", params=params)
    resp.raise_for_status()
    return resp.json()


def get_alarm(alarm_id: str, conn: Connection | None = None) -> dict | None:
    """Get an alarm by UUID. Returns None if not found."""
    conn = conn or get_connection()
    resp = conn.session.get(_base_url(conn) + f"/alarms/{alarm_id}")
    if resp.status_code == 404:
        return None
    resp.raise_for_status()
    return resp.json()


def create_threshold_alarm(
    *,
    name: str,
    metric: str,
    threshold: float,
    comparison_operator: str = "gt",
    period: int = 60,
    evaluation_periods: int = 1,
    statistic: str = "avg",
    alarm_actions: list[str] | None = None,
    ok_actions: list[str] | None = None,
    insufficient_data_actions: list[str] | None = None,
    resource_id: str | None = None,
    resource_type: str | None = None,
    description: str = "",
    severity: str = "low",
    conn: Connection | None = None,
) -> dict:
    """
    Create a Gnocchi resource threshold alarm.

    Args:
        name:                  Alarm display name.
        metric:                Metric name (e.g. 'cpu', 'memory.usage').
        threshold:             Numeric threshold value.
        comparison_operator:   'lt', 'le', 'eq', 'ne', 'ge', 'gt'.
        period:                Aggregation period in seconds.
        evaluation_periods:    Number of consecutive periods to breach.
        statistic:             Gnocchi aggregation method: 'avg', 'sum', 'max', 'min'.
        alarm_actions:         List of notification URLs (Zaqar/webhook/log://).
        ok_actions:            Actions when alarm transitions to OK.
        insufficient_data_actions: Actions when data is insufficient.
        resource_id:           Gnocchi resource UUID to monitor.
        resource_type:         Gnocchi resource type (e.g. 'instance').
        severity:              'low', 'moderate', 'critical'.
    """
    conn = conn or get_connection()
    rule: dict[str, Any] = {
        "comparison_operator": comparison_operator,
        "threshold":           threshold,
        "metric":              metric,
        "aggregation_method":  statistic,
        "evaluation_periods":  evaluation_periods,
        "granularity":         period,
    }
    if resource_id:
        rule["resource_id"] = resource_id
    if resource_type:
        rule["resource_type"] = resource_type

    payload: dict[str, Any] = {
        "name":              name,
        "type":              "gnocchi_resources_threshold",
        "severity":          severity,
        "description":       description,
        "alarm_actions":     alarm_actions or [],
        "ok_actions":        ok_actions or [],
        "insufficient_data_actions": insufficient_data_actions or [],
        "gnocchi_resources_threshold_rule": rule,
    }
    resp = conn.session.post(_base_url(conn) + "/alarms", json=payload)
    resp.raise_for_status()
    data = resp.json()
    logger.info("Created Aodh alarm %s (%s)", name, data.get("alarm_id"))
    return data


def create_composite_alarm(
    *,
    name: str,
    composite_rule: dict,
    alarm_actions: list[str] | None = None,
    ok_actions: list[str] | None = None,
    description: str = "",
    severity: str = "low",
    conn: Connection | None = None,
) -> dict:
    """
    Create a composite alarm combining multiple rules with AND/OR logic.

    Args:
        composite_rule: Composite boolean rule dict.
            Example:
                {
                    "or": [
                        {"type": "gnocchi_resources_threshold", ...},
                        {"type": "gnocchi_resources_threshold", ...},
                    ]
                }
    """
    conn = conn or get_connection()
    payload: dict[str, Any] = {
        "name":                  name,
        "type":                  "composite",
        "severity":              severity,
        "description":           description,
        "alarm_actions":         alarm_actions or [],
        "ok_actions":            ok_actions or [],
        "composite_rule":        composite_rule,
    }
    resp = conn.session.post(_base_url(conn) + "/alarms", json=payload)
    resp.raise_for_status()
    data = resp.json()
    logger.info("Created composite alarm %s (%s)", name, data.get("alarm_id"))
    return data


def update_alarm(alarm_id: str, updates: dict, conn: Connection | None = None) -> dict:
    """Update alarm fields (name, threshold, actions, state, etc.)."""
    conn = conn or get_connection()
    resp = conn.session.patch(
        _base_url(conn) + f"/alarms/{alarm_id}",
        json=updates,
    )
    resp.raise_for_status()
    return resp.json()


def delete_alarm(alarm_id: str, conn: Connection | None = None) -> None:
    """Delete an Aodh alarm."""
    conn = conn or get_connection()
    resp = conn.session.delete(_base_url(conn) + f"/alarms/{alarm_id}")
    if resp.status_code not in (200, 204, 404):
        resp.raise_for_status()
    logger.info("Deleted Aodh alarm %s", alarm_id)


def get_alarm_state(alarm_id: str, conn: Connection | None = None) -> str | None:
    """Get the current evaluation state of an alarm: 'ok', 'alarm', or 'insufficient data'."""
    conn = conn or get_connection()
    resp = conn.session.get(_base_url(conn) + f"/alarms/{alarm_id}/state")
    if resp.status_code == 404:
        return None
    resp.raise_for_status()
    return resp.json()


def set_alarm_state(
    alarm_id: str,
    state: str,
    conn: Connection | None = None,
) -> None:
    """
    Manually set an alarm's evaluation state.

    Args:
        state: 'ok', 'alarm', or 'insufficient data'.
    """
    conn = conn or get_connection()
    resp = conn.session.put(
        _base_url(conn) + f"/alarms/{alarm_id}/state",
        json=state,
    )
    resp.raise_for_status()
    logger.info("Set alarm %s state to '%s'", alarm_id, state)


# ── Alarm History ──────────────────────────────────────────────────────────────

def get_alarm_history(
    alarm_id: str,
    *,
    limit: int | None = None,
    conn: Connection | None = None,
) -> list[dict]:
    """
    Get the evaluation history of an alarm.

    Args:
        limit: Maximum history entries to return.
    """
    conn = conn or get_connection()
    params: dict[str, Any] = {}
    if limit:
        params["limit"] = limit
    resp = conn.session.get(
        _base_url(conn) + f"/alarms/{alarm_id}/history",
        params=params,
    )
    resp.raise_for_status()
    return resp.json()
