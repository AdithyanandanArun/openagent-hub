from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

from fastapi import Header, HTTPException, status

from app.core.config import settings


@dataclass(frozen=True)
class ProviderSettings:
    api_key: str
    base_url: str


def normalize_provider_base_url(base_url: str) -> str:
    cleaned = base_url.rstrip("/")
    parsed = urlsplit(cleaned)
    if not parsed.hostname:
        return cleaned

    is_docker = Path("/.dockerenv").exists()
    if not is_docker or parsed.hostname not in {"localhost", "127.0.0.1", "::1"}:
        return cleaned

    netloc = "host.docker.internal"
    if parsed.port:
        netloc = f"{netloc}:{parsed.port}"
    return urlunsplit((parsed.scheme, netloc, parsed.path, parsed.query, parsed.fragment))


async def get_provider_settings(
    x_provider_api_key: str | None = Header(default=None),
    x_provider_base_url: str | None = Header(default=None),
) -> ProviderSettings:
    api_key = x_provider_api_key or settings.OPENAI_API_KEY
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Configure an AI provider API key before using models or chat",
        )
    return ProviderSettings(
        api_key=api_key,
        base_url=normalize_provider_base_url(x_provider_base_url or settings.OPENAI_BASE_URL),
    )
