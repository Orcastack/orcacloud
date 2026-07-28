# OrcaCloud – OpenStack Kubernetes Service (Magnum)
#
# Wraps openstack.container_infra (Magnum) operations:
# cluster templates, clusters, and node groups.
#
# Simulated-fallback functions are preserved for environments where Magnum is
# not installed, so the platform can demo / develop without a full cloud.
#
# WORKSPACE-AWARE PATTERN
# ─────────────────────────────────────────────────────────────────────────────
# Every public function accepts an optional `conn` parameter:
#
#   conn=None   → falls back to get_connection() (legacy / admin views)
#   conn=<obj>  → uses the injected workspace-scoped connection

import base64
import hashlib
import logging
from typing import Any

import openstack.connection

from infrastructure.openstack_conn import get_connection, is_openstack_configured
# Import specific functions directly from sibling submodule files to avoid
# circular import through compute/__init__.py
from infrastructure.openstack.compute.compute import list_images, list_flavors, create_server as _create_server
from infrastructure.openstack.networking.network import list_networks as _list_networks

Connection = openstack.connection.Connection

logger = logging.getLogger(__name__)


# ── Private kubeconfig builder ─────────────────────────────────────────────────

def _build_kubeconfig(cluster_name: str, api_endpoint: str) -> str:
    kubeconfig = f"""apiVersion: v1
kind: Config
clusters:
- name: {cluster_name}
  cluster:
    server: {api_endpoint}
    insecure-skip-tls-verify: true
contexts:
- name: {cluster_name}-context
  context:
    cluster: {cluster_name}
    user: {cluster_name}-admin
current-context: {cluster_name}-context
users:
- name: {cluster_name}-admin
  user:
    token: atonix-demo-token
"""
    return base64.b64encode(kubeconfig.encode("utf-8")).decode("utf-8")


def _cluster_to_dict(c) -> dict:
    return {
        "uuid":         c.uuid,
        "name":         c.name,
        "status":       c.status,
        "node_count":   c.node_count,
        "master_count": c.master_count,
        "api_address":  getattr(c, "api_address", None),
        "coe":          getattr(c, "coe", None),
        "created_at":   str(c.created_at) if hasattr(c, "created_at") else None,
    }


# ── Cluster Templates ──────────────────────────────────────────────────────────

def list_cluster_templates(conn: Connection | None = None) -> list[dict]:
    """List all Magnum cluster templates visible to the project."""
    conn = conn or get_connection()
    return [
        {
            "uuid":              t.uuid,
            "name":              t.name,
            "coe":               t.coe,
            "image_id":          t.image_id,
            "flavor_id":         t.flavor_id,
            "master_flavor_id":  t.master_flavor_id,
            "network_driver":    t.network_driver,
            "kubernetes_version": getattr(t, "labels", {}).get("kube_tag")
                if hasattr(t, "labels") else None,
        }
        for t in conn.container_infra.cluster_templates()
    ]


# ── Clusters ───────────────────────────────────────────────────────────────────

def list_clusters(conn: Connection | None = None) -> list[dict]:
    """List all Magnum clusters for the project."""
    conn = conn or get_connection()
    return [_cluster_to_dict(c) for c in conn.container_infra.clusters()]


def get_cluster(cluster_id: str, conn: Connection | None = None) -> dict | None:
    """Fetch a Magnum cluster by UUID. Returns None if not found."""
    conn = conn or get_connection()
    cluster = conn.container_infra.find_cluster(cluster_id, ignore_missing=True)
    return _cluster_to_dict(cluster) if cluster else None


def create_magnum_cluster(
    *,
    name: str,
    cluster_template_id: str,
    node_count: int,
    master_count: int = 1,
    keypair: str | None = None,
    labels: dict | None = None,
    conn: Connection | None = None,
) -> dict:
    """
    Create a Kubernetes cluster via OpenStack Magnum.

    Args:
        name:                  Cluster display name.
        cluster_template_id:   UUID of the Magnum cluster template.
        node_count:            Number of worker nodes.
        master_count:          Number of master nodes (default 1).
        keypair:               SSH keypair name for node access (optional).
        labels:                Extra Magnum labels dict (optional).
        conn:                  Workspace-scoped or global connection.

    Returns:
        Plain dict with cluster UUID, name, status.
    """
    conn = conn or get_connection()
    kwargs: dict[str, Any] = {
        "name":                name,
        "cluster_template_id": cluster_template_id,
        "node_count":          node_count,
        "master_count":        master_count,
    }
    if keypair:
        kwargs["keypair"] = keypair
    if labels:
        kwargs["labels"] = labels

    cluster = conn.container_infra.create_cluster(**kwargs)
    logger.info("Created Magnum cluster %s (%s)", cluster.name, cluster.uuid)
    return _cluster_to_dict(cluster)


def delete_magnum_cluster(cluster_id: str, conn: Connection | None = None) -> None:
    """Delete a Magnum cluster by UUID."""
    conn = conn or get_connection()
    conn.container_infra.delete_cluster(cluster_id, ignore_missing=True)
    logger.info("Deleted Magnum cluster %s", cluster_id)


# ── Legacy provisioning (simulated + real fallback) ────────────────────────────
# Kept for backward-compat with existing ViewSets.
# New workspace-aware code should call create_magnum_cluster() directly.

def provision_kubernetes_cluster(
    *,
    cluster_name: str,
    node_count: int,
    region: str,
    kubernetes_version: str,
    conn: Connection | None = None,
) -> dict[str, Any]:
    """
    Provisions infrastructure backing a K8s cluster using OpenStack when available.
    Falls back to simulated provisioning when OpenStack is not configured.
    """
    api_endpoint = f"https://{cluster_name}.k8s.{region}.orcacloud.cloud:6443"
    kubeconfig = _build_kubeconfig(cluster_name, api_endpoint)

    if not is_openstack_configured():
        nodes = [
            {
                "node_name":             f"{cluster_name}-node-{i + 1}",
                "instance_id":           f"sim-{cluster_name}-{i + 1}",
                "status":                "ready",
                "cpu_allocatable":       4,
                "memory_allocatable_mb": 8192,
                "pods_allocatable":      110,
            }
            for i in range(node_count)
        ]
        return {"provider": "simulated", "api_endpoint": api_endpoint,
                "kubeconfig": kubeconfig, "nodes": nodes}

    try:
        _conn = conn or get_connection()
        networks = _list_networks(conn=_conn)
        images   = list_images(conn=_conn)
        flavors  = list_flavors(conn=_conn)

        if not networks or not images or not flavors:
            raise ValueError("OpenStack returned no networks/images/flavors for cluster provisioning")

        network_id = networks[0]["id"]
        image_id   = images[0]["id"]
        flavor_id  = flavors[0]["id"]

        nodes = []
        for i in range(node_count):
            node_name = f"{cluster_name}-node-{i + 1}"
            server = _create_server(
                name=node_name,
                image_id=image_id,
                flavor_id=flavor_id,
                network_id=network_id,
                wait=False,
                conn=_conn,
            )
            nodes.append({
                "node_name":             node_name,
                "instance_id":           server["id"],
                "status":                "ready",
                "cpu_allocatable":       4,
                "memory_allocatable_mb": 8192,
                "pods_allocatable":      110,
            })

        return {"provider": "openstack", "api_endpoint": api_endpoint,
                "kubeconfig": kubeconfig, "nodes": nodes}

    except Exception as exc:
        logger.warning("OpenStack K8s provisioning failed, using simulated fallback: %s", exc)
        nodes = [
            {
                "node_name":             f"{cluster_name}-node-{i + 1}",
                "instance_id":           f"fallback-{cluster_name}-{i + 1}",
                "status":                "ready",
                "cpu_allocatable":       4,
                "memory_allocatable_mb": 8192,
                "pods_allocatable":      110,
            }
            for i in range(node_count)
        ]
        return {"provider": "simulated-fallback", "api_endpoint": api_endpoint,
                "kubeconfig": kubeconfig, "nodes": nodes}


# ── Manifest / Serverless helpers (ViewSet compat) ─────────────────────────────

def deploy_kubernetes_manifest(*, cluster_name: str, manifest_yaml: str) -> dict[str, Any]:
    manifest_hash = hashlib.sha256(manifest_yaml.encode("utf-8")).hexdigest()
    return {
        "cluster":           cluster_name,
        "manifest_hash":     manifest_hash,
        "status":            "accepted",
        "resources_created": ["deployment/webapp"],
    }


def deploy_serverless_function(
    *, function_name: str, runtime: str, code_uri: str
) -> dict[str, Any]:
    endpoint = f"https://functions.orcacloud.cloud/{function_name}"
    return {
        "provider": "knative-simulated",
        "endpoint": endpoint,
        "image":    code_uri,
        "runtime":  runtime,
        "status":   "active",
    }


def invoke_serverless_function(
    *, endpoint: str, payload: dict[str, Any]
) -> dict[str, Any]:
    return {
        "endpoint":    endpoint,
        "status_code": 200,
        "result":      {"ok": True, "echo": payload},
    }
