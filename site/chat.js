/* ── Config ──────────────────────────────────────────────────── */
const STORAGE_KEY  = 'arrowhead_chat_sessions';
const PREFS_KEY    = 'arrowhead_chat_prefs';
const MAX_SESSIONS = 50;

const PHASE_RE = /\[PHASE:(\w+)\]/;

/* Flow config — loaded dynamically from content/flows/idea-flow.json */
let FLOW_CONFIG = null;
let FLOW_STEPS = [];
let CONFIRM_LABELS = {};

const DEFAULT_FLOW_CONFIG = {
  id: 'idea-flow',
  name: 'Idea Qualification',
  terminal: 'done',
  terminalMock: 'Got it. How would you like to continue? I can help refine any section of the artifact, think through next steps, or explore a specific aspect in more depth.',
  steps: [
    { key: 'understand', label: 'Understand', alwaysConfirm: false, confirm: null, mock: '' },
    { key: 'research',   label: 'Research',   alwaysConfirm: true,  confirm: { icon: '🔍', title: 'Ready to research', body: "I've understood the idea. Next I'll look into the competitive landscape, existing solutions, and market context.", btn: 'Continue → Research' }, mock: '' },
    { key: 'follow_up',  label: 'Follow-up',  alwaysConfirm: false, confirm: { icon: '💬', title: 'Ready for follow-up', body: "Research complete. I'll now ask targeted follow-up questions based on the findings.", btn: 'Continue → Follow-up' }, mock: '' },
    { key: 'generating', label: 'Generate',   alwaysConfirm: false, confirm: { icon: '✍️', title: 'Ready to generate', body: "All context gathered. I'll now produce your structured IDEA.md artifact.", btn: 'Continue → Generate' }, mock: '' },
  ],
};

function flowConfigUrl() {
  const isFromSite = /\/site\//.test(window.location.pathname);
  return (isFromSite ? '../content/' : 'content/') + 'flows/idea-flow.json';
}

async function loadFlowConfig() {
  try {
    const res = await fetch(flowConfigUrl());
    if (!res.ok) throw new Error('Config not found');
    FLOW_CONFIG = await res.json();
  } catch {
    FLOW_CONFIG = DEFAULT_FLOW_CONFIG;
  }
  FLOW_STEPS = FLOW_CONFIG.steps.map(s => ({ key: s.key, label: s.label }));
  CONFIRM_LABELS = {};
  FLOW_CONFIG.steps.forEach(s => { if (s.confirm) CONFIRM_LABELS[s.key] = s.confirm; });
}

/* ── State ───────────────────────────────────────────────────── */
let sessions = [];
let activeSessionId = null;
let activeAssetIdx = 0;
let waiting = false;

/* ── DOM refs ────────────────────────────────────────────────── */
const $landing        = document.getElementById('chat-landing');
const $conversation   = document.getElementById('chat-conversation');
const $progressBar    = document.getElementById('phase-progress');
const $input          = document.getElementById('chat-input');
const $sendBtn        = document.getElementById('send-btn');
const $newChatBtn     = document.getElementById('new-chat-btn');
const $sessionsList   = document.getElementById('sessions-list');
const $assetPanel     = document.getElementById('asset-panel');
const $panelTabs      = document.getElementById('panel-tabs');
const $panelContent   = document.getElementById('panel-content');
const $panelClose     = document.getElementById('panel-close');
const $copyBtn        = document.getElementById('copy-btn');
const $downloadBtn    = document.getElementById('download-btn');
const $autoAdvanceBtn = document.getElementById('auto-advance-toggle');

/* ── Prefs helpers ───────────────────────────────────────────── */
function loadPrefs() {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}'); } catch { return {}; }
}
function savePrefs(p) { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); }
function getAutoAdvance() { const p = loadPrefs(); return p.autoAdvance !== false; }
function setAutoAdvance(val) {
  const p = loadPrefs(); p.autoAdvance = val; savePrefs(p);
  if ($autoAdvanceBtn) {
    $autoAdvanceBtn.setAttribute('aria-checked', val ? 'true' : 'false');
  }
}

/* ── Session helpers ─────────────────────────────────────────── */
function loadSessions() {
  try { sessions = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { sessions = []; }
}

function saveSessions() { localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions)); }

function getActiveSession() {
  return sessions.find(s => s.id === activeSessionId) || null;
}

function ensureFlow(session) {
  if (!session.flow) {
    session.flow = {
      phase: 'understand',
      phases: [{ phase: 'understand', startedAt: session.createdAt, completedAt: null }],
    };
  }
  return session;
}

function createSession() {
  const id = `s_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();
  const session = {
    id,
    title: 'New chat',
    createdAt: now,
    messages: [],
    assets: [],
    flow: {
      phase: 'understand',
      phases: [{ phase: 'understand', startedAt: now, completedAt: null }],
    },
  };
  sessions.unshift(session);
  if (sessions.length > MAX_SESSIONS) sessions.splice(MAX_SESSIONS);
  saveSessions();
  return session;
}

function setActiveSession(id) {
  activeSessionId = id;
  activeAssetIdx = 0;
  renderSessions();
  const session = getActiveSession();
  if (!session) return;
  renderConversation(session);
  renderAssetPanel(session);
}

/* ── Render sessions list ────────────────────────────────────── */
function renderSessions() {
  if (sessions.length === 0) {
    $sessionsList.innerHTML = '<p class="sessions-empty">No sessions yet.</p>';
    return;
  }
  $sessionsList.innerHTML = sessions.map(s => {
    const date = new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const active = s.id === activeSessionId ? ' active' : '';
    return `
      <div class="session-item${active}" data-id="${s.id}">
        <div class="session-info">
          <div class="session-title">${escHtml(s.title)}</div>
          <div class="session-date">${date}</div>
        </div>
        <button class="session-edit" data-id="${s.id}" title="Rename">✎</button>
        <button class="session-delete" data-id="${s.id}" title="Delete session">×</button>
      </div>`;
  }).join('');

  $sessionsList.querySelectorAll('.session-item').forEach(el => {
    el.addEventListener('click', e => {
      if (e.target.classList.contains('session-delete')) return;
      if (e.target.classList.contains('session-edit')) return;
      setActiveSession(el.dataset.id);
    });
  });

  $sessionsList.querySelectorAll('.session-edit').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      startEditTitle(btn.dataset.id);
    });
  });

  $sessionsList.querySelectorAll('.session-delete').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      deleteSession(btn.dataset.id);
    });
  });
}

function startEditTitle(id) {
  const session = sessions.find(s => s.id === id);
  if (!session) return;
  const titleEl = $sessionsList.querySelector(`.session-item[data-id="${CSS.escape(id)}"] .session-title`);
  if (!titleEl) return;

  const input = document.createElement('input');
  input.className = 'session-title-input';
  input.value = session.title;
  titleEl.replaceWith(input);
  input.focus();
  input.select();

  const commit = () => {
    const val = input.value.trim();
    if (val) session.title = val;
    saveSessions();
    renderSessions();
  };

  input.addEventListener('blur', commit);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') renderSessions();
  });
}

function deleteSession(id) {
  sessions = sessions.filter(s => s.id !== id);
  saveSessions();
  if (activeSessionId === id) {
    activeSessionId = null;
    showLanding();
  }
  renderSessions();
}

/* ── Landing / Conversation toggle ───────────────────────────── */
function showLanding() {
  $landing.removeAttribute('hidden');
  $conversation.setAttribute('hidden', '');
  $progressBar.setAttribute('hidden', '');
  closePanel();
}

function showConversation() {
  $landing.setAttribute('hidden', '');
  $conversation.removeAttribute('hidden');
}

/* ── Phase progress bar ──────────────────────────────────────── */
function renderProgressBar(phase) {
  const terminal = FLOW_CONFIG?.terminal ?? 'done';
  const donePhase  = phase === terminal;
  const currentIdx = donePhase
    ? FLOW_STEPS.length
    : FLOW_STEPS.findIndex(s => s.key === phase);

  $progressBar.innerHTML = FLOW_STEPS.map((step, i) => {
    let cls;
    if (donePhase || i < currentIdx)      cls = 'step-done';
    else if (i === currentIdx)             cls = 'step-active';
    else                                   cls = 'step-pending';

    const connectorDone = (donePhase || i < currentIdx) ? ' done' : '';
    const connector = i < FLOW_STEPS.length - 1
      ? `<div class="step-connector${connectorDone}"></div>`
      : '';

    return `<div class="flow-step ${cls}"><div class="step-dot"></div><div class="step-label">${escHtml(step.label)}</div></div>${connector}`;
  }).join('');

  $progressBar.removeAttribute('hidden');
}

/* ── Confirmation card ───────────────────────────────────────── */
function renderConfirmCard(nextPhase, onConfirm) {
  const info = CONFIRM_LABELS[nextPhase] || {
    icon: '▶',
    title: `Advance to ${nextPhase}`,
    body: '',
    btn: `Continue → ${nextPhase}`,
  };

  const row = document.createElement('div');
  row.className = 'msg-row confirm-card-row';
  row.innerHTML = `
    <div class="confirm-card">
      <div class="confirm-card-header">${info.icon} ${escHtml(info.title)}</div>
      <div class="confirm-card-body">${escHtml(info.body)}</div>
      <button class="confirm-card-btn">${escHtml(info.btn)}</button>
    </div>`;

  row.querySelector('.confirm-card-btn').addEventListener('click', () => {
    const btn = row.querySelector('.confirm-card-btn');
    btn.disabled = true;
    btn.textContent = 'Continuing…';
    onConfirm();
  });

  $conversation.appendChild(row);
  scrollToBottom();
}

/* ── Conversation rendering ──────────────────────────────────── */
function renderConversation(session) {
  ensureFlow(session);

  if (session.messages.length === 0) {
    showLanding();
    return;
  }

  showConversation();
  renderProgressBar(session.flow.phase);
  $conversation.innerHTML = '';

  session.messages.forEach(msg => {
    const asset = msg.assetIdx !== undefined ? session.assets[msg.assetIdx] : null;
    appendMessage(msg.role, msg.content, msg.timestamp, asset, false, msg.phase || null);
  });

  scrollToBottom();
}

function appendMessage(role, content, timestamp, asset, scroll = true, phase = null) {
  const time = timestamp
    ? new Date(timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : '';

  const row = document.createElement('div');
  row.className = `msg-row ${role}`;

  const bubbleContent = escHtml(content).replace(/\n/g, '<br>');

  let badgeHtml = '';
  if (asset) {
    badgeHtml = `<div><button class="asset-badge" data-filename="${escHtml(asset.filename)}">📄 ${escHtml(asset.filename)} generated →</button></div>`;
  }

  const phaseBadge = (role === 'assistant' && phase)
    ? `<div class="msg-phase-badge">${escHtml(phase.replace(/_/g, ' '))}</div>`
    : '';

  row.innerHTML = `
    <div>
      ${phaseBadge}
      <div class="msg-bubble">${bubbleContent}${badgeHtml}</div>
      <div class="msg-time">${time}</div>
    </div>`;

  if (asset) {
    row.querySelector('.asset-badge').addEventListener('click', () => {
      const session = getActiveSession();
      if (!session) return;
      activeAssetIdx = session.assets.findIndex(a => a.filename === asset.filename);
      openPanel(session);
    });
  }

  $conversation.appendChild(row);
  if (scroll) scrollToBottom();
}

function appendTypingIndicator() {
  const row = document.createElement('div');
  row.className = 'msg-row assistant';
  row.id = 'typing-row';
  row.innerHTML = `
    <div>
      <div class="msg-bubble">
        <div class="typing-indicator">
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
        </div>
      </div>
    </div>`;
  $conversation.appendChild(row);
  scrollToBottom();
}

function removeTypingIndicator() {
  const el = document.getElementById('typing-row');
  if (el) el.remove();
}

function scrollToBottom() {
  $conversation.scrollTop = $conversation.scrollHeight;
}

/* ── Asset panel ─────────────────────────────────────────────── */
function renderAssetPanel(session) {
  if (!session || session.assets.length === 0) { closePanel(); return; }
  openPanel(session);
}

function openPanel(session) {
  if (!session || session.assets.length === 0) return;

  $panelTabs.innerHTML = session.assets.map((a, i) => {
    const active = i === activeAssetIdx ? ' active' : '';
    return `<button class="panel-tab${active}" data-idx="${i}">📄 ${escHtml(a.filename)}</button>`;
  }).join('');

  $panelTabs.querySelectorAll('.panel-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      activeAssetIdx = parseInt(btn.dataset.idx);
      openPanel(session);
    });
  });

  const asset = session.assets[activeAssetIdx];
  $panelContent.innerHTML = `<pre>${escHtml(asset.content)}</pre>`;
  $assetPanel.classList.add('open');
}

function closePanel() { $assetPanel.classList.remove('open'); }

/* ── Asset detection ─────────────────────────────────────────── */
const ASSET_RE = /```(?:markdown|md):(\S+\.md)\n([\s\S]*?)```/g;

function extractAssets(text) {
  const assets = [];
  let match;
  ASSET_RE.lastIndex = 0;
  while ((match = ASSET_RE.exec(text)) !== null) {
    assets.push({ filename: match[1], content: match[2].trimEnd() });
  }
  return assets;
}

function stripAssetFences(text) {
  return text.replace(/```(?:markdown|md):\S+\.md\n[\s\S]*?```/g, '').trim();
}

/* ── API / Mock ──────────────────────────────────────────────── */
async function sendMessage(messages, phase, flow) {
  const settings = (window.SettingsModal && window.SettingsModal.loadSettings) ? window.SettingsModal.loadSettings() : {};
  const apiBase = (settings.api_base_url || '').replace(/\/$/, '');
  if (!apiBase) return mockResponse(messages, phase);

  const headers = { 'Content-Type': 'application/json' };
  if (settings.llm_api_key)         headers['X-LLM-Key']      = settings.llm_api_key;
  if (settings.llm_provider)        headers['X-LLM-Provider']  = settings.llm_provider;
  if (settings.llm_custom_base_url) headers['X-LLM-Base-URL']  = settings.llm_custom_base_url;

  const res = await fetch(`${apiBase}/api/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ messages, phase, flow }),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

function mockResponse(messages, phase) {
  const step = FLOW_CONFIG?.steps.find(s => s.key === phase);
  if (!step) {
    return Promise.resolve({ role: 'assistant', content: FLOW_CONFIG?.terminalMock || '' });
  }
  const lastUser = messages.filter(m => m.role === 'user').pop()?.content || '';
  const content = (step.mock || '').replace('{LAST_USER_MSG}', lastUser.slice(0, 60).trim());
  return Promise.resolve({ role: 'assistant', content });
}

/* ── Phase state machine ─────────────────────────────────────── */
async function processAssistantReply(reply, session) {
  ensureFlow(session);

  // Detect and strip phase signal
  const phaseMatch = reply.content.match(PHASE_RE);
  const nextPhase = phaseMatch ? phaseMatch[1] : null;
  let displayContent = reply.content.replace(PHASE_RE, '').trim();

  // Detect assets
  const assets = extractAssets(displayContent);
  let assetRef;

  if (assets.length > 0) {
    displayContent = stripAssetFences(displayContent);
    assets.forEach(a => {
      const existingIdx = session.assets.findIndex(x => x.filename === a.filename);
      if (existingIdx >= 0) session.assets[existingIdx] = a;
      else session.assets.push(a);
    });
    activeAssetIdx = session.assets.findIndex(a => a.filename === assets[0].filename);
    assetRef = session.assets[activeAssetIdx];
  }

  const currentPhase = session.flow.phase;
  const assistantMsg = {
    role: 'assistant',
    content: displayContent,
    timestamp: new Date().toISOString(),
    assetIdx: assetRef !== undefined ? session.assets.indexOf(assetRef) : undefined,
    phase: currentPhase,
  };
  session.messages.push(assistantMsg);
  saveSessions();

  appendMessage('assistant', displayContent, assistantMsg.timestamp, assetRef, true, currentPhase);

  if (assetRef) openPanel(session);

  // Handle phase transition
  if (nextPhase && session.flow.phase !== nextPhase && !session.flow.pendingNextPhase) {
    session.flow.pendingNextPhase = nextPhase;
    saveSessions();

    const autoAdvance = getAutoAdvance();
    const stepConfig = FLOW_CONFIG?.steps.find(s => s.key === nextPhase);
    const isTerminal = nextPhase === (FLOW_CONFIG?.terminal ?? 'done');
    const needsConfirm = !isTerminal && (stepConfig?.alwaysConfirm || !autoAdvance);

    if (needsConfirm) {
      renderConfirmCard(nextPhase, () => advancePhase(nextPhase));
    } else {
      setTimeout(() => advancePhase(nextPhase), 600);
    }
  }
}

async function advancePhase(nextPhase) {
  const session = getActiveSession();
  if (!session) return;
  ensureFlow(session);

  // Clear pending flag and update flow history
  delete session.flow.pendingNextPhase;
  const now = new Date().toISOString();
  const current = session.flow.phases[session.flow.phases.length - 1];
  if (current && !current.completedAt) current.completedAt = now;
  session.flow.phase = nextPhase;
  session.flow.phases.push({ phase: nextPhase, startedAt: now, completedAt: null });
  saveSessions();

  renderProgressBar(nextPhase);

  if (nextPhase === (FLOW_CONFIG?.terminal ?? 'done')) return;

  setWaiting(true);
  appendTypingIndicator();

  try {
    const apiMessages = session.messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, content: m.content }));
    const reply = await sendMessage(apiMessages, nextPhase, session.flow);
    removeTypingIndicator();
    await processAssistantReply(reply, session);
  } catch (err) {
    removeTypingIndicator();
    appendMessage('assistant', `Sorry, something went wrong: ${err.message}`, new Date().toISOString(), null);
  }

  setWaiting(false);
}

/* ── Send flow ───────────────────────────────────────────────── */
async function handleSend() {
  const text = $input.value.trim();
  if (!text || waiting) return;

  if (!activeSessionId) {
    const session = createSession();
    activeSessionId = session.id;
  }

  const session = getActiveSession();
  ensureFlow(session);

  const currentPhase = session.flow.phase;

  const userMsg = { role: 'user', content: text, timestamp: new Date().toISOString() };
  session.messages.push(userMsg);

  if (session.messages.filter(m => m.role === 'user').length === 1) {
    session.title = text.slice(0, 40) + (text.length > 40 ? '…' : '');
  }

  saveSessions();
  renderSessions();

  showConversation();
  renderProgressBar(currentPhase);
  appendMessage('user', text, userMsg.timestamp, null);

  $input.value = '';
  autoResize();
  setWaiting(true);
  appendTypingIndicator();

  try {
    const apiMessages = session.messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, content: m.content }));
    const reply = await sendMessage(apiMessages, currentPhase, session.flow);
    removeTypingIndicator();
    await processAssistantReply(reply, session);
  } catch (err) {
    removeTypingIndicator();
    appendMessage('assistant', `Sorry, something went wrong: ${err.message}`, new Date().toISOString(), null);
  }

  setWaiting(false);
}

function setWaiting(val) {
  waiting = val;
  $sendBtn.disabled = val;
  $input.disabled = val;
}

/* ── Input auto-resize ───────────────────────────────────────── */
function autoResize() {
  $input.style.height = 'auto';
  $input.style.height = Math.min($input.scrollHeight, 200) + 'px';
}

/* ── Utility ─────────────────────────────────────────────────── */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ── Event listeners ─────────────────────────────────────────── */
$sendBtn.addEventListener('click', handleSend);

$input.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
});

$input.addEventListener('input', autoResize);

$newChatBtn.addEventListener('click', () => {
  activeSessionId = null;
  activeAssetIdx = 0;
  showLanding();
  renderSessions();
  $input.value = '';
  autoResize();
});

$panelClose.addEventListener('click', closePanel);

$copyBtn.addEventListener('click', () => {
  const session = getActiveSession();
  if (!session || session.assets.length === 0) return;
  const asset = session.assets[activeAssetIdx];
  navigator.clipboard.writeText(asset.content).then(() => {
    const orig = $copyBtn.textContent;
    $copyBtn.textContent = 'Copied!';
    setTimeout(() => { $copyBtn.textContent = orig; }, 1500);
  });
});

$downloadBtn.addEventListener('click', () => {
  const session = getActiveSession();
  if (!session || session.assets.length === 0) return;
  const asset = session.assets[activeAssetIdx];
  const blob = new Blob([asset.content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = asset.filename; a.click();
  URL.revokeObjectURL(url);
});

if ($autoAdvanceBtn) {
  $autoAdvanceBtn.addEventListener('click', () => {
    const current = $autoAdvanceBtn.getAttribute('aria-checked') === 'true';
    setAutoAdvance(!current);
  });
}

/* ── Init ────────────────────────────────────────────────────── */
async function init() {
  await loadFlowConfig();
  loadSessions();
  renderSessions();
  showLanding();
  if ($autoAdvanceBtn) {
    $autoAdvanceBtn.setAttribute('aria-checked', getAutoAdvance() ? 'true' : 'false');
  }
}

init();
