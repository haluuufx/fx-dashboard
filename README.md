# FX Fundamental Dashboard

USD・EUR・GBP・JPY・資源国通貨のファンダメンタル分析ダッシュボード。  
Claude AIによるニュース分析、経済指標カレンダー、RSS自動取得に対応。

---

## 🚀 Vercelへのデプロイ手順

### 1. このリポジトリをGitHubにプッシュ

```bash
git init
git add .
git commit -m "first commit"
git remote add origin https://github.com/あなたのユーザー名/fx-dashboard.git
git push -u origin main
```

### 2. Vercelアカウントを作成

https://vercel.com にアクセスして「GitHubでログイン」

### 3. プロジェクトをインポート

1. Vercelダッシュボードで「Add New Project」
2. GitHubのリポジトリを選択
3. **Framework Preset** は `Other` を選択
4. **Root Directory** はそのまま（変更不要）
5. 「Deploy」をクリック

### 4. 環境変数（APIキー）を設定

デプロイ後、Vercelダッシュボードで：

1. プロジェクトの「Settings」→「Environment Variables」
2. 以下を追加：

| Name | Value |
|------|-------|
| `ANTHROPIC_API_KEY` | `sk-ant-あなたのAPIキー` |

3. 「Save」後、「Redeploy」で反映

---

## 📁 ファイル構成

```
fx-dashboard/
├── public/
│   └── index.html        # フロントエンド（全機能）
├── api/
│   ├── claude.js         # Claude API中継（APIキーをサーバー側で管理）
│   └── rss.js            # RSSフィード取得（CORS回避）
├── vercel.json           # Vercel設定
├── package.json
└── README.md
```

---

## 🔑 Anthropic APIキーの取得

https://console.anthropic.com にアクセスして「API Keys」から発行

---

## 📱 スマホでも使える

デプロイ後のURL（例: `https://fx-dashboard-xxx.vercel.app`）をスマホのブラウザで開くと  
モバイル対応レイアウトで表示されます。

---

## 🔄 RSS自動取得

以下のフィードをデフォルトで取得（10分ごと自動更新）：
- Reuters Business News
- Investing.com
- FX Street
- NHK経済ニュース

RSSタブから追加・削除可能（将来実装予定）。
