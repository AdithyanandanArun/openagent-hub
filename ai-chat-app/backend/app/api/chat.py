from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.schemas.chat import ChatRequest, ChatStreamRequest, MessageResponse
from app.services.llm_service import LLMService

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("", response_model=MessageResponse)
async def chat(
    data: ChatRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = LLMService(db)
    message = await service.chat(
        conversation_id=data.conversation_id,
        user_id=user_id,
        message=data.message,
        model=data.model,
    )
    return MessageResponse.model_validate(message)


@router.post("/stream")
async def chat_stream(
    data: ChatStreamRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = LLMService(db)

    async def event_generator():
        async for chunk in service.chat_stream(
            conversation_id=data.conversation_id,
            user_id=user_id,
            message=data.message,
            model=data.model,
        ):
            yield chunk

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
