"""
Kubernetes Apply Service
─────────────────────────
Applies selected manifest files to the target cluster, enforcing namespace
and recording results in a KubeSyncRun.

In a production cluster this invokes `kubectl` (or the Python kubernetes
client).  The logic is cleanly abstracted so the client lib can be swapped
without touching the views.
"""

import os
import subprocess
import logging
from datetime import datetime, timezone

from django.utils import timezone as dj_tz

from .models import KubeConfig, KubeSyncRun
from .manifest_parser import parse_manifest_file, build_summary

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Namespace injection helper
# ─────────────────────────────────────────────────────────────────────────────

def _inject_namespace(content: str, namespace: str) -> str:
    """
    Ensure every document in a YAML file has the project namespace.
    Uses string replacement on the metadata block — keeps it dependency-free.
    """
    import re
    # If namespace is already set leave it alone to avoid double-writing
    if f'namespace: {namespace}' in content:
        return content
    # Inject after 'metadata:' for each doc block
    result = re.sub(
        r'(metadata:\s*\n)',
        f'\\1  namespace: {namespace}\n',
        content
    )
    return result


# ─────────────────────────────────────────────────────────────────────────────
# Ensure namespace exists
# ─────────────────────────────────────────────────────────────────────────────

def _ensure_namespace(namespace: str, kubeconfig_path: str | None = None) -> str:
    """Create the namespace if it does not exist, returns log line."""
    ns_manifest = (
        f'apiVersion: v1\nkind: Namespace\nmetadata:\n  name: {namespace}\n'
    )
    cmd = ['kubectl', 'apply', '-f', '-']
    if kubeconfig_path:
        cmd = ['kubectl', '--kubeconfig', kubeconfig_path] + cmd[1:]
    try:
        result = subprocess.run(
            cmd, input=ns_manifest.encode(), capture_output=True, timeout=30, check=True
        )
        return result.stdout.decode(errors='replace').strip()
    except Exception as exc:
        return f'[warn] namespace ensure failed: {exc}'


# ─────────────────────────────────────────────────────────────────────────────
# Apply a single file
# ─────────────────────────────────────────────────────────────────────────────

def _kubectl_apply(file_path: str, namespace: str,
                   kubeconfig_path: str | None = None,
                   dry_run: bool = False) -> tuple[bool, str]:
    """
    Apply a single YAML file.  Returns (success, log_output).
    """
    cmd = ['kubectl', 'apply', '-f', file_path, '--namespace', namespace]
    if dry_run:
        cmd += ['--dry-run=client']
    if kubeconfig_path:
        cmd = ['kubectl', '--kubeconfig', kubeconfig_path] + cmd[1:]
    try:
        result = subprocess.run(cmd, capture_output=True, timeout=120, check=True)
        return True, result.stdout.decode(errors='replace').strip()
    except subprocess.CalledProcessError as exc:
        return False, exc.stderr.decode(errors='replace').strip()
    except FileNotFoundError:
        return False, 'kubectl binary not found — please install kubectl'
    except Exception as exc:
        return False, str(exc)


# ─────────────────────────────────────────────────────────────────────────────
# Public entry point
# ─────────────────────────────────────────────────────────────────────────────

def execute_apply(
    kube_config: KubeConfig,
    workdir: str,
    selected_files: list[str],
    commit_sha: str,
    triggered_by: str = 'manual',
    dry_run: bool = False,
) -> KubeSyncRun:
    """
    Apply each selected YAML file to the cluster.

    1. Create a KubeSyncRun record.
    2. Ensure the project namespace exists.
    3. For each file: inject namespace, apply to cluster, record result.
    4. Update KubeSyncRun and KubeConfig state.

    Returns the completed KubeSyncRun.
    """
    namespace = kube_config.derive_namespace()

    sync_run = KubeSyncRun.objects.create(
        kube_config     = kube_config,
        run_type        = 'apply',
        triggered_by    = triggered_by,
        commit_sha      = commit_sha,
        branch          = kube_config.git_branch,
        files_selected  = selected_files,
        status          = 'running',
    )

    log_lines:        list[str]  = []
    files_applied:    list[str]  = []
    resources_created: list[dict] = []
    governance_issues: list[str]  = []
    has_errors = False

    # Ensure namespace
    ns_log = _ensure_namespace(namespace)
    log_lines.append(f'[namespace] {ns_log}')

    for rel_path in selected_files:
        abs_path = os.path.join(workdir, rel_path)
        if not os.path.isfile(abs_path):
            log_lines.append(f'[skip] {rel_path} — file not found in workdir')
            has_errors = True
            continue

        # Read, inject namespace
        with open(abs_path, 'r', encoding='utf-8', errors='replace') as fh:
            content = fh.read()

        # Governance scan before apply
        parsed = parse_manifest_file(content, rel_path)
        governance_issues.extend(parsed.get('warnings', []))

        patched = _inject_namespace(content, namespace)

        # Write patched content to a temp file
        import tempfile, os as _os
        with tempfile.NamedTemporaryFile(
            mode='w', suffix='.yaml', delete=False, dir=workdir
        ) as tmp:
            tmp.write(patched)
            tmp_path = tmp.name

        try:
            ok, out = _kubectl_apply(tmp_path, namespace, dry_run=dry_run)
        finally:
            _os.unlink(tmp_path)

        log_lines.append(f'[{"ok" if ok else "err"}] {rel_path}: {out}')

        if ok:
            files_applied.append(rel_path)
            for r in parsed.get('resources', []):
                resources_created.append(r)
        else:
            has_errors = True

    # Determine final status
    if not has_errors:
        final_status = 'success'
    elif files_applied:
        final_status = 'partial'
    else:
        final_status = 'failed'

    # Update sync run
    sync_run.files_applied    = files_applied
    sync_run.resources_created = resources_created
    sync_run.governance_issues = governance_issues
    sync_run.logs             = '\n'.join(log_lines)
    sync_run.status           = final_status
    sync_run.finished_at      = dj_tz.now()
    sync_run.save()

    # Update config
    kube_config.last_commit      = commit_sha
    kube_config.last_sync_status = final_status
    kube_config.last_synced_at   = dj_tz.now()
    kube_config.governance_warnings = governance_issues
    kube_config.save(update_fields=[
        'last_commit', 'last_sync_status', 'last_synced_at',
        'governance_warnings', 'updated_at',
    ])

    return sync_run
