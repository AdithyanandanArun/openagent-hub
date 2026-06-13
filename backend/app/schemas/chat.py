from datetime import datetime

from pydantic import BaseModel, Field


class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    model: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatRequest(BaseModel):
    conversation_id: str
    message: str = Field(min_length=1)
    model: str = "gpt-4o-mini"


class ChatStreamRequest(BaseModel):
    conversation_id: str
    message: str = Field(min_length=1)
    model: str = "gpt-4o-mini"


class MessagesListResponse(BaseModel):
    messages: list[MessageResponse]
    total: int


class ModelInfo(BaseModel):
    id: str
    name: str
    description: str
    context_window: int


class ModelsResponse(BaseModel):
    models: list[ModelInfo]
