# OrcaCloud – OpenStack Swift Service
# Wraps the openstacksdk / swiftclient for bucket & object operations.
# Falls back to mock responses when no OpenStack cluster is reachable so that
# the dashboard works in local dev without a full cluster.

import os
import hashlib
import hmac
import time
import logging
from datetime import datetime, timedelta
from urllib.parse import urlencode
from typing import Optional

import openstack
from openstack.exceptions import SDKException, ResourceNotFound

logger = logging.getLogger(__name__)

# ── Config from environment ───────────────────────────────────────────────────
OS_AUTH_URL    = os.environ.get('OS_AUTH_URL',    'http://localhost:5000/v3')
OS_USERNAME    = os.environ.get('OS_USERNAME',    'orcacloud')
OS_PASSWORD    = os.environ.get('OS_PASSWORD',    'changeme')
OS_PROJECT     = os.environ.get('OS_PROJECT_NAME','orcacloud')
OS_DOMAIN      = os.environ.get('OS_DOMAIN_NAME', 'Default')
OS_REGION      = os.environ.get('OS_REGION_NAME', 'us-east-1')
SWIFT_BASE_URL = os.environ.get('SWIFT_URL', 'https://storage.orcacloud.com/v1')
SWIFT_TEMP_KEY = os.environ.get('SWIFT_TEMP_KEY', 'atonix-temp-url-key')

# Storage-class → Swift policy mapping
POLICY_MAP = {
    'standard':            'hot',
    'standard-ia':         'cold',
    'intelligent-tiering': 'hot',
    'glacier':             'archive',
    'deep-archive':        'archive',
}

REGION_CHOICES = [
    ('af-south-1', 'Africa — Johannesburg'),
    ('eu-west-1',  'Europe — Frankfurt'),
    ('ap-south-1', 'Asia — Singapore'),
    ('us-east-1',  'US East — New York'),
    ('us-west-1',  'US West — Los Angeles'),
]


def _get_connection() -> Optional[openstack.connection.Connection]:
    """Return an authenticated OpenStack connection, or None if unavailable."""
    try:
        conn = openstack.connect(
            auth_url=OS_AUTH_URL,
            project_name=OS_PROJECT,
            username=OS_USERNAME,
            password=OS_PASSWORD,
            user_domain_name=OS_DOMAIN,
            project_domain_name=OS_DOMAIN,
            region_name=OS_REGION,
        )
        conn.authorize()
        return conn
    except Exception as exc:
        logger.warning('OpenStack connection failed: %s', exc)
        return None


# ── Swift Container (Bucket) Operations ───────────────────────────────────────

def create_swift_container(bucket_name: str, region: str = 'us-east-1',
                           storage_class: str = 'standard', public: bool = False) -> dict:
    """Create an OpenStack Swift container (S3 bucket equivalent)."""
    conn = _get_connection()
    if conn is None:
        return _mock_container(bucket_name, region, storage_class, 'active')

    try:
        policy = POLICY_MAP.get(storage_class, 'hot')
        headers = {
            'X-Storage-Policy': policy,
            'X-Container-Meta-Region': region,
        }
        if public:
            headers['X-Container-Read'] = '.r:*'

        conn.object_store.create_container(
            name=bucket_name,
            **headers,
        )
        return {
            'success': True,
            'bucket_name': bucket_name,
            'region': region,
            'storage_class': storage_class,
            'status': 'active',
            'endpoint': f'{SWIFT_BASE_URL}/{bucket_name}',
        }
    except SDKException as exc:
        logger.error('Swift create container error: %s', exc)
        return {'success': False, 'error': str(exc)}


def delete_swift_container(bucket_name: str) -> dict:
    """Delete an OpenStack Swift container and all its objects."""
    conn = _get_connection()
    if conn is None:
        return {'success': True, 'deleted': bucket_name, 'mock': True}

    try:
        # Delete all objects first
        for obj in conn.object_store.objects(container=bucket_name):
            conn.object_store.delete_object(obj, container=bucket_name)
        conn.object_store.delete_container(bucket_name)
        return {'success': True, 'deleted': bucket_name}
    except ResourceNotFound:
        return {'success': True, 'deleted': bucket_name, 'note': 'not found on Swift'}
    except SDKException as exc:
        logger.error('Swift delete container error: %s', exc)
        return {'success': False, 'error': str(exc)}


def get_swift_container_stats(bucket_name: str) -> dict:
    """Return object count and total bytes for a Swift container."""
    conn = _get_connection()
    if conn is None:
        return _mock_stats(bucket_name)

    try:
        container = conn.object_store.get_container_metadata(bucket_name)
        return {
            'object_count':  container.object_count or 0,
            'bytes_used':    container.bytes_used    or 0,
            'bytes_used_gb': round((container.bytes_used or 0) / (1024 ** 3), 4),
        }
    except SDKException as exc:
        logger.warning('Swift stats error: %s', exc)
        return _mock_stats(bucket_name)


def list_swift_objects(bucket_name: str, prefix: str = '', delimiter: str = '/',
                       limit: int = 1000) -> dict:
    """List objects in a Swift container (S3 ListObjects equivalent)."""
    conn = _get_connection()
    if conn is None:
        return {'objects': [], 'prefixes': [], 'mock': True}

    try:
        objects = []
        for obj in conn.object_store.objects(
            container=bucket_name,
            prefix=prefix or None,
            delimiter=delimiter or None,
            limit=limit,
        ):
            objects.append({
                'key':           obj.name,
                'size_bytes':    obj.content_length or 0,
                'etag':          obj.etag or '',
                'content_type':  obj.content_type or 'application/octet-stream',
                'last_modified': obj.last_modified_at,
                'storage_class': 'standard',
            })
        return {'objects': objects, 'count': len(objects)}
    except SDKException as exc:
        logger.error('Swift list objects error: %s', exc)
        return {'objects': [], 'error': str(exc)}


def upload_swift_object(bucket_name: str, object_key: str, data: bytes,
                        content_type: str = 'application/octet-stream',
                        metadata: dict = None) -> dict:
    """Upload an object to a Swift container."""
    conn = _get_connection()
    if conn is None:
        etag = hashlib.md5(data).hexdigest()
        return {'success': True, 'etag': etag, 'size_bytes': len(data), 'mock': True}

    try:
        headers = {}
        if metadata:
            for k, v in metadata.items():
                headers[f'X-Object-Meta-{k}'] = str(v)

        obj = conn.object_store.upload_object(
            container=bucket_name,
            name=object_key,
            data=data,
            content_type=content_type,
            **headers,
        )
        return {
            'success': True,
            'etag':       obj.etag or hashlib.md5(data).hexdigest(),
            'size_bytes': len(data),
        }
    except SDKException as exc:
        logger.error('Swift upload error: %s', exc)
        return {'success': False, 'error': str(exc)}


def delete_swift_object(bucket_name: str, object_key: str) -> dict:
    """Delete an object from a Swift container."""
    conn = _get_connection()
    if conn is None:
        return {'success': True, 'deleted': object_key, 'mock': True}

    try:
        conn.object_store.delete_object(object_key, container=bucket_name)
        return {'success': True, 'deleted': object_key}
    except ResourceNotFound:
        return {'success': True, 'deleted': object_key, 'note': 'already gone'}
    except SDKException as exc:
        return {'success': False, 'error': str(exc)}


# ── TempURL (Pre-Signed URL) ───────────────────────────────────────────────────

def generate_presigned_url(bucket_name: str, object_key: str,
                           expires_in: int = 3600,
                           method: str = 'GET') -> dict:
    """
    Generate a Swift TempURL (equivalent to AWS S3 presigned URL).
    Falls back to a signed mock URL in dev mode.
    """
    expires   = int(time.time()) + expires_in
    path      = f'/v1/{bucket_name}/{object_key}'
    base      = f'{SWIFT_BASE_URL}/{bucket_name}/{object_key}'

    sig = hmac.new(
        SWIFT_TEMP_KEY.encode('utf-8'),
        f'{method}\n{expires}\n{path}'.encode('utf-8'),
        hashlib.sha256,
    ).hexdigest()

    url = f'{base}?temp_url_sig={sig}&temp_url_expires={expires}'
    return {
        'url':        url,
        'expires_at': datetime.utcfromtimestamp(expires).isoformat() + 'Z',
        'method':     method,
        'object_key': object_key,
        'bucket':     bucket_name,
    }


# ── Lifecycle Rules ───────────────────────────────────────────────────────────

def apply_lifecycle_policy(bucket_name: str, rules: list) -> dict:
    """
    Write lifecycle rules to Swift container metadata.
    In production this drives a Celery worker that transitions objects.
    """
    conn = _get_connection()
    if conn is None:
        return {'success': True, 'rules_count': len(rules), 'mock': True}

    try:
        import json
        conn.object_store.set_container_metadata(
            bucket_name,
            metadata={'X-Container-Meta-Lifecycle': json.dumps(rules)},
        )
        return {'success': True, 'rules_count': len(rules)}
    except SDKException as exc:
        return {'success': False, 'error': str(exc)}


# ── Replication ───────────────────────────────────────────────────────────────

def replicate_container(source_bucket: str, target_region: str,
                        target_bucket: str = None) -> dict:
    """
    Configure cross-region replication for a Swift container.
    Uses container sync (Swift's built-in cross-cluster sync).
    """
    target_bucket = target_bucket or source_bucket
    sync_to = f'{SWIFT_BASE_URL.replace(OS_REGION, target_region)}/{target_bucket}'

    conn = _get_connection()
    if conn is None:
        return {
            'success':       True,
            'source':        source_bucket,
            'target':        target_bucket,
            'target_region': target_region,
            'sync_url':      sync_to,
            'mock':          True,
        }

    try:
        conn.object_store.set_container_metadata(
            source_bucket,
            metadata={'X-Container-Sync-To': sync_to},
        )
        return {
            'success':       True,
            'source':        source_bucket,
            'target':        target_bucket,
            'target_region': target_region,
            'sync_url':      sync_to,
        }
    except SDKException as exc:
        return {'success': False, 'error': str(exc)}


# ── Mock helpers ──────────────────────────────────────────────────────────────

def _mock_container(name, region, storage_class, status):
    return {
        'success':       True,
        'bucket_name':   name,
        'region':        region,
        'storage_class': storage_class,
        'status':        status,
        'endpoint':      f'https://storage.orcacloud.com/v1/{name}',
        'mock':          True,
    }


def _mock_stats(name):
    return {
        'object_count':  0,
        'bytes_used':    0,
        'bytes_used_gb': 0,
        'mock':          True,
    }
