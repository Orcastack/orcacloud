# OrcaCloud – OpenStack REST API Views (Django REST Framework)
#
# Exposes OpenStack cloud operations as authenticated REST endpoints.
# All endpoints require:  Authorization: Token <token>
#
# Routes (registered in services/urls.py under /api/services/cloud/):
#
#   GET     cloud/servers/                List all servers
#   POST    cloud/servers/                Create a server
#   GET     cloud/servers/<id>/           Get server detail
#   DELETE  cloud/servers/<id>/           Delete a server
#   POST    cloud/servers/<id>/start/     Start a server
#   POST    cloud/servers/<id>/stop/      Stop a server
#   POST    cloud/servers/<id>/reboot/    Reboot a server
#
#   GET     cloud/flavors/                List flavors
#   GET     cloud/images/                 List images
#
#   GET     cloud/networks/               List networks
#   POST    cloud/networks/               Create a network
#   DELETE  cloud/networks/<id>/          Delete a network
#   GET     cloud/networks/<id>/subnets/  List subnets for a network
#   POST    cloud/networks/<id>/subnets/  Create a subnet
#
#   GET     cloud/security-groups/        List security groups
#   POST    cloud/security-groups/        Create a security group
#   POST    cloud/security-groups/<id>/rules/ Add a rule
#
#   GET     cloud/floating-ips/           List floating IPs
#   POST    cloud/floating-ips/           Allocate a floating IP
#
#   GET     cloud/volumes/                List volumes
#   POST    cloud/volumes/                Create a volume
#   GET     cloud/volumes/<id>/           Get volume detail
#   DELETE  cloud/volumes/<id>/           Delete a volume
#   POST    cloud/volumes/<id>/attach/    Attach volume to server
#   POST    cloud/volumes/<id>/detach/    Detach volume
#
#   GET     cloud/snapshots/              List snapshots
#   POST    cloud/snapshots/              Create snapshot
#   DELETE  cloud/snapshots/<id>/         Delete snapshot
#
#   GET     cloud/status/                 OpenStack connectivity health check

import logging

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status as http_status

from infrastructure.openstack_conn import is_openstack_configured
import infrastructure.openstack.compute as osc
import infrastructure.openstack.networking.network as osn
import infrastructure.openstack.storage.volume as osv

logger = logging.getLogger(__name__)


# ── Shared helper ──────────────────────────────────────────────────────────────

def _openstack_error(exc: Exception) -> Response:
    """Convert an OpenStack SDK exception into a structured JSON error response."""
    msg = str(exc)
    logger.error("OpenStack error: %s", msg)
    code = http_status.HTTP_503_SERVICE_UNAVAILABLE
    # Map common SDK exceptions to HTTP codes
    if "Not Found" in msg or "404" in msg:
        code = http_status.HTTP_404_NOT_FOUND
    elif "Conflict" in msg or "409" in msg:
        code = http_status.HTTP_409_CONFLICT
    elif "Forbidden" in msg or "403" in msg:
        code = http_status.HTTP_403_FORBIDDEN
    elif "Bad Request" in msg or "400" in msg:
        code = http_status.HTTP_400_BAD_REQUEST
    return Response({"detail": msg, "source": "openstack"}, status=code)


# ── Status / health ────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def cloud_status(request):
    """
    GET /api/services/cloud/status/
    Returns whether OpenStack is configured and reachable.
    """
    configured = is_openstack_configured()
    return Response({
        "openstack_configured": configured,
        "message": "OpenStack is configured." if configured
                   else "OpenStack credentials are not configured. Set OS_AUTH_URL, OS_USERNAME, OS_PASSWORD environment variables.",
    })


# ── Servers ───────────────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def servers_list_create(request):
    """
    GET  /api/services/cloud/servers/  – list all servers
    POST /api/services/cloud/servers/  – create a server

    POST body:
    {
        "name":       "web-01",
        "image_id":   "<openstack-image-uuid>",
        "flavor_id":  "<openstack-flavor-uuid>",
        "network_id": "<openstack-network-uuid>",
        "key_name":   "my-ssh-key",          (optional)
        "wait":       true                    (optional, default true)
    }
    """
    try:
        if request.method == "GET":
            return Response(osc.list_servers())

        # POST – create
        data = request.data
        required = ["name", "image_id", "flavor_id", "network_id"]
        missing = [f for f in required if not data.get(f)]
        if missing:
            return Response(
                {"detail": f"Missing required fields: {', '.join(missing)}"},
                status=http_status.HTTP_400_BAD_REQUEST,
            )
        server = osc.create_server(
            name=data["name"],
            image_id=data["image_id"],
            flavor_id=data["flavor_id"],
            network_id=data["network_id"],
            key_name=data.get("key_name"),
            security_groups=data.get("security_groups"),
            user_data=data.get("user_data"),
            wait=data.get("wait", True),
        )
        return Response(server, status=http_status.HTTP_201_CREATED)

    except Exception as exc:
        return _openstack_error(exc)


@api_view(["GET", "DELETE"])
@permission_classes([IsAuthenticated])
def server_detail_delete(request, server_id: str):
    """
    GET    /api/services/cloud/servers/<server_id>/
    DELETE /api/services/cloud/servers/<server_id>/
    """
    try:
        if request.method == "GET":
            server = osc.get_server(server_id)
            if server is None:
                return Response({"detail": "Server not found."}, status=http_status.HTTP_404_NOT_FOUND)
            return Response(server)

        osc.delete_server(server_id)
        return Response(status=http_status.HTTP_204_NO_CONTENT)

    except Exception as exc:
        return _openstack_error(exc)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def server_start(request, server_id: str):
    """POST /api/services/cloud/servers/<server_id>/start/"""
    try:
        osc.start_server(server_id)
        return Response({"detail": "Server start requested."})
    except Exception as exc:
        return _openstack_error(exc)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def server_stop(request, server_id: str):
    """POST /api/services/cloud/servers/<server_id>/stop/"""
    try:
        osc.stop_server(server_id)
        return Response({"detail": "Server stop requested."})
    except Exception as exc:
        return _openstack_error(exc)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def server_reboot(request, server_id: str):
    """
    POST /api/services/cloud/servers/<server_id>/reboot/
    Body: { "type": "SOFT" }  or  { "type": "HARD" }  (defaults to SOFT)
    """
    try:
        reboot_type = request.data.get("type", "SOFT").upper()
        if reboot_type not in ("SOFT", "HARD"):
            return Response({"detail": "type must be SOFT or HARD."}, status=http_status.HTTP_400_BAD_REQUEST)
        osc.reboot_server(server_id, reboot_type=reboot_type)
        return Response({"detail": f"Server {reboot_type} reboot requested."})
    except Exception as exc:
        return _openstack_error(exc)


# ── Flavors ───────────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def flavors_list(request):
    """GET /api/services/cloud/flavors/"""
    try:
        return Response(osc.list_flavors())
    except Exception as exc:
        return _openstack_error(exc)


# ── Images ────────────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def images_list(request):
    """GET /api/services/cloud/images/"""
    try:
        return Response(osc.list_images())
    except Exception as exc:
        return _openstack_error(exc)


# ── Networks ──────────────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def networks_list_create(request):
    """
    GET  /api/services/cloud/networks/
    POST /api/services/cloud/networks/
    POST body: { "name": "my-net", "shared": false }
    """
    try:
        if request.method == "GET":
            return Response(osn.list_networks())
        name = request.data.get("name")
        if not name:
            return Response({"detail": "name is required."}, status=http_status.HTTP_400_BAD_REQUEST)
        net = osn.create_network(
            name=name,
            shared=request.data.get("shared", False),
        )
        return Response(net, status=http_status.HTTP_201_CREATED)
    except Exception as exc:
        return _openstack_error(exc)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def network_delete(request, network_id: str):
    """DELETE /api/services/cloud/networks/<network_id>/"""
    try:
        osn.delete_network(network_id)
        return Response(status=http_status.HTTP_204_NO_CONTENT)
    except Exception as exc:
        return _openstack_error(exc)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def subnets_list_create(request, network_id: str):
    """
    GET  /api/services/cloud/networks/<network_id>/subnets/
    POST /api/services/cloud/networks/<network_id>/subnets/
    POST body: { "name": "sub-01", "cidr": "10.0.1.0/24", "ip_version": 4 }
    """
    try:
        if request.method == "GET":
            return Response(osn.list_subnets(network_id=network_id))
        data = request.data
        if not data.get("cidr"):
            return Response({"detail": "cidr is required."}, status=http_status.HTTP_400_BAD_REQUEST)
        subnet = osn.create_subnet(
            network_id=network_id,
            name=data.get("name", ""),
            cidr=data["cidr"],
            ip_version=data.get("ip_version", 4),
            dns_nameservers=data.get("dns_nameservers"),
        )
        return Response(subnet, status=http_status.HTTP_201_CREATED)
    except Exception as exc:
        return _openstack_error(exc)


# ── Security Groups ───────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def security_groups_list_create(request):
    """
    GET  /api/services/cloud/security-groups/
    POST /api/services/cloud/security-groups/
    POST body: { "name": "web-sg", "description": "Allow HTTP" }
    """
    try:
        if request.method == "GET":
            return Response(osn.list_security_groups())
        name = request.data.get("name")
        if not name:
            return Response({"detail": "name is required."}, status=http_status.HTTP_400_BAD_REQUEST)
        sg = osn.create_security_group(
            name=name,
            description=request.data.get("description", ""),
        )
        return Response(sg, status=http_status.HTTP_201_CREATED)
    except Exception as exc:
        return _openstack_error(exc)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def security_group_add_rule(request, sg_id: str):
    """
    POST /api/services/cloud/security-groups/<sg_id>/rules/
    Body: { "direction": "ingress", "protocol": "tcp", "port_range_min": 80, "port_range_max": 80, "remote_ip_prefix": "0.0.0.0/0" }
    """
    try:
        rule = osn.add_security_group_rule(
            security_group_id=sg_id,
            direction=request.data.get("direction", "ingress"),
            protocol=request.data.get("protocol"),
            port_range_min=request.data.get("port_range_min"),
            port_range_max=request.data.get("port_range_max"),
            remote_ip_prefix=request.data.get("remote_ip_prefix"),
            ethertype=request.data.get("ethertype", "IPv4"),
        )
        return Response(rule, status=http_status.HTTP_201_CREATED)
    except Exception as exc:
        return _openstack_error(exc)


# ── Floating IPs ──────────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def floating_ips(request):
    """
    GET  /api/services/cloud/floating-ips/
    POST /api/services/cloud/floating-ips/
    POST body: { "external_network": "public" }  (defaults to "public")
    """
    try:
        if request.method == "GET":
            return Response(osn.list_floating_ips())
        fip = osn.allocate_floating_ip(
            external_network_name=request.data.get("external_network", "public")
        )
        return Response(fip, status=http_status.HTTP_201_CREATED)
    except Exception as exc:
        return _openstack_error(exc)


# ── Volumes ───────────────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def volumes_list_create(request):
    """
    GET  /api/services/cloud/volumes/
    POST /api/services/cloud/volumes/
    POST body: { "name": "data-vol", "size_gb": 50, "volume_type": "SSD" }
    """
    try:
        if request.method == "GET":
            return Response(osv.list_volumes())
        data = request.data
        if not data.get("name") or not data.get("size_gb"):
            return Response({"detail": "name and size_gb are required."}, status=http_status.HTTP_400_BAD_REQUEST)
        vol = osv.create_volume(
            name=data["name"],
            size_gb=int(data["size_gb"]),
            volume_type=data.get("volume_type"),
            availability_zone=data.get("availability_zone"),
            description=data.get("description", ""),
        )
        return Response(vol, status=http_status.HTTP_201_CREATED)
    except Exception as exc:
        return _openstack_error(exc)


@api_view(["GET", "DELETE"])
@permission_classes([IsAuthenticated])
def volume_detail_delete(request, volume_id: str):
    """
    GET    /api/services/cloud/volumes/<volume_id>/
    DELETE /api/services/cloud/volumes/<volume_id>/
    """
    try:
        if request.method == "GET":
            vol = osv.get_volume(volume_id)
            if vol is None:
                return Response({"detail": "Volume not found."}, status=http_status.HTTP_404_NOT_FOUND)
            return Response(vol)
        osv.delete_volume(volume_id)
        return Response(status=http_status.HTTP_204_NO_CONTENT)
    except Exception as exc:
        return _openstack_error(exc)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def volume_attach(request, volume_id: str):
    """
    POST /api/services/cloud/volumes/<volume_id>/attach/
    Body: { "server_id": "<server-uuid>" }
    """
    try:
        server_id = request.data.get("server_id")
        if not server_id:
            return Response({"detail": "server_id is required."}, status=http_status.HTTP_400_BAD_REQUEST)
        result = osv.attach_volume(server_id=server_id, volume_id=volume_id)
        return Response(result, status=http_status.HTTP_201_CREATED)
    except Exception as exc:
        return _openstack_error(exc)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def volume_detach(request, volume_id: str):
    """
    POST /api/services/cloud/volumes/<volume_id>/detach/
    Body: { "server_id": "<server-uuid>", "attachment_id": "<attachment-uuid>" }
    """
    try:
        data = request.data
        if not data.get("server_id") or not data.get("attachment_id"):
            return Response({"detail": "server_id and attachment_id are required."}, status=http_status.HTTP_400_BAD_REQUEST)
        osv.detach_volume(server_id=data["server_id"], attachment_id=data["attachment_id"])
        return Response({"detail": "Volume detached."})
    except Exception as exc:
        return _openstack_error(exc)


# ── Snapshots ─────────────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def snapshots_list_create(request):
    """
    GET  /api/services/cloud/snapshots/
    POST /api/services/cloud/snapshots/
    POST body: { "volume_id": "<uuid>", "name": "snap-01", "force": false }
    """
    try:
        if request.method == "GET":
            return Response(osv.list_snapshots())
        data = request.data
        if not data.get("volume_id") or not data.get("name"):
            return Response({"detail": "volume_id and name are required."}, status=http_status.HTTP_400_BAD_REQUEST)
        snap = osv.create_snapshot(
            volume_id=data["volume_id"],
            name=data["name"],
            description=data.get("description", ""),
            force=data.get("force", False),
        )
        return Response(snap, status=http_status.HTTP_201_CREATED)
    except Exception as exc:
        return _openstack_error(exc)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def snapshot_delete(request, snapshot_id: str):
    """DELETE /api/services/cloud/snapshots/<snapshot_id>/"""
    try:
        osv.delete_snapshot(snapshot_id)
        return Response(status=http_status.HTTP_204_NO_CONTENT)
    except Exception as exc:
        return _openstack_error(exc)
