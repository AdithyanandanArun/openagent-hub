from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class AdminUserResponse(BaseModel):
    id: UUID
    email: str
    username: str
    is_active: bool
    is_admin: bool
    created_at: datetime
    last_seen_at: datetime | None = None


class AccountStatusUpdateRequest(BaseModel):
    is_active: bool
