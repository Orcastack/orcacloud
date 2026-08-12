"""
Git Service
───────────
Responsible for cloning / fetching a Git repository and listing YAML files
under a configured path.

In a production deployment this would use a real Git library (GitPython or
shell calls to git).  Here we wrap everything with a clean interface so the
rest of the platform stays decoupled from the VCS implementation.
"""

import os
import re
import subprocess
import tempfile
import logging

logger = logging.getLogger(__name__)


class GitServiceError(Exception):
    pass


class GitService:
    """Clone a repository at a given commit/branch and expose its contents."""

    def __init__(self, provider: str, repo: str, branch: str, path: str,
                 access_token: str = ''):
        """
        provider    – 'github' | 'gitlab' | 'bitbucket' | 'other'
        repo        – 'owner/repo-name'
        branch      – branch name
        path        – subdirectory inside repo to search (e.g. 'k8s/')
        access_token – optional PAT for private repos
        """
        self.provider     = provider
        self.repo         = repo
        self.branch       = branch
        self.path         = path.strip('/')
        self.access_token = access_token
        self._workdir: str | None = None

    # ── Public API ────────────────────────────────────────────────────────────

    def clone(self) -> str:
        """
        Clone the repository into a temporary directory.
        Returns the absolute path to the cloned directory.
        """
        clone_url = self._build_clone_url()
        self._workdir = tempfile.mkdtemp(prefix='orcacloud_kube_')
        try:
            subprocess.run(
                ['git', 'clone', '--depth', '1', '--branch', self.branch,
                 clone_url, self._workdir],
                check=True,
                capture_output=True,
                timeout=120,
            )
        except subprocess.CalledProcessError as exc:
            raise GitServiceError(
                f'git clone failed: {exc.stderr.decode(errors="replace")}'
            ) from exc
        except FileNotFoundError:
            raise GitServiceError('git binary not found on PATH')
        logger.info('Cloned %s@%s into %s', self.repo, self.branch, self._workdir)
        return self._workdir

    def get_current_commit(self) -> str:
        """Return the HEAD commit SHA of the cloned repo."""
        if not self._workdir:
            return ''
        try:
            result = subprocess.run(
                ['git', '-C', self._workdir, 'rev-parse', 'HEAD'],
                capture_output=True, text=True, check=True, timeout=10
            )
            return result.stdout.strip()
        except subprocess.CalledProcessError:
            return 'unknown'

    def list_yaml_files(self) -> list[str]:
        """
        Walk the configured sub-path inside the cloned repo and return
        all .yaml / .yml file paths (relative to repo root).
        """
        if not self._workdir:
            raise GitServiceError('Repository not cloned yet — call clone() first')
        target = os.path.join(self._workdir, self.path) if self.path else self._workdir
        if not os.path.isdir(target):
            logger.warning('Path %s not found in repo — falling back to root', self.path)
            target = self._workdir

        yaml_files = []
        for root, _dirs, files in os.walk(target):
            for fname in files:
                if fname.endswith(('.yaml', '.yml')):
                    full = os.path.join(root, fname)
                    rel  = os.path.relpath(full, self._workdir)
                    yaml_files.append(rel)
        return sorted(yaml_files)

    def read_file(self, relative_path: str) -> str:
        """Read a file from the cloned repo by its relative path."""
        if not self._workdir:
            raise GitServiceError('Repository not cloned yet')
        abs_path = os.path.join(self._workdir, relative_path)
        with open(abs_path, 'r', encoding='utf-8', errors='replace') as fh:
            return fh.read()

    def cleanup(self):
        """Remove the temporary clone directory."""
        import shutil
        if self._workdir and os.path.isdir(self._workdir):
            shutil.rmtree(self._workdir, ignore_errors=True)
            self._workdir = None

    # ── Private helpers ───────────────────────────────────────────────────────

    def _build_clone_url(self) -> str:
        base_map = {
            'github':    'https://github.com',
            'gitlab':    'https://gitlab.com',
            'bitbucket': 'https://bitbucket.org',
        }
        base = base_map.get(self.provider, 'https://github.com')
        if self.access_token:
            # embed token for HTTPS auth
            proto, host = base.split('://')
            return f'{proto}://oauth2:{self.access_token}@{host}/{self.repo}.git'
        return f'{base}/{self.repo}.git'
