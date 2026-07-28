# Serverless – Knative + OpenFaaS

The OrcaCloud serverless layer runs on top of **Kubernetes**, not directly on OpenStack. Equivalent to AWS Lambda / GCP Cloud Run.

## Architecture

```
Developer pushes function code
          │
    Git → CI pipeline (builds OCI image)
          │
    Pushes to GHCR / internal registry
          │
    Knative Serving / OpenFaaS deploys function
          │
  ┌────────────────────────────────────────┐
  │  Kubernetes Cluster                    │
  │  ┌──────────────────────────────────┐  │
  │  │  Knative Serving                 │  │
  │  │  • HTTP-triggered functions      │  │
  │  │  • Scale-to-zero autoscaling     │  │
  │  │  • KPA (Knative Pod Autoscaler)  │  │
  │  └──────────────────────────────────┘  │
  │  ┌──────────────────────────────────┐  │
  │  │  Knative Eventing                │  │
  │  │  • Event-triggered functions     │  │
  │  │  • CloudEvents standard          │  │
  │  │  • RabbitMQ / Kafka sources      │  │
  │  └──────────────────────────────────┘  │
  └────────────────────────────────────────┘
          │
    Prometheus → metrics from Knative
```

## Rules

1. **Functions run inside Kubernetes namespaces** — one namespace per team/project.
2. **Autoscaling uses Prometheus metrics** (KPA + custom metrics).
3. **Function logs shipped centrally** via Fluentd/Loki.
4. **All function deployments are GitOps-based** — no manual `kubectl apply`.
5. **Scale-to-zero** is enabled for all non-critical functions.
6. **No hardcoded secrets** — use Kubernetes Secrets mounted as env vars.

## Subfolders

- `knative/` — Knative Serving + Eventing installation manifests and configuration
- `openfaas/` — OpenFaaS stack (alternative runtime)
- `functions/` — Example function definitions and deployment templates

## Autoscaling Configuration

```yaml
autoscaling.knative.dev/initial-scale: "1"
autoscaling.knative.dev/min-scale: "0"
autoscaling.knative.dev/max-scale: "50"
autoscaling.knative.dev/metric: "rps"
autoscaling.knative.dev/target: "100"
```

## See Also

- Kubernetes layer: `k8s/`
- Workflows (event routing to functions): `workflows/`
- Networking (function isolation): `networking/calico/`
