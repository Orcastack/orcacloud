# Identity – Keystone, RBAC, Vault, IAM

**Keystone** is the central identity provider for all OrcaCloud services. Every API call, automation, and developer interaction must authenticate through Keystone.

## Identity Architecture

```
Developer / Service
       │
  Keystone (OpenStack Identity)
  ├── Projects  →  Kubernetes Namespaces
  ├── Users     →  Platform accounts
  ├── Roles     →  RBAC bindings
  └── Service Accounts → Terraform / Ansible / Argo / n8n
       │
  Vault (HashiCorp)
  ├── Dynamic OpenStack credentials
  ├── Dynamic DB credentials
  ├── Kubernetes secrets injection
  └── Encryption-as-a-service
```

## Rules

1. **No hardcoded credentials** — ever. All secrets via Vault or Kubernetes Secrets.
2. **No manual resource creation** — all resources provisioned via Terraform with scoped credentials.
3. **All access must be logged** — Keystone audit log + Vault audit log.
4. **All changes must go through Git** — IAM config is version-controlled.
5. **Kubernetes projects map to namespaces** — one Keystone project = one K8s namespace.
6. **Service accounts are scoped per service** — no shared admin credentials.

## Subfolders

- `keystone/` — Keystone project, role, and domain definitions
- `rbac/` — Kubernetes RBAC manifests (ClusterRoles, RoleBindings, ServiceAccounts)
- `vault/` — HashiCorp Vault configuration, policies, and secret engine definitions
- `policies/` — Access policies, compliance documentation

## Credential Scoping

| Service | Credential Type | Scope |
|---------|----------------|-------|
| Terraform | Vault dynamic OpenStack creds | One project, read/write |
| Ansible | Vault dynamic SSH creds | Target host only |
| Argo Workflows | Kubernetes ServiceAccount | One namespace |
| n8n | n8n Credential store + Vault | Specific APIs only |
| Knative functions | Kubernetes ServiceAccount | One namespace, no cluster access |

## See Also

- `k8s/rbac/` — existing Kubernetes RBAC manifests
- `k8s/secrets/` — existing Kubernetes Secret definitions
- `backend/orcacloud/` — Django authentication integration
