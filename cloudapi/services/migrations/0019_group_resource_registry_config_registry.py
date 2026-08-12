# Generated migration – 2026-03-02
# Adds GroupResourceRegistry, GroupConfigRegistry; extends group_type choices;
# extends GroupAuditLog action choices.

import django.db.models.deletion
from django.conf import settings
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('services', '0018_delete_webhook'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = []
