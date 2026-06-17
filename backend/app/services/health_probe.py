"""Background health probes for providers.

Periodically hits each provider's ``/models`` endpoint and updates
``Provider.status`` + ``Provider.last_checked_at``.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime

import httpx
from sqlalchemy.orm import Session

from app.core import crypto
from app.core.database import SessionLocal
from app.models.provider import Provider

log = logging.getLogger(__name__)

PROBE_INTERVAL = 120  # seconds between health-check rounds


async def _check_one(provider_id, base_url: str, api_key_enc: str) -> tuple[str, str | None]:
    """Return (status, error_or_None)."""
    try:
        plaintext = crypto.decrypt(api_key_enc)
        headers = {}
        if plaintext and plaintext.strip():
            headers["Authorization"] = f"Bearer {plaintext.strip()}"
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{base_url}/models", headers=headers)
        if resp.status_code == 429:
            return "rate_limited", None
        if resp.status_code >= 400:
            return "error", f"HTTP {resp.status_code}"
        return "healthy", None
    except Exception as exc:
        return "error", str(exc)[:200]


async def _probe_round() -> None:
    db: Session = SessionLocal()
    try:
        providers = db.query(Provider).filter(Provider.enabled == True).all()
        if not providers:
            return

        tasks = []
        for p in providers:
            tasks.append(_check_one(p.id, p.base_url, p.api_key))

        results = await asyncio.gather(*tasks, return_exceptions=True)

        for p, result in zip(providers, results):
            if isinstance(result, Exception):
                p.status = "error"
            else:
                status, _err = result
                p.status = status
            p.last_checked_at = datetime.utcnow()

        db.commit()
    except Exception:
        log.exception("Health probe round failed")
        db.rollback()
    finally:
        db.close()


async def run_health_probes() -> None:
    while True:
        await asyncio.sleep(PROBE_INTERVAL)
        try:
            await _probe_round()
        except Exception:
            log.exception("Health probe loop error")
