# CI and CD

## Workflow Overview

The primary delivery workflow is `.github/workflows/ci-cd.yml`.

| Stage | Trigger | Result |
| --- | --- | --- |
| Backend test | Push and pull request | Django migrations, tests, coverage, lint/security checks |
| Frontend test | Push and pull request | Dependency install, tests, coverage, lint/type checks |
| Security scan | Push and pull request | Trivy filesystem SARIF upload |
| Image build | Push to `main` or `develop` after tests | Multi-architecture GHCR images |
| Development deployment | Push to `develop` | Kubernetes development overlay deployment |
| Production deployment | Push to `main` | Docker Compose deployment on the configured production host |

## Image Publishing

The workflow builds both `cloudapi` and `webapp` images for `linux/amd64` and `linux/arm64`. QEMU is configured before Buildx so ARM64 builds can run on the GitHub-hosted runner.

Published tags include:

| Tag | Use |
| --- | --- |
| `main` or `develop` | Branch traceability |
| `sha-<full-commit-sha>` | Immutable production deployment and rollback |
| `latest` | Default branch convenience tag only |

Production always deploys `sha-<full-commit-sha>` tags.

## Action Supply Chain Policy

Every GitHub Action reference is pinned to a full commit SHA. Do not replace a SHA pin with a mutable action tag such as `@v3`; repository policy blocks unpinned actions.

## Required Permissions

| Job | Permission |
| --- | --- |
| Security scan | `security-events: write`, `contents: read` |
| Build and push | `contents: read`, `packages: write` |
| Production deploy | `contents: read`, `packages: read` |
| Wiki publication | `contents: write` |

## GitHub Wiki Publication

Wiki source pages live in `wiki/`. The `Publish GitHub Wiki` workflow copies them to the repository's `.wiki.git` repository when changes merge into `main` or when the workflow is dispatched manually. Enable the GitHub Wiki before the first run.

## Troubleshooting Builds

- **ARM64 build fails before a Dockerfile instruction:** confirm the QEMU setup step is present and SHA-pinned.
- **`npm@12` engine error on Node 20:** use the Node 22 builder and `npm ci`; do not add a fallback that installs npm 12 on Node 20.
- **ESLint warnings during CRA build:** they are warnings unless CI or project settings promote them to errors. Fix them separately from build platform failures.
- **GHCR pull fails on the host:** confirm package visibility and the job's `packages: read` permission.

See [[Production Deployment]] for the host-side deployment flow.
