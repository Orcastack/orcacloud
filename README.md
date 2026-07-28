# OrcaCloud Platform

**OrcaCloud. Scalable. Enterprise-Grade.**

OrcaCloud is a full-stack cloud platform built on open-source infrastructure components — designed to match the architecture of AWS, Google Cloud, and OVH, but operated as a private, auditable, and self-OrcaCloud system.

---

## Architecture Overview

```
OrcaCloud
│
├── Identity & Governance          identity/
│   ├── Keystone (IAM)             identity/keystone/
│   ├── RBAC                       identity/rbac/
│   └── Vault (secrets)            identity/vault/
│
├── IaaS Layer (OpenStack)         openstack/
│   ├── Compute (Nova)             openstack/compute/
│   ├── Networking (Neutron+OVN)   openstack/networking/
│   ├── Storage (Cinder+Ceph)      openstack/storage/
│   ├── Images (Glance)            openstack/images/
│   └── Load Balancing (Octavia)   openstack/loadbalancer/
│
├── Networking Fabric              networking/
│   ├── OVN (VM SDN)               networking/ovn/
│   ├── Calico CNI (Pod SDN)       networking/calico/
│   ├── Templates                  networking/templates/
│   └── Policies                   networking/policies/
│
├── Infrastructure-as-Code         terraform/
│   └── Modules                    terraform/modules/
│       ├── compute/
│       ├── networking/
│       ├── storage/
│       ├── kubernetes/
│       └── loadbalancer/
│
├── Configuration Management       ansible/
│   ├── Inventory                  ansible/inventory/
│   ├── Playbooks                  ansible/playbooks/
│   └── Roles                      ansible/roles/
│       ├── vm-base/
│       ├── k8s-node/
│       ├── monitoring-agent/
│       └── security-harden/
│
├── Kubernetes Platform            k8s/
│   ├── Base manifests             k8s/base/
│   ├── RBAC                       k8s/rbac/
│   ├── Monitoring                 k8s/monitoring/
│   ├── Argo                       k8s/argo/
│   ├── Cert-manager               k8s/cert-manager/
│   └── Overlays (environments)    k8s/overlays/
│
├── Serverless Layer               serverless/
│   ├── Knative                    serverless/knative/
│   ├── OpenFaaS                   serverless/openfaas/
│   └── Function templates         serverless/functions/templates/
│
├── Workflow Automation            workflows/
│   ├── Argo Workflows             workflows/argo/templates/
│   ├── n8n                        workflows/n8n/
│   ├── Templates                  workflows/templates/
│   └── Events                     workflows/events/
│
├── Observability                  observability/
│   ├── Prometheus                 observability/prometheus/
│   ├── Grafana                    observability/grafana/
│   └── Alertmanager               observability/alertmanager/
│
├── Developer Experience           sdk/ / docs/ / frontend/
│   ├── Python SDK                 sdk/python/
│   ├── Node SDK                   sdk/node/
│   ├── Go SDK                     sdk/go/
│   ├── Java SDK                   sdk/java/
│   ├── Documentation              docs/
│   └── Developer Dashboard        frontend/
│
├── Application Services           backend/
│   ├── Django REST API            backend/orcacloud/
│   ├── Platform services          backend/services/
│   └── Infrastructure integration backend/infrastructure/
│
├── GitOps                         gitops/
│   ├── ArgoCD                     gitops/argocd/
│   └── KAS                        gitops/kas/
│
├── Helm Charts                    helm/
│   └── orcacloud/                helm/orcacloud/
│
├── Security                       security/
├── Infrastructure tooling         infrastructure/
├── Terraform (full)               terraform/
└── Platform HTML (public site)    *.html
```

---

## Cloud Enablement Playbook (Public / Private / Hybrid)

Execution-ready implementation assets for the multi-region OpenStack + Ceph strategy are available at:

- `docs/cloud-enablement/IMPLEMENTATION_PLAYBOOK.md`
- `docs/cloud-enablement/ROLLOUT_CHECKLIST.yaml`
- `backend/clouds.yaml.example` (RegionA/RegionB/RegionC profiles)

Use these artifacts to drive rollout phases, evidence-based go-live checks, and service-catalog alignment.

---

## The 10 Core Principles

### 1. OpenStack is Your IaaS Control Plane

OpenStack is the foundation. Every infrastructure resource is managed through OpenStack APIs.

| OpenStack Service | Role | AWS Equivalent |
|-------------------|------|----------------|
| **Nova** | Compute / VMs | EC2 |
| **Neutron + OVN** | Networking, SDN | VPC |
| **Cinder + Ceph** | Block + Object Storage | EBS + S3 |
| **Glance** | Image Registry | AMI |
| **Octavia** | Load Balancing | ALB / NLB |
| **Keystone** | Identity + IAM | IAM |

**Folder:** `openstack/`

---

### 2. Networking: OVN + Calico

Two-tier software-defined networking fabric:

- **OVN** (inside OpenStack Neutron) — tenant networks, routers, floating IPs, security groups for VMs
- **Calico** (inside Kubernetes) — pod networking, NetworkPolicy, optional BGP peering into OVN

VM ↔ Pod communication: Calico BGP advertises pod CIDRs (`192.168.0.0/16`) to OVN. OVN routes traffic back to Calico nodes.

**Folder:** `networking/` (configuration), `openstack/networking/` (Neutron templates)

---

### 3. Infrastructure-as-Code: Terraform + Ansible

**No manual resource creation. Ever.**

| Tool | Responsibility | AWS Equivalent |
|------|---------------|----------------|
| **Terraform** | Provision all infrastructure (networks, VMs, volumes, LBs, K8s clusters) | CloudFormation |
| **Ansible** | Configure all VMs and Kubernetes nodes after provisioning | Systems Manager |

Terraform modules live in `terraform/modules/`. Every module is independently usable and outputs IDs consumed by other modules.

Ansible roles live in `ansible/roles/`. Every role is idempotent. Inventory is generated dynamically from OpenStack.

**Folders:** `terraform/`, `ansible/`

---

### 4. Observability: Prometheus + Grafana + Alertmanager

Every service, node, and cluster must emit metrics in Prometheus format.

| Source | Exporter | Grafana Dashboard |
|--------|----------|------------------|
| Linux VMs | `node_exporter` (port 9100) | Infrastructure Health |
| OpenStack | `openstack-exporter` | OpenStack Overview |
| Kubernetes | `kube-state-metrics` + `cAdvisor` | Kubernetes Cluster |
| Serverless | Knative built-in | Serverless Functions |
| Workflows | Argo built-in | Workflow Engine |
| API | Django middleware | API Performance |

All Grafana dashboards are version-controlled in `observability/grafana/dashboards/`.
Alert routes → Slack + PagerDuty via Alertmanager.

**Folder:** `observability/` (also `monitoring/` for existing Prometheus deployment)

---

### 5. Kubernetes: Your EKS/GKE Equivalent

Kubernetes clusters run on OpenStack VMs, provisioned via the `terraform/modules/kubernetes/` module and configured via `ansible/roles/k8s-node/`.

Every cluster includes:

| Component | Purpose |
|-----------|---------|
| **Calico CNI** | Pod networking + NetworkPolicy |
| **NGINX Ingress** | HTTP/HTTPS ingress routing |
| **cert-manager** | Automatic TLS from Let's Encrypt |
| **kube-state-metrics** | Kubernetes metrics for Prometheus |
| **Argo Workflows** | CI/CD and infrastructure automation |
| **Knative Serving** | Serverless function execution |

**Folder:** `k8s/`

---

### 6. Serverless: Knative

Knative Serving runs on top of Kubernetes and provides:

- HTTP-triggered serverless functions
- Event-triggered functions via Knative Eventing (CloudEvents, RabbitMQ sources)
- Scale-to-zero autoscaling (KPA — Knative Pod Autoscaler)
- Prometheus metrics integration

All function deployments are GitOps-based. Function templates are in `serverless/functions/templates/`.

**Folder:** `serverless/`

---

### 7. Workflow Automation: Argo Workflows + n8n

| Engine | Purpose |
|--------|---------|
| **Argo Workflows** | Technical: Terraform apply, snapshot jobs, CI/CD pipelines, data processing |
| **n8n** | Business: alerts → Slack, VM provisioned → email, workflow failure → ticket |

Both engines call OpenStack APIs and can trigger Knative functions. Both are monitored by Prometheus.

Argo templates: `workflows/argo/templates/`
n8n workflow exports: `workflows/n8n/exports/`

**Folder:** `workflows/`

---

### 8. Identity, Security, and Governance

**Keystone** is the single identity source. No hardcoded credentials. No manual resource creation.

| Component | Purpose |
|-----------|---------|
| **Keystone** | Central identity provider for all OpenStack + platform services |
| **RBAC** | Kubernetes ClusterRoles mapped from Keystone roles |
| **Vault** | Dynamic credentials, secret injection, PKI, encryption-as-a-service |

Project-to-namespace mapping: one Keystone project = one Kubernetes namespace.
Service accounts: every automated service has its own scoped account.

**Folder:** `identity/`

---

### 9. Developer Experience

OrcaCloud provides a complete developer experience layer:

| Component | Location |
|-----------|----------|
| REST API | `backend/` (Django) |
| Python SDK | `sdk/python/` |
| Node.js SDK | `sdk/node/` |
| Go SDK | `sdk/go/` |
| Java SDK | `sdk/java/` |
| Documentation | `docs/` |
| Developer Dashboard | `frontend/` (React) |
| Public website | `*.html` (GitHub Pages) |

**Folders:** `sdk/`, `docs/`, `frontend/`

---

### 10. Platform Delivery Standards

| Standard | Requirement |
|----------|-------------|
| **No manual infra** | All resources via Terraform |
| **No manual config** | All VM configuration via Ansible |
| **No hardcoded secrets** | All secrets via Vault or Kubernetes Secrets |
| **GitOps** | All changes via Pull Request → automated apply |
| **Metrics** | Every service exposes `/metrics` |
| **Logs** | All logs shipped centrally (Loki/Elasticsearch) |
| **Dashboards** | All Grafana dashboards version-controlled |
| **Alerts** | All alert rules version-controlled |
| **Networking** | Default-deny NetworkPolicy in every namespace |
| **Images** | All VM images built via Packer and tagged |

---

## Getting Started

### Prerequisites

```bash
# Install OpenStack CLI
pip install python-openstackclient

# Install Terraform
brew install terraform   # or apt/yum equivalent

# Install Ansible
pip install ansible

# Install kubectl
curl -LO https://dl.k8s.io/release/v1.29.0/bin/linux/amd64/kubectl
chmod +x kubectl && sudo mv kubectl /usr/local/bin/

# Install Argo CLI
curl -sLO https://github.com/argoproj/argo-workflows/releases/download/v3.5.0/argo-linux-amd64.gz
gunzip argo-linux-amd64.gz && chmod +x argo-linux-amd64 && sudo mv argo-linux-amd64 /usr/local/bin/argo
```

### Environment Setup

```bash
# Copy and fill in your OpenStack credentials
cp backend/clouds.yaml.example backend/clouds.yaml

# Set active cloud
export OS_CLOUD=orcacloud

# Verify OpenStack connectivity
openstack token issue
```

### Provision Infrastructure

```bash
# 1. Provision networking
cd terraform/modules/networking
terraform init && terraform apply -var="name=primary" -var="environment=production"

# 2. Provision a Kubernetes cluster
cd terraform/modules/kubernetes
terraform init && terraform apply \
  -var="cluster_name=prod-k8s" \
  -var="environment=production" \
  -var="network_id=<network_id_from_step_1>" \
  -var="subnet_id=<subnet_id_from_step_1>"

# 3. Configure Kubernetes nodes via Ansible
cd ../../..
ansible-playbook -i ansible/inventory/openstack.yml ansible/playbooks/k8s-nodes.yml

# 4. Apply Kubernetes manifests
kubectl apply -k k8s/overlays/production
```

### Deploy Observability Stack

```bash
# Apply Prometheus + Grafana to cluster
kubectl apply -f observability/prometheus/prometheus.yml
kubectl apply -f observability/alertmanager/alertmanager.yml

# Import Grafana dashboards
kubectl apply -f observability/grafana/provisioning/datasources.yaml
```

### Deploy Serverless Layer

```bash
# Install Knative Serving CRDs
kubectl apply -f https://github.com/knative/serving/releases/download/knative-v1.13.0/serving-crds.yaml
kubectl apply -f https://github.com/knative/serving/releases/download/knative-v1.13.0/serving-core.yaml

# Apply OrcaCloud Knative configuration
kubectl apply -f serverless/knative/config.yaml

# Deploy your first function
kubectl apply -f serverless/functions/templates/knative-service.yaml -n your-namespace
```

---

## Repository Map Quick Reference

| Folder | Layer | Description |
|--------|-------|-------------|
| `openstack/` | IaaS | OpenStack resource definitions and templates |
| `networking/` | Networking | OVN + Calico configuration and policies |
| `terraform/` | IaC | Terraform modules for all infrastructure |
| `ansible/` | IaC | Ansible roles and playbooks for VM configuration |
| `k8s/` | Kubernetes | Kubernetes manifests and overlays |
| `serverless/` | Serverless | Knative + OpenFaaS configuration and templates |
| `workflows/` | Automation | Argo Workflows + n8n workflow definitions |
| `observability/` | Observability | Prometheus, Grafana, Alertmanager |
| `identity/` | Security | Keystone, RBAC, Vault |
| `gitops/` | GitOps | ArgoCD app definitions |
| `helm/` | Packaging | Helm charts |
| `backend/` | API | Django REST API and platform services |
| `frontend/` | Dashboard | React developer dashboard |
| `sdk/` | DX | Python, Node, Go, Java SDKs |
| `docs/` | DX | Platform documentation |
| `security/` | Security | Security policy and audit tooling |
| `infrastructure/` | Tooling | Concourse, Tekton, Puppet, Gerrit |
| `monitoring/` | Observability | Legacy Prometheus deployment (see `observability/`) |
| `scripts/` | Tooling | Operational shell scripts |

---

## CI/CD Pipelines

| Pipeline | File | Purpose |
|----------|------|---------|
| GitHub Actions | `.github/workflows/` | PR validation, image builds, Terraform plan |
| GitLab CI | `.gitlab-ci.yml` | Alternate CI runner |
| Bitbucket Pipelines | `bitbucket-pipelines.yml` | Bitbucket mirror integration |
| Jenkins | `Jenkinsfile` | Legacy Jenkins pipeline |
| Concourse | `infrastructure/concourse/` | Internal Concourse CI |
| Tekton | `infrastructure/tekton/` | Kubernetes-native CI |

---

## Security

All security standards are documented in `security/` and `docs/SECURITY_STANDARDS.md`.

Vulnerability disclosure: `security-team@orcacloud.com`

---

## License

Copyright © 2026 OrcaCloud. All rights reserved.

For licensing inquiries: `legal@orcacloud.com`
