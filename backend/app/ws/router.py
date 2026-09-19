import logging
from uuid import UUID

import jwt
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.security import decode_access_token
from app.db.session import SessionLocal
from app.repositories.event_repository import EventRepository
from app.ws.manager import ws_manager

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/ws/events/{event_id}")
async def event_websocket(websocket: WebSocket, event_id: UUID) -> None:
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4401, reason="Unauthorized")
        return

    try:
        user_id = decode_access_token(token)
    except jwt.PyJWTError:
        await websocket.close(code=4401, reason="Unauthorized")
        return

    db = SessionLocal()
    try:
        if not EventRepository(db).is_member(user_id, event_id):
            await websocket.close(code=4403, reason="Forbidden")
            return
    finally:
        db.close()

    await ws_manager.connect(event_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        await ws_manager.disconnect(event_id, websocket)
