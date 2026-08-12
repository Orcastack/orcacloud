import uuid
from django.db import models
from django.contrib.auth.models import User


class Webhook(models.Model):
    STATUS_ACTIVE   = 'active'
    STATUS_INACTIVE = 'inactive'
    STATUS_CHOICES  = [
        (STATUS_ACTIVE,   'Active'),
        (STATUS_INACTIVE, 'Inactive'),
    ]

    id      = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name    = models.CharField(max_length=255)
    url     = models.URLField(max_length=2048)
    events  = models.JSONField(default=list, help_text='List of event type strings, e.g. ["deployment.created"]')
    status  = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ACTIVE, db_index=True)
    secret  = models.CharField(max_length=512, blank=True, default='',
                               help_text='Optional HMAC-SHA256 signing secret. Stored blank = unsigned.')
    retries = models.PositiveSmallIntegerField(default=3)
    owner   = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL,
                                related_name='webhooks')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table  = 'services_webhook'
        ordering  = ['-created_at']
        verbose_name = 'Webhook'
        verbose_name_plural = 'Webhooks'

    def __str__(self):
        return f'{self.name} → {self.url}'
