# OrcaCloud – OpenStack Database as a Service (Trove)
#
# Wraps openstack.database (Trove) operations:
# instances, databases, users, backups, and configurations.
#
# WORKSPACE-AWARE PATTERN
# ─────────────────────────────────────────────────────────────────────────────
# Every public function accepts an optional `conn` parameter.

import logging
from typing import Any

import openstack.connection

from infrastructure.openstack_conn import get_connection

Connection = openstack.connection.Connection

logger = logging.getLogger(__name__)


# ── Instances ──────────────────────────────────────────────────────────────────

def list_instances(conn: Connection | None = None) -> list[dict]:
    """List all Trove database instances in the project."""
    conn = conn or get_connection()
    return [_instance_to_dict(i) for i in conn.database.instances()]


def get_instance(instance_id: str, conn: Connection | None = None) -> dict | None:
    """Get a Trove instance by UUID. Returns None if not found."""
    conn = conn or get_connection()
    i = conn.database.find_instance(instance_id, ignore_missing=True)
    return _instance_to_dict(i) if i else None


def create_instance(
    *,
    name: str,
    flavor_id: str,
    size_gb: int,
    datastore: str,
    datastore_version: str,
    databases: list[dict] | None = None,
    users: list[dict] | None = None,
    network_id: str | None = None,
    availability_zone: str | None = None,
    replica_of: str | None = None,
    conn: Connection | None = None,
) -> dict:
    """
    Create a managed database instance.

    Args:
        name:               Instance display name.
        flavor_id:          Nova flavor UUID (CPU/RAM sizing).
        size_gb:            Volume size in GB.
        datastore:          Datastore name: 'mysql', 'postgresql', 'redis', etc.
        datastore_version:  Datastore version string: '8.0', '14', '7.0', etc.
        databases:          Initial database list: [{"name": "mydb"}].
        users:              Initial user list: [{"name": "u", "password": "p",
                                                 "databases": [{"name": "mydb"}]}].
        network_id:         Neutron network UUID to attach the instance to.
        availability_zone:  Preferred AZ.
        replica_of:         Source instance UUID (creates a read replica).
    """
    conn = conn or get_connection()
    kwargs: dict[str, Any] = {
        "name":    name,
        "flavorRef": flavor_id,
        "volume":  {"size": size_gb},
        "datastore": {"type": datastore, "version": datastore_version},
    }
    if databases:
        kwargs["databases"] = databases
    if users:
        kwargs["users"] = users
    if network_id:
        kwargs["nics"] = [{"net-id": network_id}]
    if availability_zone:
        kwargs["availability_zone"] = availability_zone
    if replica_of:
        kwargs["replica_of"] = replica_of

    instance = conn.database.create_instance(**kwargs)
    logger.info("Creating Trove instance %s (%s)", instance.name, instance.id)
    return _instance_to_dict(instance)


def resize_instance(
    instance_id: str,
    new_flavor_id: str,
    conn: Connection | None = None,
) -> None:
    """Resize a Trove instance to a different flavor."""
    conn = conn or get_connection()
    conn.database.resize_instance(instance_id, new_flavor_id)
    logger.info("Resizing Trove instance %s to flavor %s", instance_id, new_flavor_id)


def resize_instance_volume(
    instance_id: str,
    new_size_gb: int,
    conn: Connection | None = None,
) -> None:
    """Expand the volume of a Trove instance."""
    conn = conn or get_connection()
    conn.database.resize_instance_volume(instance_id, new_size_gb)
    logger.info("Resizing volume for Trove instance %s to %dGB", instance_id, new_size_gb)


def restart_instance(instance_id: str, conn: Connection | None = None) -> None:
    """Restart the database service within a Trove instance."""
    conn = conn or get_connection()
    conn.database.restart_instance(instance_id)
    logger.info("Restarting Trove instance %s", instance_id)


def delete_instance(instance_id: str, conn: Connection | None = None) -> None:
    """Delete a Trove database instance."""
    conn = conn or get_connection()
    conn.database.delete_instance(instance_id, ignore_missing=True)
    logger.info("Deleted Trove instance %s", instance_id)


# ── Databases ──────────────────────────────────────────────────────────────────

def list_databases(instance_id: str, conn: Connection | None = None) -> list[dict]:
    """List databases on a Trove instance."""
    conn = conn or get_connection()
    return [
        {
            "name":         db.name,
            "character_set": getattr(db, "character_set", None),
            "collate":      getattr(db, "collate", None),
        }
        for db in conn.database.databases(instance_id)
    ]


def create_database(
    instance_id: str,
    *,
    name: str,
    character_set: str = "utf8mb4",
    collate: str = "utf8mb4_unicode_ci",
    conn: Connection | None = None,
) -> None:
    """Create a database inside a Trove instance."""
    conn = conn or get_connection()
    conn.database.create_database(
        instance_id,
        name=name,
        character_set=character_set,
        collate=collate,
    )
    logger.info("Created database %s on Trove instance %s", name, instance_id)


def delete_database(
    instance_id: str,
    db_name: str,
    conn: Connection | None = None,
) -> None:
    """Delete a database from a Trove instance."""
    conn = conn or get_connection()
    conn.database.delete_database(instance_id, db_name)
    logger.info("Deleted database %s from Trove instance %s", db_name, instance_id)


# ── Users ──────────────────────────────────────────────────────────────────────

def list_users(instance_id: str, conn: Connection | None = None) -> list[dict]:
    """List database users on a Trove instance."""
    conn = conn or get_connection()
    return [
        {
            "name":      u.name,
            "host":      getattr(u, "host", "%"),
            "databases": [db.get("name") for db in (getattr(u, "databases", None) or [])],
        }
        for u in conn.database.users(instance_id)
    ]


def create_user(
    instance_id: str,
    *,
    name: str,
    password: str,
    databases: list[str] | None = None,
    host: str = "%",
    conn: Connection | None = None,
) -> None:
    """Create a database user on a Trove instance."""
    conn = conn or get_connection()
    conn.database.create_user(
        instance_id,
        name=name,
        password=password,
        databases=[{"name": d} for d in (databases or [])],
        host=host,
    )
    logger.info("Created user %s on Trove instance %s", name, instance_id)


def delete_user(
    instance_id: str,
    user_name: str,
    conn: Connection | None = None,
) -> None:
    """Delete a database user from a Trove instance."""
    conn = conn or get_connection()
    conn.database.delete_user(instance_id, user_name)
    logger.info("Deleted user %s from Trove instance %s", user_name, instance_id)


# ── Backups ────────────────────────────────────────────────────────────────────

def list_backups(
    *,
    instance_id: str | None = None,
    conn: Connection | None = None,
) -> list[dict]:
    """List Trove backups, optionally filtered by instance."""
    conn = conn or get_connection()
    kwargs: dict[str, Any] = {}
    if instance_id:
        kwargs["instance_id"] = instance_id
    return [
        {
            "id":          b.id,
            "name":        b.name,
            "status":      b.status,
            "instance_id": b.instance_id,
            "size_gb":     b.size,
            "created_at":  str(b.created_at) if hasattr(b, "created_at") else None,
        }
        for b in conn.database.backups(**kwargs)
    ]


def create_backup(
    instance_id: str,
    *,
    name: str,
    description: str = "",
    conn: Connection | None = None,
) -> dict:
    """Create an on-demand backup of a Trove instance."""
    conn = conn or get_connection()
    b = conn.database.create_backup(
        name=name,
        instance=instance_id,
        description=description,
    )
    logger.info("Created backup %s for Trove instance %s", b.id, instance_id)
    return {
        "id":          b.id,
        "name":        b.name,
        "status":      b.status,
        "instance_id": b.instance_id,
    }


def delete_backup(backup_id: str, conn: Connection | None = None) -> None:
    """Delete a Trove backup."""
    conn = conn or get_connection()
    conn.database.delete_backup(backup_id, ignore_missing=True)
    logger.info("Deleted Trove backup %s", backup_id)


def restore_to_instance(
    *,
    name: str,
    flavor_id: str,
    size_gb: int,
    backup_id: str,
    network_id: str | None = None,
    conn: Connection | None = None,
) -> dict:
    """Create a new Trove instance restored from a backup."""
    conn = conn or get_connection()
    kwargs: dict[str, Any] = {
        "name":       name,
        "flavorRef":  flavor_id,
        "volume":     {"size": size_gb},
        "restorePoint": {"backupRef": backup_id},
    }
    if network_id:
        kwargs["nics"] = [{"net-id": network_id}]
    i = conn.database.create_instance(**kwargs)
    logger.info("Restoring Trove instance from backup %s → new instance %s", backup_id, i.id)
    return _instance_to_dict(i)


# ── Datastores ─────────────────────────────────────────────────────────────────

def list_datastores(conn: Connection | None = None) -> list[dict]:
    """List all available datastores and their versions."""
    conn = conn or get_connection()
    result = []
    for ds in conn.database.datastores():
        result.append({
            "id":       ds.id,
            "name":     ds.name,
            "versions": [
                {"id": v.id, "name": v.name, "active": v.active}
                for v in conn.database.datastore_versions(ds.id)
            ],
        })
    return result


def list_flavors(conn: Connection | None = None) -> list[dict]:
    """List Trove-supported flavors."""
    conn = conn or get_connection()
    return [
        {
            "id":    f.id,
            "name":  f.name,
            "vcpus": f.vcpus,
            "ram":   f.ram,
            "disk":  f.disk,
        }
        for f in conn.database.flavors()
    ]


# ── Private helpers ────────────────────────────────────────────────────────────

def _instance_to_dict(i) -> dict:
    return {
        "id":                 i.id,
        "name":               i.name,
        "status":             i.status,
        "flavor_id":          i.flavor["id"] if i.flavor else None,
        "volume_size_gb":     i.volume.get("size") if i.volume else None,
        "datastore":          i.datastore.get("type") if i.datastore else None,
        "datastore_version":  i.datastore.get("version") if i.datastore else None,
        "hostname":           getattr(i, "hostname", None),
        "ip_addresses":       list(getattr(i, "ip", []) or []),
        "created_at":         str(i.created_at) if hasattr(i, "created_at") else None,
    }
