"""Transactional email delivery for account verification and recovery.

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


def _send_email(email: str, subject: str, text: str) -> None:
    if settings.EMAIL_DELIVERY_MODE == "console":
        if settings.is_production:
            raise HTTPException(status_code=503, detail="Email delivery is unavailable")
        log.warning("Development email for %s: %s", email, text)
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
        log.warning("Transactional email delivery failed: %s", exc)
        raise HTTPException(status_code=503, detail="Unable to send email. Try again shortly.") from exc


def send_verification_email(email: str, token: str) -> None:
    verify_url = f"{settings.PUBLIC_APP_URL.rstrip('/')}/?verify_token={token}"
    _send_email(
        email,
        "Verify your OpenAgent Hub email",
        "Welcome to OpenAgent Hub. Verify your email address within 24 hours: "
        f"{verify_url}",
    )


def send_password_reset_email(email: str, token: str) -> None:
    reset_url = f"{settings.PUBLIC_APP_URL.rstrip('/')}/?reset_token={token}"
    _send_email(
        email,
        "Reset your OpenAgent Hub password",
        "A password reset was requested for your OpenAgent Hub account. "
        "This link expires in one hour: "
        f"{reset_url}\n\nIf you did not request it, you can ignore this email.",
    )
