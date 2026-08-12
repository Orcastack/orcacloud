from django.contrib import admin
from .models import Workspace, WorkspaceBinding, ProvisionedResource


@admin.register(Workspace)
class WorkspaceAdmin(admin.ModelAdmin):
    list_display  = ("workspace_id", "display_name", "owner", "is_active", "created_at")
    list_filter   = ("is_active",)
    search_fields = ("workspace_id", "display_name", "owner__username")
    readonly_fields = ("created_at",)


@admin.register(WorkspaceBinding)
class WorkspaceBindingAdmin(admin.ModelAdmin):
    list_display  = (
        "workspace", "environment",
        "openstack_project", "openstack_region",
        "quota_vcpus", "quota_ram_gb", "quota_storage_gb",
    )
    list_filter   = ("environment", "openstack_region")
    search_fields = ("workspace__workspace_id", "openstack_project")


@admin.register(ProvisionedResource)
class ProvisionedResourceAdmin(admin.ModelAdmin):
    list_display  = (
        "workspace", "environment", "resource_type",
        "resource_name", "resource_id", "status", "created_at",
    )
    list_filter   = ("environment", "resource_type", "status")
    search_fields = ("workspace__workspace_id", "resource_id", "resource_name")
    readonly_fields = ("created_at", "updated_at")
