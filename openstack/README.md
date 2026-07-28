# OpenStack – IaaS Control Plane

This directory contains all configuration, templates, and operational tooling for the **OrcaCloud OpenStack control plane**, which serves as the foundational layer for our IaaS infrastructure. It includes Terraform modules, Ansible playbooks, and custom scripts to manage compute, networking, storage, and image services.
## Folder Map

| Folder | OpenStack Service | AWS Equivalent |
|--------|------------------|----------------|
| `compute/` | Nova | EC2 |
| `networking/` | Neutron + OVN | VPC |
| `storage/` | Cinder + Ceph/MinIO | EBS + S3 |
| `images/` | Glance | AMI |
| `loadbalancer/` | Octavia | ALB / NLB |

## Usage Rules

1. **All infrastructure must be created via Terraform**, not the OpenStack dashboard.
2. **All networks must be created through Neutron APIs** — no manual OVN configuration.
3. **All images must be version-tagged** in Glance before use in production.
4. **All load balancers must be provisioned through Octavia** and exposed via Terraform.

## Credentials

Credentials are stored in `backend/clouds.yaml` (never committed). Use `openstack-client` pointing to `OS_CLOUD` environment variables scoped to the project.

## Related Layers

- Terraform modules → `terraform/modules/`
- Networking (OVN/Calico) → `networking/`
- Kubernetes on OpenStack → `k8s/`
- Identity → `identity/`
