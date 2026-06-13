from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime


class ProviderCreate(BaseModel):
    name: str
    base_url: str
    api_key: str = ""
    priority: int = 0


class ProviderUpdate(BaseModel):
    name: Optional[str] = None
    base_url: Optional[str] = None
    api_key: Optional[str] = None
    enabled: Optional[bool] = None
    priority: Optional[int] = None


class ProviderResponse(BaseModel):
    id: UUID
    name: str
    base_url: str
    api_key: str
    enabled: bool
    priority: int
    status: str
    last_checked_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ProviderTestResult(BaseModel):
    status: str
    latency_ms: int
    models: list[str]
    error: Optional[str] = None
