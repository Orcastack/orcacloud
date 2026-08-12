from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated

from .models import Webhook
from .serializers import WebhookSerializer


class WebhookViewSet(viewsets.ModelViewSet):
    """
    OrcaCloud – Webhook Management

    Full CRUD for registered outbound webhooks.

    Endpoints (all under /api/services/webhooks/):
        GET    /                    → list all webhooks
        POST   /                    → create a new webhook
        GET    /{id}/               → retrieve single webhook
        PATCH  /{id}/               → partial update (e.g. toggle status)
        PUT    /{id}/               → full update
        DELETE /{id}/               → permanently delete the webhook
    """

    serializer_class   = WebhookSerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [filters.SearchFilter, filters.OrderingFilter]
    search_fields      = ['name', 'url']
    ordering_fields    = ['name', 'created_at', 'status']
    ordering           = ['-created_at']

    def get_queryset(self):
        return Webhook.objects.all()
