"""NodeAgent contract and self-healing control-plane API views."""

from __future__ import annotations

from dataclasses import asdict

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .control_plane import ACTION_QUEUE
from .runtime import runtime


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_specs(request):
    return Response({"services": [asdict(spec) for spec in runtime.repository.list_specs()]})


@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def update_spec(request, service_id: str):
    try:
        spec = runtime.repository.update_spec(service_id, request.data)
    except ValueError as error:
        return Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)
    runtime.event_bus.push("reconcile-requests", {"service_id": service_id, "reason": "desired_state_changed"})
    return Response(asdict(spec))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def reconcile_now(request):
    actions = runtime.controller.reconcile_once()
    return Response({"actions": [action.as_dict() for action in actions]})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def node_status(request, node_id: str):
    service_id = request.query_params.get("service_id", "")
    if not service_id:
        return Response({"detail": "service_id is required"}, status=status.HTTP_400_BAD_REQUEST)
    return Response({"node_id": node_id, "status": asdict(runtime.collector.get_status(service_id))})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def node_health(request, node_id: str):
    try:
        health = runtime.record_health(node_id, request.data)
    except ValueError as error:
        return Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)
    return Response({"node_id": node_id, "status": asdict(health)}, status=status.HTTP_202_ACCEPTED)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def node_action(request, node_id: str):
    action_type = str(request.data.get("action_type", "")).strip()
    service_id = str(request.data.get("service_id", "")).strip()
    if not action_type or not service_id:
        return Response({"detail": "action_type and service_id are required"}, status=status.HTTP_400_BAD_REQUEST)
    runtime.event_bus.push(ACTION_QUEUE, {
        "action_type": action_type,
        "service_id": service_id,
        "node_id": node_id,
        "payload": dict(request.data.get("payload", {})),
    })
    return Response({"node_id": node_id, "accepted": True}, status=status.HTTP_202_ACCEPTED)
