# Claude Code ワークフロー チップス集

if(塾) のClaude Code講座用の資料サイト。

[`/Users/takasaki19841121/Desktop/ifJukuManager/WorkFrow/`](../../WorkFrow) にある既存ワークフローを分解し、再利用可能な「チップス」として一覧化したもの。

## 構成

```
AILesson/
├── index.html          # チップス一覧サイト
├── tips.json           # チップスデータ（編集しやすいJSON）
├── assets/
│   ├── script.js       # 検索・フィルタ・コピー機能
│   └── style.css       # スタイル
└── README.md           # この資料
```

## チップスの分類

### カテゴリ
- 🔍 情報収集・調査
- ✍️ 文章・企画生成
- 🎨 画像生成・加工
- 🎬 動画生成・編集
- 🎙️ 音声・ナレーション
- 📢 自動投稿
- 🔔 通知・連携
- 📊 データ分析・レポート
- ⏰ スケジュール実行
- 🛠️ ユーティリティ

### 難易度
- **Lv.1 プロンプトのみ**: Claude Codeに指示するだけで実装できる
- **Lv.2 API接続が必要**: Gemini / OpenAI などのAPIキー取得が必要
- **Lv.3 環境構築が必要**: ローカルバイナリ、OAuth、FTP などの追加セットアップが必要

## 使い方

### ローカル確認
```bash
cd /Users/takasaki19841121/Desktop/ifJukuManager/Lesson/AILesson
python3 -m http.server 8000
# → http://localhost:8000
```

### 公開サイト
GitHub Pages でホスティング（`gh-pages` ブランチ）。

## チップスの追加/編集

`tips.json` の `tips` 配列にエントリを追加するだけ。

```json
{
  "id": "unique-id",
  "title": "チップス名",
  "category": "research",
  "level": "api",
  "summary": "1-2行の説明",
  "source": "由来ワークフロー名",
  "usage": "どんな時に使うか",
  "prompt": "Claude Codeに貼り付けるプロンプト"
}
```

ビルド不要。ページを再読み込みすれば反映される。
