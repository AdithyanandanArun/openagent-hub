"""Transactional email delivery for account verification.

Only the Resend HTTP API is used in production.  The console mode is deliberately
limited to local development and lets developers exercise the full registration
flow without a mail provider.
"""
from __future__ import annotations

import logging

import httpx
from fastapi import HTTPException

from app.core.config import settings

log = logging.getLogger(__name__)


def send_verification_email(email: str, token: str) -> None:
    verify_url = f"{settings.PUBLIC_APP_URL.rstrip('/')}/?verify_token={token}"
    subject = "Verify your OpenAgent Hub email"
    text = (
        "Welcome to OpenAgent Hub. Verify your email address within 24 hours: "
        f"{verify_url}"
    )

    if settings.EMAIL_DELIVERY_MODE == "console":
        if settings.is_production:
            raise HTTPException(status_code=503, detail="Email delivery is unavailable")
        log.warning("Development verification email for %s: %s", email, verify_url)
        return

    if settings.EMAIL_DELIVERY_MODE != "resend" or not settings.RESEND_API_KEY or not settings.EMAIL_FROM:
        raise HTTPException(status_code=503, detail="Email delivery is unavailable")

    try:
        response = httpx.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
            json={"from": settings.EMAIL_FROM, "to": [email], "subject": subject, "text": text},
            timeout=10.0,
        )
        response.raise_for_status()
    except httpx.HTTPError as exc:
        log.warning("Verification email delivery failed: %s", exc)
        raise HTTPException(status_code=503, detail="Unable to send verification email. Try again shortly.") from exc
