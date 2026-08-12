# OrcaCloud Naming Standard

Use **OrcaCloud** in product-facing copy, titles, class names, and proper nouns. Use `orcacloud` for filenames, directories, packages, container images, Kubernetes resources, domains, environment variables, and configuration keys.

New components must use one of these canonical forms:

- Product name: `OrcaCloud`
- Filesystem, package, image, namespace, and resource name: `orcacloud`
- Environment-variable prefix: `ORCACLOUD_`
- SDK client type: `OrcaCloudClient`

Keep functional infrastructure terminology only where it describes a platform capability or an upstream provider API. Do not introduce alternate product identities, compatibility aliases, or legacy storage keys.

When renaming a deployable component, update its source path, build context, image reference, CI workflow, Kubernetes manifests, Helm chart, Terraform or Ansible resource identifiers, SDK package, and documentation in the same change.
