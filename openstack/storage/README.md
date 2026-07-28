# Cinder + Ceph/MinIO – Storage

Block storage (Cinder) and object/file storage (Ceph RBD / MinIO) for all OrcaCloud workloads.

## Storage Tiers

| Tier | Backend | Use Case |
|------|---------|----------|
| `ax-fast` | Ceph RBD (NVMe) | Databases, active workloads |
| `ax-standard` | Ceph RBD (SSD) | General compute, app data |
| `ax-archive` | Ceph RBD (HDD) | Backups, logs, cold storage |
| `ax-object` | MinIO / Swift | S3-compatible object storage |

## Volume Types

Defined in `volume-types.yaml`. Create via Terraform only.

## Object Storage (MinIO)

- S3-compatible endpoint: `https://s3.orcacloud.internal`
- Lifecycle policies: defined in `lifecycle-policies.yaml`
- Encryption: AES-256 at rest, TLS in transit

## Snapshot Standards

- All production volumes must have automated nightly snapshots.
- Snapshots must be retained for 30 days minimum.
- Snapshot jobs defined in the Argo Workflows calendar: `workflows/argo/templates/snapshot-volumes.yaml`

## See Also

- Terraform module: `terraform/modules/storage/`
- Ansible role for mount/format: `ansible/roles/storage-mount/`
