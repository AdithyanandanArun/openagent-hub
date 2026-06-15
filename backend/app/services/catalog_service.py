"""
Model catalog service — syncs models from providers and infers capability metadata.
"""
from datetime import datetime
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.model_catalog import ModelCatalog
from app.models.provider import Provider


# --------------------------------------------------------------------------- #
# Capability inference from model IDs                                          #
# --------------------------------------------------------------------------- #

def _infer_capabilities(model_id: str) -> dict:
    mid = model_id.lower()

    # Context window heuristics
    context_window = None
    if any(x in mid for x in ["128k", "128000"]):
        context_window = 128_000
    elif any(x in mid for x in ["200k", "200000"]):
        context_window = 200_000
    elif any(x in mid for x in ["1m", "1000000"]):
        context_window = 1_000_000
    elif any(x in mid for x in ["32k", "32000"]):
        context_window = 32_000
    elif any(x in mid for x in ["8k", "8000"]):
        context_window = 8_000
    # Known context windows by model family
    elif "claude-3-5" in mid or "claude-3.5" in mid:
        context_window = 200_000
    elif "claude-3" in mid:
        context_window = 200_000
    elif "claude-opus-4" in mid or "claude-sonnet-4" in mid or "claude-haiku-4" in mid:
        context_window = 200_000
    elif "gpt-4o" in mid:
        context_window = 128_000
    elif "gpt-4-turbo" in mid:
        context_window = 128_000
    elif "gpt-4" in mid:
        context_window = 8_192
    elif "gpt-3.5" in mid:
        context_window = 16_385
    elif "gemini-1.5" in mid:
        context_window = 1_000_000
    elif "gemini-2" in mid:
        context_window = 1_000_000
    elif "llama-3" in mid and "70b" in mid:
        context_window = 131_072
    elif "llama-3" in mid:
        context_window = 131_072
    elif "mixtral" in mid:
        context_window = 32_768
    elif "deepseek" in mid:
        context_window = 65_536

    # Vision support
    vision_support = any(x in mid for x in [
        "vision", "vl", "visual", "gpt-4o", "gpt-4-turbo",
        "claude-3", "claude-opus-4", "claude-sonnet-4", "claude-haiku-4",
        "gemini", "llava", "pixtral", "qwen-vl",
    ])

    # Reasoning / thinking
    reasoning_support = any(x in mid for x in [
        "o1", "o3", "r1", "thinking", "reasoning", "qwq",
        "deepseek-r1", "claude-opus-4", "claude-sonnet-4",
    ])

    # Coding score (1-10)
    coding_score = 5
    if any(x in mid for x in ["code", "coder", "codestral", "deepseek-coder", "starcoder", "codellama"]):
        coding_score = 9
    elif any(x in mid for x in ["claude-opus", "gpt-4o", "gpt-4-turbo", "claude-3-5-sonnet", "deepseek-r1"]):
        coding_score = 9
    elif any(x in mid for x in ["claude-3-sonnet", "claude-sonnet", "gpt-4"]):
        coding_score = 8
    elif any(x in mid for x in ["mixtral", "llama-3", "qwen"]):
        coding_score = 7
    elif any(x in mid for x in ["haiku", "mini", "flash", "instant", "tiny"]):
        coding_score = 6

    # Speed score (1-10; smaller/faster models score higher)
    speed_score = 5
    if any(x in mid for x in ["haiku", "flash", "instant", "mini", "tiny", "nano"]):
        speed_score = 9
    elif any(x in mid for x in ["small", "3b", "7b", "8b"]):
        speed_score = 8
    elif any(x in mid for x in ["groq", "turbo"]):
        speed_score = 8
    elif any(x in mid for x in ["sonnet", "gpt-4o-mini", "35b"]):
        speed_score = 7
    elif any(x in mid for x in ["70b", "72b"]):
        speed_score = 6
    elif any(x in mid for x in ["opus", "gpt-4"]):
        speed_score = 4
    elif any(x in mid for x in ["o1", "r1", "thinking"]):
        speed_score = 3

    return {
        "context_window": context_window,
        "vision_support": vision_support,
        "reasoning_support": reasoning_support,
        "coding_score": coding_score,
        "speed_score": speed_score,
    }


# --------------------------------------------------------------------------- #
# Sync helpers                                                                 #
# --------------------------------------------------------------------------- #

def sync_provider_models(db: Session, user_id: UUID, provider: Provider, model_ids: list[str]) -> None:
    now = datetime.utcnow()
    for mid in model_ids:
        existing = (
            db.query(ModelCatalog)
            .filter(
                ModelCatalog.user_id == user_id,
                ModelCatalog.provider_id == provider.id,
                ModelCatalog.model_id == mid,
            )
            .first()
        )
        caps = _infer_capabilities(mid)
        if existing:
            existing.last_seen_at = now
            existing.provider_name = provider.name
            # Only update caps that were None — don't overwrite user edits
            if existing.context_window is None:
                existing.context_window = caps["context_window"]
        else:
            entry = ModelCatalog(
                user_id=user_id,
                provider_id=provider.id,
                model_id=mid,
                provider_name=provider.name,
                last_seen_at=now,
                **caps,
            )
            db.add(entry)
    db.commit()


def get_catalog(db: Session, user_id: UUID) -> list[ModelCatalog]:
    return (
        db.query(ModelCatalog)
        .filter(ModelCatalog.user_id == user_id, ModelCatalog.is_enabled == True)
        .order_by(ModelCatalog.provider_name, ModelCatalog.model_id)
        .all()
    )


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
