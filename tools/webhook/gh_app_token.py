"""
Obtain a GitHub App installation access token (JWT -> POST /app/installations/{id}/access_tokens).
"""

import time
from pathlib import Path

import jwt
import requests

# Default: 10 min expiry; GitHub allows max 60 min
JWT_EXPIRY_SECONDS = 600


def get_installation_token(
    app_id: str,
    private_key_pem: str,
    installation_id: str,
) -> str:
    """
    Generate a JWT for the app and exchange it for an installation access token.
    private_key_pem: full PEM string (including -----BEGIN/END-----).
    """
    now = int(time.time())
    payload = {
        "iat": now,
        "exp": now + JWT_EXPIRY_SECONDS,
        "iss": app_id,
    }
    encoded = jwt.encode(
        payload,
        private_key_pem,
        algorithm="RS256",
    )
    if hasattr(encoded, "decode"):
        encoded = encoded.decode("utf-8")

    r = requests.post(
        f"https://api.github.com/app/installations/{installation_id}/access_tokens",
        headers={
            "Authorization": f"Bearer {encoded}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        },
        timeout=10,
    )
    r.raise_for_status()
    return r.json()["token"]


def load_private_key(path: str | Path) -> str:
    """Load PEM from file path or from env-style path."""
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"Private key not found: {p}")
    return p.read_text()
