from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.provider import Provider
from app.models.user_preference import UserPreference
from app.services.auth_service import get_current_user
from app.services.catalog_service import sync_provider_models
from app.services.provider_service import fetch_provider_models

router = APIRouter(prefix="/preferences", tags=["preferences"])
security = HTTPBearer()


class PreferenceUpdate(BaseModel):
    embedding_provider_id: Optional[UUID] = None
    embedding_model: Optional[str] = None
    complete_onboarding: Optional[bool] = None


def _current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    return get_current_user(db, credentials.credentials)


def _response(preference: UserPreference) -> dict:
    return {
        "embedding_provider_id": str(preference.embedding_provider_id) if preference.embedding_provider_id else None,
        "embedding_model": preference.embedding_model,
        "onboarding_completed_at": preference.onboarding_completed_at.isoformat() if preference.onboarding_completed_at else None,
    }


@router.get("")
def get_preferences(user=Depends(_current_user), db: Session = Depends(get_db)):
    preference = db.get(UserPreference, user.id)
    if preference is None:
        preference = UserPreference(user_id=user.id)
        db.add(preference)
        db.commit()
        db.refresh(preference)
    return _response(preference)


@router.patch("")
async def update_preferences(data: PreferenceUpdate, user=Depends(_current_user), db: Session = Depends(get_db)):
    preference = db.get(UserPreference, user.id)
    if preference is None:
        preference = UserPreference(user_id=user.id)
        db.add(preference)

    if data.embedding_provider_id is not None:
        provider = db.query(Provider).filter(
            Provider.id == data.embedding_provider_id,
            Provider.user_id == user.id,
            Provider.enabled == True,
        ).first()
        if provider is None:
            raise HTTPException(status_code=400, detail="Choose an enabled provider from your account")
        preference.embedding_provider_id = provider.id
        # Refresh all configured providers once at setup time. This retains
        # their embedding models for fast, model-free routing at request time.
        for candidate in db.query(Provider).filter(Provider.user_id == user.id, Provider.enabled == True).all():
            try:
                models = await fetch_provider_models(db, user.id, candidate.id)
                sync_provider_models(db, user.id, candidate, models)
            except Exception:
                # A selected provider can still work; unavailable providers
                # simply do not join this user's current fallback order.
                continue
    if data.embedding_model is not None:
        model = data.embedding_model.strip()
        preference.embedding_model = model or None
    elif data.embedding_provider_id is not None:
        preference.embedding_model = "auto"
    if data.complete_onboarding is True:
        preference.onboarding_completed_at = datetime.utcnow()

    db.commit()
    db.refresh(preference)
    return _response(preference)
