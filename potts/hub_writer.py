#!/usr/bin/env python3
"""
POTTS — Hub writer: read/write content/projects.json (schema-aware).
Run from repo root or from potts/:  python potts/hub_writer.py  or  python -m potts.hub_writer
"""

import json
import re
import sys
from pathlib import Path

# Repo root = parent of potts/
REPO_ROOT = Path(__file__).resolve().parent.parent
PROJECTS_JSON = REPO_ROOT / "content" / "projects.json"

PHASES = ("idea", "test", "dev", "stg", "prod", "archived", "dropped")
REQUIRED = ("id", "name", "repo_url", "phase", "primary_language", "primary_stack", "tags", "short_description")
OPTIONAL = ("owner", "team", "created_at", "last_updated", "status_notes", "visibility", "links")


def slug(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return s or "project"


def get_repo_root() -> Path:
    return REPO_ROOT


def get_projects_path() -> Path:
    return PROJECTS_JSON


def load_projects() -> list[dict]:
    if not PROJECTS_JSON.exists():
        return []
    with open(PROJECTS_JSON, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data if isinstance(data, list) else []


def save_projects(projects: list[dict]) -> None:
    PROJECTS_JSON.parent.mkdir(parents=True, exist_ok=True)
    with open(PROJECTS_JSON, "w", encoding="utf-8") as f:
        json.dump(projects, f, indent=2, ensure_ascii=False)


def validate_entry(entry: dict) -> None:
    for key in REQUIRED:
        if key not in entry:
            raise ValueError(f"Missing required field: {key}")
    if not re.match(r"^[a-z0-9-]+$", entry.get("id", "")):
        raise ValueError("id must be a slug (lowercase, hyphens only)")
    if entry.get("phase") not in PHASES:
        raise ValueError(f"phase must be one of: {PHASES}")


def add_project(entry: dict) -> None:
    validate_entry(entry)
    projects = load_projects()
    if any(p.get("id") == entry["id"] for p in projects):
        raise ValueError(f"Project id already exists: {entry['id']}")
    projects.append(entry)
    projects.sort(key=lambda p: p.get("name", "").lower())
    save_projects(projects)


def find_project(project_id: str) -> dict | None:
    for p in load_projects():
        if p.get("id") == project_id:
            return p
    return None


def update_project(project_id: str, updates: dict) -> bool:
    projects = load_projects()
    for i, p in enumerate(projects):
        if p.get("id") == project_id:
            merged = {**p, **updates}
            validate_entry(merged)
            projects[i] = merged
            save_projects(projects)
            return True
    return False


def new_entry(
    name: str,
    repo_url: str,
    *,
    phase: str = "idea",
    primary_language: str = "Unknown",
    primary_stack: str | None = None,
    tags: list[str] | None = None,
    short_description: str = "TBD",
    owner: str = "Arrow-Head-Tech",
    project_id: str | None = None,
) -> dict:
    id_ = project_id or slug(name)
    return {
        "id": id_,
        "name": name,
        "repo_url": repo_url,
        "phase": phase if phase in PHASES else "idea",
        "primary_language": primary_language,
        "primary_stack": primary_stack or primary_language,
        "tags": tags or [],
        "short_description": short_description,
        "owner": owner,
    }


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: python hub_writer.py list | add <name> <repo_url> [phase] | get <id>")
        return 0
    cmd = sys.argv[1].lower()
    if cmd == "list":
        projects = load_projects()
        for p in projects:
            print(f"  {p.get('id')}: {p.get('name')} ({p.get('phase')})")
        print(f"Total: {len(projects)}")
        return 0
    if cmd == "get":
        if len(sys.argv) < 3:
            print("Usage: hub_writer.py get <id>")
            return 1
        p = find_project(sys.argv[2])
        if not p:
            print("Not found")
            return 1
        print(json.dumps(p, indent=2, ensure_ascii=False))
        return 0
    if cmd == "add":
        if len(sys.argv) < 4:
            print("Usage: hub_writer.py add <name> <repo_url> [phase]")
            return 1
        name, repo_url = sys.argv[2], sys.argv[3]
        phase = sys.argv[4] if len(sys.argv) > 4 else "idea"
        entry = new_entry(name, repo_url, phase=phase)
        try:
            add_project(entry)
            print(f"Added: {entry['id']}")
            return 0
        except ValueError as e:
            print(f"Error: {e}")
            return 1
    print("Unknown command. Use: list | add | get")
    return 1


if __name__ == "__main__":
    sys.exit(main())
