(async () => {
  const res = await fetch('../tips.json');
  const data = await res.json();

  const LEVEL_ORDER = { prompt: 1, api: 2, infra: 3 };
  const LEVEL_SHORT = { prompt: 'Lv.1', api: 'Lv.2', infra: 'Lv.3' };

  const state = {
    tips: data.tips,
    categories: data.categories,
    levels: data.levels,
    search: '',
    category: '',
    stack: []
  };

  const catMap = Object.fromEntries(data.categories.map(c => [c.id, c]));
  const levelMap = Object.fromEntries(data.levels.map(l => [l.id, l]));

  document.getElementById('palette-count').textContent = data.tips.length;

  // ==== パレット：カテゴリフィルタ ====
  const palCats = document.getElementById('palette-categories');
  const allPill = makePalCatPill('すべて', '', null, true);
  allPill.addEventListener('click', () => setPalCat(''));
  palCats.appendChild(allPill);
  data.categories.forEach(c => {
    const count = data.tips.filter(t => t.category === c.id).length;
    const p = makePalCatPill(`${c.icon}${count}`, c.id, c.id);
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
      if (state.category && t.category !== state.category) return false;
      if (state.search) {
        const s = (t.title + t.summary + t.usage + t.source).toLowerCase();
        if (!s.includes(state.search)) return false;
      }
      return true;
    });

    // レベル→カテゴリ順でソート
    const catOrder = {};
    state.categories.forEach((c, i) => { catOrder[c.id] = i; });
    filtered.sort((a, b) => {
      if (catOrder[a.category] !== catOrder[b.category]) return catOrder[a.category] - catOrder[b.category];
      return LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level];
    });

    const el = document.getElementById('palette');
    el.innerHTML = '';
    if (filtered.length === 0) {
      el.innerHTML = '<div class="text-center py-8 text-slate-400 text-sm">該当なし</div>';
      return;
    }

    filtered.forEach(t => {
      const cat = catMap[t.category];
      const chip = document.createElement('button');
      chip.className = `palette-chip cat-${t.category}`;
      chip.innerHTML = `
        <span class="icon">${cat.icon}</span>
        <span class="title">${escapeHtml(t.title)}</span>
        <span class="lvl">${LEVEL_SHORT[t.level]}</span>
      `;
      chip.addEventListener('click', () => addToStack(t.id));
      el.appendChild(chip);
    });
  }

  // ==== スタック操作 ====
  function addToStack(tipId) {
    state.stack.push(tipId);
    renderStack();
    showToast(`+ ブロックを追加しました`);
    // スクロール最下部
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
      const tip = state.tips.find(t => t.id === tipId);
      if (!tip) return;
      const cat = catMap[tip.category];
      const block = document.createElement('div');
      block.className = `block cat-${tip.category}`;
      block.innerHTML = `
        <div class="block-header">
          <span class="block-step-no">${i + 1}</span>
          <span class="block-icon">${cat.icon}</span>
          <span class="block-title">${escapeHtml(tip.title)}</span>
          <span class="block-lvl-badge">${LEVEL_SHORT[tip.level]}</span>
          <div class="block-actions">
            <button class="block-btn" data-act="up" ${i === 0 ? 'disabled' : ''} title="上へ">↑</button>
            <button class="block-btn" data-act="down" ${i === state.stack.length - 1 ? 'disabled' : ''} title="下へ">↓</button>
            <button class="block-btn" data-act="remove" title="削除">✕</button>
          </div>
        </div>
        <div class="block-summary">${escapeHtml(tip.summary)}</div>
      `;
      block.querySelector('[data-act="up"]').addEventListener('click', () => moveStack(i, -1));
      block.querySelector('[data-act="down"]').addEventListener('click', () => moveStack(i, 1));
      block.querySelector('[data-act="remove"]').addEventListener('click', () => removeFromStack(i));
      stackEl.appendChild(block);
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
    const tips = state.stack.map(id => state.tips.find(t => t.id === id)).filter(Boolean);

    // 使用レベル集計
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
      const cat = catMap[t.category];
      lines.push(`${i + 1}. **${t.title}** ${cat.icon} (${LEVEL_SHORT[t.level]}) — ${t.summary}`);
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
      lines.push(`### ステップ ${i + 1}: ${t.title} ${cat.icon}`);
      lines.push(`- **カテゴリ**: ${cat.label}`);
      lines.push(`- **難易度**: ${levelMap[t.level].label}`);
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
  renderPalette();
  renderStack();
})();
