# OrcaCloud – Unified Provisioning API
#
# These endpoints bridge the frontend → backend → OpenStack pipeline.
# Every request MUST carry workspace_id + environment_id in the body (or query
# params for GETs) so that the correct OpenStack project is selected per the
# workspace binding.
#
# Error contract:
#   4xx  { "error": "<human message>" }   – client mistake
#   5xx  { "error": "<human message>" }   – server / OpenStack failure
#
# All successful create responses follow:
#   { "resource": { ... OpenStack attrs ... }, "provisioned": { ... DB record ... } }

import logging

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework import status

from services.workspace.service import (
    WorkspaceService,
    WorkspaceNotFound,
    WorkspaceInactive,
    BindingNotFound,
)
from services.workspace.serializers import ProvisionedResourceSerializer

logger = logging.getLogger(__name__)


# ── helpers ────────────────────────────────────────────────────────────────────

def _err(msg: str, code: int = 400) -> Response:
    return Response({"error": msg}, status=code)


def _resolve(data: dict):
    """Resolve workspace binding from request data. Returns (binding, None) or
    (None, error Response)."""
    try:
        workspace_id, environment = WorkspaceService.validate_request(data)
        binding = WorkspaceService.resolve(workspace_id, environment)
        return binding, None
    except ValueError as exc:
        return None, _err(str(exc), 400)
    except WorkspaceNotFound as exc:
        return None, _err(str(exc), 404)
    except WorkspaceInactive as exc:
        return None, _err(str(exc), 403)
    except BindingNotFound as exc:
        return None, _err(str(exc), 404)


# ── Compute ────────────────────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def provision_vm(request: Request) -> Response:
    """
    Create a VM in the workspace's OpenStack project.

    Body:
        workspace_id    str
        environment_id  str   (dev | staging | prod)
        name            str
        flavor_id       str   OpenStack flavor UUID
        image_id        str   OpenStack image UUID
        network_id      str   (optional)
        key_name        str   (optional)
        user_data       str   (optional, cloud-init)
    """
    binding, err = _resolve(request.data)
    if err:
        return err

    name      = request.data.get("name", "")
    flavor_id = request.data.get("flavor_id", "")
    image_id  = request.data.get("image_id", "")

    if not all([name, flavor_id, image_id]):
        return _err("'name', 'flavor_id', and 'image_id' are required.")

    try:
        conn = WorkspaceService.get_connection(binding)
        kwargs = dict(
            name=name,
            flavor=flavor_id,
            image=image_id,
        )
        if network_id := request.data.get("network_id"):
            kwargs["network"] = network_id
        if key_name := request.data.get("key_name"):
            kwargs["key_name"] = key_name
        if user_data := request.data.get("user_data"):
            kwargs["userdata"] = user_data

        server = conn.compute.create_server(**kwargs)
        conn.compute.wait_for_server(server, status="ACTIVE", wait=5)

        provisioned = WorkspaceService.register_resource(
            binding=binding,
            resource_type="vm",
            resource_id=server.id,
            resource_name=server.name,
            status="active",
            metadata={"flavor_id": flavor_id, "image_id": image_id},
            created_by=request.user,
        )

        return Response(
            {
                "resource": dict(server),
                "provisioned": ProvisionedResourceSerializer(provisioned).data,
            },
            status=status.HTTP_201_CREATED,
        )

    except Exception as exc:
        logger.exception("provision_vm failed for workspace=%s env=%s",
                         binding.workspace.workspace_id, binding.environment)
        return _err(f"OpenStack error: {exc}", 500)


# ── Storage ────────────────────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def provision_volume(request: Request) -> Response:
    """
    Create a block-storage volume.

    Body:
        workspace_id    str
        environment_id  str
        name            str
        size_gb         int
        volume_type     str   (optional)
        description     str   (optional)
    """
    binding, err = _resolve(request.data)
    if err:
        return err

    name    = request.data.get("name", "")
    size_gb = request.data.get("size_gb")

    if not name or not size_gb:
        return _err("'name' and 'size_gb' are required.")

    try:
        conn = WorkspaceService.get_connection(binding)
        volume = conn.block_storage.create_volume(
            name=name,
            size=int(size_gb),
            volume_type=request.data.get("volume_type"),
            description=request.data.get("description", ""),
        )
        conn.block_storage.wait_for_status(volume, status="available", wait=30)

        provisioned = WorkspaceService.register_resource(
            binding=binding,
            resource_type="volume",
            resource_id=volume.id,
            resource_name=volume.name,
            status="active",
            metadata={"size_gb": size_gb},
            created_by=request.user,
        )

        return Response(
            {
                "resource": dict(volume),
                "provisioned": ProvisionedResourceSerializer(provisioned).data,
            },
            status=status.HTTP_201_CREATED,
        )

    except Exception as exc:
        logger.exception("provision_volume failed")
        return _err(f"OpenStack error: {exc}", 500)


# ── Networking ─────────────────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def provision_network(request: Request) -> Response:
    """
    Create a private network (+ optional subnet).

    Body:
        workspace_id    str
        environment_id  str
        name            str
        subnet_cidr     str   (optional, e.g. "10.10.1.0/24")
        subnet_name     str   (optional, defaults to "<name>-subnet")
    """
    binding, err = _resolve(request.data)
    if err:
        return err

    name = request.data.get("name", "")
    if not name:
        return _err("'name' is required.")

    try:
        conn    = WorkspaceService.get_connection(binding)
        network = conn.network.create_network(name=name)

        subnet = None
        if cidr := request.data.get("subnet_cidr"):
            subnet = conn.network.create_subnet(
                name=request.data.get("subnet_name", f"{name}-subnet"),
                network_id=network.id,
                cidr=cidr,
                ip_version=4,
            )

        provisioned = WorkspaceService.register_resource(
            binding=binding,
            resource_type="network",
            resource_id=network.id,
            resource_name=network.name,
            status="active",
            metadata={"subnet_id": subnet.id if subnet else None, "cidr": cidr if subnet else None},
            created_by=request.user,
        )

        payload = {"network": dict(network), "provisioned": ProvisionedResourceSerializer(provisioned).data}
        if subnet:
            payload["subnet"] = dict(subnet)

        return Response(payload, status=status.HTTP_201_CREATED)

    except Exception as exc:
        logger.exception("provision_network failed")
        return _err(f"OpenStack error: {exc}", 500)


# ── Kubernetes ─────────────────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def provision_kubernetes(request: Request) -> Response:
    """
    Create a managed Kubernetes cluster via OpenStack Magnum.

    Body:
        workspace_id        str
        environment_id      str
        name                str
        cluster_template_id str
        node_count          int
        master_count        int   (optional, default 1)
        keypair             str   (optional)
    """
    binding, err = _resolve(request.data)
    if err:
        return err

    name                = request.data.get("name", "")
    cluster_template_id = request.data.get("cluster_template_id", "")
    node_count          = request.data.get("node_count")

    if not all([name, cluster_template_id, node_count]):
        return _err("'name', 'cluster_template_id', and 'node_count' are required.")

    try:
        conn    = WorkspaceService.get_connection(binding)
        cluster = conn.container_infra.create_cluster(
            name=name,
            cluster_template_id=cluster_template_id,
            node_count=int(node_count),
            master_count=int(request.data.get("master_count", 1)),
            keypair=request.data.get("keypair"),
        )

        provisioned = WorkspaceService.register_resource(
            binding=binding,
            resource_type="k8s_cluster",
            resource_id=cluster.uuid,
            resource_name=cluster.name,
            status="creating",
            metadata={"template_id": cluster_template_id, "node_count": node_count},
            created_by=request.user,
        )

        return Response(
            {
                "resource": dict(cluster),
                "provisioned": ProvisionedResourceSerializer(provisioned).data,
            },
            status=status.HTTP_202_ACCEPTED,
        )

    except Exception as exc:
        logger.exception("provision_kubernetes failed")
        return _err(f"OpenStack error: {exc}", 500)


# ── Floating IP ────────────────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def provision_floating_ip(request: Request) -> Response:
    """
    Allocate and optionally associate a floating IP.

    Body:
        workspace_id    str
        environment_id  str
        network_name    str   external network name (default: "public")
        server_id       str   (optional) associate with server
        port_id         str   (optional) associate with port
    """
    binding, err = _resolve(request.data)
    if err:
        return err

    external_network = request.data.get("network_name", "public")

    try:
        conn = WorkspaceService.get_connection(binding)
        fip  = conn.network.create_ip(floating_network_id=external_network)

        if server_id := request.data.get("server_id"):
            server = conn.compute.get_server(server_id)
            conn.compute.add_floating_ip_to_server(server, fip.floating_ip_address)

        elif port_id := request.data.get("port_id"):
            conn.network.update_ip(fip, port_id=port_id)

        provisioned = WorkspaceService.register_resource(
            binding=binding,
            resource_type="floating_ip",
            resource_id=fip.id,
            resource_name=fip.floating_ip_address,
            status="active",
            metadata={"server_id": request.data.get("server_id")},
            created_by=request.user,
        )

        return Response(
            {
                "resource": dict(fip),
                "provisioned": ProvisionedResourceSerializer(provisioned).data,
            },
            status=status.HTTP_201_CREATED,
        )

    except Exception as exc:
        logger.exception("provision_floating_ip failed")
        return _err(f"OpenStack error: {exc}", 500)


# ── Resource inventory ─────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_provisioned_resources(request: Request) -> Response:
    """
    List all resources provisioned for a workspace.

    Query params:
        workspace_id    str
        environment_id  str  (optional)
    """
    workspace_id = request.query_params.get("workspace_id", "")
    environment  = request.query_params.get("environment_id", "")

    if not workspace_id:
        return _err("'workspace_id' query parameter is required.")

    resources = WorkspaceService.list_resources(
        workspace_id=workspace_id,
        environment=environment or None,
    )
    return Response({"resources": resources})


# ── Workspace management (CRUD via views) ──────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_workspaces(request: Request) -> Response:
    """List workspaces accessible to the current user."""
    from services.workspace.models import Workspace
    from services.workspace.serializers import WorkspaceSerializer

    qs = Workspace.objects.filter(
        is_active=True,
    ).filter(
        owner=request.user
    ) | Workspace.objects.filter(
        is_active=True,
        members=request.user,
    )
    qs = qs.distinct().prefetch_related("bindings")
    return Response({"workspaces": WorkspaceSerializer(qs, many=True).data})
