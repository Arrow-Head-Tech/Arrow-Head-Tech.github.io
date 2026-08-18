#!/usr/bin/env python3
"""Redeliver a webhook delivery via GitHub API (JWT). Use: python redeliver.py [delivery_id]"""

import os
import sys
import time
from pathlib import Path

import jwt
import requests

# Load .env
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent / ".env")

JWT_EXPIRY = 60
API = "https://api.github.com"


def get_jwt() -> str:
    app_id = os.environ.get("GITHUB_APP_ID", "").strip()
    key = os.environ.get("GITHUB_APP_PRIVATE_KEY", "").strip()
    if not key.startswith("-----BEGIN"):
        key = Path(key).read_text()
    now = int(time.time())
    payload = {"iat": now, "exp": now + JWT_EXPIRY, "iss": app_id}
    encoded = jwt.encode(payload, key, algorithm="RS256")
    return encoded if isinstance(encoded, str) else encoded.decode("utf-8")


def main() -> int:
    token = get_jwt()
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if len(sys.argv) > 1:
        delivery_id = sys.argv[1]
    else:
        r = requests.get(f"{API}/app/hook/deliveries", headers=headers, params={"per_page": 25}, timeout=10)
        r.raise_for_status()
        deliveries = r.json()
        for d in deliveries:
            if d.get("event") == "repository" and d.get("action") == "created":
                delivery_id = str(d["id"])
                print(f"Using delivery_id={delivery_id} (repository/created)")
                break
        else:
            if deliveries:
                delivery_id = str(deliveries[0]["id"])
                print(f"No repository/created found, using first: {delivery_id} (event={deliveries[0].get('event')})")
            else:
                print("No deliveries found.")
                return 1
    r = requests.post(f"{API}/app/hook/deliveries/{delivery_id}/attempts", headers=headers, timeout=10)
    r.raise_for_status()
    print(f"Redeliver accepted (202) for delivery_id={delivery_id}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
