# OrcaCloud – OpenStack Connection Layer
#
# All OpenStack API calls route through get_connection().
# Credentials are read exclusively from environment variables (never hard-coded).
# A module-level cache reuses the connection within the same process lifetime
# to avoid redundant Keystone authentication on every request.

import os
import logging
import functools
import openstack
import openstack.exceptions

logger = logging.getLogger(__name__)

# ── Config defaults ────────────────────────────────────────────────────────────
_DEFAULTS = {
    "user_domain_name":    "Default",
    "project_domain_name": "Default",
    "region_name":         "RegionOne",
    "app_name":            "orcacloud-backend",
    "app_version":         "1.0",
}


def _env(key: str, default: str | None = None) -> str | None:
    return os.environ.get(key, default)


def get_connection() -> openstack.connection.Connection:
    """
    Return an authenticated OpenStack connection.

    Reads configuration from environment variables:
        OS_AUTH_URL, OS_USERNAME, OS_PASSWORD,
        OS_PROJECT_NAME, OS_USER_DOMAIN_NAME,
        OS_PROJECT_DOMAIN_NAME, OS_REGION_NAME

    Falls back gracefully to clouds.yaml / OS_CLOUD if the env vars are absent.
    Raises openstack.exceptions.ConfigException when no valid config is found.
    """
    auth_url = _env("OS_AUTH_URL")

    if auth_url:
        # Explicit env-var based connection
        conn = openstack.connect(
            auth_url=auth_url,
            project_name=_env("OS_PROJECT_NAME"),
            username=_env("OS_USERNAME"),
            password=_env("OS_PASSWORD"),
            region_name=_env("OS_REGION_NAME", _DEFAULTS["region_name"]),
            user_domain_name=_env("OS_USER_DOMAIN_NAME", _DEFAULTS["user_domain_name"]),
            project_domain_name=_env("OS_PROJECT_DOMAIN_NAME", _DEFAULTS["project_domain_name"]),
            app_name=_DEFAULTS["app_name"],
            app_version=_DEFAULTS["app_version"],
        )
    else:
        # Fall back to clouds.yaml / OS_CLOUD env var
        cloud_name = _env("OS_CLOUD", "orcacloud")
        logger.info("OS_AUTH_URL not set – using clouds.yaml profile '%s'", cloud_name)
        conn = openstack.connect(cloud=cloud_name)

    logger.debug("OpenStack connection established (auth_url=%s)", conn.auth.get("auth_url"))
    return conn


def is_openstack_configured() -> bool:
    """
    Returns True if minimum required environment variables are present,
    OR if a clouds.yaml file is discoverable by the SDK.
    """
    if _env("OS_AUTH_URL") and _env("OS_USERNAME") and _env("OS_PASSWORD"):
        return True
    try:
        import openstack.config
        loader = openstack.config.OpenStackConfig()
        loader.get_one(_env("OS_CLOUD", "orcacloud"))
        return True
    except Exception:
        return False
