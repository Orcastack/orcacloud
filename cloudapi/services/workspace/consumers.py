"""
WorkspaceTerminalConsumer
=========================
WebSocket consumer that provides an interactive shell session inside a
DevWorkspace.

Security model:
  - The connection is authenticated via Django's AuthMiddlewareStack
    (session cookie or token header).
  - The workspace must be owned by the connecting user.
  - The workspace must be in 'running' state.

Protocol:
  Client → Server JSON:
    { "type": "input",  "data": "<keystrokes>" }
    { "type": "resize", "cols": <int>, "rows": <int> }

  Server → Client JSON:
    { "type": "output", "data": "<terminal text>" }
    { "type": "error",  "message": "<human-readable error>" }
"""

import asyncio
import json
import logging
import os
import struct
import fcntl
import termios

from channels.generic.websocket import AsyncWebsocketConsumer
from django.db import close_old_connections

logger = logging.getLogger(__name__)


class WorkspaceTerminalConsumer(AsyncWebsocketConsumer):
    """Async WebSocket consumer — one instance per browser tab."""

    # ------------------------------------------------------------------ #
    # Connection lifecycle                                                  #
    # ------------------------------------------------------------------ #

    async def connect(self):
        self.workspace_id = self.scope['url_route']['kwargs']['workspace_id']
        self.user = self.scope.get('user')
        self._process: asyncio.subprocess.Process | None = None
        self._reader_task: asyncio.Task | None = None

        # 1. Authentication
        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        # 2. Workspace authorisation (run in thread-pool to avoid sync ORM in async)
        workspace = await self._get_workspace()
        if workspace is None:
            await self.close(code=4003)
            return

        if workspace.status != 'running':
            await self._send_error('Workspace is not running. Start it first.')
            await self.close(code=4004)
            return

        await self.accept()
        await self._spawn_shell()

    async def disconnect(self, close_code):
        if self._reader_task and not self._reader_task.done():
            self._reader_task.cancel()
        if self._process and self._process.returncode is None:
            try:
                self._process.terminate()
                await asyncio.wait_for(self._process.wait(), timeout=3)
            except Exception:
                pass

    async def receive(self, text_data=None, bytes_data=None):
        if not text_data:
            return
        try:
            msg = json.loads(text_data)
        except json.JSONDecodeError:
            return

        msg_type = msg.get('type')

        if msg_type == 'input' and self._process:
            data = msg.get('data', '')
            if data:
                self._process.stdin.write(data.encode('utf-8', errors='replace'))
                await self._process.stdin.drain()

        elif msg_type == 'resize':
            cols = int(msg.get('cols', 80))
            rows = int(msg.get('rows', 24))
            if self._process:
                await self._resize_pty(self._process.pid, cols, rows)

    # ------------------------------------------------------------------ #
    # Helpers                                                               #
    # ------------------------------------------------------------------ #

    async def _get_workspace(self):
        """Fetch DevWorkspace from DB; return None if not found / wrong owner."""
        from asgiref.sync import sync_to_async
        from services.workspace.models import DevWorkspace

        @sync_to_async
        def _fetch():
            close_old_connections()
            try:
                return DevWorkspace.objects.get(
                    workspace_id=self.workspace_id,
                    owner=self.user,
                )
            except DevWorkspace.DoesNotExist:
                return None

        return await _fetch()

    async def _spawn_shell(self):
        """Launch a PTY-backed bash shell subprocess."""
        import pty

        master_fd, slave_fd = pty.openpty()

        self._process = await asyncio.create_subprocess_exec(
            '/bin/bash', '--login',
            stdin=slave_fd,
            stdout=slave_fd,
            stderr=slave_fd,
            env={
                **os.environ,
                'TERM': 'xterm-256color',
                'HOME': os.path.expanduser('~'),
                'WORKSPACE_ID': self.workspace_id,
            },
            close_fds=True,
        )
        os.close(slave_fd)

        # Wrap the master fd in an asyncio stream
        loop = asyncio.get_event_loop()
        reader = asyncio.StreamReader()
        protocol = asyncio.StreamReaderProtocol(reader)
        transport, _ = await loop.connect_read_pipe(lambda: protocol, os.fdopen(master_fd, 'rb', 0))

        # Monkey-patch stdin to write to master fd
        write_transport, write_protocol = await loop.connect_write_pipe(
            asyncio.BaseProtocol, os.fdopen(os.dup(master_fd - 1 + 1), 'wb', 0)
        )

        # Store master fd for resize
        self._master_fd = master_fd

        self._reader_task = asyncio.ensure_future(
            self._stream_output(reader)
        )

    async def _stream_output(self, reader: asyncio.StreamReader):
        """Read subprocess output and forward to client."""
        try:
            while True:
                chunk = await reader.read(4096)
                if not chunk:
                    break
                await self.send(text_data=json.dumps({
                    'type': 'output',
                    'data': chunk.decode('utf-8', errors='replace'),
                }))
        except (asyncio.CancelledError, ConnectionResetError):
            pass
        finally:
            # Notify client that the shell exited
            try:
                await self.send(text_data=json.dumps({
                    'type': 'output',
                    'data': '\r\n[Shell session ended]\r\n',
                }))
                await self.close()
            except Exception:
                pass

    async def _send_error(self, message: str):
        try:
            await self.send(text_data=json.dumps({'type': 'error', 'message': message}))
        except Exception:
            pass

    @staticmethod
    async def _resize_pty(pid: int, cols: int, rows: int):
        """Send TIOCSWINSZ to set the PTY window size."""
        import subprocess
        # Use /proc/<pid>/fd to find the PTY — simpler: signal the process
        # We use fcntl directly if we have the master fd
        pass  # No-op for now; real resize requires master_fd reference
