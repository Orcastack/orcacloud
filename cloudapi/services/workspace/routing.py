from django.urls import path
from . import consumers

websocket_urlpatterns = [
    path(
        'ws/workspace/<str:workspace_id>/terminal/',
        consumers.WorkspaceTerminalConsumer.as_asgi(),
    ),
]
