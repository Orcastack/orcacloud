# OrcaCloud Enablement — Implementation Playbook

## 1) Purpose and Scope

This playbook operationalizes OrcaCloud’s target cloud model in this repository:

- Public cloud (multi-tenant shared infrastructure)
- Private cloud (isolated enterprise environments)
- Hybrid cloud (customer datacenter + cloud integration)

The design is implemented on top of OpenStack + Ceph, with the existing Django backend as orchestration and policy gateway.

This document is implementation-focused and mapped to current repository structure.

---

## 2) Current-State Mapping to Repository

The core capabilities already present:

- Workspace/project isolation model:
  - `backend/services/workspace/models.py`
  - `backend/services/workspace/service.py`
- OpenStack integration modules:
  - `backend/infrastructure/openstack/compute/*`
  - `backend/infrastructure/openstack/networking/*`
  - `backend/infrastructure/openstack/storage/*`
  - `backend/infrastructure/openstack/sharedservices/*`
  - `backend/infrastructure/openstack/orchestration/*`
  - `backend/infrastructure/openstack/workloadlifecycle/*`
- API routing and service exposure:
  - `backend/services/urls.py`
- Frontend developer and operations dashboards:
  - `frontend/src/pages/*`
  - `frontend/src/services/*`
- Infra and automation scaffolding:
  - `ansible/`
  - `terraform/`
  - `k8s/`
  - `monitoring/`

Key strategic fit: the WorkspaceBinding model already supports project and region mapping, which is the right abstraction to support Public/Private/Hybrid tenancy.

---

## 3) Target Architecture

### 3.1 Multi-Region OpenStack Layout

Define 3 logical regions:

- RegionA (Public): shared services and tenant self-service
- RegionB (Private): enterprise-dedicated projects and network isolation
- RegionC (Hybrid): cross-domain integration with customer datacenters

Control plane guidance:

- Keystone: centralized identity, shared/federated authority
- Nova/Neutron/Cinder/Glance/Swift: per-region deployment and operations
- Region-aware API routing: via WorkspaceBinding `openstack_region`

Repository implementation points:

- Region profile examples in `backend/clouds.yaml.example`
- Runtime routing through `WorkspaceService.get_connection(binding)`

### 3.2 Identity and Access

Identity strategy:

- Keystone as source-of-truth identity provider
- Federation support for LDAP/SAML/OIDC as upstream IdP
- Role-based policy enforcement at API layer and OpenStack policy layer

Implementation controls:

- Keep DRF token auth for app session auth
- Use Keystone-scoped service credentials per workspace binding
- Store sensitive credentials with Vault/Barbican; do not hardcode secrets

### 3.3 Storage Architecture (Ceph)

Target pool model:

- `rbd_public`: shared public block/image pool
- `rbd_private_<tenant|org>`: dedicated private pools
- `rbd_hybrid`: replicated/inter-region pools for hybrid use cases

Service integration:

- Cinder backed by RBD pools
- Glance backed by Ceph
- Nova ephemeral integration with Ceph where required
- Swift/RGW for object workloads

### 3.4 Networking Architecture

Use Neutron ML2 + VXLAN for tenant isolation, plus:

- Floating IPs for public ingress
- L3, DHCP agents
- Octavia for LBaaS
- Designate for DNS automation
- VPNaaS/direct route for hybrid integration

Hybrid implementation objective:

- RegionC acts as gateway domain for customer DC connectivity
- Routing and security policy isolated per workspace/project

---

## 4) Service Stack Baseline

| Service | Use | Cloud Type |
|---|---|---|
| Keystone | Identity and RBAC | All |
| Nova | Compute | All |
| Neutron | Networking | All |
| Cinder | Block storage | All |
| Glance | Image management | All |
| Swift | Object storage | Public |
| Octavia | Load balancing | Public |
| Designate | DNS automation | Public |
| Barbican | Secrets and keys | Hybrid / Security-critical |
| Heat | Orchestration templates | Hybrid |
| Mistral | Workflow orchestration | Hybrid |
| Ceilometer/Gnocchi/Aodh | Telemetry, metrics, alarms | All / Hybrid for policy alarms |

Repository coverage exists for most modules under `backend/infrastructure/openstack/`.

---

## 5) Backend Orchestration Implementation

### 5.1 API Gateway Pattern (already aligned)

The backend should remain the only orchestration gateway:

- Authenticate user
- Resolve workspace + environment
- Map to OpenStack project + region
- Execute OpenStack operations
- Register audit resource records
- Return normalized API response

Primary path:

1. API request arrives
2. Validate `workspace_id` + `environment`
3. Resolve binding via `WorkspaceService.resolve(...)`
4. Open connection via `WorkspaceService.get_connection(binding)`
5. Call target OpenStack integration module
6. Persist `ProvisionedResource` audit entry
7. Emit telemetry/billing event

### 5.2 API Modules to expose and harden

- Auth: login/session + project mapping view
- Compute: VM lifecycle, flavors, image references
- Network: VPC/network/subnet/router/security groups/FIP
- Storage: volume/snapshot/object
- LBaaS: load balancer/listener/pool/member
- DNS: zones/records integration with public endpoints
- Telemetry: usage summaries and billing feeds

### 5.3 Isolation and Security Controls

Required controls:

- Project-level authorization checks per request
- Resource ownership tagging in metadata
- Token/header sanitization
- No direct global `openstack.connect()` usage in endpoint views

Hard rule:

- All provisioning endpoints must use workspace-bound connection path.

---

## 6) Dashboard and Service Catalog Alignment

### 6.1 Developer Dashboard

Expose operations by cloud type and workspace entitlement:

- VM, volumes, snapshots
- Networks, security groups, floating IP
- Load balancer and DNS (Public)
- Quotas and usage metrics

### 6.2 Marketing Dashboard

Expose aggregate insights only:

- Consumption trends
- Revenue proxies
- Segment growth by cloud type

### 6.3 Service Catalog Matrix

| Cloud Type | Services |
|---|---|
| Public | VM, volume, network, LBaaS, DNS, object |
| Private | VM, volume, network, image |
| Hybrid | VM, volume, network, orchestration, secrets |

Implementation recommendation:

- Keep this matrix as policy metadata and render from API, not hardcoded UI.

---

## 7) Hybrid Cloud Enablement Plan

### 7.1 Connectivity Modes

- Primary: Neutron VPNaaS
- Advanced: direct-connect/BGP routing with customer DC

### 7.2 Cross-cloud Orchestration

- Heat templates for workload deployment and dependencies
- Mistral workflows for chained operations and rollback

### 7.3 Secrets and Key Management

- Barbican for TLS certificates, API credentials, and key material
- Vault integration under `identity/vault/` for platform secret lifecycle

---

## 8) CI/CD and Automation

### 8.1 IaC

Use existing folders and tooling:

- `ansible/` for service config, host roles, and hardening
- `terraform/` for region resources, network, compute, storage topology

### 8.2 Pipelines

Automate:

- Backend tests and build
- Frontend build and static checks
- OpenStack config rollout pipeline
- Telemetry sync and billing validation

### 8.3 Monitoring and Alerting

Deploy/verify:

- Prometheus + Grafana (`monitoring/`, `k8s/monitoring/`)
- Aodh/OpenStack alarms
- Ceph health and capacity alerts
- API latency and error-budget alerts

---

## 9) Operational Playbooks

### 9.1 Onboarding Workflow

1. Create workspace
2. Create environment bindings (dev/staging/prod)
3. Map to OpenStack project + region
4. Assign members and roles
5. Provision baseline network and quotas

### 9.2 Incident Workflow

Runbook classes:

- API gateway failures
- Keystone auth/token issues
- Ceph degraded/nearfull states
- Neutron routing and floating IP faults

### 9.3 Scaling Workflow

- Add compute hosts
- Expand Ceph OSD capacity and rebalance
- Increase quotas by workspace policy
- Enable additional services by cloud type

---

## 10) Go-Live Readiness Criteria

A deployment is go-live ready when all are true:

- OpenStack core services healthy in all 3 regions
- Ceph pools healthy with expected replication
- Backend API routes requests by workspace/project/region correctly
- Dashboards show accurate project-scoped state
- Telemetry and billing outputs validated
- Hybrid connectivity tested and documented
- TLS/RBAC/secrets hardening complete
- CI/CD and rollback paths tested
- Monitoring and alerting in place with on-call ownership

---

## 11) 90-Day Implementation Sequence

### Phase 1 (Weeks 1–3): Foundation

- Finalize region topology and naming conventions (RegionA/B/C)
- Establish Keystone federation and baseline roles
- Validate workspace binding policies and quota defaults
- Standardize cloud profiles and secret injection model

### Phase 2 (Weeks 4–6): Public + Private

- Enable public service catalog (VM/network/volume/LB/DNS/object)
- Enable private enterprise onboarding with dedicated project mapping
- Add quota guardrails and audit policy checks

### Phase 3 (Weeks 7–9): Hybrid

- Stand up RegionC hybrid connectivity (VPN/direct route)
- Enable Heat + Mistral orchestration paths
- Integrate Barbican/Vault secret workflows

### Phase 4 (Weeks 10–12): Operations + Go-live

- Complete telemetry and billing validation
- Execute resilience and incident drills
- Close remaining checklist gaps
- Approve go-live with evidence package

---

## 12) Acceptance Tests (Must Pass)

1. Region routing test: same API call from two workspace bindings lands in different OpenStack projects/regions.
2. Tenant isolation test: cross-project resource access is denied.
3. Public service test: LB + DNS + floating IP workflow succeeds.
4. Private service test: dedicated project receives isolated resources only.
5. Hybrid test: workload deployed in RegionC reaches approved on-prem target.
6. Secrets test: no static credentials in config, all sensitive values from secure store.
7. Observability test: API, OpenStack, and Ceph alerts visible in monitoring.

---

## 13) Owner Model

Recommended ownership split:

- Platform Engineering: OpenStack/Ceph core and network fabric
- Backend Team: orchestration APIs, policy checks, telemetry emission
- Frontend Team: dashboard UX and service catalog rendering
- DevOps/SRE: CI/CD, monitoring, incident response, capacity planning
- Security: identity federation, secrets governance, compliance controls

---

## 14) Immediate Next Steps in This Repo

1. Use `backend/clouds.yaml.example` new RegionA/B/C profiles as baseline.
2. Execute `docs/cloud-enablement/ROLLOUT_CHECKLIST.yaml` and track evidence.
3. Update Terraform and Ansible assets per region and service matrix.
4. Add API-level service catalog payloads for dashboard rendering.
5. Run acceptance tests before enabling production traffic.
