# OrcaCloud – Networking group
# Re-exports all public symbols from every module in this package so that:
#   from infrastructure.openstack.networking import list_networks         ← Neutron
#   from infrastructure.openstack.networking import provision_load_balancer ← Octavia
#   from infrastructure.openstack.networking import list_zones            ← Designate
#   from infrastructure.openstack.networking import provision_cdn_distribution ← CDN

from infrastructure.openstack.networking.network import (    # noqa: F401
    list_networks,
    get_network,
    create_network,
    delete_network,
    list_subnets,
    create_subnet,
    list_security_groups,
    create_security_group,
    add_security_group_rule,
    list_floating_ips,
    allocate_floating_ip,
    release_floating_ip,
    list_routers,
    create_router,
    delete_router,
)

from infrastructure.openstack.networking.load_balancer import (   # noqa: F401
    list_load_balancers,
    get_load_balancer,
    provision_load_balancer,
    delete_load_balancer,
    load_balancer_metrics,
)

from infrastructure.openstack.networking.designate import (  # noqa: F401
    list_zones,
    get_zone,
    create_zone,
    update_zone,
    delete_zone,
    list_recordsets,
    get_recordset,
    create_recordset,
    update_recordset,
    delete_recordset,
    list_floatingip_ptrs,
    set_floatingip_ptr,
    unset_floatingip_ptr,
)

from infrastructure.openstack.networking.cdn import (        # noqa: F401
    provision_cdn_distribution,
    delete_cdn_distribution,
    cdn_distribution_metrics,
)

# Convenience submodule references (relative)
from . import network, load_balancer, designate, cdn  # noqa: F401
