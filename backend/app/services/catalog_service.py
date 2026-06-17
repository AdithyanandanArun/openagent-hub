"""
Model catalog service — syncs models from providers and classifies them
using the static model taxonomy.

Only FREE models are stored and routed.
"""
from datetime import datetime
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.model_catalog import ModelCatalog
from app.models.provider import Provider
from app.services.model_taxonomy import classify_model
from app.services.provider_presets import find_preset, _matches_free_name, _is_paid_object


# --------------------------------------------------------------------------- #
# Free-model helpers                                                           #
# --------------------------------------------------------------------------- #

def _is_model_free(model_id: str, provider_name: str) -> bool:
    """Check whether a model is free based on the provider preset rules."""
    preset = find_preset(name=provider_name)
    return _matches_free_name(model_id, preset)


# --------------------------------------------------------------------------- #
# Sync helpers                                                                 #
# --------------------------------------------------------------------------- #

def sync_provider_models(db: Session, user_id: UUID, provider: Provider, model_ids: list[str]) -> None:
    now = datetime.utcnow()
    for mid in model_ids:
        free = _is_model_free(mid, provider.name)
        if not free:
            continue

        existing = (
            db.query(ModelCatalog)
            .filter(
                ModelCatalog.user_id == user_id,
                ModelCatalog.provider_id == provider.id,
                ModelCatalog.model_id == mid,
            )
            .first()
        )
        caps = classify_model(mid, provider.name)
        if existing:
            existing.last_seen_at = now
            existing.provider_name = provider.name
            existing.is_free = True
            existing.speed_score = caps["speed_score"]
            existing.coding_score = caps["coding_score"]
            existing.knowledge_score = caps["knowledge_score"]
            existing.context_window = caps["context_window"]
            existing.vision_support = caps["vision_support"]
            existing.reasoning_support = caps["reasoning_support"]
            existing.model_family = caps["model_family"]
            existing.param_billions = caps["param_billions"]
        else:
            entry = ModelCatalog(
                user_id=user_id,
                provider_id=provider.id,
                model_id=mid,
                provider_name=provider.name,
                is_free=True,
                last_seen_at=now,
                **caps,
            )
            db.add(entry)
    db.commit()


def backfill_classification(db: Session, user_id: UUID) -> int:
    """Re-classify all catalog entries for a user. Returns count updated."""
    entries = (
        db.query(ModelCatalog)
        .filter(ModelCatalog.user_id == user_id)
        .all()
    )
    count = 0
    for entry in entries:
        caps = classify_model(entry.model_id, entry.provider_name)
        entry.speed_score = caps["speed_score"]
        entry.coding_score = caps["coding_score"]
        entry.knowledge_score = caps["knowledge_score"]
        entry.context_window = caps["context_window"]
        entry.vision_support = caps["vision_support"]
        entry.reasoning_support = caps["reasoning_support"]
        entry.model_family = caps["model_family"]
        entry.param_billions = caps["param_billions"]
        count += 1
    db.commit()
    return count


# --------------------------------------------------------------------------- #
# Query helpers                                                                #
# --------------------------------------------------------------------------- #

def get_catalog(db: Session, user_id: UUID, free_only: bool = True) -> list[ModelCatalog]:
    q = db.query(ModelCatalog).filter(
        ModelCatalog.user_id == user_id,
        ModelCatalog.is_enabled == True,
    )
    if free_only:
        q = q.filter(ModelCatalog.is_free == True)
    return q.order_by(ModelCatalog.provider_name, ModelCatalog.model_id).all()


def purge_paid_models(db: Session, user_id: UUID) -> int:
    """Delete all non-free models from the catalog. Returns count deleted."""
    count = (
        db.query(ModelCatalog)
        .filter(ModelCatalog.user_id == user_id, ModelCatalog.is_free == False)
        .delete(synchronize_session="fetch")
    )
    db.commit()
    return count


def mark_free_models(db: Session, user_id: UUID) -> int:
    """Backfill is_free flag on existing catalog entries based on provider presets."""
    entries = db.query(ModelCatalog).filter(ModelCatalog.user_id == user_id).all()
    count = 0
    for entry in entries:
        free = _is_model_free(entry.model_id, entry.provider_name)
        if entry.is_free != free:
            entry.is_free = free
            count += 1
    db.commit()
    return count


def update_model_meta(
    db: Session,
    user_id: UUID,
    provider_id: UUID,
    model_id: str,
    updates: dict,
) -> ModelCatalog | None:
    entry = (
        db.query(ModelCatalog)
        .filter(
            ModelCatalog.user_id == user_id,
            ModelCatalog.provider_id == provider_id,
            ModelCatalog.model_id == model_id,
        )
        .first()
    )
    if not entry:
        return None
    for k, v in updates.items():
        if hasattr(entry, k):
            setattr(entry, k, v)
    db.commit()
    db.refresh(entry)
    return entry
