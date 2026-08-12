"""Unit tests for message validation."""

import pytest

from agent_chat.validation import (
    EMPTY_MESSAGE_ERROR,
    MAX_MESSAGE_LENGTH,
    MESSAGE_TOO_LONG_ERROR,
    extract_last_user_message,
    validate_message,
)


@pytest.mark.parametrize(
    "content",
    [None, "", "   ", "\n\t"],
)
def test_validate_message_rejects_empty(content):
    assert validate_message(content) == EMPTY_MESSAGE_ERROR


def test_validate_message_accepts_valid_message():
    assert validate_message("你好") is None


def test_validate_message_rejects_too_long():
    content = "a" * (MAX_MESSAGE_LENGTH + 1)
    assert validate_message(content) == MESSAGE_TOO_LONG_ERROR


def test_validate_message_accepts_max_length():
    content = "a" * MAX_MESSAGE_LENGTH
    assert validate_message(content) is None


def test_extract_last_user_message():
    messages = [
        {"role": "user", "content": "第一則"},
        {"role": "assistant", "content": "回覆"},
        {"role": "user", "content": "第二則"},
    ]
    assert extract_last_user_message(messages) == "第二則"


def test_extract_last_user_message_empty_list():
    assert extract_last_user_message([]) is None
