# レシート栄養カレンダー — AI読み取り中継サーバー（Gemini・無料）

**料理そのものの写真**やレシートを、Googleの **Gemini（無料枠）** で判別して、
アプリの食材に対応づけて返すサーバーです。料金は0円（無料枠の範囲内）。

デプロイは **1回だけ**。以降はアプリにURLを貼るだけで「写真を撮るだけ」で使えます。

> ⚠️ 無料枠は**1日あたりの回数制限**があり、**送った写真はGoogleの品質改善（学習）に使われる**場合があります。気になる場合は有料のClaude版（`../proxy`）を使ってください。

## 必要なもの
- Google の APIキー（無料。Google AI Studio で取得）
- Node.js（`npx` が使える環境）
- Cloudflare のアカウント（無料）

## 手順

### 1. Gemini APIキーを取る（無料）
1. ブラウザで **https://aistudio.google.com/apikey** を開く
2. Googleでログイン →「**APIキーを作成 / Create API key**」
3. 表示されたキー（`AIza...`）をコピー

### 2. サーバーをデプロイ
```bash
cd reshi-eiyou/proxy-gemini

# Cloudflare にログイン（ブラウザが開きます）
npx wrangler login

# さっきのGeminiキーを秘密情報として登録（貼り付け）
npx wrangler secret put GEMINI_API_KEY

# デプロイ
npx wrangler deploy
```

成功すると次のようなURLが出ます:
```
https://reshi-eiyou-gemini.<あなたのサブドメイン>.workers.dev
```

### 3. アプリに貼る
この **URLをコピー** して、アプリの「🥗 食材」タブ →「レシート読み取りについて」内の
設定欄に貼り付けて保存。以降は、**料理やレシートの写真を撮って「写真から読み取る」** を
押すだけで中身が候補に出ます。

## 補足
- **モデル変更**：`wrangler.toml` の `MODEL`（例 `gemini-2.5-flash`）。
- **精度重視で有料でもよい**：`../proxy`（Claude版）に切り替え。
- **セキュリティ**：`GEMINI_API_KEY` は Cloudflare の secret に保管され、レスポンスにも出ません。
