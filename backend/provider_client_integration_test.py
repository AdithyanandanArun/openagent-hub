"""Integration check for the shared provider HTTP client.

Run inside the backend image:
  docker run --rm -e PYTHONDONTWRITEBYTECODE=1 -v "$PWD/backend:/app" -w /app \
    --entrypoint python openagent-backend:beta-test provider_client_integration_test.py
"""
import asyncio
import json

import httpx

from app.core import provider


async def main() -> None:
    await provider.close_http_client()
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        body = json.loads(request.content)
        if body["stream"]:
            sse = (
                'data: {"choices":[{"delta":{"content":"fast "}}]}\n\n'
                'data: {"choices":[{"delta":{"content":"reuse"}}]}\n\n'
                'data: [DONE]\n\n'
            )
            return httpx.Response(200, headers={"content-type": "text/event-stream"}, content=sse)
        return httpx.Response(200, json={"choices": [{"message": {"role": "assistant", "content": "ok"}}]})

    provider._client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    try:
        first = await provider.get_http_client()
        second = await provider.get_http_client()
        assert first is second, "provider calls must reuse one process-wide client"

        chunks = [chunk async for chunk in provider.stream_chat("https://provider.test/v1", "key", "test", [])]
        assert "".join(chunks) == "fast reuse"

        completion = await provider.chat_completion("https://provider.test/v1", "key", "test", [])
        assert completion["content"] == "ok"
        assert len(requests) == 2
        print("shared provider client integration passed")
    finally:
        await provider.close_http_client()


if __name__ == "__main__":
    asyncio.run(main())
