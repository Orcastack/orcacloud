# OrcaCloud

OrcaCloud is a cloud platform that combines a Django API and React web application with OpenStack-based infrastructure services. It supports workspace-scoped provisioning, public/private/hybrid cloud tenancy, and an operational deployment path built on Docker Compose and GitHub Container Registry.

## Start Here

| Goal | Read |
| --- | --- |
| Understand the system | [[Architecture]] |
| Run the platform locally | [[Getting Started]] |
| Deploy the application | [[Production Deployment]] |
| Understand automated delivery | [[CI and CD]] |
| Operate or troubleshoot the platform | [[Operations]] |
| Review identity and security controls | [[Security]] |
| Find the right repository area | [[Repository Guide]] |

## Platform At A Glance

| Area | Primary technologies | Responsibility |
| --- | --- | --- |
| Application | Django, React, PostgreSQL, Redis | API, UI, background service integration |
| Cloud control plane | OpenStack, Keystone, Nova, Neutron, Cinder | Tenant-scoped infrastructure provisioning |
| Delivery | GitHub Actions, GHCR, Docker Compose | Test, build, publish, and deploy application images |
| Infrastructure automation | Terraform, Ansible, Kubernetes, Helm | Provision and configure platform infrastructure |
| Observability | Prometheus, Grafana, Alertmanager | Metrics, dashboards, and alerting |

## Deployment Model

The current application production path is intentionally Docker-host based:

1. A push to `main` tests the backend and web application.
2. GitHub Actions builds immutable multi-architecture images for `linux/amd64` and `linux/arm64`.
3. Images are published to GitHub Container Registry with `sha-<commit>` tags.
4. The production job connects to the configured Docker host through SSH.
5. Docker Compose pulls the exact tags and starts the `prod` profile.
6. The workflow retries the public API and web health checks.

This is separate from the platform's OpenStack and Kubernetes infrastructure capabilities described in [[Architecture]].

## Wiki Publishing

These pages are maintained in the repository under `wiki/` and published by the **Publish GitHub Wiki** workflow. Enable the repository Wiki in GitHub first, then run that workflow manually or merge a change under `wiki/` into `main`.

For repositories where the default `GITHUB_TOKEN` cannot push to the `.wiki.git` repository, create a `WIKI_SYNC_TOKEN` repository secret with write access to the Wiki repository.

## Source Documentation

The wiki is a curated operating guide. The detailed source material remains in the repository:

- [Architecture guide](https://github.com/Orcastack/orcacloud/blob/main/ARCHITECTURE.md)
- [Docker production deployment guide](https://github.com/Orcastack/orcacloud/blob/main/docs/DOCKER_PRODUCTION_DEPLOYMENT.md)
- [Cloud enablement playbook](https://github.com/Orcastack/orcacloud/blob/main/docs/cloud-enablement/IMPLEMENTATION_PLAYBOOK.md)
- [Operations runbooks](https://github.com/Orcastack/orcacloud/tree/main/docs/runbooks)
