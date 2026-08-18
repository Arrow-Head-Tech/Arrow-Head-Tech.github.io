"""
GitHub Contents API helpers for reading/writing projects.json and repo metadata.
Token is passed per-call — never stored server-side.
Direct commit to main (no branch/PR). Retries once on 409 Conflict.
"""

import base64
import json
from typing import Any

import requests

HUB_OWNER = "Arrow-Head-Tech"
HUB_REPO  = "Arrow-Head-Tech.github.io"
PROJECTS_PATH = "content/projects.json"
BASE_BRANCH = "main"

VALID_PHASES = {"idea", "prototype", "dev", "stg", "prod", "archived", "dropped"}


def _api(
    method: str,
    path: str,
    token: str,
    *,
    json_body: dict | None = None,
    params: dict | None = None,
    extra_headers: dict | None = None,
) -> requests.Response:
    url = f"https://api.github.com{path}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if extra_headers:
        headers.update(extra_headers)
    return requests.request(
        method, url, headers=headers, json=json_body, params=params, timeout=30
    )


def _sanitize_unicode(obj: Any) -> Any:
    if isinstance(obj, dict):
        return {k: _sanitize_unicode(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_sanitize_unicode(x) for x in obj]
    if isinstance(obj, str):
        return obj.encode("utf-8", errors="replace").decode("utf-8")
    return obj


def get_projects_json(token: str) -> tuple[list, str]:
    """Return (projects_list, blob_sha) from main."""
    path = f"/repos/{HUB_OWNER}/{HUB_REPO}/contents/{PROJECTS_PATH}"
    r = _api("GET", path, token, params={"ref": BASE_BRANCH})
    r.raise_for_status()
    data = r.json()
    content = base64.b64decode(data["content"]).decode("utf-8", errors="replace")
    projects = json.loads(content)
    if not isinstance(projects, list):
        projects = []
    return _sanitize_unicode(projects), data["sha"]


def _commit_projects(token: str, projects: list, sha: str, message: str) -> str:
    """Commit updated projects list to main. Returns new commit sha."""
    new_content = json.dumps(projects, indent=2, ensure_ascii=False) + "\n"
    new_content_b64 = base64.b64encode(new_content.encode("utf-8")).decode("ascii")
    path = f"/repos/{HUB_OWNER}/{HUB_REPO}/contents/{PROJECTS_PATH}"
    r = _api(
        "PUT", path, token,
        json_body={"message": message, "content": new_content_b64, "sha": sha, "branch": BASE_BRANCH},
    )
    r.raise_for_status()
    return r.json()["commit"]["sha"]


def update_project_in_json(
    token: str, project_id: str, updates: dict
) -> dict | None:
    """
    Apply updates to a project entry and commit to main.
    Retries once on 409 Conflict (SHA race).
    Returns { id, committed_sha, updated_fields } or None if project not found.
    """
    for attempt in range(2):
        projects, sha = get_projects_json(token)
        idx = next((i for i, p in enumerate(projects) if p.get("id") == project_id), None)
        if idx is None:
            return None

        updated_fields = []
        for field, value in updates.items():
            if projects[idx].get(field) != value:
                projects[idx][field] = value
                updated_fields.append(field)

        if not updated_fields:
            return {"id": project_id, "committed_sha": None, "updated_fields": []}

        message = f"ui: update {project_id} ({', '.join(updated_fields)})"
        try:
            committed_sha = _commit_projects(token, projects, sha, message)
            return {"id": project_id, "committed_sha": committed_sha, "updated_fields": updated_fields}
        except requests.HTTPError as e:
            if e.response is not None and e.response.status_code == 409 and attempt == 0:
                continue  # retry with fresh SHA
            raise

    return None  # unreachable


def update_repo_metadata(
    token: str,
    owner: str,
    repo_name: str,
    *,
    description: str | None = None,
    topics: list[str] | None = None,
) -> dict:
    """
    Update a repo's description and/or topics via GitHub API.
    Returns { description_updated, topics_updated }.
    """
    description_updated = False
    topics_updated = False

    if description is not None:
        r = _api("PATCH", f"/repos/{owner}/{repo_name}", token,
                 json_body={"description": description})
        r.raise_for_status()
        description_updated = True

    if topics is not None:
        r = _api(
            "PUT", f"/repos/{owner}/{repo_name}/topics", token,
            json_body={"names": topics},
            extra_headers={"Accept": "application/vnd.github.mercy-preview+json"},
        )
        r.raise_for_status()
        topics_updated = True

    return {"description_updated": description_updated, "topics_updated": topics_updated}
