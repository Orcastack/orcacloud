# Glance – Image Registry

All VM images used across OrcaCloud are versioned and published through Glance.

## Naming Convention

```
ax-<os>-<version>-<arch>-<yyyymm>
```

Examples:
- `ax-ubuntu-2204-amd64-202602`
- `ax-debian-12-amd64-202602`
- `ax-alpine-318-amd64-202602`

## Base Image Requirements

All base images must include:
- `cloud-init` (for Nova user-data)
- `qemu-guest-agent`
- `node_exporter` (Prometheus metrics — port 9100)
- `orcacloud-cloud-agent` (custom, for lifecycle hooks)

## Image Lifecycle

1. Build with Packer → `images/packer/`
2. Upload to Glance via CI pipeline → `.github/workflows/image-build.yml`
3. Tag with `ax:stable` once validated
4. Retire images older than 6 months

## Kubernetes Node Images

Pre-built images for kubeadm-based clusters:
- `ax-k8s-node-1.29-amd64-202602`
