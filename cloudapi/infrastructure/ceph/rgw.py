# OrcaCloud – Ceph RADOS Gateway (RGW) Module
#
# Wraps S3-compatible object storage operations via boto3 pointed at Ceph RGW.
# Used for Swift-backed object storage in the Public and Hybrid cloud tiers.
#
# Requirements:
#   boto3 >= 1.34
#   RGW endpoint configured in settings: CEPH_RGW_ENDPOINT, CEPH_RGW_ACCESS_KEY,
#   CEPH_RGW_SECRET_KEY

import logging
import os
from typing import Any, BinaryIO

logger = logging.getLogger(__name__)


def _s3_client(endpoint: str | None = None, access_key: str | None = None, secret_key: str | None = None):
    """Return a boto3 S3 client pointed at the Ceph RGW endpoint."""
    try:
        import boto3
        from botocore.config import Config
    except ImportError as exc:
        raise RuntimeError("boto3 is not installed. Run: pip install boto3") from exc

    endpoint  = endpoint   or os.getenv("CEPH_RGW_ENDPOINT",   "http://localhost:8080")
    access_key = access_key or os.getenv("CEPH_RGW_ACCESS_KEY", "")
    secret_key = secret_key or os.getenv("CEPH_RGW_SECRET_KEY", "")

    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        config=Config(signature_version="s3v4"),
    )


# ── Bucket operations ─────────────────────────────────────────────────────────

def list_buckets(client=None) -> list[str]:
    """Return a list of all bucket names."""
    c = client or _s3_client()
    response = c.list_buckets()
    return [b["Name"] for b in response.get("Buckets", [])]


def create_bucket(
    bucket_name: str,
    *,
    region: str | None = None,
    acl: str = "private",
    versioning: bool = False,
    client=None,
) -> None:
    """
    Create an S3 bucket on Ceph RGW.

    Args:
        bucket_name: Globally unique bucket name.
        region:      Optional placement region override.
        acl:         Canned ACL ('private', 'public-read', etc.).
        versioning:  Enable object versioning.
    """
    c = client or _s3_client()
    kwargs: dict[str, Any] = {"Bucket": bucket_name, "ACL": acl}
    if region:
        kwargs["CreateBucketConfiguration"] = {"LocationConstraint": region}
    c.create_bucket(**kwargs)
    if versioning:
        c.put_bucket_versioning(
            Bucket=bucket_name,
            VersioningConfiguration={"Status": "Enabled"},
        )
    logger.info("Created bucket %s (acl=%s, versioning=%s)", bucket_name, acl, versioning)


def delete_bucket(bucket_name: str, *, force: bool = False, client=None) -> None:
    """
    Delete a bucket.

    Args:
        force: If True, purge all objects before deletion.
    """
    c = client or _s3_client()
    if force:
        _purge_bucket(c, bucket_name)
    c.delete_bucket(Bucket=bucket_name)
    logger.info("Deleted bucket %s", bucket_name)


def set_bucket_policy(bucket_name: str, policy_json: str, *, client=None) -> None:
    """Attach an S3 bucket policy (JSON string)."""
    c = client or _s3_client()
    c.put_bucket_policy(Bucket=bucket_name, Policy=policy_json)
    logger.info("Updated bucket policy for %s", bucket_name)


# ── Object operations ─────────────────────────────────────────────────────────

def upload_object(
    bucket_name: str,
    key: str,
    body: bytes | BinaryIO,
    *,
    content_type: str = "application/octet-stream",
    metadata: dict[str, str] | None = None,
    client=None,
) -> None:
    """Upload or overwrite an object in a bucket."""
    c = client or _s3_client()
    kwargs: dict[str, Any] = {
        "Bucket":      bucket_name,
        "Key":         key,
        "Body":        body,
        "ContentType": content_type,
    }
    if metadata:
        kwargs["Metadata"] = metadata
    c.put_object(**kwargs)
    logger.debug("Uploaded s3://%s/%s", bucket_name, key)


def download_object(
    bucket_name: str,
    key: str,
    dest_path: str,
    *,
    client=None,
) -> None:
    """Download an object to a local file path."""
    c = client or _s3_client()
    c.download_file(bucket_name, key, dest_path)
    logger.debug("Downloaded s3://%s/%s → %s", bucket_name, key, dest_path)


def delete_object(bucket_name: str, key: str, *, client=None) -> None:
    """Delete a single object."""
    c = client or _s3_client()
    c.delete_object(Bucket=bucket_name, Key=key)
    logger.debug("Deleted s3://%s/%s", bucket_name, key)


def list_objects(
    bucket_name: str,
    prefix: str = "",
    *,
    max_keys: int = 1000,
    client=None,
) -> list[dict]:
    """List objects in a bucket, optionally filtered by prefix."""
    c = client or _s3_client()
    response = c.list_objects_v2(Bucket=bucket_name, Prefix=prefix, MaxKeys=max_keys)
    return [
        {
            "key":           obj["Key"],
            "size_bytes":    obj["Size"],
            "last_modified": obj["LastModified"].isoformat(),
            "etag":          obj.get("ETag", ""),
        }
        for obj in response.get("Contents", [])
    ]


def generate_presigned_url(
    bucket_name: str,
    key: str,
    *,
    expiry_seconds: int = 3600,
    method: str = "get_object",
    client=None,
) -> str:
    """
    Generate a time-limited presigned URL for direct object access.

    Args:
        method: 'get_object' (download) or 'put_object' (upload).
    """
    c = client or _s3_client()
    url = c.generate_presigned_url(
        ClientMethod=method,
        Params={"Bucket": bucket_name, "Key": key},
        ExpiresIn=expiry_seconds,
    )
    return url


# ── Private helpers ───────────────────────────────────────────────────────────

def _purge_bucket(client, bucket_name: str) -> None:
    """Delete all objects (and versions) in a bucket before deletion."""
    paginator = client.get_paginator("list_object_versions")
    for page in paginator.paginate(Bucket=bucket_name):
        objects = [
            {"Key": obj["Key"], "VersionId": obj["VersionId"]}
            for obj in page.get("Versions", []) + page.get("DeleteMarkers", [])
        ]
        if objects:
            client.delete_objects(Bucket=bucket_name, Delete={"Objects": objects})
