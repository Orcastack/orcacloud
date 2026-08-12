import json

from services.self_healing.control_plane import (
    ACTION_QUEUE,
    ActionDispatcher,
    ActualStatus,
    DesiredStateRepository,
    InMemoryEventBus,
    MockActualStateCollector,
    ReconciliationController,
)


def build_controller(tmp_path, status):
    spec_path = tmp_path / "desired-state.json"
    spec_path.write_text(json.dumps({"services": [{"id": "checkout", "instances": 3}]}))
    repository = DesiredStateRepository(spec_path)
    bus = InMemoryEventBus()
    controller = ReconciliationController(
        repository, MockActualStateCollector([status]), ActionDispatcher(bus, cooldown_seconds=0), bus
    )
    return controller, bus, repository


def test_reconciliation_scales_and_restarts_unhealthy_instances(tmp_path):
    controller, bus, _ = build_controller(
        tmp_path, ActualStatus("checkout", instances=1, unhealthy_instance_ids=("checkout-1",))
    )

    actions = controller.reconcile_once()

    assert [action.action_type for action in actions] == ["scale_up", "restart_unhealthy"]
    assert bus.snapshot(ACTION_QUEUE)[0]["payload"] == {"count": 2}
    assert bus.snapshot(ACTION_QUEUE)[1]["payload"] == {"instance_ids": ["checkout-1"]}


def test_reconciliation_reschedules_offline_nodes_and_scales_down(tmp_path):
    controller, _, _ = build_controller(
        tmp_path, ActualStatus("checkout", instances=5, offline_node_ids=("node-a",))
    )

    actions = controller.reconcile_once()

    assert [action.action_type for action in actions] == ["scale_down", "reschedule"]


def test_repository_update_is_visible_to_new_control_loop(tmp_path):
    controller, _, repository = build_controller(tmp_path, ActualStatus("checkout", instances=2))
    repository.update_spec("checkout", {"id": "checkout", "instances": 2, "enabled": False})

    assert controller.reconcile_once() == []


def test_dispatcher_cools_down_repeated_recovery_actions(tmp_path):
    controller, bus, _ = build_controller(tmp_path, ActualStatus("checkout", instances=1))
    controller.dispatcher.cooldown_seconds = 60

    controller.reconcile_once()
    controller.reconcile_once()

    assert len(bus.snapshot(ACTION_QUEUE)) == 1
