"""
Service Catalog viewset.

GET  /api/services/catalog/                      — list all entries
GET  /api/services/catalog/?cloud_type=public    — filter by cloud type
GET  /api/services/catalog/?category=compute     — filter by category
GET  /api/services/catalog/by_cloud_type/        — grouped by public/private/hybrid
GET  /api/services/catalog/for_workspace/{id}/   — entries filtered by workspace cloud_type
"""
from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response

from .models import ServiceCatalogEntry, ServiceCatalogPolicy, CLOUD_TYPE_CHOICES
from .serializers import ServiceCatalogEntrySerializer, ServiceCatalogPolicySerializer


class ServiceCatalogViewSet(viewsets.ModelViewSet):
    """
    CRUD for service catalog entries.
    List/retrieve are open to all authenticated users.
    Create/update/delete require admin.
    """
    serializer_class   = ServiceCatalogEntrySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = ServiceCatalogEntry.objects.all()
        cloud_type = self.request.query_params.get("cloud_type")
        category   = self.request.query_params.get("category")
        enabled    = self.request.query_params.get("enabled")
        if cloud_type:
            qs = qs.filter(cloud_type=cloud_type)
        if category:
            qs = qs.filter(category=category)
        if enabled is not None:
            qs = qs.filter(is_enabled=(enabled.lower() in ("1", "true", "yes")))
        return qs

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAdminUser()]
        return [IsAuthenticated()]

    # ------------------------------------------------------------------
    # Custom actions
    # ------------------------------------------------------------------

    @action(detail=False, methods=["get"], url_path="by_cloud_type")
    def by_cloud_type(self, request):
        """
        Return enabled services grouped by cloud type.

        Response shape:
            {
              "public":  [ <entry>, … ],
              "private": [ <entry>, … ],
              "hybrid":  [ <entry>, … ]
            }
        """
        result = {}
        for slug, _label in CLOUD_TYPE_CHOICES:
            qs = ServiceCatalogEntry.objects.filter(cloud_type=slug, is_enabled=True)
            result[slug] = ServiceCatalogEntrySerializer(qs, many=True).data
        return Response(result)

    @action(detail=False, methods=["get"], url_path=r"for_workspace/(?P<workspace_id>[^/.]+)")
    def for_workspace(self, request, workspace_id=None):
        """
        Return the effective service catalog for a given workspace,
        merging global catalog with any workspace-level policy overrides.
        Only services explicitly allowed or unblocked are returned.
        """
        # Determine workspace cloud_type from WorkspaceBinding
        from services.workspace.models import Workspace, WorkspaceBinding

        try:
            workspace = Workspace.objects.get(workspace_id=workspace_id)
        except Workspace.DoesNotExist:
            return Response({"detail": "Workspace not found."}, status=status.HTTP_404_NOT_FOUND)

        # Resolve cloud_type; default to all three if not set
        binding = WorkspaceBinding.objects.filter(workspace=workspace).first()
        cloud_type = getattr(binding, "cloud_type", None) if binding else None

        qs = ServiceCatalogEntry.objects.filter(is_enabled=True)
        if cloud_type:
            qs = qs.filter(cloud_type=cloud_type)

        # Apply workspace-level policy overrides (deny list)
        denied_entry_ids = ServiceCatalogPolicy.objects.filter(
            workspace=workspace,
            is_allowed=False,
        ).values_list("entry_id", flat=True)
        qs = qs.exclude(id__in=denied_entry_ids)

        serializer = ServiceCatalogEntrySerializer(qs, many=True)
        return Response({
            "workspace":   workspace_id,
            "cloud_type":  cloud_type,
            "services":    serializer.data,
        })


class ServiceCatalogPolicyViewSet(viewsets.ModelViewSet):
    """Workspace-level service catalog policy overrides (admin only)."""
    serializer_class   = ServiceCatalogPolicySerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        qs = ServiceCatalogPolicy.objects.select_related("workspace", "entry")
        workspace_id = self.request.query_params.get("workspace_id")
        if workspace_id:
            qs = qs.filter(workspace__workspace_id=workspace_id)
        return qs
