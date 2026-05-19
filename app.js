/* ── Scriptorium — Main Application Logic ─────────────────────────────────── */

// ─── STATE ─────────────────────────────────────────────────────────────────────
const state = {
  activeCategory: 'all',
  searchQuery: '',
  selectedJournal: null,
  currentStep: 1,
  totalSteps: 4,
  wizard: {
    thesisType: '',
    thesisTitle: '',
    thesisAbstract: '',
    thesisMethods: '',
    thesisResults: '',
    thesisDiscussion: '',
    thesisIntro: '',
    wordCount: 0,
    selectedJournalId: '',
  }
};

// ─── INIT ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderJournals();
  setupNavigation();
  setupJournalFilters();
  setupConverter();
  setupModalClose();
  highlightNav();
});

// ─── NAVIGATION ────────────────────────────────────────────────────────────────
function setupNavigation() {
  document.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', () => {
      const target = el.dataset.nav;
      const section = document.getElementById(target);
      if (section) section.scrollIntoView({ behavior: 'smooth' });
      // close mobile menu
      document.querySelector('.nav-links')?.classList.remove('open');
    });
  });

  document.querySelector('.hamburger')?.addEventListener('click', () => {
    document.querySelector('.nav-links')?.classList.toggle('open');
  });

  window.addEventListener('scroll', highlightNav, { passive: true });
}

function highlightNav() {
  const sections = ['hero', 'features', 'how-it-works', 'converter', 'journals', 'ref-styles'];
  const scrollY = window.scrollY + 80;
  sections.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.offsetTop, bottom = top + el.offsetHeight;
    const link = document.querySelector(`[data-nav="${id}"]`);
    if (link) link.classList.toggle('active', scrollY >= top && scrollY < bottom);
  });
}

// ─── JOURNAL RENDERING ─────────────────────────────────────────────────────────
function renderJournals(filter = 'all', query = '') {
  const container = document.getElementById('journalsGrid');
  const counter   = document.getElementById('journalsCount');
  if (!container) return;

  let journals = JOURNALS;
  if (filter !== 'all') journals = journals.filter(j => j.category === filter);
  if (query) {
    const q = query.toLowerCase();
    journals = journals.filter(j =>
      j.name.toLowerCase().includes(q) ||
      (j.shortName || '').toLowerCase().includes(q) ||
      j.publisher.toLowerCase().includes(q) ||
      j.description.toLowerCase().includes(q)
    );
  }

  if (counter) counter.textContent = `Showing ${journals.length} of ${JOURNALS.length} journals`;

  if (journals.length === 0) {
    container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-muted)">
      <div style="font-size:2rem;margin-bottom:12px">📚</div>
      <p>No journals match your search. Try a different query or category.</p>
    </div>`;
    return;
  }

  container.innerHTML = journals.map(j => journalCardHTML(j)).join('');
  container.querySelectorAll('.journal-card').forEach(card => {
    card.addEventListener('click', () => openJournalModal(card.dataset.journalId));
  });

  // Populate the journal selector in the converter
  const sel = document.getElementById('journalSelect');
  if (sel) populateJournalSelect(sel);
}

function journalCardHTML(j) {
  const tierLabel = { elite: '⭐ Elite', high: '◆ High Impact', moderate: '● Reputable' }[j.tier] || j.tier;
  const oaBadge   = j.openAccess ? `<span class="journal-tag oa">Open Access</span>` : '';
  const wl        = j.wordLimit ? (typeof j.wordLimit === 'number' ? `${j.wordLimit.toLocaleString()} words` : `${j.wordLimit} ${j.wordLimitUnit || ''}`) : 'No limit';
  const ifBadge   = j.impactFactor ? `<span class="if-badge">IF ${j.impactFactor}</span>` : '';

  return `
  <div class="card journal-card" data-journal-id="${j.id}">
    <div class="card-header">
      <div>
        <div class="card-title">${j.name}</div>
        <div class="card-subtitle">${j.publisher}</div>
      </div>
      <span class="tier-badge tier-${j.tier}">${tierLabel}</span>
    </div>
    <p style="font-size:0.82rem;margin-bottom:12px;-webkit-line-clamp:2;display:-webkit-box;-webkit-box-orient:vertical;overflow:hidden">${j.description}</p>
    <div class="journal-meta">
      <div class="meta-item"><span class="meta-label">IF</span><span class="meta-value">${j.impactFactor ?? '—'}</span></div>
      <div class="meta-item"><span class="meta-label">Words</span><span class="meta-value">${wl}</span></div>
      <div class="meta-item"><span class="meta-label">Abstract</span><span class="meta-value">${j.abstractLimit ? j.abstractLimit + ' w' : '—'}</span></div>
      <div class="meta-item"><span class="meta-label">Refs</span><span class="meta-value">${j.maxReferences ?? 'No limit'}</span></div>
    </div>
    <div class="journal-tags">
      <span class="journal-tag">${JOURNAL_CATEGORIES.find(c=>c.id===j.category)?.name || j.category}</span>
      <span class="journal-tag">${REFERENCE_STYLES[j.referenceStyle]?.name || j.referenceStyle}</span>
      ${oaBadge}
    </div>
  </div>`;
}

// ─── JOURNAL FILTERS ───────────────────────────────────────────────────────────
function setupJournalFilters() {
  // Build filter buttons
  const filtersEl = document.getElementById('journalFilters');
  if (!filtersEl) return;

  const allBtn = document.createElement('button');
  allBtn.className = 'filter-btn active';
  allBtn.dataset.cat = 'all';
  allBtn.textContent = 'All Journals';
  filtersEl.prepend(allBtn);

  JOURNAL_CATEGORIES.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.dataset.cat = cat.id;
    btn.textContent = cat.name;
    filtersEl.appendChild(btn);
  });

  filtersEl.addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    filtersEl.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.activeCategory = btn.dataset.cat;
    renderJournals(state.activeCategory, state.searchQuery);
  });

  const searchInput = document.getElementById('journalSearch');
  if (searchInput) {
    searchInput.addEventListener('input', e => {
      state.searchQuery = e.target.value.trim();
      renderJournals(state.activeCategory, state.searchQuery);
    });
  }
}

// ─── JOURNAL MODAL ─────────────────────────────────────────────────────────────
function openJournalModal(journalId) {
  const j = JOURNALS.find(j => j.id === journalId);
  if (!j) return;
  state.selectedJournal = j;

  const overlay = document.getElementById('journalModal');
  const body    = document.getElementById('modalBody');
  const header  = document.getElementById('modalHeader');
  if (!overlay || !body) return;

  const tierLabel = { elite: '⭐ Elite Tier', high: '◆ High Impact', moderate: '● Reputable' }[j.tier] || j.tier;
  const oaBadge   = j.openAccess ? `<span class="badge badge-green">Open Access</span>` : `<span class="badge" style="background:rgba(255,255,255,0.05);color:var(--text-muted);border:1px solid var(--border)">Subscription</span>`;
  const wl        = j.wordLimit ? (typeof j.wordLimit === 'number' ? `${j.wordLimit.toLocaleString()} words` : `${j.wordLimit} ${j.wordLimitUnit || ''}`) : 'No strict limit';

  header.innerHTML = `
    <button class="modal-close" id="modalCloseBtn" aria-label="Close">✕</button>
    <div style="display:flex;align-items:flex-start;gap:14px;flex-wrap:wrap">
      <div style="flex:1;min-width:200px">
        <div style="font-family:var(--font-serif);font-size:1.6rem;color:var(--gold-light);margin-bottom:4px">${j.name}</div>
        <div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:10px">${j.publisher}${j.issn ? ' · ISSN ' + j.issn : ''}</div>
        <p style="font-size:0.88rem;color:var(--text-secondary)">${j.description}</p>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end;flex-shrink:0">
        <span class="tier-badge tier-${j.tier}">${tierLabel}</span>
        ${oaBadge}
        ${j.impactFactor ? `<span style="font-size:0.85rem;color:var(--gold);font-weight:700">Impact Factor: ${j.impactFactor}</span>` : ''}
      </div>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:24px;margin-top:20px;padding-top:16px;border-top:1px solid var(--border)">
      <div><div style="font-size:0.68rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.08em">Word Limit</div><div style="font-size:0.95rem;color:var(--text-primary);font-weight:600">${wl}</div></div>
      <div><div style="font-size:0.68rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.08em">Abstract</div><div style="font-size:0.95rem;color:var(--text-primary);font-weight:600">${j.abstractLimit ? j.abstractLimit + ' words' : '—'}</div></div>
      <div><div style="font-size:0.68rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.08em">Max References</div><div style="font-size:0.95rem;color:var(--text-primary);font-weight:600">${j.maxReferences ?? 'Unlimited'}</div></div>
      <div><div style="font-size:0.68rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.08em">Citation Style</div><div style="font-size:0.95rem;color:var(--text-primary);font-weight:600">${REFERENCE_STYLES[j.referenceStyle]?.name || j.referenceStyle}</div></div>
      <div><div style="font-size:0.68rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.08em">Abstract Type</div><div style="font-size:0.95rem;color:var(--text-primary);font-weight:600">${j.abstractStructure === 'structured' ? 'Structured' : 'Unstructured'}</div></div>
    </div>`;

  // Guidelines tab
  const guidelinesHTML = `
    <div class="mb-16"><strong style="color:var(--gold-light);font-size:0.9rem">Required Sections</strong>
      <div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:8px">
        ${j.sections.map(s => `<span style="padding:4px 12px;background:rgba(201,164,86,0.08);border:1px solid var(--border-gold);border-radius:4px;font-size:0.8rem;color:var(--gold)">${s}</span>`).join('')}
      </div>
    </div>
    <div class="divider"></div>
    <strong style="color:var(--gold-light);font-size:0.9rem;display:block;margin-bottom:12px">Submission Requirements</strong>
    <ul class="checklist">
      ${j.submissionGuidelines.map(g => `<li class="guideline-item"><span class="guideline-bullet">◆</span><span>${g}</span></li>`).join('')}
    </ul>`;

  // Manuscript structure tab
  const structureHTML = `
    <strong style="color:var(--gold-light);font-size:0.9rem;display:block;margin-bottom:16px">Manuscript Structure for ${j.name}</strong>
    ${j.manuscriptStructure.map((s, i) => `
      <div class="ms-row">
        <span class="ms-row-name">${i+1}. ${s.section}</span>
        <span class="ms-row-note">${s.notes}</span>
      </div>`).join('')}`;

  // Tips tab
  const tipsHTML = `
    <strong style="color:var(--gold-light);font-size:0.9rem;display:block;margin-bottom:16px">Converting Your Thesis → ${j.name} Manuscript</strong>
    ${j.thesisConversionTips.map((t, i) => `<div class="tip-item"><span class="tip-num">${i+1}</span><span>${t}</span></div>`).join('')}`;

  // Abstract structure tab (if applicable)
  const abstractHTML = j.abstractSections
    ? `<strong style="color:var(--gold-light);font-size:0.9rem;display:block;margin-bottom:16px">Structured Abstract Sections</strong>
       ${j.abstractSections.map((s, i) => `<div class="ms-row"><span class="ms-row-name">${i+1}. ${s}</span><span class="ms-row-note">Required heading in abstract</span></div>`).join('')}
       <div class="alert alert-gold mt-16"><span>💡</span><span>Maximum abstract length: <strong>${j.abstractLimit} words</strong></span></div>`
    : `<div class="alert alert-gold"><span>ℹ️</span><span>This journal uses an <strong>unstructured abstract</strong> — a single paragraph of up to <strong>${j.abstractLimit} words</strong> with no required subheadings.</span></div>`;

  body.innerHTML = `
    <div class="modal-tabs">
      <button class="modal-tab active" data-tab="guidelines">Guidelines</button>
      <button class="modal-tab" data-tab="structure">MS Structure</button>
      <button class="modal-tab" data-tab="abstract">Abstract</button>
      <button class="modal-tab" data-tab="tips">Conversion Tips</button>
    </div>
    <div class="modal-tab-content active" id="tab-guidelines">${guidelinesHTML}</div>
    <div class="modal-tab-content" id="tab-structure">${structureHTML}</div>
    <div class="modal-tab-content" id="tab-abstract">${abstractHTML}</div>
    <div class="modal-tab-content" id="tab-tips">${tipsHTML}</div>`;

  // Tab switching
  body.querySelectorAll('.modal-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      body.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
      body.querySelectorAll('.modal-tab-content').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      body.querySelector(`#tab-${tab.dataset.tab}`)?.classList.add('active');
    });
  });

  document.getElementById('modalCloseBtn')?.addEventListener('click', closeModal);
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('journalModal')?.classList.remove('open');
  document.body.style.overflow = '';
}

function setupModalClose() {
  document.getElementById('journalModal')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
}

// ─── CONVERTER ─────────────────────────────────────────────────────────────────
function setupConverter() {
  const steps = document.querySelectorAll('.wizard-step-item');
  const panes  = document.querySelectorAll('.wizard-pane');
  const nextBtns = document.querySelectorAll('[data-next]');
  const prevBtns = document.querySelectorAll('[data-prev]');

  function goToStep(n) {
    if (n < 1 || n > state.totalSteps) return;
    state.currentStep = n;
    steps.forEach((s, i) => {
      s.classList.toggle('active', i + 1 === n);
      s.classList.toggle('done',   i + 1 < n);
    });
    panes.forEach((p, i) => p.classList.toggle('active', i + 1 === n));
  }

  nextBtns.forEach(btn => btn.addEventListener('click', () => {
    collectWizardData();
    if (state.currentStep < state.totalSteps) goToStep(state.currentStep + 1);
    if (state.currentStep === state.totalSteps) generateManuscript();
  }));

  prevBtns.forEach(btn => btn.addEventListener('click', () => {
    if (state.currentStep > 1) goToStep(state.currentStep - 1);
  }));

  // Thesis type radio buttons
  document.querySelectorAll('[data-thesis-type]').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('[data-thesis-type]').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      state.wizard.thesisType = opt.dataset.thesisType;
    });
  });

  // Word count live update
  document.getElementById('thesisInput')?.addEventListener('input', function () {
    const wc = countWords(this.value);
    state.wizard.wordCount = wc;
    const wcEl = document.getElementById('thesisWordCount');
    if (wcEl) wcEl.textContent = `${wc.toLocaleString()} words`;
  });

  // Journal selector
  const journalSel = document.getElementById('journalSelect');
  if (journalSel) {
    populateJournalSelect(journalSel);
    journalSel.addEventListener('change', () => {
      state.wizard.selectedJournalId = journalSel.value;
      updateJournalPreview(journalSel.value);
    });
  }

  goToStep(1);
}

function populateJournalSelect(sel) {
  const groups = {};
  JOURNALS.forEach(j => {
    const cat = JOURNAL_CATEGORIES.find(c => c.id === j.category)?.name || j.category;
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(j);
  });
  sel.innerHTML = '<option value="">— Select a journal —</option>';
  Object.entries(groups).forEach(([cat, journals]) => {
    const grp = document.createElement('optgroup');
    grp.label = cat;
    journals.forEach(j => {
      const opt = document.createElement('option');
      opt.value = j.id;
      opt.textContent = `${j.name}${j.shortName && j.shortName !== j.name ? ' (' + j.shortName + ')' : ''} · IF ${j.impactFactor ?? '—'}`;
      grp.appendChild(opt);
    });
    sel.appendChild(grp);
  });
}

function updateJournalPreview(journalId) {
  const el = document.getElementById('journalPreviewCard');
  if (!el) return;
  if (!journalId) { el.classList.add('hidden'); return; }
  const j = JOURNALS.find(j => j.id === journalId);
  if (!j) return;
  el.classList.remove('hidden');
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:10px">
      <div>
        <div style="font-family:var(--font-serif);font-size:1rem;color:var(--gold-light)">${j.name}</div>
        <div style="font-size:0.78rem;color:var(--text-muted)">${j.publisher}</div>
      </div>
      <span class="tier-badge tier-${j.tier}">${j.tier}</span>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:16px;font-size:0.78rem">
      <span><span style="color:var(--text-muted)">Words: </span><strong style="color:var(--text-primary)">${j.wordLimit ? j.wordLimit.toLocaleString() : 'No limit'}</strong></span>
      <span><span style="color:var(--text-muted)">Abstract: </span><strong style="color:var(--text-primary)">${j.abstractLimit ?? '—'} w</strong></span>
      <span><span style="color:var(--text-muted)">Refs: </span><strong style="color:var(--text-primary)">${j.maxReferences ?? '∞'}</strong></span>
      <span><span style="color:var(--text-muted)">Style: </span><strong style="color:var(--text-primary)">${REFERENCE_STYLES[j.referenceStyle]?.name || j.referenceStyle}</strong></span>
    </div>`;
}

function collectWizardData() {
  const fields = {
    thesisTitle:    '#thesisTitle',
    thesisAbstract: '#thesisAbstract',
    thesisIntro:    '#thesisIntro',
    thesisMethods:  '#thesisMethods',
    thesisResults:  '#thesisResults',
    thesisDiscussion: '#thesisDiscussion',
  };
  Object.entries(fields).forEach(([key, sel]) => {
    const el = document.querySelector(sel);
    if (el) state.wizard[key] = el.value.trim();
  });
  const fullInput = document.querySelector('#thesisInput');
  if (fullInput) state.wizard.fullText = fullInput.value.trim();
}

// ─── MANUSCRIPT GENERATION ─────────────────────────────────────────────────────
function generateManuscript() {
  collectWizardData();
  const journalId = document.getElementById('journalSelect')?.value;
  if (!journalId) { showToast('⚠️ Please select a target journal first.'); return; }

  const j = JOURNALS.find(j => j.id === journalId);
  if (!j) return;

  const outputPanel = document.getElementById('outputPanel');
  if (!outputPanel) return;

  // Word counts
  const wc = {
    abstract: countWords(state.wizard.thesisAbstract),
    intro:    countWords(state.wizard.thesisIntro),
    methods:  countWords(state.wizard.thesisMethods),
    results:  countWords(state.wizard.thesisResults),
    discussion: countWords(state.wizard.thesisDiscussion),
  };
  const totalBodyWC = wc.intro + wc.methods + wc.results + wc.discussion;

  // Build checklist
  const checks = buildChecklist(j, wc, totalBodyWC);

  // Build manuscript sections
  const sections = buildManuscriptSections(j);

  outputPanel.innerHTML = `
    <div class="ms-journal-header">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px">
        <div>
          <div class="ms-journal-name">${j.name}</div>
          <div class="ms-journal-meta">${j.publisher} · ${REFERENCE_STYLES[j.referenceStyle]?.name || j.referenceStyle}</div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-sm btn-outline" onclick="copyManuscript()">⬇ Copy</button>
          <button class="btn btn-sm btn-ghost" onclick="openJournalModal('${j.id}')">📋 Guidelines</button>
        </div>
      </div>
      <div style="margin-top:14px">
        <div class="wc-row"><span>Body Word Count</span><span>${totalBodyWC.toLocaleString()} / ${j.wordLimit ? j.wordLimit.toLocaleString() : '∞'}</span></div>
        <div class="wc-bar"><div class="wc-fill ${getWCClass(totalBodyWC, j.wordLimit)}" style="width:${getWCPercent(totalBodyWC, j.wordLimit)}%"></div></div>
      </div>
    </div>
    <div class="manuscript-output">
      <div class="mb-20">
        <div style="font-size:0.78rem;text-transform:uppercase;letter-spacing:.1em;color:var(--text-muted);margin-bottom:10px">Conversion Checklist</div>
        <ul class="checklist">${checks.map(c => `
          <li class="checklist-item">
            <span class="ci-icon ${c.type === 'ok' ? 'ci-ok' : c.type === 'warn' ? 'ci-warn' : 'ci-error'}">${c.type === 'ok' ? '✓' : c.type === 'warn' ? '⚠' : '✕'}</span>
            <span>${c.message}</span>
          </li>`).join('')}
        </ul>
      </div>
      <div class="divider"></div>
      <div style="font-size:0.78rem;text-transform:uppercase;letter-spacing:.1em;color:var(--text-muted);margin-bottom:12px">Manuscript Outline</div>
      ${sections}
      <div class="alert alert-gold mt-24">
        <span>📜</span>
        <div><strong>Thesis → Manuscript Tip:</strong> The sections above are pre-filled with your content where provided. Review each section, apply journal guidelines, and rewrite for a specialist audience. Your thesis abstract likely exceeds journal limits — compress it accordingly.</div>
      </div>
    </div>`;

  outputPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  showToast('✓ Manuscript outline generated!');
}

function buildChecklist(j, wc, totalBodyWC) {
  const checks = [];

  // Abstract length
  if (wc.abstract === 0) {
    checks.push({ type: 'error', message: 'Abstract is missing — required for all journals.' });
  } else if (j.abstractLimit && wc.abstract > j.abstractLimit) {
    checks.push({ type: 'warn', message: `Abstract is ${wc.abstract} words; journal limit is ${j.abstractLimit}. Reduce by ${wc.abstract - j.abstractLimit} words.` });
  } else if (wc.abstract > 0) {
    checks.push({ type: 'ok', message: `Abstract length (${wc.abstract} words) ${j.abstractLimit ? 'within limit of ' + j.abstractLimit : 'accepted'}.` });
  }

  // Abstract structure
  if (j.abstractStructure === 'structured') {
    checks.push({ type: 'warn', message: `${j.name} requires a STRUCTURED abstract with sections: ${j.abstractSections?.join(' / ') || 'see guidelines'}. Reformat accordingly.` });
  } else {
    checks.push({ type: 'ok', message: 'Unstructured abstract format — single paragraph is acceptable.' });
  }

  // Body word count
  if (j.wordLimit) {
    if (totalBodyWC > j.wordLimit) {
      checks.push({ type: 'error', message: `Body word count (${totalBodyWC.toLocaleString()}) exceeds journal limit of ${j.wordLimit.toLocaleString()}. Cut ${(totalBodyWC - j.wordLimit).toLocaleString()} words.` });
    } else if (totalBodyWC > 0) {
      checks.push({ type: 'ok', message: `Body word count (${totalBodyWC.toLocaleString()}) within journal limit (${j.wordLimit.toLocaleString()}).` });
    } else {
      checks.push({ type: 'warn', message: `Word count could not be determined. Journal limit is ${j.wordLimit.toLocaleString()} words.` });
    }
  } else {
    checks.push({ type: 'ok', message: 'No word count limit for this journal — full thesis depth can be preserved.' });
  }

  // Citation style
  checks.push({ type: 'warn', message: `Convert all citations to ${REFERENCE_STYLES[j.referenceStyle]?.name || j.referenceStyle} format throughout.` });

  // Ref limit
  if (j.maxReferences) {
    checks.push({ type: 'warn', message: `Maximum ${j.maxReferences} references allowed. Thesis literature review may need significant pruning.` });
  } else {
    checks.push({ type: 'ok', message: 'No reference limit — full citation list from thesis can be retained.' });
  }

  // Open access / sections-specific
  if (j.openAccess) {
    checks.push({ type: 'ok', message: 'Open Access journal — article will be freely available; APC may apply.' });
  }

  // Keywords
  if (j.keywordsRequired) {
    checks.push({ type: 'warn', message: `Add ${j.keywordsCount || '4–6'} keywords as required by ${j.name}.` });
  }

  // Special requirements
  if (j.id === 'cell' || j.id === 'current-biology') {
    checks.push({ type: 'warn', message: 'STAR Methods format + Key Resources Table required. Restructure Methods accordingly.' });
    checks.push({ type: 'warn', message: 'Create a Graphical Abstract (one-panel visual summary) — mandatory for Cell Press journals.' });
  }
  if (j.id === 'nejm' || j.id === 'lancet' || j.id === 'jama' || j.id === 'bmj') {
    checks.push({ type: 'warn', message: 'Clinical trials require registration number. Include IRB/ethics approval in Methods.' });
    checks.push({ type: 'warn', message: `Apply ${j.id === 'nejm' || j.id === 'lancet' ? 'CONSORT/STROBE/PRISMA' : j.id === 'jama' ? 'EQUATOR' : 'ICMJE'} reporting checklist.` });
  }
  if (j.id === 'pnas') {
    checks.push({ type: 'warn', message: 'Write a 120-word Significance Statement for non-specialist audiences — unique PNAS requirement.' });
  }
  if (j.id === 'elife') {
    checks.push({ type: 'warn', message: 'Write an eLife Digest (300-word lay summary) and an Impact Statement.' });
  }

  // Literature review
  checks.push({ type: 'warn', message: 'Thesis literature review chapter must be condensed into the Introduction — avoid a standalone review section.' });

  // Thesis framing
  checks.push({ type: 'error', message: 'Remove all thesis-specific language ("In this thesis...", "Chapter X demonstrated...", "This dissertation...") and rewrite in manuscript voice.' });

  // Data availability
  if (j.publisher === 'PLOS' || j.publisher === 'Springer Nature' || j.id === 'elife' || j.id === 'pnas') {
    checks.push({ type: 'warn', message: 'Deposit all datasets in a public repository (Zenodo, Dryad, OSF, GEO, NCBI) and add a Data Availability Statement.' });
  }

  return checks;
}

function buildManuscriptSections(j) {
  const w = state.wizard;
  let html = '';
  j.manuscriptStructure.forEach(s => {
    let content = '';
    const sLower = s.section.toLowerCase();
    if (sLower.includes('title'))         content = w.thesisTitle || '';
    else if (sLower.includes('abstract')) content = w.thesisAbstract || '';
    else if (sLower.includes('intro'))    content = w.thesisIntro ? w.thesisIntro.slice(0, 600) + (w.thesisIntro.length > 600 ? '\n\n[...continued from thesis — revise for journal scope...]' : '') : '';
    else if (sLower.includes('method') || sLower.includes('star')) content = w.thesisMethods ? w.thesisMethods.slice(0, 500) + (w.thesisMethods.length > 500 ? '\n\n[...full methods from thesis — restructure per journal format...]' : '') : '';
    else if (sLower.includes('result') || sLower.includes('finding')) content = w.thesisResults ? w.thesisResults.slice(0, 600) + (w.thesisResults.length > 600 ? '\n\n[...continued from thesis...]' : '') : '';
    else if (sLower.includes('discussion')) content = w.thesisDiscussion ? w.thesisDiscussion.slice(0, 500) + (w.thesisDiscussion.length > 500 ? '\n\n[...continued from thesis...]' : '') : '';

    const placeholder = content ? '' : `[${s.section} — Add content here]`;
    const displayContent = content || placeholder;

    html += `
      <div class="ms-section-block">
        <div class="ms-section-head">
          <span class="ms-section-name">${s.section}</span>
          ${content ? `<span style="font-size:0.7rem;color:#8fc98a">● Has Content</span>` : `<span style="font-size:0.7rem;color:var(--text-muted)">○ Needs Content</span>`}
        </div>
        <div class="ms-section-note">${s.notes}</div>
        <div class="ms-section-content">${escapeHTML(displayContent)}</div>
      </div>`;
  });
  return html;
}

// ─── UTILS ─────────────────────────────────────────────────────────────────────
function countWords(text) {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

function getWCPercent(wc, limit) {
  if (!limit) return 50;
  return Math.min(100, Math.round((wc / limit) * 100));
}

function getWCClass(wc, limit) {
  if (!limit) return 'wc-ok';
  const pct = (wc / limit) * 100;
  if (pct > 100) return 'wc-over';
  if (pct > 85)  return 'wc-warn';
  return 'wc-ok';
}

function escapeHTML(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function showToast(message, duration = 3200) {
  let toast = document.getElementById('globalToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'globalToast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

function copyManuscript() {
  const outputEl = document.getElementById('outputPanel');
  if (!outputEl) return;
  const text = outputEl.innerText;
  navigator.clipboard.writeText(text).then(() => {
    showToast('✓ Manuscript copied to clipboard!');
  }).catch(() => {
    showToast('Copy not supported in this browser. Select and copy manually.');
  });
}

// Smooth scroll for footer nav
document.querySelectorAll('[data-scroll]')?.forEach(el => {
  el.addEventListener('click', () => {
    const target = document.getElementById(el.dataset.scroll);
    target?.scrollIntoView({ behavior: 'smooth' });
  });
});
