"""
Blueprint: POST /api/chat
Proxies the idea-flow conversation to the configured LLM.
"""

from flask import Blueprint, request, jsonify
import requests

from llm_proxy import call_llm
from prompts import get_system_prompt

bp = Blueprint("chat", __name__)


@bp.route("/api/chat", methods=["POST"])
def chat():
    api_key = request.headers.get("X-LLM-Key", "").strip()
    if not api_key:
        return jsonify({"error": "Missing X-LLM-Key header"}), 401

    provider       = request.headers.get("X-LLM-Provider", "openai").strip() or "openai"
    custom_base    = request.headers.get("X-LLM-Base-URL", "").strip()

    body     = request.get_json(silent=True) or {}
    messages = body.get("messages", [])
    phase    = body.get("phase", "understand")
    flow     = body.get("flow", "idea-flow")

    if not isinstance(messages, list):
        return jsonify({"error": "'messages' must be an array"}), 422

    system_prompt = get_system_prompt(phase, flow)

    try:
        content = call_llm(
            provider=provider,
            api_key=api_key,
            messages=messages,
            system_prompt=system_prompt,
            custom_base_url=custom_base,
        )
    except requests.HTTPError as e:
        status = e.response.status_code if e.response is not None else 502
        detail = ""
        try:
            detail = e.response.json().get("error", {}).get("message", "")
        except Exception:
            pass
        return jsonify({"error": f"LLM upstream error {status}", "detail": detail}), 502
    except Exception as e:
        return jsonify({"error": f"LLM error: {str(e)}"}), 502

    return jsonify({"role": "assistant", "content": content}), 200
