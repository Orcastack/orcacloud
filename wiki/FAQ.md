# FAQ

## Is OrcaCloud an OpenStack distribution?

No. OrcaCloud is a platform and orchestration layer that integrates with OpenStack services and infrastructure automation assets.

## How does OrcaCloud keep tenants separate?

The application resolves a workspace binding that identifies the intended OpenStack project, region, quotas, and policy context before performing a provider operation.

## Does every developer need to understand every infrastructure component?

No. Developers should understand the API and workspace model relevant to their feature. Platform engineers own deeper provider, network, storage, and capacity concerns.

## Is Kubernetes required for every deployment?

No. The repository contains Kubernetes and GitOps assets, while the current application production delivery path uses a Docker-host deployment. The platform architecture supports multiple execution environments.

## Why are GitHub Actions pinned to commit SHAs?

Immutable pins reduce supply-chain risk and satisfy the repository's action-pinning policy.

## Where do I find deployment or incident instructions?

The detailed operational material is in the supporting pages [[CI and CD]], [[Operations]], and the repository `docs/runbooks/` directory.

## Are roadmap dates commitments?

No. The [[Roadmap]] expresses direction and is not a release contract.