from django.apps import AppConfig

class DocsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'services.docs'
    label = 'docs'
    verbose_name = 'Docs'
