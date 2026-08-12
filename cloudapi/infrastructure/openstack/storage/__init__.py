# OrcaCloud – Storage group
# Re-exports all public symbols from every module in this package so that:
#   from infrastructure.openstack.storage import list_volumes       ← Cinder
#   from infrastructure.openstack.storage import list_containers    ← Swift
#   from infrastructure.openstack.storage import list_shares        ← Manila

from infrastructure.openstack.storage.volume import (        # noqa: F401
    list_volumes,
    get_volume,
    create_volume,
    delete_volume,
    attach_volume,
    detach_volume,
    list_snapshots,
    create_snapshot,
    delete_snapshot,
    list_volume_types,
)

from infrastructure.openstack.storage.swift import (         # noqa: F401
    list_containers   as list_swift_containers,
    create_container  as create_swift_container,
    delete_container  as delete_swift_container,
    get_container_metadata,
    list_objects,
    upload_object,
    download_object,
    delete_object,
    copy_object,
    generate_temp_url,
    get_account_metadata,
)

from infrastructure.openstack.storage.manila import (        # noqa: F401
    list_shares,
    get_share,
    create_share,
    delete_share,
    extend_share,
    list_access_rules,
    grant_access,
    revoke_access,
    list_share_networks,
    create_share_network,
    create_share_snapshot,
    delete_share_snapshot,
    list_share_types,
)

# Convenience submodule references (relative)
from . import volume, swift, manila  # noqa: F401
