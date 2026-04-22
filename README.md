# Claude Code ワークフロー チップス集

if(塾) のClaude Code講座用の資料サイト。

[`/Users/takasaki19841121/Desktop/ifJukuManager/WorkFrow/`](../../WorkFrow) にある既存ワークフローを分解し、再利用可能な「チップス」として一覧化したもの。

## 構成

```
AILesson/
├── index.html          # チップス一覧サイト
├── tips.json           # チップスデータ（編集しやすいJSON）
├── templates.json      # スタートテンプレート集
├── assets/
│   ├── script.js       # 一覧サイトの検索・フィルタ・コピー
│   └── style.css
├── tool/
│   ├── index.html      # ワークフロービルダー（Scratch風）
│   ├── script.js       # ビルダーのUIロジック
│   └── style.css
├── api/
│   └── suggest.js      # AIチップス提案 (Vercel Serverless Function)
├── vercel.json
├── package.json
└── README.md
```

## チップスの分類

### 工程 (phase) — ビルダーで組み立てる時の基本軸
- 📥 **取得 (input)** — 情報を集めてくる
- ⚙️ **加工 (process)** — データを変換・生成する
- 📤 **出力 (output)** — 結果を外部に書き出す
- 🔔 **通知 (notify)** — 人にお知らせを飛ばす
- ⏰ **定期実行 (schedule)** — 自動で繰り返す
- 🔧 **準備 (setup)** — 環境構築・認証・ユーティリティ

### カテゴリ (category) — テーマ別
🔍 情報収集 / ✍️ 文章生成 / 🎨 画像 / 🎬 動画 / 🎙 音声 / 📢 自動投稿 / 🔔 通知 / 📊 データ / ⏰ スケジュール / 🛠 ユーティリティ / 🌐 Google連携

### 難易度
- **Lv.1 プロンプトのみ**: Claude Codeに指示するだけ
- **Lv.2 API接続が必要**: Gemini/OpenAI 等のAPIキー
- **Lv.3 環境構築が必要**: OAuth, DB, FTP 等の追加セットアップ

## ビルダーの使い方

1. `/tool/` を開く
2. 3通りの組み立て方:
   - **🤖 AIに相談** — 作りたい内容を日本語で書けばDeepSeekが最適な組み合わせを提案
   - **🎁 スタートテンプレート** — よくある自動化パターンをワンクリックで読み込む
   - **🧩 パレットから自分で積む** — 工程タブやカテゴリで絞り込んで追加
3. 完成したら「✨ プロンプト生成」→ Claude Codeに貼り付けて実装依頼

## ローカル確認

```bash
cd /Users/takasaki19841121/Desktop/ifJukuManager/Lesson/AILesson
python3 -m http.server 8000
# → http://localhost:8000
```

ただし `python3 -m http.server` だと `/api/suggest` は動きません。AI提案機能込みで動かすには **Vercel CLI** でローカルサーバを起動:

```bash
npm i -g vercel
vercel dev
# 初回はプロジェクトをリンク。環境変数 DEEPSEEK_API_KEY を .env.local に入れるか vercel env pull する
```

## Vercelデプロイ手順

1. GitHub リポジトリを Vercel にインポート
2. プロジェクト設定の **Environment Variables** に以下を追加:
   - Key: `DEEPSEEK_API_KEY`
   - Value: DeepSeekの APIキー（`sk-...`）
   - Environment: Production / Preview / Development 全部ON
3. `main` ブランチへのpushで自動デプロイ

これで `https://<your-project>.vercel.app/` でサイトが公開され、AI提案機能も動作します。

## チップスの追加/編集

`tips.json` の `tips` 配列にエントリを追加するだけ。各チップは以下のフィールドを持つ:

```json
{
  "id": "unique-id",
  "title": "チップス名",
  "category": "research",
  "level": "api",
  "phase": "input",
  "input": "入力の種類",
  "output": "出力の種類",
  "verb": "📡 動詞",
  "summary": "1-2行の説明",
  "source": "由来ワークフロー名",
  "usage": "どんな時に使うか",
  "prompt": "Claude Codeに貼り付けるプロンプト"
}
```

ビルド不要。ページを再読み込みすれば反映される。

## テンプレートの追加

`templates.json` に追加するだけ。`stack` は `tips.json` の id を並べる。

```json
{
  "id": "tpl-xxxx",
  "icon": "📰",
  "title": "タイトル",
  "description": "1-2行説明",
  "difficulty": "Lv.3",
  "stack": ["tip-id-1", "tip-id-2", ...]
}
```
