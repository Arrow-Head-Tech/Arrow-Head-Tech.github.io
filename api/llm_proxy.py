"""
LLM dispatch: OpenAI-compatible (openai, custom) and Anthropic.
All credentials are read from function parameters — never persisted.
"""

import requests

OPENAI_BASE = "https://api.openai.com/v1"
ANTHROPIC_BASE = "https://api.anthropic.com"

DEFAULT_MODEL_OPENAI = "gpt-4o-mini"
DEFAULT_MODEL_ANTHROPIC = "claude-3-5-haiku-20241022"


def _call_openai_compat(
    api_key: str,
    base_url: str,
    messages: list[dict],
    system_prompt: str,
) -> str:
    """Call an OpenAI-compatible chat completions endpoint."""
    all_messages = [{"role": "system", "content": system_prompt}] + messages
    url = base_url.rstrip("/") + "/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    body = {
        "model": DEFAULT_MODEL_OPENAI,
        "messages": all_messages,
    }
    r = requests.post(url, headers=headers, json=body, timeout=60)
    r.raise_for_status()
    return r.json()["choices"][0]["message"]["content"]


def _call_anthropic(
    api_key: str,
    messages: list[dict],
    system_prompt: str,
) -> str:
    """Call Anthropic Messages API (system prompt goes in top-level field)."""
    url = f"{ANTHROPIC_BASE}/v1/messages"
    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
    }
    body = {
        "model": DEFAULT_MODEL_ANTHROPIC,
        "max_tokens": 2048,
        "system": system_prompt,
        "messages": messages,
    }
    r = requests.post(url, headers=headers, json=body, timeout=60)
    r.raise_for_status()
    return r.json()["content"][0]["text"]


def call_llm(
    provider: str,
    api_key: str,
    messages: list[dict],
    system_prompt: str,
    custom_base_url: str = "",
) -> str:
    """
    Dispatch to the right LLM backend.
    provider: "openai" | "anthropic" | "custom"
    Raises requests.HTTPError on upstream errors.
    """
    if provider == "anthropic":
        return _call_anthropic(api_key, messages, system_prompt)
    elif provider == "custom":
        base = custom_base_url or OPENAI_BASE
        return _call_openai_compat(api_key, base, messages, system_prompt)
    else:  # default: openai
        return _call_openai_compat(api_key, OPENAI_BASE, messages, system_prompt)
