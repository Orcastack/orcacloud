"""
Manifest Parser
───────────────
Parses Kubernetes YAML files and:
• Extracts resource metadata (kind, name, namespace)
• Performs enterprise governance checks
  – Missing resource limits
  – Missing security context
  – 'latest' image tags
  – Missing liveness / readiness probes
  – Privileged containers
  – Missing namespace
"""

import re
import logging
from typing import Any

try:
    import yaml
    YAML_AVAILABLE = True
except ImportError:
    YAML_AVAILABLE = False

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Governance rule helpers
# ─────────────────────────────────────────────────────────────────────────────

def _check_container_governance(container: dict, resource_name: str) -> list[str]:
    issues = []
    cname = container.get('name', 'unknown')

    # Image tag policy
    image = container.get('image', '')
    if image.endswith(':latest') or (':' not in image):
        issues.append(
            f'{resource_name}/{cname}: image "{image}" uses ":latest" or has no explicit tag'
        )

    # Resource limits
    resources = container.get('resources', {})
    requests  = resources.get('requests', {})
    limits    = resources.get('limits', {})
    if not requests.get('cpu'):
        issues.append(f'{resource_name}/{cname}: missing resources.requests.cpu')
    if not requests.get('memory'):
        issues.append(f'{resource_name}/{cname}: missing resources.requests.memory')
    if not limits.get('cpu'):
        issues.append(f'{resource_name}/{cname}: missing resources.limits.cpu')
    if not limits.get('memory'):
        issues.append(f'{resource_name}/{cname}: missing resources.limits.memory')

    # Security context
    sc = container.get('securityContext', {})
    if not sc:
        issues.append(f'{resource_name}/{cname}: missing securityContext')
    else:
        if sc.get('privileged', False):
            issues.append(f'{resource_name}/{cname}: container is privileged')
        if not sc.get('runAsNonRoot'):
            issues.append(f'{resource_name}/{cname}: securityContext.runAsNonRoot not set')

    # Probes (only for non-init containers by convention)
    if not container.get('livenessProbe'):
        issues.append(f'{resource_name}/{cname}: missing livenessProbe')
    if not container.get('readinessProbe'):
        issues.append(f'{resource_name}/{cname}: missing readinessProbe')

    return issues


def _check_pod_spec_governance(pod_spec: dict, resource_name: str) -> list[str]:
    issues: list[str] = []
    containers = pod_spec.get('containers', [])
    for c in containers:
        issues.extend(_check_container_governance(c, resource_name))
    return issues


def _check_namespace(doc: dict, resource_name: str) -> list[str]:
    ns = (doc.get('metadata') or {}).get('namespace')
    if not ns:
        return [f'{resource_name}: metadata.namespace not set — namespace will be enforced at apply time']
    return []


# ─────────────────────────────────────────────────────────────────────────────
# Main parser
# ─────────────────────────────────────────────────────────────────────────────

WORKLOAD_KINDS = {'Deployment', 'StatefulSet', 'DaemonSet', 'Job', 'CronJob', 'ReplicaSet'}


def _get_pod_spec(doc: dict) -> dict | None:
    """Extract the pod spec from a workload document, regardless of kind."""
    kind = doc.get('kind', '')
    if kind == 'CronJob':
        return (
            doc.get('spec', {})
               .get('jobTemplate', {})
               .get('spec', {})
               .get('template', {})
               .get('spec', {})
        )
    if kind in WORKLOAD_KINDS:
        return (
            doc.get('spec', {})
               .get('template', {})
               .get('spec', {})
        )
    return None


def parse_manifest_file(content: str, file_path: str) -> dict:
    """
    Parse a YAML file that may contain multiple documents (separated by ---).

    Returns:
    {
        'path': str,
        'resources': [{'kind': str, 'name': str, 'namespace': str}],
        'warnings': [str],
    }
    """
    resources: list[dict] = []
    warnings:  list[str]  = []

    if not YAML_AVAILABLE:
        warnings.append(f'{file_path}: PyYAML not installed — cannot parse')
        return {'path': file_path, 'resources': resources, 'warnings': warnings}

    try:
        docs = list(yaml.safe_load_all(content))
    except yaml.YAMLError as exc:
        warnings.append(f'{file_path}: YAML parse error — {exc}')
        return {'path': file_path, 'resources': resources, 'warnings': warnings}

    for doc in docs:
        if not isinstance(doc, dict):
            continue
        kind      = doc.get('kind', 'Unknown')
        meta      = doc.get('metadata') or {}
        name      = meta.get('name', 'unnamed')
        namespace = meta.get('namespace', '')

        resources.append({'kind': kind, 'name': name, 'namespace': namespace})

        # Governance checks
        warnings.extend(_check_namespace(doc, f'{kind}/{name}'))
        pod_spec = _get_pod_spec(doc)
        if pod_spec:
            warnings.extend(_check_pod_spec_governance(pod_spec, f'{kind}/{name}'))

    return {'path': file_path, 'resources': resources, 'warnings': warnings}


def build_summary(parsed_files: list[dict]) -> dict:
    """
    Returns a dict like:
    {'Deployment': 3, 'Service': 2, 'Ingress': 1, 'total_warnings': 7}
    """
    counts: dict[str, int] = {}
    total_warnings = 0
    for pf in parsed_files:
        total_warnings += len(pf.get('warnings', []))
        for r in pf.get('resources', []):
            k = r.get('kind', 'Unknown')
            counts[k] = counts.get(k, 0) + 1
    counts['total_warnings'] = total_warnings
    return counts
