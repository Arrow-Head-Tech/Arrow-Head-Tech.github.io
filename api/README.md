# Arrowhead Tech — API Backend

Flask backend for GitHub mutations and LLM proxying.

## Setup

```bash
pip install -r requirements.txt
cp .env.example .env  # configure ALLOWED_ORIGINS
python app.py         # listens on :5001
```

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Health check (used by Settings "Test connection") |
| PATCH | `/api/projects/:id` | Update phase/description/tags in `projects.json` on `main` |
| PUT | `/api/projects/:id/github-sync` | Sync repo description + topics to GitHub |
| POST | `/api/chat` | Proxy to LLM API (OpenAI / Anthropic / custom) |

## Request Headers

Secrets are sent per-request and **never stored** by the backend:

| Header | Purpose |
|--------|---------|
| `X-GitHub-Token` | PAT for GitHub API (scopes: `repo` or fine-grained Contents R/W) |
| `X-LLM-Key` | LLM API key |
| `X-LLM-Provider` | `openai` \| `anthropic` \| `custom` (default: `openai`) |
| `X-LLM-Base-URL` | Base URL for custom OpenAI-compatible endpoints |

## Mixed Content Warning

GitHub Pages is served over **HTTPS**. Browsers block requests from HTTPS pages to plain HTTP backends. Options for production use:

1. **ngrok** (easiest for local dev): `ngrok http 5001` → use the `https://` URL in Settings
2. **Deploy with HTTPS**: run `api/` behind a reverse proxy (nginx + Let's Encrypt, Railway, Fly.io, etc.)
3. **Browser flag** (dev only, Chrome): disable mixed content blocking for your Pages domain
