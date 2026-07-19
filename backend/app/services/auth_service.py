import hashlib
import secrets
from datetime import datetime, timedelta

from sqlalchemy.orm import Session
from app.models.user import User
from app.models.attachment import Attachment
from app.services.storage_service import delete_attachment
from app.models.provider_config import ProviderConfig
from app.schemas.auth import RegisterRequest
from app.core.security import hash_password, verify_password, create_access_token, decode_token
from fastapi import HTTPException, status
from app.core.config import settings


VERIFICATION_TOKEN_TTL = timedelta(hours=24)
PASSWORD_RESET_TOKEN_TTL = timedelta(hours=1)


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_verification_token(db: Session, user: User) -> str:
    """Replace any old email-verification token and return the new plaintext once."""
    token = secrets.token_urlsafe(32)
    user.email_verification_token_hash = _token_hash(token)
    user.email_verification_expires_at = datetime.utcnow() + VERIFICATION_TOKEN_TTL
    db.commit()
    return token


def create_password_reset_token(db: Session, user: User) -> str:
    """Replace an old reset token and return the plaintext exactly once."""
    token = secrets.token_urlsafe(32)
    user.password_reset_token_hash = _token_hash(token)
    user.password_reset_expires_at = datetime.utcnow() + PASSWORD_RESET_TOKEN_TTL
    db.commit()
    return token


def register_user(db: Session, data: RegisterRequest) -> User:
    if settings.INVITE_ONLY and str(data.email).lower() not in settings.invited_emails:
        raise HTTPException(status_code=403, detail="Registration is currently invite only")
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    user = User(
        email=data.email,
        username=data.username,
        hashed_password=hash_password(data.password),
        email_verified_at=datetime.utcnow() if not settings.EMAIL_VERIFICATION_REQUIRED else None,
    )
    db.add(user)
    db.flush()

    provider = ProviderConfig(
        user_id=user.id,
        name="Default",
        base_url="http://host.docker.internal:3001/v1",
        api_key="",
        model="",
        is_default=True,
    )
    db.add(provider)
    db.commit()
    db.refresh(user)
    return user


def login_user(db: Session, email: str, password: str) -> str:
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled")
    if settings.EMAIL_VERIFICATION_REQUIRED and not user.email_verified_at:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Verify your email before signing in")
    return create_access_token({"sub": str(user.id)})


def verify_email(db: Session, token: str) -> None:
    token_hash = _token_hash((token or "").strip())
    user = db.query(User).filter(User.email_verification_token_hash == token_hash).first()
    if not user or not user.email_verification_expires_at or user.email_verification_expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="This verification link is invalid or has expired")
    user.email_verified_at = datetime.utcnow()
    user.email_verification_token_hash = None
    user.email_verification_expires_at = None
    db.commit()


def resend_verification(db: Session, email: str) -> tuple[User | None, str | None]:
    """Return a fresh token only for an existing, unverified account.

    The endpoint response remains generic so callers cannot enumerate accounts.
    """
    user = db.query(User).filter(User.email == email).first()
    if not user or user.email_verified_at:
        return None, None
    return user, create_verification_token(db, user)


def request_password_reset(db: Session, email: str) -> tuple[User | None, str | None]:
    """Create a reset token only for active accounts without exposing membership."""
    user = db.query(User).filter(User.email == email.strip().lower()).first()
    if not user or not user.is_active:
        return None, None
    return user, create_password_reset_token(db, user)


def reset_password(db: Session, token: str, password: str) -> None:
    token_hash = _token_hash((token or "").strip())
    user = db.query(User).filter(User.password_reset_token_hash == token_hash).first()
    if not user or not user.password_reset_expires_at or user.password_reset_expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="This password-reset link is invalid or has expired")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")
    user.hashed_password = hash_password(password)
    user.password_reset_token_hash = None
    user.password_reset_expires_at = None
    db.commit()


def delete_account(db: Session, user: User, password: str) -> None:
    if not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect password")
    # Remove objects before the DB cascade deletes their metadata.
    attachments = db.query(Attachment).filter(Attachment.user_id == user.id).all()
    for attachment in attachments:
        try:
            delete_attachment(attachment.storage_key or attachment.file_path)
        except Exception:
            # The database deletion must still complete if a stale file cannot
            # be removed; the object-store lifecycle policy handles this later.
            pass
    db.delete(user)
    db.commit()


def get_current_user(db: Session, token: str) -> User:
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = db.query(User).filter(User.id == payload.get("sub")).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=401, detail="Account is disabled")
    if settings.EMAIL_VERIFICATION_REQUIRED and not user.email_verified_at:
        raise HTTPException(status_code=401, detail="Email address is not verified")
    return user
