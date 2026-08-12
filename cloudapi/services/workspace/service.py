# OrcaCloud – Workspace Binding Service
#
# Central service that:
#   1. Resolves workspace_id + environment → OpenStack project
#   2. Returns a per-project OpenStack connection
#   3. Provides resource registration / lookup helpers
#
# Usage (in any backend view):
#
#   from services.workspace.service import WorkspaceService
#
#   binding = WorkspaceService.resolve(workspace_id="devops", environment="staging")
#   conn    = WorkspaceService.get_connection(binding)

import logging
import os

import openstack
from django.core.exceptions import ObjectDoesNotExist

from .models import Workspace, WorkspaceBinding, ProvisionedResource

logger = logging.getLogger(__name__)


# ── Exceptions ─────────────────────────────────────────────────────────────────

class WorkspaceNotFound(Exception):
    """workspace_id does not exist."""


class BindingNotFound(Exception):
    """No WorkspaceBinding for this workspace + environment combination."""


class WorkspaceInactive(Exception):
    """Workspace exists but is disabled."""


# ── Service ────────────────────────────────────────────────────────────────────

class WorkspaceService:
    """
    All workspace-aware operations go through this service.

    Developers MUST use this service (never call openstack.connect() directly
    in view code) so that workspace isolation and audit logging are guaranteed.
    """

    # ── Resolution ─────────────────────────────────────────────────────────────

    @staticmethod
    def resolve(workspace_id: str, environment: str) -> WorkspaceBinding:
        """
        Resolve workspace + environment to a WorkspaceBinding.

        Raises:
            WorkspaceNotFound   – workspace_id not in DB
            WorkspaceInactive   – workspace is disabled
            BindingNotFound     – no binding for this environment
        """
        try:
            workspace = Workspace.objects.get(workspace_id=workspace_id)
        except ObjectDoesNotExist:
            raise WorkspaceNotFound(f"Workspace '{workspace_id}' does not exist.")

        if not workspace.is_active:
            raise WorkspaceInactive(f"Workspace '{workspace_id}' is disabled.")

        try:
            return WorkspaceBinding.objects.get(workspace=workspace, environment=environment)
        except ObjectDoesNotExist:
            raise BindingNotFound(
                f"No OpenStack binding for workspace='{workspace_id}', environment='{environment}'."
            )

    # ── OpenStack connection ────────────────────────────────────────────────────

    @staticmethod
    def get_connection(binding: WorkspaceBinding) -> openstack.connection.Connection:
        """
        Return an authenticated OpenStack connection scoped to the
        workspace's OpenStack project.

        Credentials (OS_AUTH_URL, OS_USERNAME, OS_PASSWORD) are read from
        environment variables. The project is taken from the WorkspaceBinding.

        This is the ONLY place in the backend that creates OpenStack connections
        for provisioning requests.
        """
        auth_url = os.environ.get("OS_AUTH_URL")
        username = os.environ.get("OS_USERNAME")
        password = os.environ.get("OS_PASSWORD")

        if not all([auth_url, username, password]):
            # Fall back to clouds.yaml
            cloud_name = os.environ.get("OS_CLOUD", "orcacloud")
            logger.info(
                "Connecting to OpenStack via clouds.yaml (profile=%s) "
                "for project=%s region=%s",
                cloud_name,
                binding.openstack_project,
                binding.openstack_region,
            )
            return openstack.connect(
                cloud=cloud_name,
                project_name=binding.openstack_project,
                region_name=binding.openstack_region,
            )

        logger.info(
            "Connecting to OpenStack (auth_url=%s) for project=%s region=%s",
            auth_url,
            binding.openstack_project,
            binding.openstack_region,
        )
        return openstack.connect(
            auth_url=auth_url,
            project_name=binding.openstack_project,
            username=username,
            password=password,
            region_name=binding.openstack_region,
            user_domain_name=os.environ.get("OS_USER_DOMAIN_NAME", "Default"),
            project_domain_name=os.environ.get("OS_PROJECT_DOMAIN_NAME", "Default"),
            app_name="orcacloud-backend",
            app_version="1.0",
        )

    # ── Resource registry ──────────────────────────────────────────────────────

    @staticmethod
    def register_resource(
        binding: WorkspaceBinding,
        resource_type: str,
        resource_id: str,
        resource_name: str,
        status: str = "active",
        metadata: dict | None = None,
        created_by=None,
    ) -> ProvisionedResource:
        """
        Save a newly created OpenStack resource to the DB.
        This is the audit record for workspace inventory.
        """
        return ProvisionedResource.objects.create(
            workspace=binding.workspace,
            environment=binding.environment,
            resource_type=resource_type,
            resource_id=resource_id,
            resource_name=resource_name,
            openstack_project=binding.openstack_project,
            region=binding.openstack_region,
            status=status,
            metadata=metadata or {},
            created_by=created_by,
        )

    @staticmethod
    def list_resources(workspace_id: str, environment: str | None = None) -> list:
        """Return all provisioned resources for a workspace (optionally filtered by env)."""
        qs = ProvisionedResource.objects.filter(workspace__workspace_id=workspace_id)
        if environment:
            qs = qs.filter(environment=environment)
        return list(qs.values(
            "resource_type", "resource_id", "resource_name",
            "environment", "status", "created_at", "metadata",
        ))

    @staticmethod
    def update_resource_status(resource_id: str, status: str) -> None:
        """Update the status of a tracked resource (e.g. creating → active)."""
        ProvisionedResource.objects.filter(resource_id=resource_id).update(status=status)

    # ── Validation helpers ─────────────────────────────────────────────────────

    @staticmethod
    def validate_request(data: dict) -> tuple[str, str]:
        """
        Extract and validate workspace_id + environment from a request payload.
        Returns (workspace_id, environment) or raises ValueError.
        """
        workspace_id = data.get("workspace_id", "").strip()
        environment  = data.get("environment_id", data.get("environment", "")).strip()

        if not workspace_id:
            raise ValueError("'workspace_id' is required.")
        if not environment:
            raise ValueError("'environment_id' is required.")
        if environment not in ("dev", "staging", "prod"):
            raise ValueError("'environment_id' must be one of: dev, staging, prod.")

        return workspace_id, environment
