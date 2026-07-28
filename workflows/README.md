# Workflows – Argo Workflows + n8n

The OrcaCloud workflow automation layer uses two engines, matching the AWS Step Functions + EventBridge pattern:

| Engine | Purpose | AWS Equivalent |
|--------|---------|----------------|
| **Argo Workflows** | Technical automation: CI/CD, infra ops, data pipelines | Step Functions + CodePipeline |
| **n8n** | Business automation: events, notifications, integrations | EventBridge + Lambda |

## Architecture

```
External Events (webhooks, cron, Kafka, RabbitMQ)
         │
    ┌────┴────────────────────────┐
    │                             │
  n8n                        Argo Workflows
  (business logic,            (technical pipelines:
   3rd-party integrations,     Terraform, deploys,
   Slack/email/tickets)        snapshot jobs)
    │                             │
    └───────────┬─────────────────┘
                │
    Calls OpenStack APIs / Kubernetes APIs
    Triggers Knative / serverless functions
                │
          Prometheus metrics
```

## Rules

1. **Argo Workflows runs inside Kubernetes** (`argo` namespace).
2. **n8n runs as a service** (Kubernetes Deployment or standalone VM).
3. **All workflows are version-controlled** as YAML template files.
4. **Both engines must call OpenStack/K8s APIs** using scoped service accounts (see `identity/`).
5. **Both engines are scraped by Prometheus** for metrics.
6. **No hardcoded credentials** in workflow definitions.

## Subfolders

- `argo/` — Argo Workflows templates, ClusterWorkflowTemplates, CronWorkflows
- `n8n/` — n8n workflow JSON exports and deployment config
- `templates/` — Shared event routing rules and reusable workflow templates
- `events/` — Event bus configuration (CloudEvents, RabbitMQ triggers)

## See Also

- Argo GitOps: `gitops/argocd/`
- Serverless triggers: `serverless/`
- Identity/service accounts: `identity/rbac/`
- n8n Kubernetes deployment: `k8s/`
