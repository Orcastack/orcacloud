from django.apps import AppConfig


class KubernetesIntegrationConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'services.kubernetes_integration'
    label = 'kubernetes_integration'
    verbose_name = 'Kubernetes Integration'
