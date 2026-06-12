import json
from collections.abc import AsyncIterator
from datetime import datetime, timezone

from fastapi import HTTPException, status
from openai import AsyncOpenAI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.conversation import Conversation
from app.models.message import Message
from app.schemas.chat import ModelInfo
from app.services.conversation_service import ConversationService
from app.utils.helpers import sanitize_title
from app.utils.logger import logger

AVAILABLE_MODELS: list[ModelInfo] = [
    ModelInfo(
        id="gpt-4o",
        name="GPT-4o",
        description="Most capable model for deep reasoning and multimodal workflows",
        context_window=128000,
    ),
    ModelInfo(
        id="gpt-4o-mini",
        name="GPT-4o Mini",
        description="Fast, efficient model for everyday chat",
        context_window=128000,
    ),
    ModelInfo(
        id="gpt-4.1",
        name="GPT-4.1",
        description="Strong instruction following and coding model",
        context_window=1047576,
    ),
]


class LLMService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.client = AsyncOpenAI(
            api_key=settings.OPENAI_API_KEY,
            base_url=settings.OPENAI_BASE_URL,
        )
        self.conversation_service = ConversationService(db)

    def get_models(self) -> list[ModelInfo]:
        return AVAILABLE_MODELS

    async def _get_history(self, conversation_id: str) -> list[dict[str, str]]:
        result = await self.db.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.asc())
        )
        return [{"role": msg.role, "content": msg.content} for msg in result.scalars().all()]

    async def _save_message(
        self, conversation_id: str, role: str, content: str, model: str | None = None
    ) -> Message:
        message = Message(
            conversation_id=conversation_id,
            role=role,
            content=content,
            model=model,
        )
        self.db.add(message)
        await self.db.flush()
        await self.db.refresh(message)
        return message

    async def _auto_title(self, conversation: Conversation, user_message: str) -> None:
        if conversation.title == "New Conversation":
            conversation.title = sanitize_title(user_message, max_length=60)
        conversation.updated_at = datetime.now(timezone.utc)
        await self.db.flush()

    async def chat(
        self, conversation_id: str, user_id: str, message: str, model: str
    ) -> Message:
        conversation = await self.conversation_service.get_conversation(conversation_id, user_id)
        await self._auto_title(conversation, message)

        history = await self._get_history(conversation_id)
        await self._save_message(conversation_id, "user", message)
        messages_payload = history + [{"role": "user", "content": message}]

        try:
            response = await self.client.chat.completions.create(
                model=model,
                messages=messages_payload,
                stream=False,
            )
            assistant_content = response.choices[0].message.content or ""
        except Exception as exc:
            logger.exception("LLM request failed")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="The AI provider could not complete the request",
            ) from exc

        return await self._save_message(conversation_id, "assistant", assistant_content, model)

    async def chat_stream(
        self, conversation_id: str, user_id: str, message: str, model: str
    ) -> AsyncIterator[str]:
        conversation = await self.conversation_service.get_conversation(conversation_id, user_id)
        await self._auto_title(conversation, message)

        history = await self._get_history(conversation_id)
        user_msg = await self._save_message(conversation_id, "user", message)
        await self.db.commit()

        full_content = ""
        yield self._format_sse(
            "message_start",
            {"message_id": user_msg.id, "conversation_id": conversation_id},
        )

        try:
            stream = await self.client.chat.completions.create(
                model=model,
                messages=history + [{"role": "user", "content": message}],
                stream=True,
            )
            async for chunk in stream:
                delta = chunk.choices[0].delta
                if delta.content:
                    full_content += delta.content
                    yield self._format_sse("content_delta", {"content": delta.content})

            assistant_msg = await self._save_message(
                conversation_id, "assistant", full_content, model
            )
            await self.db.commit()
            yield self._format_sse(
                "message_end",
                {
                    "message_id": assistant_msg.id,
                    "conversation_id": conversation_id,
                    "title": conversation.title,
                },
            )
        except Exception as exc:
            logger.exception("LLM stream failed")
            await self.db.rollback()
            yield self._format_sse(
                "error",
                {"message": "The AI provider could not complete the streamed request"},
            )

    @staticmethod
    def _format_sse(event: str, payload: dict[str, str]) -> str:
        return f"event: {event}\ndata: {json.dumps(payload)}\n\n"
