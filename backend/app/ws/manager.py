import asyncio
import logging
from collections import defaultdict
from uuid import UUID

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: dict[UUID, set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def connect(self, event_id: UUID, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._connections[event_id].add(websocket)

    async def disconnect(self, event_id: UUID, websocket: WebSocket) -> None:
        async with self._lock:
            connections = self._connections.get(event_id)
            if connections is None:
                return
            connections.discard(websocket)
            if not connections:
                del self._connections[event_id]

    async def broadcast(self, event_id: UUID, message: dict) -> None:
        async with self._lock:
            connections = list(self._connections.get(event_id, set()))

        dead: list[WebSocket] = []
        for websocket in connections:
            try:
                await websocket.send_json(message)
            except Exception:
                logger.debug("websocket send failed", exc_info=True)
                dead.append(websocket)

        for websocket in dead:
            await self.disconnect(event_id, websocket)


ws_manager = ConnectionManager()
