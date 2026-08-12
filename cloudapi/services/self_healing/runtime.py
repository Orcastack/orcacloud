"""Django-facing composition root for the self-healing control plane."""

from __future__ import annotations

import os
from pathlib import Path

from .control_plane import (
    ActionDispatcher,
    ActualStatus,
    DesiredStateRepository,
    InMemoryEventBus,
    MockActualStateCollector,
    ReconciliationController,
    RECONCILE_REQUEST_QUEUE,
    STATE_EVENT_QUEUE,
)


def default_spec_path() -> Path:
    configured = os.environ.get("SELF_HEALING_SPECS_PATH")
    if configured:
        return Path(configured)
    return Path(__file__).resolve().parents[2] / "config" / "self_healing" / "desired-state.json"


class ControlPlaneRuntime:
    def __init__(self, spec_path: Path | None = None):
        self.event_bus = InMemoryEventBus()
        self.collector = MockActualStateCollector()
        self.repository = DesiredStateRepository(spec_path or default_spec_path())
        self.dispatcher = ActionDispatcher(self.event_bus)
        self.controller = ReconciliationController(
            self.repository, self.collector, self.dispatcher, self.event_bus,
            loop_interval_seconds=float(os.environ.get("SELF_HEALING_LOOP_INTERVAL", "15")),
        )

    def record_health(self, node_id: str, payload: dict) -> ActualStatus:
        service_id = str(payload.get("service_id", "")).strip()
        if not service_id:
            raise ValueError("service_id is required")
        instances = payload.get("instances")
        if not isinstance(instances, int) or instances < 0:
            raise ValueError("instances must be a non-negative integer")
        status = ActualStatus(
            service_id=service_id,
            instances=instances,
            unhealthy_instance_ids=tuple(payload.get("unhealthy_instance_ids", [])),
            offline_node_ids=tuple(payload.get("offline_node_ids", [])),
            latency_ms=payload.get("latency_ms"),
        )
        self.collector.set_status(status)
        self.event_bus.push(STATE_EVENT_QUEUE, {"node_id": node_id, "service_id": service_id, "status": "received"})
        self.event_bus.push(RECONCILE_REQUEST_QUEUE, {"service_id": service_id, "reason": "health_update"})
        return status


runtime = ControlPlaneRuntime()
