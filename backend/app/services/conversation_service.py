from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.models.conversation import Conversation
from app.models.message import Message
from app.schemas.conversation import ConversationCreate, ConversationUpdate
from typing import List
from uuid import UUID
from fastapi import HTTPException


def get_conversations(db: Session, user_id: UUID, project_id: UUID = None) -> List[Conversation]:
    q = db.query(Conversation).filter(Conversation.user_id == user_id)
    if project_id is not None:
        q = q.filter(Conversation.project_id == project_id)
    return q.order_by(desc(Conversation.updated_at)).all()


def get_conversation(db: Session, conversation_id: UUID, user_id: UUID) -> Conversation:
    conv = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.user_id == user_id,
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv


def create_conversation(db: Session, user_id: UUID, data: ConversationCreate) -> Conversation:
    conv = Conversation(user_id=user_id, title=data.title or "New Conversation", model=data.model)
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return conv


def update_conversation(db: Session, conversation_id: UUID, user_id: UUID, data: ConversationUpdate) -> Conversation:
    conv = get_conversation(db, conversation_id, user_id)
    if data.title is not None:
        conv.title = data.title
    if data.project_id is not None:
        conv.project_id = data.project_id
    db.commit()
    db.refresh(conv)
    return conv


def delete_conversation(db: Session, conversation_id: UUID, user_id: UUID) -> None:
    conv = get_conversation(db, conversation_id, user_id)
    db.delete(conv)
    db.commit()


def add_message(db: Session, conversation_id: UUID, role: str, content: str) -> Message:
    msg = Message(conversation_id=conversation_id, role=role, content=content)
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


def truncate_messages(db: Session, conversation_id: UUID, from_message_id: UUID) -> None:
    pivot = db.query(Message).filter(
        Message.id == from_message_id,
        Message.conversation_id == conversation_id,
    ).first()
    if not pivot:
        return
    db.query(Message).filter(
        Message.conversation_id == conversation_id,
        Message.created_at >= pivot.created_at,
    ).delete(synchronize_session=False)
    db.commit()


def _fallback_title(first_message: str) -> str:
    title = " ".join(first_message.split())[:60].strip()
    if len(first_message.strip()) > 60:
        title += "..."
    return title or "New Conversation"


async def generate_conversation_title(
    db: Session,
    conversation_id: UUID,
    user_id: UUID,
    first_message: str,
    assistant_response: str,
    model: str,
    *,
    use_router: bool,
    base_url: str,
    api_key: str,
    preferred_provider_id: str | None = None,
    model_order: list[tuple[str, str]] | None = None,
) -> str:
    """Generate a concise title after the first complete assistant response.

    Uses the same successful chat-model route and failover chain rather than a
    shared key. If a provider is unavailable, the first user-message fallback
    preserves a usable title without delaying the completed conversation.
    """
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv or conv.user_id != user_id or conv.title != "New Conversation":
        return conv.title if conv else "New Conversation"

    prompt = [
        {
            "role": "system",
            "content": (
                "Create a short, specific title for this conversation. Return only the title, "
                "with no quotes, no markdown, and no ending punctuation. Keep it under 60 characters."
            ),
        },
        {
            "role": "user",
            "content": f"User request:\n{first_message[:1200]}\n\nAssistant response:\n{assistant_response[:1600]}",
        },
    ]
    title = ""
    try:
        if use_router:
            from app.services.router_service import route_completion
            message, _provider = await route_completion(
                db, user_id, model, prompt,
                preferred_provider_id=preferred_provider_id,
                temperature=0.2,
                model_order=model_order,
            )
        else:
            from app.core.provider import chat_completion
            message = await chat_completion(
                base_url=base_url,
                api_key=api_key,
                model=model,
                messages=prompt,
                temperature=0.2,
            )
        title = " ".join(str(message.get("content") or "").replace("\n", " ").split())
        title = title.strip(" `#.:;\\\"'")[:60].strip()
    except Exception:
        title = ""

    conv.title = title or _fallback_title(first_message)
    db.commit()
    return conv.title
