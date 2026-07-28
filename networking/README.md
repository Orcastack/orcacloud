# Networking – OVN + Calico

The OrcaCloud networking layer implements a two-tier SDN fabric:

| Component | Scope | Role |
|-----------|-------|------|
| **OVN** | OpenStack (VM layer) | Tenant networks, routers, floating IPs, security groups |
| **Calico** | Kubernetes (pod layer) | Pod networking, NetworkPolicy, BGP peering |

## Architecture

```
┌───────────────────────────────────────────────────────┐
│  OpenStack Neutron                                     │
│  ┌─────────────────────────────────────────────────┐  │
│  │  OVN (SDN backend)                               │  │
│  │  • Logical switches per tenant network           │  │
│  │  • Distributed routers                           │  │
│  │  • Floating IPs (SNAT/DNAT)                     │  │
│  │  • Security groups → ACLs                        │  │
│  └─────────────────────────────────────────────────┘  │
│                          │                             │
│          OVN routes: 192.168.0.0/16 → K8s nodes       │
│                          │                             │
│  ┌─────────────────────────────────────────────────┐  │
│  │  Kubernetes Cluster                              │  │
│  │  ┌───────────────────────────────────────────┐  │  │
│  │  │  Calico CNI                                │  │  │
│  │  │  • Pod IPs: 192.168.x.x                   │  │  │
│  │  │  • BGP advertises pod CIDRs to OVN        │  │  │
│  │  │  • NetworkPolicy enforcement               │  │  │
│  │  └───────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────┘
```

## Rules

1. **OVN is the primary SDN** — never configure OVS manually.
2. **Calico CNI** is mandatory for all Kubernetes clusters.
3. **Calico must not replace OVN** — BGP peering only between Calico border nodes and OVN.
4. **Security groups** (VM) and **NetworkPolicies** (pods) must both enforce least privilege.

## CIDRs

| Network | CIDR |
|---------|------|
| Provider (physical) | `172.16.0.0/12` |
| Default tenant | `10.10.0.0/16` |
| Kubernetes pod | `192.168.0.0/16` |
| Kubernetes service | `10.96.0.0/12` |

## Subfolders

- `ovn/` — OVN logical network definitions, BGP config
- `calico/` — Calico installation manifests, BGPConfiguration, NetworkPolicies
- `templates/` — Reusable Terraform networking templates
- `policies/` — Standard security group and NetworkPolicy baselines

## See Also

- `openstack/networking/` — Neutron API config and security group templates
- `k8s/` — Kubernetes manifests (Calico is applied via `k8s/`)
- `terraform/modules/networking/` — Terraform networking module
