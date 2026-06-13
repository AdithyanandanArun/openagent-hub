import time
from datetime import datetime
from uuid import UUID

import httpx
from sqlalchemy.orm import Session

from app.models.provider import Provider
from app.schemas.provider import ProviderCreate, ProviderUpdate, ProviderTestResult


def list_providers(db: Session, user_id: UUID) -> list[Provider]:
    return (
        db.query(Provider)
        .filter(Provider.user_id == user_id)
        .order_by(Provider.priority, Provider.created_at)
        .all()
    )


def get_provider(db: Session, user_id: UUID, provider_id: UUID) -> Provider:
    p = db.query(Provider).filter(Provider.id == provider_id, Provider.user_id == user_id).first()
    if not p:
        raise ValueError("Provider not found")
    return p


def create_provider(db: Session, user_id: UUID, data: ProviderCreate) -> Provider:
    p = Provider(
        user_id=user_id,
        name=data.name,
        base_url=data.base_url.rstrip("/"),
        api_key=data.api_key,
        priority=data.priority,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


def update_provider(db: Session, user_id: UUID, provider_id: UUID, data: ProviderUpdate) -> Provider:
    p = get_provider(db, user_id, provider_id)
    for field, value in data.model_dump(exclude_none=True).items():
        if field == "base_url":
            value = value.rstrip("/")
        setattr(p, field, value)
    p.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(p)
    return p


def delete_provider(db: Session, user_id: UUID, provider_id: UUID) -> None:
    p = get_provider(db, user_id, provider_id)
    db.delete(p)
    db.commit()


async def test_provider(db: Session, user_id: UUID, provider_id: UUID) -> ProviderTestResult:
    p = get_provider(db, user_id, provider_id)
    start = time.monotonic()
    try:
        headers = {"Authorization": f"Bearer {p.api_key}"} if p.api_key else {}
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(f"{p.base_url}/models", headers=headers)
            resp.raise_for_status()
            data = resp.json()
            models = [m["id"] for m in data.get("data", [])]
        latency_ms = int((time.monotonic() - start) * 1000)
        p.status = "healthy"
        p.last_checked_at = datetime.utcnow()
        db.commit()
        return ProviderTestResult(status="healthy", latency_ms=latency_ms, models=models)
    except Exception as exc:
        latency_ms = int((time.monotonic() - start) * 1000)
        p.status = "error"
        p.last_checked_at = datetime.utcnow()
        db.commit()
        return ProviderTestResult(status="error", latency_ms=latency_ms, models=[], error=str(exc))


async def fetch_provider_models(db: Session, user_id: UUID, provider_id: UUID) -> list[str]:
    p = get_provider(db, user_id, provider_id)
    headers = {"Authorization": f"Bearer {p.api_key}"} if p.api_key else {}
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(f"{p.base_url}/models", headers=headers)
        resp.raise_for_status()
        data = resp.json()
        return [m["id"] for m in data.get("data", [])]


def has_enabled_providers(db: Session, user_id: UUID) -> bool:
    return db.query(Provider).filter(
        Provider.user_id == user_id, Provider.enabled == True
    ).count() > 0
