"""
Arrowhead Tech — API backend
Runs on :5001 by default. Configure ALLOWED_ORIGINS in .env.
"""

import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

from projects_api import bp as projects_bp
from chat_api import bp as chat_bp

app = Flask(__name__)

# ── CORS ─────────────────────────────────────────────────────────
_raw_origins = os.environ.get("ALLOWED_ORIGINS", "http://localhost:8000")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

CORS(
    app,
    origins=ALLOWED_ORIGINS,
    allow_headers=["Content-Type", "X-GitHub-Token", "X-LLM-Key", "X-LLM-Provider", "X-LLM-Base-URL"],
    methods=["GET", "POST", "PATCH", "PUT", "OPTIONS"],
)

# ── Blueprints ────────────────────────────────────────────────────
app.register_blueprint(projects_bp)
app.register_blueprint(chat_bp)


# ── Health ────────────────────────────────────────────────────────
@app.route("/api/health")
def health():
    return jsonify({"status": "ok"}), 200


# ── Entry point ───────────────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug=True)
