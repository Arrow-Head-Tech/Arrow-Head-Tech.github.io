/* ── Settings module ──────────────────────────────────────────── */
const SETTINGS_KEY = 'arrowhead_settings';

function loadSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch { return {}; }
}

function saveSettings(s) { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); }

/* ── Modal DOM ───────────────────────────────────────────────── */
function injectModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'settings-modal';
  overlay.setAttribute('hidden', '');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'settings-modal-title');

  overlay.innerHTML = `
    <div class="modal" style="width:480px">
      <div class="modal-header">
        <h2 id="settings-modal-title">Settings</h2>
        <button class="modal-close" id="settings-close" aria-label="Close">×</button>
      </div>
      <div class="modal-body">

        <p class="settings-section-title">GitHub Integration</p>
        <div class="settings-field">
          <label for="settings-github-pat">Personal Access Token</label>
          <input type="password" id="settings-github-pat" placeholder="ghp_…" autocomplete="off">
          <span class="settings-hint">Required scopes: <code>repo</code> (classic) or Contents R/W (fine-grained)</span>
        </div>

        <p class="settings-section-title">AI Assistant</p>
        <div class="settings-field">
          <label for="settings-api-base">API Base URL</label>
          <div style="display:flex;gap:8px;align-items:center">
            <input type="url" id="settings-api-base" placeholder="http://localhost:5001" style="flex:1">
            <button class="btn-secondary" id="settings-test-btn" style="white-space:nowrap">Test connection</button>
          </div>
          <span class="settings-hint settings-test-result" id="settings-test-result" hidden></span>
        </div>
        <div class="settings-field">
          <label for="settings-llm-provider">LLM Provider</label>
          <select id="settings-llm-provider">
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
            <option value="custom">Custom (OpenAI-compatible)</option>
          </select>
        </div>
        <div class="settings-field">
          <label for="settings-llm-key">API Key</label>
          <input type="password" id="settings-llm-key" placeholder="sk-…" autocomplete="off">
        </div>
        <div class="settings-field" id="settings-custom-url-row" hidden>
          <label for="settings-llm-custom-url">Custom Base URL</label>
          <input type="url" id="settings-llm-custom-url" placeholder="https://your-endpoint/v1">
        </div>

      </div>
      <div class="modal-footer">
        <button class="btn-secondary" id="settings-cancel">Cancel</button>
        <button class="btn-primary" id="settings-save">Save</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  /* Wire up close / cancel */
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  document.getElementById('settings-close').addEventListener('click', closeModal);
  document.getElementById('settings-cancel').addEventListener('click', closeModal);

  /* Save */
  document.getElementById('settings-save').addEventListener('click', () => {
    const s = {
      github_pat:          document.getElementById('settings-github-pat').value.trim(),
      api_base_url:        document.getElementById('settings-api-base').value.trim().replace(/\/$/, ''),
      llm_provider:        document.getElementById('settings-llm-provider').value,
      llm_api_key:         document.getElementById('settings-llm-key').value.trim(),
      llm_custom_base_url: document.getElementById('settings-llm-custom-url').value.trim(),
    };
    saveSettings(s);
    closeModal();
  });

  /* Provider toggle */
  document.getElementById('settings-llm-provider').addEventListener('change', toggleCustomUrl);

  /* Test connection */
  document.getElementById('settings-test-btn').addEventListener('click', testConnection);
}

function toggleCustomUrl() {
  const provider = document.getElementById('settings-llm-provider').value;
  const row = document.getElementById('settings-custom-url-row');
  if (provider === 'custom') row.removeAttribute('hidden');
  else row.setAttribute('hidden', '');
}

async function testConnection() {
  const apiBase = document.getElementById('settings-api-base').value.trim().replace(/\/$/, '');
  const result = document.getElementById('settings-test-result');
  result.removeAttribute('hidden');
  result.textContent = 'Testing…';
  result.style.color = 'inherit';
  if (!apiBase) {
    result.textContent = 'Enter an API Base URL first.';
    return;
  }
  try {
    const res = await fetch(`${apiBase}/api/health`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      result.textContent = 'Connected';
      result.style.color = 'green';
    } else {
      result.textContent = `Error: ${res.status}`;
      result.style.color = 'crimson';
    }
  } catch (e) {
    result.textContent = `Could not reach server: ${e.message}`;
    result.style.color = 'crimson';
  }
}

function openModal() {
  const s = loadSettings();
  document.getElementById('settings-github-pat').value       = s.github_pat || '';
  document.getElementById('settings-api-base').value         = s.api_base_url || '';
  document.getElementById('settings-llm-provider').value     = s.llm_provider || 'openai';
  document.getElementById('settings-llm-key').value          = s.llm_api_key || '';
  document.getElementById('settings-llm-custom-url').value   = s.llm_custom_base_url || '';
  toggleCustomUrl();
  const result = document.getElementById('settings-test-result');
  result.setAttribute('hidden', '');
  result.textContent = '';
  document.getElementById('settings-modal').removeAttribute('hidden');
}

function closeModal() {
  document.getElementById('settings-modal').setAttribute('hidden', '');
}

/* ── Public API ──────────────────────────────────────────────── */
window.SettingsModal = { open: openModal, loadSettings, saveSettings };

/* ── Init ────────────────────────────────────────────────────── */
// Script is deferred to end of <body>, so DOM is already ready.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectModal);
} else {
  injectModal();
}
