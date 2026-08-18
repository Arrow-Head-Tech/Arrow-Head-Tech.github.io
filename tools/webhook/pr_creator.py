"""
Create a PR on the hub repo adding a new project entry to content/projects.json.
Uses GitHub App installation token. Caller is responsible for obtaining the token.
"""

import base64
import json
import re
import time
from typing import Any

import requests

HUB_OWNER = "Arrow-Head-Tech"
HUB_REPO = "Arrow-Head-Tech.github.io"
PROJECTS_PATH = "content/projects.json"
BASE_BRANCH = "main"


def slug(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return s or "project"


def new_entry(
    name: str,
    repo_url: str,
    *,
    phase: str = "idea",
    primary_language: str = "Unknown",
    primary_stack: str = "Unknown",
    tags: list[str] | None = None,
    short_description: str = "TBD",
    owner: str = "Arrow-Head-Tech",
    project_id: str | None = None,
) -> dict[str, Any]:
    id_ = project_id or slug(name)
    return {
        "id": id_,
        "name": name,
        "repo_url": repo_url,
        "phase": phase,
        "primary_language": primary_language,
        "primary_stack": primary_stack,
        "tags": tags or [],
        "short_description": short_description,
        "owner": owner,
    }


def _sanitize_unicode(obj: Any) -> Any:
    """Ensure no surrogate code points so JSON/UTF-8 encode never fails."""
    if isinstance(obj, dict):
        return {k: _sanitize_unicode(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_sanitize_unicode(x) for x in obj]
    if isinstance(obj, str):
        return obj.encode("utf-8", errors="replace").decode("utf-8")
    return obj


def _api(
    method: str,
    path: str,
    token: str,
    *,
    json_body: dict | None = None,
    params: dict | None = None,
) -> requests.Response:
    url = f"https://api.github.com{path}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    return requests.request(
        method, url, headers=headers, json=json_body, params=params, timeout=30
    )


def repo_exists(token: str, owner: str, repo_name: str) -> bool:
    """Return True if the repository exists and the App can see it."""
    path = f"/repos/{owner}/{repo_name}"
    r = _api("GET", path, token)
    return r.status_code == 200


def get_file_sha_and_content(token: str, ref: str) -> tuple[str, list]:
    """Get current projects.json content and its blob sha for the given ref (branch or main)."""
    path = f"/repos/{HUB_OWNER}/{HUB_REPO}/contents/{PROJECTS_PATH}"
    r = _api("GET", path, token, params={"ref": ref})
    r.raise_for_status()
    data = json.loads(r.content.decode("utf-8", errors="replace"))
    content_b64 = data.get("content", "")
    content = base64.b64decode(content_b64).decode("utf-8", errors="replace")
    projects = json.loads(content)
    if not isinstance(projects, list):
        projects = []
    return data.get("sha", ""), _sanitize_unicode(projects)


def project_id_exists(projects: list[dict], project_id: str) -> bool:
    return any(p.get("id") == project_id for p in projects)


def create_branch_from_main(token: str, new_branch: str) -> str:
    """Create branch from main; return its ref (e.g. refs/heads/bot/...)."""
    ref_path = f"/repos/{HUB_OWNER}/{HUB_REPO}/git/refs/heads/{BASE_BRANCH}"
    r = _api("GET", ref_path, token)
    r.raise_for_status()
    main_sha = r.json()["object"]["sha"]

    r = _api(
        "POST",
        f"/repos/{HUB_OWNER}/{HUB_REPO}/git/refs",
        token,
        json_body={"ref": f"refs/heads/{new_branch}", "sha": main_sha},
    )
    r.raise_for_status()
    return f"refs/heads/{new_branch}"


def update_projects_on_branch(
    token: str, branch: str, new_entry_dict: dict[str, Any]
) -> None:
    """Append new entry to projects.json on the given branch (create/update file)."""
    file_sha, projects = get_file_sha_and_content(token, branch)
    projects.append(new_entry_dict)
    projects.sort(key=lambda p: (p.get("name") or "").lower())
    new_content = json.dumps(projects, indent=2, ensure_ascii=False)
    new_content_b64 = base64.b64encode(new_content.encode("utf-8", errors="replace")).decode("ascii")

    path = f"/repos/{HUB_OWNER}/{HUB_REPO}/contents/{PROJECTS_PATH}"
    r = _api(
        "PUT",
        path,
        token,
        json_body={
            "message": f"bot: add repo {new_entry_dict.get('name', '')} to hub",
            "content": new_content_b64,
            "sha": file_sha,
            "branch": branch,
        },
    )
    r.raise_for_status()


def create_pull_request(
    token: str, branch: str, repo_name: str, repo_url: str
) -> dict[str, Any]:
    """Open a PR from branch to main."""
    path = f"/repos/{HUB_OWNER}/{HUB_REPO}/pulls"
    r = _api(
        "POST",
        path,
        token,
        json_body={
            "title": f"Add repository: {repo_name}",
            "body": f"Automated PR: new repo created in the org.\n\n- **Repo:** [{repo_name}]({repo_url})\n- Entry added with default phase `idea` and placeholders (Unknown/TBD). Please edit if needed before merging.",
            "head": branch,
            "base": BASE_BRANCH,
        },
    )
    r.raise_for_status()
    return _sanitize_unicode(r.json())


def create_pr_for_new_repo(
    token: str,
    repo_name: str,
    repo_url: str,
    repo_owner: str = "Arrow-Head-Tech",
) -> dict[str, Any] | None:
    """
    Create a branch, add a new project entry to projects.json, and open a PR.
    Returns the PR payload or None if skipped (e.g. id already exists).
    """
    project_id = slug(repo_name)
    _, projects = get_file_sha_and_content(token, BASE_BRANCH)
    if project_id_exists(projects, project_id):
        return None

    entry = new_entry(
        name=repo_name,
        repo_url=repo_url,
        owner=repo_owner,
    )
    branch_name = f"bot/add-repo-{project_id}-{int(time.time())}"

    create_branch_from_main(token, branch_name)
    update_projects_on_branch(token, branch_name, entry)
    pr = create_pull_request(token, branch_name, repo_name, repo_url)
    return pr
