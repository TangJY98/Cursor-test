"""Pure message validation helpers for chat boundary checks."""

from __future__ import annotations

MAX_MESSAGE_LENGTH = 8000

EMPTY_MESSAGE_ERROR = "訊息不可為空白"
MESSAGE_TOO_LONG_ERROR = f"訊息不可超過 {MAX_MESSAGE_LENGTH} 個字元"


def validate_message(content: str | None) -> str | None:
    """Return an error message if invalid, or None if valid."""
    if content is None or not content.strip():
        return EMPTY_MESSAGE_ERROR
    if len(content) > MAX_MESSAGE_LENGTH:
        return MESSAGE_TOO_LONG_ERROR
    return None


def extract_last_user_message(messages: list[dict]) -> str | None:
    """Extract content from the last user message in an AG-UI message list."""
    for message in reversed(messages):
        if message.get("role") == "user":
            content = message.get("content")
            if isinstance(content, str):
                return content
    return None
