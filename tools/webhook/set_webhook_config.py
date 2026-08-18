#!/usr/bin/env python3
"""
Atualiza a configuração do webhook do GitHub App via API (JWT).
Lê .env; opcionalmente aceita --url e --secret na linha de comando.
Uso: python set_webhook_config.py [--url URL] [--secret SECRET]
     Se omitir, usa WEBHOOK_SECRET e WEBHOOK_URL do .env (WEBHOOK_URL opcional, default smee).
"""

import argparse
import os
import sys
import time
from pathlib import Path

import jwt
import requests

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")

JWT_EXPIRY = 60
API = "https://api.github.com"
DEFAULT_WEBHOOK_URL = "https://smee.io/Kj01DEle4IOoCdQ"


def get_jwt() -> str:
    app_id = os.environ.get("GITHUB_APP_ID", "").strip()
    if not app_id:
        raise SystemExit("GITHUB_APP_ID não definido no .env")
    key = os.environ.get("GITHUB_APP_PRIVATE_KEY", "").strip()
    if not key.startswith("-----BEGIN"):
        key = Path(key).read_text()
    now = int(time.time())
    payload = {"iat": now, "exp": now + JWT_EXPIRY, "iss": app_id}
    encoded = jwt.encode(payload, key, algorithm="RS256")
    return encoded if isinstance(encoded, str) else encoded.decode("utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Atualiza webhook URL e secret do GitHub App")
    parser.add_argument("--url", default=os.environ.get("WEBHOOK_URL", DEFAULT_WEBHOOK_URL), help="Webhook URL")
    parser.add_argument("--secret", default=os.environ.get("WEBHOOK_SECRET", ""), help="Webhook secret")
    args = parser.parse_args()

    url = (args.url or "").strip()
    secret = (args.secret or "").strip()
    if not url:
        print("Erro: URL do webhook é obrigatória (--url ou WEBHOOK_URL no .env)", file=sys.stderr)
        return 1
    if not secret:
        print("Erro: Secret do webhook é obrigatório (--secret ou WEBHOOK_SECRET no .env)", file=sys.stderr)
        return 1

    token = get_jwt()
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    body = {"url": url, "content_type": "json", "secret": secret}

    r = requests.patch(f"{API}/app/hook/config", headers=headers, json=body, timeout=15)
    if not r.ok:
        print(f"Erro {r.status_code}: {r.text}", file=sys.stderr)
        return 1
    data = r.json()
    print("Webhook config atualizado:")
    print(f"  URL: {data.get('url')}")
    print(f"  Content-Type: {data.get('content_type')}")
    print(f"  Secret: {'***' if data.get('secret') else '(não retornado)'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
