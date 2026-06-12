from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.conversation import Conversation
from app.models.message import Message
from app.schemas.conversation import ConversationCreate, ConversationResponse, ConversationUpdate
from app.utils.logger import logger


class ConversationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_conversations(self, user_id: str) -> list[ConversationResponse]:
        result = await self.db.execute(
            select(Conversation, func.count(Message.id).label("message_count"))
            .outerjoin(Message, Message.conversation_id == Conversation.id)
            .where(Conversation.user_id == user_id)
            .group_by(Conversation.id)
            .order_by(Conversation.updated_at.desc())
        )
        responses: list[ConversationResponse] = []
        for conversation, message_count in result.all():
            item = ConversationResponse.model_validate(conversation)
            item.message_count = int(message_count or 0)
            responses.append(item)
        return responses

    async def create_conversation(
        self, user_id: str, data: ConversationCreate
    ) -> ConversationResponse:
        conversation = Conversation(user_id=user_id, title=data.title or "New Conversation")
        self.db.add(conversation)
        await self.db.flush()
        await self.db.refresh(conversation)
        logger.info("Conversation created: %s for user %s", conversation.id, user_id)
        return ConversationResponse.model_validate(conversation)

    async def get_conversation(self, conversation_id: str, user_id: str) -> Conversation:
        result = await self.db.execute(
            select(Conversation).where(
                Conversation.id == conversation_id,
                Conversation.user_id == user_id,
            )
        )
        conversation = result.scalar_one_or_none()
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found",
            )
        return conversation

    async def update_conversation(
        self, conversation_id: str, user_id: str, data: ConversationUpdate
    ) -> ConversationResponse:
        conversation = await self.get_conversation(conversation_id, user_id)
        conversation.title = data.title.strip()
        conversation.updated_at = datetime.now(timezone.utc)
        await self.db.flush()
        await self.db.refresh(conversation)
        return ConversationResponse.model_validate(conversation)

    async def delete_conversation(self, conversation_id: str, user_id: str) -> None:
        conversation = await self.get_conversation(conversation_id, user_id)
        await self.db.delete(conversation)
        await self.db.flush()
        logger.info("Conversation deleted: %s", conversation_id)

    async def get_messages(self, conversation_id: str, user_id: str) -> list[Message]:
        await self.get_conversation(conversation_id, user_id)
        result = await self.db.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.asc())
        )
        return list(result.scalars().all())
