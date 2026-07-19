from pydantic import BaseModel, EmailStr, Field
from uuid import UUID
from datetime import datetime


class RegisterRequest(BaseModel):
    email: EmailStr
    username: str
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class VerifyEmailRequest(BaseModel):
    token: str


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class DeleteAccountRequest(BaseModel):
    password: str


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirmRequest(BaseModel):
    token: str
    password: str = Field(min_length=8, max_length=256)


class MessageResponse(BaseModel):
    message: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: UUID
    email: str
    username: str
    email_verified_at: datetime | None = None
    is_admin: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}


class UsageResponse(BaseModel):
    chat_requests_this_minute: int
    chat_requests_today: int
    chat_requests_per_minute_limit: int
    chat_requests_per_day_limit: int
    minute_reset_at: datetime | None = None
    day_reset_at: datetime | None = None
