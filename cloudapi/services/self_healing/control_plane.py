"""Pure-Python self-healing control-plane components.

The production node transport is intentionally outside this module.  The
control loop uses the collector and event-bus interfaces, so mock components
exercise exactly the same reconciliation logic before nodes exist.
"""

from __future__ import annotations

import json
import os
import threading
import time
import uuid
from dataclasses import asdict, dataclass, field
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Any, Iterable


STATE_EVENT_QUEUE = "state-events"
RECONCILE_REQUEST_QUEUE = "reconcile-requests"
ACTION_QUEUE = "actions"
QUEUE_NAMES = (STATE_EVENT_QUEUE, RECONCILE_REQUEST_QUEUE, ACTION_QUEUE)


@dataclass(frozen=True)
class ServiceSpec:
    id: str
    instances: int
    enabled: bool = True
    restart_unhealthy: bool = True
    metadata: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_dict(cls, value: dict[str, Any]) -> "ServiceSpec":
        service_id = str(value.get("id", "")).strip()
        instances = value.get("instances")
        if not service_id:
            raise ValueError("service spec requires a non-empty id")
        if not isinstance(instances, int) or instances < 0:
            raise ValueError("service spec instances must be a non-negative integer")
        return cls(
            id=service_id,
            instances=instances,
            enabled=bool(value.get("enabled", True)),
            restart_unhealthy=bool(value.get("restart_unhealthy", True)),
            metadata=dict(value.get("metadata", {})),
        )


@dataclass(frozen=True)
class ActualStatus:
    service_id: str
    instances: int
    unhealthy_instance_ids: tuple[str, ...] = ()
    offline_node_ids: tuple[str, ...] = ()
    latency_ms: float | None = None

    def has_unhealthy(self) -> bool:
        return bool(self.unhealthy_instance_ids)


@dataclass(frozen=True)
class RecoveryAction:
    action_type: str
    service_id: str
    payload: dict[str, Any] = field(default_factory=dict)
    id: str = field(default_factory=lambda: f"act-{uuid.uuid4().hex}")

    def as_dict(self) -> dict[str, Any]:
        return asdict(self)


class DesiredStateRepository:
    """JSON-backed desired-state repository suitable for GitOps-managed specs."""

    def __init__(self, path: str | Path):
        self.path = Path(path)
        self._lock = threading.RLock()

    def list_specs(self) -> list[ServiceSpec]:
        with self._lock:
            if not self.path.exists():
                return []
            document = json.loads(self.path.read_text(encoding="utf-8"))
            return [ServiceSpec.from_dict(item) for item in document.get("services", [])]

    def get_spec(self, service_id: str) -> ServiceSpec | None:
        return next((spec for spec in self.list_specs() if spec.id == service_id), None)

    def update_spec(self, service_id: str, spec: ServiceSpec | dict[str, Any]) -> ServiceSpec:
        candidate = spec if isinstance(spec, ServiceSpec) else ServiceSpec.from_dict(spec)
        if candidate.id != service_id:
            raise ValueError("service_id must match the spec id")
        with self._lock:
            existing = {item.id: item for item in self.list_specs()}
            existing[service_id] = candidate
            self.path.parent.mkdir(parents=True, exist_ok=True)
            with NamedTemporaryFile("w", encoding="utf-8", delete=False, dir=self.path.parent) as handle:
                json.dump({"services": [asdict(item) for item in sorted(existing.values(), key=lambda item: item.id)]}, handle, indent=2)
                handle.write("\n")
                temporary_path = handle.name
            os.replace(temporary_path, self.path)
        return candidate


class InMemoryEventBus:
    """Thread-safe development event bus with the production queue contract."""

    def __init__(self):
        self._queues: dict[str, list[dict[str, Any]]] = {name: [] for name in QUEUE_NAMES}
        self._lock = threading.RLock()

    def push(self, queue_name: str, payload: dict[str, Any]) -> None:
        if queue_name not in self._queues:
            raise ValueError(f"unknown self-healing queue: {queue_name}")
        with self._lock:
            self._queues[queue_name].append(payload)

    def drain(self, queue_name: str) -> list[dict[str, Any]]:
        if queue_name not in self._queues:
            raise ValueError(f"unknown self-healing queue: {queue_name}")
        with self._lock:
            messages = self._queues[queue_name]
            self._queues[queue_name] = []
            return messages

    def snapshot(self, queue_name: str) -> list[dict[str, Any]]:
        if queue_name not in self._queues:
            raise ValueError(f"unknown self-healing queue: {queue_name}")
        with self._lock:
            return list(self._queues[queue_name])


class ActualStateCollector:
    """Mockable collector boundary; replace its implementation with NodeAgent calls later."""

    def get_status(self, service_id: str) -> ActualStatus:
        raise NotImplementedError


class MockActualStateCollector(ActualStateCollector):
    def __init__(self, statuses: Iterable[ActualStatus] = ()):
        self._statuses = {status.service_id: status for status in statuses}
        self._lock = threading.RLock()

    def get_status(self, service_id: str) -> ActualStatus:
        with self._lock:
            return self._statuses.get(service_id, ActualStatus(service_id=service_id, instances=0))

    def set_status(self, status: ActualStatus) -> None:
        if status.instances < 0:
            raise ValueError("actual instances must be non-negative")
        with self._lock:
            self._statuses[status.service_id] = status


class ActionDispatcher:
    def __init__(self, event_bus: InMemoryEventBus, cooldown_seconds: float = 30.0):
        self.event_bus = event_bus
        self.cooldown_seconds = cooldown_seconds
        self._recent: dict[tuple[str, str], float] = {}

    def dispatch(self, action: RecoveryAction) -> bool:
        key = (action.action_type, action.service_id)
        now = time.monotonic()
        if now - self._recent.get(key, float("-inf")) < self.cooldown_seconds:
            return False
        self._recent[key] = now
        self.event_bus.push(ACTION_QUEUE, action.as_dict())
        return True


class ReconciliationController:
    """Compares actual and desired state and dispatches idempotency-cooled actions."""

    def __init__(self, desired_repo: DesiredStateRepository, actual_collector: ActualStateCollector,
                 dispatcher: ActionDispatcher, event_bus: InMemoryEventBus, loop_interval_seconds: float = 15.0):
        self.desired_repo = desired_repo
        self.actual_collector = actual_collector
        self.dispatcher = dispatcher
        self.event_bus = event_bus
        self.loop_interval_seconds = loop_interval_seconds

    def reconcile(self, spec: ServiceSpec) -> list[RecoveryAction]:
        if not spec.enabled:
            return []
        actual = self.actual_collector.get_status(spec.id)
        proposed: list[RecoveryAction] = []
        if actual.instances < spec.instances:
            proposed.append(RecoveryAction("scale_up", spec.id, {"count": spec.instances - actual.instances}))
        elif actual.instances > spec.instances:
            proposed.append(RecoveryAction("scale_down", spec.id, {"count": actual.instances - spec.instances}))
        if spec.restart_unhealthy and actual.has_unhealthy():
            proposed.append(RecoveryAction("restart_unhealthy", spec.id, {"instance_ids": list(actual.unhealthy_instance_ids)}))
        if actual.offline_node_ids:
            proposed.append(RecoveryAction("reschedule", spec.id, {"offline_node_ids": list(actual.offline_node_ids)}))
        return [action for action in proposed if self.dispatcher.dispatch(action)]

    def reconcile_once(self) -> list[RecoveryAction]:
        actions = [action for spec in self.desired_repo.list_specs() for action in self.reconcile(spec)]
        self.event_bus.drain(RECONCILE_REQUEST_QUEUE)
        return actions

    def run(self, stop_event: threading.Event) -> None:
        while not stop_event.is_set():
            self.reconcile_once()
            stop_event.wait(self.loop_interval_seconds)
