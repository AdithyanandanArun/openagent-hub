"""Redis-backed rate, quota, and concurrent-stream controls.

Development remains dependency-free when REDIS_URL is unset. Production fails
closed when Redis is unavailable so replica-local counters can never silently
replace the shared limits.
"""
from __future__ import annotations

from functools import lru_cache
import logging
from uuid import UUID

from fastapi import HTTPException

from app.core.config import settings

log = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def _client():
    if not settings.REDIS_URL:
        return None
    try:
        import redis
        client = redis.Redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=1,
            socket_timeout=1,
        )
        client.ping()
        return client
    except Exception as exc:  # noqa: BLE001
        if settings.is_production:
            raise HTTPException(status_code=503, detail="Rate limit service is unavailable") from exc
        log.warning("Redis disabled in development: %s", exc)
        return None


def _consume(key: str, limit: int, window_seconds: int, message: str) -> None:
    client = _client()
    if client is None or limit <= 0:
        return
    try:
        with client.pipeline() as pipe:
            pipe.incr(key)
            pipe.expire(key, window_seconds, nx=True)
            count, _ = pipe.execute()
        if int(count) > limit:
            raise HTTPException(status_code=429, detail=message, headers={"Retry-After": str(window_seconds)})
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        if settings.is_production:
            raise HTTPException(status_code=503, detail="Rate limit service is unavailable") from exc
        log.warning("Skipping development rate limit: %s", exc)


def check_auth_request(ip: str, operation: str) -> None:
    _consume(
        f"oah:auth:{operation}:{ip}",
        settings.AUTH_REQUESTS_PER_HOUR,
        3600,
        "Too many authentication requests. Try again later.",
    )


def check_chat_request(user_id: UUID) -> None:
    _consume(
        f"oah:chat:minute:{user_id}",
        settings.CHAT_REQUESTS_PER_MINUTE,
        60,
        "Too many chat requests. Try again shortly.",
    )
    _consume(
        f"oah:chat:day:{user_id}",
        settings.CHAT_REQUESTS_PER_DAY,
        86400,
        "Daily chat request quota reached. Try again tomorrow.",
    )


def acquire_chat_slot(user_id: UUID) -> None:
    client = _client()
    if client is None or settings.MAX_CONCURRENT_CHAT_REQUESTS <= 0:
        return
    key = f"oah:chat:concurrent:{user_id}"
    try:
        with client.pipeline() as pipe:
            pipe.incr(key)
            # A process crash must not reserve a slot indefinitely. Four hours
            # safely exceeds the configured reverse-proxy streaming timeout.
            pipe.expire(key, 4 * 3600, nx=True)
            count, _ = pipe.execute()
        if int(count) > settings.MAX_CONCURRENT_CHAT_REQUESTS:
            client.decr(key)
            raise HTTPException(status_code=429, detail="Too many active chat requests.")
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        if settings.is_production:
            raise HTTPException(status_code=503, detail="Rate limit service is unavailable") from exc
        log.warning("Skipping development concurrent-stream limit: %s", exc)


def release_chat_slot(user_id: UUID) -> None:
    try:
        client = _client()
        if client is None or settings.MAX_CONCURRENT_CHAT_REQUESTS <= 0:
            return
        key = f"oah:chat:concurrent:{user_id}"
        remaining = int(client.decr(key))
        if remaining <= 0:
            client.delete(key)
    except Exception:  # noqa: BLE001
        log.warning("Could not release chat slot", exc_info=True)
