# OrcaCloud – Workload Lifecycle group
# Re-exports all public symbols from every module in this package so that:
#   from infrastructure.openstack.workloadlifecycle import list_instances ← Trove
#   from infrastructure.openstack.workloadlifecycle import list_jobs      ← Freezer
#   from infrastructure.openstack.workloadlifecycle import list_segments  ← Masakari

from infrastructure.openstack.workloadlifecycle.trove import (   # noqa: F401
    list_instances,
    get_instance,
    create_instance,
    resize_instance,
    resize_instance_volume,
    restart_instance,
    delete_instance,
    list_databases,
    create_database,
    delete_database,
    list_users,
    create_user,
    delete_user,
    list_backups,
    create_backup,
    delete_backup,
    restore_to_instance,
    list_datastores,
    list_flavors    as list_db_flavors,
)

from infrastructure.openstack.workloadlifecycle.freezer import ( # noqa: F401
    list_jobs,
    get_job,
    create_job,
    update_job,
    delete_job,
    start_job,
    stop_job,
    list_actions,
    create_action,
    delete_action,
    list_sessions,
    create_session,
    delete_session,
    list_clients,
)

from infrastructure.openstack.workloadlifecycle.masakari import (# noqa: F401
    list_segments,
    get_segment,
    create_segment,
    update_segment,
    delete_segment,
    list_hosts       as list_ha_hosts,
    get_host         as get_ha_host,
    create_host      as create_ha_host,
    update_host      as update_ha_host,
    delete_host      as delete_ha_host,
    list_notifications,
    get_notification,
    create_notification,
)

# Convenience submodule references (relative)
from . import trove, freezer, masakari  # noqa: F401
