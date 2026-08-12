"""AgentOS application with AG-UI interface and boundary validation."""

from __future__ import annotations

import json
import os
from typing import Any

from agno.os import AgentOS
from agno.os.interfaces.agui import AGUI
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from agent_chat.agent import create_chat_agent, is_gateway_configured
from agent_chat.validation import extract_last_user_message, validate_message

CORS_ORIGINS = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://localhost:3000",
).split(",")

UNAVAILABLE_BODY = {
    "status": "unavailable",
    "detail": "AI Gateway API key not configured",
}


def _unavailable_response(status_code: int = 503, error: str = "unavailable") -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={**UNAVAILABLE_BODY, "error": error},
    )


def _create_degraded_app() -> tuple[FastAPI, None]:
    """Minimal app when AI_GATEWAY_API_KEY is not set (health + contract tests)."""
    app = FastAPI(title="Agent Chat Backend (degraded)")

    @app.get("/status")
    async def status() -> JSONResponse:
        return JSONResponse(status_code=503, content=UNAVAILABLE_BODY)

    @app.post("/agui")
    async def agui() -> JSONResponse:
        return _unavailable_response()

    return app, None


def _create_agent_os_app() -> tuple[FastAPI, AgentOS]:
    chat_agent = create_chat_agent()
    agent_os = AgentOS(
        agents=[chat_agent],
        interfaces=[AGUI(agent=chat_agent)],
        cors_allowed_origins=[origin.strip() for origin in CORS_ORIGINS if origin.strip()],
    )
    app = agent_os.get_app()
    return app, agent_os


class AguiValidationMiddleware(BaseHTTPMiddleware):
    """Validate user messages at the AG-UI boundary before agent execution."""

    async def dispatch(self, request: Request, call_next):
        if request.method == "POST" and request.url.path.rstrip("/") == "/agui":
            try:
                body = await request.body()
                payload: dict[str, Any] = json.loads(body)
            except json.JSONDecodeError:
                return JSONResponse(
                    status_code=400,
                    content={"error": "invalid_request", "detail": "Invalid JSON payload"},
                )

            last_user_message = extract_last_user_message(payload.get("messages", []))
            validation_error = validate_message(last_user_message)
            if validation_error:
                status_code = 422 if "超過" in validation_error else 400
                error_code = "message_too_long" if status_code == 422 else "invalid_request"
                return JSONResponse(
                    status_code=status_code,
                    content={"error": error_code, "detail": validation_error},
                )

            async def receive():
                return {"type": "http.request", "body": body, "more_body": False}

            request = Request(request.scope, receive)

        return await call_next(request)


def create_app() -> tuple[FastAPI, AgentOS | None]:
    if not is_gateway_configured():
        return _create_degraded_app()

    app, agent_os = _create_agent_os_app()
    app.add_middleware(AguiValidationMiddleware)
    return app, agent_os


app, agent_os = create_app()


def main() -> None:
    host = os.getenv("AGENT_OS_HOST", "localhost")
    port = int(os.getenv("AGENT_OS_PORT", "7777"))
    if agent_os is None:
        import uvicorn

        uvicorn.run(app, host=host, port=port)
        return
    agent_os.serve(app="agent_chat.app:app", host=host, port=port, reload=False)


if __name__ == "__main__":
    main()
