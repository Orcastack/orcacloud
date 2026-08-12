# OrcaCloud – Service Catalog app config

from django.apps import AppConfig


class CatalogConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "services.catalog"
    label = "catalog"
    verbose_name = "Service Catalog"
