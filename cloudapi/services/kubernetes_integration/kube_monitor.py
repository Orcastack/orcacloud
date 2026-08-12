"""
Kubernetes Monitor Service
──────────────────────────
Queries the cluster for workloads, pods, networking, and events
scoped to a project's namespace.

Falls back to rich mock data when kubectl is unavailable,
so the dashboard is always usable in development.
"""

import subprocess
import json
import logging
from datetime import datetime, timezone, timedelta
import random

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Kubectl helper
# ─────────────────────────────────────────────────────────────────────────────

def _kubectl_get(resource: str, namespace: str,
                 kubeconfig: str | None = None) -> list[dict]:
    """Run `kubectl get <resource> -n <ns> -o json` and return items list."""
    cmd = ['kubectl', 'get', resource, '-n', namespace, '-o', 'json']
    if kubeconfig:
        cmd = ['kubectl', '--kubeconfig', kubeconfig] + cmd[1:]
    try:
        result = subprocess.run(cmd, capture_output=True, timeout=30, check=True)
        data = json.loads(result.stdout)
        return data.get('items', [])
    except Exception as exc:
        logger.debug('kubectl get %s failed: %s', resource, exc)
        return []


# ─────────────────────────────────────────────────────────────────────────────
# Formatters (raw k8s object → clean dict)
# ─────────────────────────────────────────────────────────────────────────────

def _fmt_deployment(d: dict) -> dict:
    spec   = d.get('spec', {})
    status = d.get('status', {})
    meta   = d.get('metadata', {})
    ready  = status.get('readyReplicas', 0) or 0
    desired = spec.get('replicas', 1) or 1
    return {
        'name':      meta.get('name', ''),
        'namespace': meta.get('namespace', ''),
        'replicas':  desired,
        'ready':     ready,
        'available': status.get('availableReplicas', 0) or 0,
        'health':    'healthy' if ready >= desired else 'degraded',
        'age':       _age(meta.get('creationTimestamp')),
    }


def _fmt_pod(p: dict) -> dict:
    meta   = p.get('metadata', {})
    spec   = p.get('spec', {})
    status = p.get('status', {})
    containers = status.get('containerStatuses', [])
    restarts = sum(c.get('restartCount', 0) for c in containers)
    return {
        'name':      meta.get('name', ''),
        'namespace': meta.get('namespace', ''),
        'status':    status.get('phase', 'Unknown'),
        'restarts':  restarts,
        'node':      spec.get('nodeName', ''),
        'age':       _age(meta.get('creationTimestamp')),
        'ready':     all(c.get('ready', False) for c in containers),
    }


def _fmt_service(s: dict) -> dict:
    meta = s.get('metadata', {})
    spec = s.get('spec', {})
    return {
        'name':       meta.get('name', ''),
        'namespace':  meta.get('namespace', ''),
        'type':       spec.get('type', 'ClusterIP'),
        'cluster_ip': spec.get('clusterIP', ''),
        'ports':      [f"{p.get('port')}/{p.get('protocol','TCP')}"
                       for p in spec.get('ports', [])],
        'age':        _age(meta.get('creationTimestamp')),
    }


def _fmt_ingress(i: dict) -> dict:
    meta   = i.get('metadata', {})
    spec   = i.get('spec', {})
    status = i.get('status', {})
    rules  = spec.get('rules', [])
    hosts  = [r.get('host', '') for r in rules]
    tls    = bool(spec.get('tls'))
    lb     = status.get('loadBalancer', {}).get('ingress', [])
    ip     = lb[0].get('ip', '') if lb else ''
    return {
        'name':      meta.get('name', ''),
        'namespace': meta.get('namespace', ''),
        'hosts':     hosts,
        'tls':       tls,
        'address':   ip,
        'age':       _age(meta.get('creationTimestamp')),
    }


def _fmt_event(e: dict) -> dict:
    meta = e.get('metadata', {})
    return {
        'name':      meta.get('name', ''),
        'namespace': meta.get('namespace', ''),
        'reason':    e.get('reason', ''),
        'message':   e.get('message', ''),
        'type':      e.get('type', 'Normal'),
        'count':     e.get('count', 1),
        'age':       _age(e.get('lastTimestamp') or meta.get('creationTimestamp')),
        'object':    (e.get('involvedObject') or {}).get('name', ''),
    }


def _age(ts: str | None) -> str:
    if not ts:
        return 'unknown'
    try:
        created = datetime.fromisoformat(ts.replace('Z', '+00:00'))
        delta   = datetime.now(timezone.utc) - created
        days    = delta.days
        hours   = delta.seconds // 3600
        mins    = (delta.seconds % 3600) // 60
        if days > 0:
            return f'{days}d'
        if hours > 0:
            return f'{hours}h'
        return f'{mins}m'
    except Exception:
        return ts


# ─────────────────────────────────────────────────────────────────────────────
# Mock data (development / disconnected mode)
# ─────────────────────────────────────────────────────────────────────────────

def _mock_monitor(namespace: str) -> dict:
    names = ['api-server', 'worker', 'scheduler', 'frontend', 'cache']
    return {
        'namespace': namespace,
        'workloads': {
            'deployments': [
                {'name': n, 'namespace': namespace, 'replicas': 3,
                 'ready': random.randint(1, 3), 'available': 3,
                 'health': 'healthy', 'age': f'{random.randint(1,30)}d'}
                for n in names
            ],
            'statefulsets': [
                {'name': 'postgres', 'namespace': namespace, 'replicas': 1,
                 'ready': 1, 'available': 1, 'health': 'healthy', 'age': '14d'}
            ],
            'daemonsets': [],
            'jobs': [],
            'cronjobs': [
                {'name': 'cleanup-job', 'namespace': namespace, 'schedule': '0 3 * * *',
                 'last_run': '2h', 'last_status': 'success', 'age': '7d'}
            ],
        },
        'pods': [
            {'name': f'{n}-{uuid_suffix()}', 'namespace': namespace,
             'status': 'Running', 'restarts': random.randint(0, 3),
             'node': f'node-{random.randint(1,4)}',
             'age': f'{random.randint(1,24)}h', 'ready': True}
            for n in names
        ],
        'networking': {
            'services': [
                {'name': n, 'namespace': namespace, 'type': 'ClusterIP',
                 'cluster_ip': f'10.96.{random.randint(1,254)}.{random.randint(1,254)}',
                 'ports': ['80/TCP'], 'age': f'{random.randint(1,30)}d'}
                for n in names[:3]
            ],
            'ingresses': [
                {'name': 'main-ingress', 'namespace': namespace,
                 'hosts': [f'{namespace}.orcacloud.dev'],
                 'tls': True, 'address': '203.0.113.10', 'age': '30d'}
            ],
        },
        'events': [
            {'name': f'evt-{uuid_suffix()}', 'namespace': namespace,
             'reason': 'Scheduled', 'message': f'Successfully assigned {namespace}/{n}-pod',
             'type': 'Normal', 'count': 1, 'age': f'{random.randint(1,60)}m', 'object': f'{n}-pod'}
            for n in names[:3]
        ] + [
            {'name': f'evt-warn-{uuid_suffix()}', 'namespace': namespace,
             'reason': 'BackOff', 'message': 'Back-off restarting failed container',
             'type': 'Warning', 'count': 3, 'age': '5m', 'object': 'worker-pod'}
        ],
        'health': {
            'status': 'healthy',
            'ready_pods': len(names),
            'total_pods': len(names),
            'warnings': 1,
        },
    }


def uuid_suffix():
    import uuid
    return uuid.uuid4().hex[:6]


# ─────────────────────────────────────────────────────────────────────────────
# Public entry point
# ─────────────────────────────────────────────────────────────────────────────

def get_monitor_data(namespace: str, kubeconfig: str | None = None) -> dict:
    """
    Fetch live monitor data for the given namespace.
    Falls back to mock data when kubectl is unavailable.
    """
    # Try live
    deployments = _kubectl_get('deployments', namespace, kubeconfig)
    if not deployments and not _kubectl_get('pods', namespace, kubeconfig):
        logger.info('kubectl unavailable or empty ns — returning mock data for %s', namespace)
        return _mock_monitor(namespace)

    pods       = _kubectl_get('pods',       namespace, kubeconfig)
    services   = _kubectl_get('services',   namespace, kubeconfig)
    ingresses  = _kubectl_get('ingresses',  namespace, kubeconfig)
    stateful   = _kubectl_get('statefulsets', namespace, kubeconfig)
    daemonsets = _kubectl_get('daemonsets', namespace, kubeconfig)
    jobs       = _kubectl_get('jobs',       namespace, kubeconfig)
    cronjobs   = _kubectl_get('cronjobs',   namespace, kubeconfig)
    events     = _kubectl_get('events',     namespace, kubeconfig)

    all_pods_parsed = [_fmt_pod(p) for p in pods]
    ready_pods = sum(1 for p in all_pods_parsed if p['ready'])
    warn_events = sum(1 for e in events if e.get('type') == 'Warning')

    return {
        'namespace': namespace,
        'workloads': {
            'deployments': [_fmt_deployment(d) for d in deployments],
            'statefulsets': [_fmt_deployment(d) for d in stateful],
            'daemonsets':   [_fmt_deployment(d) for d in daemonsets],
            'jobs':         [_fmt_deployment(d) for d in jobs],
            'cronjobs':     [_fmt_deployment(d) for d in cronjobs],
        },
        'pods': all_pods_parsed,
        'networking': {
            'services':  [_fmt_service(s) for s in services],
            'ingresses': [_fmt_ingress(i) for i in ingresses],
        },
        'events': [_fmt_event(e) for e in events],
        'health': {
            'status':     'healthy' if ready_pods == len(pods) else 'degraded',
            'ready_pods': ready_pods,
            'total_pods': len(pods),
            'warnings':   warn_events,
        },
    }
