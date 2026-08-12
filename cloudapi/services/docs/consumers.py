from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.contrib.auth.models import AnonymousUser


class DocsConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.doc_id = self.scope['url_route']['kwargs'].get('doc_id')
        self.group_name = f'docs_{self.doc_id}'
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        # Broadcast document update to group
        await self.channel_layer.group_send(
            self.group_name,
            {
                'type': 'doc.update',
                'content': content.get('content'),
                'sender': str(self.scope.get('user') or 'anonymous'),
            }
        )

    async def doc_update(self, event):
        await self.send_json({'type': 'doc.update', 'content': event.get('content'), 'sender': event.get('sender')})
