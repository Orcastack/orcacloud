# OrcaCloud Platform — Architecture Guide

> **Target audience:** backend engineers, frontend engineers, DevOps.
> **Last updated:** 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Core Pipeline](#core-pipeline)
3. [Workspace Binding](#workspace-binding)
4. [Backend — Structure](#backend--structure)
5. [Frontend — Structure](#frontend--structure)
6. [OpenStack Integration](#openstack-integration)
7. [Provisioning API Reference](#provisioning-api-reference)
8. [Frontend Usage Examples](#frontend-usage-examples)
9. [Environment Variables](#environment-variables)
10. [Development Setup](#development-setup)

---

## Overview

OrcaCloud is a OrcaCloud cloud platform. Every resource the platform creates
(VMs, volumes, networks, Kubernetes clusters) is backed by an OpenStack tenant.
The **workspace binding** system guarantees that each team's resources land in
the correct OpenStack project, in the correct region, subject to the correct
quota.

```
Browser / Frontend
        │
        │ HTTPS + Bearer Token
        ▼
  Django REST API  ←── token auth ──► PostgreSQL / SQLite (dev)
        │
        │ WorkspaceService.get_connection(binding)
        ▼
  OpenStack SDK ──► Project A (dev workspace)
                ──► Project B (staging workspace)
                ──► Project C (prod workspace)
```

---

## Core Pipeline

```
Frontend Request
  ├── workspace_id    (e.g. "devops-team")
  └── environment_id  (dev | staging | prod)
          │
          ▼
  WorkspaceService.resolve(workspace_id, environment)
          │
          ▼
  WorkspaceBinding
  ├── openstack_project  e.g. "devops-staging-9a3f"
  ├── openstack_region   e.g. "RegionOne"
  └── quota_*
          │
          ▼
  WorkspaceService.get_connection(binding)
          │
          ▼
  openstack.connect(project_name=binding.openstack_project, ...)
          │
          ▼
  OpenStack API (Nova / Cinder / Neutron / Magnum)
          │
          ▼
  WorkspaceService.register_resource(...)  →  ProvisionedResource (DB audit log)
          │
          ▼
  Response → Frontend
```

---

## Workspace Binding

### Models (`backend/services/workspace/models.py`)

| Model | Purpose |
|---|---|
| `Workspace` | A team / project space. Has `workspace_id` (slug), owner, members. |
| `WorkspaceBinding` | Maps `workspace + environment` → `openstack_project` + `openstack_region` + quotas. |
| `ProvisionedResource` | Audit log of every OpenStack resource created by the platform. |

### Service (`backend/services/workspace/service.py`)

```python
from services.workspace.service import WorkspaceService

# 1. Resolve binding
binding = WorkspaceService.resolve("devops-team", "staging")

# 2. Get scoped OpenStack connection
conn = WorkspaceService.get_connection(binding)

# 3. Create resource
server = conn.compute.create_server(...)

# 4. Register audit record
WorkspaceService.register_resource(
    binding=binding,
    resource_type="vm",
    resource_id=server.id,
    resource_name=server.name,
    status="active",
    metadata={"flavor_id": "..."},
    created_by=request.user,
)
```

### Admin setup (creating a binding)

1. Log in to `/admin/`
2. Create a **Workspace** record with `workspace_id = "devops-team"`.
3. Create a **Workspace Binding** record:
   - workspace → devops-team
   - environment → staging
   - openstack_project → `devops-staging-9a3f`
   - openstack_region → `RegionOne`
   - quotas → vcpus: 50, ram_gb: 200, storage_gb: 2000

---

## Backend — Structure

```
backend/
├── orcacloud/
│   └── settings.py          # INSTALLED_APPS includes services.workspace
├── infrastructure/
│   ├── openstack_conn.py    # get_connection() — global fallback only
│   └── openstack/
│       ├── __init__.py      # imports all 6 sub-packages
│       │
│       ├── compute/         # ── Compute group ────────────────────────────
│       │   ├── __init__.py  # re-exports all compute functions
│       │   ├── compute.py   # Nova: servers, flavors, images, keypairs
│       │   ├── zun.py       # Zun: containers, capsules, logs, exec
│       │   ├── ironic.py    # Ironic: bare metal nodes, ports, power/provision
│       │   ├── cyborg.py    # Cyborg: devices, device profiles, ARQs
│       │   └── kubernetes.py# Magnum: cluster templates, clusters
│       │
│       ├── storage/         # ── Storage group ────────────────────────────
│       │   ├── __init__.py  # re-exports all storage functions
│       │   ├── volume.py    # Cinder: volumes, snapshots, types
│       │   ├── swift.py     # Swift: containers, objects, temp URLs
│       │   └── manila.py    # Manila: shares, access rules, share networks
│       │
│       ├── networking/      # ── Networking group ─────────────────────────
│       │   ├── __init__.py  # re-exports all networking functions
│       │   ├── network.py   # Neutron: networks, subnets, SGs, FIPs, routers
│       │   ├── load_balancer.py  # Octavia: LBs, listeners, pools
│       │   ├── designate.py # Designate: DNS zones, record sets, PTR records
│       │   └── cdn.py       # CDN distributions (simulated)
│       │
│       ├── sharedservices/  # ── Identity & Placement group ───────────────
│       │   ├── __init__.py  # re-exports all shared service functions
│       │   ├── keystone.py  # Keystone: projects, users, roles, domains
│       │   ├── placement.py # Placement: resource providers, inventories
│       │   └── barbican.py  # Barbican: secrets, containers, key orders
│       │
│       ├── orchestration/   # ── Orchestration & Workflow group ───────────
│       │   ├── __init__.py  # re-exports all orchestration functions
│       │   ├── heat.py      # Heat: stacks, resources, events
│       │   ├── mistral.py   # Mistral: workflows, executions, tasks
│       │   ├── zaqar.py     # Zaqar: queues, messages, claims
│       │   ├── blazar.py    # Blazar: leases, host reservations
│       │   └── aodh.py      # Aodh: threshold/composite alarms, history
│       │
│       └── workloadlifecycle/ # ── Workload Lifecycle group ───────────────
│           ├── __init__.py  # re-exports all lifecycle functions
│           ├── trove.py     # Trove: DB instances, databases, users, backups
│           ├── freezer.py   # Freezer: backup jobs, actions, sessions
│           └── masakari.py  # Masakari: HA segments, hosts, notifications
└── services/
    ├── urls.py              # All URL routing
    ├── workspace/
    │   ├── models.py        # Workspace, WorkspaceBinding, ProvisionedResource
    │   ├── service.py       # WorkspaceService (resolve, get_connection, register)
    │   ├── serializers.py   # DRF serializers
    │   └── admin.py         # Django admin registrations
    ├── provisioning/
    │   └── views.py         # Workspace-bound provisioning endpoints
    └── openstack/
        └── views.py         # Legacy direct-OpenStack endpoints (no workspace binding)
```

### Golden rule for view code

```python
# [YES] CORRECT — workspace-scoped connection
binding = WorkspaceService.resolve(workspace_id, environment)
conn    = WorkspaceService.get_connection(binding)

# [NO] WRONG — ignores workspace isolation
from infrastructure.openstack_conn import get_connection
conn = get_connection()
```

---

## Frontend — Structure

```
frontend/src/
├── services/
│   ├── apiClient.ts         # Axios instance (Token auth header)
│   ├── provisioningApi.ts   # Workspace-bound provisioning calls  ← NEW
│   └── cloudApi.ts          # Legacy OpenStack API calls
└── pages/
    └── (use provisioningApi for all new resource creation)
```

### apiClient base URL

```
REACT_APP_API_URL=https://api.orcacloud.com
→ calls go to: https://api.orcacloud.com/api/services/provision/compute/vm/
```

---

## OpenStack Integration

### Connection credentials (env vars)

| Variable | Description |
|---|---|
| `OS_AUTH_URL` | Keystone endpoint |
| `OS_USERNAME` | Service account username |
| `OS_PASSWORD` | Service account password |
| `OS_USER_DOMAIN_NAME` | Default: `Default` |
| `OS_PROJECT_DOMAIN_NAME` | Default: `Default` |
| `OS_REGION_NAME` | Default region (overridden per binding) |
| `OS_CLOUD` | clouds.yaml profile name (fallback when above not set) |

When `OS_AUTH_URL`, `OS_USERNAME`, `OS_PASSWORD` are **all set**, the service
opens a direct authenticated session.
Otherwise it uses **clouds.yaml** (`OS_CLOUD` or `"orcacloud"`).

### Infrastructure modules

All modules follow the **workspace-aware `conn` pattern**:

```python
def any_function(..., conn: Connection | None = None):
    conn = conn or get_connection()   # fallback to global (dev/test only)
```

In production views, always pass `conn = WorkspaceService.get_connection(binding)`.

#### Compute (`openstack/compute/`)

| Module | OpenStack Service | Key functions |
|---|---|---|
| `compute/compute.py` | **Nova** | `list_servers`, `create_server`, `delete_server`, `start_server`, `stop_server`, `reboot_server`, `list_keypairs`, `create_keypair`, `list_flavors`, `list_images` |
| `compute/zun.py` | **Zun** (containers) | `list_containers`, `create_container`, `start_container`, `stop_container`, `get_container_logs`, `execute_command`, `list_capsules` |
| `compute/ironic.py` | **Ironic** (bare metal) | `list_nodes`, `create_node`, `delete_node`, `set_node_provision_state`, `set_node_power_state`, `list_ports`, `create_port` |
| `compute/cyborg.py` | **Cyborg** (accelerators) | `list_devices`, `list_device_profiles`, `create_device_profile`, `list_accelerator_requests`, `create_accelerator_request` |
| `compute/kubernetes.py` | **Magnum** (K8s) | `list_cluster_templates`, `list_clusters`, `create_magnum_cluster`, `delete_magnum_cluster`, `deploy_kubernetes_manifest` |

#### Storage (`openstack/storage/`)

| Module | OpenStack Service | Key functions |
|---|---|---|
| `storage/volume.py` | **Cinder** | `list_volumes`, `create_volume`, `delete_volume`, `attach_volume`, `detach_volume`, `list_snapshots`, `create_snapshot` |
| `storage/swift.py` | **Swift** (object store) | `list_swift_containers`, `create_container`, `upload_object`, `download_object`, `delete_object`, `copy_object`, `generate_temp_url` |
| `storage/manila.py` | **Manila** (shared FS) | `list_shares`, `create_share`, `delete_share`, `extend_share`, `grant_access`, `revoke_access`, `list_share_networks`, `create_share_snapshot` |

#### Networking (`openstack/networking/`)

| Module | OpenStack Service | Key functions |
|---|---|---|
| `networking/network.py` | **Neutron** | `list_networks`, `create_network`, `list_subnets`, `create_subnet`, `list_security_groups`, `create_security_group`, `list_floating_ips`, `allocate_floating_ip`, `list_routers` |
| `networking/load_balancer.py` | **Octavia** (LBaaS) | `list_load_balancers`, `get_load_balancer`, `provision_load_balancer`, `delete_load_balancer`, `load_balancer_metrics` |
| `networking/designate.py` | **Designate** (DNS) | `list_zones`, `create_zone`, `delete_zone`, `list_recordsets`, `create_recordset`, `delete_recordset`, `set_floatingip_ptr` |
| `networking/cdn.py` | **CDN** (simulated) | `provision_cdn_distribution`, `delete_cdn_distribution`, `cdn_distribution_metrics` |

#### Identity & Placement (`openstack/sharedservices/`)

| Module | OpenStack Service | Key functions |
|---|---|---|
| `sharedservices/keystone.py` | **Keystone** (identity) | `list_projects`, `create_project`, `delete_project`, `list_users`, `create_user`, `list_roles`, `assign_project_role_to_user`, `list_domains` |
| `sharedservices/placement.py` | **Placement** | `list_resource_providers`, `get_resource_provider_inventories`, `get_resource_provider_usages`, `list_resource_classes`, `list_traits`, `set_resource_provider_traits` |
| `sharedservices/barbican.py` | **Barbican** (key mgmt) | `list_secrets`, `create_secret`, `get_secret_payload`, `delete_secret`, `create_certificate_container`, `create_key_order` |

#### Orchestration & Workflow (`openstack/orchestration/`)

| Module | OpenStack Service | Key functions |
|---|---|---|
| `orchestration/heat.py` | **Heat** (orchestration) | `list_stacks`, `create_stack`, `update_stack`, `delete_stack`, `preview_stack`, `list_stack_resources`, `list_stack_events`, `validate_template` |
| `orchestration/mistral.py` | **Mistral** (workflow) | `list_workflows`, `create_workflow`, `delete_workflow`, `list_executions`, `create_execution`, `pause_execution`, `resume_execution`, `list_tasks` |
| `orchestration/zaqar.py` | **Zaqar** (messaging) | `list_queues`, `create_queue`, `delete_queue`, `post_messages`, `get_messages`, `claim_messages`, `release_claim`, `create_subscription` |
| `orchestration/blazar.py` | **Blazar** (reservation) | `list_leases`, `create_lease`, `update_lease`, `delete_lease`, `list_blazar_hosts`, `create_host`, `delete_host` |
| `orchestration/aodh.py` | **Aodh** (alarming) | `list_alarms`, `create_threshold_alarm`, `create_composite_alarm`, `update_alarm`, `delete_alarm`, `get_alarm_state`, `get_alarm_history` |

#### Workload Lifecycle (`openstack/workloadlifecycle/`)

| Module | OpenStack Service | Key functions |
|---|---|---|
| `workloadlifecycle/trove.py` | **Trove** (DBaaS) | `list_instances`, `create_instance`, `delete_instance`, `resize_instance`, `list_databases`, `create_database`, `list_users`, `list_backups`, `create_backup`, `restore_to_instance` |
| `workloadlifecycle/freezer.py` | **Freezer** (backup) | `list_jobs`, `create_job`, `start_job`, `stop_job`, `delete_job`, `list_actions`, `create_action`, `list_sessions`, `create_session` |
| `workloadlifecycle/masakari.py` | **Masakari** (instance HA) | `list_segments`, `create_segment`, `delete_segment`, `list_ha_hosts`, `create_ha_host`, `delete_ha_host`, `list_notifications`, `create_notification` |

### Preferred import style

```python
# Group-level import (recommended — works for all exported functions)
from infrastructure.openstack.compute         import list_servers, provision_kubernetes_cluster
from infrastructure.openstack.storage         import list_volumes, list_shares
from infrastructure.openstack.networking      import list_networks, provision_load_balancer
from infrastructure.openstack.sharedservices  import list_projects, create_secret
from infrastructure.openstack.orchestration   import list_stacks, create_execution
from infrastructure.openstack.workloadlifecycle import list_instances, create_job

# Direct submodule — when you need the module object itself
import infrastructure.openstack.networking.network as osn
import infrastructure.openstack.storage.volume     as osv
import infrastructure.openstack.compute            as osc
```

> **SDK vs REST fallback**: Modules using a mature SDK proxy (`nova`, `cinder`, `neutron`, `magnum`, `swift`, `keystone`, `placement`, `barbican`, `heat`, `mistral`, `manila`, `ironic`, `zun`, `cyborg`, `trove`, `masakari`) use the SDK exclusively. Modules for services with limited SDK proxy coverage (`zaqar`, `blazar`, `aodh`, `freezer`) use direct authenticated REST calls via `conn.session`.

---

## Provisioning API Reference

All endpoints are under `/api/services/provision/`.
All POST endpoints require `workspace_id` + `environment_id` in the JSON body.
Authentication: `Authorization: Token <token>`

### POST `/api/services/provision/compute/vm/`

| Field | Type | Required | Description |
|---|---|---|---|
| `workspace_id` | string | [YES] | Workspace slug |
| `environment_id` | string | [YES] | `dev` / `staging` / `prod` |
| `name` | string | [YES] | Server name |
| `flavor_id` | string | [YES] | OpenStack flavor UUID |
| `image_id` | string | [YES] | OpenStack image UUID |
| `network_id` | string | — | Attach to network |
| `key_name` | string | — | SSH keypair name |
| `user_data` | string | — | cloud-init script |

### POST `/api/services/provision/storage/volume/`

| Field | Type | Required |
|---|---|---|
| `workspace_id` | string | [YES] |
| `environment_id` | string | [YES] |
| `name` | string | [YES] |
| `size_gb` | integer | [YES] |
| `volume_type` | string | — |

### POST `/api/services/provision/network/`

| Field | Type | Required |
|---|---|---|
| `workspace_id` | string | [YES] |
| `environment_id` | string | [YES] |
| `name` | string | [YES] |
| `subnet_cidr` | string | — |
| `subnet_name` | string | — |

### POST `/api/services/provision/kubernetes/cluster/`

| Field | Type | Required |
|---|---|---|
| `workspace_id` | string | [YES] |
| `environment_id` | string | [YES] |
| `name` | string | [YES] |
| `cluster_template_id` | string | [YES] |
| `node_count` | integer | [YES] |
| `master_count` | integer | — |
| `keypair` | string | — |

### POST `/api/services/provision/floating-ip/`

| Field | Type | Required |
|---|---|---|
| `workspace_id` | string | [YES] |
| `environment_id` | string | [YES] |
| `network_name` | string | — | Default: `"public"` |
| `server_id` | string | — | Auto-associate |
| `port_id` | string | — | Associate with port |

### GET `/api/services/provision/resources/`

| Query param | Required |
|---|---|
| `workspace_id` | [YES] |
| `environment_id` | — |

### GET `/api/services/workspaces/`

Returns all workspaces owned by or shared with the authenticated user.

---

## Frontend Usage Examples

```typescript
import {
  provisionVM,
  provisionVolume,
  provisionNetwork,
  listProvisionedResources,
} from "services/provisioningApi";

// Create a VM
const result = await provisionVM({
  workspace_id: "devops-team",
  environment_id: "staging",
  name: "web-server-01",
  flavor_id: "m1.medium",
  image_id: "ubuntu-22.04-lts",
  network_id: "net-abc123",
  key_name: "my-keypair",
});
console.log("Server ID:", result.resource.id);
console.log("Audit record:", result.provisioned);

// Create a volume
const vol = await provisionVolume({
  workspace_id: "devops-team",
  environment_id: "staging",
  name: "data-disk-01",
  size_gb: 100,
});

// List all resources in this workspace
const inventory = await listProvisionedResources("devops-team", "staging");
console.log(inventory.resources);
```

---

## Environment Variables

### Backend (`backend/.env` or system env)

```bash
# OpenStack credentials
OS_AUTH_URL=https://keystone.example.com:5000/v3
OS_USERNAME=orcacloud-service
OS_PASSWORD=<secret>
OS_USER_DOMAIN_NAME=Default
OS_PROJECT_DOMAIN_NAME=Default
OS_REGION_NAME=RegionOne
OS_CLOUD=orcacloud          # used when above are not set

# Django
SECRET_KEY=<secret>
DEBUG=false
ALLOWED_HOSTS=api.orcacloud.com
DATABASE_URL=postgres://user:pass@host/db
```

### Frontend (`frontend/.env`)

```bash
REACT_APP_API_URL=https://api.orcacloud.com
```

---

## Development Setup

```bash
# Backend
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python3 manage.py migrate
python3 manage.py createsuperuser
python3 manage.py runserver

# Frontend
cd frontend
npm install
npm start
```

### Create first workspace binding (dev CLI shortcut)

```bash
cd backend && source venv/bin/activate
python3 manage.py shell -c "
from django.contrib.auth.models import User
from services.workspace.models import Workspace, WorkspaceBinding

owner = User.objects.first()
ws = Workspace.objects.create(
    workspace_id='devops-team',
    display_name='DevOps Team',
    owner=owner,
)
WorkspaceBinding.objects.create(
    workspace=ws,
    environment='dev',
    openstack_project='devops-dev',
    openstack_region='RegionOne',
    quota_vcpus=20,
    quota_ram_gb=80,
    quota_storage_gb=500,
)
print('Created workspace binding')
"
```
