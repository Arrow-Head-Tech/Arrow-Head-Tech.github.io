(function () {
  const PHASE_ICONS = {
    idea:     '💡',
    test:     '🧪',
    dev:      '🔨',
    stg:      '🚧',
    prod:     '🚀',
    archived: '📦',
    dropped:  '🗑️'
  };

  const STORAGE_KEY = 'arrowhead_tag_overrides';

  function loadTagOverrides() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch (_) { return {}; }
  }

  function saveTagOverrides(overrides) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  }

  const isFromSiteSrc = /\/site\/src\//.test(window.location.pathname);
  const CONTENT_BASE = isFromSiteSrc ? '../../content/' : 'content/';
  const DATA_URL = CONTENT_BASE + 'projects.json';
  const TAXONOMY_URL = CONTENT_BASE + 'taxonomy/phases.json';
  let allProjects = [];
  let filteredProjects = [];
  let viewMode = 'table'; // 'table' | 'cards'
  let sortKey = 'name';
  let sortDir = 1;
  const filters = { phase: new Set(), primary_language: new Set(), primary_stack: new Set(), tags: new Set() };
  let searchText = '';
  let phasesData = null;

  // Modal state
  let modalProjectId = null;
  let modalTags = [];

  const searchEl = document.getElementById('search');
  const clearBtn = document.getElementById('clear-filters');
  const activeFiltersEl = document.getElementById('active-filters');
  const viewTableBtn = document.getElementById('view-table');
  const viewCardsBtn = document.getElementById('view-cards');
  const tableBody = document.getElementById('table-body');
  const tableWrap = document.getElementById('results-table-wrap');
  const cardsWrap = document.getElementById('results-cards');
  const noResultsEl = document.getElementById('no-results');
  const viewProjects = document.getElementById('view-projects');
  const viewTaxonomy = document.getElementById('view-taxonomy');
  const viewTechnologies = document.getElementById('view-technologies');
  const taxonomyContent = document.getElementById('taxonomy-content');
  const technologiesContent = document.getElementById('technologies-content');

  // Modal elements
  const tagModal = document.getElementById('tag-modal');
  const modalProjectName = document.getElementById('modal-project-name');
  const modalTagsEl = document.getElementById('modal-tags');
  const modalTagInput = document.getElementById('modal-tag-input');
  const modalAddBtn = document.getElementById('modal-add-btn');
  const modalClose = document.getElementById('modal-close');
  const modalCancel = document.getElementById('modal-cancel');
  const modalSave = document.getElementById('modal-save');

  function getUniqueValues(key) {
    const set = new Set();
    allProjects.forEach((p) => {
      if (key === 'tags') {
        (p.tags || []).forEach((t) => set.add(t));
      } else {
        const v = p[key];
        if (v != null && v !== '') set.add(String(v));
      }
    });
    return Array.from(set).sort();
  }

  function buildFilterChips() {
    ['phase', 'primary_language', 'primary_stack', 'tags'].forEach((key) => {
      const container = document.querySelector(`[data-filter="${key}"]`);
      if (!container) return;
      container.innerHTML = '';
      const values = getUniqueValues(key);
      values.forEach((value) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'chip';
        btn.textContent = value;
        btn.dataset.filterKey = key;
        btn.dataset.filterValue = value;
        btn.addEventListener('click', () => toggleFilter(key, value));
        container.appendChild(btn);
      });
    });
  }

  function toggleFilter(key, value) {
    if (filters[key].has(value)) filters[key].delete(value);
    else filters[key].add(value);
    applyFiltersAndRender();
    syncChipStates();
    renderActiveFilters();
  }

  function syncChipStates() {
    document.querySelectorAll('.filter-group .chip').forEach((chip) => {
      const key = chip.dataset.filterKey;
      const value = chip.dataset.filterValue;
      chip.classList.toggle('active', filters[key] && filters[key].has(value));
    });
  }

  function renderActiveFilters() {
    activeFiltersEl.innerHTML = '';
    let count = 0;
    Object.keys(filters).forEach((key) => {
      filters[key].forEach((value) => {
        count++;
        const chip = document.createElement('span');
        chip.className = 'chip active';
        chip.innerHTML = `${value} <button type="button" class="remove" aria-label="Remove filter">×</button>`;
        chip.querySelector('.remove').addEventListener('click', () => toggleFilter(key, value));
        activeFiltersEl.appendChild(chip);
      });
    });
    if (count > 0) {
      activeFiltersEl.style.display = 'flex';
    } else {
      activeFiltersEl.style.display = 'none';
    }
  }

  function applyFiltersAndRender() {
    filteredProjects = allProjects.filter((p) => {
      if (searchText) {
        const haystack = [
          p.name,
          p.short_description || '',
          (p.tags || []).join(' '),
          p.primary_language || '',
          p.primary_stack || ''
        ].join(' ').toLowerCase();
        if (!haystack.includes(searchText.toLowerCase())) return false;
      }
      if (filters.phase.size && !filters.phase.has(p.phase)) return false;
      if (filters.primary_language.size && !filters.primary_language.has(p.primary_language)) return false;
      if (filters.primary_stack.size && !filters.primary_stack.has(p.primary_stack)) return false;
      if (filters.tags.size) {
        const pt = new Set(p.tags || []);
        const hasAny = Array.from(filters.tags).some((t) => pt.has(t));
        if (!hasAny) return false;
      }
      return true;
    });

    filteredProjects.sort((a, b) => {
      let va = a[sortKey];
      let vb = b[sortKey];
      if (sortKey === 'last_updated' || sortKey === 'created_at') {
        va = va || '';
        vb = vb || '';
        return sortDir * (va < vb ? -1 : va > vb ? 1 : 0);
      }
      va = (va || '').toString().toLowerCase();
      vb = (vb || '').toString().toLowerCase();
      return sortDir * va.localeCompare(vb);
    });

    renderTable();
    renderCards();
    noResultsEl.hidden = filteredProjects.length > 0;
  }

  function renderTable() {
    tableBody.innerHTML = '';
    filteredProjects.forEach((p) => {
      const tr = document.createElement('tr');
      const tagsHtml = (p.tags || []).map((t) => `<span class="tag-mini">${escapeHtml(t)}</span>`).join('');
      tr.innerHTML =
        `<td><a href="${escapeHtml(p.repo_url)}" target="_blank" rel="noopener">${escapeHtml(p.name)}</a></td>` +
        `<td>${PHASE_ICONS[p.phase] || ''} ${escapeHtml(p.phase)}</td>` +
        `<td>${escapeHtml(p.primary_language || '—')}</td>` +
        `<td>${escapeHtml(p.primary_stack || '—')}</td>` +
        `<td class="tags-cell">${tagsHtml}<button class="edit-tags-btn" data-id="${escapeHtml(p.id)}" title="Edit tags" aria-label="Edit tags for ${escapeHtml(p.name)}">✏️</button></td>` +
        `<td>${escapeHtml((p.last_updated || '').toString().slice(0, 10)) || '—'}</td>` +
        `<td class="desc-cell" title="${escapeHtml(p.short_description || '')}">${escapeHtml((p.short_description || '').slice(0, 150))}${(p.short_description || '').length > 150 ? '…' : ''}</td>`;
      tableBody.appendChild(tr);
    });
  }

  function renderCards() {
    cardsWrap.innerHTML = '';
    filteredProjects.forEach((p) => {
      const card = document.createElement('div');
      card.className = 'card';
      const phaseBadge = `<span>${PHASE_ICONS[p.phase] || ''} ${escapeHtml(p.phase)}</span>`;
      const otherBadges = [p.primary_language, p.primary_stack, ...(p.tags || [])].filter(Boolean)
        .map((b) => `<span>${escapeHtml(b)}</span>`).join('');
      const badgesHtml = phaseBadge + otherBadges;
      let linksHtml = `<a href="${escapeHtml(p.repo_url)}" target="_blank" rel="noopener">Repository</a>`;
      if (p.links && p.links.docs) linksHtml += ` <a href="${escapeHtml(p.links.docs)}" target="_blank" rel="noopener">Docs</a>`;
      if (p.links && p.links.demo) linksHtml += ` <a href="${escapeHtml(p.links.demo)}" target="_blank" rel="noopener">Demo</a>`;
      card.innerHTML =
        `<h3><a href="${escapeHtml(p.repo_url)}" target="_blank" rel="noopener">${escapeHtml(p.name)}</a></h3>` +
        `<p class="card-desc">${escapeHtml(p.short_description || '')}</p>` +
        `<div class="card-badges">${badgesHtml}</div>` +
        `<div class="card-links">${linksHtml} <button class="edit-tags-btn card-edit-btn" data-id="${escapeHtml(p.id)}" aria-label="Edit tags for ${escapeHtml(p.name)}">✏️ Tags</button></div>`;
      cardsWrap.appendChild(card);
    });
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  // --- Tag modal ---

  function openTagModal(projectId) {
    const project = allProjects.find((p) => p.id === projectId);
    if (!project) return;
    modalProjectId = projectId;
    modalTags = [...(project.tags || [])];
    modalProjectName.textContent = project.name;
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
    if (modalTags.length === 0) {
      modalTagsEl.innerHTML = '<span class="modal-no-tags">No tags yet.</span>';
      return;
    }
    modalTags.forEach((tag, i) => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.innerHTML = `${escapeHtml(tag)} <button type="button" class="remove" aria-label="Remove tag ${escapeHtml(tag)}" data-index="${i}">×</button>`;
      chip.querySelector('.remove').addEventListener('click', () => {
        modalTags.splice(i, 1);
        renderModalTags();
      });
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
    const project = allProjects.find((p) => p.id === modalProjectId);
    if (!project) return;
    project.tags = [...modalTags];
    const overrides = loadTagOverrides();
    overrides[modalProjectId] = [...modalTags];
    saveTagOverrides(overrides);
    buildFilterChips();
    syncChipStates();
    applyFiltersAndRender();
    closeTagModal();
  }

  // Modal event listeners
  modalClose.addEventListener('click', closeTagModal);
  modalCancel.addEventListener('click', closeTagModal);
  modalSave.addEventListener('click', saveModalTags);
  modalAddBtn.addEventListener('click', addModalTag);
  modalTagInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addModalTag(); }
    if (e.key === 'Escape') closeTagModal();
  });
  tagModal.addEventListener('click', (e) => {
    if (e.target === tagModal) closeTagModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !tagModal.hidden) closeTagModal();
  });

  // Edit button delegation (table + cards)
  tableBody.addEventListener('click', (e) => {
    const btn = e.target.closest('.edit-tags-btn');
    if (btn) openTagModal(btn.dataset.id);
  });
  cardsWrap.addEventListener('click', (e) => {
    const btn = e.target.closest('.edit-tags-btn');
    if (btn) openTagModal(btn.dataset.id);
  });

  // --- View / routing ---

  function setView(mode) {
    viewMode = mode;
    viewTableBtn.classList.toggle('active', mode === 'table');
    viewCardsBtn.classList.toggle('active', mode === 'cards');
    viewTableBtn.setAttribute('aria-pressed', mode === 'table');
    viewCardsBtn.setAttribute('aria-pressed', mode === 'cards');
    tableWrap.hidden = mode !== 'table';
    cardsWrap.hidden = mode !== 'cards';
  }

  document.querySelectorAll('.table th button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.sort;
      if (!key) return;
      if (sortKey === key) sortDir *= -1;
      else { sortKey = key; sortDir = 1; }
      applyFiltersAndRender();
    });
  });

  clearBtn.addEventListener('click', () => {
    filters.phase.clear();
    filters.primary_language.clear();
    filters.primary_stack.clear();
    filters.tags.clear();
    searchEl.value = '';
    searchText = '';
    applyFiltersAndRender();
    syncChipStates();
    renderActiveFilters();
  });

  searchEl.addEventListener('input', () => {
    searchText = searchEl.value.trim();
    applyFiltersAndRender();
  });

  viewTableBtn.addEventListener('click', () => setView('table'));
  viewCardsBtn.addEventListener('click', () => setView('cards'));

  function getRoute() {
    const h = (window.location.hash || '#/').replace(/^#\/?/, '') || 'projects';
    return h === 'taxonomy' ? 'taxonomy' : h === 'technologies' ? 'technologies' : 'projects';
  }

  function showRoute(route) {
    viewProjects.hidden = route !== 'projects';
    viewTaxonomy.hidden = route !== 'taxonomy';
    viewTechnologies.hidden = route !== 'technologies';
    document.querySelectorAll('.nav-link').forEach((a) => a.classList.remove('active'));
    const active = document.getElementById('nav-' + (route === 'projects' ? 'projects' : route === 'taxonomy' ? 'taxonomy' : 'technologies'));
    if (active) active.classList.add('active');
    if (route === 'taxonomy') renderTaxonomy();
    if (route === 'technologies') renderTechnologies();
  }

  function renderTaxonomy() {
    if (phasesData) {
      taxonomyContent.innerHTML = phasesData.map((p) =>
        '<div class="phase-block"><h3>' + escapeHtml(p.name) + ' <code>' + escapeHtml(p.id) + '</code></h3><p>' + escapeHtml(p.description) + '</p></div>'
      ).join('');
      return;
    }
    taxonomyContent.innerHTML = '<p>Loading…</p>';
    fetch(TAXONOMY_URL)
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(r.statusText)))
      .then((data) => {
        phasesData = Array.isArray(data) ? data : [];
        taxonomyContent.innerHTML = phasesData.map((p) =>
          '<div class="phase-block"><h3>' + escapeHtml(p.name) + ' <code>' + escapeHtml(p.id) + '</code></h3><p>' + escapeHtml(p.description) + '</p></div>'
        ).join('');
      })
      .catch(() => { taxonomyContent.innerHTML = '<p class="no-results">Could not load taxonomy. Ensure content/taxonomy/phases.json exists.</p>'; });
  }

  function renderTechnologies() {
    const byStack = {};
    const byLanguage = {};
    const byTag = {};
    allProjects.forEach((p) => {
      const stack = (p.primary_stack || 'Unknown').trim() || 'Unknown';
      const lang = (p.primary_language || 'Unknown').trim() || 'Unknown';
      byStack[stack] = byStack[stack] || [];
      byStack[stack].push(p);
      byLanguage[lang] = byLanguage[lang] || [];
      byLanguage[lang].push(p);
      (p.tags || []).forEach((t) => {
        byTag[t] = byTag[t] || [];
        byTag[t].push(p);
      });
    });
    const fmt = (label, map) => {
      const entries = Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
      return entries.map(([name, list]) =>
        '<div class="tech-group"><h3>' + escapeHtml(name) + '</h3><p class="tech-count">' + list.length + ' project(s)</p><ul>' +
        list.slice(0, 30).map((proj) => '<li><a href="' + escapeHtml(proj.repo_url) + '" target="_blank" rel="noopener">' + escapeHtml(proj.name) + '</a></li>').join('') +
        (list.length > 30 ? '<li>… and ' + (list.length - 30) + ' more</li>' : '') + '</ul></div>'
      ).join('');
    };
    technologiesContent.innerHTML =
      '<h3>By primary stack</h3><div class="tech-grid">' + fmt('Stack', byStack) + '</div>' +
      '<h3>By primary language</h3><div class="tech-grid">' + fmt('Language', byLanguage) + '</div>' +
      '<h3>By tag</h3><div class="tech-grid">' + fmt('Tag', byTag) + '</div>';
  }

  window.addEventListener('hashchange', () => showRoute(getRoute()));

  fetch(DATA_URL)
    .then((r) => {
      if (!r.ok) throw new Error(r.statusText);
      return r.json();
    })
    .then((data) => {
      if (!Array.isArray(data)) throw new Error('Expected array');
      const overrides = loadTagOverrides();
      allProjects = data.map((p) => overrides[p.id] ? { ...p, tags: overrides[p.id] } : p);
      buildFilterChips();
      syncChipStates();
      renderActiveFilters();
      applyFiltersAndRender();
      setView('table');
      showRoute(getRoute());
    })
    .catch((err) => {
      document.querySelector('.results').innerHTML = '<p class="no-results">Failed to load projects: ' + escapeHtml(err.message) + '. Serve from repo root or dist/ so content/projects.json is available.</p>';
    });
})();
