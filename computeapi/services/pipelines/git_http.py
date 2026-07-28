"""
git-http-backend Django view.

Proxies smart HTTP Git protocol requests to the system `git http-backend` CGI.
Supports both read (clone/fetch) and write (push) operations.

Authentication:
  - Bearer token  (Authorization: Bearer <token>)
  - Basic auth    (Authorization: Basic base64(username:token))

Authorization:
  - Public repos  → read-only without auth
  - Private/team  → requires authenticated user who is project member or owner
  - Push          → always requires auth, requires write permission
"""

import base64
import os
import subprocess
from django.conf import settings
from django.http import StreamingHttpResponse, HttpResponse
from rest_framework.authtoken.models import Token


# ---------------------------------------------------------------------------
# Configuration helpers
# ---------------------------------------------------------------------------

REPOS_ROOT = getattr(settings, 'GIT_REPOS_ROOT', '/repos')


def _authenticate_request(request):
    """Return (user, error_response) from Authorization header."""
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    if not auth_header:
        return None, None  # anonymous

    if auth_header.lower().startswith('bearer '):
        token_key = auth_header[7:].strip()
        try:
            token_obj = Token.objects.select_related('user').get(key=token_key)
            return token_obj.user, None
        except Token.DoesNotExist:
            return None, HttpResponse('Unauthorized', status=401)

    if auth_header.lower().startswith('basic '):
        try:
            decoded = base64.b64decode(auth_header[6:]).decode('utf-8')
            _username, token_key = decoded.split(':', 1)
            token_obj = Token.objects.select_related('user').get(key=token_key)
            return token_obj.user, None
        except Exception:
            return None, HttpResponse('Unauthorized', status=401)

    return None, HttpResponse('Unsupported auth scheme', status=400)


def _resolve_repo(ns, repo):
    """
    Find the Repository object for namespace/repo.git path.
    Namespace is either a project_key or a username.
    """
    from .models import Repository
    from django.contrib.auth.models import User

    name = repo.removesuffix('.git')

    # Try project namespace first
    qs = Repository.objects.select_related('project', 'owner').filter(repo_name=name)

    # project_key match
    repo_obj = qs.filter(project__project_key=ns).first()
    if repo_obj:
        return repo_obj

    # owner username match
    repo_obj = qs.filter(owner__username=ns).first()
    if repo_obj:
        return repo_obj

    return None


def _check_authorization(repo_obj, user, is_write):
    """Return None if allowed, else HttpResponse with error."""
    visibility = getattr(repo_obj, 'visibility', 'private')

    if is_write:
        # Push always requires auth
        if user is None:
            return HttpResponse(
                'Authentication required for push',
                status=401,
                headers={'WWW-Authenticate': 'Basic realm="OrcaCloud Git"'},
            )
        # Must be owner or project member
        if repo_obj.owner and repo_obj.owner == user:
            return None
        if repo_obj.project and repo_obj.project.owner == user:
            return None
        return HttpResponse('Forbidden', status=403)

    # Read
    if visibility == 'public':
        return None  # anyone can read

    # private or team → must be authenticated
    if user is None:
        return HttpResponse(
            'Authentication required',
            status=401,
            headers={'WWW-Authenticate': 'Basic realm="OrcaCloud Git"'},
        )
    if repo_obj.owner and repo_obj.owner == user:
        return None
    if repo_obj.project and repo_obj.project.owner == user:
        return None
    return HttpResponse('Forbidden', status=403)


# ---------------------------------------------------------------------------
# Main view
# ---------------------------------------------------------------------------

def git_http_backend_view(request, repo_path):
    """
    Entry point for all Git smart-HTTP requests.

    URL pattern (in orcacloud/urls.py):
        re_path(r'^repos/(?P<repo_path>.+)$', git_http_backend_view)

    Examples:
        GET  /repos/myproject/myrepo.git/info/refs?service=git-upload-pack
        POST /repos/myproject/myrepo.git/git-upload-pack
        POST /repos/myproject/myrepo.git/git-receive-pack
    """
    # Parse namespace and repo name from path
    # Expected format: <namespace>/<repo>.git[/<rest>]
    parts = repo_path.split('/')
    if len(parts) < 2:
        return HttpResponse('Not Found', status=404)

    ns       = parts[0]
    repo_raw = parts[1]                         # e.g. "myrepo.git"
    path_info = '/' + '/'.join(parts[1:])       # e.g. "/myrepo.git/info/refs"

    # Detect write operation
    is_write = (
        request.method == 'POST'
        and ('git-receive-pack' in repo_path)
    )

    # Authenticate
    user, auth_err = _authenticate_request(request)
    if auth_err:
        return auth_err

    # Resolve repository
    repo_obj = _resolve_repo(ns, repo_raw)
    if repo_obj is None:
        return HttpResponse('Repository not found', status=404)

    # Authorize
    authz_err = _check_authorization(repo_obj, user, is_write)
    if authz_err:
        return authz_err

    # Determine disk path
    disk_path = repo_obj.disk_path
    if not disk_path or not os.path.isdir(disk_path):
        return HttpResponse('Repository storage not found', status=404)

    # Build git-http-backend environment
    env = os.environ.copy()
    env.update({
        'GIT_PROJECT_ROOT':   REPOS_ROOT,
        'GIT_HTTP_EXPORT_ALL': '1',
        'PATH_INFO':          path_info,
        'REQUEST_METHOD':     request.method,
        'CONTENT_TYPE':       request.content_type or '',
        'QUERY_STRING':       request.META.get('QUERY_STRING', ''),
        'GIT_DIR':            disk_path,
        'REMOTE_USER':        user.username if user else '',
    })
    if 'CONTENT_LENGTH' in request.META:
        env['CONTENT_LENGTH'] = request.META['CONTENT_LENGTH']

    # Spawn git-http-backend
    git_backend = shutil_which('git') or 'git'
    try:
        proc = subprocess.Popen(
            [git_backend, 'http-backend'],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=env,
        )
    except FileNotFoundError:
        return HttpResponse('git not installed on server', status=500)

    body = request.body if request.method == 'POST' else b''
    stdout_data, stderr_data = proc.communicate(input=body, timeout=120)

    if proc.returncode != 0:
        return HttpResponse(
            f'git http-backend error: {stderr_data.decode(errors="replace")}',
            status=500,
        )

    # Parse CGI-style headers from stdout
    header_end = stdout_data.find(b'\r\n\r\n')
    if header_end == -1:
        header_end = stdout_data.find(b'\n\n')
        sep_len = 2
    else:
        sep_len = 4

    raw_headers = stdout_data[:header_end].decode(errors='replace')
    body_data   = stdout_data[header_end + sep_len:]

    response = HttpResponse(content=body_data)
    for line in raw_headers.splitlines():
        if ':' in line:
            key, _, val = line.partition(':')
            k = key.strip()
            v = val.strip()
            if k.lower() == 'status':
                try:
                    response.status_code = int(v.split()[0])
                except (ValueError, IndexError):
                    pass
            else:
                response[k] = v

    return response


def shutil_which(name):
    """Cross-platform which."""
    import shutil
    return shutil.which(name)
