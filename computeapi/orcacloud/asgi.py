import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'orcacloud.settings')

# Must initialise Django before importing anything that touches ORM/settings
django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402
from channels.auth import AuthMiddlewareStack             # noqa: E402
from services.workspace.routing import websocket_urlpatterns as ws_workspace  # noqa: E402
from services.docs.routing import websocket_urlpatterns as ws_docs            # noqa: E402

websocket_urlpatterns = ws_workspace + ws_docs

application = ProtocolTypeRouter({
    'http': django_asgi_app,
    'websocket': AuthMiddlewareStack(
        URLRouter(websocket_urlpatterns)
    ),
})
