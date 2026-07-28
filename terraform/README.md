# Terraform Modules

Every OrcaCloud infrastructure resource **must** be created through a Terraform module. No manual creation via the OpenStack dashboard or CLI.

## Module Catalogue

| Module | Path | Creates |
|--------|------|---------|
| `compute` | `modules/compute/` | VMs, keypairs, server groups |
| `networking` | `modules/networking/` | Networks, subnets, routers, security groups, floating IPs |
| `storage` | `modules/storage/` | Cinder volumes, volume snapshots, object storage buckets |
| `kubernetes` | `modules/kubernetes/` | Kubernetes cluster (kubeadm-based on OpenStack VMs) |
| `loadbalancer` | `modules/loadbalancer/` | Octavia LBs, listeners, pools, health monitors |
| `identity` | `modules/identity/` | Keystone projects, users, roles, quotas |
| `serverless` | `modules/serverless/` | Knative namespace, service accounts, network policies |

## Usage

```hcl
# Example: provision a standard web tier
module "web_network" {
  source      = "../../terraform/modules/networking"
  name        = "web"
  cidr        = "10.10.10.0/24"
  environment = "production"
}

module "web_vms" {
  source         = "../../terraform/modules/compute"
  name           = "web"
  count          = 3
  flavor         = "ax.standard.medium"
  image          = "ax-ubuntu-2204-amd64-202602"
  network_id     = module.web_network.network_id
  environment    = "production"
}
```

## State Backend

Terraform state is stored remotely in **MinIO** (S3-compatible) + DynamoDB-equivalent locking.

```hcl
terraform {
  backend "s3" {
    bucket                      = "ax-terraform-state"
    key                         = "production/networking/terraform.tfstate"
    region                      = "us-east-1"
    endpoint                    = "https://s3.orcacloud.internal"
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    force_path_style            = true
  }
}
```

## CI/CD

Terraform plans are run automatically on every PR via GitHub Actions. Apply requires manual approval for production.

## Rules

1. **All modules must use variable validation** (no raw string inputs for env).
2. **All modules must output** resource IDs for consumption by other modules.
3. **No `terraform apply` by hand in production** — use the Argo Workflow: `workflows/argo/templates/terraform-apply.yaml`.
