# OrcaCloud – Ceph Admin Module
#
# Wraps rados cluster-level operations: pool lifecycle, quota management,
# cluster health, and capacity reporting.
#
# Requirements:
#   python3-rados >= 18.2  (ships with Ceph Reef)
#   /etc/ceph/ceph.conf    or CEPH_CONF env var
#   /etc/ceph/ceph.client.admin.keyring  or CEPH_KEYRING env var
#
# Usage:
#   from infrastructure.ceph.admin import get_cluster, list_pools, create_pool

import logging
import os
from contextlib import contextmanager
from typing import Generator

logger = logging.getLogger(__name__)

# ── Connection helpers ────────────────────────────────────────────────────────
# We lazy-import rados to avoid hard import errors when running on hosts
# that don't have python3-rados installed (CI, dev laptops).

def _rados():
    try:
        import rados
        return rados
    except ImportError as exc:
        raise RuntimeError(
            "python3-rados is not installed. "
            "Install it with: apt install python3-rados (or equivalent)."
        ) from exc


def get_cluster(
    conf: str | None = None,
    keyring: str | None = None,
    name: str = "client.admin",
):
    """
    Return a connected rados.Rados cluster object.

    Args:
        conf:    Path to ceph.conf (defaults to CEPH_CONF env → /etc/ceph/ceph.conf).
        keyring: Path to keyring (defaults to CEPH_KEYRING env → /etc/ceph/ceph.client.admin.keyring).
        name:    Ceph client name (default 'client.admin').

    Example:
        cluster = get_cluster()
        print(cluster.get_fsid())
        cluster.shutdown()
    """
    rados = _rados()
    conf_path    = conf    or os.getenv("CEPH_CONF",    "/etc/ceph/ceph.conf")
    keyring_path = keyring or os.getenv("CEPH_KEYRING", "/etc/ceph/ceph.client.admin.keyring")

    cluster = rados.Rados(
        conffile=conf_path,
        name=name,
        conf={"keyring": keyring_path},
    )
    cluster.connect()
    logger.info("Connected to Ceph cluster %s", cluster.get_fsid())
    return cluster


@contextmanager
def cluster_ctx(**kwargs) -> Generator:
    """Context manager that opens/closes a rados cluster connection."""
    cluster = get_cluster(**kwargs)
    try:
        yield cluster
    finally:
        cluster.shutdown()


# ── Cluster Health ────────────────────────────────────────────────────────────

def get_cluster_health(cluster=None) -> dict:
    """
    Return a structured cluster-health summary.

    Returns:
        {
            "status":   "HEALTH_OK" | "HEALTH_WARN" | "HEALTH_ERR",
            "fsid":     "<cluster-uuid>",
            "df":       { "total_bytes": …, "avail_bytes": …, "used_bytes": … },
            "pg_stat":  { "pg_count": …, "pg_active": …, "pg_degraded": … },
        }
    """
    owned = cluster is None
    if owned:
        cluster = get_cluster()
    try:
        cmd     = '{"prefix":"health","format":"json"}'
        ret, buf, _ = cluster.mon_command(cmd, b"")
        if ret != 0:
            raise RuntimeError(f"mon_command(health) returned {ret}")

        import json
        health  = json.loads(buf.decode())
        df_cmd  = '{"prefix":"df","format":"json"}'
        _, df_buf, _ = cluster.mon_command(df_cmd, b"")
        df      = json.loads(df_buf.decode())

        return {
            "status":  health.get("status", "UNKNOWN"),
            "fsid":    cluster.get_fsid(),
            "df": {
                "total_bytes": df["stats"]["total_bytes"],
                "avail_bytes": df["stats"]["total_avail_bytes"],
                "used_bytes":  df["stats"]["total_used_raw_bytes"],
            },
        }
    finally:
        if owned:
            cluster.shutdown()


# ── Pool Management ───────────────────────────────────────────────────────────

def list_pools(cluster=None) -> list[str]:
    """Return the names of all pools in the cluster."""
    owned = cluster is None
    if owned:
        cluster = get_cluster()
    try:
        return cluster.list_pools()
    finally:
        if owned:
            cluster.shutdown()


def create_pool(
    name: str,
    *,
    pg_num: int = 128,
    pgp_num: int | None = None,
    replication: int = 3,
    cluster=None,
) -> None:
    """
    Create a new Ceph pool.

    Args:
        name:        Pool name.  Naming convention: orcacloud-{cloud_type}-{purpose}
                     e.g. 'orcacloud-public-cinder', 'orcacloud-private-cinder'.
        pg_num:      Number of placement groups (power of 2 recommended).
        pgp_num:     PG placement groups for placement; defaults to pg_num.
        replication: Replication factor (default 3).

    OrcaCloud pool naming convention:
        orcacloud-public-cinder   – Public cloud Cinder volumes
        orcacloud-public-glance   – Public cloud Glance images
        orcacloud-public-nova     – Public cloud Nova ephemeral disks
        orcacloud-public-rgw      – Public cloud Object Storage (RGW)
        orcacloud-private-cinder  – Private cloud Cinder volumes (encrypted)
        orcacloud-private-glance  – Private cloud Glance images
        orcacloud-private-nova    – Private cloud Nova ephemeral
        orcacloud-hybrid-cinder   – Hybrid stretch-replicated volumes
        orcacloud-hybrid-glance   – Hybrid cross-region images
    """
    owned = cluster is None
    if owned:
        cluster = get_cluster()
    try:
        cluster.create_pool(name, pg_num)
        _set_pool_replication(cluster, name, replication)
        if pgp_num and pgp_num != pg_num:
            _set_pool_param(cluster, name, "pgp_num", str(pgp_num))
        logger.info("Created pool %s (pg_num=%d, replication=%d)", name, pg_num, replication)
    finally:
        if owned:
            cluster.shutdown()


def delete_pool(name: str, cluster=None) -> None:
    """Delete a pool. Requires mon_allow_pool_delete=true in ceph.conf."""
    owned = cluster is None
    if owned:
        cluster = get_cluster()
    try:
        cluster.delete_pool(name)
        logger.warning("Deleted pool %s", name)
    finally:
        if owned:
            cluster.shutdown()


def set_pool_quota(
    pool_name: str,
    *,
    max_bytes: int | None = None,
    max_objects: int | None = None,
    cluster=None,
) -> None:
    """
    Set quota on a pool.

    Args:
        max_bytes:   Maximum bytes (0 = unlimited).
        max_objects: Maximum objects (0 = unlimited).
    """
    owned = cluster is None
    if owned:
        cluster = get_cluster()
    try:
        import json
        cmd = {"prefix": "osd pool set-quota", "pool": pool_name, "format": "json"}
        if max_bytes is not None:
            cmd["field"] = "max_bytes"
            cmd["val"]   = str(max_bytes)
            cluster.mon_command(json.dumps(cmd), b"")
        if max_objects is not None:
            cmd["field"] = "max_objects"
            cmd["val"]   = str(max_objects)
            cluster.mon_command(json.dumps(cmd), b"")
        logger.info("Set quota on pool %s: max_bytes=%s max_objects=%s", pool_name, max_bytes, max_objects)
    finally:
        if owned:
            cluster.shutdown()


def bootstrap_cloud_pools(cloud_type: str, cluster=None) -> list[str]:
    """
    Create the standard OrcaCloud pool set for a given cloud type.

    Args:
        cloud_type: 'public' | 'private' | 'hybrid'

    Returns:
        List of created pool names.

    Pool sets per cloud type:
        public  → cinder, glance, nova, rgw
        private → cinder (encrypted), glance, nova
        hybrid  → cinder (stretch/replicated), glance, nova, rgw
    """
    owned = cluster is None
    if owned:
        cluster = get_cluster()

    POOL_TEMPLATES: dict[str, list[tuple[str, int, int, int]]] = {
        # (suffix, pg_num, pgp_num, replication)
        "public":  [
            ("cinder", 128, 128, 3),
            ("glance", 64,  64,  3),
            ("nova",   128, 128, 3),
            ("rgw",    64,  64,  3),
        ],
        "private": [
            ("cinder", 128, 128, 3),
            ("glance", 64,  64,  3),
            ("nova",   128, 128, 3),
        ],
        "hybrid": [
            ("cinder", 128, 128, 3),
            ("glance", 64,  64,  3),
            ("nova",   128, 128, 3),
            ("rgw",    64,  64,  3),
        ],
    }

    templates = POOL_TEMPLATES.get(cloud_type)
    if not templates:
        raise ValueError(f"Unknown cloud_type: {cloud_type!r}. Use 'public', 'private', or 'hybrid'.")

    created = []
    try:
        for suffix, pg, pgp, rep in templates:
            pool_name = f"orcacloud-{cloud_type}-{suffix}"
            existing  = cluster.list_pools()
            if pool_name in existing:
                logger.info("Pool %s already exists — skipping", pool_name)
            else:
                create_pool(pool_name, pg_num=pg, pgp_num=pgp, replication=rep, cluster=cluster)
                created.append(pool_name)
    finally:
        if owned:
            cluster.shutdown()

    logger.info("Bootstrap complete for %s cloud: %d pool(s) created", cloud_type, len(created))
    return created


# ── Private helpers ───────────────────────────────────────────────────────────

def _set_pool_replication(cluster, pool_name: str, size: int) -> None:
    import json
    cmd = json.dumps({"prefix": "osd pool set", "pool": pool_name, "var": "size", "val": str(size), "format": "json"})
    ret, _, _ = cluster.mon_command(cmd, b"")
    if ret != 0:
        raise RuntimeError(f"Failed to set replication={size} on pool {pool_name}")


def _set_pool_param(cluster, pool_name: str, param: str, value: str) -> None:
    import json
    cmd = json.dumps({"prefix": "osd pool set", "pool": pool_name, "var": param, "val": value, "format": "json"})
    cluster.mon_command(cmd, b"")
