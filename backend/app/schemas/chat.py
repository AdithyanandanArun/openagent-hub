from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID


class ChatRequest(BaseModel):
    conversation_id: Optional[UUID] = None
    message: str
    model: Optional[str] = None
    provider_id: Optional[UUID] = None
    attachment_ids: Optional[List[UUID]] = None


class ProviderConfigRequest(BaseModel):
    name: Optional[str] = "Default"
    base_url: str
    api_key: str
    model: str


class ProviderConfigResponse(BaseModel):
    id: UUID
    name: str
    base_url: str
    api_key: str
    model: str
    is_default: bool

    model_config = {"from_attributes": True}
