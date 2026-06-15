from datetime import datetime, timedelta
from typing import AsyncIterator
from uuid import UUID

import httpx
from sqlalchemy.orm import Session

from app.models.provider import Provider
from app.core.provider import stream_chat, chat_completion

_cooldowns: dict[str, datetime] = {}
COOLDOWN_SECONDS = 60


def _is_on_cooldown(provider_id: str) -> bool:
    until = _cooldowns.get(provider_id)
    return bool(until and datetime.utcnow() < until)


def _set_cooldown(provider_id: str) -> None:
    _cooldowns[provider_id] = datetime.utcnow() + timedelta(seconds=COOLDOWN_SECONDS)


async def route_chat(
    db: Session,
    user_id: UUID,
    model: str,
    messages: list[dict],
    preferred_provider_id: str | None = None,
) -> AsyncIterator[str]:
    providers: list[Provider] = (
        db.query(Provider)
        .filter(Provider.user_id == user_id, Provider.enabled == True)
        .order_by(Provider.priority, Provider.created_at)
        .all()
    )

    if not providers:
        raise RuntimeError("No enabled providers configured.")

    if preferred_provider_id:
        providers = sorted(
            providers,
            key=lambda p: (str(p.id) != preferred_provider_id, p.priority),
        )

    last_error = "All providers failed."
    for provider in providers:
        pid = str(provider.id)
        if _is_on_cooldown(pid):
            continue
        try:
            yielded_any = False
            async for chunk in stream_chat(
                base_url=provider.base_url,
                api_key=provider.api_key,
                model=model,
                messages=messages,
            ):
                yielded_any = True
                yield chunk
            if yielded_any or True:
                return
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 429:
                _set_cooldown(pid)
                provider.status = "rate_limited"
            else:
                provider.status = "error"
            db.commit()
            last_error = f"Provider '{provider.name}' returned HTTP {exc.response.status_code}."
        except Exception as exc:
            provider.status = "error"
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
) -> tuple[dict, Provider]:
    """Non-streaming completion with priority routing + failover.

    Returns the assistant message dict together with the provider that served it.
    Raises RuntimeError if every enabled provider fails."""
    providers = _ordered_providers(db, user_id, preferred_provider_id)
    if not providers:
        raise RuntimeError("No enabled providers configured.")

    last_error = "All providers failed."
    for provider in providers:
        pid = str(provider.id)
        if _is_on_cooldown(pid):
            continue
        try:
            message = await chat_completion(
                base_url=provider.base_url,
                api_key=provider.api_key,
                model=model,
                messages=messages,
                tools=tools,
                temperature=temperature,
            )
            return message, provider
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 429:
                _set_cooldown(pid)
                provider.status = "rate_limited"
            else:
                provider.status = "error"
            db.commit()
            last_error = f"Provider '{provider.name}' returned HTTP {exc.response.status_code}."
        except Exception as exc:
            provider.status = "error"
            db.commit()
            last_error = f"Provider '{provider.name}' error: {exc}"

    raise RuntimeError(last_error)
