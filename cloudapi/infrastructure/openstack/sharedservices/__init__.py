# OrcaCloud – Shared Services group
# Re-exports all public symbols from every module in this package so that:
#   from infrastructure.openstack.sharedservices import list_projects   ← Keystone
#   from infrastructure.openstack.sharedservices import list_resource_providers ← Placement
#   from infrastructure.openstack.sharedservices import list_secrets    ← Barbican

from infrastructure.openstack.sharedservices.keystone import (   # noqa: F401
    list_domains,
    create_domain,
    delete_domain,
    list_projects,
    get_project,
    create_project,
    update_project,
    delete_project,
    list_users,
    get_user,
    create_user,
    update_user_password,
    delete_user,
    list_groups,
    add_user_to_group,
    remove_user_from_group,
    list_roles,
    assign_project_role_to_user,
    revoke_project_role_from_user,
    list_user_project_roles,
    get_token_info,
)

from infrastructure.openstack.sharedservices.placement import (  # noqa: F401
    list_resource_providers,
    get_resource_provider,
    create_resource_provider,
    delete_resource_provider,
    get_resource_provider_inventories,
    set_resource_provider_inventory,
    get_resource_provider_usages,
    get_project_usages,
    get_allocations,
    list_resource_classes,
    create_custom_resource_class,
    delete_custom_resource_class,
    list_traits,
    get_resource_provider_traits,
    set_resource_provider_traits,
)

from infrastructure.openstack.sharedservices.barbican import (   # noqa: F401
    list_secrets,
    get_secret,
    get_secret_payload,
    create_secret,
    delete_secret,
    list_containers  as list_key_containers,
    get_container    as get_key_container,
    create_certificate_container,
    delete_container as delete_key_container,
    create_key_order,
    get_order,
)

# Convenience submodule references (relative)
from . import keystone, placement, barbican  # noqa: F401
