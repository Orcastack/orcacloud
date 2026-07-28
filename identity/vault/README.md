# Vault – Secret Management

HashiCorp Vault provides secrets management, dynamic credentials, and encryption-as-a-service for all OrcaCloud services.

## Secret Engines

| Engine | Path | Purpose |
|--------|------|---------|
| KV v2 | `secret/orcacloud/` | Static secrets (API keys, config) |
| OpenStack | `openstack/` | Dynamic OpenStack credentials |
| Database | `database/` | Dynamic PostgreSQL/MySQL credentials |
| SSH | `ssh/` | Dynamic SSH certificates for Ansible |
| PKI | `pki/` | TLS certificate issuing |
| Kubernetes | `kubernetes/` | Service account token injection |

## Standard Policies

### `terraform-policy.hcl`
```hcl
# Terraform — can read/write to specific paths only
path "secret/data/orcacloud/terraform/*" {
  capabilities = ["read"]
}
path "openstack/creds/terraform-role" {
  capabilities = ["read", "create", "update"]
}
```

### `developer-policy.hcl`
```hcl
# Developer — read own project secrets, no cross-project access
path "secret/data/orcacloud/projects/{{identity.entity.aliases.userpass.metadata.project}}/*" {
  capabilities = ["read", "list"]
}
```

## Kubernetes Integration (Agent Injector)

Secrets are injected into pods via the Vault Agent Sidecar Injector. Annotate pods with:

```yaml
vault.hashicorp.com/agent-inject: "true"
vault.hashicorp.com/role: "my-service"
vault.hashicorp.com/agent-inject-secret-config: "secret/data/orcacloud/my-service/config"
```

## Rules

- Vault is HA (3 nodes, Raft storage)
- Vault audit log is shipped to centralized log store
- All seal/unseal operations require 3-of-5 Shamir shares
- Auto-unseal via cloud KMS (OpenStack Barbican)
