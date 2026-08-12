"""Agno agent configured for Vercel AI Gateway + Gemini 2.5 Flash Lite."""

from __future__ import annotations

import os

from agno.agent import Agent
from agno.models.openai.like import OpenAILike

DEFAULT_MODEL_ID = "google/gemini-2.5-flash-lite"
DEFAULT_GATEWAY_BASE_URL = "https://ai-gateway.vercel.sh/v1"
SYSTEM_INSTRUCTION = "請一律以繁體中文回覆。"


def gateway_api_key() -> str | None:
    return os.getenv("AI_GATEWAY_API_KEY")


def gateway_base_url() -> str:
    return os.getenv("AI_GATEWAY_BASE_URL", DEFAULT_GATEWAY_BASE_URL)


def agent_model_id() -> str:
    return os.getenv("AGENT_MODEL_ID", DEFAULT_MODEL_ID)


def is_gateway_configured() -> bool:
    key = gateway_api_key()
    return bool(key and key.strip())


def create_chat_agent() -> Agent:
    api_key = gateway_api_key()
    if not api_key:
        raise RuntimeError("AI_GATEWAY_API_KEY is not configured")

    return Agent(
        id="chat-agent",
        name="Chat Agent",
        model=OpenAILike(
            id=agent_model_id(),
            api_key=api_key,
            base_url=gateway_base_url(),
        ),
        instructions=SYSTEM_INSTRUCTION,
        markdown=True,
    )
