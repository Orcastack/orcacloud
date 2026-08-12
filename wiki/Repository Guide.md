# Repository Guide

## Application Delivery

| Path | Contents |
| --- | --- |
| `cloudapi/` | Django API, OpenStack integrations, and backend tests |
| `webapp/` | React application and container build |
| `docker-compose.yml` | Unified local and production Compose configuration via profiles |
| `nginx/default.conf` | Production TLS and reverse-proxy configuration |
| `.github/workflows/` | CI/CD and GitHub Wiki publishing workflows |
| `docs/` | Deployment guides, runbooks, billing, and enablement documentation |
| `wiki/` | Version-controlled GitHub Wiki source pages |

## Infrastructure and Platform

| Path | Contents |
| --- | --- |
| `openstack/` | OpenStack service configuration and templates |
| `networking/` | OVN, policies, and network configuration |
| `terraform/` | Infrastructure provisioning modules and environments |
| `ansible/` | Host configuration roles and playbooks |
| `k8s/` | Kubernetes base manifests, overlays, security, monitoring, and RBAC |
| `helm/` | OrcaCloud Helm chart |
| `gitops/` | ArgoCD and GitOps configuration |
| `serverless/` | Knative and OpenFaaS resources |
| `workflows/` | Argo Workflows and n8n assets |

## Supporting Services

| Path | Contents |
| --- | --- |
| `identity/` | Keystone, RBAC, and Vault integration assets |
| `monitoring/` | Prometheus, Grafana, logging, and tracing configuration |
| `rabbitmq/` | RabbitMQ configuration |
| `mlops/` | Machine-learning operations assets |
| `sdk/` | Client SDKs |
| `scripts/` | Operational helper scripts |

## Documentation Authority

The wiki is a curated guide. When operational behavior changes, update the source documentation and the matching `wiki/` page in the same pull request. The following are the primary implementation references:

- [Architecture](https://github.com/Orcastack/orcacloud/blob/main/ARCHITECTURE.md)
- [Docker production deployment](https://github.com/Orcastack/orcacloud/blob/main/docs/DOCKER_PRODUCTION_DEPLOYMENT.md)
- [Cloud enablement playbook](https://github.com/Orcastack/orcacloud/blob/main/docs/cloud-enablement/IMPLEMENTATION_PLAYBOOK.md)
- [Runbooks](https://github.com/Orcastack/orcacloud/tree/main/docs/runbooks)

Return to [[Home]].
