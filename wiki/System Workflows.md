# System Workflows

## API Request Lifecycle

```mermaid
sequenceDiagram
  participant U as User interface or client
  participant A as OrcaAPI
  participant W as WorkspaceService
  participant P as Policy and authorization
  participant O as OpenStack service
  participant D as Audit store
  U->>A: Authenticated request
  A->>P: Validate identity and permission
  A->>W: Resolve workspace and environment
  W-->>A: Scoped project and region binding
  A->>O: Provider operation through scoped connection
  O-->>A: Provider result
  A->>D: Register resource and outcome
  A-->>U: Normalized API response
```

## Application Delivery Workflow

```mermaid
sequenceDiagram
  participant G as GitHub push
  participant C as CI workflow
  participant R as GHCR
  participant H as Production host
  G->>C: Push to main or develop
  C->>C: Test backend and frontend
  C->>C: Run security scan
  C->>R: Publish multi-architecture image by commit SHA
  alt main
    C->>H: Deploy immutable image tags
    H-->>C: Service status
    C->>C: Retry public health checks
  else develop
    C->>C: Apply development Kubernetes deployment path
  end
```

## Scaling Workflow

1. Observability detects capacity pressure or a tenant quota threshold.
2. An operator classifies the constraint as compute, storage, network pool, or quota.
3. The appropriate infrastructure automation or OpenStack change is prepared and reviewed.
4. Capacity is added or rebalanced.
5. Operators verify service registration, resource health, and post-change telemetry.

For Ceph changes, completion requires placement groups to return to `active+clean`.

## Network and Storage Provisioning

Network provisioning uses the workspace's OpenStack project to create or retrieve the tenant network, subnet, router, security group, floating IP, load balancer, or DNS resource. Storage provisioning follows the same binding pattern for volumes, snapshots, images, objects, or shares.

The principle is unchanged across workflows: resolve the workspace first, then call the provider through that scoped context.