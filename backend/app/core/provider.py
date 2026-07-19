import json
from typing import AsyncIterator
import httpx


# Provider calls are on the critical path for every response. Reusing one async
# client preserves DNS/TLS/TCP connections across requests instead of paying a
# new connection setup penalty for each chat turn or agent tool round.
_client: httpx.AsyncClient | None = None


async def start_http_client() -> None:
    """Create the process-wide provider client during application startup."""
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            timeout=httpx.Timeout(connect=10.0, read=120.0, write=30.0, pool=10.0),
            limits=httpx.Limits(max_connections=100, max_keepalive_connections=20, keepalive_expiry=45.0),
        )


async def close_http_client() -> None:
    """Release persistent provider connections during graceful shutdown."""
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None


async def get_http_client() -> httpx.AsyncClient:
    """Return the shared client, remaining safe for direct module-level use in tests."""
    await start_http_client()
    assert _client is not None
    return _client


def _auth_headers(api_key: str | None) -> dict:
    """Build request headers, omitting Authorization when there's no key.

    Keyless free providers (e.g. LLM7, local Ollama) reject `Bearer ` with an
    empty value — httpx raises 'Illegal header value' — so we must drop the
    header entirely rather than send a blank token."""
    headers = {"Content-Type": "application/json"}
    if api_key and api_key.strip():
        headers["Authorization"] = f"Bearer {api_key.strip()}"
    return headers


async def stream_chat(
    base_url: str,
    api_key: str,
    model: str,
    messages: list[dict],
    temperature: float = 0.7,
) -> AsyncIterator[str]:
    headers = _auth_headers(api_key)
    payload = {
        "model": model,
        "messages": messages,
        "stream": True,
        "temperature": temperature,
    }

    client = await get_http_client()
    async with client.stream(
        "POST",
        f"{base_url}/chat/completions",
        headers=headers,
        json=payload,
    ) as response:
        if response.status_code >= 400:
            body = (await response.aread()).decode("utf-8", "replace")[:500]
            raise httpx.HTTPStatusError(
                f"HTTP {response.status_code}: {body}",
                request=response.request,
                response=response,
            )
        async for line in response.aiter_lines():
            if line.startswith("data: "):
                data = line[6:]
                if data == "[DONE]":
                    break
                try:
                    chunk = json.loads(data)
                    delta = chunk["choices"][0].get("delta", {})
                    if content := delta.get("content"):
                        yield content
                except (json.JSONDecodeError, KeyError, IndexError):
                    continue


async def chat_completion(
    base_url: str,
    api_key: str,
    model: str,
    messages: list[dict],
    tools: list[dict] | None = None,
    temperature: float = 0.4,
    timeout: float = 120.0,
    tool_choice: str = "auto",
) -> dict:
    """Non-streaming chat completion. Returns the assistant message dict
    (which may contain `content` and/or `tool_calls`). Used by the agent runtime."""
    headers = _auth_headers(api_key)
    payload: dict = {
        "model": model,
        "messages": messages,
        "stream": False,
        "temperature": temperature,
    }
    if tools:
        payload["tools"] = tools
        payload["tool_choice"] = tool_choice

    client = await get_http_client()
    response = await client.post(
        f"{base_url}/chat/completions",
        headers=headers,
        json=payload,
        timeout=timeout,
    )
    if response.status_code >= 400:
        # Surface the upstream error body — providers explain *why* a 400
        # happened (bad tool schema, unsupported field, etc.); swallowing it
        # makes failures undebuggable.
        body = response.text[:500]
        raise httpx.HTTPStatusError(
            f"HTTP {response.status_code}: {body}",
            request=response.request,
            response=response,
        )
    data = response.json()
    choices = data.get("choices")
    if not choices:
        raise RuntimeError(f"Provider returned no choices: {str(data)[:300]}")
    message = choices[0].get("message")
    if message is None:
        raise RuntimeError(f"Provider response missing message: {str(data)[:300]}")
    return message


async def fetch_models(base_url: str, api_key: str) -> list[str]:
    headers = _auth_headers(api_key)
    client = await get_http_client()
    response = await client.get(f"{base_url}/models", headers=headers, timeout=30.0)
    response.raise_for_status()
    data = response.json()
    return [m["id"] for m in data.get("data", [])]
