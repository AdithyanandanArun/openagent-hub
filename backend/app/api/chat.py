import json
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.core.database import get_db, SessionLocal
from app.core.provider import stream_chat
from app.services.auth_service import get_current_user
from app.services.conversation_service import (
    create_conversation,
    get_conversation,
    add_message,
    auto_title_conversation,
)
from app.services.llm_service import get_provider_config
from app.schemas.conversation import ConversationCreate
from app.schemas.chat import ChatRequest

router = APIRouter(prefix="/chat", tags=["chat"])
security = HTTPBearer()


@router.post("/stream")
async def chat_stream(
    request: ChatRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    user = get_current_user(db, credentials.credentials)
    provider = get_provider_config(db, user.id)

    if not provider.base_url or not provider.model:
        raise HTTPException(
            status_code=400,
            detail="Provider not configured. Open Settings to set your API key and model.",
        )

    if request.conversation_id:
        conv = get_conversation(db, request.conversation_id, user.id)
    else:
        conv = create_conversation(db, user.id, ConversationCreate(model=request.model or provider.model))

    add_message(db, conv.id, "user", request.message)
    auto_title_conversation(db, conv.id, request.message)

    db.refresh(conv)
    messages = [{"role": m.role, "content": m.content} for m in conv.messages]

    # Extract all primitives before the DI session closes
    base_url = provider.base_url
    api_key = provider.api_key
    model = request.model or provider.model
    conv_id: UUID = conv.id

    async def generate():
        full_response = ""
        try:
            yield f"data: {json.dumps({'type': 'conversation_id', 'conversation_id': str(conv_id)})}\n\n"

            async for chunk in stream_chat(
                base_url=base_url,
                api_key=api_key,
                model=model,
                messages=messages,
            ):
                full_response += chunk
                yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"

            # Open a fresh session for the write — the DI session is already closed here
            with SessionLocal() as fresh_db:
                add_message(fresh_db, conv_id, "assistant", full_response)

            yield f"data: {json.dumps({'type': 'done', 'conversation_id': str(conv_id)})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
