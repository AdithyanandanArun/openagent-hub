"""Redis-backed rate, quota, and concurrent-stream controls.

Development remains dependency-free when REDIS_URL is unset. Production fails
closed when Redis is unavailable so replica-local counters can never silently
replace the shared limits.
"""
from __future__ import annotations

from functools import lru_cache
import logging
from datetime import datetime, timedelta
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


def chat_usage(user_id: UUID) -> dict[str, int | datetime | None]:
    """Return the current shared Redis counters for a user's settings page."""
    client = _client()
    if client is None:
        return {
            "chat_requests_this_minute": 0,
            "chat_requests_today": 0,
            "minute_reset_at": None,
            "day_reset_at": None,
        }
    minute_key = f"oah:chat:minute:{user_id}"
    day_key = f"oah:chat:day:{user_id}"
    try:
        minute_used, day_used, minute_ttl, day_ttl = client.pipeline().get(minute_key).get(day_key).ttl(minute_key).ttl(day_key).execute()
        now = datetime.utcnow()
        return {
            "chat_requests_this_minute": int(minute_used or 0),
            "chat_requests_today": int(day_used or 0) if settings.CHAT_REQUESTS_PER_DAY > 0 else 0,
            "minute_reset_at": now + timedelta(seconds=int(minute_ttl)) if int(minute_ttl) > 0 else None,
            "day_reset_at": now + timedelta(seconds=int(day_ttl)) if settings.CHAT_REQUESTS_PER_DAY > 0 and int(day_ttl) > 0 else None,
        }
    except Exception as exc:  # noqa: BLE001
        if settings.is_production:
            raise HTTPException(status_code=503, detail="Rate limit service is unavailable") from exc
        log.warning("Skipping development usage lookup: %s", exc)
        return {
            "chat_requests_this_minute": 0,
            "chat_requests_today": 0,
            "minute_reset_at": None,
            "day_reset_at": None,
        }
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
