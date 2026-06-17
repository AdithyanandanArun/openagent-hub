"""Reverse-proxy core for the OpenAI-compatible ``/v1`` API.

Forwards an OpenAI-shaped request body to one of the user's providers, with
priority + failover routing reused from ``router_service``. Unlike the agent
pipeline this is a faithful pass-through: it preserves ``usage``, ``tool_calls``,
and the upstream SSE chunks byte-for-byte, so the OpenAI SDK / Codex see exactly
what they expect.
"""
from __future__ import annotations

import json
from typing import AsyncIterator
from uuid import UUID

import httpx
from sqlalchemy.orm import Session

from app.core import crypto
from app.models.provider import Provider
from app.services.router_service import (
    _resolve_attempts,
    _is_on_cooldown,
    _set_cooldown,
)
from app.services.routing_service import is_auto, choose_models
from app.services import key_service

# Control fields we own — everything else is forwarded to the provider verbatim.
_CONTROL_FIELDS = {"model"}


class NoProvidersError(Exception):
    """No enabled provider can serve the requested model."""


def _has_image(messages: list[dict]) -> bool:
    for m in messages:
        content = m.get("content")
        if isinstance(content, list):
            for part in content:
                if isinstance(part, dict) and part.get("type") == "image_url":
                    return True
    return False


def build_attempts(
    db: Session,
    user_id: UUID,
    model: str,
    messages: list[dict],
    preferred_provider_id: str | None = None,
) -> list[tuple[str, Provider]]:
    """Ordered (model_id, provider) attempts for this request."""
    if is_auto(model):
        ranked = choose_models(
            db, user_id, messages, _has_image(messages), preferred_provider_id
        )
        model_order = [(mid, pid) for mid, pid, _reason in ranked]
        attempts = _resolve_attempts(db, user_id, "", preferred_provider_id, model_order)
    else:
        attempts = _resolve_attempts(db, user_id, model, preferred_provider_id, None)
    return attempts


def _forward_payload(body: dict, attempt_model: str, stream: bool) -> dict:
    payload = {k: v for k, v in body.items() if k not in _CONTROL_FIELDS}
    payload["model"] = attempt_model
    payload["stream"] = stream
    return payload


async def completion(
    db: Session,
    user_id: UUID,
    body: dict,
    preferred_provider_id: str | None = None,
) -> dict:
    """Non-streaming completion with failover. Returns upstream JSON verbatim
    (with the requested ``model`` echoed back). Raises NoProvidersError or
    RuntimeError(last_error)."""
    model = body.get("model") or "auto"
    messages = body.get("messages") or []
    attempts = build_attempts(db, user_id, model, messages, preferred_provider_id)
    if not attempts:
        raise NoProvidersError("No enabled providers can serve this model.")

    last_error = "All providers failed."
    for attempt_model, provider in attempts:
        pid = str(provider.id)
        if _is_on_cooldown(pid):
            continue
        headers, pk = _auth_headers(db, provider)
        payload = _forward_payload(body, attempt_model, stream=False)
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                resp = await client.post(
                    f"{provider.base_url}/chat/completions",
                    headers=headers,
                    json=payload,
                )
            if resp.status_code >= 400:
                if resp.status_code == 429:
                    _set_cooldown(pid)
                    provider.status = "rate_limited"
                    if pk:
                        key_service.set_cooldown(db, pk)
                else:
                    provider.status = "error"
                    if pk:
                        key_service.set_error(db, pk, f"HTTP {resp.status_code}")
                db.commit()
                last_error = (
                    f"Provider '{provider.name}' HTTP {resp.status_code}: "
                    f"{resp.text[:300]}"
                )
                continue
            data = resp.json()
            provider.status = "healthy"
            if pk:
                tokens = data.get("usage", {}).get("total_tokens", 0)
                key_service.record_usage(db, pk, dict(resp.headers), tokens)
            db.commit()
            data.setdefault("model", attempt_model)
            return data
        except httpx.HTTPError as exc:
            provider.status = "error"
            if pk:
                key_service.set_error(db, pk, str(exc))
            db.commit()
            last_error = f"Provider '{provider.name}' error: {exc}"

    raise RuntimeError(last_error)


async def stream(
    db: Session,
    user_id: UUID,
    body: dict,
    preferred_provider_id: str | None = None,
) -> AsyncIterator[str]:
    """Streaming completion. Yields raw SSE lines (``data: {...}\\n\\n``) from the
    first provider that starts producing output. Fails over only before the first
    byte — once streaming has begun we are committed to that provider."""
    model = body.get("model") or "auto"
    messages = body.get("messages") or []
    attempts = build_attempts(db, user_id, model, messages, preferred_provider_id)
    if not attempts:
        raise NoProvidersError("No enabled providers can serve this model.")

    last_error = "All providers failed."
    for attempt_model, provider in attempts:
        pid = str(provider.id)
        if _is_on_cooldown(pid):
            continue
        headers, pk = _auth_headers(db, provider)
        payload = _forward_payload(body, attempt_model, stream=True)
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                async with client.stream(
                    "POST",
                    f"{provider.base_url}/chat/completions",
                    headers=headers,
                    json=payload,
                ) as resp:
                    if resp.status_code >= 400:
                        body_text = (await resp.aread()).decode("utf-8", "replace")[:300]
                        if resp.status_code == 429:
                            _set_cooldown(pid)
                            provider.status = "rate_limited"
                            if pk:
                                key_service.set_cooldown(db, pk)
                        else:
                            provider.status = "error"
                            if pk:
                                key_service.set_error(db, pk, f"HTTP {resp.status_code}")
                        db.commit()
                        last_error = (
                            f"Provider '{provider.name}' HTTP {resp.status_code}: {body_text}"
                        )
                        continue
                    provider.status = "healthy"
                    if pk:
                        key_service.record_usage(db, pk, dict(resp.headers))
                    db.commit()
                    async for line in resp.aiter_lines():
                        if line:
                            yield f"{line}\n\n"
                    yield "data: [DONE]\n\n"
                    return
        except httpx.HTTPError as exc:
            provider.status = "error"
            if pk:
                key_service.set_error(db, pk, str(exc))
            db.commit()
            last_error = f"Provider '{provider.name}' error: {exc}"

    raise RuntimeError(last_error)


async def embeddings(
    db: Session,
    user_id: UUID,
    body: dict,
    preferred_provider_id: str | None = None,
) -> dict:
    """Forward an embeddings request with failover. Returns upstream JSON verbatim."""
    model = body.get("model", "")
    attempts = _resolve_attempts(db, user_id, model, preferred_provider_id, None)
    if not attempts:
        raise NoProvidersError("No enabled providers can serve this embedding model.")

    last_error = "All providers failed."
    for attempt_model, provider in attempts:
        pid = str(provider.id)
        if _is_on_cooldown(pid):
            continue
        headers, pk = _auth_headers(db, provider)
        payload = dict(body, model=attempt_model)
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                resp = await client.post(
                    f"{provider.base_url}/embeddings",
                    headers=headers,
                    json=payload,
                )
            if resp.status_code >= 400:
                if resp.status_code == 429:
                    _set_cooldown(pid)
                    provider.status = "rate_limited"
                    if pk:
                        key_service.set_cooldown(db, pk)
                else:
                    provider.status = "error"
                    if pk:
                        key_service.set_error(db, pk, f"HTTP {resp.status_code}")
                db.commit()
                last_error = (
                    f"Provider '{provider.name}' HTTP {resp.status_code}: "
                    f"{resp.text[:300]}"
                )
                continue
            data = resp.json()
            provider.status = "healthy"
            if pk:
                tokens = data.get("usage", {}).get("total_tokens", 0)
                key_service.record_usage(db, pk, dict(resp.headers), tokens)
            db.commit()
            return data
        except httpx.HTTPError as exc:
            provider.status = "error"
            if pk:
                key_service.set_error(db, pk, str(exc))
            db.commit()
            last_error = f"Provider '{provider.name}' error: {exc}"

    raise RuntimeError(last_error)


def _auth_headers(db: Session, provider: Provider):
    """Pick the best ProviderKey (if any) and return (headers_dict, key_or_None)."""
    pk = key_service.pick_key(db, provider)
    if pk:
        plaintext = key_service.decrypt_key(pk)
    else:
        plaintext = crypto.decrypt(provider.api_key)
    headers = {"Content-Type": "application/json"}
    if plaintext and plaintext.strip():
        headers["Authorization"] = f"Bearer {plaintext.strip()}"
    return headers, pk
