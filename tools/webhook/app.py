"""
Webhook receiver for GitHub App: repository created -> PR on hub.
Set env (ou use .env): GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY (PEM string or path), GITHUB_APP_INSTALLATION_ID, WEBHOOK_SECRET.
"""

from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent / ".env")

import hashlib
import hmac
import json
import os
import re
from flask import Flask, request, jsonify

from gh_app_token import get_installation_token
from pr_creator import create_pr_for_new_repo, repo_exists

app = Flask(__name__)

# Dedupe: in-memory set of "owner/name" we already handled this process run (optional; for burst dedupe)
_seen: set[str] = set()
_SEEN_MAX = 500


def _get_secret() -> bytes:
    s = os.environ.get("WEBHOOK_SECRET", "").strip()
    if not s:
        raise ValueError("WEBHOOK_SECRET is not set")
    return s.encode("utf-8")


def _get_private_key() -> str:
    key = os.environ.get("GITHUB_APP_PRIVATE_KEY", "").strip()
    if not key:
        raise ValueError("GITHUB_APP_PRIVATE_KEY is not set")
    # Support inline PEM or path
    if key.startswith("-----BEGIN"):
        return key
    from pathlib import Path
    if Path(key).exists():
        return Path(key).read_text()
    return key


def verify_signature(payload_body: bytes, signature_header: str) -> bool:
    if not signature_header or not signature_header.startswith("sha256="):
        return False
    expected = signature_header.removeprefix("sha256=").strip()
    secret = _get_secret()
    computed = hmac.new(secret, payload_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(computed, expected)


def _installation_token() -> str:
    app_id = os.environ.get("GITHUB_APP_ID", "").strip()
    inst_id = os.environ.get("GITHUB_APP_INSTALLATION_ID", "").strip()
    if not app_id or not inst_id:
        raise ValueError("GITHUB_APP_ID and GITHUB_APP_INSTALLATION_ID must be set")
    return get_installation_token(app_id, _get_private_key(), inst_id)


@app.route("/", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "hub-webhook"})


@app.route("/", methods=["POST"])
@app.route("/webhook", methods=["POST"])
def webhook():
    sig = request.headers.get("X-Hub-Signature-256", "")
    payload = request.get_data()
    if not verify_signature(payload, sig):
        return jsonify({"error": "invalid signature"}), 401

    try:
        event = request.headers.get("X-GitHub-Event", "")
        data = json.loads(payload) if payload else {}
    except json.JSONDecodeError:
        return jsonify({"error": "invalid json"}), 400

    if event != "repository":
        return jsonify({"status": "ignored", "event": event}), 200

    action = data.get("action")
    if action != "created":
        return jsonify({"status": "ignored", "action": action}), 200

    repo = data.get("repository") or {}
    repo_name = repo.get("name", "")
    repo_full_name = repo.get("full_name", "")
    # html_url is the repo page
    repo_url = repo.get("html_url", "") or repo.get("clone_url", "")
    owner = (repo.get("owner") or {}).get("login", "Arrow-Head-Tech")

    if not repo_name or not re.match(r"^[a-zA-Z0-9_.-]+$", repo_name):
        return jsonify({"error": "invalid repo name"}), 400

    # Dedupe: same repo in same process
    if repo_full_name in _seen:
        return jsonify({"status": "duplicate", "repo": repo_full_name}), 200
    _seen.add(repo_full_name)
    if len(_seen) > _SEEN_MAX:
        _seen.clear()

    try:
        token = _installation_token()
    except Exception as e:
        return jsonify({"error": "token failed", "detail": str(e)}), 500

    if not repo_exists(token, owner, repo_name):
        return jsonify({
            "status": "skipped",
            "reason": "repository not found (event may be from a test or stale payload)",
            "repo": repo_full_name,
        }), 200

    try:
        pr = create_pr_for_new_repo(token, repo_name, repo_url, owner)
    except Exception as e:
        detail = str(e).encode("utf-8", errors="replace").decode("utf-8")
        return jsonify({"error": "pr creation failed", "detail": detail}), 500

    if pr is None:
        return jsonify({"status": "skipped", "reason": "project id already exists", "repo": repo_full_name}), 200

    return jsonify({
        "status": "created",
        "repo": repo_full_name,
        "pr_url": pr.get("html_url"),
        "pr_number": pr.get("number"),
    }), 201


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8080"))
    app.run(host="0.0.0.0", port=port, debug=os.environ.get("FLASK_DEBUG", "").lower() in ("1", "true"))
