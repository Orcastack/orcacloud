# OrcaCloud Self-Healing Control Plane

The self-healing brain is intentionally node-agnostic. Its production boundary is a desired-state document, an actual-state collector, and three named queues:

- `state-events`: health reports, crash signals, and node-offline signals.
- `reconcile-requests`: desired-state or health changes that should prompt a reconciliation pass.
- `actions`: recovery instructions such as `scale_up`, `scale_down`, `restart_unhealthy`, and `reschedule`.

The version-controlled example desired state is [desired-state.json](../../config/self_healing/desired-state.json). Set `SELF_HEALING_SPECS_PATH` to use a GitOps-mounted file at deployment time. The repository writes updates atomically; production controllers should treat Git changes as the source of truth rather than allowing arbitrary API updates.

Run a single reconciliation pass:

```sh
python manage.py reconcile_self_healing --once
```

Run the continuous control loop:

```sh
python manage.py reconcile_self_healing
```

## NodeAgent Contract

All endpoints are authenticated and are available under `/api/v1/services/`:

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `self-healing/nodes/{node_id}/status/?service_id={id}` | Read a service's last collected status. |
| `POST` | `self-healing/nodes/{node_id}/health/` | Submit health and instance state. |
| `POST` | `self-healing/nodes/{node_id}/action/` | Accept an action for a node agent. |

Health payload:

```json
{
  "service_id": "platform-api",
  "instances": 1,
  "unhealthy_instance_ids": ["platform-api-1"],
  "offline_node_ids": [],
  "latency_ms": 24.5
}
```

Action payload:

```json
{
  "service_id": "platform-api",
  "action_type": "restart_unhealthy",
  "payload": {"instance_ids": ["platform-api-1"]}
}
```

`MockActualStateCollector` and `InMemoryEventBus` are the only local implementations today. Replace them in [runtime.py](runtime.py) with a NodeAgent HTTP/gRPC collector and Redis or RabbitMQ adapter without changing [control_plane.py](control_plane.py). The core test suite simulates under-capacity, unhealthy instances, offline nodes, and disabled services without a running node.
