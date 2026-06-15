from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.provider import fetch_models
from app.models.provider import Provider
from app.services.auth_service import get_current_user
from app.services.catalog_service import get_catalog, sync_provider_models, update_model_meta

router = APIRouter(prefix="/catalog", tags=["catalog"])
security = HTTPBearer()


def _current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    return get_current_user(db, credentials.credentials)


@router.get("")
def list_catalog(user=Depends(_current_user), db: Session = Depends(get_db)):
    entries = get_catalog(db, user.id)
    return [
        {
            "provider_id": str(e.provider_id),
            "provider_name": e.provider_name,
            "model_id": e.model_id,
            "context_window": e.context_window,
            "vision_support": e.vision_support,
            "reasoning_support": e.reasoning_support,
            "coding_score": e.coding_score,
            "speed_score": e.speed_score,
            "is_enabled": e.is_enabled,
            "last_seen_at": e.last_seen_at.isoformat() if e.last_seen_at else None,
        }
        for e in entries
    ]


@router.post("/sync")
async def sync_catalog(user=Depends(_current_user), db: Session = Depends(get_db)):
    providers = (
        db.query(Provider)
        .filter(Provider.user_id == user.id, Provider.enabled == True)
        .all()
    )
    total = 0
    errors = []
    for p in providers:
        try:
            model_ids = await fetch_models(p.base_url, p.api_key)
            sync_provider_models(db, user.id, p, model_ids)
            total += len(model_ids)
        except Exception as exc:
            errors.append({"provider": p.name, "error": str(exc)})
    return {"synced": total, "errors": errors}


@router.patch("/{provider_id}/{model_id:path}")
def patch_model(
    provider_id: UUID,
    model_id: str,
    updates: dict,
    user=Depends(_current_user),
    db: Session = Depends(get_db),
):
    entry = update_model_meta(db, user.id, provider_id, model_id, updates)
    if not entry:
        raise HTTPException(status_code=404, detail="Model not found in catalog")
    return {"ok": True}
