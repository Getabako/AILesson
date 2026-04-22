(async () => {
  const [tipsRes, tplRes] = await Promise.all([
    fetch('../tips.json'),
    fetch('../templates.json')
  ]);
  const data = await tipsRes.json();
  const tplData = await tplRes.json();

  const LEVEL_ORDER = { prompt: 1, api: 2, infra: 3 };
  const LEVEL_SHORT = { prompt: 'Lv.1', api: 'Lv.2', infra: 'Lv.3' };

  const state = {
    tips: data.tips,
    categories: data.categories,
    levels: data.levels,
    phases: data.phases || [],
    templates: tplData.templates,
    search: '',
    category: '',
    phase: '',
    stack: []
  };

  const catMap = Object.fromEntries(data.categories.map(c => [c.id, c]));
  const levelMap = Object.fromEntries(data.levels.map(l => [l.id, l]));
  const phaseMap = Object.fromEntries((data.phases || []).map(p => [p.id, p]));
  const tipMap = Object.fromEntries(data.tips.map(t => [t.id, t]));

  document.getElementById('palette-count').textContent = data.tips.length;

  // ==== 工程タブ ====
  const palPhases = document.getElementById('palette-phases');
  const allPhasePill = makePhasePill({ id: '', label: 'すべて', icon: '🎯' }, data.tips.length, true);
  allPhasePill.addEventListener('click', () => setPhase(''));
  palPhases.appendChild(allPhasePill);
  state.phases.forEach(p => {
    const count = data.tips.filter(t => t.phase === p.id).length;
    const el = makePhasePill(p, count);
    el.addEventListener('click', () => setPhase(p.id));
    palPhases.appendChild(el);
  });

  function makePhasePill(phase, count, active = false) {
    const el = document.createElement('button');
    el.className = 'phase-pill' + (active ? ' active' : '');
    if (phase.id) el.classList.add('phase-' + phase.id);
    el.dataset.phase = phase.id;
    el.innerHTML = `<span>${phase.icon}</span><span>${phase.label}</span><span class="ct">${count}</span>`;
    return el;
  }

  function setPhase(id) {
    state.phase = id;
    document.querySelectorAll('.phase-pill').forEach(p => {
      p.classList.toggle('active', p.dataset.phase === id);
    });
    renderPalette();
  }

  // ==== カテゴリピル ====
  const palCats = document.getElementById('palette-categories');
  const allCatPill = makePalCatPill('すべて', '', null, true);
  allCatPill.addEventListener('click', () => setPalCat(''));
  palCats.appendChild(allCatPill);
  data.categories.forEach(c => {
    const count = data.tips.filter(t => t.category === c.id).length;
    const p = makePalCatPill(`${c.icon}${c.label}`, c.id, c.id);
    p.title = c.label;
    p.addEventListener('click', () => setPalCat(c.id));
    palCats.appendChild(p);
  });

  function makePalCatPill(label, id, catId, active = false) {
    const el = document.createElement('button');
    el.className = 'palette-cat-pill' + (active ? ' active' : '');
    if (catId) el.classList.add('cat-' + catId);
    el.dataset.cat = id;
    el.textContent = label;
    return el;
  }

  function setPalCat(id) {
    state.category = id;
    document.querySelectorAll('.palette-cat-pill').forEach(p => {
      p.classList.toggle('active', p.dataset.cat === id);
    });
    renderPalette();
  }

  document.getElementById('palette-search').addEventListener('input', e => {
    state.search = e.target.value.toLowerCase();
    renderPalette();
  });

  // ==== パレット描画 ====
  function renderPalette() {
    const filtered = state.tips.filter(t => {
      if (state.phase && t.phase !== state.phase) return false;
      if (state.category && t.category !== state.category) return false;
      if (state.search) {
        const s = (t.title + t.summary + t.usage + t.source + (t.verb || '') + (t.input || '') + (t.output || '')).toLowerCase();
        if (!s.includes(state.search)) return false;
      }
      return true;
    });

    // phase → level → category 順でソート
    const phaseOrder = {};
    state.phases.forEach((p, i) => { phaseOrder[p.id] = i; });
    const catOrder = {};
    state.categories.forEach((c, i) => { catOrder[c.id] = i; });

    filtered.sort((a, b) => {
      if ((phaseOrder[a.phase] ?? 99) !== (phaseOrder[b.phase] ?? 99))
        return (phaseOrder[a.phase] ?? 99) - (phaseOrder[b.phase] ?? 99);
      if (LEVEL_ORDER[a.level] !== LEVEL_ORDER[b.level])
        return LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level];
      return catOrder[a.category] - catOrder[b.category];
    });

    const el = document.getElementById('palette');
    el.innerHTML = '';
    if (filtered.length === 0) {
      el.innerHTML = '<div class="text-center py-8 text-slate-400 text-sm">該当なし</div>';
      return;
    }

    filtered.forEach(t => {
      el.appendChild(makePaletteChip(t));
    });
  }

  function makePaletteChip(t) {
    const cat = catMap[t.category];
    const chip = document.createElement('button');
    chip.className = `palette-chip phase-${t.phase || 'setup'}`;
    const verbText = t.verb || (cat ? cat.icon : '🧩');
    const inputText = t.input || '-';
    const outputText = t.output || '-';
    chip.innerHTML = `
      <div class="top">
        <span class="verb">${escapeHtml(verbText)}</span>
        <span class="title">${escapeHtml(t.title)}</span>
        <span class="lvl">${LEVEL_SHORT[t.level]}</span>
      </div>
      <div class="io">
        <span class="io-pill" title="入力">${escapeHtml(inputText)}</span>
        <span class="io-arrow">→</span>
        <span class="io-pill" title="出力">${escapeHtml(outputText)}</span>
      </div>
    `;
    chip.addEventListener('click', () => addToStack(t.id));
    return chip;
  }

  // ==== テンプレート ====
  function renderTemplates() {
    const grid = document.getElementById('templates-grid');
    grid.innerHTML = '';
    state.templates.forEach(tpl => {
      const card = document.createElement('button');
      card.className = 'tpl-card';
      card.innerHTML = `
        <div class="tpl-head">
          <span class="tpl-icon">${tpl.icon}</span>
          <span class="tpl-title">${escapeHtml(tpl.title)}</span>
          <span class="tpl-lvl">${escapeHtml(tpl.difficulty)}</span>
        </div>
        <div class="tpl-desc">${escapeHtml(tpl.description)}</div>
        <div class="tpl-count">${tpl.stack.length} ステップ</div>
      `;
      card.addEventListener('click', () => loadTemplate(tpl));
      grid.appendChild(card);
    });
  }

  function loadTemplate(tpl) {
    if (state.stack.length > 0) {
      if (!confirm(`現在のワークフロー（${state.stack.length}ステップ）を置き換えて「${tpl.title}」を読み込みますか？`)) return;
    }
    const valid = tpl.stack.filter(id => tipMap[id]);
    state.stack = [...valid];
    // ワークフロー名に反映
    document.getElementById('workflow-goal').value = tpl.description;
    renderStack();
    showToast(`🎁 テンプレート「${tpl.title}」を読み込みました`);
    document.getElementById('workspace').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  document.getElementById('toggle-templates').addEventListener('click', (e) => {
    const grid = document.getElementById('templates-grid');
    const hidden = grid.classList.toggle('hidden');
    e.target.textContent = hidden ? '開く ▼' : '折りたたむ ▲';
  });

  // ==== スタック操作 ====
  function addToStack(tipId) {
    state.stack.push(tipId);
    renderStack();
    showToast(`+ ブロックを追加しました`);
    setTimeout(() => {
      const end = document.getElementById('stack-end');
      end?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  }

  function removeFromStack(index) {
    state.stack.splice(index, 1);
    renderStack();
  }

  function moveStack(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= state.stack.length) return;
    const [moved] = state.stack.splice(index, 1);
    state.stack.splice(newIndex, 0, moved);
    renderStack();
  }

  // ==== スタック描画 ====
  function renderStack() {
    const empty = document.getElementById('empty-workspace');
    const stackEl = document.getElementById('block-stack');
    const endEl = document.getElementById('stack-end');
    document.getElementById('workflow-count').textContent = state.stack.length;

    stackEl.innerHTML = '';
    if (state.stack.length === 0) {
      empty.classList.remove('hidden');
      endEl.classList.add('hidden');
      return;
    }
    empty.classList.add('hidden');
    endEl.classList.remove('hidden');

    state.stack.forEach((tipId, i) => {
      const tip = tipMap[tipId];
      if (!tip) return;
      const cat = catMap[tip.category];
      const block = document.createElement('div');
      block.className = `block phase-${tip.phase || 'setup'}`;
      const verbText = tip.verb || (cat ? cat.icon : '🧩');
      block.innerHTML = `
        <div class="block-header">
          <span class="block-step-no">${i + 1}</span>
          <span class="block-verb">${escapeHtml(verbText)}</span>
          <span class="block-title">${escapeHtml(tip.title)}</span>
          <span class="block-lvl-badge">${LEVEL_SHORT[tip.level]}</span>
          <div class="block-actions">
            <button class="block-btn" data-act="up" ${i === 0 ? 'disabled' : ''} title="上へ">↑</button>
            <button class="block-btn" data-act="down" ${i === state.stack.length - 1 ? 'disabled' : ''} title="下へ">↓</button>
            <button class="block-btn" data-act="remove" title="削除">✕</button>
          </div>
        </div>
        <div class="block-io">
          <span class="block-io-pill">入力: ${escapeHtml(tip.input || '-')}</span>
          <span class="block-io-arrow">→</span>
          <span class="block-io-pill">出力: ${escapeHtml(tip.output || '-')}</span>
        </div>
        <div class="block-summary">${escapeHtml(tip.summary)}</div>
      `;
      block.querySelector('[data-act="up"]').addEventListener('click', () => moveStack(i, -1));
      block.querySelector('[data-act="down"]').addEventListener('click', () => moveStack(i, 1));
      block.querySelector('[data-act="remove"]').addEventListener('click', () => removeFromStack(i));
      stackEl.appendChild(block);

      // 次との間に矢印
      if (i < state.stack.length - 1) {
        const arr = document.createElement('div');
        arr.className = 'step-arrow';
        arr.textContent = '▼';
        stackEl.appendChild(arr);
      }
    });
  }

  // ==== クリア ====
  document.getElementById('clear-btn').addEventListener('click', () => {
    if (state.stack.length === 0) return;
    if (confirm('ワークフローをすべてクリアしますか？')) {
      state.stack = [];
      renderStack();
    }
  });

  // ==== プロンプト生成 ====
  document.getElementById('generate-btn').addEventListener('click', () => {
    if (state.stack.length === 0) {
      showToast('⚠ まずチップスを追加してください');
      return;
    }
    const prompt = buildPrompt();
    document.getElementById('generated-prompt').textContent = prompt;
    document.getElementById('prompt-modal').classList.remove('hidden');
  });

  document.getElementById('close-modal-btn').addEventListener('click', () => {
    document.getElementById('prompt-modal').classList.add('hidden');
  });
  document.getElementById('prompt-modal').addEventListener('click', e => {
    if (e.target.id === 'prompt-modal') {
      document.getElementById('prompt-modal').classList.add('hidden');
    }
  });

  document.getElementById('copy-prompt-btn').addEventListener('click', async () => {
    const text = document.getElementById('generated-prompt').textContent;
    try {
      await navigator.clipboard.writeText(text);
      showToast('✓ プロンプトをコピーしました');
    } catch {
      showToast('⚠ コピーに失敗しました');
    }
  });

  function buildPrompt() {
    const goal = document.getElementById('workflow-goal').value.trim();
    const tips = state.stack.map(id => tipMap[id]).filter(Boolean);

    const usedLevels = new Set(tips.map(t => t.level));
    const needsApi = usedLevels.has('api') || usedLevels.has('infra');
    const needsInfra = usedLevels.has('infra');

    const lines = [];
    lines.push('# ワークフロー実装依頼');
    lines.push('');
    if (goal) {
      lines.push('## 🎯 達成したいこと');
      lines.push(goal);
      lines.push('');
    }
    lines.push('## 📋 全体像');
    lines.push(`以下の ${tips.length} ステップを順番に実行するワークフローを構築してください。各ステップの出力が次のステップの入力になるよう、中間ファイル（JSON/画像/音声など）で連携させてください。`);
    lines.push('');

    lines.push('## 🧩 ステップ一覧');
    tips.forEach((t, i) => {
      const phase = phaseMap[t.phase];
      const phaseLabel = phase ? `${phase.icon}${phase.label}` : '';
      lines.push(`${i + 1}. **${t.title}** ${phaseLabel} (${LEVEL_SHORT[t.level]})`);
      lines.push(`   - 入力: ${t.input || '-'} / 出力: ${t.output || '-'}`);
      lines.push(`   - ${t.summary}`);
    });
    lines.push('');

    lines.push('## 📐 実装方針');
    lines.push('- モノレポ前提。各ステップは独立したスクリプト/モジュールとして実装し、`npm run step:N` または `npm run all` で順次実行できるようにする');
    lines.push('- 各ステップは**冪等**にし、失敗時はそのステップから再開可能にする');
    lines.push('- 中間成果物は `out/` や `data/` に保存し、次ステップが読み込む');
    lines.push('- エラー時はコンソールに原因を出し、必要ならリトライ（最大3回）');
    if (needsApi) {
      lines.push('- APIキーは `.env` から読み込み、`.env.example` を用意する');
    }
    if (needsInfra) {
      lines.push('- 外部サービス接続（DB / FTP / OAuth など）のセットアップ手順を README に記載する');
    }
    lines.push('');

    lines.push('## 🔧 各ステップの詳細仕様');
    lines.push('');
    tips.forEach((t, i) => {
      const cat = catMap[t.category];
      const phase = phaseMap[t.phase];
      lines.push(`### ステップ ${i + 1}: ${t.title} ${cat.icon}`);
      lines.push(`- **工程**: ${phase ? phase.label : '-'}`);
      lines.push(`- **カテゴリ**: ${cat.label}`);
      lines.push(`- **難易度**: ${levelMap[t.level].label}`);
      lines.push(`- **入力 → 出力**: ${t.input || '-'} → ${t.output || '-'}`);
      lines.push(`- **出典パターン**: ${t.source}`);
      lines.push(`- **想定ユースケース**: ${t.usage}`);
      lines.push('');
      lines.push('<details><summary>仕様プロンプト（チップス集より）</summary>');
      lines.push('');
      lines.push('```');
      lines.push(t.prompt);
      lines.push('```');
      lines.push('');
      lines.push('</details>');
      lines.push('');
    });

    lines.push('## ✅ 完了条件');
    lines.push('- 上記すべてのステップが連携して動作する');
    lines.push('- `README.md` に使い方・必要な環境変数・セットアップ手順を記載');
    lines.push('- `npm run all` で全ステップを通しで実行できる');
    if (needsApi) {
      lines.push('- `.env.example` に必要なキーが全て列挙されている');
    }
    lines.push('');

    lines.push('## 🗂 推奨ディレクトリ構成');
    lines.push('```');
    lines.push('your-workflow/');
    lines.push('├── package.json');
    lines.push('├── .env.example');
    lines.push('├── README.md');
    lines.push('├── scripts/');
    tips.forEach((t, i) => {
      lines.push(`│   ├── step${i + 1}-${t.id}.ts`);
    });
    lines.push('├── data/         # 中間JSON');
    lines.push('├── out/          # 成果物（画像/音声/動画）');
    lines.push('└── logs/         # 実行ログ');
    lines.push('```');
    lines.push('');

    lines.push('上記の仕様に従い、まずはプロジェクト全体の骨格（package.json・ディレクトリ構成・README雛形）を作成してから、各ステップを順番に実装してください。');

    return lines.join('\n');
  }

  // ==== AIコパイロット ====
  const aiBtn = document.getElementById('ai-suggest-btn');
  const aiInput = document.getElementById('ai-goal-input');
  const aiStatus = document.getElementById('ai-status');
  const aiResult = document.getElementById('ai-result');

  aiBtn.addEventListener('click', suggestByAI);
  aiInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') suggestByAI();
  });

  async function suggestByAI() {
    const goal = aiInput.value.trim();
    if (!goal) {
      showToast('⚠ 作りたい自動化を入力してください');
      return;
    }
    aiStatus.classList.remove('hidden');
    aiStatus.innerHTML = '<span class="spin"></span>AIが最適なチップスの組み合わせを考えています…';
    aiResult.classList.add('hidden');
    aiBtn.disabled = true;

    try {
      const res = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal,
          tips: state.tips.map(t => ({
            id: t.id, title: t.title, phase: t.phase, level: t.level,
            input: t.input, output: t.output, summary: t.summary
          }))
        })
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`API ${res.status}: ${err.slice(0, 200)}`);
      }
      const result = await res.json();
      renderAIResult(result, goal);
    } catch (e) {
      console.error(e);
      aiStatus.innerHTML = `❌ 失敗しました: ${escapeHtml(String(e.message || e))}<br><span class="text-xs text-white/80">Vercelにデプロイし、DEEPSEEK_API_KEY を環境変数に設定してください。ローカル開発時は <code>vercel dev</code> で起動。</span>`;
    } finally {
      aiBtn.disabled = false;
    }
  }

  function renderAIResult(result, goal) {
    aiStatus.classList.add('hidden');
    aiResult.classList.remove('hidden');

    const stackIds = (result.stack || []).filter(id => tipMap[id]);
    const summary = result.summary || '';

    let html = `<div class="mb-3">
      <div class="text-xs text-slate-500 font-bold tracking-wider mb-1">🤖 AIの提案</div>
      <div class="text-sm text-slate-800 leading-relaxed">${escapeHtml(summary)}</div>
    </div>`;

    if (stackIds.length === 0) {
      html += `<div class="text-sm text-rose-600">該当するチップスが見つかりませんでした。別の表現で試してください。</div>`;
      aiResult.innerHTML = html;
      return;
    }

    html += '<div class="space-y-1.5">';
    stackIds.forEach((id, i) => {
      const t = tipMap[id];
      const reason = (result.reasons && result.reasons[id]) || '';
      html += `
        <div class="ai-step-card phase-${t.phase || 'setup'}">
          <div class="num">${i + 1}</div>
          <div class="body">
            <div><strong>${escapeHtml(t.title)}</strong> <span class="text-xs text-slate-500">${LEVEL_SHORT[t.level]}</span></div>
            ${reason ? `<div class="reason">${escapeHtml(reason)}</div>` : ''}
          </div>
        </div>
      `;
    });
    html += '</div>';

    html += `<div class="mt-4 flex gap-2">
      <button id="apply-ai-btn" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition">✓ この構成をワークフローに採用する</button>
      <button id="dismiss-ai-btn" class="px-4 py-2 border-2 border-slate-200 rounded-lg text-sm hover:bg-slate-50 transition">閉じる</button>
    </div>`;

    aiResult.innerHTML = html;

    document.getElementById('apply-ai-btn').addEventListener('click', () => {
      state.stack = [...stackIds];
      document.getElementById('workflow-goal').value = goal;
      renderStack();
      aiResult.classList.add('hidden');
      showToast('✓ ワークフローに読み込みました');
      document.getElementById('workspace').scrollIntoView({ behavior: 'smooth' });
    });
    document.getElementById('dismiss-ai-btn').addEventListener('click', () => {
      aiResult.classList.add('hidden');
    });
  }

  // ==== ユーティリティ ====
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
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(() => toast.classList.remove('toast-show'), 2000);
  }

  // 初期レンダリング
  renderTemplates();
  renderPalette();
  renderStack();
})();
