# OrcaCloud – OpenStack Infrastructure Package
# Exposes all service groups as sub-packages.
# Import from the group packages directly, e.g.:
#   from infrastructure.openstack.compute    import list_servers
#   from infrastructure.openstack.storage    import list_volumes
#   from infrastructure.openstack.networking import list_networks
#   from infrastructure.openstack.sharedservices  import list_projects
#   from infrastructure.openstack.orchestration   import list_stacks
#   from infrastructure.openstack.workloadlifecycle import list_instances

from . import compute           # noqa: F401
from . import storage           # noqa: F401
from . import networking        # noqa: F401
from . import sharedservices    # noqa: F401
from . import orchestration     # noqa: F401
from . import workloadlifecycle # noqa: F401
