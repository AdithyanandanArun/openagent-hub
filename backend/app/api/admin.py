"""Small, allowlisted account-control API for the hosted beta."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.request_log import RequestLog
from app.models.user import User
from app.schemas.admin import AccountStatusUpdateRequest, AdminUserResponse
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/admin", tags=["admin"])
security = HTTPBearer()


def current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    user = get_current_user(db, credentials.credentials)
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Administrator access is required")
    return user


def _user_response(user: User, last_seen_at: datetime | None = None) -> AdminUserResponse:
    return AdminUserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        is_active=bool(user.is_active),
        is_admin=user.is_admin,
        created_at=user.created_at,
        last_seen_at=last_seen_at,
    )


@router.get("/users", response_model=list[AdminUserResponse])
def list_users(
    search: str = Query("", max_length=120),
    limit: int = Query(100, ge=1, le=200),
    _: User = Depends(current_admin),
    db: Session = Depends(get_db),
):
    query = db.query(User)
    if search.strip():
        term = f"%{search.strip()}%"
        query = query.filter((User.email.ilike(term)) | (User.username.ilike(term)))
    users = query.order_by(User.created_at.desc()).limit(limit).all()
    ids = [user.id for user in users]
    last_seen_rows = (
        db.query(RequestLog.user_id, func.max(RequestLog.created_at))
        .filter(RequestLog.user_id.in_(ids))
        .group_by(RequestLog.user_id)
        .all()
        if ids else []
    )
    last_seen = {row[0]: row[1] for row in last_seen_rows}
    return [_user_response(user, last_seen.get(user.id)) for user in users]


@router.patch("/users/{user_id}/status", response_model=AdminUserResponse)
def update_user_status(
    user_id: UUID,
    data: AccountStatusUpdateRequest,
    admin: User = Depends(current_admin),
    db: Session = Depends(get_db),
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.id == admin.id and not data.is_active:
        raise HTTPException(status_code=400, detail="You cannot disable your own account")
    if target.is_admin and not data.is_active:
        raise HTTPException(status_code=400, detail="Remove the user from ADMIN_EMAILS before disabling an administrator")
    target.is_active = data.is_active
    db.commit()
    db.refresh(target)
    return _user_response(target)
