# OrcaCloud – Compute group
# Re-exports all public symbols from every module in this package so that:
#   from infrastructure.openstack.compute import list_servers        ← Nova
#   from infrastructure.openstack.compute import list_containers     ← Zun
#   from infrastructure.openstack.compute import list_nodes          ← Ironic
#   from infrastructure.openstack.compute import list_devices        ← Cyborg
#   from infrastructure.openstack.compute import list_clusters       ← Magnum

from infrastructure.openstack.compute.compute import (       # noqa: F401
    list_servers,
    get_server,
    create_server,
    delete_server,
    start_server,
    stop_server,
    reboot_server,
    list_keypairs,
    create_keypair,
    delete_keypair,
    list_flavors,
    get_flavor,
    list_images,
    get_image,
)

from infrastructure.openstack.compute.zun import (           # noqa: F401
    list_containers,
    get_container,
    create_container,
    delete_container,
    start_container,
    stop_container,
    get_container_logs,
    execute_command,
    list_capsules,
)

from infrastructure.openstack.compute.ironic import (        # noqa: F401
    list_nodes,
    get_node,
    create_node,
    delete_node,
    set_node_provision_state,
    set_node_power_state,
    list_ports,
    create_port,
)

from infrastructure.openstack.compute.cyborg import (        # noqa: F401
    list_devices,
    get_device,
    list_device_profiles,
    create_device_profile,
    delete_device_profile,
    list_accelerator_requests,
    create_accelerator_request,
    delete_accelerator_request,
)

from infrastructure.openstack.compute.kubernetes import (    # noqa: F401
    list_cluster_templates,
    list_clusters,
    get_cluster,
    create_magnum_cluster,
    delete_magnum_cluster,
    provision_kubernetes_cluster,
    deploy_kubernetes_manifest,
    deploy_serverless_function,
    invoke_serverless_function,
)

# Convenience submodule references (relative)
from . import compute, zun, ironic, cyborg, kubernetes  # noqa: F401
