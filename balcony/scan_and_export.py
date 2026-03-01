#!/usr/bin/env python3
"""
BALCONY — Scan a local projects folder and export content/projects.json for the hub.
Run from repo root or from balcony/:  python balcony/scan_and_export.py
Uses BALCONY_TARGET_FOLDER (env or .env) as the path to scan.
"""

import json
import os
import re
from pathlib import Path

# Optional: load .env from balcony/ or repo root
try:
    from dotenv import load_dotenv
    _balcony_dir = Path(__file__).resolve().parent
    load_dotenv(_balcony_dir / ".env")
    load_dotenv(_balcony_dir.parent / ".env")
except ImportError:
    pass

# Repo root = parent of balcony/
REPO_ROOT = Path(__file__).resolve().parent.parent
CONTENT_JSON = REPO_ROOT / "content" / "projects.json"

# Folder name → phase (plan: 1.IDEA, 2.SCRATCH, 3.PROTOTYPE, 4.HML, 5.PROD, 6.ARCHIVED, 7.DROPPED)
PHASE_FOLDERS = {
    "1.IDEA": "idea",
    "2.SCRATCH": "test",
    "3.PROTOTYPE": "dev",
    "4.HML": "dev",
    "5.PROD": "prod",
    "6.ARCHIVED": "archived",
    "7.DROPPED": "dropped",
}
DEFAULT_PHASE = "idea"
ORG_GITHUB = "Arrow-Head-Tech"


def slug(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return s or "project"


def read_first_line(readme_path: Path, max_len: int = 200) -> str:
    try:
        with open(readme_path, "r", encoding="utf-8", errors="ignore") as f:
            line = f.readline().strip()
            line = re.sub(r"^#+\s*", "", line)
            return (line[:max_len] + "…") if len(line) > max_len else line
    except Exception:
        return "TBD"


def detect_language(project_path: Path) -> str:
    """Heuristic: look for common files to guess primary language."""
    for ext, lang in [
        (".py", "Python"),
        (".ts", "TypeScript"),
        (".js", "JavaScript"),
        (".go", "Go"),
        (".rs", "Rust"),
        (".java", "Java"),
        (".html", "HTML"),
        (".php", "PHP"),
        (".rb", "Ruby"),
    ]:
        if list(project_path.rglob(f"*{ext}"))[:3]:
            return lang
    return "Unknown"


def collect_projects(target: Path) -> list[dict]:
    if not target.is_dir():
        return []

    projects = []
    subdirs = [d for d in target.iterdir() if d.is_dir() and not d.name.startswith(".")]
    subdir_names = {d.name.upper() for d in subdirs}

    # Check if this level is phase folders (e.g. 1.IDEA, 2.SCRATCH)
    phase_keys_upper = {k.upper(): k for k in PHASE_FOLDERS}
    is_phase_level = bool(subdir_names & set(phase_keys_upper))

    if is_phase_level:
        for phase_folder_name, phase_value in PHASE_FOLDERS.items():
            phase_path = target / phase_folder_name
            if not phase_path.is_dir():
                continue
            for project_dir in phase_path.iterdir():
                if not project_dir.is_dir() or project_dir.name.startswith("."):
                    continue
                name = project_dir.name
                projects.append(build_entry(project_dir, name, phase_value))
    else:
        for project_dir in subdirs:
            name = project_dir.name
            projects.append(build_entry(project_dir, name, DEFAULT_PHASE))

    return sorted(projects, key=lambda p: p["name"].lower())


def build_entry(project_path: Path, name: str, phase: str) -> dict:
    id_ = slug(name)
    repo_url = f"https://github.com/{ORG_GITHUB}/{name}"
    readme = next(
        (f for f in ["README.md", "Readme.md", "readme.md"] if (project_path / f).exists()),
        None,
    )
    short_description = read_first_line(project_path / readme) if readme else "TBD"
    primary_language = detect_language(project_path)

    return {
        "id": id_,
        "name": name,
        "repo_url": repo_url,
        "phase": phase,
        "primary_language": primary_language,
        "primary_stack": primary_language,
        "tags": [],
        "short_description": short_description,
        "owner": ORG_GITHUB,
    }


def main() -> None:
    target_raw = os.environ.get("BALCONY_TARGET_FOLDER", "").strip()
    if not target_raw:
        print("Error: set BALCONY_TARGET_FOLDER to the path of your local projects folder.")
        print("Example: export BALCONY_TARGET_FOLDER=/Users/you/Projects")
        print("Or copy balcony/.env.example to balcony/.env and set the path there.")
        raise SystemExit(1)

    target = Path(target_raw).expanduser().resolve()
    if not target.exists():
        print(f"Error: BALCONY_TARGET_FOLDER does not exist: {target}")
        raise SystemExit(1)

    projects = collect_projects(target)
    CONTENT_JSON.parent.mkdir(parents=True, exist_ok=True)
    with open(CONTENT_JSON, "w", encoding="utf-8") as f:
        json.dump(projects, f, indent=2, ensure_ascii=False)

    print(f"Exported {len(projects)} project(s) to {CONTENT_JSON}")


if __name__ == "__main__":
    main()
