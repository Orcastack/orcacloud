# OrcaCloud – Ceph RBD Module
#
# Wraps RADOS Block Device (rbd) operations: image create/delete/resize,
# snapshots, clones, and flatten — consumed by Cinder and Nova ephemeral.
#
# Requirements:
#   python3-rbd >= 18.2

import logging
import os
from typing import Any

logger = logging.getLogger(__name__)


def _rbd():
    try:
        import rbd
        return rbd
    except ImportError as exc:
        raise RuntimeError(
            "python3-rbd is not installed. "
            "Install with: apt install python3-rbd"
        ) from exc


def _ioctx(pool_name: str, cluster=None):
    """Return an open ioctx for ``pool_name``.  Caller must close it."""
    if cluster is None:
        from infrastructure.ceph.admin import get_cluster
        cluster = get_cluster()
        return cluster, cluster.open_ioctx(pool_name), True  # owned=True
    return cluster, cluster.open_ioctx(pool_name), False


# ── Image operations ──────────────────────────────────────────────────────────

def create_image(
    pool_name: str,
    image_name: str,
    *,
    size_gb: int,
    features: int | None = None,
    order: int = 22,
    cluster=None,
) -> None:
    """
    Create a new RBD image (block device).

    Args:
        pool_name:  Target Ceph pool (e.g. 'atonix-public-cinder').
        image_name: Image name.
        size_gb:    Image size in GB.
        features:   RBD feature flags.  Defaults to layering + exclusive-lock.
        order:      Object size order (2^order bytes; 22 = 4 MiB objects).

    Used by Cinder when creating a blank volume.
    """
    rbd = _rbd()
    cluster, ioctx, owned = _ioctx(pool_name, cluster)
    try:
        f = features if features is not None else (
            rbd.RBD_FEATURE_LAYERING | rbd.RBD_FEATURE_EXCLUSIVE_LOCK
        )
        rbd.RBD().create(ioctx, image_name, size_gb * 1024 ** 3, order=order, old_format=False, features=f)
        logger.info("Created RBD image %s/%s (%d GB)", pool_name, image_name, size_gb)
    finally:
        ioctx.close()
        if owned:
            cluster.shutdown()


def delete_image(pool_name: str, image_name: str, *, cluster=None) -> None:
    """Remove an RBD image. Fails if snapshots still exist."""
    rbd = _rbd()
    cluster, ioctx, owned = _ioctx(pool_name, cluster)
    try:
        rbd.RBD().remove(ioctx, image_name)
        logger.info("Deleted RBD image %s/%s", pool_name, image_name)
    finally:
        ioctx.close()
        if owned:
            cluster.shutdown()


def resize_image(
    pool_name: str,
    image_name: str,
    *,
    new_size_gb: int,
    cluster=None,
) -> None:
    """Resize an existing RBD image (grow or shrink)."""
    rbd = _rbd()
    cluster, ioctx, owned = _ioctx(pool_name, cluster)
    try:
        with rbd.Image(ioctx, image_name) as img:
            img.resize(new_size_gb * 1024 ** 3)
            logger.info("Resized %s/%s to %d GB", pool_name, image_name, new_size_gb)
    finally:
        ioctx.close()
        if owned:
            cluster.shutdown()


def list_images(pool_name: str, *, cluster=None) -> list[str]:
    """List all RBD image names in a pool."""
    rbd = _rbd()
    cluster, ioctx, owned = _ioctx(pool_name, cluster)
    try:
        return rbd.RBD().list(ioctx)
    finally:
        ioctx.close()
        if owned:
            cluster.shutdown()


# ── Snapshot operations ───────────────────────────────────────────────────────

def create_snapshot(
    pool_name: str,
    image_name: str,
    snap_name: str,
    *,
    protect: bool = True,
    cluster=None,
) -> None:
    """
    Create and optionally protect an RBD snapshot.

    Protected snapshots serve as clone bases (Cinder volume from snapshot).
    """
    rbd = _rbd()
    cluster, ioctx, owned = _ioctx(pool_name, cluster)
    try:
        with rbd.Image(ioctx, image_name) as img:
            img.create_snap(snap_name)
            if protect:
                img.protect_snap(snap_name)
        logger.info("Created snapshot %s@%s (protect=%s)", image_name, snap_name, protect)
    finally:
        ioctx.close()
        if owned:
            cluster.shutdown()


def delete_snapshot(
    pool_name: str,
    image_name: str,
    snap_name: str,
    *,
    unprotect: bool = True,
    cluster=None,
) -> None:
    """Unprotect (if needed) and delete an RBD snapshot."""
    rbd = _rbd()
    cluster, ioctx, owned = _ioctx(pool_name, cluster)
    try:
        with rbd.Image(ioctx, image_name) as img:
            if unprotect:
                try:
                    img.unprotect_snap(snap_name)
                except rbd.InvalidArgument:
                    pass  # already unprotected
            img.remove_snap(snap_name)
        logger.info("Deleted snapshot %s@%s", image_name, snap_name)
    finally:
        ioctx.close()
        if owned:
            cluster.shutdown()


# ── Clone operations ──────────────────────────────────────────────────────────

def clone_image(
    src_pool: str,
    src_image: str,
    src_snap: str,
    dest_pool: str,
    dest_image: str,
    *,
    cluster=None,
) -> None:
    """
    Clone an RBD image from a protected snapshot into a destination pool.

    Used by Cinder to create copy-on-write volumes from images or snapshots.
    """
    rbd = _rbd()
    cluster_obj = cluster
    if cluster_obj is None:
        from infrastructure.ceph.admin import get_cluster
        cluster_obj = get_cluster()
    owned = cluster is None
    try:
        src_ioctx  = cluster_obj.open_ioctx(src_pool)
        dest_ioctx = cluster_obj.open_ioctx(dest_pool)
        try:
            rbd.RBD().clone(src_ioctx, src_image, src_snap, dest_ioctx, dest_image)
            logger.info("Cloned %s/%s@%s → %s/%s", src_pool, src_image, src_snap, dest_pool, dest_image)
        finally:
            src_ioctx.close()
            dest_ioctx.close()
    finally:
        if owned:
            cluster_obj.shutdown()


def flatten_image(pool_name: str, image_name: str, *, cluster=None) -> None:
    """
    Flatten a cloned image, severing its dependency on the parent snapshot.

    Required before deleting a snapshot that has dependents.
    """
    rbd = _rbd()
    cluster, ioctx, owned = _ioctx(pool_name, cluster)
    try:
        with rbd.Image(ioctx, image_name) as img:
            img.flatten()
        logger.info("Flattened %s/%s", pool_name, image_name)
    finally:
        ioctx.close()
        if owned:
            cluster.shutdown()
