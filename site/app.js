(function () {
  // ── Constants ─────────────────────────────────────────────────
  const STORAGE_KEY = 'arrowhead_tag_overrides';
  const ORG = 'Arrow-Head-Tech';
  const PHASES = ['idea', 'prototype', 'dev', 'stg', 'prod', 'archived', 'dropped'];

  const PHASE_ICONS = {
    idea:      '💡',
    prototype: '🧪',
    dev:       '🔨',
    stg:       '🚧',
    prod:      '🚀',
    archived:  '📦',
    dropped:   '🗑️',
  };

  const PHASE_COLORS = {
    idea:      '#9CA3AF',
    prototype: '#3B82F6',
    dev:       '#F97316',
    stg:       '#EAB308',
    prod:      '#22C55E',
    archived:  '#6B7280',
    dropped:   '#EF4444',
  };

  // path detection
  const isFromSite = /\/site\//.test(window.location.pathname);
  const CONTENT_BASE = isFromSite ? '../content/' : 'content/';
  const DATA_URL = CONTENT_BASE + 'projects.json';

  // ── State ──────────────────────────────────────────────────────
  let allProjects = [];
  let filteredProjects = [];
  let currentView = 'cards';
  let sortKey = 'name';
  let sortDir = 1;
  const activePhases = new Set();
  const activeTags = new Set();
  let searchText = '';
  let modalProjectId = null;
  let modalTags = [];

  // ── localStorage ───────────────────────────────────────────────
  function loadTagOverrides() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch (_) { return {}; }
  }
  function saveTagOverrides(o) { localStorage.setItem(STORAGE_KEY, JSON.stringify(o)); }

  // ── DOM refs ───────────────────────────────────────────────────
  const searchEl       = document.getElementById('search');
  const sortBtn        = document.getElementById('sort-btn');
  const sortLabel      = document.getElementById('sort-label');
  const sortMenu       = document.getElementById('sort-menu');
  const activeFiltersEl = document.getElementById('active-filters');
  const phaseFiltersEl = document.getElementById('phase-filters');
  const tagFiltersEl   = document.getElementById('tag-filters');
  const viewCardsEl    = document.getElementById('view-cards');
  const viewKanbanEl   = document.getElementById('view-kanban');
  const viewTableEl    = document.getElementById('view-table');
  const tableBody      = document.getElementById('table-body');
  const tagModal       = document.getElementById('tag-modal');
  const modalNameEl    = document.getElementById('modal-project-name');
  const modalTagsEl    = document.getElementById('modal-tags');
  const modalTagInput  = document.getElementById('modal-tag-input');
  const modalAddBtn    = document.getElementById('modal-add-btn');
  const modalClose     = document.getElementById('modal-close');
  const modalCancel    = document.getElementById('modal-cancel');
  const modalSave      = document.getElementById('modal-save');

  // ── Helpers ────────────────────────────────────────────────────
  function esc(s) {
    const d = document.createElement('div');
    d.textContent = String(s == null ? '' : s);
    return d.innerHTML;
  }

  function initialsColor(name) {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    return `hsl(${Math.abs(h) % 360},55%,44%)`;
  }

  function avatarHtml(project) {
    const name  = project.name || '?';
    const words = name.replace(/[^a-zA-Z0-9 ]/g, ' ').trim().split(/\s+/);
    const ini   = (words.length >= 2
      ? words[0][0] + words[1][0]
      : name.slice(0, 2)
    ).toUpperCase();
    const bg    = initialsColor(name);
    const ico   = `https://raw.githubusercontent.com/${ORG}/${encodeURIComponent(name)}/main/project.ico`;
    return `<div class="avatar" style="background:${bg}">` +
      `<img class="avatar-img" src="${esc(ico)}" alt="" onerror="this.style.display='none'">` +
      `<span class="avatar-initials">${esc(ini)}</span>` +
      `</div>`;
  }

  function phaseBadgeHtml(phase) {
    const color = PHASE_COLORS[phase] || '#9CA3AF';
    const bg    = color + '22';
    return `<span class="phase-badge" style="background:${bg};color:${color}">${PHASE_ICONS[phase] || ''} ${esc(phase)}</span>`;
  }

  // ── View switching ─────────────────────────────────────────────
  function setView(view) {
    currentView = view;
    viewCardsEl.hidden  = view !== 'cards';
    viewKanbanEl.hidden = view !== 'kanban';
    viewTableEl.hidden  = view !== 'table';
    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });
    renderCurrentView();
  }

  // ── Sidebar builders ───────────────────────────────────────────
  function buildPhaseFilters() {
    const counts = {};
    allProjects.forEach(p => { counts[p.phase] = (counts[p.phase] || 0) + 1; });

    const label = phaseFiltersEl.querySelector('.sidebar-label');
    phaseFiltersEl.innerHTML = '';
    phaseFiltersEl.appendChild(label);

    PHASES.forEach(phase => {
      if (!counts[phase]) return;
      const row = document.createElement('label');
      row.className = 'filter-row';
      row.innerHTML =
        `<input type="checkbox" data-phase="${esc(phase)}"${activePhases.has(phase) ? ' checked' : ''}>` +
        `<span class="filter-name">${PHASE_ICONS[phase] || ''} ${esc(phase)}</span>` +
        `<span class="filter-count">${counts[phase]}</span>`;
      row.querySelector('input').addEventListener('change', e => {
        e.target.checked ? activePhases.add(phase) : activePhases.delete(phase);
        applyAndRender();
      });
      phaseFiltersEl.appendChild(row);
    });
  }

  function buildTagFilters() {
    const counts = {};
    allProjects.forEach(p => (p.tags || []).forEach(t => { counts[t] = (counts[t] || 0) + 1; }));
    const tags = Object.keys(counts).sort();

    const label = tagFiltersEl.querySelector('.sidebar-label');
    tagFiltersEl.innerHTML = '';
    tagFiltersEl.appendChild(label);

    if (tags.length === 0) {
      const em = document.createElement('p');
      em.className = 'sidebar-empty';
      em.textContent = 'No tags yet';
      tagFiltersEl.appendChild(em);
      return;
    }

    tags.forEach(tag => {
      const row = document.createElement('label');
      row.className = 'filter-row';
      row.innerHTML =
        `<input type="checkbox" data-tag="${esc(tag)}"${activeTags.has(tag) ? ' checked' : ''}>` +
        `<span class="filter-name">${esc(tag)}</span>` +
        `<span class="filter-count">${counts[tag]}</span>`;
      row.querySelector('input').addEventListener('change', e => {
        e.target.checked ? activeTags.add(tag) : activeTags.delete(tag);
        applyAndRender();
      });
      tagFiltersEl.appendChild(row);
    });
  }

  function renderActiveFilters() {
    const chips = [];
    activePhases.forEach(p => chips.push({ key: 'phase', value: p, label: `Phase: ${p}` }));
    activeTags.forEach(t =>   chips.push({ key: 'tag',   value: t, label: `Tag: ${t}` }));

    if (!chips.length) { activeFiltersEl.hidden = true; return; }
    activeFiltersEl.hidden = false;
    activeFiltersEl.innerHTML = chips.map(c =>
      `<span class="active-chip" data-key="${esc(c.key)}" data-value="${esc(c.value)}">${esc(c.label)}` +
      `<button class="chip-remove" aria-label="Remove filter">×</button></span>`
    ).join('');

    activeFiltersEl.querySelectorAll('.chip-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const chip  = btn.closest('.active-chip');
        const key   = chip.dataset.key;
        const value = chip.dataset.value;
        if (key === 'phase') {
          activePhases.delete(value);
          const cb = phaseFiltersEl.querySelector(`input[data-phase="${value}"]`);
          if (cb) cb.checked = false;
        } else {
          activeTags.delete(value);
          const cb = tagFiltersEl.querySelector(`input[data-tag="${value}"]`);
          if (cb) cb.checked = false;
        }
        applyAndRender();
      });
    });
  }

  // ── Filter + sort + render ─────────────────────────────────────
  function applyAndRender() {
    filteredProjects = allProjects.filter(p => {
      if (searchText) {
        const hay = [p.name, p.short_description || '', (p.tags || []).join(' '), p.primary_language || '', p.primary_stack || '']
          .join(' ').toLowerCase();
        if (!hay.includes(searchText.toLowerCase())) return false;
      }
      if (activePhases.size && !activePhases.has(p.phase)) return false;
      if (activeTags.size) {
        const pt = new Set(p.tags || []);
        if (!Array.from(activeTags).some(t => pt.has(t))) return false;
      }
      return true;
    });

    filteredProjects.sort((a, b) => {
      let va = a[sortKey] || '', vb = b[sortKey] || '';
      if (sortKey === 'last_updated' || sortKey === 'created_at') {
        return sortDir * (va < vb ? -1 : va > vb ? 1 : 0);
      }
      return sortDir * va.toString().toLowerCase().localeCompare(vb.toString().toLowerCase());
    });

    renderActiveFilters();
    renderCurrentView();
  }

  function renderCurrentView() {
    if (currentView === 'cards')  renderCards();
    else if (currentView === 'kanban') renderKanban();
    else renderTable();
  }

  // ── Cards ──────────────────────────────────────────────────────
  function renderCards() {
    if (!filteredProjects.length) {
      viewCardsEl.innerHTML = '<p class="empty-state">No projects match the current filters.</p>';
      return;
    }
    viewCardsEl.innerHTML = '';
    filteredProjects.forEach(p => {
      const desc = p.short_description || '';
      const descDisplay = desc.length > 200 ? desc.slice(0, 200) + '…' : desc;
      const tagsHtml = (p.tags || []).map(t => `<span class="tag-pill">${esc(t)}</span>`).join('');
      const updated  = (p.last_updated  || '').toString().slice(0, 10) || '—';
      const created  = (p.created_at    || '').toString().slice(0, 10) || '—';

      const card = document.createElement('div');
      card.className = 'project-card';
      card.innerHTML =
        `<div class="card-header">` +
          avatarHtml(p) +
          `<div class="card-title-wrap">` +
            `<a class="card-name" href="${esc(p.repo_url)}" target="_blank" rel="noopener">${esc(p.name)}</a>` +
            `<span class="card-subtitle">${esc(p.primary_stack || p.primary_language || '—')}</span>` +
          `</div>` +
          `<button class="card-menu-btn" data-id="${esc(p.id)}" aria-label="Edit tags for ${esc(p.name)}" title="Edit tags">⋯</button>` +
        `</div>` +
        `<hr class="card-divider">` +
        `<p class="card-desc">${esc(descDisplay) || '<span style="opacity:.5">No description.</span>'}</p>` +
        (tagsHtml ? `<div class="card-tags">${tagsHtml}</div>` : '') +
        `<div class="card-footer">` +
          `<span class="card-meta">🌐 ${esc(p.primary_language || '—')}</span>` +
          `<span class="card-meta">📅 ${esc(updated)}</span>` +
          phaseBadgeHtml(p.phase) +
        `</div>`;

      viewCardsEl.appendChild(card);
    });

    viewCardsEl.querySelectorAll('.card-menu-btn').forEach(btn => {
      btn.addEventListener('click', () => openTagModal(btn.dataset.id));
    });
  }

  // ── Kanban ─────────────────────────────────────────────────────
  function renderKanban() {
    viewKanbanEl.innerHTML = '';
    PHASES.forEach(phase => {
      const projects = filteredProjects.filter(p => p.phase === phase);

      const col = document.createElement('div');
      col.className = 'kanban-col';

      const cardsHtml = projects.map(p =>
        `<a class="kanban-card" href="${esc(p.repo_url)}" target="_blank" rel="noopener">` +
          `<p class="kanban-card-name">${esc(p.name)}</p>` +
          `<p class="kanban-card-sub">${esc(p.primary_language || '—')} · ${esc(p.primary_stack || '—')}</p>` +
        `</a>`
      ).join('');

      col.innerHTML =
        `<div class="kanban-col-header">` +
          `<span class="kanban-dot" style="background:${PHASE_COLORS[phase] || '#9CA3AF'}"></span>` +
          `<span class="kanban-phase-name">${PHASE_ICONS[phase] || ''} ${esc(phase)}</span>` +
          `<span class="kanban-count">${projects.length}</span>` +
        `</div>` +
        `<div class="kanban-cards">${cardsHtml || '<p style="font-size:12px;color:var(--muted);padding:4px">—</p>'}</div>`;

      viewKanbanEl.appendChild(col);
    });
  }

  // ── Table ──────────────────────────────────────────────────────
  function renderTable() {
    if (!filteredProjects.length) {
      tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:32px">No projects match the current filters.</td></tr>`;
      return;
    }
    tableBody.innerHTML = '';
    filteredProjects.forEach(p => {
      const tr = document.createElement('tr');
      const tagsHtml = (p.tags || []).map(t => `<span class="tag-pill">${esc(t)}</span>`).join('');
      tr.innerHTML =
        `<td><a class="table-name" href="${esc(p.repo_url)}" target="_blank" rel="noopener">${esc(p.name)}</a></td>` +
        `<td>${phaseBadgeHtml(p.phase)}</td>` +
        `<td>${esc(p.primary_language || '—')}</td>` +
        `<td>${esc(p.primary_stack || '—')}</td>` +
        `<td class="tags-cell">${tagsHtml}<button class="edit-tags-btn" data-id="${esc(p.id)}" title="Edit tags" aria-label="Edit tags for ${esc(p.name)}">✏️</button></td>` +
        `<td>${esc((p.last_updated || '').toString().slice(0, 10)) || '—'}</td>` +
        `<td class="desc-cell" title="${esc(p.short_description || '')}">${esc((p.short_description || '').slice(0, 150))}${(p.short_description || '').length > 150 ? '…' : ''}</td>`;
      tableBody.appendChild(tr);
    });

    tableBody.querySelectorAll('.edit-tags-btn').forEach(btn => {
      btn.addEventListener('click', () => openTagModal(btn.dataset.id));
    });
  }

  // ── Sort ───────────────────────────────────────────────────────
  sortBtn.addEventListener('click', () => { sortMenu.hidden = !sortMenu.hidden; });

  document.addEventListener('click', e => {
    if (!e.target.closest('.sort-wrap')) sortMenu.hidden = true;
  });

  sortMenu.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      if (sortKey === btn.dataset.sort) sortDir *= -1;
      else { sortKey = btn.dataset.sort; sortDir = 1; }
      sortLabel.textContent = btn.textContent;
      sortMenu.hidden = true;
      applyAndRender();
    });
  });

  // Table header sort
  document.querySelectorAll('.projects-table th button').forEach(btn => {
    btn.addEventListener('click', () => {
      if (sortKey === btn.dataset.sort) sortDir *= -1;
      else { sortKey = btn.dataset.sort; sortDir = 1; }
      applyAndRender();
    });
  });

  // ── Sidebar view buttons ───────────────────────────────────────
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => setView(btn.dataset.view));
  });

  // ── Search ─────────────────────────────────────────────────────
  searchEl.addEventListener('input', () => {
    searchText = searchEl.value.trim();
    applyAndRender();
  });

  // ── Tag Modal ──────────────────────────────────────────────────
  function openTagModal(id) {
    const p = allProjects.find(p => p.id === id);
    if (!p) return;
    modalProjectId = id;
    modalTags = [...(p.tags || [])];
    modalNameEl.textContent = p.name;
    renderModalTags();
    tagModal.hidden = false;
    modalTagInput.value = '';
    modalTagInput.focus();
  }

  function closeTagModal() {
    tagModal.hidden = true;
    modalProjectId = null;
    modalTags = [];
  }

  function renderModalTags() {
    modalTagsEl.innerHTML = '';
    if (!modalTags.length) {
      modalTagsEl.innerHTML = '<span class="modal-no-tags">No tags yet.</span>';
      return;
    }
    modalTags.forEach((tag, i) => {
      const chip = document.createElement('span');
      chip.className = 'tag-pill removable';
      chip.innerHTML = `${esc(tag)}<button type="button" class="remove" aria-label="Remove tag" data-index="${i}">×</button>`;
      chip.querySelector('.remove').addEventListener('click', () => { modalTags.splice(i, 1); renderModalTags(); });
      modalTagsEl.appendChild(chip);
    });
  }

  function addModalTag() {
    const val = modalTagInput.value.trim();
    if (!val || modalTags.includes(val)) return;
    modalTags.push(val);
    renderModalTags();
    modalTagInput.value = '';
    modalTagInput.focus();
  }

  function saveModalTags() {
    const p = allProjects.find(p => p.id === modalProjectId);
    if (!p) return;
    p.tags = [...modalTags];
    const overrides = loadTagOverrides();
    overrides[modalProjectId] = [...modalTags];
    saveTagOverrides(overrides);
    buildTagFilters();
    applyAndRender();
    closeTagModal();
  }

  modalClose.addEventListener('click', closeTagModal);
  modalCancel.addEventListener('click', closeTagModal);
  modalSave.addEventListener('click', saveModalTags);
  modalAddBtn.addEventListener('click', addModalTag);
  modalTagInput.addEventListener('keydown', e => {
    if (e.key === 'Enter')  { e.preventDefault(); addModalTag(); }
    if (e.key === 'Escape') closeTagModal();
  });
  tagModal.addEventListener('click', e => { if (e.target === tagModal) closeTagModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !tagModal.hidden) closeTagModal(); });

  // ── Bootstrap ──────────────────────────────────────────────────
  fetch(DATA_URL)
    .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
    .then(data => {
      if (!Array.isArray(data)) throw new Error('Expected JSON array');
      const overrides = loadTagOverrides();
      allProjects = data.map(p => overrides[p.id] ? { ...p, tags: overrides[p.id] } : p);
      buildPhaseFilters();
      buildTagFilters();
      applyAndRender();
      setView('cards');
    })
    .catch(err => {
      document.querySelector('.main').innerHTML =
        `<div class="empty-state" style="height:100vh">Failed to load projects: ${esc(err.message)}</div>`;
    });
})();
