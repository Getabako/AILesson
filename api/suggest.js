// Vercel Serverless Function
// POST /api/suggest
// body: { goal: string, tips: [{id, title, phase, level, input, output, summary}] }
// returns: { stack: string[], reasons: {id: string}, summary: string }
//
// 環境変数:
//   DEEPSEEK_API_KEY  (必須) - https://platform.deepseek.com から取得

const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'DEEPSEEK_API_KEY not configured on server' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const { goal, tips } = body || {};
  if (!goal || typeof goal !== 'string') {
    return res.status(400).json({ error: 'goal is required' });
  }
  if (!Array.isArray(tips) || tips.length === 0) {
    return res.status(400).json({ error: 'tips array is required' });
  }

  const validIds = new Set(tips.map(t => t.id));
  const tipsList = tips.map(t =>
    `- id: ${t.id}\n  title: ${t.title}\n  phase: ${t.phase || '-'} / level: ${t.level || '-'}\n  in→out: ${t.input || '-'} → ${t.output || '-'}\n  summary: ${t.summary || ''}`
  ).join('\n');

  const systemPrompt = `あなたはノーコード自動化ワークフローの設計アシスタントです。ユーザーの達成したい目的に対して、与えられたチップス（workflow blocks）の中から必要なものだけを選び、実行順に並べて返します。

ルール:
- 必ず与えられた id リストの中から選ぶこと。存在しない id を作ってはいけない。
- 工程順序(phase)は setup → input → process → output/notify → schedule の流れを基本とする（必要な場合のみ）。
- 各チップスは一度だけ含める。似た機能のチップス（例: 有料/無料TTS）は片方だけ選ぶ。
- 定期実行が必要な目的なら schedule 系も含める。
- 認証が必要なGoogle系なら google-oauth-setup or google-service-account を先頭に入れる。
- API接続やDB等が必要なら util/infra 系を前提として含める（冗長になりすぎない範囲で）。
- 選ぶチップスは最小限にする。関係ないものは入れない。5〜10個程度が目安。

必ず次のJSONスキーマで返す（JSONのみ、前後に余計なテキスト禁止）:
{
  "stack": ["tip-id-1", "tip-id-2", ...],
  "reasons": { "tip-id-1": "なぜこれを選んだか（1行・日本語）", ... },
  "summary": "このワークフローが何をするかを2-3文で説明（日本語）"
}`;

  const userPrompt = `ユーザーの目的:
${goal}

使用可能なチップス一覧:
${tipsList}

上記の中から必要なチップスだけを選び、実行順に並べてJSONで返してください。`;

  let aiResponse;
  try {
    const resp = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 2048
      })
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return res.status(502).json({ error: `DeepSeek API error ${resp.status}: ${errText.slice(0, 400)}` });
    }

    const json = await resp.json();
    const content = json.choices?.[0]?.message?.content;
    if (!content) {
      return res.status(502).json({ error: 'DeepSeek returned empty content' });
    }
    aiResponse = JSON.parse(content);
  } catch (e) {
    return res.status(500).json({ error: `LLM call failed: ${e.message || String(e)}` });
  }

  // バリデーション: 未知のidは除外
  const stack = Array.isArray(aiResponse.stack)
    ? aiResponse.stack.filter(id => validIds.has(id))
    : [];
  const reasons = {};
  if (aiResponse.reasons && typeof aiResponse.reasons === 'object') {
    for (const [k, v] of Object.entries(aiResponse.reasons)) {
      if (validIds.has(k) && typeof v === 'string') reasons[k] = v;
    }
  }
  const summary = typeof aiResponse.summary === 'string' ? aiResponse.summary : '';

  return res.status(200).json({ stack, reasons, summary });
}
