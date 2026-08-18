#!/usr/bin/env node
/**
 * Sync SMARTER_HOME_ROADMAP.md to GitHub Project via gh CLI.
 * Creates Epics, Features, Stories, and Tasks as Issues.
 *
 * Usage:
 *   node sync-roadmap-to-gh.js [--dry-run] [--config path] [--limit N] [--offset N]
 *   node sync-roadmap-to-gh.js --dedupe-only   # deduplicate only, delete duplicates
 *   node sync-roadmap-to-gh.js --link-only     # link hierarchy only
 *   node sync-roadmap-to-gh.js --no-dedupe     # sync + link without dedupe
 *   node sync-roadmap-to-gh.js --no-link       # dedupe + sync without link
 *   node sync-roadmap-to-gh.js --status-only   # update project status only (no create/dedupe/link)
 *
 * Prerequisites: gh auth refresh -s project
 * Config: Edit gh-sync-config.json — set projectTitle (from gh project list --owner Arrow-Head-Tech) to add issues to the project.
 */

const { readFileSync, writeFileSync } = require("fs");
const { dirname, join } = require("path");
const { execSync } = require("child_process");

const ROOT = join(__dirname, "..");

// --- Dedupe: list issues with label roadmap (paginated) ---
function listRoadmapIssues(config) {
  const [owner, repo] = config.repo.split("/");
  const all = [];
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const url = `repos/${owner}/${repo}/issues?labels=roadmap&state=all&per_page=100&page=${page}`;
    const out = execSync(`gh api ${escapeShell(url)}`, { encoding: "utf-8", shell: true });
    const batch = JSON.parse(out);
    // Filter out pull requests (issues have no pull_request key)
    const issues = batch.filter((i) => !i.pull_request);
    all.push(...issues);
    hasMore = batch.length === 100; // use batch.length so we paginate even if some are PRs
    page++;
  }
  return all;
}

// --- Dedupe: delete duplicates, keep lowest number per title ---
function runDedupe(config) {
  const [owner, repo] = config.repo.split("/");
  const issues = listRoadmapIssues(config);
  const byTitle = new Map();
  for (const i of issues) {
    const key = i.title;
    if (!byTitle.has(key)) byTitle.set(key, []);
    byTitle.get(key).push({ number: i.number, id: i.id });
  }
  let deleted = 0;
  for (const [title, list] of byTitle) {
    if (list.length <= 1) continue;
    list.sort((a, b) => a.number - b.number);
    const keep = list[0];
    for (let i = 1; i < list.length; i++) {
      const dup = list[i];
      console.log(`Deleting duplicate #${dup.number} (keeping #${keep.number}): ${title}`);
      try {
        execSync(`gh issue delete ${dup.number} --yes -R ${config.repo}`, { stdio: "pipe", shell: true });
        deleted++;
      } catch (err) {
        console.error(`Failed to delete #${dup.number}:`, err.message);
      }
      if (config.delayMs > 0) {
        const start = Date.now();
        while (Date.now() - start < config.delayMs) {}
      }
    }
  }
  console.log(`Dedupe done. Deleted ${deleted} duplicate(s).`);
  return deleted;
}

// --- Link: get internal id of an issue ---
function getIssueId(config, number) {
  const [owner, repo] = config.repo.split("/");
  try {
    const out = execSync(`gh api repos/${owner}/${repo}/issues/${number}`, { encoding: "utf-8", shell: true });
    const obj = JSON.parse(out);
    return obj.id;
  } catch (err) {
    return null;
  }
}

// --- Link: build canonicalId from title (E1, F1.1, S1.1.1, T1.2.1.1) ---
function titleToCanonicalId(title) {
  const m = title.match(/^(E\d+)\s+[—–-]/);
  if (m) return m[1];
  const mf = title.match(/^(F\d+\.\d+)\s+[—–-]/);
  if (mf) return mf[1];
  const ms = title.match(/^S*(\d+\.\d+\.\d+)\s+[—–-]/); // handles S1.1.1 or SS1.1.1
  if (ms) return `S${ms[1]}`;
  const mt = title.match(/^(T\d+(?:\.\d+)+)\s/);
  if (mt) return mt[1];
  return null;
}

// --- Link: run sub-issue linking ---
function runLink(config, parsed) {
  const [owner, repo] = config.repo.split("/");
  const issues = listRoadmapIssues(config);
  const idMap = new Map(); // canonicalId -> { number, id }
  for (const i of issues) {
    const cid = titleToCanonicalId(i.title);
    if (!cid) continue;
    if (!idMap.has(cid) || i.number < idMap.get(cid).number) {
      idMap.set(cid, { number: i.number, id: i.id });
    }
  }
  const pairs = [];
  for (const f of parsed.features) {
    if (idMap.has(f.epicId) && idMap.has(f.id)) {
      pairs.push({ parentId: f.epicId, childId: f.id });
    }
  }
  for (const s of parsed.stories) {
    if (idMap.has(s.featureId) && idMap.has(s.id)) {
      pairs.push({ parentId: s.featureId, childId: s.id });
    }
  }
  for (const t of parsed.tasks) {
    const parentId = t.storyId || t.featureId;
    if (parentId && idMap.has(parentId) && idMap.has(t.id)) {
      pairs.push({ parentId, childId: t.id });
    }
  }
  let linked = 0;
  for (const { parentId, childId } of pairs) {
    const parent = idMap.get(parentId);
    const child = idMap.get(childId);
    if (!parent || !child) continue;
    try {
      execSync(
        `gh api -X POST repos/${owner}/${repo}/issues/${parent.number}/sub_issues -F sub_issue_id=${child.id}`,
        { stdio: "pipe", shell: true }
      );
      linked++;
      if (linked % 10 === 0) console.log(`Linked ${linked} pairs...`);
    } catch (err) {
      const msg = String(err.message || "");
      const idempotent = msg.includes("422") && (msg.includes("already") || msg.includes("duplicate") || msg.includes("one parent"));
      if (idempotent) {
        linked++; // treat as success for count
      } else {
        console.warn(`Failed to link ${childId} under ${parentId}:`, err.message);
      }
    }
    if (config.delayMs > 0) {
      const start = Date.now();
      while (Date.now() - start < config.delayMs) {}
    }
  }
  console.log(`Link done. Linked ${linked} parent-child pairs.`);
  return linked;
}

// --- Status sync: get project and field IDs ---
function getProjectId(config) {
  const num = config.projectNumber;
  const owner = config.projectOwner;
  const out = execSync(`gh project view ${num} --owner ${escapeShell(owner)} --format json`, { encoding: "utf-8", shell: true });
  const obj = JSON.parse(out);
  return obj.id;
}

function getProjectFieldIds(config) {
  const num = config.projectNumber;
  const owner = config.projectOwner;
  const out = execSync(`gh project field-list ${num} --owner ${escapeShell(owner)} --format json -L 100`, {
    encoding: "utf-8",
    shell: true,
  });
  const obj = JSON.parse(out);
  const fields = obj.fields || obj;
  const statusField = Array.isArray(fields) ? fields.find((f) => (f.name || "").toLowerCase() === "status") : null;
  if (!statusField) {
    throw new Error("Status field not found in project. Run: gh project field-list " + num + " --owner " + owner);
  }
  const options = statusField.options || [];
  const optionByName = new Map();
  for (const opt of options) {
    const name = (opt.name || "").trim();
    if (name) optionByName.set(name, opt.id);
  }
  const statusAliases = {
    Done: ["Done"],
    "In progress": ["In progress", "In Progress"],
    Backlog: ["Backlog", "Todo"],
    Ready: ["Ready", "Todo"],
    "In Review": ["In Review"],
  };
  const roadmapToOption = (roadmapStatus) => {
    const s = (roadmapStatus || "Backlog").trim();
    const aliases = statusAliases[s] || [s];
    for (const name of aliases) {
      const id = optionByName.get(name);
      if (id) return id;
    }
    return optionByName.get(s) || optionByName.get(s.toLowerCase()) || null;
  };
  return { fieldId: statusField.id, optionByName, roadmapToOption };
}

function listProjectItems(config) {
  const num = config.projectNumber;
  const owner = config.projectOwner;
  const out = execSync(
    `gh project item-list ${num} --owner ${escapeShell(owner)} --format json -L 500`,
    { encoding: "utf-8", shell: true }
  );
  const batch = JSON.parse(out);
  const items = batch.items ?? batch;
  return Array.isArray(items) ? items : [items];
}

function setProjectItemStatus(config, itemId, optionId, fieldIds) {
  const { fieldId } = fieldIds;
  const projectId = config._projectId;
  if (!projectId || !fieldId || !optionId) return false;
  execSync(
    `gh project item-edit --id ${escapeShell(itemId)} --field-id ${escapeShell(fieldId)} --single-select-option-id ${escapeShell(optionId)} --project-id ${escapeShell(projectId)}`,
    { stdio: "pipe", shell: true }
  );
  return true;
}

function runStatusSync(config, parsed) {
  if (!parsed.statusMap) return 0;
  const { statusMap } = parsed;
  const projectId = getProjectId(config);
  config._projectId = projectId;
  const fieldIds = getProjectFieldIds(config);
  const items = listProjectItems(config);
  const canonicalToStatus = new Map();
  for (const [id, status] of statusMap.epic) canonicalToStatus.set(id, status);
  for (const [id, status] of statusMap.feature) canonicalToStatus.set(id, status);
  for (const [id, status] of statusMap.story) canonicalToStatus.set(id, status);
  for (const [id, status] of statusMap.task) canonicalToStatus.set(id, status);

  const issueToItem = new Map();
  for (const item of items) {
    const content = item.content || item;
    const url = content?.url || content?.issue?.url || "";
    const number = content?.number ?? content?.issue?.number;
    let issueNum = null;
    if (number != null) issueNum = parseInt(number, 10);
    else if (url) {
      const m = url.match(/\/(?:issues|pull)\/(\d+)$/);
      if (m) issueNum = parseInt(m[1], 10);
    }
    if (issueNum != null) issueToItem.set(issueNum, { itemId: item.id, content });
  }

  const issues = listRoadmapIssues(config);
  const cidByNumber = new Map();
  for (const i of issues) {
    const cid = titleToCanonicalId(i.title);
    if (cid) cidByNumber.set(i.number, cid);
  }

  let updated = 0;
  for (const issue of issues) {
    const cid = cidByNumber.get(issue.number);
    if (!cid) continue;
    const status = canonicalToStatus.get(cid);
    if (!status) continue;
    const optionId = fieldIds.roadmapToOption(status);
    if (!optionId) continue;
    const entry = issueToItem.get(issue.number);
    if (!entry) continue;
    try {
      setProjectItemStatus(config, entry.itemId, optionId, fieldIds);
      updated++;
      if (updated % 20 === 0) console.log(`Status sync: ${updated} items updated...`);
    } catch (err) {
      console.warn(`Failed to set status for ${cid} (#${issue.number}):`, err.message);
    }
    if (config.delayMs > 0) {
      const start = Date.now();
      while (Date.now() - start < config.delayMs) {}
    }
  }
  console.log(`Status sync done. Updated ${updated} project items.`);
  return updated;
}

// --- Config ---
function loadConfig() {
  const configPath = process.argv.includes("--config")
    ? process.argv[process.argv.indexOf("--config") + 1]
    : join(__dirname, "gh-sync-config.json");
  const raw = readFileSync(configPath, "utf-8");
  const config = JSON.parse(raw);
  config.roadmapPath = config.roadmapPath || "SMARTER_HOME_ROADMAP.md";
  config.roadmapFullPath = join(ROOT, config.roadmapPath);
  config.delayMs = config.delayMs ?? 1500;
  config.projectNumber = config.projectNumber ?? 1;
  config.projectOwner = config.projectOwner ?? "Arrow-Head-Tech";
  return config;
}

// --- Parser ---
function parseRoadmap(content) {
  const lines = content.split("\n");
  const epics = [];
  const features = [];
  const stories = [];
  const tasks = [];

  let currentEpic = null;
  let currentFeature = null;
  let currentStory = null;
  let epicBody = [];
  let featureBody = [];
  let storyBody = [];

  const EPIC_RE = /^# (E\d+) — (.+)$/;
  const FEATURE_RE = /^## (F\d+\.\d+) — (.+)$/;
  const STORY_RE = /^### (S\d+\.\d+\.\d+) — (.+)$/;
  const TASK_RE = /^- (T\d+(?:\.\d+)+) (.+)$/;
  const STATUS_RE = /^\*\*Status:\*\*\s*(.+)$/;

  function flushEpic() {
    if (currentEpic) {
      epics.push({
        ...currentEpic,
        body: epicBody.join("\n").trim(),
      });
      epicBody = [];
    }
  }

  function flushFeature() {
    if (currentFeature) {
      features.push({
        ...currentFeature,
        body: featureBody.join("\n").trim(),
      });
      featureBody = [];
    }
  }

  function flushStory() {
    if (currentStory) {
      stories.push({
        ...currentStory,
        body: storyBody.join("\n").trim(),
      });
      storyBody = [];
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const ep = EPIC_RE.exec(line);
    const fp = FEATURE_RE.exec(line);
    const sp = STORY_RE.exec(line);
    const tp = TASK_RE.exec(line);

    if (ep) {
      flushStory();
      flushFeature();
      flushEpic();
      currentEpic = { id: ep[1], title: ep[2].trim(), epicNum: ep[1].replace("E", "") };
      currentFeature = null;
      currentStory = null;
      continue;
    }

    if (fp) {
      flushStory();
      flushFeature();
      currentFeature = {
        id: fp[1],
        title: fp[2].trim(),
        epicId: currentEpic?.id || "E?",
        featureNum: fp[1],
        status: "Backlog",
      };
      currentStory = null;
      featureBody.push(line);
      continue;
    }

    if (sp) {
      flushStory();
      const statusMatch = lines[i + 1]?.match(STATUS_RE);
      currentStory = {
        id: sp[1],
        title: sp[2].trim(),
        epicId: currentEpic?.id || "E?",
        featureId: currentFeature?.id || "F?",
        status: statusMatch ? statusMatch[1].trim() : "Backlog",
      };
      if (currentFeature) featureBody.push(line);
      storyBody = [line];
      continue;
    }

    if (tp) {
      const taskId = tp[1];
      const taskTitle = tp[2].trim();
      const parentStory = currentStory?.id;
      const parentFeature = currentFeature?.id;
      const status = currentStory?.status || currentFeature?.status || "Backlog";
      tasks.push({
        id: taskId,
        title: taskTitle,
        storyId: parentStory,
        featureId: parentFeature,
        status,
      });
      if (currentStory) storyBody.push(line);
      if (currentFeature && !currentStory) featureBody.push(line);
      continue;
    }

    if (currentStory && (line.startsWith("**") || line.startsWith("-") || line.startsWith(" ") || line.trim() === "")) {
      storyBody.push(line);
    } else if (currentFeature && !currentStory && line.trim() && !line.startsWith("#")) {
      const statusMatch = line.match(STATUS_RE);
      if (statusMatch) currentFeature.status = statusMatch[1].trim();
      featureBody.push(line);
    } else if (currentEpic && line.trim() && !line.startsWith("#") && !line.startsWith("---")) {
      epicBody.push(line);
    }
  }

  flushStory();
  flushFeature();
  flushEpic();

  const statusMap = computePropagatedStatus({ epics, features, stories, tasks });
  return { epics, features, stories, tasks, statusMap };
}

// --- Status: propagate from Stories -> Features -> Epics ---
function computePropagatedStatus(parsed) {
  const { epics, features, stories, tasks } = parsed;
  const statusOrder = { Done: 3, "In Review": 2, "In progress": 1, Ready: 0, Backlog: 0 };
  const pickWorst = (a, b) => (statusOrder[a] || 0) >= (statusOrder[b] || 0) ? a : b;

  const storyStatus = new Map();
  for (const s of stories) {
    storyStatus.set(s.id, s.status || "Backlog");
  }

  const featureStatus = new Map();
  for (const f of features) {
    const fStories = stories.filter((s) => s.featureId === f.id);
    if (fStories.length === 0) {
      featureStatus.set(f.id, f.status || "Backlog");
    } else {
      const allDone = fStories.every((s) => (s.status || "Backlog") === "Done");
      featureStatus.set(f.id, allDone ? "Done" : fStories.reduce((acc, s) => pickWorst(acc, s.status || "Backlog"), "Backlog"));
    }
  }

  const epicStatus = new Map();
  for (const e of epics) {
    const eFeatures = features.filter((f) => f.epicId === e.id);
    if (eFeatures.length === 0) {
      epicStatus.set(e.id, "Backlog");
    } else {
      const allDone = eFeatures.every((f) => featureStatus.get(f.id) === "Done");
      epicStatus.set(e.id, allDone ? "Done" : eFeatures.reduce((acc, f) => pickWorst(acc, featureStatus.get(f.id)), "Backlog"));
    }
  }

  const taskStatus = new Map();
  for (const t of tasks) {
    taskStatus.set(t.id, t.status || "Backlog");
  }

  return { epic: epicStatus, feature: featureStatus, story: storyStatus, task: taskStatus };
}

// --- Escape for shell ---
function escapeShell(s) {
  return "'" + String(s).replace(/'/g, "'\\''") + "'";
}

// --- Build gh commands ---
function buildCommands(config, { epics, features, stories, tasks }) {
  const repo = config.repo;
  const projectTitle = config.projectTitle;
  const projectFlag = projectTitle ? ` --project ${escapeShell(projectTitle)}` : "";
  const commands = [];

  function ghIssueCreate(title, body, labels) {
    const labelStr = labels.length ? ` --label ${labels.map(escapeShell).join(" --label ")}` : "";
    const bodyArg = ` --body ${escapeShell((body || "").trim() || "(no description)")}`;
    return `gh issue create -R ${escapeShell(repo)} --title ${escapeShell(title)}${bodyArg}${labelStr}${projectFlag}`;
  }

  // 1. Epics
  for (const e of epics) {
    commands.push({
      type: "epic",
      id: e.id,
      parentId: null,
      cmd: ghIssueCreate(`E${e.epicNum} — ${e.title}`, e.body, ["roadmap", "epic"]),
    });
  }

  // 2. Features
  for (const f of features) {
    const labels = ["roadmap", "feature", `epic:${f.epicId}`];
    commands.push({
      type: "feature",
      id: f.id,
      parentId: f.epicId,
      cmd: ghIssueCreate(`${f.id} — ${f.title}`, f.body, labels),
    });
  }

  // 3. Stories
  for (const s of stories) {
    const labels = ["roadmap", "story", `epic:${s.epicId}`, `feature:${s.featureId}`];
    const body = (s.body || "").trim();
    commands.push({
      type: "story",
      id: s.id,
      parentId: s.featureId,
      cmd: ghIssueCreate(`${s.id} — ${s.title}`, body, labels),
    });
  }

  // 4. Tasks
  for (const t of tasks) {
    const labels = ["roadmap", "task"];
    if (t.storyId) labels.push(`story:${t.storyId}`);
    else if (t.featureId) labels.push(`feature:${t.featureId}`);
    const body = t.storyId ? `Parent: ${t.storyId}\n\n${t.title}` : `Parent: ${t.featureId}\n\n${t.title}`;
    commands.push({
      type: "task",
      id: t.id,
      parentId: t.storyId || t.featureId,
      cmd: ghIssueCreate(`${t.id} ${t.title}`, body, labels),
    });
  }

  return commands;
}

// --- Main ---
function main() {
  const argv = process.argv;
  const dryRun = argv.includes("--dry-run");
  const dedupeOnly = argv.includes("--dedupe-only");
  const linkOnly = argv.includes("--link-only");
  const statusOnly = argv.includes("--status-only");
  const noDedupe = argv.includes("--no-dedupe");
  const noLink = argv.includes("--no-link");

  const config = loadConfig();

  // --- dedupe-only ---
  if (dedupeOnly) {
    runDedupe(config);
    return;
  }

  // --- status-only ---
  if (statusOnly) {
    const content = readFileSync(config.roadmapFullPath, "utf-8");
    const parsed = parseRoadmap(content);
    try {
      runStatusSync(config, parsed);
    } catch (e) {
      if (String(e.message || e).includes("read:project") || String(e.message || e).includes("required scopes")) {
        console.warn("Status sync skipped: gh needs project scope. Run: gh auth refresh -s read:project -s project");
      } else throw e;
    }
    return;
  }

  // --- link-only ---
  if (linkOnly) {
    const content = readFileSync(config.roadmapFullPath, "utf-8");
    const parsed = parseRoadmap(content);
    runLink(config, parsed);
    return;
  }

  console.log("Loading roadmap from", config.roadmapFullPath);
  const content = readFileSync(config.roadmapFullPath, "utf-8");
  const parsed = parseRoadmap(content);
  console.log(
    "Parsed:",
    parsed.epics.length,
    "epics,",
    parsed.features.length,
    "features,",
    parsed.stories.length,
    "stories,",
    parsed.tasks.length,
    "tasks"
  );

  let commands = buildCommands(config, parsed);

  const limitIdx = argv.indexOf("--limit");
  const limit = limitIdx >= 0 ? parseInt(argv[limitIdx + 1], 10) : null;
  const offsetIdx = argv.indexOf("--offset");
  const offset = offsetIdx >= 0 ? parseInt(argv[offsetIdx + 1], 10) : 0;
  if (offset > 0) {
    commands = commands.slice(offset);
    console.log("Skipping first", offset, "items,", commands.length, "remaining");
  }
  if (limit != null && limit > 0) {
    commands = commands.slice(0, limit);
    console.log("Limited to", limit, "items");
  }

  if (dryRun) {
    const shPath = join(ROOT, "scripts", "sync-roadmap-commands.sh");
    const sh = [
      "#!/bin/bash",
      "# Generated by sync-roadmap-to-gh.js --dry-run",
      "# Run: gh auth refresh -s project first",
      "",
      ...commands.map((c) => c.cmd),
    ].join("\n");
    writeFileSync(shPath, sh, "utf-8");
    console.log("Wrote", shPath, "with", commands.length, "commands");
    return;
  }

  // --- dedupe (before sync) ---
  if (!noDedupe) {
    runDedupe(config);
  }

  if (!config.projectTitle) {
    console.warn("projectTitle empty in config. Issues will be created but may not be added to project.");
  }

  // --- sync: create issues with --json number to capture ---
  for (let i = 0; i < commands.length; i++) {
    const c = commands[i];
    console.log(`[${i + 1}/${commands.length}] ${c.type} ${c.id}`);
    const createCmd = c.cmd + " --json number";
    try {
      const out = execSync(createCmd, { encoding: "utf-8", shell: true });
      const obj = JSON.parse(out);
      console.log(`https://github.com/${config.repo}/issues/${obj.number}`);
    } catch (err) {
      console.error("Failed:", c.cmd);
      throw err;
    }
    if (i < commands.length - 1 && config.delayMs > 0) {
      const start = Date.now();
      while (Date.now() - start < config.delayMs) {}
    }
  }

  console.log("Done. Created", commands.length, "issues.");

  // --- link (after sync) ---
  if (!noLink) {
    runLink(config, parsed);
  }

  // --- status sync (after link) ---
  if (config.projectNumber && config.projectOwner) {
    try {
      runStatusSync(config, parsed);
    } catch (e) {
      if (String(e.message || e).includes("read:project") || String(e.message || e).includes("required scopes")) {
        console.warn("Status sync skipped: gh needs project scope. Run: gh auth refresh -s read:project -s project");
      } else throw e;
    }
  }
}

try {
  main();
} catch (e) {
  console.error(e);
  process.exit(1);
}
