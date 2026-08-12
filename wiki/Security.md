# Security

## Security Principles

OrcaCloud's security model is built around scoped identity, tenant isolation, secret management, and auditable operations.

| Principle | Implementation direction |
| --- | --- |
| Tenant isolation | Workspace bindings map each request to an OpenStack project and region |
| Least privilege | Scoped service accounts, RBAC, and project-level authorization checks |
| Secret handling | GitHub secrets, host `.env` files with mode `600`, Vault/Barbican integration paths |
| Immutable delivery | GHCR images deployed by full commit SHA, not mutable tags |
| Secure CI dependencies | GitHub Actions pinned to full commit SHAs |
| Network protection | TLS at NGINX, firewall exposure limited to ports `80` and `443`, namespace network policies for Kubernetes workloads |
| Auditability | Provisioned-resource records, workflow logs, and centralized observability |

## Identity and Access

Keystone is the infrastructure identity authority. The application should resolve a workspace binding for every provisioning request and then use the resulting OpenStack project-scoped connection.

Do not call a global OpenStack connection from production endpoint code because that bypasses workspace isolation.

## Secret Management

- Never commit `.env`, production `clouds.yaml`, SSH keys, access tokens, or certificate private keys.
- Treat `.env.example` and `clouds.yaml.example` as examples only. Their values must be replaced before any deployment.
- Keep the production Docker host `.env` readable only by the deployment user.
- Store GitHub deployment inputs as environment secrets in the `production` environment.
- Prefer OpenStack application credentials for automation and scope them to the minimum required project and role.

## Production Boundary

The Docker host serves public traffic only through NGINX. NGINX terminates TLS for `orcacloud.org` and proxies internal traffic to the web application and API containers. PostgreSQL, Redis, RabbitMQ, Kafka, and ZooKeeper must not be exposed publicly.

## Security Response

For an active incident, start with the severity and triage procedures in [[Operations]]. Preserve evidence before making destructive changes, rotate affected credentials, and record the incident timeline and remediation.

## References

- [Cloud enablement security controls](https://github.com/Orcastack/orcacloud/blob/main/docs/cloud-enablement/IMPLEMENTATION_PLAYBOOK.md)
- [Identity configuration](https://github.com/Orcastack/orcacloud/tree/main/identity)
- [Production deployment](https://github.com/Orcastack/orcacloud/blob/main/docs/DOCKER_PRODUCTION_DEPLOYMENT.md)
