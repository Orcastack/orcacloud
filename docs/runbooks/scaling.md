# OrcaCloud – Scaling Runbook

**Scope:** Procedures for expanding capacity on the OrcaCloud cloud platform.
**Owner:** Platform Engineering / Infrastructure team

---

## Overview

Scaling operations fall into three categories:

| Category        | Trigger                                     | Lead time   |
|-----------------|---------------------------------------------|-------------|
| Compute scaling | `NovaHypervisorMemoryPressure` / `NovaHypervisorVCPUOvercommit` | 1–4 hours  |
| Storage scaling | `CephClusterNearFull` / `CephOSDNearFull`  | 2–8 hours  |
| Quota increase  | Tenant request / `ProjectVCPUQuotaNearLimit` | 10 minutes |
| Pool expansion  | `NeutronIPAllocationExhaustion`             | 30 minutes |

---

## add-compute-nodes

**Trigger:** Nova hypervisor memory or vCPU overcommit alert, or tenant growth demand.

### 1. Provision the physical/virtual host

Ensure the new node has:
- Ubuntu 22.04 LTS
- 2× 25 GbE NICs (public + cluster)
- Hardware virtualisation enabled (VT-x / AMD-V)
- DNS resolution to controller nodes

### 2. Add to Ansible inventory

```ini
# ansible/inventory/production.ini
[openstack_compute]
compute-04 ansible_host=10.0.1.24 ansible_user=ubuntu
```

### 3. Run the compute playbook

```bash
cd /home/atonixdev/orcacloud
ansible-playbook -i ansible/inventory/production.ini \
  ansible/playbooks/openstack-compute.yml \
  --limit compute-04 \
  --ask-become-pass
```

### 4. Verify hypervisor registration

```bash
openstack compute service list
openstack hypervisor list --long | grep compute-04
```

### 5. Update the region capacity record

```bash
curl -X PATCH https://api.orcacloud.com/api/services/regions/<region-id>/ \
  -H "Authorization: Token $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"uptime_30d_pct": 100.0}'
```

---

## add-osd-nodes

**Trigger:** `CephClusterNearFull` (>80%) or planned capacity expansion.

### 1. Provision storage node

Ensure the new node has:
- Ubuntu 22.04 LTS
- Dedicated data disks (NVMe or SAS HDDs) — **DO NOT use OS disk**
- 10 GbE cluster NIC on the Ceph cluster network
- Connectivity to all existing MON nodes

### 2. Add to Ansible inventory

```ini
# ansible/inventory/production.ini
[ceph_osds]
ceph-osd-04 ansible_host=10.0.2.24 ansible_user=ubuntu

[ceph_all:children]
ceph_mons
ceph_osds
ceph_rgw
```

Set per-host OSD device list:

```ini
# ansible/inventory/host_vars/ceph-osd-04.yml
ceph_osd_devices:
  - /dev/nvme0n1
  - /dev/nvme1n1
  - /dev/nvme2n1
```

### 3. Run the OSD role

```bash
ansible-playbook -i ansible/inventory/production.ini \
  ansible/playbooks/ceph-deploy.yml \
  --tags "hosts,osds" \
  --limit ceph-osd-04
```

### 4. Verify OSDs are in

```bash
ceph osd tree
ceph osd stat   # should show increased total count
ceph df         # confirm used% dropped
```

### 5. Allow rebalancing to complete before declaring done

```bash
watch ceph -s   # wait for pg_map to show all PGs active+clean
```

---

## rebalance-ceph

**Trigger:** `CephOSDNearFull` (>80% on individual OSDs) with uneven distribution.

```bash
# 1. Check OSD utilisation
ceph osd df tree

# 2. Automatic reweight
ceph osd reweight-by-utilization 110  # threshold 110% of mean

# 3. Manual reweight if automatic doesn't converge
ceph osd reweight <osd-id> 0.8   # reduce weight of hot OSD

# 4. Monitor rebalancing progress
ceph -w | grep rebalancing

# 5. Adjust CRUSH weights if permanent unbalance
ceph osd crush reweight osd.<osd-id> <new-weight>
```

---

## increase-project-quota

**Trigger:** `ProjectVCPUQuotaNearLimit` / `ProjectMemoryQuotaNearLimit` alert, or tenant request.

### Via OrcaCloud API

```bash
# 1. Get current binding
curl https://api.orcacloud.com/api/services/workspaces/<workspace_id>/ \
  -H "Authorization: Token $ADMIN_TOKEN"

# 2. Update quota on the binding
curl -X PATCH \
  https://api.orcacloud.com/api/services/workspaces/<workspace_id>/bindings/<binding-id>/ \
  -H "Authorization: Token $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "quota_vcpus": 100,
    "quota_ram_gb": 400,
    "quota_storage_gb": 5000
  }'
```

### Via OpenStack CLI (enforce at Keystone layer)

```bash
source /etc/openstack/admin-openrc.sh

openstack quota set \
  --cores    100 \
  --ram      409600 \
  --gigabytes 5000 \
  --instances 40 \
  --floating-ips 20 \
  <os-project-name>

# Verify
openstack quota show <os-project-name>
```

---

## expand-floating-ip-pool

**Trigger:** `NeutronIPAllocationExhaustion` alert (>90% of floating IPs used).

```bash
# 1. Check current pool exhaustion
openstack floating ip list | wc -l
openstack network show atonix-public-external-subnet | grep allocation

# 2. Add an additional allocation range to the external subnet
openstack subnet set \
  --allocation-pool start=203.0.113.100,end=203.0.113.199 \
  atonix-public-external-subnet

# 3. Verify new pool
openstack subnet show atonix-public-external-subnet | grep allocation_pools

# 4. If the external IP block is exhausted — coordinate with networking team
#    to assign a new /24 and create a new external subnet:
openstack subnet create \
  --network atonix-public-external \
  --subnet-range 203.0.114.0/24 \
  --no-dhcp \
  --gateway 203.0.114.1 \
  --allocation-pool start=203.0.114.10,end=203.0.114.254 \
  atonix-public-external-subnet-2
```

---

## enable-new-services

**Trigger:** New cloud tier activation or tenant-requested service enablement.

### 1. Add to ServiceCatalogEntry

```bash
# Using the OrcaCloud management command
cd /home/atonixdev/orcacloud/backend
python manage.py seed_service_catalog

# Or add a single entry via API (platform_admin role required)
curl -X POST https://api.orcacloud.com/api/services/catalog/ \
  -H "Authorization: Token $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cloud_type":        "hybrid",
    "service_slug":      "ironic",
    "display_name":      "Bare Metal Provisioning",
    "category":          "compute",
    "openstack_service": "ironic",
    "description":       "Bare metal provisioning via OpenStack Ironic",
    "is_enabled":        true,
    "is_billable":       true
  }'
```

### 2. Update the WorkspaceBinding enabled_services field

For region-level service availability, update the `CloudRegion.enabled_services` field:

```bash
curl -X PATCH https://api.orcacloud.com/api/services/regions/<region-id>/ \
  -H "Authorization: Token $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled_services": ["compute","storage","networking","database","kubernetes","ironic"]}'
```

### 3. Notify affected tenants

Use the platform email service to notify tenants in that cloud tier that the new service is available.

---

## update-quotas-post-scaling

After adding compute or storage nodes, incrementally increase global defaults:

```bash
# Update Nova default quota class
openstack quota set \
  --class default \
  --cores 100 \
  --ram 819200 \
  --instances 50

# Verify resource availability
openstack hypervisor stats show
```
