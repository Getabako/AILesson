(async () => {
  const res = await fetch('tips.json');
  const data = await res.json();

  const LEVEL_ORDER = { prompt: 1, api: 2, infra: 3 };

  const state = {
    tips: data.tips,
    categories: data.categories,
    levels: data.levels,
    search: '',
    category: '',
    level: '',
    sort: 'level',
    openIds: new Set()
  };

  document.getElementById('last-updated').textContent = data.meta.lastUpdated;
  document.getElementById('total-count').textContent = data.tips.length;

  const catFilter = document.getElementById('category-filter');
  data.categories.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `${c.icon} ${c.label}`;
    catFilter.appendChild(opt);
  });

  const lvFilter = document.getElementById('level-filter');
  data.levels.forEach(l => {
    const opt = document.createElement('option');
    opt.value = l.id;
    opt.textContent = l.label;
    lvFilter.appendChild(opt);
  });

  const catNav = document.getElementById('category-nav');
  const allPill = pill('すべて', '', true);
  allPill.addEventListener('click', () => setCat(''));
  catNav.appendChild(allPill);
  data.categories.forEach(c => {
    const count = data.tips.filter(t => t.category === c.id).length;
    const p = pill(`${c.icon} ${c.label} (${count})`, c.id, false);
    p.addEventListener('click', () => setCat(c.id));
    catNav.appendChild(p);
  });

  function pill(label, id, active) {
    const el = document.createElement('button');
    el.className = 'category-pill';
    el.textContent = label;
    el.dataset.cat = id;
    if (active) el.classList.add('active');
    return el;
  }

  function setCat(id) {
    state.category = id;
    catFilter.value = id;
    document.querySelectorAll('.category-pill').forEach(p => {
      p.classList.toggle('active', p.dataset.cat === id);
    });
    render();
  }

  document.getElementById('search-input').addEventListener('input', e => {
    state.search = e.target.value.toLowerCase();
    render();
  });
  catFilter.addEventListener('change', e => setCat(e.target.value));
  lvFilter.addEventListener('change', e => { state.level = e.target.value; render(); });
  document.getElementById('sort-select').addEventListener('change', e => { state.sort = e.target.value; render(); });
  document.getElementById('reset-btn').addEventListener('click', () => {
    state.search = ''; state.category = ''; state.level = ''; state.sort = 'level';
    document.getElementById('search-input').value = '';
    catFilter.value = ''; lvFilter.value = '';
    document.getElementById('sort-select').value = 'level';
    setCat('');
  });

  function filter() {
    let result = state.tips.filter(t => {
      if (state.category && t.category !== state.category) return false;
      if (state.level && t.level !== state.level) return false;
      if (state.search) {
        const s = (t.title + t.summary + t.usage + t.source + t.prompt).toLowerCase();
        if (!s.includes(state.search)) return false;
      }
      return true;
    });

    const catOrder = {};
    state.categories.forEach((c, i) => { catOrder[c.id] = i; });

    result.sort((a, b) => {
      switch (state.sort) {
        case 'level':
          if (LEVEL_ORDER[a.level] !== LEVEL_ORDER[b.level]) return LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level];
          return catOrder[a.category] - catOrder[b.category];
        case 'category':
          if (catOrder[a.category] !== catOrder[b.category]) return catOrder[a.category] - catOrder[b.category];
          return LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level];
        case 'title':
          return a.title.localeCompare(b.title, 'ja');
        case 'source':
          return a.source.localeCompare(b.source, 'ja');
        default:
          return 0;
      }
    });
    return result;
  }

  function levelMeta(id) { return state.levels.find(l => l.id === id); }
  function catMeta(id) { return state.categories.find(c => c.id === id); }

  function render() {
    const filtered = filter();
    document.getElementById('tip-count').textContent = filtered.length;
    const list = document.getElementById('tips-list');
    const empty = document.getElementById('empty-state');
    list.innerHTML = '';
    if (filtered.length === 0) {
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');

    filtered.forEach(t => {
      const cat = catMeta(t.category);
      const lv = levelMeta(t.level);
      const isOpen = state.openIds.has(t.id);
      const lvShort = 'Lv.' + LEVEL_ORDER[t.level] + ' ' + lv.label.replace(/^Lv\.\d\s+/, '');

      const card = document.createElement('article');
      card.className = 'tip-card' + (isOpen ? ' is-open' : '');
      card.dataset.id = t.id;
      card.innerHTML = `
        <div class="tip-header">
          <h3 class="tip-title">${escapeHtml(t.title)}</h3>
          <div class="flex items-center gap-3 shrink-0">
            <span class="level-badge level-${t.level}">${escapeHtml(lvShort)}</span>
            <span class="chevron">▶</span>
          </div>
        </div>
        <div class="tip-body">
          <div class="tip-meta-row">
            <span class="tip-chip">${cat.icon} ${escapeHtml(cat.label)}</span>
            <span class="tip-chip">出典: ${escapeHtml(t.source)}</span>
          </div>
          <div class="tip-summary">${escapeHtml(t.summary)}</div>
          <div class="tip-usage">💡 <strong>使い所:</strong> ${escapeHtml(t.usage)}</div>
          <button class="tip-prompt-toggle" data-action="toggle-prompt">
            <span class="prompt-chevron">▶</span> プロンプト例を見る
          </button>
          <div class="prompt-wrapper">
            <button class="copy-btn" data-prompt="${encodeURIComponent(t.prompt)}">コピー</button>
            <pre class="prompt-block">${escapeHtml(t.prompt)}</pre>
          </div>
        </div>
      `;
      list.appendChild(card);

      card.querySelector('.tip-header').addEventListener('click', () => {
        if (state.openIds.has(t.id)) {
          state.openIds.delete(t.id);
          card.classList.remove('is-open');
        } else {
          state.openIds.add(t.id);
          card.classList.add('is-open');
        }
      });

      const promptToggle = card.querySelector('[data-action="toggle-prompt"]');
      const promptWrapper = card.querySelector('.prompt-wrapper');
      const promptChevron = card.querySelector('.prompt-chevron');
      promptToggle.addEventListener('click', e => {
        e.stopPropagation();
        const opened = promptWrapper.classList.toggle('is-open');
        promptChevron.textContent = opened ? '▼' : '▶';
        promptToggle.firstChild.nodeValue = '';
      });

      const copyBtn = card.querySelector('.copy-btn');
      copyBtn.addEventListener('click', async e => {
        e.stopPropagation();
        const text = decodeURIComponent(copyBtn.dataset.prompt);
        try {
          await navigator.clipboard.writeText(text);
          showToast('✓ プロンプトをコピーしました');
          copyBtn.textContent = '✓ コピー済';
          setTimeout(() => { copyBtn.textContent = 'コピー'; }, 2000);
        } catch {
          showToast('⚠ コピーに失敗しました');
        }
      });
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('toast-show');
    setTimeout(() => toast.classList.remove('toast-show'), 2200);
  }

  render();
})();
