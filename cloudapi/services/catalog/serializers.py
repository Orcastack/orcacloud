"""
Service Catalog serializers.
"""
from rest_framework import serializers

from .models import ServiceCatalogEntry, ServiceCatalogPolicy


class ServiceCatalogEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceCatalogEntry
        fields = [
            "id", "cloud_type", "service_slug", "display_name", "category",
            "openstack_service", "description", "is_enabled", "is_preview",
            "is_billable", "icon_url", "docs_url", "constraints",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ServiceCatalogPolicySerializer(serializers.ModelSerializer):
    entry_slug  = serializers.SlugRelatedField(source="entry", slug_field="service_slug", read_only=True)
    cloud_type  = serializers.CharField(source="entry.cloud_type", read_only=True)

    class Meta:
        model  = ServiceCatalogPolicy
        fields = ["id", "workspace", "entry", "entry_slug", "cloud_type",
                  "is_allowed", "reason", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]
