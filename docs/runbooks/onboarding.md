# OrcaCloud – Tenant Onboarding Runbook

**Scope:** Onboarding a new enterprise tenant to the OrcaCloud cloud platform.
**Applies to:** Public, Private, and Hybrid cloud tiers.
**Owner:** Platform Operations team

---

## 1. Pre-Onboarding Checklist

Before starting, confirm these items are in place:

- [ ] Sales/contracts team has submitted an approved onboarding request with cloud type and quota estimates
- [ ] Tenant name, domain, and primary contact email are confirmed
- [ ] Cloud tier confirmed: **public** | **private** | **hybrid**
- [ ] Billing account created in `services.billing`
- [ ] Compliance requirements noted (GDPR, HIPAA, SOC-2, etc.)

---

## 2. Step 1 — Create the OrcaCloud Workspace

```bash
# Via OrcaCloud API
curl -X POST https://api.orcacloud.com/api/services/workspaces/ \
  -H "Authorization: Token $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "workspace_id": "<tenant-slug>",
    "display_name": "<Company Name>",
    "description": "<brief description>"
  }'
```

Record the returned `workspace_id`.

---

## 3. Step 2 — Create the WorkspaceBinding

Bind the workspace to the correct OpenStack project and cloud type:

```bash
curl -X POST https://api.orcacloud.com/api/services/workspaces/<workspace_id>/bindings/ \
  -H "Authorization: Token $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "environment":       "prod",
    "cloud_type":        "public",          # or private / hybrid
    "openstack_project": "<os-project-name>",
    "openstack_region":  "RegionA",         # RegionA=public, RegionB=private, RegionC=hybrid
    "quota_vcpus":       50,
    "quota_ram_gb":      200,
    "quota_storage_gb":  2000
  }'
```

**Cloud type → Region mapping:**
| cloud_type | OpenStack Region | clouds.yaml profile     |
|------------|-----------------|-------------------------|
| public     | RegionA         | `atonix-region-a-public` |
| private    | RegionB         | `atonix-region-b-private` |
| hybrid     | RegionC         | `atonix-region-c-hybrid` |

---

## 4. Step 3 — Create the Keystone Project and Assign Roles

```bash
# Source admin credentials for the target region
source /etc/openstack/admin-openrc.sh

# Create Keystone project
openstack project create \
  --domain Default \
  --description "<Company Name> Production" \
  <os-project-name>

# Create tenant admin user
openstack user create \
  --domain Default \
  --password "$TENANT_ADMIN_PASSWORD" \
  <tenant-admin-username>

# Assign member role to tenant admin
openstack role add \
  --project <os-project-name> \
  --user <tenant-admin-username> \
  member

# Set quotas
openstack quota set \
  --cores 50 \
  --ram 204800 \
  --gigabytes 2000 \
  --instances 20 \
  --secgroups 10 \
  --floating-ips 10 \
  <os-project-name>
```

---

## 5. Step 4 — Configure the Tenant Network

For **Public cloud** tenants:

```bash
# Create tenant router
openstack router create --project <os-project-name> <tenant>-router

# Set external gateway
openstack router set --external-gateway atonix-public-external <tenant>-router

# Create tenant network and subnet
openstack network create --project <os-project-name> <tenant>-net
openstack subnet create \
  --project <os-project-name> \
  --network <tenant>-net \
  --subnet-range 10.$(( RANDOM % 254 )).0.0/24 \
  --dns-nameserver 8.8.8.8 \
  <tenant>-subnet

# Attach subnet to router
openstack router add subnet <tenant>-router <tenant>-subnet
```

For **Private cloud** tenants: create a VLAN-backed provider subnet with no external gateway.
For **Hybrid cloud** tenants: create the subnet then provision a VPNaaS connection via the Heat template at `openstack/orchestration/heat_hybrid_workload.yaml`.

---

## 6. Step 5 — Provision Initial Resources (Optional)

Use the OrcaCloud provisioning endpoint to kick off initial VM provisioning:

```bash
curl -X POST https://api.orcacloud.com/api/services/provision/compute/vm/ \
  -H "Authorization: Token $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "workspace_id":  "<tenant-slug>",
    "environment_id": "prod",
    "name":          "<tenant>-bastion",
    "image_id":      "<ubuntu-22.04-glance-id>",
    "flavor_id":     "<m1.small-flavor-id>",
    "network_id":    "<tenant-net-id>",
    "key_name":      "<tenant-keypair>"
  }'
```

---

## 7. Step 6 — Send Welcome Credentials

```bash
# Generate tenant credentials summary
cat <<EOF > /tmp/<tenant>-credentials.txt
OrcaCloud – Tenant Credentials
Workspace ID:      <tenant-slug>
Cloud Type:        <public|private|hybrid>
Region:            <RegionA|RegionB|RegionC>
Keystone Auth URL: https://keystone.<region>.cloud.orcacloud.com/v3
Project Name:      <os-project-name>
Admin User:        <tenant-admin-username>
Dashboard URL:     https://dashboard.orcacloud.com/developer/Dashboard/projects
API Base URL:      https://api.orcacloud.com/api/services/
EOF

# Email securely via platform email service
curl -X POST https://api.orcacloud.com/api/services/email-domains/send/ \
  -H "Authorization: Token $ADMIN_TOKEN" \
  -d "{ \"to\": \"<contact-email>\", \"template\": \"onboarding-welcome\", \"context\": { \"workspace_id\": \"<tenant-slug>\" } }"
```

---

## 8. Verification

```bash
# Confirm workspace binding:
curl https://api.orcacloud.com/api/services/workspaces/<workspace_id>/ \
  -H "Authorization: Token $ADMIN_TOKEN" | python3 -m json.tool

# Confirm service catalog for workspace:
curl "https://api.orcacloud.com/api/services/catalog/for_workspace/<workspace_id>/" \
  -H "Authorization: Token $ADMIN_TOKEN" | python3 -m json.tool

# Confirm Keystone project:
openstack project show <os-project-name>

# Confirm quota:
openstack quota show <os-project-name>

# Confirm network:
openstack network list --project <os-project-name>
```

---

## 9. Post-Onboarding

- Update the onboarding checklist via `PATCH /api/services/onboarding/checklist/update/`
- Create a monitoring alert rule in Prometheus for the new project quota
- Schedule the 30-day capacity review reminder in the ops calendar
- Add the tenant to the cloud alerting channel if hybrid (Aodh alarms)

---

## Rollback

If onboarding fails mid-way:

```bash
# Remove Keystone resources
openstack user delete <tenant-admin-username>
openstack project delete <os-project-name>

# Remove OrcaCloud workspace
curl -X DELETE https://api.orcacloud.com/api/services/workspaces/<workspace_id>/ \
  -H "Authorization: Token $ADMIN_TOKEN"
```
