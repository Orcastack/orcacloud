# Project Philosophy

## Why OrcaCloud Exists

OrcaCloud exists to make infrastructure capability easier to consume without hiding the controls that make cloud environments safe, auditable, and operable. It treats cloud operations as a software design problem: clear boundaries, version-controlled intent, scoped authority, and observable outcomes.

## Guiding Principles

### Tenant Context Is Mandatory

Every production infrastructure operation should be tied to a workspace, environment, project, and region. Convenience APIs that bypass tenant context create hidden risk.

### Declarative Changes Beat Manual Drift

Terraform, Ansible, Kubernetes manifests, Helm, GitOps, and workflow definitions make infrastructure behavior reviewable and repeatable.

### Security Is an Architecture Concern

Identity, least privilege, network policy, secret management, audit records, and immutable delivery artifacts are design constraints rather than afterthoughts.

### Observability Enables Autonomy

Automation earns trust only when teams can see its inputs, outputs, health, and failure modes through metrics, logs, traces, alerts, and runbooks.

### Platform Boundaries Should Absorb Provider Complexity

The API and service layers should offer stable concepts to clients while OpenStack, Kubernetes, network, and storage differences remain behind intentional integration boundaries.

### Documentation Is Part of the Product

Architecture explanations, workflows, runbooks, and the Wiki evolve with the codebase. A feature is not complete when only its implementation changes.

Continue with [[Development Guide]] for the practical application of these principles.
