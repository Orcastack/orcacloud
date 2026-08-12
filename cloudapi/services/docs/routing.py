from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/docs/(?P<doc_id>[^/]+)/$', consumers.DocsConsumer.as_asgi()),
]
