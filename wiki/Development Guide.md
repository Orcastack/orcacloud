# Development Guide

## Codebase Orientation

| Area | Responsibility |
| --- | --- |
| `cloudapi/` | Django API, orchestration, provider integrations, backend tests |
| `webapp/` and dashboard apps | React user interfaces and API clients |
| `openstack/`, `networking/`, `identity/` | Infrastructure and provider integration assets |
| `terraform/`, `ansible/`, `k8s/`, `helm/` | Declarative infrastructure and configuration management |
| `monitoring/`, `workflows/`, `serverless/`, `gitops/` | Observability, automation, serverless, and GitOps definitions |
| `docs/` and `wiki/` | Detailed documentation and curated project narrative |

## Coding Standards

- Keep API operations workspace-aware; resolve workspace and environment before provider calls.
- Prefer small, focused changes that preserve module boundaries.
- Keep secrets out of source control and examples.
- Treat infrastructure configuration as code and review it like application code.
- Pin GitHub Actions to full commit SHAs.
- Use Node 24 for project-controlled JavaScript runtimes.

## Contribution Workflow

1. Create a focused branch from `main`.
2. Make the smallest change that addresses the issue or feature.
3. Add or update tests appropriate to the behavior changed.
4. Update architecture, runbook, or Wiki pages when the public developer contract changes.
5. Open a pull request and use CI results as the required feedback loop.

## Testing Strategy

| Layer | Expected validation |
| --- | --- |
| Backend | Django migrations, unit/integration tests, coverage, static checks |
| Frontend | Dependency install, tests, coverage, lint, and type checks |
| Images | Reproducible multi-architecture builds |
| Infrastructure | Terraform validation, policy/security scanning, and targeted environment checks |
| Workflows | YAML linting and immutable action pins |

## Branching and Delivery

`main` represents the production delivery line. `develop` is the development deployment line. Pull requests validate changes before either branch's deployment behavior runs.

See [[Modules and Components]] and [[Project Philosophy]] for design constraints.
