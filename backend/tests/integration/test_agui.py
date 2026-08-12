"""Integration tests for AG-UI endpoints."""

from __future__ import annotations

import importlib
import os

import pytest
from httpx import ASGITransport, AsyncClient


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
def reload_app(monkeypatch):
    """Reload app module so env changes take effect."""

    def _reload():
        import agent_chat.app as app_module

        return importlib.reload(app_module)

    return _reload


@pytest.mark.asyncio
async def test_status_unavailable_without_gateway_key(reload_app, monkeypatch):
    monkeypatch.delenv("AI_GATEWAY_API_KEY", raising=False)
    app_module = reload_app()

    transport = ASGITransport(app=app_module.app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/status")

    assert response.status_code == 503
    body = response.json()
    assert body["status"] == "unavailable"
    assert "AI Gateway" in body["detail"]


@pytest.mark.asyncio
async def test_status_ok_when_gateway_key_configured(reload_app, monkeypatch):
    monkeypatch.setenv("AI_GATEWAY_API_KEY", "test-gateway-key")
    app_module = reload_app()

    transport = ASGITransport(app=app_module.app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/status")

    assert response.status_code == 200
    body = response.json()
    assert body.get("status") in {"ok", "available"}


@pytest.mark.asyncio
async def test_agui_rejects_empty_message(reload_app, monkeypatch):
    monkeypatch.setenv("AI_GATEWAY_API_KEY", "test-gateway-key")
    app_module = reload_app()

    payload = {
        "threadId": "thread-1",
        "runId": "run-1",
        "messages": [{"id": "m1", "role": "user", "content": "   "}],
        "tools": [],
        "context": [],
        "state": {},
    }

    transport = ASGITransport(app=app_module.app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/agui", json=payload)

    assert response.status_code == 400
    assert response.json()["error"] == "invalid_request"


@pytest.mark.asyncio
async def test_agui_rejects_message_too_long(reload_app, monkeypatch):
    monkeypatch.setenv("AI_GATEWAY_API_KEY", "test-gateway-key")
    app_module = reload_app()

    payload = {
        "threadId": "thread-1",
        "runId": "run-1",
        "messages": [{"id": "m1", "role": "user", "content": "a" * 8001}],
        "tools": [],
        "context": [],
        "state": {},
    }

    transport = ASGITransport(app=app_module.app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/agui", json=payload)

    assert response.status_code == 422
    assert response.json()["error"] == "message_too_long"


@pytest.mark.asyncio
@pytest.mark.skipif(
    not os.getenv("AI_GATEWAY_API_KEY"),
    reason="Requires live AI_GATEWAY_API_KEY for streaming smoke test",
)
async def test_agui_streams_response(reload_app, monkeypatch):
    monkeypatch.setenv("AI_GATEWAY_API_KEY", os.environ["AI_GATEWAY_API_KEY"])
    app_module = reload_app()

    payload = {
        "threadId": "thread-stream",
        "runId": "run-stream",
        "messages": [{"id": "m1", "role": "user", "content": "你好"}],
        "tools": [],
        "context": [],
        "state": {},
        "forwardedProps": {},
    }

    transport = ASGITransport(app=app_module.app)
    async with AsyncClient(transport=transport, base_url="http://test", timeout=60.0) as client:
        async with client.stream("POST", "/agui", json=payload) as response:
            assert response.status_code == 200
            chunks: list[str] = []
            async for chunk in response.aiter_text():
                chunks.append(chunk)
            body = "".join(chunks)
            assert body
