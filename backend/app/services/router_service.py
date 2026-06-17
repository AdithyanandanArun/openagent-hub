from datetime import datetime, timedelta
from typing import AsyncIterator
from uuid import UUID

import httpx
from sqlalchemy.orm import Session

from app.models.provider import Provider
from app.core import crypto
from app.core.provider import stream_chat, chat_completion
from app.services import key_service

_cooldowns: dict[str, datetime] = {}
COOLDOWN_SECONDS = 60


def _is_on_cooldown(provider_id: str) -> bool:
    until = _cooldowns.get(provider_id)
    return bool(until and datetime.utcnow() < until)


def _set_cooldown(provider_id: str) -> None:
    _cooldowns[provider_id] = datetime.utcnow() + timedelta(seconds=COOLDOWN_SECONDS)


def _resolve_attempts(
    db: Session,
    user_id: UUID,
    model: str,
    preferred_provider_id: str | None,
    model_order: list[tuple[str, str]] | None,
) -> list[tuple[str, "Provider"]]:
    """Build the ordered list of (model, provider) attempts.

    When `model_order` (list of (model_id, provider_id) pinned pairs from the
    intelligent router) is given, each attempt pins both model and provider.
    Otherwise the legacy behavior: one `model` string across priority-ordered
    providers."""
    by_id: dict[str, Provider] = {
        str(p.id): p
        for p in db.query(Provider)
        .filter(Provider.user_id == user_id, Provider.enabled == True)
        .all()
    }
    if model_order:
        attempts: list[tuple[str, Provider]] = []
        for mid, pid in model_order:
            prov = by_id.get(str(pid))
            if prov is not None:
                attempts.append((mid, prov))
        if attempts:
            return attempts

    # Single model across providers. Crucially, only try providers that ACTUALLY
    # offer this model — otherwise a model unique to one provider (e.g. an LLM7
    # model) gets sent to OpenRouter/Groq, which 400 with "not a valid model ID".
    providers = _ordered_providers(db, user_id, preferred_provider_id)

    from app.models.model_catalog import ModelCatalog
    owners = {
        str(r.provider_id)
        for r in db.query(ModelCatalog.provider_id)
        .filter(ModelCatalog.user_id == user_id, ModelCatalog.model_id == model)
        .all()
    }
    if owners:
        scoped = [p for p in providers if str(p.id) in owners]
        if scoped:
            return [(model, p) for p in scoped]
    if preferred_provider_id:
        return [(model, p) for p in providers if str(p.id) == preferred_provider_id]
    return [(model, p) for p in providers]


async def route_chat(
    db: Session,
    user_id: UUID,
    model: str,
    messages: list[dict],
    preferred_provider_id: str | None = None,
    model_order: list[tuple[str, str]] | None = None,
) -> AsyncIterator[str]:
    attempts = _resolve_attempts(db, user_id, model, preferred_provider_id, model_order)

    if not attempts:
        raise RuntimeError("No enabled providers configured.")

    last_error = "All providers failed."
    for attempt_model, provider in attempts:
        pid = str(provider.id)
        if _is_on_cooldown(pid):
            continue
        pk = key_service.pick_key(db, provider)
        api_key = key_service.decrypt_key(pk) if pk else crypto.decrypt(provider.api_key)
        try:
            yielded_any = False
            async for chunk in stream_chat(
                base_url=provider.base_url,
                api_key=api_key,
                model=attempt_model,
                messages=messages,
            ):
                yielded_any = True
                yield chunk
            if yielded_any or True:
                if pk:
                    key_service.record_usage(db, pk)
                return
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 429:
                _set_cooldown(pid)
                provider.status = "rate_limited"
                if pk:
                    key_service.set_cooldown(db, pk)
            else:
                provider.status = "error"
                if pk:
                    key_service.set_error(db, pk, f"HTTP {exc.response.status_code}")
            db.commit()
            try:
                body_text = exc.response.text[:300]
            except Exception:
                body_text = "(unreadable)"
            last_error = f"Provider '{provider.name}' returned HTTP {exc.response.status_code}: {body_text}"
        except Exception as exc:
            provider.status = "error"
            if pk:
                key_service.set_error(db, pk, str(exc))
            db.commit()
            last_error = f"Provider '{provider.name}' error: {exc}"

    raise RuntimeError(last_error)


def _ordered_providers(
    db: Session, user_id: UUID, preferred_provider_id: str | None
) -> list[Provider]:
    providers: list[Provider] = (
        db.query(Provider)
        .filter(Provider.user_id == user_id, Provider.enabled == True)
        .order_by(Provider.priority, Provider.created_at)
        .all()
    )
    if preferred_provider_id:
        providers = sorted(
            providers,
            key=lambda p: (str(p.id) != preferred_provider_id, p.priority),
        )
    return providers


async def route_completion(
    db: Session,
    user_id: UUID,
    model: str,
    messages: list[dict],
    tools: list[dict] | None = None,
    preferred_provider_id: str | None = None,
    temperature: float = 0.4,
    tool_choice: str = "auto",
    model_order: list[tuple[str, str]] | None = None,
) -> tuple[dict, Provider]:
    """Non-streaming completion with priority routing + failover.

    Returns the assistant message dict together with the provider that served it.
    Raises RuntimeError if every enabled provider fails."""
    attempts = _resolve_attempts(db, user_id, model, preferred_provider_id, model_order)
    if not attempts:
        raise RuntimeError("No enabled providers configured.")

    last_error = "All providers failed."
    for attempt_model, provider in attempts:
        pid = str(provider.id)
        if _is_on_cooldown(pid):
            continue
        pk = key_service.pick_key(db, provider)
        api_key = key_service.decrypt_key(pk) if pk else crypto.decrypt(provider.api_key)
        try:
            message = await chat_completion(
                base_url=provider.base_url,
                api_key=api_key,
                model=attempt_model,
                messages=messages,
                tools=tools,
                temperature=temperature,
                tool_choice=tool_choice,
            )
            if pk:
                key_service.record_usage(db, pk)
            return message, provider
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 429:
                _set_cooldown(pid)
                provider.status = "rate_limited"
                if pk:
                    key_service.set_cooldown(db, pk)
            else:
                provider.status = "error"
                if pk:
                    key_service.set_error(db, pk, f"HTTP {exc.response.status_code}")
            db.commit()
            try:
                body_text = exc.response.text[:300]
            except Exception:
                body_text = "(unreadable)"
            last_error = f"Provider '{provider.name}' returned HTTP {exc.response.status_code}: {body_text}"
        except Exception as exc:
            provider.status = "error"
            if pk:
                key_service.set_error(db, pk, str(exc))
            db.commit()
            last_error = f"Provider '{provider.name}' error: {exc}"

    raise RuntimeError(last_error)
