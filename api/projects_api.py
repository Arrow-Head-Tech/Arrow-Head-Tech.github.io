"""
Blueprint: project mutation endpoints.

PATCH /api/projects/<id>          — update phase/description/tags in projects.json
PUT   /api/projects/<id>/github-sync — sync repo description + topics on GitHub
"""

from flask import Blueprint, request, jsonify
import requests

from github_contents import (
    VALID_PHASES,
    get_projects_json,
    update_project_in_json,
    update_repo_metadata,
)

bp = Blueprint("projects", __name__)

MUTABLE_FIELDS = {"phase", "short_description", "tags"}


def _token_or_401():
    token = request.headers.get("X-GitHub-Token", "").strip()
    if not token:
        return None, (jsonify({"error": "Missing X-GitHub-Token header"}), 401)
    return token, None


@bp.route("/api/projects/<project_id>", methods=["PATCH"])
def patch_project(project_id):
    token, err = _token_or_401()
    if err:
        return err

    body = request.get_json(silent=True) or {}
    updates = {k: v for k, v in body.items() if k in MUTABLE_FIELDS}

    if not updates:
        return jsonify({"error": "No mutable fields provided"}), 422

    if "phase" in updates and updates["phase"] not in VALID_PHASES:
        return jsonify({"error": f"Invalid phase '{updates['phase']}'", "valid": sorted(VALID_PHASES)}), 422

    if "tags" in updates and not isinstance(updates["tags"], list):
        return jsonify({"error": "'tags' must be an array"}), 422

    try:
        result = update_project_in_json(token, project_id, updates)
    except requests.HTTPError as e:
        status = e.response.status_code if e.response is not None else 502
        return jsonify({"error": f"GitHub API error: {status}"}), 502

    if result is None:
        return jsonify({"error": f"Project '{project_id}' not found"}), 404

    return jsonify(result), 200


@bp.route("/api/projects/<project_id>/github-sync", methods=["PUT"])
def github_sync(project_id):
    token, err = _token_or_401()
    if err:
        return err

    body = request.get_json(silent=True) or {}
    description = body.get("description")
    topics = body.get("topics")

    if description is None and topics is None:
        return jsonify({"error": "Provide 'description' and/or 'topics'"}), 422

    # Look up the project to find owner + repo name
    try:
        projects, _ = get_projects_json(token)
    except requests.HTTPError as e:
        status = e.response.status_code if e.response is not None else 502
        return jsonify({"error": f"GitHub API error fetching projects: {status}"}), 502

    project = next((p for p in projects if p.get("id") == project_id), None)
    if project is None:
        return jsonify({"error": f"Project '{project_id}' not found"}), 404

    repo_url = project.get("repo_url", "")
    # Extract owner/repo from URL: https://github.com/{owner}/{repo}
    parts = [p for p in repo_url.rstrip("/").split("/") if p]
    if len(parts) < 2:
        return jsonify({"error": "Cannot parse repo_url for this project"}), 422
    owner, repo_name = parts[-2], parts[-1]

    try:
        result = update_repo_metadata(
            token, owner, repo_name,
            description=description,
            topics=topics,
        )
    except requests.HTTPError as e:
        status = e.response.status_code if e.response is not None else 502
        return jsonify({"error": f"GitHub API error: {status}"}), 502

    return jsonify(result), 200
