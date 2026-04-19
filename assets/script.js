(async () => {
  const res = await fetch('tips.json');
  const data = await res.json();

  const state = {
    tips: data.tips,
    categories: data.categories,
    levels: data.levels,
    search: '',
    category: '',
    level: ''
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
    el.className = 'category-pill text-xs px-3 py-1.5 rounded-full border border-slate-700 text-slate-300';
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
  document.getElementById('reset-btn').addEventListener('click', () => {
    state.search = ''; state.category = ''; state.level = '';
    document.getElementById('search-input').value = '';
    catFilter.value = ''; lvFilter.value = '';
    setCat('');
  });

  function filter() {
    return state.tips.filter(t => {
      if (state.category && t.category !== state.category) return false;
      if (state.level && t.level !== state.level) return false;
      if (state.search) {
        const s = (t.title + t.summary + t.usage + t.source + t.prompt).toLowerCase();
        if (!s.includes(state.search)) return false;
      }
      return true;
    });
  }

  function levelMeta(id) {
    return state.levels.find(l => l.id === id);
  }
  function catMeta(id) {
    return state.categories.find(c => c.id === id);
  }

  function render() {
    const filtered = filter();
    document.getElementById('tip-count').textContent = filtered.length;
    const grid = document.getElementById('tips-grid');
    const empty = document.getElementById('empty-state');
    grid.innerHTML = '';
    if (filtered.length === 0) {
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');

    filtered.forEach(t => {
      const cat = catMeta(t.category);
      const lv = levelMeta(t.level);
      const card = document.createElement('article');
      card.className = 'tip-card bg-slate-900/50 border border-slate-800 rounded-xl p-5 flex flex-col gap-3';
      card.innerHTML = `
        <div class="flex items-start justify-between gap-3">
          <h3 class="font-bold text-lg leading-tight flex-1">${escapeHtml(t.title)}</h3>
          <span class="text-xs px-2 py-1 rounded border level-${t.level} shrink-0 font-bold">${escapeHtml(lv.label.replace(/^Lv\.\d\s+/, 'Lv.' + ({prompt:1,api:2,infra:3}[t.level]) + ' '))}</span>
        </div>
        <div class="flex flex-wrap gap-2 text-xs">
          <span class="px-2 py-0.5 rounded bg-slate-800 text-slate-300">${cat.icon} ${escapeHtml(cat.label)}</span>
          <span class="px-2 py-0.5 rounded bg-slate-800/50 text-slate-400">出典: ${escapeHtml(t.source)}</span>
        </div>
        <p class="text-sm text-slate-300 leading-relaxed">${escapeHtml(t.summary)}</p>
        <div class="text-xs text-slate-400 border-l-2 border-cyan-500/40 pl-3">
          💡 <strong class="text-slate-300">使い所:</strong> ${escapeHtml(t.usage)}
        </div>
        <details class="mt-1">
          <summary class="cursor-pointer text-sm font-medium text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
            <span class="chevron">▶</span> プロンプト例を見る
          </summary>
          <div class="mt-3 relative">
            <button class="copy-btn absolute top-2 right-2 text-xs bg-slate-700 hover:bg-cyan-600 text-white px-3 py-1 rounded transition-colors" data-prompt="${encodeURIComponent(t.prompt)}">コピー</button>
            <pre class="prompt-block">${escapeHtml(t.prompt)}</pre>
          </div>
        </details>
      `;
      grid.appendChild(card);
    });

    grid.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.preventDefault();
        const text = decodeURIComponent(btn.dataset.prompt);
        try {
          await navigator.clipboard.writeText(text);
          showToast('✓ プロンプトをコピーしました');
          btn.textContent = '✓ コピー済';
          setTimeout(() => { btn.textContent = 'コピー'; }, 2000);
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
