# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Commands

### Frontend (static site)
```bash
npm ci                              # install Node dependencies
npm run validate                    # validate projects.json against schema (always run before committing data changes)
npm run build                       # build dist/ from site/ + content/

# Dev server (reads content/ directly — no build needed)
python3 -m http.server 8000
# open http://localhost:8000/site/

# Or serve the built output
npm run build && npx serve dist
```

### API backend
```bash
cd api
pip install -r requirements.txt
cp .env.example .env                # set ALLOWED_ORIGINS
python app.py                       # listens on :5001 by default
```

### Python subsystems — `tools/` (each has its own `requirements.txt` and optional `.venv`)
```bash
# BALCONY — local folder scanner
pip install -r tools/balcony/requirements.txt
export BALCONY_TARGET_FOLDER=/path/to/projects
python tools/balcony/scan_and_export.py

# POTTS — CLI for projects.json
python tools/potts/hub_writer.py list
python tools/potts/hub_writer.py add "Name" "https://github.com/Arrow-Head-Tech/name" [phase]

# Webhook — org-level GitHub App events (separate concern from api/)
pip install -r tools/webhook/requirements.txt
cp tools/webhook/.env.example tools/webhook/.env  # fill in secrets
python tools/webhook/app.py
```

## Project Vision

Arrowhead Tech is **not just a website** — it is a personal platform for managing a portfolio of ideas and projects, combining:

- A visual catalog of initiatives (cards, kanban, table views)
- A maturity model (phases) to track lifecycle from idea to production
- Sync with real artifacts (local filesystem via BALCONY, GitHub repos via API/Webhook)
- AI-assisted automation for idea qualification and project evolution
- **Settings-driven configuration**: LLM and GitHub integrations are user-configured at runtime via the Settings panel, never hardcoded

## Architecture

This is a **monorepo** with five loosely coupled subsystems:

```
Browser (static, GitHub Pages)
  │  localStorage: arrowhead_settings (PAT, LLM key, api_base_url)
  │  per-request headers: X-GitHub-Token, X-LLM-Key
  ▼
api/ Flask backend
  ├── PATCH /api/projects/:id            → update projects.json on main via GitHub Contents API
  ├── PUT   /api/projects/:id/github-sync → update repo description + topics
  ├── POST  /api/chat                    → proxy to LLM API (OpenAI / Anthropic / custom)
  └── GET   /api/health

Scanner (BALCONY)  ──┐
POTTS CLI          ──┤──▶  content/projects.json  ──▶  npm run build  ──▶  dist/  ──▶  GitHub Pages
Webhook (Flask)    ──┘        (source of truth)
```

### Data layer — `content/`
- `projects.json` — the **single source of truth**. All subsystems read/write here.
- `schema/projects.schema.json` — Ajv schema enforced by `npm run validate` and CI. Required fields: `id`, `name`, `repo_url`, `phase`, `primary_language`, `primary_stack`, `tags`, `short_description`. Phase enum: `idea | prototype | dev | stg | prod | archived | dropped`.
- `taxonomy/phases.json` — phase metadata consumed by the frontend.

### Static site — `site/` → `dist/`
`scripts/build.js` copies `site/` and `content/` into `dist/`. No bundler.

`site/app.js` is a vanilla JS SPA that:
- Auto-detects whether it's being served from `site/` or `dist/` to set `CONTENT_BASE`
- Fetches `projects.json` and `taxonomy/phases.json` at runtime
- Manages filter state (phase, language, stack, tags), search, three views (cards/kanban/table), and a tag-CRUD modal backed by `localStorage`

`site/settings.js` — shared module providing the Settings modal to both `index.html` and `chat.html`.

`site/chat.js` — New Idea chat flow with phase-based conversation and LLM integration.

### API backend — `api/`
Flask application, **independent from `tools/webhook/`**. Receives secrets per-request via headers, never persists them.

Required env vars:
- `ALLOWED_ORIGINS` — comma-separated list of allowed CORS origins
- `PORT` — server port (default 5001)

**Security model:**
- PAT and LLM key are **never persisted** by the backend — read from request headers, used once, discarded.
- CORS is locked to `ALLOWED_ORIGINS`.
- For production: deploy `api/` with HTTPS; GitHub Pages enforces HTTPS, so a mixed HTTP/HTTPS call will be blocked by browsers.

### BALCONY — `tools/balcony/`
Scans a local folder tree organised by phase subfolders (`1.IDEA/`, `2.SCRATCH/`, `3.PROTOTYPE/`, `4.HML/`, `5.PROD/`, `6.ARCHIVED/`, `7.DROPPED/`) and writes entries to `content/projects.json`. Fields like tags and descriptions are scaffolded as placeholders for manual editing.

### POTTS — `tools/potts/`
Python module + CLI for programmatic read/write of `projects.json`. Used by the webhook and usable standalone.

```python
from hub_writer import load_projects, add_project, new_entry, update_project
```

### Webhook — `tools/webhook/`
Flask app that receives GitHub `repository.created` org events, then opens a PR against this repo adding the new project entry. Separate concern from the `api/` backend. Required env vars: `WEBHOOK_SECRET`, `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_APP_INSTALLATION_ID`. See `docs/GITHUB-APP-SETUP.md` for full setup — notably, the GitHub App must be created under a user account (not the org) to reliably receive `repository` events.

### CI/CD — `.github/workflows/`
- `ci.yml` — runs on every push/PR to `main`: `npm ci` → `npm run validate` → `npm run build`
- `deploy.yml` — additionally deploys `dist/` to GitHub Pages on push to `main`
- The `api/` backend is **not** deployed by CI — it is self-hosted or deployed separately.

## Settings

The **Settings panel** (gear icon, available in both main app and chat) stores configuration in `localStorage` under `arrowhead_settings`:

| Field | Purpose |
|---|---|
| `github_pat` | PAT for GitHub API mutations (required scopes: `repo`, fine-grained: Contents R/W) |
| `api_base_url` | URL of the `api/` backend (e.g. `http://localhost:5001`) |
| `llm_provider` | `openai` \| `anthropic` \| `custom` |
| `llm_api_key` | LLM API key |
| `llm_custom_base_url` | Base URL for custom OpenAI-compatible endpoints |

Secrets are sent to the backend as request headers (`X-GitHub-Token`, `X-LLM-Key`) and are **never stored server-side**.

## Maturity Model

Projects move through phases. The `phase` field in `projects.json` represents **maturity**, not operational/work status.

| Schema value | Concept | Promotion criterion |
|---|---|---|
| `idea` | Capture & qualify the idea | Passes minimum qualification (see below) |
| `prototype` | PoC — prove viability | Practical exploration showed it's worth continuing |
| `dev` | Active development pipeline | Most projects live here |
| `stg` | Deployed, usable remotely by the author alone | Author can use it outside local machine |
| `prod` | In use by multiple people | More than one user consuming it |
| `archived` | Ended — preserved as record/reference | — |
| `dropped` | Stopped before consolidating value | — |

**Two dimensions are deliberately separate:**
- `phase` = maturity stage (idea → prod)
- Operational status (backlog / in-progress / paused) is a *different* dimension, not encoded in phase

### Idea stage & `context.md`
When working on a project in `idea` phase, the expected output is a `context.md` file containing: description, answers to qualification questions, hypotheses, differentials, alternatives found, open questions, and next direction. The AI role at this stage is **critical analyst** — challenge the idea, identify gaps, research existing alternatives, structure the analysis.

### AI role per phase
- **idea**: provoke, criticise, identify gaps, research alternatives, produce `context.md`
- **prototype (PoC)**: suggest fast implementation paths, raise risks, help decide on promotion to dev
- **dev**: decompose work, suggest next tasks, review architecture and decisions
- **stg**: validate deploy readiness, suggest real-use checklist
- **prod**: support observability, organise multi-user feedback, prioritise evolution

## Important notes
If a prompt start with "!", it means "Think hard". This is a reminder to the AI to deeply consider the question and provide a thoughtful, well-reasoned response. It encourages the AI to go beyond surface-level answers and engage in critical thinking before generating a reply. Remember that the number of "!" could mean the level of depth required in the response, with more "!" indicating a need for even more thorough consideration. The levels can go from "!" (basic depth) to "!!!" (extremely deep and comprehensive analysis). Always pay attention to these cues in the prompts to ensure you are providing the most relevant and insightful answers possible.